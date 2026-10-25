"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ASSET_TYPE_DEFS, getAssetTypeDef, getFieldsFor } from "@/lib/inventory/asset-types";
import type { AssetTypeKey } from "@/lib/inventory/constants";
import { buildAssetSchema } from "@/lib/inventory/validation";
import { FIELD_CATALOG, type FieldDef } from "@/lib/inventory/fields";
import { LIFECYCLE_STATUSES } from "@/lib/inventory/constants";
import { canViewAsset } from "@/lib/auth/acl";
import { getInventoryAccess, inventoryApproverIds } from "@/lib/auth/inventory";
import { notifyIntegrations } from "@/lib/integrations/notify";
import { personOrgDefaults } from "@/lib/forms/person-defaults";
import { CUSTODY_FREE, custodyTransfer, zimmetManagerIds } from "@/lib/inventory/custody";
import { isSafeUploadUrl } from "@/lib/security/http";
import { fail, saved, type ActionState } from "./shared";

const NULLABLE_COLUMNS = [
  "formFactor",
  "stockNo",
  "serialNo",
  "appEnvironment",
  "appUrl",
  "appUserCount",
  "appRto",
  "appTechnology",
  "name",
  "deviceId",
  "brand",
  "model",
  "servedApplication",
  "ipAddress",
  "macAddress",
  "operatingSystem",
  "version",
  "cpu",
  "ram",
  "disk",
  "departmentId",
  "locRoom",
  "locCorridor",
  "locCabinet",
  "locShelf",
  "imageUrl",
  "supportStatus",
  "contractorVendorId",
  "supportVendorId",
  "supportStartDate",
  "supportEndDate",
  "transactionDate",
  "description",
] as const;

const DATE_COLUMNS = new Set(["supportStartDate", "supportEndDate", "transactionDate"]);
const NUMBER_COLUMNS = new Set(["locRoom", "locCorridor", "locCabinet", "locShelf"]);

function formName(field: FieldDef): string[] {
  switch (field.kind) {
    case "person":
      return ["ownerId"];
    case "department":
      return ["departmentId"];
    case "vendor":
      return [`${field.id}Id`];
    case "location":
      return ["locRoom", "locCorridor", "locCabinet", "locShelf"];
    case "image":
      return ["imageUrl"];
    default:
      return [field.id];
  }
}

function readForm(assetType: AssetTypeKey, formData: FormData) {
  const raw: Record<string, unknown> = { assetType };

  for (const field of getFieldsFor(assetType)) {
    if (field.kind === "assetRefs" || field.kind === "serviceRefs") {
      raw[field.id] = formData.getAll(field.id).map(String).filter(Boolean);
      continue;
    }
    for (const key of formName(field)) {
      const value = formData.get(key);
      if (value === null) continue;
      const text = String(value).trim();
      if (NUMBER_COLUMNS.has(key)) {
        raw[key] = text === "" ? undefined : text;
      } else {
        raw[key] = text;
      }
    }
  }

  return raw;
}

function toPrismaData(parsed: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  for (const column of NULLABLE_COLUMNS) {
    const value = parsed[column];
    if (value === undefined || value === "") {
      data[column] = null;
    } else if (DATE_COLUMNS.has(column)) {
      const date = new Date(String(value));
      data[column] = Number.isNaN(date.getTime()) ? null : date;
    } else if (NUMBER_COLUMNS.has(column)) {
      data[column] = Number(value);
    } else {
      data[column] = value;
    }
  }

  data.criticality = parsed.criticality ?? "MEDIUM";
  data.status = parsed.status ?? "ACTIVE";
  data.ownerId = parsed.ownerId;

  return data;
}

type LabeledChange = { field: string; label: string; from: string | null; to: string | null };

