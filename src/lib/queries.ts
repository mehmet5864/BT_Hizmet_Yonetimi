import { requestScopeFilter } from "@/lib/itil/escalation";
import { prisma } from "@/lib/prisma";
import { EXPIRY_WARNING_DAYS, type AssetTypeKey } from "@/lib/inventory/constants";

export type AssetFilters = {
  type?: AssetTypeKey;
  criticality?: string;
  status?: string;
  departmentId?: string;
  ownerId?: string;
  supportStatus?: string;
  query?: string;
  operatingSystem?: string;
  version?: string;
  expiring?: boolean;
  withOpenVulns?: boolean;
};

export function buildAssetWhere(filters: AssetFilters) {
  const where: Record<string, unknown> = {};

  if (filters.type) where.assetType = filters.type;
  if (filters.criticality) where.criticality = filters.criticality;
  if (filters.status) where.status = filters.status;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.supportStatus) where.supportStatus = filters.supportStatus;
  if (filters.operatingSystem) where.operatingSystem = filters.operatingSystem;
  if (filters.version) where.version = filters.version;

  if (filters.expiring) {
    const limit = new Date();
    limit.setDate(limit.getDate() + EXPIRY_WARNING_DAYS);
    where.supportEndDate = { lte: limit };
  }

  if (filters.withOpenVulns) {
    where.vulnerabilities = { some: { status: "OPEN" } };
  }

  const term = filters.query?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" as const } },
      { stockNo: { contains: term, mode: "insensitive" as const } },
      { ipAddress: { contains: term, mode: "insensitive" as const } },
      { macAddress: { contains: term, mode: "insensitive" as const } },
      { serialNo: { contains: term, mode: "insensitive" as const } },
      { deviceId: { contains: term, mode: "insensitive" as const } },
      { brand: { contains: term, mode: "insensitive" as const } },
      { model: { contains: term, mode: "insensitive" as const } },
      { operatingSystem: { contains: term, mode: "insensitive" as const } },
      { servedApplication: { contains: term, mode: "insensitive" as const } },
      { owner: { fullName: { contains: term, mode: "insensitive" as const } } },
      { department: { name: { contains: term, mode: "insensitive" as const } } },
    ];
  }

  return where;
}

export const ASSET_LIST_INCLUDE = {
  owner: { select: { id: true, fullName: true } },
  department: { select: { id: true, name: true } },
  vulnerabilities: {
    where: { status: "OPEN" },
    select: { id: true, severity: true, vulnNo: true },
  },
} as const;

export async function listAssets(filters: AssetFilters, scopeWhere: Record<string, unknown> = {}) {
  const filtersWhere = buildAssetWhere(filters);
  const hasScope = Object.keys(scopeWhere).length > 0;
  const where = hasScope ? { AND: [filtersWhere, scopeWhere] } : filtersWhere;
  return prisma.asset.findMany({
    where: where as never,
    include: ASSET_LIST_INCLUDE,
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
  });
}

