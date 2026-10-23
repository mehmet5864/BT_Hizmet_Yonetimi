import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/itil/status-badge";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { CATALOG_AUDIENCE_LABELS, CATALOG_STATUS_LABELS, ITIL_PROCESS_BY_KEY, type ItilProcessKey } from "@/lib/itil/processes";
import { REQUEST_OFFICE_LABELS, type RequestOffice } from "@/lib/itil/request-types";
import { REQUEST_SEVERITY_LABELS } from "@/lib/itil/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CatalogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.catalogService.findUnique({
    where: { id },
    include: { owner: true, department: true, requester: true, requestingDept: true, processes: { orderBy: { updatedAt: "desc" }, take: 8 } },
  });
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={row.serviceNo}
        description={row.name}
        actions={
          <DetailActions
            editHref={`/katalog/${row.id}/duzenle`}
            canDelete={await viewerCanDelete()}
            kind="catalog"
            id={row.id}
            label={row.serviceNo}
          />
        }
      />
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label="Durum">
              <StatusBadge value={row.status} label={CATALOG_STATUS_LABELS[row.status as keyof typeof CATALOG_STATUS_LABELS] ?? row.status} />
            </DetailRow>
            <DetailRow label="Kimler">{CATALOG_AUDIENCE_LABELS[row.audience as keyof typeof CATALOG_AUDIENCE_LABELS] ?? row.audience}</DetailRow>
            <DetailRow label="Kaydeden">{row.requester.fullName}</DetailRow>
            <DetailRow label="Kaydeden birim">{row.requestingDept?.name ?? "—"}</DetailRow>
            <DetailRow label="Hizmet sahibi">{row.owner?.fullName ?? "—"}</DetailRow>
            <DetailRow label="Sorumlu birim">{row.department?.name ?? "—"}</DetailRow>
            <DetailRow label="Hizmet saati">{row.hours ?? "—"}</DetailRow>
            <DetailRow label="Kritiklik">{REQUEST_SEVERITY_LABELS[row.criticality as keyof typeof REQUEST_SEVERITY_LABELS] ?? row.criticality}</DetailRow>
            <DetailRow label="SLA kullanılabilirlik">{row.availabilityTarget ? `%${row.availabilityTarget}` : "—"}</DetailRow>
            <DetailRow label="Müdahale / çözüm">
              {row.responseHours != null || row.resolveHours != null
                ? `${row.responseHours ?? "—"} / ${row.resolveHours ?? "—"} saat`
                : "—"}
            </DetailRow>
            <DetailRow label="Talep şubesi">
              {row.requestOffice && row.requestOffice in REQUEST_OFFICE_LABELS
                ? REQUEST_OFFICE_LABELS[row.requestOffice as RequestOffice]
                : (row.requestOffice ?? "—")}
            </DetailRow>
            <DetailRow label="Kısa tanım">{row.summary ?? "—"}</DetailRow>
            <DetailRow label="Erişim şartları">{row.accessConditions ?? "—"}</DetailRow>
            <DetailRow label="Ayrıntı">{row.description ?? "—"}</DetailRow>
          </dl>
        </CardContent>
      </Card>
      {row.processes.length ? (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-sm font-medium">Bağlı süreç kayıtları</p>
            <ul className="text-sm">
              {row.processes.map((item) => (
                <li key={item.id}>
                  <Link href={`${ITIL_PROCESS_BY_KEY[item.process as ItilProcessKey]?.href ?? "/katalog"}/${item.id}`} className="hover:underline">
                    {item.recordNo} · {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
