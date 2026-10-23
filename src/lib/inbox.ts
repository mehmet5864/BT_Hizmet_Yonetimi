import { getInventoryAccess } from "@/lib/auth/inventory";
import { getViewerAcl } from "@/lib/auth/viewer";
import { getDesignatedOfficers } from "@/lib/itil/catalog";
import { officesManagedBy } from "@/lib/itil/office-officers";
import {
  CHANGE_STATUS_LABELS,
  INCIDENT_STATUS_LABELS,
  PROBLEM_ASSIGNMENT_LABELS,
  PROBLEM_STATUS_LABELS,
  TICKET_STATUS_LABELS,
  canApproveProblemAssignment,
  isOpenTicketStatus,
  type ProblemAssignmentStatus,
  type TicketStatus,
} from "@/lib/itil/constants";
import { officeLabel } from "@/lib/itil/office-names";
import { getRequestType } from "@/lib/itil/request-types";
import { ASSET_TYPE_DEFS } from "@/lib/inventory/asset-types";
import { assetDisplayName } from "@/lib/inventory/format";
import type { AssetTypeKey } from "@/lib/inventory/constants";
import { prisma } from "@/lib/prisma";
import { getOfficeNames } from "@/lib/settings-store";

export const INBOX_APPROVE_KINDS = ["inventory", "problem", "change", "patch", "request"] as const;
export type InboxApproveKind = (typeof INBOX_APPROVE_KINDS)[number];
export type InboxSection = "approval" | "assigned" | "waiting";

export type InboxItem = {
  key: string;
  id: string;
  href: string;
  code: string;
  title: string;
  meta: string;
  status: string;
  statusLabel: string;
  section: InboxSection;
  canApprove: boolean;
  approveKind?: InboxApproveKind;
  date: string;
};

export type InboxSnapshot = {
  items: InboxItem[];
  approvalCount: number;
  assignedCount: number;
  waitingCount: number;
};

const CLOSED_INCIDENT = ["RESOLVED", "CLOSED"];
const CLOSED_PROBLEM = ["RESOLVED", "CLOSED"];

function item(partial: Omit<InboxItem, "key">): InboxItem {
  return { ...partial, key: `${partial.section}:${partial.approveKind ?? partial.code}:${partial.id}` };
}

export function isInboxApproveKind(value: string | null | undefined): value is InboxApproveKind {
  return Boolean(value && (INBOX_APPROVE_KINDS as readonly string[]).includes(value));
}

