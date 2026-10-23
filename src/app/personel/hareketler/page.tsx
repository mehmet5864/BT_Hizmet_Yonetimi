import { redirect } from "next/navigation";

import { PersonnelActions } from "@/components/personnel-actions";
import { ListFilters } from "@/components/list-filters";
import { AuditLogPanel, ACTION_LABELS, ENTITY_LABELS, type AuditLogItem } from "@/components/settings/audit-log-panel";
import { Activity, CalendarDays, Clock, PlusCircle } from "lucide-react";

import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { EmptyState } from "@/components/ui-bits";
import { ownActivityWhere } from "@/lib/activity-scope";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { mergeWhere, param, searchOr } from "@/lib/search-params";

export const dynamic = "force-dynamic";

const PERIODS = [
  { value: "1", label: "Son 24 saat" },
  { value: "7", label: "Son 7 gün" },
  { value: "30", label: "Son 30 gün" },
  { value: "90", label: "Son 90 gün" },
];

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "RELEASE", "APPROVE", "REJECT", "ESCALATE"] as const;

function periodWhere(period: string | undefined) {
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return {};
  return { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };
}

export default async function PersonnelActivityPage({ searchParams }: PageProps<"/personel/hareketler">) {
  const session = await getSession();
  if (!session) redirect("/giris");

  const params = await searchParams;
  const query = param(params, "q");
  const action = param(params, "islem");
  const entity = param(params, "kayit");
  const period = param(params, "donem");
  const filtering = Boolean(query || action || entity || period);

  const where = mergeWhere(
    await ownActivityWhere(session),
    action ? { action } : {},
    entity ? { entityType: entity } : {},
    periodWhere(period),
    searchOr(query, ["note", "actor", "asset.name", "asset.stockNo"]),
  );

  const logs = await prisma.activityLog.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { asset: { select: { id: true, name: true, stockNo: true, assetType: true } } },
  });
  const items: AuditLogItem[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    note: log.note,
    actor: log.actor,
    createdAt: log.createdAt.toISOString(),
    changes: log.changes,
    entityType: log.entityType,
    asset: log.asset,
  }));
  const totals = {
    total: items.length,
    created: items.filter((log) => log.action === "CREATE").length,
    updated: items.filter((log) => log.action === "UPDATE" || log.action === "RELEASE").length,
    deleted: items.filter((log) => log.action === "DELETE").length,
  };

  const ownWhere = await ownActivityWhere(session);
  const dayMs = 24 * 60 * 60 * 1000;
  const [statAll, statDay, statWeek, statCreate] = await Promise.all([
    prisma.activityLog.count({ where: ownWhere as never }),
    prisma.activityLog.count({ where: mergeWhere(ownWhere, { createdAt: { gte: new Date(Date.now() - dayMs) } }) as never }),
    prisma.activityLog.count({ where: mergeWhere(ownWhere, { createdAt: { gte: new Date(Date.now() - 7 * dayMs) } }) as never }),
    prisma.activityLog.count({ where: mergeWhere(ownWhere, { action: "CREATE" }) as never }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Hareketlerim"
        description="Sizin yaptığınız işlemler, zimmetinizdeki cihazlar ve sizinle ilişkili kayıtlar."
        actions={<PersonnelActions canAdd={session.role !== "USER"} />}
      />
      <WidgetRow>
        <StatWidget icon={<Activity className="size-4" />} label="Toplam hareket" value={statAll} hint="Sizinle ilişkili tüm kayıtlar" href="/personel/hareketler" tone="info" />
        <StatWidget icon={<Clock className="size-4" />} label="Son 24 saat" value={statDay} hint="Bugünkü işlemler" href="/personel/hareketler?donem=1" tone={statDay > 0 ? "warning" : "default"} />
        <StatWidget icon={<CalendarDays className="size-4" />} label="Son 7 gün" value={statWeek} hint="Haftalık işlem sayısı" href="/personel/hareketler?donem=7" bar={statAll ? Math.round((statWeek / statAll) * 100) : 0} />
        <StatWidget icon={<PlusCircle className="size-4" />} label="Eklenen kayıt" value={statCreate} hint="Oluşturma işlemleri" href="/personel/hareketler?islem=CREATE" tone="ok" />
      </WidgetRow>
      <ListFilters
        searchPlaceholder="Not, demirbaş veya stok no ara…"
        searchAriaLabel="Hareket ara"
        selects={[
          {
            key: "islem",
            label: "İşlem",
            allLabel: "Tüm işlemler",
            options: ACTIONS.map((item) => ({ value: item, label: ACTION_LABELS[item] ?? item })),
          },
          {
            key: "kayit",
            label: "Kayıt türü",
            allLabel: "Tüm kayıtlar",
            className: "w-48",
            options: Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: "donem",
            label: "Dönem",
            allLabel: "Tüm zamanlar",
            options: PERIODS,
          },
        ]}
      />
      {items.length ? (
        <AuditLogPanel logs={items} totals={totals} />
      ) : (
        <EmptyState
          title={filtering ? "Filtreye uyan hareket yok" : "Henüz hareket yok"}
          description={
            filtering
              ? "Aramayı veya filtreleri gevşetin."
              : "İşlem yaptıkça kendi kayıtlarınız burada listelenir."
          }
        />
      )}
    </div>
  );
}
