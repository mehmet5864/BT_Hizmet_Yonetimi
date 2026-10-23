"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModule } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { isSafeUploadUrl } from "@/lib/security/http";
import { notifyAssignment } from "@/lib/integrations/assignment";
import { recordScore } from "@/lib/scoring";
import {
  AGILE_MEETING_KINDS,
  AGILE_METHODS,
  AGILE_PRIORITIES,
  AGILE_PRODUCT_STATUSES,
  AGILE_SOURCES,
  AGILE_TYPES,
  isAgileStatus,
} from "@/lib/agile/constants";
import { fail, saved, type ActionState } from "./shared";
import { canSeeRecord } from "@/lib/auth/data-scope";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function dateVal(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function intVal(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : NaN;
}

function oneOf<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return value && (list as readonly string[]).includes(value) ? (value as T) : fallback;
}

const MANAGER_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "SENIOR_MANAGER", "UNIT_MANAGER"];

/** Ürün/sprint/toplantı yönetimi: yönetici roller veya ürün sahibi. */
function canManage(viewer: { id: string; role?: string | null }, ownerId?: string | null) {
  return MANAGER_ROLES.includes(String(viewer.role)) || (!!ownerId && ownerId === viewer.id);
}

const NO_PERMISSION = "Bu işlem için ürün sahibi veya yönetici olmalısınız.";

async function audit(entityType: string, entityId: string, action: string, note: string, actorName?: string) {
  try {
    await prisma.activityLog.create({ data: { entityType, entityId, action, note, ...(actorName ? { actor: actorName } : {}) } });
  } catch (error) {
    console.error("agile audit", error);
  }
}

const SOURCE_ENTITY: Record<string, string> = {
  INCIDENT: "Incident",
  PROBLEM: "Problem",
  CHANGE: "ChangeRecord",
  REQUEST: "ServiceRequest",
  VULNERABILITY: "Vulnerability",
  PATCH: "PatchRecord",
};

/** Çevik iş bittiğinde/yeniden açıldığında kaynak ITIL kaydının geçmişine not düşer (çift yönlü bağ). */
async function feedbackToSource(
  item: { itemNo: string; title: string; sourceType: string | null; sourceId: string | null },
  prevStatus: string,
  status: string,
) {
  if (!item.sourceType || !item.sourceId || !SOURCE_ENTITY[item.sourceType]) return;
  const wasDone = prevStatus === "DONE";
  const isDone = status === "DONE";
  if (wasDone === isDone) return;
  await audit(
    SOURCE_ENTITY[item.sourceType],
    item.sourceId,
    "AGILE_LINK",
    isDone ? `Bağlı Çevik iş tamamlandı: ${item.itemNo} ${item.title}` : `Bağlı Çevik iş yeniden açıldı: ${item.itemNo} ${item.title}`,
  );
}