export async function getInbox(): Promise<InboxSnapshot> {
  const { viewer } = await getViewerAcl();
  if (!viewer) {
    return { items: [], approvalCount: 0, assignedCount: 0, waitingCount: 0 };
  }

  const viewerId = viewer.id;
  const isSuper = viewer.role === "SUPER_ADMIN";
  const managedOffices = isSuper ? [] : await officesManagedBy(viewerId);
  const [inventory, officers, pendingProblems, officeNames] = await Promise.all([
    getInventoryAccess(),
    getDesignatedOfficers(),
    prisma.problem.findMany({
      where: { assignmentStatus: "PENDING" },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        problemNo: true,
        title: true,
        assignmentStatus: true,
        infosecManagerId: true,
        proposedAssignee: { select: { fullName: true } },
        updatedAt: true,
      },
    }),
    getOfficeNames(),
  ]);

  const approveAllProblems = canApproveProblemAssignment(viewer.role, viewerId, null, [
    officers.infosec,
    officers.problem,
    officers.zafiyet,
    officers.olay,
  ]);

  const [
    inventoryApprovals,
    myInventoryWaiting,
    pendingChanges,
    pendingPatches,
    waitingRequests,
    assignedRequests,
    assignedIncidents,
    assignedProblems,
    assignedSla,
    myRequests,
  ] = await Promise.all([
    inventory?.canApprove
      ? prisma.inventoryApproval.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 40,
          include: {
            requestedBy: { select: { fullName: true } },
            asset: { select: { id: true, name: true, stockNo: true, assetType: true } },
          },
        })
      : Promise.resolve([]),
    prisma.inventoryApproval.findMany({
      where: { status: "PENDING", requestedById: viewerId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        requestedBy: { select: { fullName: true } },
        asset: { select: { id: true, name: true, stockNo: true, assetType: true } },
      },
    }),
    prisma.changeRecord.findMany({
      where: isSuper
        ? { status: "PENDING" }
        : {
            status: "PENDING",
            OR: [
              { requestingManagerId: viewerId },
              { infosecManagerId: viewerId },
              { approvalUnits: { some: { managerId: viewerId } } },
            ],
          },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        changeNo: true,
        description: true,
        status: true,
        requester: { select: { fullName: true } },
        updatedAt: true,
      },
    }),
    prisma.patchRecord.findMany({
      where: isSuper ? { status: "PENDING" } : { status: "PENDING", requestingManagerId: viewerId },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: { id: true, patchNo: true, title: true, status: true, requester: { select: { fullName: true } }, updatedAt: true },
    }),
    prisma.serviceRequest.findMany({
      where: isSuper
        ? { status: "WAITING" }
        : {
            status: "WAITING",
            OR: [
              { requestingManagerId: viewerId },
              { handlingManagerId: viewerId },
              ...(managedOffices.length ? [{ office: { in: managedOffices } }] : []),
            ],
          },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        requestNo: true,
        requestType: true,
        office: true,
        status: true,
        reason: true,
        requester: { select: { fullName: true } },
        requestDate: true,
      },
    }),
    prisma.serviceRequest.findMany({
      where: { handlingManagerId: viewerId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        requestNo: true,
        requestType: true,
        office: true,
        status: true,
        reason: true,
        requester: { select: { fullName: true } },
        requestDate: true,
      },
    }),
    prisma.incident.findMany({
      where: {
        status: { notIn: CLOSED_INCIDENT },
        OR: [{ l1AnalystId: viewerId }, { l2AnalystId: viewerId }],
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: { id: true, incidentNo: true, title: true, status: true, layer: true, startedAt: true },
    }),
    prisma.problem.findMany({
      where: { assigneeId: viewerId, status: { notIn: CLOSED_PROBLEM } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: { id: true, problemNo: true, title: true, status: true, updatedAt: true },
    }),
    prisma.slaTicket.findMany({
      where: { ownerId: viewerId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, ticketNo: true, title: true, status: true, openedAt: true },
    }),
    prisma.serviceRequest.findMany({
      where: { requesterId: viewerId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        requestNo: true,
        requestType: true,
        office: true,
        status: true,
        reason: true,
        requester: { select: { fullName: true } },
        requestDate: true,
      },
    }),
  ]);

  const items: InboxItem[] = [];
  const seen = new Set<string>();
  const add = (row: InboxItem) => {
    const dedupe = `${row.approveKind ?? row.href}:${row.id}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    items.push(row);
  };

  for (const row of inventoryApprovals) {
    const typeLabel = row.assetType ? (ASSET_TYPE_DEFS[row.assetType as AssetTypeKey]?.label ?? row.assetType) : "Envanter";
    const target = row.asset
      ? assetDisplayName(row.asset)
      : row.action === "CREATE"
        ? `Yeni ${typeLabel}`
        : typeLabel;
    add(
      item({
        id: row.id,
        href: "/envanter/onaylar",
        code: row.action === "CREATE" ? "ENV-EKLE" : "ENV-SIL",
        title: `${row.action === "CREATE" ? "Ekleme" : "Silme"} onayı · ${target}`,
        meta: row.requestedBy.fullName,
        status: row.status,
        statusLabel: "Onay bekliyor",
        section: "approval",
        canApprove: true,
        approveKind: "inventory",
        date: row.createdAt.toISOString(),
      }),
    );
  }

  for (const row of pendingProblems) {
    if (!approveAllProblems && row.infosecManagerId !== viewerId) continue;
    add(
      item({
        id: row.id,
        href: `/problem/${row.id}`,
        code: row.problemNo,
        title: row.title,
        meta: row.proposedAssignee?.fullName ? `Atama: ${row.proposedAssignee.fullName}` : "Atama onayı",
        status: row.assignmentStatus,
        statusLabel: PROBLEM_ASSIGNMENT_LABELS[row.assignmentStatus as ProblemAssignmentStatus] ?? "BG onayı bekliyor",
        section: "approval",
        canApprove: true,
        approveKind: "problem",
        date: row.updatedAt.toISOString(),
      }),
    );
  }

  for (const row of pendingChanges) {
    add(
      item({
        id: row.id,
        href: `/degisiklik/${row.id}`,
        code: row.changeNo,
        title: row.description?.slice(0, 120) || "Değişiklik kaydı",
        meta: row.requester.fullName,
        status: row.status,
        statusLabel: CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status,
        section: "approval",
        canApprove: true,
        approveKind: "change",
        date: row.updatedAt.toISOString(),
      }),
    );
  }

  for (const row of pendingPatches) {
    add(
      item({
        id: row.id,
        href: `/yama/${row.id}`,
        code: row.patchNo,
        title: row.title,
        meta: row.requester.fullName,
        status: row.status,
        statusLabel: CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status,
        section: "approval",
        canApprove: true,
        approveKind: "patch",
        date: row.updatedAt.toISOString(),
      }),
    );
  }

  for (const row of waitingRequests) {
    const typeDef = getRequestType(row.requestType);
    add(
      item({
        id: row.id,
        href: `/talepler/${row.id}`,
        code: row.requestNo,
        title: row.reason || typeDef?.label || row.requestType,
        meta: `${row.requester.fullName} · ${officeLabel(row.office, officeNames)}`,
        status: row.status,
        statusLabel: TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status,
        section: "approval",
        canApprove: true,
        approveKind: "request",
        date: row.requestDate.toISOString(),
      }),
    );
  }

  for (const row of assignedIncidents) {
    add(
      item({
        id: row.id,
        href: `/olay/${row.id}`,
        code: row.incidentNo,
        title: row.title,
        meta: row.layer === "L2" ? "Seviye 2 analist görevi" : "Seviye 1 analist görevi",
        status: row.status,
        statusLabel: INCIDENT_STATUS_LABELS[row.status as keyof typeof INCIDENT_STATUS_LABELS] ?? row.status,
        section: "assigned",
        canApprove: false,
        date: row.startedAt.toISOString(),
      }),
    );
  }

  for (const row of assignedProblems) {
    add(
      item({
        id: row.id,
        href: `/problem/${row.id}`,
        code: row.problemNo,
        title: row.title,
        meta: "Size atanan problem",
        status: row.status,
        statusLabel: PROBLEM_STATUS_LABELS[row.status as keyof typeof PROBLEM_STATUS_LABELS] ?? row.status,
        section: "assigned",
        canApprove: false,
        date: row.updatedAt.toISOString(),
      }),
    );
  }

  for (const row of assignedRequests) {
    const typeDef = getRequestType(row.requestType);
    add(
      item({
        id: row.id,
        href: `/talepler/${row.id}`,
        code: row.requestNo,
        title: row.reason || typeDef?.label || row.requestType,
        meta: `${row.requester.fullName} · ${officeLabel(row.office, officeNames)}`,
        status: row.status,
        statusLabel: TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status,
        section: "assigned",
        canApprove: row.status === "WAITING",
        approveKind: row.status === "WAITING" ? "request" : undefined,
        date: row.requestDate.toISOString(),
      }),
    );
  }

  for (const row of assignedSla) {
    add(
      item({
        id: row.id,
        href: `/firma-sla/sla/${row.id}`,
        code: row.ticketNo,
        title: row.title,
        meta: "Firma / SLA arıza",
        status: row.status,
        statusLabel: TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status,
        section: "assigned",
        canApprove: false,
        date: row.openedAt.toISOString(),
      }),
    );
  }

  for (const row of myRequests) {
    if (!isOpenTicketStatus(row.status)) continue;
    const typeDef = getRequestType(row.requestType);
    add(
      item({
        id: row.id,
        href: `/talepler/${row.id}`,
        code: row.requestNo,
        title: row.reason || typeDef?.label || row.requestType,
        meta: officeLabel(row.office, officeNames),
        status: row.status,
        statusLabel: TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status,
        section: "waiting",
        canApprove: false,
        date: row.requestDate.toISOString(),
      }),
    );
  }

  for (const row of myInventoryWaiting) {
    if (inventory?.canApprove) continue;
    const typeLabel = row.assetType ? (ASSET_TYPE_DEFS[row.assetType as AssetTypeKey]?.label ?? row.assetType) : "Envanter";
    const target = row.asset ? assetDisplayName(row.asset) : typeLabel;
    add(
      item({
        id: row.id,
        href: "/envanter/onaylar",
        code: row.action === "CREATE" ? "ENV-EKLE" : "ENV-SIL",
        title: `${row.action === "CREATE" ? "Ekleme" : "Silme"} isteğiniz · ${target}`,
        meta: "Envanter yöneticisi onayı bekleniyor",
        status: row.status,
        statusLabel: "Onay bekliyor",
        section: "waiting",
        canApprove: false,
        date: row.createdAt.toISOString(),
      }),
    );
  }

  const approvalCount = items.filter((row) => row.section === "approval").length;
  const assignedCount = items.filter((row) => row.section === "assigned").length;
  const waitingCount = items.filter((row) => row.section === "waiting").length;
  return { items, approvalCount, assignedCount, waitingCount };
}