function toComparable(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function diffAsset(before: Record<string, unknown>, after: Record<string, unknown>): LabeledChange[] {
  const labels: Record<string, string> = {
    ownerId: "Sahibi",
    departmentId: "Kullanıldığı birim",
    contractorVendorId: "Yüklenici firma",
    supportVendorId: "Destek firma",
    imageUrl: "Resim",
    locRoom: "Konum - Oda",
    locCorridor: "Konum - Koridor",
    locCabinet: "Konum - Kabin",
    locShelf: "Konum - Raf",
  };
  for (const field of Object.values(FIELD_CATALOG) as FieldDef[]) {
    labels[field.id] ??= field.label;
  }

  const changes: LabeledChange[] = [];
  for (const key of Object.keys(after)) {
    const from = toComparable(before[key]);
    const to = toComparable(after[key]);
    if (from !== to) changes.push({ field: key, label: labels[key] ?? key, from, to });
  }
  return changes;
}

async function syncHostServers(assetId: string, serverIds: string[]) {
  // Mevcut bağlantıların port/protokol bilgisi korunur: yalnızca kaldırılanlar silinir, yeniler eklenir.
  const existing = await prisma.assetRelation.findMany({
    where: { sourceId: assetId, relationType: "HOSTED_ON" },
    select: { id: true, targetId: true },
  });
  const wanted = new Set(serverIds);
  const stale = existing.filter((row) => !wanted.has(row.targetId)).map((row) => row.id);
  if (stale.length) await prisma.assetRelation.deleteMany({ where: { id: { in: stale } } });
  const have = new Set(existing.map((row) => row.targetId));
  const fresh = serverIds.filter((id) => !have.has(id));
  if (!fresh.length) return;
  await prisma.assetRelation.createMany({
    data: fresh.map((targetId) => ({ sourceId: assetId, targetId, relationType: "HOSTED_ON" })),
  });
}

/** Hizmet kataloğu girişlerini bu uygulamaya bağlar; seçilmeyenlerin bağını kaldırır. */
export async function syncServedServices(assetId: string, serviceIds: string[]) {
  await prisma.catalogService.updateMany({
    where: { assetId, ...(serviceIds.length ? { id: { notIn: serviceIds } } : {}) },
    data: { assetId: null },
  });
  if (serviceIds.length) {
    await prisma.catalogService.updateMany({ where: { id: { in: serviceIds } }, data: { assetId } });
  }
}

function flattenZodErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

export async function saveAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getInventoryAccess();
  if (!access?.canPropose) return { ok: false, message: "Envanter kaydı için yetkiniz yok." };
  if (!String(formData.get("id") ?? "").trim() && !access.canDirectMutate) {
    return { ok: false, message: "Envanter ekleme yalnızca süper admin ve envanter yöneticisine açıktır." };
  }
  const assetType = String(formData.get("assetType") ?? "") as AssetTypeKey;
  const typeDef = getAssetTypeDef(assetType);
  if (!typeDef) return { ok: false, message: "Geçersiz envanter türü." };

  const id = String(formData.get("id") ?? "").trim() || null;
  if (id && !access.canEdit) return { ok: false, message: "Envanter düzenlemek için yetkiniz yok." };
  const raw = readForm(assetType, formData);
  const result = buildAssetSchema(assetType).safeParse(raw);

  if (!result.success) {
    return {
      ok: false,
      message: "Lütfen işaretli alanları kontrol edin.",
      errors: flattenZodErrors(result.error),
    };
  }

  const parsed = result.data as Record<string, unknown>;
  if (!parsed.departmentId && typeof parsed.ownerId === "string") {
    const ownerOrg = await personOrgDefaults(parsed.ownerId);
    if (ownerOrg.departmentId) parsed.departmentId = ownerOrg.departmentId;
  }
  if (!isSafeUploadUrl(typeof parsed.imageUrl === "string" ? parsed.imageUrl : null)) {
    return { ok: false, message: "Görsel adresi geçersiz.", errors: { imageUrl: "Yalnızca yüklenen görseller kullanılabilir." } };
  }
  const data = toPrismaData(parsed);
  const hostServers = (parsed.hostServers as string[] | undefined) ?? [];
  const servedServices = assetType === "APPLICATION" ? ((parsed.servedServices as string[] | undefined) ?? []) : [];

  if (!id && !access.canDirectMutate) {
    try {
      const createdApproval = await prisma.inventoryApproval.create({
        data: {
          action: "CREATE",
          status: "PENDING",
          assetType,
          payload: JSON.stringify({ assetType, data, hostServers, servedServices }),
          requestedById: access.viewer.id,
        },
      });
      await prisma.activityLog.create({
        data: {
          entityType: "InventoryApproval",
          action: "CREATE_REQUEST",
          actor: access.viewer.id,
          note: `${ASSET_TYPE_DEFS[assetType].label} ekleme onayı istendi`,
        },
      });
      await notifyIntegrations({
        kind: "inventory",
        recordId: createdApproval.id,
        ticketNo: "ENV-EKLE",
        title: `${ASSET_TYPE_DEFS[assetType].label} ekleme`,
        status: "PENDING",
        requesterId: access.viewer.id,
        managerIds: await inventoryApproverIds(),
      });
    } catch (error) {
      return fail(error, "Onay kaydı oluşturulamadı.");
    }
    revalidatePath("/envanter");
    revalidatePath("/envanter/onaylar");
    return saved("/envanter/onaylar", "Ekleme isteği envanter yöneticisine gönderildi.");
  }

  let savedId = id;
  try {
    if (id) {
      const before = await prisma.asset.findUnique({ where: { id } });
      if (!before) return { ok: false, message: "Kayıt bulunamadı." };
      if (!canViewAsset(access.viewer, access.grants, before)) {
        return { ok: false, message: "Bu kaydı düzenleme yetkiniz yok." };
      }

      const release = formData.get("releaseCustody") === "on" || formData.get("releaseCustody") === "1";
      const nextOwner = String(data.ownerId ?? "");
      if (release && nextOwner && nextOwner !== before.ownerId) {
        return {
          ok: false,
          message: "Zimmeti boşa çıkarırken yeni kişi seçmeyin. Önce boşa çıkarıp kaydedin, sonra yeni kişiye zimmetleyin.",
          errors: { ownerId: "Önce zimmeti boşa çıkarın." },
        };
      }
      if (release) {
        data.ownerId = before.ownerId;
        data.custody = CUSTODY_FREE;
        if (data.status === "ACTIVE") data.status = "IN_STOCK"; // sahipsiz cihaz "Kullanımda" olamaz
      } else if (nextOwner && nextOwner !== before.ownerId) {
        const managers = await zimmetManagerIds();
        const transfer = custodyTransfer({
          fromOwnerId: before.ownerId,
          toOwnerId: nextOwner,
          custody: before.custody,
          managerIds: managers,
          fromName: (
            await prisma.person.findUnique({ where: { id: before.ownerId }, select: { fullName: true } })
          )?.fullName,
        });
        if (!transfer.ok) {
          return { ok: false, message: transfer.message, errors: { ownerId: transfer.message } };
        }
        data.custody = transfer.custody;
      }
      if (data.status === "ACTIVE" && (data.custody ?? before.custody) === CUSTODY_FREE) {
        return {
          ok: false,
          message: "Zimmeti boş cihaz \"Kullanımda\" olamaz. Önce cihazı bir kişiye zimmetleyin.",
          errors: { status: "Kullanımda durumu için sahibi olmalıdır." },
        };
      }
      await prisma.asset.update({ where: { id }, data });
      const changes = diffAsset(before as unknown as Record<string, unknown>, data);
      if (changes.length) {
        await prisma.activityLog.create({
          data: {
            assetId: id,
            action: release ? "RELEASE" : "UPDATE",
            actor: access.viewer.id,
            changes: JSON.stringify(changes),
            note: release ? "Zimmet boşa çıkarıldı" : `${changes.length} alan güncellendi`,
          },
        });
      }
    } else {
      const created = await prisma.asset.create({ data: { assetType, ...data } as never });
      savedId = created.id;
      await prisma.activityLog.create({
        data: {
          assetId: created.id,
          action: "CREATE",
          note: `${ASSET_TYPE_DEFS[assetType].label} envanteri oluşturuldu`,
        },
      });
    }

    if (savedId) await syncHostServers(savedId, hostServers);
    if (savedId && assetType === "APPLICATION") await syncServedServices(savedId, servedServices);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    if (raw.includes("Unique") && raw.includes("stockNo")) {
      return { ok: false, message: "Bu stok numarası başka bir kayıtta kullanılıyor.", errors: { stockNo: "Stok no benzersiz olmalıdır." } };
    }
    return fail(error, "Kayıt sırasında hata oluştu.");
  }

  revalidatePath("/");
  revalidatePath("/envanter");
  if (savedId) revalidatePath(`/envanter/${savedId}`);
  return saved(`/envanter/${savedId}`);
}