/** Kanban/Scrum devam eden iş sınırı. Sınır dolduysa mesaj döner. */
async function wipBlock(productId: string, excludeId?: string): Promise<string | null> {
  const product = await prisma.agileProduct.findUnique({ where: { id: productId }, select: { wipLimit: true } });
  if (!product?.wipLimit) return null;
  const inProgress = await prisma.agileItem.count({
    where: { productId, status: "IN_PROGRESS", ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  return inProgress >= product.wipLimit
    ? `Devam eden iş sınırı (${product.wipLimit}) dolu. Önce bir işi bitirin veya sınırı artırın.`
    : null;
}

function refresh(productId?: string, sprintId?: string | null, itemId?: string) {
  revalidatePath("/cevik");
  if (productId) revalidatePath(`/cevik/urun/${productId}`);
  if (sprintId) revalidatePath(`/cevik/sprint/${sprintId}`);
  if (itemId) revalidatePath(`/cevik/is/${itemId}`);
}

export async function saveAgileProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/cevik");
  if (access.error) return access.error;
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Ürün adı zorunludur." };
  const keyRaw = (text(formData, "key") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!id && (keyRaw.length < 2 || keyRaw.length > 10)) {
    return { ok: false, message: "Anahtar 2–10 harf/rakam olmalıdır (ör. BT)." };
  }
  const wipLimit = intVal(formData, "wipLimit");
  if (Number.isNaN(wipLimit)) return { ok: false, message: "Devam eden iş sınırı sayı olmalıdır." };
  if (id) {
    const cur = await prisma.agileProduct.findUnique({ where: { id }, select: { ownerId: true } });
    if (!cur) return { ok: false, message: "Ürün bulunamadı." };
    if (!canManage(access.viewer, cur.ownerId)) return { ok: false, message: NO_PERMISSION };
  }
  const data = {
    name,
    wipLimit: wipLimit && wipLimit > 0 ? wipLimit : null,
    description: text(formData, "description"),
    method: oneOf(AGILE_METHODS, text(formData, "method"), "SCRUM"),
    status: oneOf(AGILE_PRODUCT_STATUSES, text(formData, "status"), "ACTIVE"),
    ownerId: text(formData, "ownerId"),
    serviceId: text(formData, "serviceId"),
  };
  try {
    if (id) {
      await prisma.agileProduct.update({ where: { id }, data });
      refresh(id);
      return saved(`/cevik/urun/${id}`);
    }
    const dup = await prisma.agileProduct.findUnique({ where: { key: keyRaw } });
    if (dup) return { ok: false, message: "Bu anahtar başka bir üründe kullanılıyor." };
    const created = await prisma.agileProduct.create({ data: { ...data, key: keyRaw } });
    refresh();
    return saved(`/cevik/urun/${created.id}`, "Ürün oluşturuldu.");
  } catch (error) {
    return fail(error);
  }
}

export async function saveAgileSprint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/cevik");
  if (access.error) return access.error;
  const id = text(formData, "id");
  const productId = text(formData, "productId");
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Sprint adı zorunludur." };
  const capacity = intVal(formData, "capacity");
  if (Number.isNaN(capacity)) return { ok: false, message: "Kapasite sayı olmalıdır." };
  const startDate = dateVal(formData, "startDate");
  const endDate = dateVal(formData, "endDate");
  if (startDate && endDate && endDate < startDate) return { ok: false, message: "Bitiş tarihi başlangıçtan önce olamaz." };
  try {
    if (id) {
      const current = await prisma.agileSprint.findUnique({ where: { id }, include: { product: { select: { ownerId: true } } } });
      if (!current) return { ok: false, message: "Sprint bulunamadı." };
      if (!canManage(access.viewer, current.product.ownerId)) return { ok: false, message: NO_PERMISSION };
      await prisma.agileSprint.update({
        where: { id },
        data: { name, goal: text(formData, "goal"), retro: text(formData, "retro"), startDate, endDate, capacity },
      });
      refresh(current.productId, id);
      return saved(`/cevik/sprint/${id}`);
    }
    if (!productId) return { ok: false, message: "Ürün seçilmedi." };
    const product = await prisma.agileProduct.findUnique({ where: { id: productId } });
    if (!product) return { ok: false, message: "Ürün bulunamadı." };
    if (!canManage(access.viewer, product.ownerId)) return { ok: false, message: NO_PERMISSION };
    const created = await prisma.agileSprint.create({
      data: { productId, name, goal: text(formData, "goal"), startDate, endDate, capacity, status: "PLANNED" },
    });
    refresh(productId);
    return saved(`/cevik/sprint/${created.id}`, "Sprint oluşturuldu.");
  } catch (error) {
    return fail(error);
  }
}

async function nextItemNo(productId: string, key: string) {
  const rows = await prisma.agileItem.findMany({ where: { productId }, select: { itemNo: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.itemNo.split("-").pop()) || 0), 0);
  return `${key}-${String(max + 1).padStart(3, "0")}`;
}

/** İş numarası çakışırsa (aynı anda iki kayıt) yeniden dener. */
async function createWithItemNo(
  productId: string,
  key: string,
  args: { data: Omit<Parameters<typeof prisma.agileItem.create>[0]["data"], "itemNo"> },
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.agileItem.create({
        data: { ...(args.data as object), itemNo: await nextItemNo(productId, key) } as Parameters<typeof prisma.agileItem.create>[0]["data"],
      });
    } catch (error) {
      lastError = error;
      if (!/Unique|unique|constraint/i.test(String((error as Error)?.message))) throw error;
    }
  }
  throw lastError;
}

async function validEpic(productId: string, epicId: string | null) {
  if (!epicId) return null;
  const epic = await prisma.agileItem.findUnique({ where: { id: epicId }, select: { productId: true, type: true } });
  return epic && epic.productId === productId && epic.type === "EPIC" ? epicId : null;
}

