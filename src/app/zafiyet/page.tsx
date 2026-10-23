import Link from "next/link";
import { AlertTriangle, Plus, ShieldAlert, Timer } from "lucide-react";

import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { ScannerPullButton } from "@/components/scanner-pull-button";
import { EmptyState } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VULN_SEVERITIES, VULN_SEVERITY_LABELS, VULN_STATUS_LABELS, VULN_STATUSES } from "@/lib/itil/constants";
import { formatDate } from "@/lib/inventory/format";
import { getVulnDashboard } from "@/lib/module-stats";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getSystemSettings } from "@/lib/settings-store";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function VulnListPage({ searchParams }: PageProps<"/zafiyet">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const severity = param(params, "seviye");
  const [rows, dash, settings] = await Promise.all([
    db.vulnerability.findMany({
      where: mergeWhere(
        status ? { status } : {},
        severity ? { severity } : {},
        searchOr(query, ["vulnNo", "deviceName", "deviceIp", "cve", "description", "owner.fullName", "department.name"]),
      ) as never,
      include: { owner: true, department: true, asset: { select: { id: true, name: true } } },
      orderBy: { detectedAt: "desc" },
      take: 300,
    }),
    getVulnDashboard(db),
    getSystemSettings(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Zafiyet yönetimi"
        description={
          settings.scanner.lastSyncMessage
            ? `Tespit edilen zafiyetler, süre ve kapatma durumu. ${settings.scanner.lastSyncMessage}`
            : "Tespit edilen zafiyetler, süre ve kapatma durumu. Tarama cihazı Ayarlar’dan bağlanır."
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="ghost">
              <Link href="/ayarlar">Tarama ayarları</Link>
            </Button>
            <ScannerPullButton />
            <Button asChild>
              <Link href="/zafiyet/yeni">
                <Plus className="size-4" />
                Zafiyet ekle
              </Link>
            </Button>
          </div>
        }
      />

      <WidgetRow>
        <StatWidget icon={<ShieldAlert className="size-4" />} label="Toplam zafiyet" value={dash.total} href="/zafiyet" tone="info" />
        <StatWidget icon={<AlertTriangle className="size-4" />} label="Açık" value={dash.open} href="/zafiyet?durum=OPEN" tone={dash.open > 0 ? "warning" : "ok"} />
        <StatWidget icon={<ShieldAlert className="size-4" />} label="Kritik / yüksek" value={dash.critical + dash.high} href="/zafiyet?seviye=CRITICAL" tone={dash.critical + dash.high > 0 ? "danger" : "ok"} />
        <StatWidget icon={<Timer className="size-4" />} label="Termini geçen" value={dash.overdue} href="/zafiyet" tone={dash.overdue > 0 ? "danger" : "ok"} />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Son tespitler">
            {dash.recent.length ? (
              <ul className="divide-y">
                {dash.recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/zafiyet/${row.id}`} className="font-mono text-xs font-medium hover:underline">{row.vulnNo}</Link>
                      <p className="truncate text-sm">{row.deviceName ?? "Cihaz yok"}</p>
                    </div>
                    <StatusBadge value={row.status} label={VULN_STATUS_LABELS[row.status as keyof typeof VULN_STATUS_LABELS] ?? row.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Zafiyet kaydı yok" description="Tarama sonucu veya tespit ekleyin." />
            )}
          </RecentCard>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DistributionCard
            title="Seviye"
            items={VULN_SEVERITIES.map((level) => ({
              label: VULN_SEVERITY_LABELS[level],
              value: dash.bySeverity[level] ?? 0,
            }))}
          />
          <DistributionCard
            title="Durum"
            items={VULN_STATUSES.map((status) => ({
              label: VULN_STATUS_LABELS[status],
              value: dash.byStatus[status] ?? 0,
            }))}
          />
        </div>
      </div>

      <ListFilters
        searchPlaceholder="CVE, cihaz, IP, sahip veya zafiyet no ara…"
        searchAriaLabel="Zafiyet ara"
        selects={[
          {
            key: "durum",
            label: "Durum",
            allLabel: "Tüm durumlar",
            options: VULN_STATUSES.map((item) => ({ value: item, label: VULN_STATUS_LABELS[item] })),
          },
          {
            key: "seviye",
            label: "Seviye",
            allLabel: "Tüm seviyeler",
            className: "w-40",
            options: VULN_SEVERITIES.map((item) => ({ value: item, label: VULN_SEVERITY_LABELS[item] })),
          },
        ]}
      />
      <p className="text-muted-foreground text-sm">{rows.length} kayıt listeleniyor</p>

      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Cihaz / envanter</th>
                <th className="px-3 py-2">CVE / kaynak</th>
                <th className="px-3 py-2">Sahip / birim</th>
                <th className="px-3 py-2">Seviye</th>
                <th className="px-3 py-2">Termin</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/zafiyet/${row.id}`} className="font-mono text-xs hover:underline">{row.vulnNo}</Link>
                  </td>
                  <td className="px-3 py-2">
                    {row.deviceName ?? "—"}
                    <p className="text-muted-foreground font-mono text-xs">{row.deviceIp ?? "—"}</p>
                    {row.asset ? (
                      <Link href={`/envanter/${row.asset.id}`} className="text-muted-foreground text-xs hover:underline">
                        {row.asset.name ?? "Envanter"}
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {row.cve ?? "—"}
                    <p className="text-muted-foreground text-xs">{row.source === "SCANNER" ? "Tarayıcı" : "Manuel"}</p>
                  </td>
                  <td className="px-3 py-2">
                    {row.owner?.fullName ?? "—"}
                    <p className="text-muted-foreground text-xs">{row.department?.name ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{VULN_SEVERITY_LABELS[row.severity as keyof typeof VULN_SEVERITY_LABELS] ?? row.severity}</Badge>
                  </td>
                  <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={row.status} label={VULN_STATUS_LABELS[row.status as keyof typeof VULN_STATUS_LABELS] ?? row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya tarama sonucu / tespit ekleyin." />
      )}
    </div>
  );
}
