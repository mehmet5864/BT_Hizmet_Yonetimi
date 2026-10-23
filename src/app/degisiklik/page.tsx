import Link from "next/link";
import { CheckCircle2, Clock3, Plus, ShieldAlert, Workflow } from "lucide-react";

import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { CHANGE_STATUS_LABELS, CHANGE_STATUSES } from "@/lib/itil/constants";
import { formatDate } from "@/lib/inventory/format";
import { getChangeDashboard } from "@/lib/module-stats";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  SOFTWARE: "Yazılım",
  HARDWARE: "Donanım",
  OTHER: "Diğer",
};

export default async function ChangeListPage({ searchParams }: PageProps<"/degisiklik">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const kind = param(params, "tur");
  const [rows, dash] = await Promise.all([
    db.changeRecord.findMany({
      where: mergeWhere(
        status ? { status } : {},
        kind ? { changeKind: kind } : {},
        searchOr(query, ["changeNo", "description", "changeKind", "impact", "requester.fullName", "requestingDept.name"]),
      ) as never,
      include: { requester: true, requestingDept: true, requestingManager: true },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    getChangeDashboard(db),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Değişiklik yönetimi"
        description="Yazılım, donanım ve diğer değişikliklerin onay ve uygulama takibi. Onay birim sayısı 1–10 seçilir."
        actions={
          <Button asChild>
            <Link href="/degisiklik/yeni">
              <Plus className="size-4" />
              Değişiklik kaydı
            </Link>
          </Button>
        }
      />

      <WidgetRow>
        <StatWidget icon={<Workflow className="size-4" />} label="Toplam kayıt" value={dash.total} hint="Tüm değişiklikler" href="/degisiklik" tone="info" />
        <StatWidget icon={<Clock3 className="size-4" />} label="Onay bekleyen" value={dash.pending} hint="Amir / bilgi güvenliği" href="/degisiklik?durum=PENDING" tone={dash.pending > 0 ? "warning" : "ok"} />
        <StatWidget icon={<ShieldAlert className="size-4" />} label="Uygulanıyor" value={dash.inProgress} hint="Onaylı veya çalışılıyor" href="/degisiklik" />
        <StatWidget icon={<CheckCircle2 className="size-4" />} label="Tamamlanan" value={dash.completed} hint="Kapanan değişiklikler" href="/degisiklik" tone="ok" bar={dash.total ? Math.round((dash.completed / dash.total) * 100) : 0} />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Son değişiklikler" description="Güncellenen kayıtlar.">
            {dash.recent.length ? (
              <ul className="divide-y">
                {dash.recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/degisiklik/${row.id}`} className="font-mono text-xs font-medium hover:underline">
                        {row.changeNo}
                      </Link>
                      <p className="text-muted-foreground truncate text-xs">{row.requester.fullName}</p>
                    </div>
                    <StatusBadge value={row.status} label={CHANGE_STATUS_LABELS[row.status as keyof typeof CHANGE_STATUS_LABELS] ?? row.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Değişiklik kaydı yok" description="İlk değişiklik talebini oluşturun." />
            )}
          </RecentCard>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DistributionCard
            title="Durum"
            items={CHANGE_STATUSES.map((status) => ({
              label: CHANGE_STATUS_LABELS[status],
              value: dash.byStatus[status] ?? 0,
            })).filter((item) => item.value > 0)}
          />
          <DistributionCard
            title="Tür"
            items={Object.entries(dash.byKind).map(([key, value]) => ({
              label: KIND_LABELS[key] ?? key,
              value,
            }))}
          />
        </div>
      </div>

      <ListFilters
        searchPlaceholder="Kayıt no, açıklama, sahip veya birim ara…"
        searchAriaLabel="Değişiklik ara"
        selects={[
          {
            key: "durum",
            label: "Durum",
            allLabel: "Tüm durumlar",
            options: CHANGE_STATUSES.map((item) => ({ value: item, label: CHANGE_STATUS_LABELS[item] })),
          },
          {
            key: "tur",
            label: "Tür",
            allLabel: "Tüm türler",
            className: "w-40",
            options: Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
      />
      <p className="text-muted-foreground text-sm">{rows.length} kayıt listeleniyor</p>

      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Kayıt</th>
                <th className="px-3 py-2 font-medium">Talep eden</th>
                <th className="px-3 py-2 font-medium">Birim amiri</th>
                <th className="px-3 py-2 font-medium">Tür / etki</th>
                <th className="px-3 py-2 font-medium">Tarih</th>
                <th className="px-3 py-2 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/degisiklik/${row.id}`} className="font-mono text-xs hover:underline">
                      {row.changeNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {row.requester.fullName}
                    <p className="text-muted-foreground text-xs">{row.requestingDept?.name ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2">{row.requestingManager?.fullName ?? "—"}</td>
                  <td className="px-3 py-2">
                    {KIND_LABELS[row.changeKind ?? ""] ?? row.changeKind ?? "—"} / {row.impact ?? "—"}
                  </td>
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
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya ilk değişiklik talebini oluşturun." />
      )}
    </div>
  );
}