export async function saveAgileItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/cevik");
  if (access.error) return access.error;
  const viewer = access.viewer;
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("agileItem", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Başlık zorunludur." };
  const points = intVal(formData, "points");
  if (Number.isNaN(points)) return { ok: false, message: "Hikâye puanı sayı olmalıdır." };
  const priority = oneOf(AGILE_PRIORITIES, text(formData, "priority"), "MEDIUM");
  const base = {
    title,
    description: text(formData, "description"),
    type: oneOf(AGILE_TYPES, text(formData, "type"), "STORY"),
    priority,
    points,
    assigneeId: text(formData, "assigneeId"),
    acceptance: text(formData, "acceptance"),
    labels: (text(formData, "labels") ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8).join(", ") || null,
    blockedReason: text(formData, "blockedReason"),
  };
  const requested = text(formData, "status");
  try {
    if (id) {
      const current = await prisma.agileItem.findUnique({ where: { id } });
      if (!current) return { ok: false, message: "İş bulunamadı." };
      const status = isAgileStatus(requested) ? requested : current.status;
      if (status === "IN_PROGRESS" && current.status !== "IN_PROGRESS") {
        const block = await wipBlock(current.productId, id);
        if (block) return { ok: false, message: block };
      }
      const now = new Date();
      await prisma.agileItem.update({
        where: { id },
        data: {
          ...base,
          status,
          startedAt: current.startedAt ?? (status === "IN_PROGRESS" ? now : null),
          completedAt: status === "DONE" ? (current.completedAt ?? now) : null,
        },
      });
      await recordScore({ module: "agile", created: false, entityId: id, entityNo: current.itemNo, severity: priority, prevStatus: current.status, status, actorId: viewer.id });
      await feedbackToSource(current, current.status, status);
      if (base.assigneeId && base.assigneeId !== current.assigneeId) {
        await notifyAssignment({ personId: base.assigneeId, actorId: viewer.id, ticketNo: current.itemNo, title, kindLabel: "Çevik işi", path: `/cevik/is/${id}`, entityType: "AgileItem", entityId: id });
      }
      refresh(current.productId, current.sprintId, id);
      return saved(`/cevik/is/${id}`);
    }
    const productId = text(formData, "productId");
    const product = productId ? await prisma.agileProduct.findUnique({ where: { id: productId } }) : null;
    if (!product) return { ok: false, message: "Ürün bulunamadı." };
    const sprintId = text(formData, "sprintId");
    const sprint = sprintId ? await prisma.agileSprint.findUnique({ where: { id: sprintId } }) : null;
    if (sprint && sprint.productId !== product.id) return { ok: false, message: "Sprint bu ürüne ait değil." };
    const sourceType = text(formData, "sourceType");
    const last = await prisma.agileItem.findFirst({ where: { productId: product.id }, orderBy: { rank: "desc" }, select: { rank: true } });
    let status = isAgileStatus(requested) ? requested : sprint ? "TODO" : "BACKLOG";
    if (sprint && status === "BACKLOG") status = "TODO";
    if (!sprint && status !== "BACKLOG" && product.method === "SCRUM") status = "BACKLOG";
    const now = new Date();
    if (status === "IN_PROGRESS") {
      const block = await wipBlock(product.id);
      if (block) return { ok: false, message: block };
    }
    let parentId: string | null = null;
    const parentRaw = text(formData, "parentId");
    if (parentRaw) {
      const parent = await prisma.agileItem.findUnique({ where: { id: parentRaw }, select: { productId: true, parentId: true, type: true } });
      if (!parent || parent.productId !== product.id || parent.parentId || parent.type === "EPIC") {
        return { ok: false, message: "Üst iş geçersiz (aynı üründe, epik olmayan ve kendisi alt görev olmayan bir iş seçin)." };
      }
      parentId = parentRaw;
    }
    const created = await createWithItemNo(product.id, product.key, {
      data: {
        ...base,
        parentId,
        status,
        productId: product.id,
        sprintId: sprint?.id ?? null,
        rank: (last?.rank ?? 0) + 1,
        reporterId: viewer.id,
        sourceType: sourceType && (AGILE_SOURCES as readonly string[]).includes(sourceType) ? sourceType : null,
        epicId: await validEpic(product.id, text(formData, "epicId")),
        sourceId: text(formData, "sourceId"),
        sourceNo: text(formData, "sourceNo"),
        startedAt: status === "IN_PROGRESS" ? now : null,
        completedAt: status === "DONE" ? now : null,
      },
    });
    await recordScore({ module: "agile", created: true, entityId: created.id, entityNo: created.itemNo, severity: priority, status, actorId: viewer.id });
    if (base.assigneeId) {
      await notifyAssignment({ personId: base.assigneeId, actorId: viewer.id, ticketNo: created.itemNo, title, kindLabel: "Çevik işi", path: `/cevik/is/${created.id}`, entityType: "AgileItem", entityId: created.id });
    }
    refresh(product.id, sprint?.id, created.id);
    return saved(`/cevik/is/${created.id}`, "İş oluşturuldu.");
  } catch (error) {
    return fail(error);
  }
}

