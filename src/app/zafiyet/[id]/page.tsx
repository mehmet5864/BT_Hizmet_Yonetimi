import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/itil/status-badge";
import { agileTypeFor } from "@/lib/agile/access";
import { LinkedRecords } from "@/components/itil/linked-records";
import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { VULN_SEVERITY_LABELS, VULN_STATUS_LABELS } from "@/lib/itil/constants";
import { formatDate } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function VulnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const row = await db.vulnerability.findUnique({
    where: { id },
    include: { owner: true, department: true, manager: true, asset: { select: { id: true, name: true, stockNo: true } } },
  });
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={row.vulnNo} description={row.deviceName ?? "Zafiyet"} actions={<DetailActions editHref={`/zafiyet/${row.id}/duzenle`} canDelete={await viewerCanDelete()} kind="vuln" agileType={await agileTypeFor("VULNERABILITY")} id={row.id} label={row.vulnNo} />} />
      <Card><CardContent><dl className="grid gap-x-8 sm:grid-cols-2">
        <DetailRow label="Cihaz">{row.deviceName ?? "—"}</DetailRow>
        <DetailRow label="IP">{row.deviceIp ?? "—"}</DetailRow>
        <DetailRow label="Envanter">
          {row.asset ? (
            <Link href={`/envanter/${row.asset.id}`} className="hover:underline">
              {row.asset.name ?? row.asset.stockNo ?? row.asset.id}
            </Link>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label="CVE">{row.cve ?? "—"}</DetailRow>
        <DetailRow label="Kaynak">{row.source === "SCANNER" ? `Tarayıcı${row.scannerVendor ? ` · ${row.scannerVendor}` : ""}` : "Manuel"}</DetailRow>
        <DetailRow label="Sahibi">{row.owner?.fullName ?? "—"}</DetailRow>
        <DetailRow label="Birim / amir">{row.department?.name ?? "—"} / {row.manager?.fullName ?? "—"}</DetailRow>
        <DetailRow label="Tespit / termin">{formatDate(row.detectedAt)} / {formatDate(row.dueDate)}</DetailRow>
        <DetailRow label="Seviye">{VULN_SEVERITY_LABELS[row.severity as keyof typeof VULN_SEVERITY_LABELS] ?? row.severity}</DetailRow>
        <DetailRow label="Durum"><StatusBadge value={row.status} label={VULN_STATUS_LABELS[row.status as keyof typeof VULN_STATUS_LABELS] ?? row.status} /></DetailRow>
        <DetailRow label="Kapatılma süresi">{row.closeDays != null ? `${row.closeDays} gün` : "—"}</DetailRow>
        <DetailRow label="Giderilememe nedeni">{row.notFixedReason ?? "—"}</DetailRow>
        <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
      </dl></CardContent></Card>
      <LinkedRecords sourceType="VULNERABILITY" id={row.id} no={row.vulnNo} />
    </div>
  );
}
