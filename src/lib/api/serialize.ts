import { officeLabel, type OfficeNames } from "@/lib/itil/office-names";
import { getRequestType } from "@/lib/itil/request-types";
import { assetDisplayName } from "@/lib/inventory/format";

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeAsset(row: {
  id: string;
  assetType: string;
  stockNo: string | null;
  serialNo?: string | null;
  name: string | null;
  brand: string | null;
  model: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  criticality: string;
  status: string;
  ownerId: string;
  departmentId: string | null;
  owner?: { id: string; fullName: string } | null;
  department?: { id: string; name: string } | null;
  supportEndDate?: Date | null;
  updatedAt?: Date;
}) {
  return {
    id: row.id,
    type: row.assetType,
    stockNo: row.stockNo,
    serialNo: row.serialNo ?? null,
    name: assetDisplayName(row),
    brand: row.brand,
    model: row.model,
    ipAddress: row.ipAddress,
    macAddress: row.macAddress,
    criticality: row.criticality,
    status: row.status,
    owner: row.owner ? { id: row.owner.id, fullName: row.owner.fullName } : { id: row.ownerId, fullName: null },
    department: row.department
      ? { id: row.department.id, name: row.department.name }
      : row.departmentId
        ? { id: row.departmentId, name: null }
        : null,
    supportEndDate: iso(row.supportEndDate),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeRequest(row: {
  id: string;
  requestNo: string;
  requestType: string;
  office: string;
  status: string;
  severity: string;
  reason: string | null;
  description: string | null;
  details: string | null;
  requesterId: string;
  requester?: { id: string; fullName: string } | null;
  requestingDept?: { id: string; name: string } | null;
  requestDate: Date;
  updatedAt: Date;
  escalationStatus?: string;
  escalatedOffice?: string | null;
  assigneeId?: string | null;
  assignee?: { id: string; fullName: string } | null;
  assignedAt?: Date | null;
}, names?: OfficeNames) {
  let extras: Record<string, unknown> | null = null;
  if (row.details) {
    try {
      extras = JSON.parse(row.details) as Record<string, unknown>;
    } catch {
      extras = null;
    }
  }
  return {
    id: row.id,
    requestNo: row.requestNo,
    type: row.requestType,
    typeLabel: getRequestType(row.requestType)?.label ?? row.requestType,
    office: row.office,
    officeLabel: officeLabel(row.office, names),
    status: row.status,
    severity: row.severity,
    reason: row.reason,
    description: row.description,
    details: extras,
    requester: row.requester ?? { id: row.requesterId, fullName: null },
    requestingDept: row.requestingDept ?? null,
    escalationStatus: row.escalationStatus ?? null,
    escalatedOffice: row.escalatedOffice ?? null,
    assigneeId: row.assigneeId ?? null,
    assignee: row.assignee ?? null,
    assignedAt: row.assignedAt ? iso(row.assignedAt) : null,
    requestDate: iso(row.requestDate),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializePerson(row: {
  id: string;
  fullName: string;
  title: string | null;
  duty: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  requestOffice: string | null;
  department?: { id: string; name: string } | null;
}) {
  return {
    id: row.id,
    fullName: row.fullName,
    title: row.title,
    duty: row.duty,
    email: row.email,
    phone: row.phone,
    role: row.role,
    requestOffice: row.requestOffice,
    department: row.department ?? null,
  };
}

export function serializeVuln(row: {
  id: string;
  vulnNo: string;
  deviceName: string | null;
  deviceIp: string | null;
  severity: string;
  status: string;
  cve: string | null;
  description: string | null;
  detectedAt: Date;
}) {
  return {
    id: row.id,
    vulnNo: row.vulnNo,
    deviceName: row.deviceName,
    deviceIp: row.deviceIp,
    severity: row.severity,
    status: row.status,
    cve: row.cve,
    description: row.description,
    detectedAt: iso(row.detectedAt),
  };
}

export function serializeIncident(row: {
  id: string;
  incidentNo: string;
  title: string;
  status: string;
  description: string | null;
  startedAt: Date;
  severity?: string;
  layer?: string;
  escalationStatus?: string;
  l1AnalystId?: string | null;
  l2AnalystId?: string | null;
}) {
  return {
    id: row.id,
    incidentNo: row.incidentNo,
    title: row.title,
    status: row.status,
    description: row.description,
    startedAt: iso(row.startedAt),
    severity: row.severity ?? "MEDIUM",
    layer: row.layer ?? "L1",
    escalationStatus: row.escalationStatus ?? "NONE",
    l1AnalystId: row.l1AnalystId ?? null,
    l2AnalystId: row.l2AnalystId ?? null,
  };
}

export function serializeProblem(row: {
  id: string;
  problemNo: string;
  title: string;
  status: string;
  description: string | null;
  assignmentStatus?: string;
  assigneeId?: string | null;
  proposedAssigneeId?: string | null;
}) {
  return {
    id: row.id,
    problemNo: row.problemNo,
    title: row.title,
    status: row.status,
    description: row.description,
    assignmentStatus: row.assignmentStatus ?? "NONE",
    assigneeId: row.assigneeId ?? null,
    proposedAssigneeId: row.proposedAssigneeId ?? null,
  };
}

export function serializeChange(row: {
  id: string;
  changeNo: string;
  status: string;
  description: string | null;
  changeKind: string | null;
  requestDate: Date;
}) {
  return {
    id: row.id,
    changeNo: row.changeNo,
    status: row.status,
    kind: row.changeKind,
    description: row.description,
    requestDate: iso(row.requestDate),
  };
}

export function serializePatch(row: {
  id: string;
  patchNo: string;
  title: string;
  status: string;
  description: string | null;
}) {
  return {
    id: row.id,
    patchNo: row.patchNo,
    title: row.title,
    status: row.status,
    description: row.description,
  };
}
