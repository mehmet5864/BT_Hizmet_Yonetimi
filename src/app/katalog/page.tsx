import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { CATALOG_AUDIENCE_LABELS, CATALOG_STATUS_LABELS, CATALOG_STATUSES } from "@/lib/itil/processes";
import { getTranslator } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { mergeWhere, param, searchOr } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function CatalogListPage({ searchParams }: PageProps<"/katalog">) {
  const { t } = await getTranslator();
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const rows = await prisma.catalogService.findMany({
    where: mergeWhere(
      status ? { status } : {},
      searchOr(query, ["serviceNo", "name", "summary", "accessConditions", "owner.fullName"]),
    ) as never,
    include: { owner: true, department: true, requester: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    take: 300,
  });
  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const userFacing = rows.filter((row) => row.audience !== "INTERNAL" && row.status === "ACTIVE").length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title={t("catalog.title")}
        description={t("catalog.description")}
        actions={
          <Button asChild>
            <Link href="/katalog/yeni">
              <Plus className="size-4" />
              {t("catalog.add")}
            </Link>
          </Button>
        }
      />
      <WidgetRow>
        <StatWidget icon={<BookOpen className="size-4" />} label={t("catalog.count")} value={rows.length} href="/katalog" tone="info" />
        <StatWidget icon={<BookOpen className="size-4" />} label={t("catalog.active")} value={active} href="/katalog?durum=ACTIVE" tone="ok" />
        <StatWidget icon={<BookOpen className="size-4" />} label={t("catalog.userFacing")} value={userFacing} href="/katalog" />
      </WidgetRow>
      <ListFilters
        searchPlaceholder={t("catalog.search")}
        searchAriaLabel={t("catalog.searchAria")}
        selects={[
          {
            key: "durum",
            label: t("common.status"),
            allLabel: t("catalog.allStatuses"),
            options: CATALOG_STATUSES.map((item) => ({ value: item, label: CATALOG_STATUS_LABELS[item] })),
          },
        ]}
      />
      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-start">
              <tr>
                <th className="px-3 py-2">{t("catalog.colNo")}</th>
                <th className="px-3 py-2">{t("catalog.colService")}</th>
                <th className="px-3 py-2">{t("catalog.colOwner")}</th>
                <th className="px-3 py-2">{t("catalog.colHours")}</th>
                <th className="px-3 py-2">{t("catalog.colAudience")}</th>
                <th className="px-3 py-2">{t("catalog.colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/katalog/${row.id}`} className="font-mono text-xs hover:underline">
                      {row.serviceNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground text-xs">{row.summary ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2">
                    {row.owner?.fullName ?? "—"}
                    <span className="text-muted-foreground block text-xs">{row.department?.name ?? ""}</span>
                  </td>
                  <td className="px-3 py-2">
                    {row.hours ?? "—"}
                    <span className="text-muted-foreground block text-xs">
                      {row.availabilityTarget ? `%${row.availabilityTarget}` : t("catalog.noSla")}
                    </span>
                  </td>
                  <td className="px-3 py-2">{CATALOG_AUDIENCE_LABELS[row.audience as keyof typeof CATALOG_AUDIENCE_LABELS] ?? row.audience}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      value={row.status}
                      label={CATALOG_STATUS_LABELS[row.status as keyof typeof CATALOG_STATUS_LABELS] ?? row.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t("catalog.emptyTitle")} description={t("catalog.emptyBody")} />
      )}
    </div>
  );
}
