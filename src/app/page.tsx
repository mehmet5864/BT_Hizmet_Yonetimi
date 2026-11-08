import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CalendarClock, Layers, Plus, ShieldAlert, Ticket, Users } from "lucide-react";

import { LineChartXY } from "@/components/dashboard/charts";
import { DistributionCard } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { EmptyState, PageHeader, SupportEndCell } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSET_TYPE_LIST } from "@/lib/inventory/asset-types";
import { LIFECYCLE_STATUSES } from "@/lib/inventory/constants";
import { assetDisplayName, formatDateTime } from "@/lib/inventory/format";
import { isRequesterOnly } from "@/lib/auth/rbac";
import { getInventoryAccess } from "@/lib/auth/inventory";
import { getAccessChecker, getViewer } from "@/lib/auth/viewer";
import { visibleRequestWhere } from "@/lib/itil/request-scope";
import { getDashboardData } from "@/lib/queries";
import { getTranslator } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getScopedDb } from "@/lib/auth/data-scope";
import { getLicenseState } from "@/lib/license";
import { listPendingFor } from "@/lib/workflow/engine";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [viewer, inventory, i18n] = await Promise.all([getViewer(), getInventoryAccess(), getTranslator()]);
  const { t } = i18n;
  const scopedInventory = Boolean(inventory && !inventory.canSeeAll);
  const scopedDb = await getScopedDb();
  const license = viewer?.role === "SUPER_ADMIN" ? await getLicenseState() : null;
  const wfPending = viewer ? await listPendingFor(viewer.id, false).catch(() => []) : [];
  const data = await getDashboardData(
    viewer
      ? {
          db: scopedDb,
          assetWhere: inventory?.assetWhere,
          requestWhere: visibleRequestWhere(viewer),
        }
      : undefined,
  );
  const canMutate = Boolean(inventory?.canDirectMutate);
  const role = String(viewer?.role ?? "");
  const accessOk = await getAccessChecker();
  const showOps = (href: string) => Boolean(role) && accessOk(href);
  const criticalHigh = data.byCriticality.HIGH ?? 0;
  const expiringCount = data.expiring.length;
  const attentionItems = [
    { label: "SLA süresi geçmiş olaylar", count: data.attention.overdueIncidents, href: "/olay", tone: "danger", show: showOps("/olay") },
    { label: "Açık kritik zafiyetler", count: data.attention.criticalVulns, href: "/zafiyet", tone: "danger", show: showOps("/zafiyet") },
    { label: "Onay bekleyen envanter istekleri", count: data.attention.pendingApprovals, href: "/envanter/onaylar", tone: "warning", show: Boolean(inventory?.canApprove) },
    { label: "Destek süresi dolmuş varlıklar", count: data.attention.expiredSupport, href: "/envanter?bitis=yaklasan", tone: "warning", show: true },
  ].filter((i) => i.show && i.count > 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 sm:p-8">
      {license && (license.status !== "valid" || license.overLimit) ? (
        <Link
          href="/ayarlar/lisans"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300"
        >
          Lisans: {license.message} ({license.used.toLocaleString("tr-TR")}/{license.maxUsers.toLocaleString("tr-TR")} kullanıcı)
        </Link>
      ) : null}
      {wfPending.length ? (
        <Link
          href="/is-akisi"
          className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium"
        >
          İş akışı: onayınızı bekleyen {wfPending.length} adım var →
        </Link>
      ) : null}
      <div className="hero-banner overflow-hidden rounded-xl p-6 sm:p-8">
        <PageHeader
          title={t("dashboard.title")}
          description={scopedInventory ? t("dashboard.descScoped") : t("dashboard.descAll")}
          actions={
            canMutate ? (
              <Button asChild>
                <Link href="/envanter/yeni">
                  <Plus className="size-4" />
                  {t("dashboard.newAsset")}
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/talepler/yeni">
                  <Plus className="size-4" />
                  {t("dashboard.newRequest")}
                </Link>
              </Button>
            )
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget
          icon={<Layers className="size-4" />}
          label={t("dashboard.totalRecords")}
          value={data.total}
          hint={t("dashboard.typeCount", { count: Object.keys(data.byType).length })}
          href="/envanter"
          tone="info"
        />
        <StatWidget
          icon={<ShieldAlert className="size-4" />}
          label={t("dashboard.highCriticality")}
          value={criticalHigh}
          hint={t("dashboard.highHint")}
          href="/envanter?kritiklik=HIGH"
          tone={criticalHigh > 0 ? "danger" : "default"}
          bar={data.total ? Math.round((criticalHigh / data.total) * 100) : 0}
        />
        <StatWidget
          icon={<CalendarClock className="size-4" />}
          label={t("dashboard.expiring")}
          value={expiringCount}
          hint={t("dashboard.expiringHint")}
          href="/envanter?bitis=yaklasan"
          tone={expiringCount > 0 ? "warning" : "default"}
        />
        <StatWidget
          icon={<AlertTriangle className="size-4" />}
          label={t("dashboard.missingSupport")}
          value={data.unassignedSupport}
          hint={t("dashboard.missingHint")}
          href="/envanter"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {showOps("/personel") ? (
          <StatWidget icon={<Users className="size-4" />} label={t("dashboard.people")} value={data.peopleCount} hint={t("dashboard.peopleHint")} href="/personel" />
        ) : null}
        <StatWidget
          icon={<Ticket className="size-4" />}
          label={t("dashboard.openRequests")}
          value={data.openRequests}
          hint={isRequesterOnly(viewer?.role) ? t("dashboard.openRequestsMine") : t("dashboard.openRequestsAll")}
          href="/talepler"
          tone={data.openRequests > 0 ? "warning" : "ok"}
        />
        {showOps("/katalog") ? (
          <StatWidget
            icon={<BookOpen className="size-4" />}
            label={t("dashboard.activeCatalog")}
            value={data.catalogActive}
            hint={t("dashboard.activeCatalogHint")}
            href="/katalog?durum=ACTIVE"
            tone="info"
          />
        ) : null}
        {showOps("/degisiklik") ? (
          <StatWidget
            icon={<CalendarClock className="size-4" />}
            label={t("dashboard.openChanges")}
            value={data.openChanges}
            hint={t("dashboard.openChangesHint")}
            href="/degisiklik"
          />
        ) : null}
        {showOps("/zafiyet") ? (
          <StatWidget
            icon={<ShieldAlert className="size-4" />}
            label={t("dashboard.openVulns")}
            value={data.openVulns}
            hint={t("dashboard.openVulnsHint")}
            href="/zafiyet"
            tone={data.openVulns > 0 ? "danger" : "ok"}
          />
        ) : null}
        {showOps("/olay") ? (
          <StatWidget
            icon={<AlertTriangle className="size-4" />}
            label={t("dashboard.openIncidents")}
            value={data.openIncidents}
            hint={t("dashboard.openIncidentsHint")}
            href="/olay"
            tone={data.openIncidents > 0 ? "danger" : "ok"}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DistributionCard
          title="Envanter türü dağılımı"
          items={ASSET_TYPE_LIST.map((type) => ({ label: t(`assets.${type.key}.label`), value: data.byType[type.key] ?? 0, href: `/envanter?tur=${type.slug}` })).filter((i) => i.value > 0)}
        />
        <DistributionCard
          title={t("dashboard.criticality")}
          items={(["HIGH", "MEDIUM", "LOW"] as const).map((level) => ({
            label: t(`criticality.${level}`),
            value: data.byCriticality[level] ?? 0,
            color: level === "HIGH" ? "#dc2626" : level === "MEDIUM" ? "#f59e0b" : "#16a34a",
          }))}
        />
        <DistributionCard
          title={t("dashboard.lifecycle")}
          items={LIFECYCLE_STATUSES.map((key) => ({ label: t(`lifecycle.${key}`), value: data.byStatus[key] ?? 0 }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="widget-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.calendar")}</CardTitle>
            <CardDescription>{t("dashboard.calendarHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.expiring.length ? (
              <ul className="divide-y">
                {data.expiring.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/envanter/${asset.id}`} className="truncate text-sm font-medium hover:underline">
                        {assetDisplayName(asset)}
                      </Link>
                      <p className="text-muted-foreground truncate text-xs">
                        {asset.owner.fullName}
                        {asset.department ? ` · ${asset.department.name}` : ""}
                      </p>
                    </div>
                    <SupportEndCell value={asset.supportEndDate} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("dashboard.noContracts")} description={t("dashboard.noContractsHint")} />
            )}
          </CardContent>
        </Card>

        <Card className="widget-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dikkat gerektirenler</CardTitle>
            <CardDescription>Bugün ilgilenmeniz gereken kayıtlar.</CardDescription>
          </CardHeader>
          <CardContent>
            {attentionItems.length ? (
              <ul className="space-y-2">
                {attentionItems.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="hover:border-primary/40 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors">
                      <span>{item.label}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", item.tone === "danger" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{item.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Şu an dikkat gerektiren kayıt yok.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="widget-card">
        <CardHeader>
          <CardTitle className="text-base">Son 6 ay: talep, olay ve değişiklik</CardTitle>
          <CardDescription>Aylık açılan kayıt sayısı (yatay: ay, dikey: adet).</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChartXY labels={data.trend.labels} series={data.trend.series} />
        </CardContent>
      </Card>

      <Card className="widget-card">
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.activity")}</CardTitle>
          <CardDescription>{t("dashboard.activityHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length ? (
            <ul className="divide-y">
              {data.recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">
                      {log.asset ? (
                        <Link href={`/envanter/${log.asset.id}`} className="font-medium hover:underline">
                          {log.asset.name ?? log.asset.stockNo ?? t("dashboard.record")}
                        </Link>
                      ) : (
                        <span className="font-medium">{t("dashboard.deletedRecord")}</span>
                      )}
                      <span className="text-muted-foreground"> — {log.note ?? log.action}</span>
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t("dashboard.noActivity")}
              description={t("dashboard.noActivityHint")}
              action={
                canMutate ? (
                  <Button asChild size="sm">
                    <Link href="/envanter/yeni">{t("dashboard.addAsset")}</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href="/talepler/yeni">{t("dashboard.openTicket")}</Link>
                  </Button>
                )
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
