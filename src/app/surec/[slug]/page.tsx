import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";

import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { getItilProcess } from "@/lib/itil/processes";
import { getTranslator } from "@/lib/i18n";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function ProcessListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const db = await getScopedDb();
  const { slug } = await params;
  const def = getItilProcess(slug);
  if (!def) notFound();
  const { t } = await getTranslator();
  const queryParams = await searchParams;
  const query = param(queryParams, "q");
  const status = param(queryParams, "durum");
  const rows = await db.itilProcessRecord.findMany({
    where: mergeWhere(
      { process: def.key },
      status ? { status } : {},
      searchOr(query, ["recordNo", "title", "description", "requester.fullName", "service.name"]),
    ) as never,
    include: { requester: true, requestingDept: true, owner: true, service: true },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  const statusCounts = await db.itilProcessRecord.groupBy({
    by: ["status"],
    where: { process: def.key },
    _count: { _all: true },
  });
  const countOf = (value: string) => statusCounts.find((item) => item.status === value)?._count._all ?? 0;
  const totalAll = statusCounts.reduce((sum, item) => sum + item._count._all, 0);
  const shown = def.statuses.slice(0, 3);
  const tones = ["warning", "info", "ok"] as const;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title={t(`itil.${def.key}.label`)}
        description={`${def.english}. ${t(`itil.${def.key}.description`)}`}
        actions={
          <Button asChild>
            <Link href={`${def.href}/yeni`}>
              <Plus className="size-4" />
              {t("process.add")}
            </Link>
          </Button>
        }
      />
      <WidgetRow>
        <StatWidget icon={<ClipboardList className="size-4" />} label="Toplam kayıt" value={totalAll} hint={t(`itil.${def.key}.label`)} href={def.href} tone="info" />
        {shown.map((item, index) => (
          <StatWidget
            key={item.value}
            icon={<ClipboardList className="size-4" />}
            label={item.label}
            value={countOf(item.value)}
            href={`${def.href}?durum=${item.value}`}
            tone={countOf(item.value) > 0 ? tones[index] : "default"}
            bar={totalAll ? Math.round((countOf(item.value) / totalAll) * 100) : 0}
          />
        ))}
      </WidgetRow>
      <ListFilters
        searchPlaceholder={t("process.search")}
        searchAriaLabel={t("process.search")}
        selects={[
          {
            key: "durum",
            label: t("common.status"),
            allLabel: t("catalog.allStatuses"),
            options: def.statuses,
          },
        ]}
      />
      <p className="text-muted-foreground text-sm">{t("process.listed", { count: rows.length })}</p>
      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-start">
              <tr>
                <th className="px-3 py-2">{t("process.colNo")}</th>
                <th className="px-3 py-2">{t("process.colTitle")}</th>
                <th className="px-3 py-2">{t("process.colService")}</th>
                <th className="px-3 py-2">{t("process.colRequester")}</th>
                <th className="px-3 py-2">{t("process.colDept")}</th>
                <th className="px-3 py-2">{t("process.colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`${def.href}/${row.id}`} className="font-mono text-xs hover:underline">
                      {row.recordNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">
                    {row.service ? (
                      <Link href={`/katalog/${row.service.id}`} className="hover:underline">
                        {row.service.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{row.requester.fullName}</td>
                  <td className="px-3 py-2">{row.requestingDept?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      value={row.status}
                      label={def.statuses.find((item) => item.value === row.status)?.label ?? row.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t("process.emptyTitle")} description={t("process.emptyBody")} />
      )}
    </div>
  );
}
