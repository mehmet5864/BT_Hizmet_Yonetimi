import { mailAssignment } from "@/lib/workflow/notify";
import { parsePersonGroups } from "@/lib/auth/acl";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings-store";

export type AssignResult = { assigneeId: string | null; assigneeName: string | null };

const OPEN_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING"];

/**
 * Onaylanan talebi gerçekleştirecek birimde (işleyen birim) en az açık işi olan kişiye atar.
 * Birimde uygun kişi yoksa işleyen birim amirine atanır. Zaten atanmışsa dokunmaz.
 */
export async function assignRequestToUnit(requestId: string): Promise<AssignResult> {
  const row = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, requestNo: true, requestType: true, requesterId: true, handlingDeptId: true, handlingManagerId: true, assigneeId: true },
  });
  if (!row) return { assigneeId: null, assigneeName: null };
  if (row.assigneeId) {
    const current = await prisma.person.findUnique({ where: { id: row.assigneeId }, select: { fullName: true } });
    return { assigneeId: row.assigneeId, assigneeName: current?.fullName ?? null };
  }

  let chosen: { id: string; fullName: string } | null = null;

  // Talep türünün AD güvenlik grubu (Ayarlar → Talep grupları) tanımlıysa önce o grubun üyeleri aranır.
  const settings = await getSystemSettings();
  const group = (settings.requestGroups[row.requestType] ?? "").trim().toLocaleLowerCase("tr");
  let groupMembers: { id: string; fullName: string }[] = [];
  if (group) {
    const candidates = await prisma.person.findMany({
      where: { adGroups: { contains: group, mode: "insensitive" }, id: { not: row.requesterId } },
      select: { id: true, fullName: true, adGroups: true },
      take: 500,
    });
    groupMembers = candidates
      .filter((p) => parsePersonGroups(p.adGroups).some((g) => g.trim().toLocaleLowerCase("tr") === group))
      .map((p) => ({ id: p.id, fullName: p.fullName }));
  }

  if (row.handlingDeptId || groupMembers.length) {
    const deptMembers = groupMembers.length
      ? []
      : await prisma.person.findMany({
          where: {
            departmentId: row.handlingDeptId ?? undefined,
            id: { notIn: [row.requesterId, ...(row.handlingManagerId ? [row.handlingManagerId] : [])] },
          },
          select: { id: true, fullName: true },
          take: 500,
        });
    const members = groupMembers.length ? groupMembers : deptMembers;
    if (members.length) {
      const counts = await prisma.serviceRequest.groupBy({
        by: ["assigneeId"],
        where: { assigneeId: { in: members.map((m) => m.id) }, status: { in: OPEN_STATUSES } },
        _count: { _all: true },
      });
      const load = new Map<string, number>();
      for (const c of counts) if (c.assigneeId) load.set(c.assigneeId, c._count._all);
      chosen = [...members].sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0) || a.fullName.localeCompare(b.fullName, "tr"))[0];
    }
  }
  if (!chosen && row.handlingManagerId) {
    const manager = await prisma.person.findUnique({ where: { id: row.handlingManagerId }, select: { id: true, fullName: true } });
    if (manager) chosen = manager;
  }
  if (!chosen) return { assigneeId: null, assigneeName: null };

  await prisma.serviceRequest.update({ where: { id: requestId }, data: { assigneeId: chosen.id, assignedAt: new Date() } });
  await prisma.activityLog.create({
    data: {
      entityType: "ServiceRequest",
      entityId: requestId,
      action: "ASSIGN",
      note: `${row.requestNo} ${groupMembers.length ? `AD grubu (${settings.requestGroups[row.requestType]}) üyesi` : "gerçekleştirecek birimde"} ${chosen.fullName} kişisine atandı.`,
    },
  });
  await mailAssignment({ requestId, assigneeId: chosen.id, managerId: row.handlingManagerId }).catch(() => null);
  return { assigneeId: chosen.id, assigneeName: chosen.fullName };
}
