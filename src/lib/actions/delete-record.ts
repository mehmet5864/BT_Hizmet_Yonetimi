"use server";

import { revalidatePath } from "next/cache";

import { canDeleteRecords } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { saved, type ActionState } from "./shared";

export type DeleteKind =
  | "asset"
  | "person"
  | "request"
  | "change"
  | "patch"
  | "config"
  | "vuln"
  | "vendor"
  | "sla"
  | "incident"
  | "problem"
  | "catalog"
  | "itil-process";

const REDIRECT: Record<DeleteKind, string> = {
  asset: "/envanter",
  person: "/personel",
  request: "/talepler",
  change: "/degisiklik",
  patch: "/yama",
  config: "/konfigurasyon",
  vuln: "/zafiyet",
  vendor: "/firma-sla",
  sla: "/firma-sla",
  incident: "/olay",
  problem: "/problem",
  catalog: "/katalog",
  "itil-process": "/hizmetler",
};

async function effectiveRole(user: { id: string; role: string }) {
  if (canDeleteRecords(user.role)) return user.role;
  const person = await prisma.person.findUnique({ where: { id: user.id }, select: { role: true } });
  return person?.role ?? user.role;
}

async function requireSuperAdmin() {
  const user = await getSession();
  if (!user) return null;
  const role = await effectiveRole(user);
  if (!canDeleteRecords(role)) return null;
  return { ...user, role: "SUPER_ADMIN" as const };
}

export async function deleteRecord(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, message: "Kayıt silmek yalnızca süper yöneticiye açıktır." };

  const kind = String(formData.get("kind") ?? "") as DeleteKind;
  const id = String(formData.get("id") ?? "");
  if (!id || !REDIRECT[kind]) return { ok: false, message: "Silinecek kayıt belirtilmedi." };

  // Silinen kayda bağlı Çevik iş / süreç akışı adımı / ilişkili kayıt bağlarını temizle.
  const agileSource: Partial<Record<DeleteKind, string>> = {
    incident: "INCIDENT", problem: "PROBLEM", change: "CHANGE", patch: "PATCH", vuln: "VULNERABILITY", request: "REQUEST",
  };
  const flowKind: Partial<Record<DeleteKind, string>> = {
    incident: "INCIDENT", problem: "PROBLEM", change: "CHANGE", patch: "PATCH", vuln: "VULNERABILITY",
  };
  const cleanupLinks = async () => {
    const src = agileSource[kind];
    if (src) {
      await prisma.agileItem.updateMany({ where: { sourceType: src, sourceId: id }, data: { sourceId: null } });
    }
    const fk = flowKind[kind];
    if (fk) {
      await prisma.processFlowStep.updateMany({ where: { kind: fk, recordId: id }, data: { recordId: null, recordNo: null } });
    }
    if (kind === "incident") {
      await prisma.changeRecord.updateMany({ where: { incidentId: id }, data: { incidentId: null } });
    }
    if (kind === "problem") {
      await prisma.changeRecord.updateMany({ where: { problemId: id }, data: { problemId: null } });
    }
    if (kind === "change") {
      await prisma.incident.updateMany({ where: { changeId: id }, data: { changeId: null } });
      await prisma.problem.updateMany({ where: { changeId: id }, data: { changeId: null } });
    }
    if (kind === "catalog") {
      await prisma.incident.updateMany({ where: { serviceId: id }, data: { serviceId: null } });
      await prisma.problem.updateMany({ where: { serviceId: id }, data: { serviceId: null } });
    }
  };

  try {
    await cleanupLinks();
    if (kind === "person") {
      if (actor.id === id) return { ok: false, message: "Kendi hesabınızı silemezsiniz." };
      const owned = await prisma.asset.count({ where: { ownerId: id } });
      if (owned) return { ok: false, message: "Bu personelin zimmetli envanteri var. Önce envanteri aktarın veya silin." };
      await prisma.person.delete({ where: { id } });
    } else if (kind === "asset") {
      await prisma.$transaction([
        prisma.serviceRequest.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.changeRecord.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.patchRecord.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.appConfig.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.vulnerability.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.incident.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.problem.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.slaTicket.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.catalogService.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.itilProcessRecord.updateMany({ where: { assetId: id }, data: { assetId: null } }),
        prisma.asset.delete({ where: { id } }),
      ]);
    } else if (kind === "request") {
      await prisma.serviceRequest.delete({ where: { id } });
    } else if (kind === "change") {
      await prisma.changeRecord.delete({ where: { id } });
    } else if (kind === "patch") {
      await prisma.patchRecord.delete({ where: { id } });
    } else if (kind === "config") {
      await prisma.appConfig.delete({ where: { id } });
    } else if (kind === "vuln") {
      await prisma.vulnerability.delete({ where: { id } });
    } else if (kind === "vendor") {
      const used = await prisma.asset.count({
        where: { OR: [{ contractorVendorId: id }, { supportVendorId: id }] },
      });
      if (used) return { ok: false, message: "Bu firmaya bağlı envanter var. Önce bağlantıyı kaldırın." };
      const openTickets = await prisma.slaTicket.count({
        where: { vendorId: id, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
      });
      if (openTickets) return { ok: false, message: "Bu firmada açık arıza kaydı var. Önce kapatın veya silin." };
      await prisma.slaTicket.updateMany({ where: { vendorId: id }, data: { vendorId: null, productId: null } });
      await prisma.vendor.delete({ where: { id } });
    } else if (kind === "sla") {
      await prisma.slaTicket.delete({ where: { id } });
    } else if (kind === "incident") {
      await prisma.problem.updateMany({ where: { incidentId: id }, data: { incidentId: null } });
      await prisma.incident.delete({ where: { id } });
    } else if (kind === "problem") {
      await prisma.problem.delete({ where: { id } });
    } else if (kind === "catalog") {
      const linked = await prisma.itilProcessRecord.count({ where: { serviceId: id } });
      if (linked) {
        await prisma.itilProcessRecord.updateMany({ where: { serviceId: id }, data: { serviceId: null } });
      }
      await prisma.catalogService.delete({ where: { id } });
    } else if (kind === "itil-process") {
      await prisma.itilProcessRecord.delete({ where: { id } });
    }

    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        actor: actor.adUsername ?? actor.fullName,
        entityType: kind,
        entityId: id,
        note: `${kind} kaydı süper yönetici tarafından silindi`,
      },
    });
  } catch {
    return { ok: false, message: "Kayıt silinemedi. Bağlı kayıtlar olabilir." };
  }

  revalidatePath("/");
  revalidatePath(REDIRECT[kind]);
  return saved(REDIRECT[kind], "Kayıt silindi.");
}

export async function viewerCanDelete() {
  const user = await getSession();
  if (!user) return false;
  return canDeleteRecords(await effectiveRole(user));
}
