import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/itil/status-badge";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { TICKET_STATUS_LABELS, type TicketStatus } from "@/lib/itil/constants";
import { formatDateTime } from "@/lib/inventory/format";
import { isSlaOverdue, slaRemainingLabel, slaWindowLabel } from "@/lib/itil/vendor-sla";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function SlaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const row = await db.slaTicket.findUnique({
    where: { id },
    include: {
      owner: true,
      department: true,
      vendor: { include: { slaLevels: true } },
      product: true,
      requester: true,
      requestingManager: true,
    },
  });
  if (!row) notFound();
  const level = row.vendor?.slaLevels.find((item) => item.level === row.slaLevel);
  const specUrl = row.vendor?.specFileUrl ?? row.vendor?.contractFileUrl;
  const now = new Date();
  const overdue = isSlaOverdue(row.slaDueAt, row.status, now);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={row.ticketNo}
        description={row.title}
        actions={
          <DetailActions
            editHref={`/firma-sla/sla/${row.id}/duzenle`}
            canDelete={await viewerCanDelete()}
            kind="sla"
            id={row.id}
            label={row.ticketNo}
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA süresi</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Seviye">{level?.name ?? (row.slaLevel ? `Seviye ${row.slaLevel}` : "—")}</DetailRow>
            <DetailRow label="Pencere">
              {level ? slaWindowLabel(level.responseHours, level.resolveHours) : "—"}
            </DetailRow>
            <DetailRow label="Başlangıç">{formatDateTime(row.slaStartedAt ?? row.openedAt)}</DetailRow>
            <DetailRow label="Müdahale sonu">{formatDateTime(row.slaResponseDueAt)}</DetailRow>
            <DetailRow label="Çözüm sonu">{formatDateTime(row.slaDueAt)}</DetailRow>
            <DetailRow label="Kalan">
              <span className={overdue ? "text-destructive font-medium" : undefined}>
                {row.status === "DONE" ? "Kapandı" : slaRemainingLabel(row.slaDueAt, now)}
              </span>
            </DetailRow>
            <DetailRow label="Bildirim">{row.notifyNote ?? (row.notifiedAt ? formatDateTime(row.notifiedAt) : "—")}</DetailRow>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Bildiren">{row.requester?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Birim amiri">{row.requestingManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Firma">{row.vendor?.name ?? "—"}</DetailRow>
            <DetailRow label="Ürün">{row.product?.name ?? row.application ?? "—"}</DetailRow>
            <DetailRow label="Şartname">
              {specUrl ? (
                <a href={specUrl} className="underline" target="_blank" rel="noreferrer">
                  {row.vendor?.specFileName || "Dosyayı aç"}
                </a>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Durum">
              <StatusBadge value={row.status} label={TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status} />
            </DetailRow>
            <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
