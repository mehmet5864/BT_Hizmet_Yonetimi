import Link from "next/link";
import { notFound } from "next/navigation";

import { IncidentEscalationForm } from "@/components/itil/incident-escalation";
import { StatusBadge } from "@/components/itil/status-badge";
import { agileTypeFor } from "@/lib/agile/access";
import { LinkedRecords } from "@/components/itil/linked-records";
import { SlaBadge } from "@/components/itil/sla-badge";
import { LEVEL_LABELS, PRIORITY_LABELS, type Level, type Priority } from "@/lib/itil/sla";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import {
  ESCALATION_STATUS_LABELS,
  INCIDENT_LAYER_LABELS,
  INCIDENT_STATUS_LABELS,
  REQUEST_SEVERITY_LABELS,
  type EscalationStatus,
  type IncidentLayer,
  type RequestSeverity,
} from "@/lib/itil/constants";
import { formatDate, formatDateTime } from "@/lib/inventory/format";
import { officeLabel } from "@/lib/itil/office-names";
import { prisma } from "@/lib/prisma";
import { isSafeUploadUrl } from "@/lib/security/http";
import { getOfficeNames } from "@/lib/settings-store";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [row, people, officeNames] = await Promise.all([
    db.incident.findUnique({
      where: { id },
      include: {
        department: true,
        problems: true,
        requester: true,
        requestingManager: true,
        l1Analyst: true,
        l2Analyst: true,
        escalatedBy: true,
      },
    }),
    prisma.person.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, department: { select: { name: true } } },
    }),
    getOfficeNames(),
  ]);
  if (!row) notFound();
  const [svc, chg] = await Promise.all([
    row.serviceId ? prisma.catalogService.findUnique({ where: { id: row.serviceId }, select: { id: true, serviceNo: true } }) : null,
    row.changeId ? db.changeRecord.findUnique({ where: { id: row.changeId }, select: { id: true, changeNo: true } }) : null,
  ]);
  const linkedChanges = await db.changeRecord.findMany({ where: { incidentId: row.id }, select: { id: true, changeNo: true } });
  const closed = row.status === "RESOLVED" || row.status === "CLOSED";
  const canEscalate = !closed && row.escalationStatus !== "TRANSFERRED";
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={row.incidentNo}
        description={row.title}
        actions={
          <DetailActions
            editHref={`/olay/${row.id}/duzenle`}
            canDelete={await viewerCanDelete()}
            kind="incident"
            agileType={await agileTypeFor("INCIDENT")}
            id={row.id}
            label={row.incidentNo}
          />
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Talep eden">{row.requester?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Talep eden birim amiri">{row.requestingManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Seviye 1 analist">{row.l1Analyst?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Seviye 2 analist">{row.l2Analyst?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Önem">
              <StatusBadge
                value={row.severity}
                label={REQUEST_SEVERITY_LABELS[row.severity as RequestSeverity] ?? row.severity}
              />
            </DetailRow>
            <DetailRow label="Seviye">
              <StatusBadge
                value={row.layer}
                label={INCIDENT_LAYER_LABELS[row.layer as IncidentLayer] ?? row.layer}
              />
            </DetailRow>
            <DetailRow label="Eskalasyon">
              <StatusBadge
                value={row.escalationStatus}
                label={ESCALATION_STATUS_LABELS[row.escalationStatus as EscalationStatus] ?? row.escalationStatus}
              />
            </DetailRow>
            <DetailRow label="Uzman birim">
              {row.escalatedOffice ? officeLabel(row.escalatedOffice, officeNames) : "—"}
            </DetailRow>
            <DetailRow label="Başlangıç / bitiş">
              {formatDate(row.startedAt)} / {formatDate(row.endedAt)}
            </DetailRow>
            <DetailRow label="Birim">{row.department?.name ?? "—"}</DetailRow>
            <DetailRow label="IOC">{row.ioc ?? "—"}</DetailRow>
            <DetailRow label="Sandbox raporu">
              {row.sandboxReportUrl && isSafeUploadUrl(row.sandboxReportUrl) ? (
                <span className="flex flex-wrap items-center gap-3">
                  <span className="truncate">{row.sandboxReportName ?? "Sandbox raporu"}</span>
                  <a
                    href={row.sandboxReportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-sm font-medium underline"
                  >
                    Görüntüle
                  </a>
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Öncelik">
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge value={row.priority} label={PRIORITY_LABELS[row.priority as Priority] ?? row.priority} />
                {row.isMajor ? <StatusBadge value="CRITICAL" label="Büyük olay" /> : null}
              </span>
            </DetailRow>
            <DetailRow label="Etki / aciliyet">
              {row.impact ? LEVEL_LABELS[row.impact as Level] ?? row.impact : "—"} / {row.urgency ? LEVEL_LABELS[row.urgency as Level] ?? row.urgency : "—"}
            </DetailRow>
            <DetailRow label="İlk yanıt (SLA)">
              <SlaBadge start={row.startedAt} due={row.respondDueAt} doneAt={row.respondedAt} />
            </DetailRow>
            <DetailRow label="Çözüm (SLA)">
              <SlaBadge start={row.startedAt} due={row.resolveDueAt} doneAt={row.resolvedAt} />
            </DetailRow>
            <DetailRow label="Etkilenen hizmet">
              {svc ? <Link href={`/katalog/${svc.id}`} className="underline">{svc.serviceNo}</Link> : "—"}
            </DetailRow>
            <DetailRow label="İlişkili değişiklik">
              {[chg, ...linkedChanges].filter((c, i, arr) => c && arr.findIndex((x) => x?.id === c.id) === i).map((c) => (
                <Link key={c!.id} href={`/degisiklik/${c!.id}`} className="me-2 underline">{c!.changeNo}</Link>
              ))}
              {!chg && !linkedChanges.length ? "—" : null}
            </DetailRow>
            <DetailRow label="Durum">
              <StatusBadge
                value={row.status}
                label={INCIDENT_STATUS_LABELS[row.status as keyof typeof INCIDENT_STATUS_LABELS] ?? row.status}
              />
            </DetailRow>
            <DetailRow label="Aktaran">{row.escalatedBy?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Aktarım tarihi">{formatDateTime(row.escalatedAt)}</DetailRow>
            <DetailRow label="Gerekçe">{row.escalationReason ?? "—"}</DetailRow>
            <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
      {canEscalate ? (
        <IncidentEscalationForm
          incidentId={row.id}
          people={people.map((person) => ({
            id: person.id,
            label: person.fullName,
            meta: person.department?.name,
          }))}
        />
      ) : null}
      {row.problems.length ? (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Bağlı problemler</p>
            {row.problems.map((problem) => (
              <Link
                key={problem.id}
                href={`/problem/${problem.id}`}
                className="hover:bg-muted/40 block rounded-md border px-3 py-2 text-sm"
              >
                {problem.problemNo} · {problem.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <LinkedRecords sourceType="INCIDENT" id={row.id} no={row.incidentNo} />
    </div>
  );
}