export async function getFormCatalog() {
  const [people, departments, vendors, servers, services] = await Promise.all([
    prisma.person.findMany({ orderBy: { fullName: "asc" }, include: { department: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.findMany({
      where: { assetType: "SERVER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, ipAddress: true, stockNo: true },
    }),
    prisma.catalogService.findMany({
      where: { status: { not: "RETIRED" } },
      orderBy: { name: "asc" },
      select: { id: true, serviceNo: true, name: true, asset: { select: { name: true } } },
    }),
  ]);

  return {
    people: people.map((person) => ({
      id: person.id,
      label: person.fullName,
      meta: person.department?.name ?? undefined,
      departmentId: person.departmentId,
      unitManagerId: person.unitManagerId,
      parentDepartmentId: person.parentDepartmentId,
      parentManagerId: person.parentManagerId,
      requestOffice: person.requestOffice,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      label: department.name,
      managerId: department.managerId,
      parentId: department.parentId,
      parentManagerId: department.parentManagerId,
    })),
    vendors: vendors.map((vendor) => ({ id: vendor.id, label: vendor.name })),
    servers: servers.map((server) => ({
      id: server.id,
      label: server.name ?? server.stockNo ?? server.id,
      meta: server.ipAddress ?? undefined,
    })),
    services: services.map((service) => ({
      id: service.id,
      label: `${service.serviceNo} · ${service.name}`,
      meta: service.asset?.name ? `Bağlı: ${service.asset.name}` : undefined,
    })),
  };
}

export async function getDashboardData(scope?: {
  ownerId?: string;
  assetWhere?: Record<string, unknown>;
  requestWhere?: Record<string, unknown>;
  db?: typeof prisma;
}) {
  const db = scope?.db ?? prisma;
  const warningLimit = new Date();
  warningLimit.setDate(warningLimit.getDate() + EXPIRY_WARNING_DAYS);
  const assetWhere = scope?.assetWhere ?? (scope?.ownerId ? { ownerId: scope.ownerId } : {});
  const requestWhere = scope?.requestWhere ?? {};

  const [
    total,
    byType,
    byCriticality,
    byStatus,
    expiring,
    recentActivity,
    unassignedSupport,
    openRequests,
    openChanges,
    openVulns,
    openIncidents,
    peopleCount,
    catalogActive,
  ] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.asset.groupBy({ by: ["assetType"], where: assetWhere, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["criticality"], where: assetWhere, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["status"], where: assetWhere, _count: { _all: true } }),
    prisma.asset.findMany({
      where: { ...assetWhere, supportEndDate: { lte: warningLimit } },
      include: ASSET_LIST_INCLUDE,
      orderBy: { supportEndDate: "asc" },
      take: 8,
    }),
    prisma.activityLog.findMany({
      where: Object.keys(assetWhere).length ? { asset: assetWhere } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { asset: { select: { id: true, name: true, assetType: true, stockNo: true } } },
    }),
    prisma.asset.count({ where: { ...assetWhere, supportEndDate: null, assetType: { not: "SOFTWARE" } } }),
    prisma.serviceRequest.count({ where: { ...requestWhere, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }),
    db.changeRecord.count({
      where: {
        status: { in: ["PENDING", "APPROVED", "IN_PROGRESS"] },
        ...(scope?.ownerId ? { requesterId: scope.ownerId } : {}),
      },
    }),
    db.vulnerability.count({
      where: {
        status: "OPEN",
        ...(scope?.ownerId ? { ownerId: scope.ownerId } : {}),
      },
    }),
    db.incident.count({
      where: {
        status: { in: ["OPEN", "INVESTIGATING", "CONTAINED"] },
        ...(scope?.ownerId ? { requesterId: scope.ownerId } : {}),
      },
    }),
    db.person.count({ where: scope?.ownerId ? { id: scope.ownerId } : {} }),
    prisma.catalogService.count({ where: { status: "ACTIVE" } }).catch(() => 0),
  ]);

  return {
    total,
    byType: Object.fromEntries(byType.map((row) => [row.assetType, row._count._all])),
    byCriticality: Object.fromEntries(byCriticality.map((row) => [row.criticality, row._count._all])),
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    expiring,
    recentActivity,
    unassignedSupport,
    openRequests,
    openChanges,
    openVulns,
    openIncidents,
    peopleCount,
    catalogActive,
  };
}

export async function getRequestDashboard(
  offices: string[] | "ALL" = "ALL",
  extraWhere: Record<string, unknown> = {},
) {
  const officeWhere =
    extraWhere && Object.keys(extraWhere).length
      ? extraWhere
      : requestScopeFilter(offices === "ALL" || offices.length ? offices : []);
  const [
    total,
    open,
    inProgress,
    waiting,
    done,
    rejected,
    critical,
    escalated,
    byStatus,
    byOffice,
    byType,
    recent,
  ] = await Promise.all([
    prisma.serviceRequest.count({ where: officeWhere }),
    prisma.serviceRequest.count({ where: { ...officeWhere, status: "OPEN" } }),
    prisma.serviceRequest.count({ where: { ...officeWhere, status: "IN_PROGRESS" } }),
    prisma.serviceRequest.count({ where: { ...officeWhere, status: "WAITING" } }),
    prisma.serviceRequest.count({ where: { ...officeWhere, status: "DONE" } }),
    prisma.serviceRequest.count({ where: { ...officeWhere, status: "REJECTED" } }),
    prisma.serviceRequest.count({ where: { ...officeWhere, severity: { in: ["HIGH", "CRITICAL"] } } }),
    prisma.serviceRequest.count({ where: { ...officeWhere, escalationStatus: { in: ["PENDING", "TRANSFERRED"] } } }),
    prisma.serviceRequest.groupBy({ by: ["status"], where: officeWhere, _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ["office"], where: officeWhere, _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ["requestType"], where: officeWhere, _count: { _all: true } }),
    prisma.serviceRequest.findMany({
      where: officeWhere,
      include: { requester: true, requestingDept: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    total,
    open,
    inProgress,
    waiting,
    done,
    rejected,
    critical,
    escalated,
    active: open + inProgress + waiting,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    byOffice: Object.fromEntries(byOffice.map((row) => [row.office, row._count._all])),
    byType: Object.fromEntries(byType.map((row) => [row.requestType, row._count._all])),
    recent,
  };
}

export async function getAssetDetail(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      owner: { include: { department: true } },
      department: true,
      contractorVendor: true,
      supportVendor: true,
      outgoingRelations: {
        include: { target: { select: { id: true, name: true, assetType: true, ipAddress: true } } },
      },
      incomingRelations: {
        include: { source: { select: { id: true, name: true, assetType: true, ipAddress: true } } },
      },
      catalogServices: { select: { id: true, serviceNo: true, name: true, status: true }, orderBy: { name: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 25 },
      vulnerabilities: { orderBy: [{ severity: "desc" }, { detectedAt: "desc" }] },
    },
  });
}
