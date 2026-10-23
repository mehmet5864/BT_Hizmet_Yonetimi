import { prisma } from "@/lib/prisma";

const ALL_LOG_ROLES = new Set(["SUPER_ADMIN", "SYSTEM_ADMIN", "INFOSEC_MANAGER", "SENIOR_MANAGER"]);

export function canSeeAllActivity(role?: string | null) {
  return Boolean(role && ALL_LOG_ROLES.has(role));
}

export async function ownActivityWhere(viewer: {
  id: string;
  fullName: string;
  adUsername?: string | null;
}) {
  const id = viewer.id;
  const [requests, changes, patches, incidents, problems, slas, approvals] = await Promise.all([
    prisma.serviceRequest.findMany({ where: { requesterId: id }, select: { id: true } }),
    prisma.changeRecord.findMany({ where: { requesterId: id }, select: { id: true } }),
    prisma.patchRecord.findMany({ where: { requesterId: id }, select: { id: true } }),
    prisma.incident.findMany({
      where: { OR: [{ requesterId: id }, { l1AnalystId: id }, { l2AnalystId: id }] },
      select: { id: true },
    }),
    prisma.problem.findMany({
      where: { OR: [{ requesterId: id }, { assigneeId: id }, { proposedAssigneeId: id }] },
      select: { id: true },
    }),
    prisma.slaTicket.findMany({
      where: { OR: [{ requesterId: id }, { ownerId: id }] },
      select: { id: true },
    }),
    prisma.inventoryApproval.findMany({ where: { requestedById: id }, select: { id: true } }),
  ]);

  const actors = [viewer.id, viewer.fullName, viewer.adUsername].filter((value): value is string => Boolean(value));
  const entityClauses = [
    ["ServiceRequest", requests],
    ["ChangeRecord", changes],
    ["PatchRecord", patches],
    ["Incident", incidents],
    ["Problem", problems],
    ["SlaTicket", slas],
    ["InventoryApproval", approvals],
  ]
    .filter(([, rows]) => rows.length)
    .map(([entityType, rows]) => ({
      entityType: entityType as string,
      entityId: { in: (rows as { id: string }[]).map((row) => row.id) },
    }));

  return {
    OR: [{ actor: { in: actors } }, { asset: { ownerId: id } }, ...entityClauses],
  };
}

export async function activityWhereForViewer(viewer: {
  id: string;
  role?: string | null;
  fullName: string;
  adUsername?: string | null;
}) {
  if (canSeeAllActivity(viewer.role)) return {};
  return ownActivityWhere(viewer);
}
