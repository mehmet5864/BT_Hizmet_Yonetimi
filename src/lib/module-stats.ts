import { EXPIRY_WARNING_DAYS, type AssetTypeKey } from "@/lib/inventory/constants";
import { prisma } from "@/lib/prisma";
import { ASSET_LIST_INCLUDE } from "@/lib/queries";

export async function getPersonnelDashboard(db: typeof prisma = prisma) {
  const [total, withAd, withOffice, noDept, managers, byRole, byDept, recent] = await Promise.all([
    db.person.count(),
    db.person.count({ where: { adUsername: { not: null } } }),
    db.person.count({ where: { requestOffice: { not: null } } }),
    db.person.count({ where: { departmentId: null } }),
    db.person.count({
      where: { role: { in: ["UNIT_MANAGER", "SENIOR_MANAGER", "INFOSEC_MANAGER", "SYSTEM_ADMIN", "SUPER_ADMIN"] } },
    }),
    db.person.groupBy({ by: ["role"], _count: { _all: true } }),
    db.person.groupBy({ by: ["departmentId"], _count: { _all: true } }),
    db.person.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { department: true },
    }),
  ]);
  const departments = await prisma.department.findMany({
    where: { id: { in: byDept.map((row) => row.departmentId).filter((id): id is string => Boolean(id)) } },
    select: { id: true, name: true },
  });
  const deptNames = Object.fromEntries(departments.map((row) => [row.id, row.name]));
  return {
    total,
    withAd,
    withOffice,
    noDept,
    managers,
    byRole: Object.fromEntries(byRole.map((row) => [row.role, row._count._all])),
    byDepartment: byDept
      .map((row) => ({
        id: row.departmentId,
        label: row.departmentId ? (deptNames[row.departmentId] ?? "Birim") : "Birimsiz",
        value: row._count._all,
      }))
      .sort((a, b) => b.value - a.value),
    recent,
  };
}

export async function getInventoryModuleStats(type?: AssetTypeKey, scopeWhere: Record<string, unknown> = {}) {
  const where = {
    ...(type ? { assetType: type } : {}),
    ...scopeWhere,
  };
  const warningLimit = new Date();
  warningLimit.setDate(warningLimit.getDate() + EXPIRY_WARNING_DAYS);
  const [total, high, expiring, missingSupport, withOpenVulns, byCriticality, byStatus, byType] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.count({ where: { ...where, criticality: "HIGH" } }),
    prisma.asset.count({ where: { ...where, supportEndDate: { lte: warningLimit } } }),
    prisma.asset.count({
      where: { ...where, supportEndDate: null, ...(type ? {} : { assetType: { not: "SOFTWARE" } }) },
    }),
    prisma.asset.count({ where: { ...where, vulnerabilities: { some: { status: "OPEN" } } } }),
    prisma.asset.groupBy({ by: ["criticality"], where, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["assetType"], where, _count: { _all: true } }),
  ]);
  const expiringRows = await prisma.asset.findMany({
    where: { ...where, supportEndDate: { lte: warningLimit } },
    include: ASSET_LIST_INCLUDE,
    orderBy: { supportEndDate: "asc" },
    take: 6,
  });
  return {
    total,
    high,
    expiring,
    missingSupport,
    withOpenVulns,
    byCriticality: Object.fromEntries(byCriticality.map((row) => [row.criticality, row._count._all])),
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    byType: Object.fromEntries(byType.map((row) => [row.assetType, row._count._all])),
    expiringRows,
  };
}

