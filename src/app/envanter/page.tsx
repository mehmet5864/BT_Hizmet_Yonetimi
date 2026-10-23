import Link from "next/link";
import { AlertTriangle, CalendarClock, ClipboardSignature, FileSpreadsheet, Layers, Plus, ShieldAlert } from "lucide-react";

import { AssetFilters } from "@/components/asset-filters";
import { AssetTable } from "@/components/asset-table";
import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { EmptyState, SupportEndCell } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { ASSET_TYPE_LIST, getAssetTypeDef } from "@/lib/inventory/asset-types";
import { CRITICALITY_LABELS, LIFECYCLE_STATUS_LABELS, SLUG_TO_ASSET_TYPE } from "@/lib/inventory/constants";
import { assetDisplayName } from "@/lib/inventory/format";
import { getInventoryAccess } from "@/lib/auth/inventory";
import { getInventoryModuleStats } from "@/lib/module-stats";
import { prisma } from "@/lib/prisma";
import { listAssets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: PageProps<"/envanter">) {
  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const typeSlug = single("tur");
  const assetType = typeSlug ? SLUG_TO_ASSET_TYPE[typeSlug] : undefined;
  const typeDef = assetType ? getAssetTypeDef(assetType) : undefined;

  const access = await getInventoryAccess();
  const assetWhere = access?.assetWhere ?? { ownerId: "__none__" };

  const [assets, departments, dash, pendingCount, osRows, versionRows] = await Promise.all([
    listAssets(
      {
        type: assetType,
        criticality: single("kritiklik"),
        status: single("durum"),
        departmentId: single("birim"),
        query: single("q"),
        operatingSystem: single("isletim"),
        version: single("surum"),
        expiring: single("bitis") === "yaklasan",
        withOpenVulns: single("zafiyet") === "acik",
      },
      assetWhere,
    ),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    getInventoryModuleStats(assetType, assetWhere),
    access
      ? prisma.inventoryApproval.count({
          where: access.canApprove
            ? { status: "PENDING" }
            : { status: "PENDING", requestedById: access.viewer.id },
        })
      : 0,
    prisma.asset.findMany({
      where: { AND: [assetWhere, assetType ? { assetType } : {}, { operatingSystem: { not: null } }] } as never,
      select: { operatingSystem: true },
      distinct: ["operatingSystem"],
      orderBy: { operatingSystem: "asc" },
    }),
    prisma.asset.findMany({
      where: {
        AND: [
          assetWhere,
          assetType ? { assetType } : {},
          { version: { not: null } },
          single("isletim") ? { operatingSystem: single("isletim") } : {},
        ],
      } as never,
      select: { version: true },
      distinct: ["version"],
      orderBy: { version: "asc" },
    }),
  ]);
  const osOptions = osRows.map((row) => row.operatingSystem).filter((v): v is string => Boolean(v));
  const versionOptions = versionRows.map((row) => row.version).filter((v): v is string => Boolean(v));
  const canPropose = Boolean(access?.canPropose);
  const canDirect = Boolean(access?.canDirectMutate);
  const scoped = !access?.canSeeAll;

  const newHref = typeDef ? `/envanter/yeni?tur=${typeDef.slug}` : "/envanter/yeni";

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title={typeDef ? typeDef.plural : "Tüm envanter"}
        description={
          typeDef
            ? typeDef.description
            : scoped
              ? "Yalnızca size zimmetli ve biriminizdeki envanter kayıtları. Yeni ekleme ve silme envanter yöneticisi onayına düşer."
              : "Tüm envanter türlerindeki kayıtları arayın, filtreleyin ve yönetin."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/envanter/zimmet">
                <ClipboardSignature className="size-4" />
                Zimmet formu
              </Link>
            </Button>
            {canPropose ? (
              <>
                {canDirect ? (
                  <>
                    <Button asChild variant="outline">
                      <Link href="/envanter/onaylar">
                        Onay kuyruğu{pendingCount ? ` (${pendingCount})` : ""}
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/envanter/toplu">
                        <FileSpreadsheet className="size-4" />
                        Toplu yükleme
                      </Link>
                    </Button>
                  </>
                ) : pendingCount ? (
                  <Button asChild variant="outline">
                    <Link href="/envanter/onaylar">Bekleyen isteklerim ({pendingCount})</Link>
                  </Button>
                ) : null}
                {canDirect ? (
                  <Button asChild>
                    <Link href={newHref}>
                      <Plus className="size-4" />
                      {typeDef ? `${typeDef.label} ekle` : "Yeni envanter"}
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />

      <WidgetRow>
        <StatWidget
          icon={<Layers className="size-4" />}
          label="Toplam kayıt"
          value={dash.total}
          hint={typeDef ? typeDef.plural : "Tüm türler"}
          href="/envanter"
          tone="info"
        />
        <StatWidget
          icon={<ShieldAlert className="size-4" />}
          label="Yüksek kritiklik"
          value={dash.high}
          hint="Öncelikli izleme"
          href="/envanter?kritiklik=HIGH"
          tone={dash.high > 0 ? "danger" : "ok"}
          bar={dash.total ? Math.round((dash.high / dash.total) * 100) : 0}
        />
        <StatWidget
          icon={<CalendarClock className="size-4" />}
          label="Süresi yaklaşan"
          value={dash.expiring}
          hint="60 gün içinde biten bakım / lisans"
          href="/envanter?bitis=yaklasan"
          tone={dash.expiring > 0 ? "warning" : "ok"}
        />
        <StatWidget
          icon={<AlertTriangle className="size-4" />}
          label="Açık zafiyetli"
          value={dash.withOpenVulns}
          hint="En az bir açık zafiyeti olan varlık"
          href="/envanter?zafiyet=acik"
          tone={dash.withOpenVulns > 0 ? "danger" : "ok"}
          bar={dash.total ? Math.round((dash.withOpenVulns / dash.total) * 100) : 0}
        />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Bakım / lisans takvimi" description="Yaklaşan bitiş tarihleri." actionHref="/envanter?bitis=yaklasan">
            {dash.expiringRows.length ? (
              <ul className="divide-y">
                {dash.expiringRows.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/envanter/${asset.id}`} className="truncate text-sm font-medium hover:underline">
                      {assetDisplayName(asset)}
                    </Link>
                    <SupportEndCell value={asset.supportEndDate} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Yaklaşan sözleşme yok" description="Bitiş tarihi girildikçe bu liste dolar." />
            )}
          </RecentCard>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DistributionCard
            title="Kritiklik"
            items={(["HIGH", "MEDIUM", "LOW"] as const).map((level) => ({
              label: CRITICALITY_LABELS[level],
              value: dash.byCriticality[level] ?? 0,
              href: `/envanter?kritiklik=${level}`,
            }))}
          />
          {!typeDef ? (
            <DistributionCard
              title="Türler"
              items={ASSET_TYPE_LIST.map((item) => ({
                label: item.label,
                value: dash.byType[item.key] ?? 0,
                href: `/envanter?tur=${item.slug}`,
              })).filter((item) => item.value > 0)}
            />
          ) : (
            <DistributionCard
              title="Yaşam döngüsü"
              items={Object.entries(LIFECYCLE_STATUS_LABELS).map(([key, label]) => ({
                label,
                value: dash.byStatus[key] ?? 0,
              }))}
            />
          )}
        </div>
      </div>

      <AssetFilters
        departments={departments.map((department) => ({ id: department.id, label: department.name }))}
        osOptions={osOptions}
        versionOptions={versionOptions}
      />

      <div className="text-muted-foreground text-sm">
        {assets.length} kayıt listeleniyor
        {assets.length === 300 ? " (ilk 300 sonuç)" : ""}
      </div>

      {assets.length ? (
        <AssetTable assets={assets} />
      ) : (
        <EmptyState
          title="Kayıt bulunamadı"
          description="Filtrelerinizi gevşetin veya bu türde ilk envanter kaydını oluşturun."
          action={
            canDirect ? (
              <Button asChild size="sm">
                <Link href={newHref}>Envanter ekle</Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
