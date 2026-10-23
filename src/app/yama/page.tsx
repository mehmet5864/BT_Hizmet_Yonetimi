import Link from "next/link";
import { CheckCircle2, Clock3, Plus, Wrench } from "lucide-react";

import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { CHANGE_STATUS_LABELS, CHANGE_STATUSES } from "@/lib/itil/constants";
import { formatDate } from "@/lib/inventory/format";
import { getPatchDashboard } from "@/lib/module-stats";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function PatchListPage({ searchParams }: PageProps<"/yama">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const [rows, dash] = await Promise.all([
    db.patchRecord.findMany({
      where: mergeWhere(
        status ? { status } : {},
        searchOr(query, ["patchNo", "title", "description", "requester.fullName"]),
      ) as never,
      include: { requester: true, requestingManager: true },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    getPatchDashboard(db),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Yama yönetimi"
        description="Yama tanımı, kapsam, dağıtım ve onay takibi."
        actions={
          <Button asChild>
            <Link href="/yama/yeni">
              <Plus className="size-4" />
              Yama kaydı
            </Link>
          </Button>
        }
      />

      <WidgetRow>
        <StatWidget icon={<Wrench className="size-4" />} label="Toplam yama" value={dash.total} hint="Kayıtlı yama işleri" href="/yama" tone="info" />
        <StatWidget icon={<Clock3 className="size-4" />} label="Onay bekleyen" value={dash.pending} href="/yama?durum=PENDING" tone={dash.pending > 0 ? "warning" : "ok"} />
        <StatWidget icon={<Wrench className="size-4" />} label="Uygulanan" value={dash.inProgress} hint="Onaylı / çalışılıyor" href="/yama" />
        <StatWidget icon={<CheckCircle2 className="size-4" />} label="Tamamlanan" value={dash.completed} href="/yama" tone="ok" bar={dash.total ? Math.round((dash.completed / dash.total) * 100) : 0} />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Son yamalar">
            {dash.recent.length ? (
              <ul className="divide-y">
                {dash.recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/yama/${row.id}`} className="font-mono text-xs font-medium hover:underline">{row.patchNo}</Link>
                      <p className="truncate text-sm">{row.title}</p>
                    </div>
                    <StatusBadge value={row.status} label={CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Yama kaydı yok" description="İlk yama kaydını oluşturun." />
            )}
          </RecentCard>
        </div>
        <DistributionCard
          title="Durum"
          items={CHANGE_STATUSES.map((status) => ({
            label: CHANGE_STATUS_LABELS[status],
            value: dash.byStatus[status] ?? 0,
          })).filter((item) => item.value > 0)}
        />
      </div>

      <ListFilters
        searchPlaceholder="Yama no, tanım veya talep eden ara…"
        searchAriaLabel="Yama ara"
        selects={[
          {
            key: "durum",
            label: "Durum",
            allLabel: "Tüm durumlar",
            options: CHANGE_STATUSES.map((item) => ({ value: item, label: CHANGE_STATUS_LABELS[item] })),
          },
        ]}
      />
      <p className="text-muted-foreground text-sm">{rows.length} kayıt listeleniyor</p>

      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Kayıt</th>
                <th className="px-3 py-2">Tanım</th>
                <th className="px-3 py-2">Talep eden</th>
                <th className="px-3 py-2">Birim amiri</th>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/yama/${row.id}`} className="font-mono text-xs hover:underline">{row.patchNo}</Link>
                  </td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.requester.fullName}</td>
                  <td className="px-3 py-2">{row.requestingManager?.fullName ?? "—"}</td>
                  <td className="px-3 py-2">{formatDate(row.requestDate)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={row.status} label={CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya ilk yama kaydını oluşturun." />
      )}
    </div>
  );
}
