import { ModuleHero } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { ReportCard } from "@/components/report-card";
import { EmptyState } from "@/components/ui-bits";
import { isRequesterOnly } from "@/lib/auth/rbac";
import { getAccessChecker, getViewer } from "@/lib/auth/viewer";
import { REPORTS, REPORT_GROUPS, canViewReport, reportWithOfficeNames } from "@/lib/reports/catalog";
import { prisma } from "@/lib/prisma";
import { param } from "@/lib/search-params";
import { getOfficeNames } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: PageProps<"/raporlar">) {
  const params = await searchParams;
  const query = param(params, "q")?.toLocaleLowerCase("tr") ?? "";
  const viewer = await getViewer();
  const accessOk = await getAccessChecker();
  const visible = REPORTS.filter((item) => {
    if (!canViewReport(accessOk, item.id)) return false;
    if (!query) return true;
    return `${item.title} ${item.description} ${item.group}`.toLocaleLowerCase("tr").includes(query);
  });
  const groups = REPORT_GROUPS.filter((group) => visible.some((item) => item.group === group));
  const [departments, vendors, officeNames] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getOfficeNames(),
  ]);
  const catalog = {
    departments: departments.map((item) => ({ value: item.id, label: item.name })),
    vendors: vendors.map((item) => ({ value: item.id, label: item.name })),
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Raporlar"
        description={
          isRequesterOnly(viewer?.role)
            ? "Yalnızca kendi ve biriminizdeki envanter ile kendi talepleriniz. Önizleyip indirin."
            : "Raporu önizleyin, gerekirse filtreleyin; PDF, Word veya CSV olarak indirin."
        }
      />

      <ListFilters searchPlaceholder="Rapor adı veya grup ara…" searchAriaLabel="Rapor ara" />

      {groups.length ? groups.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">{group}<span className="bg-muted rounded-full px-2 text-[10px] font-medium tabular-nums">{visible.filter((item) => item.group === group).length}</span></h2>
          <div className="flex flex-col gap-2">
            {visible.filter((item) => item.group === group).map((report) => (
              <ReportCard key={report.id} report={reportWithOfficeNames(report, officeNames)} catalog={catalog} />
            ))}
          </div>
        </section>
      )) : (
        <EmptyState title="Rapor bulunamadı" description="Arama terimini değiştirin veya filtreleri temizleyin." />
      )}
    </div>
  );
}
