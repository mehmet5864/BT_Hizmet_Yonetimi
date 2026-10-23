import Link from "next/link";
import { BookMarked, CalendarClock, Plus, Server } from "lucide-react";

import { ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/inventory/format";
import { getConfigDashboard } from "@/lib/module-stats";
import { prisma } from "@/lib/prisma";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function ConfigListPage({ searchParams }: PageProps<"/konfigurasyon">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const query = param(params, "q");
  const departmentId = param(params, "birim");
  const noBackup = param(params, "yedek") === "yok";
  const [rows, departments, dash] = await Promise.all([
    db.appConfig.findMany({
      where: mergeWhere(
        departmentId ? { departmentId } : {},
        noBackup ? { backupDate: null } : {},
        searchOr(query, ["appName", "version", "description", "owner.fullName", "department.name"]),
      ) as never,
      include: { owner: true, department: true },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getConfigDashboard(db),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Konfigürasyon yönetimi"
        description="Uygulama konfigürasyonları ve yedekleme tarihi."
        actions={
          <Button asChild>
            <Link href="/konfigurasyon/yeni">
              <Plus className="size-4" />
              Konfigürasyon
            </Link>
          </Button>
        }
      />

      <WidgetRow>
        <StatWidget icon={<BookMarked className="size-4" />} label="Uygulama kaydı" value={dash.total} href="/konfigurasyon" tone="info" />
        <StatWidget icon={<CalendarClock className="size-4" />} label="Yedeği var" value={dash.withBackup} href="/konfigurasyon" tone="ok" bar={dash.total ? Math.round((dash.withBackup / dash.total) * 100) : 0} />
        <StatWidget
          icon={<Server className="size-4" />}
          label="Yedek tarihi yok"
          value={dash.withoutBackup}
          href="/konfigurasyon?yedek=yok"
          tone={dash.withoutBackup > 0 ? "warning" : "ok"}
        />
        <StatWidget icon={<BookMarked className="size-4" />} label="Son kayıtlar" value={dash.recent.length} hint="Pano özeti" href="/konfigurasyon" />
      </WidgetRow>

      <RecentCard title="Son konfigürasyonlar">
        {dash.recent.length ? (
          <ul className="divide-y">
            {dash.recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/konfigurasyon/${row.id}`} className="text-sm font-medium hover:underline">{row.appName}</Link>
                  <p className="text-muted-foreground truncate text-xs">{row.owner.fullName} · {row.version ?? "sürüm yok"}</p>
                </div>
                <span className="text-muted-foreground text-xs">{formatDate(row.backupDate)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Konfigürasyon yok" description="İlk uygulama konfigürasyonunu ekleyin." />
        )}
      </RecentCard>

      <ListFilters
        searchPlaceholder="Uygulama, sürüm veya sahip ara…"
        searchAriaLabel="Konfigürasyon ara"
        selects={[
          {
            key: "birim",
            label: "Birim",
            allLabel: "Tüm birimler",
            className: "w-52",
            options: departments.map((item) => ({ value: item.id, label: item.name })),
          },
        ]}
        toggles={[{ key: "yedek", value: "yok", label: "Yedek tarihi yok" }]}
      />
      <p className="text-muted-foreground text-sm">{rows.length} kayıt listeleniyor</p>

      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Uygulama</th>
                <th className="px-3 py-2">Sahibi</th>
                <th className="px-3 py-2">Sürüm</th>
                <th className="px-3 py-2">Yedek</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/konfigurasyon/${row.id}`} className="font-medium hover:underline">{row.appName}</Link>
                  </td>
                  <td className="px-3 py-2">
                    {row.owner.fullName}
                    <p className="text-muted-foreground text-xs">{row.department?.name ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2">{row.version ?? "—"}</td>
                  <td className="px-3 py-2">{formatDate(row.backupDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya ilk uygulama konfigürasyonunu ekleyin." />
      )}
    </div>
  );
}
