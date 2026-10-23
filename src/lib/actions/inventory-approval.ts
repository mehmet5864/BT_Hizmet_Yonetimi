"use server";

import { revalidatePath } from "next/cache";

import { getInventoryAccess } from "@/lib/auth/inventory";
import { ASSET_TYPE_DEFS } from "@/lib/inventory/asset-types";
import { prisma } from "@/lib/prisma";
import { fail, saved, type ActionState } from "./shared";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

async function applyCreate(payload: string, assetType: string, reviewerId: string) {
  let parsed: { data?: Record<string, unknown>; hostServers?: string[]; servedServices?: string[]; assetType?: string };
  try {
    parsed = JSON.parse(payload) as { data?: Record<string, unknown>; hostServers?: string[]; servedServices?: string[]; assetType?: string };
  } catch {
    throw new Error("Onay verisi okunamadı.");
  }
  const data = { ...(parsed.data ?? {}), assetType: parsed.assetType ?? assetType };
  const created = await prisma.asset.create({ data: data as never });
  const hostServers = parsed.hostServers ?? [];
  if (hostServers.length) {
    await prisma.assetRelation.createMany({
      data: hostServers.map((targetId) => ({ sourceId: created.id, targetId, relationType: "HOSTED_ON" })),
    });
  }
  if (parsed.servedServices?.length) {
    await prisma.catalogService.updateMany({ where: { id: { in: parsed.servedServices } }, data: { assetId: created.id } });
  }
  await prisma.activityLog.create({
    data: {
      assetId: created.id,
      action: "CREATE",
      actor: reviewerId,
      note: `${ASSET_TYPE_DEFS[assetType as keyof typeof ASSET_TYPE_DEFS]?.label ?? "Envanter"} onayla eklendi`,
    },
  });
  return created.id;
}

async function applyDelete(assetId: string, reviewerId: string) {
  await prisma.$transaction([
    prisma.serviceRequest.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.changeRecord.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.patchRecord.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.appConfig.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.vulnerability.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.incident.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.problem.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.slaTicket.updateMany({ where: { assetId }, data: { assetId: null } }),
    prisma.asset.delete({ where: { id: assetId } }),
  ]);
  await prisma.activityLog.create({
    data: {
      entityType: "asset",
      entityId: assetId,
      action: "DELETE",
      actor: reviewerId,
      note: "Envanter kaydı onayla silindi",
    },
  });
}

export async function applyInventoryDecision(input: {
  id: string;
  decision: "APPROVED" | "REJECTED";
  reviewerId: string;
  note?: string | null;
}): Promise<ActionState> {
  const { id, decision, reviewerId, note } = input;
  const row = await prisma.inventoryApproval.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "Onay kaydı bulunamadı." };
  if (row.status !== "PENDING") return { ok: false, message: "Bu istek zaten sonuçlandırılmış." };

  try {
    if (decision === "APPROVED") {
      if (row.action === "CREATE") {
        if (!row.payload) return { ok: false, message: "Ekleme verisi eksik." };
        const createdId = await applyCreate(row.payload, row.assetType ?? "", reviewerId);
        await prisma.inventoryApproval.update({
          where: { id },
          data: {
            status: "APPROVED",
            assetId: createdId,
            reviewedById: reviewerId,
            reviewedAt: new Date(),
            reviewNote: note,
          },
        });
      } else if (row.action === "DELETE") {
        if (!row.assetId) return { ok: false, message: "Silinecek kayıt yok." };
        await applyDelete(row.assetId, reviewerId);
        await prisma.inventoryApproval.update({
          where: { id },
          data: {
            status: "APPROVED",
            reviewedById: reviewerId,
            reviewedAt: new Date(),
            reviewNote: note,
          },
        });
      }
    } else {
      await prisma.inventoryApproval.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });
    }
    revalidatePath("/envanter");
    revalidatePath("/envanter/onaylar");
    revalidatePath("/");
    return saved(
      "/envanter/onaylar",
      decision === "APPROVED" ? "İstek onaylandı ve uygulandı." : "İstek reddedildi.",
    );
  } catch (error) {
    return fail(error, "Onay işlenemedi.");
  }
}

export async function decideInventoryApproval(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getInventoryAccess();
  if (!access?.canApprove) return { ok: false, message: "Envanter onayını yalnızca modül yöneticisi veya süper yönetici verebilir." };
  const id = text(formData, "id");
  const decision = text(formData, "decision");
  const note = text(formData, "note");
  if (!id || (decision !== "APPROVED" && decision !== "REJECTED")) {
    return { ok: false, message: "Karar seçilmedi." };
  }
  if (decision === "REJECTED" && !note) return { ok: false, message: "Reddetme gerekçesi zorunludur." };
  return applyInventoryDecision({ id, decision, reviewerId: access.viewer.id, note });
}
