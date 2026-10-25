"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { canUseTopology } from "@/lib/topology/access";
import { isAudienceKind } from "@/lib/topology/types";
import { fail, saved, type ActionState } from "./shared";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveServiceAccessRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await getViewer();
    if (!viewer || !canUseTopology(viewer.role)) return { ok: false, message: "Bu işlem için yetkiniz yok.", stamp: Date.now() };
    const serviceId = text(formData, "serviceId");
    const audience = text(formData, "audience").slice(0, 80);
    const kind = text(formData, "kind") || "CLIENT";
    const ports = text(formData, "ports");
    const note = text(formData, "note").slice(0, 200);
    if (!serviceId) return { ok: false, message: "Hizmet seçili değil.", stamp: Date.now() };
    if (!audience) return { ok: false, message: "Kullanıcı grubu adını yazın.", stamp: Date.now() };
    if (!isAudienceKind(kind)) return { ok: false, message: "Geçersiz grup türü.", stamp: Date.now() };
    if (!ports || ports.length > 120 || !/\d/.test(ports) || !/^[A-Za-z0-9ÇĞİÖŞÜçğıöşü ,/:\-]+$/.test(ports)) {
      return { ok: false, message: "Portları “443” veya “HTTPS 443, SSH 22, RDP 3389” biçiminde yazın.", stamp: Date.now() };
    }
    const service = await prisma.catalogService.findUnique({ where: { id: serviceId }, select: { id: true, name: true } });
    if (!service) return { ok: false, message: "Hizmet bulunamadı.", stamp: Date.now() };

    const existing = await prisma.serviceAccessRule.findFirst({ where: { serviceId, audience, kind }, select: { id: true } });
    if (existing) {
      await prisma.serviceAccessRule.update({ where: { id: existing.id }, data: { ports, note: note || null } });
    } else {
      await prisma.serviceAccessRule.create({ data: { serviceId, audience, kind, ports, note: note || null } });
    }
    await prisma.activityLog.create({
      data: {
        entityType: "CatalogService",
        entityId: serviceId,
        action: "ACCESS_RULE_SAVE",
        actor: (await getSession())?.fullName ?? viewer.id,
        note: `${service.name}: ${audience} → ${ports}`,
      },
    });
    revalidatePath("/hizmetler/topoloji");
    return saved(undefined, "Erişim kuralı kaydedildi.");
  } catch (error) {
    return fail(error, "Erişim kuralı kaydedilemedi.");
  }
}

export async function deleteServiceAccessRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await getViewer();
    if (!viewer || !canUseTopology(viewer.role)) return { ok: false, message: "Bu işlem için yetkiniz yok.", stamp: Date.now() };
    const id = text(formData, "id");
    if (!id) return { ok: false, message: "Kayıt seçilmedi.", stamp: Date.now() };
    const rule = await prisma.serviceAccessRule.findUnique({ where: { id }, select: { id: true, serviceId: true, audience: true, ports: true } });
    if (!rule) return { ok: false, message: "Kayıt bulunamadı.", stamp: Date.now() };
    await prisma.serviceAccessRule.delete({ where: { id } });
    await prisma.activityLog.create({
      data: {
        entityType: "CatalogService",
        entityId: rule.serviceId,
        action: "ACCESS_RULE_DELETE",
        actor: (await getSession())?.fullName ?? viewer.id,
        note: `${rule.audience} → ${rule.ports} kuralı kaldırıldı`,
      },
    });
    revalidatePath("/hizmetler/topoloji");
    return saved(undefined, "Erişim kuralı kaldırıldı.");
  } catch (error) {
    return fail(error, "Erişim kuralı kaldırılamadı.");
  }
}
