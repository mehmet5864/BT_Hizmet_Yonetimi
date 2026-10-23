"use server";

import { revalidatePath } from "next/cache";

import { recordScore } from "@/lib/scoring";
import { fail, saved, type ActionState } from "@/lib/actions/shared";
import { firstFilled, personOrgDefaults } from "@/lib/forms/person-defaults";
import { hasModuleLevel } from "@/lib/auth/acl";
import { requireModule, getViewerAcl } from "@/lib/auth/viewer";
import { nextTicketNo } from "@/lib/itil/constants";
import { getItilProcess } from "@/lib/itil/processes";
import { resolveModuleManager } from "@/lib/itil/office-officers";
import { prisma } from "@/lib/prisma";
import { canSeeRecord } from "@/lib/auth/data-scope";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function intVal(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : null;
}

function dateVal(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sessionOwner(viewerId: string, existing?: string | null) {
  return existing || viewerId;
}

export async function saveCatalogService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/katalog");
  if (access.error) return access.error;
  const { grants } = await getViewerAcl();
  if (!hasModuleLevel(grants, access.viewer.groups ?? [], "katalog", "HANDLE", access.viewer.role)) {
    return { ok: false, message: "Kataloğa hizmet eklemek için işlem yetkisi gerekir." };
  }
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Hizmet adı zorunludur." };
  const id = text(formData, "id");
  const existing = id ? await prisma.catalogService.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, message: "Hizmet bulunamadı." };
  const requesterId = sessionOwner(access.viewer.id, existing?.requesterId);
  const requesterOrg = await personOrgDefaults(requesterId);
  const ownerId = text(formData, "ownerId");
  const ownerOrg = ownerId ? await personOrgDefaults(ownerId) : {};
  const payload = {
    name,
    summary: text(formData, "summary"),
    status: text(formData, "status") ?? "ACTIVE",
    audience: text(formData, "audience") ?? "USER",
    requesterId,
    requestingDeptId: existing?.requestingDeptId ?? requesterOrg.departmentId ?? null,
    requestingManagerId:
      text(formData, "requestingManagerId") ??
      (await resolveModuleManager("servis", requesterId)) ??
      requesterOrg.unitManagerId ??
      null,
    ownerId,
    departmentId: firstFilled(text(formData, "departmentId"), ownerOrg.departmentId, requesterOrg.departmentId),
    hours: text(formData, "hours"),
    accessConditions: text(formData, "accessConditions"),
    requestOffice: text(formData, "requestOffice"),
    requestType: text(formData, "requestType"),
    availabilityTarget: text(formData, "availabilityTarget"),
    responseHours: intVal(formData, "responseHours"),
    resolveHours: intVal(formData, "resolveHours"),
    criticality: text(formData, "criticality") ?? "MEDIUM",
    description: text(formData, "description"),
    assetId: text(formData, "assetId"),
  };
  try {
    if (id) {
      await prisma.catalogService.update({ where: { id }, data: payload });
      await recordScore({ module: "catalog", created: false, entityId: id, entityNo: existing?.serviceNo, severity: payload.criticality, actorId: access.viewer.id });
      revalidatePath("/katalog");
      revalidatePath(`/katalog/${id}`);
      return saved(`/katalog/${id}`);
    }
    const last = await prisma.catalogService.findFirst({ orderBy: { serviceNo: "desc" }, select: { serviceNo: true } });
    const created = await prisma.catalogService.create({
      data: { ...payload, serviceNo: nextTicketNo("HIZ", last?.serviceNo) },
    });
    await recordScore({ module: "catalog", created: true, entityId: created.id, entityNo: created.serviceNo, severity: payload.criticality, actorId: access.viewer.id });
    revalidatePath("/katalog");
    return saved(`/katalog/${created.id}`, "Hizmet kataloğa eklendi.");
  } catch (error) {
    return fail(error);
  }
}

export async function saveItilProcess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get("processSlug") ?? "");
  const def = getItilProcess(slug);
  if (!def) return { ok: false, message: "Geçersiz süreç." };
  const access = await requireModule(def.href);
  if (access.error) return access.error;
  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Kayıt tanımı zorunludur." };
  const id = text(formData, "id");
  if (id && !(await canSeeRecord("itilProcessRecord", id))) return { ok: false, message: "Bu kayda erişim yetkiniz yok." };
  if (!id) formData.delete("status"); // yeni kayıtta başlangıç durumunu akış belirler
  const existing = id ? await prisma.itilProcessRecord.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, message: "Kayıt bulunamadı." };
  if (existing && existing.process !== def.key) return { ok: false, message: "Süreç türü değiştirilemez." };
  const requesterId = sessionOwner(access.viewer.id, existing?.requesterId);
  const requesterOrg = await personOrgDefaults(requesterId);
  const extras: Record<string, string> = {};
  for (const field of def.extraFields) {
    const value = text(formData, field.id);
    if (field.required && !value) return { ok: false, message: `${field.label} zorunludur.` };
    if (value) extras[field.id] = value;
  }
  const payload = {
    process: def.key,
    title,
    status: text(formData, "status") ?? existing?.status ?? def.statuses[0]?.value ?? "OPEN",
    requesterId,
    requestingDeptId: existing?.requestingDeptId ?? requesterOrg.departmentId ?? null,
    requestingManagerId:
      text(formData, "requestingManagerId") ??
      (await resolveModuleManager(def.officer, requesterId)) ??
      requesterOrg.unitManagerId ??
      null,
    ownerId: text(formData, "ownerId"),
    departmentId: firstFilled(text(formData, "departmentId"), requesterOrg.departmentId),
    serviceId: text(formData, "serviceId"),
    assetId: text(formData, "assetId"),
    startDate: dateVal(formData, "startDate") ?? dateVal(formData, "requestDate"),
    endDate: dateVal(formData, "endDate"),
    severity: text(formData, "severity"),
    details: Object.keys(extras).length ? JSON.stringify(extras) : null,
    description: text(formData, "description"),
  };
  try {
    if (id) {
      await prisma.itilProcessRecord.update({ where: { id }, data: payload });
      await recordScore({ module: `process:${def.key}`, created: false, entityId: id, entityNo: existing?.recordNo, severity: payload.severity, prevStatus: existing?.status, status: payload.status, actorId: access.viewer.id });
      revalidatePath(def.href);
      revalidatePath(`${def.href}/${id}`);
      return saved(`${def.href}/${id}`);
    }
    const last = await prisma.itilProcessRecord.findFirst({
      where: { process: def.key },
      orderBy: { recordNo: "desc" },
      select: { recordNo: true },
    });
    const created = await prisma.itilProcessRecord.create({
      data: { ...payload, recordNo: nextTicketNo(def.prefix, last?.recordNo) },
    });
    await recordScore({ module: `process:${def.key}`, created: true, entityId: created.id, entityNo: created.recordNo, severity: payload.severity, status: payload.status, actorId: access.viewer.id });
    revalidatePath(def.href);
    return saved(`${def.href}/${created.id}`, `${def.label} kaydı oluşturuldu.`);
  } catch (error) {
    return fail(error);
  }
}
