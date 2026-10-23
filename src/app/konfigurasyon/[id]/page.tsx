import { notFound } from "next/navigation";

import { DetailActions } from "@/components/record-delete";
import { DetailRow, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { viewerCanDelete } from "@/lib/actions/delete-record";
import { formatDate } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function ConfigDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const row = await db.appConfig.findUnique({ where: { id }, include: { owner: true, department: true, manager: true } });
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={row.appName} description={row.version ? `Sürüm ${row.version}` : "Konfigürasyon"} actions={<DetailActions editHref={`/konfigurasyon/${row.id}/duzenle`} canDelete={await viewerCanDelete()} kind="config" id={row.id} label={row.appName} />} />
      <Card><CardContent><dl className="grid gap-x-8 sm:grid-cols-2">
        <DetailRow label="Sahibi">{row.owner.fullName}</DetailRow>
        <DetailRow label="Birim">{row.department?.name ?? "—"}</DetailRow>
        <DetailRow label="Amir">{row.manager?.fullName ?? "—"}</DetailRow>
        <DetailRow label="Sürüm">{row.version ?? "—"}</DetailRow>
        <DetailRow label="Yedekleme tarihi">{formatDate(row.backupDate)}</DetailRow>
        <DetailRow label="Açıklama">{row.description ?? "—"}</DetailRow>
      </dl></CardContent></Card>
    </div>
  );
}