/** Panodaki / listedeki hızlı durum değişikliği (form action). */
export async function moveAgileItem(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const access = await requireModule("/cevik");
  if (access.error) return { ok: false, message: access.error.message };
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("agileItem", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const status = text(formData, "status");
  if (!id || !isAgileStatus(status)) return { ok: false, message: "Geçersiz durum." };
  const current = await prisma.agileItem.findUnique({ where: { id } });
  if (!current) return { ok: false, message: "İş bulunamadı." };
  if (current.status === status) return { ok: true };
  if (status === "IN_PROGRESS") {
    const block = await wipBlock(current.productId, id);
    if (block) return { ok: false, message: block };
  }
  const now = new Date();
  await prisma.agileItem.update({
    where: { id },
    data: {
      status,
      startedAt: current.startedAt ?? (status === "IN_PROGRESS" ? now : null),
      completedAt: status === "DONE" ? now : null,
      ...(status === "BACKLOG" ? { sprintId: null } : {}),
    },
  });
  await recordScore({ module: "agile", created: false, entityId: id, entityNo: current.itemNo, severity: current.priority, prevStatus: current.status, status, actorId: access.viewer.id });
  await feedbackToSource(current, current.status, status);
  refresh(current.productId, current.sprintId, id);
  return { ok: true };
}

/** Form action olarak kullanılan sürüm (sonuç döndürmez). */
export async function moveAgileItemForm(formData: FormData): Promise<void> {
  await moveAgileItem(formData);
}

/** İşi sprinte ekler veya sprintten çıkarır (sprintId boş = backlog). */
export async function setAgileItemSprint(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("agileItem", id))) return;
  const sprintId = text(formData, "sprintId");
  if (!id) return;
  const current = await prisma.agileItem.findUnique({ where: { id } });
  if (!current) return;
  if (sprintId) {
    const sprint = await prisma.agileSprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.productId !== current.productId || sprint.status === "CLOSED") return;
    await prisma.agileItem.update({
      where: { id },
      data: { sprintId, status: current.status === "BACKLOG" ? "TODO" : current.status },
    });
  } else {
    await prisma.agileItem.update({ where: { id }, data: { sprintId: null, status: current.status === "DONE" ? "DONE" : "BACKLOG" } });
  }
  refresh(current.productId, sprintId, id);
  if (current.sprintId) revalidatePath(`/cevik/sprint/${current.sprintId}`);
}

export async function startAgileSprint(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const sprint = await prisma.agileSprint.findUnique({ where: { id }, include: { product: { select: { ownerId: true } } } });
  if (!sprint || sprint.status !== "PLANNED") return;
  if (!canManage(access.viewer, sprint.product.ownerId)) return;
  const active = await prisma.agileSprint.findFirst({ where: { productId: sprint.productId, status: "ACTIVE" } });
  if (active) return;
  const start = sprint.startDate ?? new Date();
  const end = sprint.endDate ?? new Date(start.getTime() + 14 * 86_400_000);
  await prisma.agileSprint.update({ where: { id }, data: { status: "ACTIVE", startDate: start, endDate: end } });
  refresh(sprint.productId, id);
}

