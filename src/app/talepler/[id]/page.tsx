import { WorkflowProgress } from "@/components/workflow/progress";
import { notFound, redirect } from "next/navigation";

import { RequestApprovalActions } from "@/components/itil/request-approval-actions";
import { RequestEscalationForm } from "@/components/itil/request-escalation";
import { StatusBadge } from "@/components/itil/status-badge";
import { agileTypeFor } from "@/lib/agile/access";
import { LinkedRecords } from "@/components/itil/linked-records";
import { SlaBadge } from "@/components/itil/sla-badge";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import {
  ESCALATION_KIND_LABELS,
  ESCALATION_STATUS_LABELS,
  REQUEST_SEVERITY_LABELS,
  TICKET_STATUS_LABELS,
  type EscalationKind,
  type EscalationStatus,
  type RequestSeverity,
  type TicketStatus,
} from "@/lib/itil/constants";
import { getViewer } from "@/lib/auth/viewer";
import { officeLabel } from "@/lib/itil/office-names";
import { officesManagedBy } from "@/lib/itil/office-officers";
import { canEditRequest, canProcessRequest, canViewRequest, isRequestOffice } from "@/lib/itil/request-scope";
import { getRequestType } from "@/lib/itil/request-types";
import { formatDate } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";
import { getOfficeNames } from "@/lib/settings-store";
import { parseJsonRecord } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [request, departments, officeNames] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        requestingDept: { include: { parent: true } },
        requestingManager: true,
        assignee: true,
        escalatedDept: true,
        escalatedBy: true,
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getOfficeNames(),
  ]);
  if (!request) notFound();
  const viewer = await getViewer();
  if (!viewer || !canViewRequest(viewer, request)) {
    redirect("/yetkisiz");
  }
  const typeDef = getRequestType(request.requestType);
  const extras = parseJsonRecord(request.details);
  const canResolve = canProcessRequest(viewer, request);
  const canEdit = canEditRequest(viewer, request);
  const managedOffices = await officesManagedBy(viewer.id);
  const canApproveWaiting =
    request.status === "WAITING" &&
    (viewer.role === "SUPER_ADMIN" ||
      request.requestingManagerId === viewer.id ||
      request.handlingManagerId === viewer.id ||
      (isRequestOffice(request.office) && managedOffices.includes(request.office)));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={request.requestNo}
        description={`${typeDef?.label ?? request.requestType} · ${officeLabel(request.office, officeNames)}`}
        actions={
          <DetailActions
            editHref={canEdit ? `/talepler/${request.id}/duzenle` : undefined}
            canDelete={await viewerCanDelete()}
            kind="request"
            agileType={await agileTypeFor("REQUEST")}
            id={request.id}
            label={request.requestNo}
          />
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Talep eden">{request.requester.fullName}</DetailRow>
            <DetailRow label="Ofis amiri">{request.requestingManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Atanan kişi">
              {request.assignee ? `${request.assignee.fullName}${request.assignedAt ? ` · ${formatDate(request.assignedAt)}` : ""}` : "—"}
            </DetailRow>
            <DetailRow label="Talep eden birim">{request.requestingDept?.name ?? "—"}</DetailRow>
            <DetailRow label="Talep tarihi">{formatDate(request.requestDate)}</DetailRow>
            <DetailRow label="Önem derecesi">
              <StatusBadge
                value={request.severity}
                label={REQUEST_SEVERITY_LABELS[request.severity as RequestSeverity] ?? request.severity}
              />
            </DetailRow>
            <DetailRow label="Çözüm hedefi (SLA)">
              <SlaBadge start={request.createdAt} due={request.resolveDueAt} doneAt={request.resolvedAt} />
            </DetailRow>
            <DetailRow label="Durum">
              <StatusBadge value={request.status} label={TICKET_STATUS_LABELS[request.status as TicketStatus] ?? request.status} />
            </DetailRow>
            {canApproveWaiting ? (
              <div className="sm:col-span-2 mt-2">
                <RequestApprovalActions id={request.id} />
              </div>
            ) : null}
            <DetailRow label="Gerekçe">{request.reason ?? "—"}</DetailRow>
            <DetailRow label="Açıklama">{request.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
      <WorkflowProgress entity="request" entityId={request.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yönlendirme ve yükseltme</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="mb-4 grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Yükseltme">
              <StatusBadge
                value={request.escalationStatus}
                label={ESCALATION_STATUS_LABELS[request.escalationStatus as EscalationStatus] ?? request.escalationStatus}
              />
            </DetailRow>
            <DetailRow label="Tür">
              {request.escalationKind
                ? ESCALATION_KIND_LABELS[request.escalationKind as EscalationKind] ?? request.escalationKind
                : "—"}
            </DetailRow>
            <DetailRow label="İlk şube">
              {request.originalOffice ? officeLabel(request.originalOffice, officeNames) : "—"}
            </DetailRow>
            <DetailRow label="Aktarılan şube">
              {request.escalatedOffice ? officeLabel(request.escalatedOffice, officeNames) : "—"}
            </DetailRow>
            <DetailRow label="Üst birim">{request.escalatedDept?.name ?? request.requestingDept?.parent?.name ?? "—"}</DetailRow>
            <DetailRow label="İşlemi yapan">{request.escalatedBy?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Gerekçe">{request.escalationReason ?? "—"}</DetailRow>
            <DetailRow label="Tarih">{formatDate(request.escalatedAt)}</DetailRow>
          </dl>
          <RequestEscalationForm
            requestId={request.id}
            currentOffice={request.office}
            departments={departments.map((department) => ({ id: department.id, label: department.name }))}
            canResolve={canResolve && request.escalationStatus === "PENDING"}
            showLayer2={request.office === "SERVIS" && canResolve}
          />
        </CardContent>
      </Card>

      {typeDef?.extraFields.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Talebe özel bilgiler</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 sm:grid-cols-2">
              {typeDef.extraFields.map((field) => (
                <DetailRow key={field.id} label={field.label}>
                  {extras[field.id] ?? "—"}
                </DetailRow>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}
      <LinkedRecords sourceType="REQUEST" id={request.id} no={request.requestNo} />
    </div>
  );
}
