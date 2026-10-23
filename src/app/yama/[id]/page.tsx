import { WorkflowProgress } from "@/components/workflow/progress";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/itil/status-badge";
import { agileTypeFor } from "@/lib/agile/access";
import { LinkedRecords } from "@/components/itil/linked-records";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { CHANGE_STATUS_LABELS } from "@/lib/itil/constants";
import { formatDate } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function PatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const row = await db.patchRecord.findUnique({
    where: { id },
    include: { requester: true, requestingManager: true, assetOwner: true },
  });
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={row.patchNo} description={row.title} actions={<DetailActions editHref={`/yama/${row.id}/duzenle`} canDelete={await viewerCanDelete()} kind="patch" agileType={await agileTypeFor("PATCH")} id={row.id} label={row.patchNo} />} />
      <Card><CardContent><dl className="grid gap-x-8 sm:grid-cols-2">
        <DetailRow label="Talep eden">{row.requester.fullName}</DetailRow>
        <DetailRow label="Talep eden birim amiri">{row.requestingManager?.fullName ?? "—"}</DetailRow>
        <DetailRow label="Kapsam">{row.scope ?? "—"}</DetailRow>
        <DetailRow label="Sistem tipi / türü">{[row.systemType, row.systemKind].filter(Boolean).join(" · ") || "—"}</DetailRow>
        <DetailRow label="IP / subnet">{row.ipRange ?? "—"}</DetailRow>
        <DetailRow label="Etki">{row.impact ?? "—"}</DetailRow>
        <DetailRow label="Envanter sahibi">{row.assetOwner?.fullName ?? "—"}</DetailRow>
        <DetailRow label="Riskler">{row.risks ?? "—"}</DetailRow>
        <DetailRow label="Dağıtım">{row.distribution ?? "—"}</DetailRow>
        <DetailRow label="Tarihler">{formatDate(row.requestDate)} / onay {formatDate(row.approvalDate)}</DetailRow>
        <DetailRow label="Çalışma">{formatDate(row.workStartDate)} → {formatDate(row.expectedEndDate)}</DetailRow>
        <DetailRow label="Durum"><StatusBadge value={row.status} label={CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status} /></DetailRow>
        <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
      </dl></CardContent></Card>
      <WorkflowProgress entity="patch" entityId={row.id} />
      <LinkedRecords sourceType="PATCH" id={row.id} no={row.patchNo} />
    </div>
  );
}
