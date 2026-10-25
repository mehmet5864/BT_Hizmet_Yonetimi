"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { RELATION_TYPES } from "@/lib/inventory/constants";
import { prisma } from "@/lib/prisma";
import { canUseTopology } from "@/lib/topology/access";
import { RELATION_PROTOCOLS } from "@/lib/topology/labels";
import { fail, saved, type ActionState } from "./shared";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const denied: ActionState = { ok: false, message: "Bu işlem için yetkiniz yok." };

export async function saveAssetRelation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await getViewer();
    if (!viewer || !canUseTopology(viewer.role)) return { ...denied, stamp: Date.now() };
    const assetId = text(formData, "assetId");
    const otherId = text(formData, "otherId");
    const direction = text(formData, "direction") === "in" ? "in" : "out";
    const relationType = text(formData, "relationType");
    const port = text(formData, "port");
    const protocol = text(formData, "protocol");
    const note = text(formData, "note").slice(0, 300);

    if (!assetId || !otherId) return { ok: false, message: "Her iki varlığı da seçin.", stamp: Date.now() };
    if (assetId === otherId) return { ok: false, message: "Bir varlık kendine bağlanamaz.", stamp: Date.now() };
    if (!(RELATION_TYPES as readonly string[]).includes(relationType)) return { ok: false, message: "Geçersiz bağlantı türü.", stamp: Date.now() };
    if (port && !/^[0-9][0-9,\-\s]{0,38}$/.test(port)) return { ok: false, message: "Port yalnızca rakam, virgül ve tire içerebilir (örn. 1433 veya 80,443).", stamp: Date.now() };
    if (protocol && !(RELATION_PROTOCOLS as readonly string[]).includes(protocol)) return { ok: false, message: "Geçersiz protokol.", stamp: Date.now() };

    const sourceId = direction === "out" ? assetId : otherId;
    const targetId = direction === "out" ? otherId : assetId;
    const count = await prisma.asset.count({ where: { id: { in: [sourceId, targetId] } } });
    if (count !== 2) return { ok: false, message: "Varlık bulunamadı.", stamp: Date.now() };

    await prisma.assetRelation.upsert({
      where: { sourceId_targetId_relationType: { sourceId, targetId, relationType } },
      create: { sourceId, targetId, relationType, port: port || null, protocol: protocol || null, note: note || null },
      update: { port: port || null, protocol: protocol || null, note: note || null },
    });
    await prisma.activityLog.create({
      data: {
        assetId,
        entityType: "Asset",
        entityId: assetId,
        action: "RELATION_SAVE",
        actor: (await getSession())?.fullName ?? viewer.id,
        note: `Bağlantı kaydedildi: ${relationType}${protocol || port ? ` (${[protocol, port].filter(Boolean).join("/")})` : ""}`,
      },
    });
    revalidatePath("/hizmetler/topoloji");
    return saved(undefined, "Bağlantı kaydedildi.");
  } catch (error) {
    return fail(error, "Bağlantı kaydedilemedi.");
  }
}

export async function deleteAssetRelation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await getViewer();
    if (!viewer || !canUseTopology(viewer.role)) return { ...denied, stamp: Date.now() };
    const id = text(formData, "id");
    if (!id) return { ok: false, message: "Kayıt seçilmedi.", stamp: Date.now() };
    const row = await prisma.assetRelation.findUnique({ where: { id }, select: { id: true, sourceId: true, relationType: true } });
    if (!row) return { ok: false, message: "Kayıt bulunamadı.", stamp: Date.now() };
    await prisma.assetRelation.delete({ where: { id } });
    await prisma.activityLog.create({
      data: {
        assetId: row.sourceId,
        entityType: "Asset",
        entityId: row.sourceId,
        action: "RELATION_DELETE",
        actor: (await getSession())?.fullName ?? viewer.id,
        note: `Bağlantı kaldırıldı: ${row.relationType}`,
      },
    });
    revalidatePath("/hizmetler/topoloji");
    return saved(undefined, "Bağlantı kaldırıldı.");
  } catch (error) {
    return fail(error, "Bağlantı kaldırılamadı.");
  }
}