export async function closeAgileSprint(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const sprint = await prisma.agileSprint.findUnique({
    where: { id },
    include: { product: { select: { ownerId: true } }, items: { select: { status: true, points: true } } },
  });
  if (!sprint || sprint.status === "CLOSED") return;
  if (!canManage(access.viewer, sprint.product.ownerId)) return;
  const carryTo = text(formData, "carryTo");
  const target = carryTo
    ? await prisma.agileSprint.findUnique({ where: { id: carryTo }, select: { id: true, productId: true, status: true } })
    : null;
  const validTarget = target && target.productId === sprint.productId && target.status !== "CLOSED" && target.id !== id ? target : null;
  const sum = (rows: { points: number | null }[]) => rows.reduce((t, r) => t + (r.points ?? 0), 0);
  const planned = sum(sprint.items);
  const doneRows = sprint.items.filter((i) => i.status === "DONE");
  const unfinished = sprint.items.filter((i) => i.status !== "DONE");
  await prisma.$transaction([
    prisma.agileItem.updateMany({
      where: { sprintId: id, status: { not: "DONE" } },
      data: validTarget ? { sprintId: validTarget.id, status: "TODO" } : { sprintId: null, status: "BACKLOG" },
    }),
    prisma.agileSprint.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date(), plannedPoints: planned, donePoints: sum(doneRows), carriedCount: unfinished.length },
    }),
  ]);
  await audit("AgileSprint", id, "CLOSE", `${sprint.name} kapatıldı: ${sum(doneRows)}/${planned} puan, ${unfinished.length} iş ${validTarget ? "sonraki sprinte devredildi" : "backlog'a döndü"}.`);
  refresh(sprint.productId, id);
  if (validTarget) revalidatePath(`/cevik/sprint/${validTarget.id}`);
}

export async function deleteAgileSprint(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const sprint = await prisma.agileSprint.findUnique({ where: { id }, include: { product: { select: { ownerId: true } } } });
  if (!sprint || sprint.status !== "PLANNED") return;
  if (!canManage(access.viewer, sprint.product.ownerId)) return;
  await prisma.$transaction([
    prisma.agileItem.updateMany({ where: { sprintId: id }, data: { sprintId: null, status: "BACKLOG" } }),
    prisma.agileMeeting.updateMany({ where: { sprintId: id }, data: { sprintId: null } }),
    prisma.agileSprint.delete({ where: { id } }),
  ]);
  await audit("AgileSprint", id, "DELETE", `${sprint.name} silindi (işler backlog'a döndü).`);
  refresh(sprint.productId);
  redirect(`/cevik/urun/${sprint.productId}`);
}

export async function deleteAgileProduct(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const product = await prisma.agileProduct.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
  if (!product) return;
  const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(String(access.viewer.role));
  if (!isAdmin && product.ownerId !== access.viewer.id) return;
  // Kayıt içeren ürünü yalnızca yönetici siler; diğerleri arşivler.
  if (product._count.items > 0 && !isAdmin) return;
  await prisma.agileProduct.delete({ where: { id } });
  await audit("AgileProduct", id, "DELETE", `${product.key} ${product.name} ürünü ve ${product._count.items} iş silindi.`);
  refresh();
  redirect("/cevik");
}

export async function deleteAgileItem(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("agileItem", id))) return;
  if (!id) return;
  const current = await prisma.agileItem.findUnique({ where: { id }, include: { product: { select: { ownerId: true } } } });
  if (!current) return;
  if (!canManage(access.viewer, current.product.ownerId) && current.reporterId !== access.viewer.id) return;
  await prisma.agileItem.delete({ where: { id } });
  await audit("AgileItem", id, "DELETE", `${current.itemNo} ${current.title} silindi.`);
  refresh(current.productId, current.sprintId);
}

export async function setAgileItemEpic(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const current = await prisma.agileItem.findUnique({ where: { id } });
  if (!current || current.type === "EPIC") return;
  const epicId = await validEpic(current.productId, text(formData, "epicId"));
  await prisma.agileItem.update({ where: { id }, data: { epicId } });
  refresh(current.productId, current.sprintId, id);
}

export async function addAgileComment(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const itemId = text(formData, "itemId");
  if (itemId && !(await canSeeRecord("agileItem", itemId))) return;
  const body = text(formData, "body");
  if (!itemId || !body) return;
  const item = await prisma.agileItem.findUnique({ where: { id: itemId }, select: { id: true, productId: true, sprintId: true } });
  if (!item) return;
  await prisma.agileComment.create({ data: { itemId, authorId: access.viewer.id, body: body.slice(0, 4000) } });
  refresh(item.productId, item.sprintId, itemId);
}

