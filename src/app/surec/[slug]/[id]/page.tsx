import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/itil/status-badge";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { REQUEST_SEVERITY_LABELS } from "@/lib/itil/constants";
import { getItilProcess } from "@/lib/itil/processes";
import { parseJsonRecord } from "@/lib/safe-json";
import { formatDateTime } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function ProcessDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const db = await getScopedDb();
  const { slug, id } = await params;
  const def = getItilProcess(slug);
  if (!def) notFound();
  const row = await db.itilProcessRecord.findUnique({
    where: { id },
    include: { requester: true, requestingDept: true, requestingManager: true, owner: true, department: true, service: true },
  });
  if (!row || row.process !== def.key) notFound();
  const extras = parseJsonRecord(row.details);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={row.recordNo}
        description={row.title}
        actions={
          <DetailActions
            editHref={`${def.href}/${row.id}/duzenle`}
            canDelete={await viewerCanDelete()}
            kind="itil-process"
            id={row.id}
            label={row.recordNo}
          />
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Süreç">{def.label}</DetailRow>
            <DetailRow label="Durum">
              <StatusBadge value={row.status} label={def.statuses.find((item) => item.value === row.status)?.label ?? row.status} />
            </DetailRow>
            <DetailRow label="Kaydeden">{row.requester.fullName}</DetailRow>
            <DetailRow label="Kaydeden birim">{row.requestingDept?.name ?? "—"}</DetailRow>
            <DetailRow label="Birim amiri">{row.requestingManager?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Süreç sahibi">{row.owner?.fullName ?? "—"}</DetailRow>
            <DetailRow label="İlgili hizmet">
              {row.service ? (
                <Link href={`/katalog/${row.service.id}`} className="hover:underline">
                  {row.service.name}
                </Link>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Önem">{row.severity ? (REQUEST_SEVERITY_LABELS[row.severity as keyof typeof REQUEST_SEVERITY_LABELS] ?? row.severity) : "—"}</DetailRow>
            <DetailRow label="Başlangıç">{formatDateTime(row.startDate)}</DetailRow>
            <DetailRow label="Bitiş">{formatDateTime(row.endDate)}</DetailRow>
            {def.extraFields.map((field) => (
              <DetailRow key={field.id} label={field.label}>
                {labelExtra(field, extras[field.id])}
              </DetailRow>
            ))}
            <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function labelExtra(field: { options?: { value: string; label: string }[] }, value: unknown) {
  if (value == null || value === "") return "—";
  const raw = String(value);
  return field.options?.find((item) => item.value === raw)?.label ?? raw;
}
