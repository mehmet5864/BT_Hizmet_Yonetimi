import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CalendarClock, Layers, Plus, ShieldAlert, Ticket, Users } from "lucide-react";

import { StatWidget } from "@/components/dashboard/stat-widget";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import { CriticalityBadge, EmptyState, PageHeader, SupportEndCell } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSET_TYPE_LIST } from "@/lib/inventory/asset-types";
import { LIFECYCLE_STATUSES } from "@/lib/inventory/constants";
import { assetDisplayName, formatDateTime } from "@/lib/inventory/format";
import { isRequesterOnly } from "@/lib/auth/rbac";
import { getInventoryAccess } from "@/lib/auth/inventory";
import { getAccessChecker, getViewer } from "@/lib/auth/viewer";
import { visibleRequestWhere } from "@/lib/itil/request-scope";
import { ITIL_PRACTICE_MAP } from "@/lib/itil/processes";
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
  const wfPending = viewer ? await listPendingFor(viewer.id, viewer.role === "SUPER_ADMIN").catch(() => []) : [];
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      {showOps("/katalog") || showOps("/hizmetler") ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("dashboard.itilTitle")}</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hizmetler">
                {t("dashboard.allPractices")} <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
          {showOps("/katalog") ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatWidget
                icon={<BookOpen className="size-4" />}
                label={t("dashboard.activeCatalog")}
                value={data.catalogActive}
                hint={t("dashboard.activeCatalogHint")}
                href="/katalog?durum=ACTIVE"
                tone="info"
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ITIL_PRACTICE_MAP.filter((item) => showOps(item.href)).map((item) => (
              <Link key={`${item.english}-${item.href}-${item.id}`} href={item.href} className="group">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="space-y-1 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{t(`itil.${item.id}.label`)}</CardTitle>
                      {item.existing ? <Badge variant="outline">1.3.0</Badge> : <Badge>2.0</Badge>}
                    </div>
                    <CardDescription>{item.english}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between gap-2 pt-0">
                    <p className="text-muted-foreground text-xs">{t(`itil.${item.id}.description`)}</p>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0 rtl:rotate-180" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("dashboard.assetTypes")}</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/envanter">
              {t("dashboard.viewAll")} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ASSET_TYPE_LIST.map((type) => (
            <Link key={type.key} href={`/envanter?tur=${type.slug}`} className="group">
              <Card className="widget-card h-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="flex items-start gap-3">
                  <div className="widget-icon">
                    <AssetTypeIcon name={type.icon} className={cn("size-5", type.accent)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{t(`assets.${type.key}.label`)}</p>
                      <span className="text-lg font-semibold tabular-nums">
                        {data.byType[type.key] ?? 0}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{t(`assets.${type.key}.description`)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

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

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="widget-card">
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.criticality")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["HIGH", "MEDIUM", "LOW"] as const).map((level) => {
                const count = data.byCriticality[level] ?? 0;
                const ratio = data.total ? Math.round((count / data.total) * 100) : 0;
                return (
                  <div key={level} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <CriticalityBadge value={level} label={t(`criticality.${level}`)} />
                      </span>
                      <span className="tabular-nums">{count}</span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          level === "HIGH" && "bg-red-500",
                          level === "MEDIUM" && "bg-amber-500",
                          level === "LOW" && "bg-emerald-500",
                        )}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="widget-card">
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.lifecycle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {LIFECYCLE_STATUSES.map((key) => (
                <Badge key={key} variant="secondary" className="gap-1.5">
                  {t(`lifecycle.${key}`)}
                  <span className="tabular-nums">{data.byStatus[key] ?? 0}</span>
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

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