export async function deleteAgileComment(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const comment = await prisma.agileComment.findUnique({ where: { id }, include: { item: { select: { id: true, productId: true, sprintId: true } } } });
  if (!comment) return;
  const mine = comment.authorId === access.viewer.id;
  if (!mine && access.viewer.role !== "SUPER_ADMIN") return;
  await prisma.agileComment.delete({ where: { id } });
  refresh(comment.item.productId, comment.item.sprintId, comment.item.id);
}

export async function saveAgileMeeting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/cevik");
  if (access.error) return access.error;
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("agileMeeting", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Başlık zorunludur." };
  const meetingDate = dateVal(formData, "meetingDate");
  if (!meetingDate) return { ok: false, message: "Tarih zorunludur." };
  const data = {
    title,
    kind: oneOf(AGILE_MEETING_KINDS, text(formData, "kind"), "DAILY"),
    meetingDate,
    attendees: text(formData, "attendees"),
    notes: text(formData, "notes"),
    decisions: text(formData, "decisions"),
  };
  try {
    if (id) {
      const current = await prisma.agileMeeting.findUnique({ where: { id } });
      if (!current) return { ok: false, message: "Toplantı bulunamadı." };
      await prisma.agileMeeting.update({ where: { id }, data });
      refresh(current.productId, current.sprintId);
      return saved(`/cevik/toplanti/${id}`);
    }
    const productId = text(formData, "productId");
    const product = productId ? await prisma.agileProduct.findUnique({ where: { id: productId } }) : null;
    if (!product) return { ok: false, message: "Ürün bulunamadı." };
    const sprintId = text(formData, "sprintId");
    const sprint = sprintId ? await prisma.agileSprint.findUnique({ where: { id: sprintId } }) : null;
    const created = await prisma.agileMeeting.create({
      data: { ...data, productId: product.id, sprintId: sprint && sprint.productId === product.id ? sprint.id : null, createdById: access.viewer.id },
    });
    refresh(product.id, created.sprintId);
    return saved(`/cevik/toplanti/${created.id}`, "Toplantı kaydı oluşturuldu.");
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAgileMeeting(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const current = await prisma.agileMeeting.findUnique({ where: { id }, include: { product: { select: { ownerId: true } } } });
  if (!current) return;
  if (!canManage(access.viewer, current.product.ownerId) && current.createdById !== access.viewer.id) return;
  await prisma.agileMeeting.delete({ where: { id } });
  await audit("AgileMeeting", id, "DELETE", `${current.title} toplantı kaydı silindi.`);
  refresh(current.productId, current.sprintId);
}

export async function addAgileAttachment(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const access = await requireModule("/cevik");
  if (access.error) return { ok: false, message: access.error.message };
  const itemId = text(formData, "itemId");
  const url = text(formData, "url");
  const name = text(formData, "name");
  if (!itemId || !url || !name) return { ok: false, message: "Dosya bilgisi eksik." };
  if (!isSafeUploadUrl(url)) return { ok: false, message: "Geçersiz dosya adresi." };
  const item = await prisma.agileItem.findUnique({ where: { id: itemId }, select: { id: true, productId: true, sprintId: true } });
  if (!item) return { ok: false, message: "İş bulunamadı." };
  const count = await prisma.agileAttachment.count({ where: { itemId } });
  if (count >= 20) return { ok: false, message: "Bir işe en fazla 20 dosya eklenebilir." };
  await prisma.agileAttachment.create({ data: { itemId, url, name: name.slice(0, 160), uploadedById: access.viewer.id } });
  refresh(item.productId, item.sprintId, itemId);
  return { ok: true };
}

export async function deleteAgileAttachment(formData: FormData): Promise<void> {
  const access = await requireModule("/cevik");
  if (access.error) return;
  const id = text(formData, "id");
  if (!id) return;
  const att = await prisma.agileAttachment.findUnique({ where: { id }, include: { item: { include: { product: { select: { ownerId: true } } } } } });
  if (!att) return;
  if (!canManage(access.viewer, att.item.product.ownerId) && att.uploadedById !== access.viewer.id) return;
  await prisma.agileAttachment.delete({ where: { id } });
  await audit("AgileAttachment", id, "DELETE", `${att.item.itemNo} dosya eki kaldırıldı: ${att.name}`);
  refresh(att.item.productId, att.item.sprintId, att.itemId);
}