export async function deleteAsset(formData: FormData) {
  formData.set("kind", "asset");
  const { deleteRecord } = await import("./delete-record");
  return deleteRecord({ ok: false }, formData);
}

export async function requestAssetDelete(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getInventoryAccess();
  if (!access?.canPropose) return { ok: false, message: "Silme isteği için yetkiniz yok." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Kayıt belirtilmedi." };
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return { ok: false, message: "Kayıt bulunamadı." };
  if (!canViewAsset(access.viewer, access.grants, asset)) {
    return { ok: false, message: "Bu kaydı görme yetkiniz yok." };
  }

  if (access.canDirectMutate) {
    try {
      await prisma.$transaction([
        prisma.serviceRequest.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.changeRecord.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.patchRecord.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.appConfig.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.vulnerability.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.incident.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.problem.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.slaTicket.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.inventoryApproval.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.asset.delete({ where: { id } }),
      ]);
      await prisma.activityLog.create({
        data: {
          entityType: "asset",
          entityId: id,
          action: "DELETE",
          actor: access.viewer.id,
          note: "Envanter kaydı envanter yöneticisi tarafından silindi",
        },
      });
    } catch {
      return { ok: false, message: "Kayıt silinemedi. Bağlı kayıtlar olabilir." };
    }
    revalidatePath("/");
    revalidatePath("/envanter");
    return saved("/envanter", "Kayıt silindi.");
  }

  const existing = await prisma.inventoryApproval.findFirst({
    where: { action: "DELETE", assetId: id, status: "PENDING" },
  });
  if (existing) return saved("/envanter/onaylar", "Bu kayıt için bekleyen silme isteği zaten var.");

  const deleteApproval = await prisma.inventoryApproval.create({
    data: {
      action: "DELETE",
      status: "PENDING",
      assetType: asset.assetType,
      assetId: id,
      requestedById: access.viewer.id,
      reason: String(formData.get("reason") ?? "").trim() || null,
    },
  });
  await prisma.activityLog.create({
    data: {
      assetId: id,
      entityType: "InventoryApproval",
      action: "DELETE_REQUEST",
      actor: access.viewer.id,
      note: "Silme onayı istendi",
    },
  });
  await notifyIntegrations({
    kind: "inventory",
    recordId: deleteApproval.id,
    ticketNo: "ENV-SIL",
    title: "Envanter silme",
    status: "PENDING",
    requesterId: access.viewer.id,
    managerIds: await inventoryApproverIds(),
  });
  revalidatePath("/envanter");
  revalidatePath(`/envanter/${id}`);
  revalidatePath("/envanter/onaylar");
  return saved("/envanter/onaylar", "Silme isteği envanter yöneticisine gönderildi.");
}

export async function updateLifecycleStatus(formData: FormData) {
  const access = await getInventoryAccess();
  if (!access?.canEdit) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(LIFECYCLE_STATUSES as readonly string[]).includes(status)) return;

  const before = await prisma.asset.findUnique({ where: { id } });
  if (!before || before.status === status) return;
  // Kullanımda olan her cihazın zimmetli bir sahibi olmalı
  if (status === "ACTIVE" && (before.custody === CUSTODY_FREE || !before.ownerId)) return;

  await prisma.asset.update({ where: { id }, data: { status } });
  await prisma.activityLog.create({
    data: {
      assetId: id,
      action: "UPDATE",
      changes: JSON.stringify([
        { field: "status", label: "Yaşam döngüsü durumu", from: before.status, to: status },
      ]),
      note: "Durum değiştirildi",
    },
  });

  revalidatePath("/");
  revalidatePath("/envanter");
  revalidatePath(`/envanter/${id}`);
}