export async function getChangeDashboard(db: typeof prisma = prisma) {
  const [total, pending, inProgress, completed, rejected, byStatus, byKind, recent] = await Promise.all([
    db.changeRecord.count(),
    db.changeRecord.count({ where: { status: "PENDING" } }),
    db.changeRecord.count({ where: { status: { in: ["APPROVED", "IN_PROGRESS"] } } }),
    db.changeRecord.count({ where: { status: "COMPLETED" } }),
    db.changeRecord.count({ where: { status: "REJECTED" } }),
    db.changeRecord.groupBy({ by: ["status"], _count: { _all: true } }),
    db.changeRecord.groupBy({ by: ["changeKind"], _count: { _all: true } }),
    db.changeRecord.findMany({
      include: { requester: true, requestingDept: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);
  return {
    total,
    pending,
    inProgress,
    completed,
    rejected,
    active: pending + inProgress,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    byKind: Object.fromEntries(byKind.map((row) => [row.changeKind ?? "OTHER", row._count._all])),
    recent,
  };
}

export async function getPatchDashboard(db: typeof prisma = prisma) {
  const [total, pending, inProgress, completed, byStatus, recent] = await Promise.all([
    db.patchRecord.count(),
    db.patchRecord.count({ where: { status: "PENDING" } }),
    db.patchRecord.count({ where: { status: { in: ["APPROVED", "IN_PROGRESS"] } } }),
    db.patchRecord.count({ where: { status: "COMPLETED" } }),
    db.patchRecord.groupBy({ by: ["status"], _count: { _all: true } }),
    db.patchRecord.findMany({
      include: { requester: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);
  return {
    total,
    pending,
    inProgress,
    completed,
    active: pending + inProgress,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    recent,
  };
}

export async function getConfigDashboard(db: typeof prisma = prisma) {
  const [total, withBackup, withoutBackup, recent] = await Promise.all([
    db.appConfig.count(),
    db.appConfig.count({ where: { backupDate: { not: null } } }),
    db.appConfig.count({ where: { backupDate: null } }),
    db.appConfig.findMany({
      include: { owner: true, department: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);
  return { total, withBackup, withoutBackup, recent };
}

export async function getVulnDashboard(db: typeof prisma = prisma) {
  const now = new Date();
  const [total, open, critical, high, overdue, bySeverity, byStatus, recent] = await Promise.all([
    db.vulnerability.count(),
    db.vulnerability.count({ where: { status: "OPEN" } }),
    db.vulnerability.count({ where: { severity: "CRITICAL", status: "OPEN" } }),
    db.vulnerability.count({ where: { severity: "HIGH", status: "OPEN" } }),
    db.vulnerability.count({ where: { status: "OPEN", dueDate: { lt: now } } }),
    db.vulnerability.groupBy({ by: ["severity"], _count: { _all: true } }),
    db.vulnerability.groupBy({ by: ["status"], _count: { _all: true } }),
    db.vulnerability.findMany({
      include: { owner: true, department: true },
      orderBy: { detectedAt: "desc" },
      take: 8,
    }),
  ]);
  return {
    total,
    open,
    critical,
    high,
    overdue,
    bySeverity: Object.fromEntries(bySeverity.map((row) => [row.severity, row._count._all])),
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    recent,
  };
}

export async function getSlaDashboard(db: typeof prisma = prisma) {
  const [vendors, tickets, open, high, byStatus, recent] = await Promise.all([
    prisma.vendor.count(),
    db.slaTicket.count(),
    db.slaTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }),
    db.slaTicket.count({ where: { severity: { in: ["HIGH", "CRITICAL"] }, status: { notIn: ["DONE", "CANCELLED"] } } }),
    db.slaTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    db.slaTicket.findMany({
      include: { owner: true, vendor: true },
      orderBy: { openedAt: "desc" },
      take: 8,
    }),
  ]);
  return {
    vendors,
    tickets,
    open,
    high,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    recent,
  };
}

export async function getIncidentDashboard(db: typeof prisma = prisma) {
  const [total, open, contained, resolved, layer2, pendingEscalate, byStatus, recent] = await Promise.all([
    db.incident.count(),
    db.incident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    db.incident.count({ where: { status: "CONTAINED" } }),
    db.incident.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    db.incident.count({ where: { layer: "L2" } }),
    db.incident.count({ where: { escalationStatus: "PENDING" } }),
    db.incident.groupBy({ by: ["status"], _count: { _all: true } }),
    db.incident.findMany({
      include: { department: true, l1Analyst: true },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
  ]);
  return {
    total,
    open,
    contained,
    resolved,
    layer2,
    pendingEscalate,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    recent,
  };
}

export async function getProblemDashboard(db: typeof prisma = prisma) {
  const [total, open, knownError, resolved, linked, pendingAssignment, byStatus, recent] = await Promise.all([
    db.problem.count(),
    db.problem.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    db.problem.count({ where: { status: "KNOWN_ERROR" } }),
    db.problem.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    db.problem.count({ where: { incidentId: { not: null } } }),
    db.problem.count({ where: { assignmentStatus: "PENDING" } }),
    db.problem.groupBy({ by: ["status"], _count: { _all: true } }),
    db.problem.findMany({
      include: { incident: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);
  return {
    total,
    open,
    knownError,
    resolved,
    linked,
    pendingAssignment,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    recent,
  };
}

export async function getActivityDashboard() {
  const [total, created, updated, deleted, byAction, byEntity, recent] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.count({ where: { action: "CREATE" } }),
    prisma.activityLog.count({ where: { action: "UPDATE" } }),
    prisma.activityLog.count({ where: { action: "DELETE" } }),
    prisma.activityLog.groupBy({ by: ["action"], _count: { _all: true } }),
    prisma.activityLog.groupBy({ by: ["entityType"], _count: { _all: true } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { asset: { select: { id: true, name: true, stockNo: true, assetType: true } } },
    }),
  ]);
  return {
    total,
    created,
    updated,
    deleted,
    byAction: Object.fromEntries(byAction.map((row) => [row.action, row._count._all])),
    byEntity: byEntity
      .map((row) => ({ label: row.entityType ?? "Envanter", value: row._count._all }))
      .sort((a, b) => b.value - a.value),
    recent,
  };
}
