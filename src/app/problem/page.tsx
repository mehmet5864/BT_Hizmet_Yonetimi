import Link from "next/link";
import { Bug, Link2, Plus } from "lucide-react";

import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  PROBLEM_ASSIGNMENT_LABELS,
  PROBLEM_ASSIGNMENT_STATUSES,
  PROBLEM_STATUS_LABELS,
  PROBLEM_STATUSES,
  type ProblemAssignmentStatus,
} from "@/lib/itil/constants";
import { getProblemDashboard } from "@/lib/module-stats";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function ProblemListPage({ searchParams }: PageProps<"/problem">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const assignment = param(params, "atama");
  const [rows, dash] = await Promise.all([
    db.problem.findMany({
      where: mergeWhere(
        status ? { status } : {},
        assignment ? { assignmentStatus: assignment } : {},
        searchOr(query, [
          "problemNo",
          "title",
          "description",
          "rootCause",
          "requester.fullName",
          "incident.incidentNo",
          "proposedAssignee.fullName",
          "assignee.fullName",
        ]),
      ) as never,
      include: { incident: true, requester: true, requestingManager: true, proposedAssignee: true, assignee: true },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    getProblemDashboard(db),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Problem yönetimi"
        description="Tekrarlayan olayların kök nedeni. Atanan personeli bilgi güvenliği yöneticisi onaylar; onaydan sonra görev başlar."
        actions={
          <Button asChild>
            <Link href="/problem/yeni">
              <Plus className="size-4" />
              Problem ekle
            </Link>
          </Button>
        }
      />

      <WidgetRow>
        <StatWidget icon={<Bug className="size-4" />} label="Toplam problem" value={dash.total} href="/problem" tone="info" />
        <StatWidget icon={<Bug className="size-4" />} label="Açık / inceleniyor" value={dash.open} href="/problem?durum=OPEN" tone={dash.open > 0 ? "warning" : "ok"} />
        <StatWidget icon={<Bug className="size-4" />} label="Bilinen hata" value={dash.knownError} href="/problem" tone={dash.knownError > 0 ? "warning" : "default"} />
        <StatWidget icon={<Link2 className="size-4" />} label="Atama onayı" value={dash.pendingAssignment} hint="BG yöneticisi bekliyor" href="/problem?atama=PENDING" tone={dash.pendingAssignment > 0 ? "warning" : "ok"} />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Son problemler">
            {dash.recent.length ? (
              <ul className="divide-y">
                {dash.recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/problem/${row.id}`} className="font-mono text-xs font-medium hover:underline">{row.problemNo}</Link>
                      <p className="truncate text-sm">{row.title}</p>
                    </div>
                    <StatusBadge value={row.status} label={PROBLEM_STATUS_LABELS[row.status as keyof typeof PROBLEM_STATUS_LABELS] ?? row.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Problem kaydı yok" description="Olaydan türetilen ilk problemi ekleyin." />
            )}
          </RecentCard>
        </div>
        <DistributionCard
          title="Durum"
          items={PROBLEM_STATUSES.map((status) => ({
            label: PROBLEM_STATUS_LABELS[status],
            value: dash.byStatus[status] ?? 0,
          }))}
        />
      </div>

      <ListFilters
        searchPlaceholder="Problem no, tanım, kök neden veya olay no ara…"
        searchAriaLabel="Problem ara"
        selects={[
          {
            key: "durum",
            label: "Durum",
            allLabel: "Tüm durumlar",
            options: PROBLEM_STATUSES.map((item) => ({ value: item, label: PROBLEM_STATUS_LABELS[item] })),
          },
          {
            key: "atama",
            label: "Atama",
            allLabel: "Tüm atamalar",
            className: "w-48",
            options: PROBLEM_ASSIGNMENT_STATUSES.map((item) => ({
              value: item,
              label: PROBLEM_ASSIGNMENT_LABELS[item],
            })),
          },
        ]}
      />
      <p className="text-muted-foreground text-sm">{rows.length} kayıt listeleniyor</p>

      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">Tanım</th>
                <th className="px-3 py-2">Talep eden</th>
                <th className="px-3 py-2">Birim amiri</th>
                <th className="px-3 py-2">Görevli</th>
                <th className="px-3 py-2">Atama</th>
                <th className="px-3 py-2">İlgili olay</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/problem/${row.id}`} className="font-mono text-xs hover:underline">{row.problemNo}</Link>
                  </td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.requester?.fullName ?? "—"}</td>
                  <td className="px-3 py-2">{row.requestingManager?.fullName ?? "—"}</td>
                  <td className="px-3 py-2">{row.assignee?.fullName ?? row.proposedAssignee?.fullName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      value={row.assignmentStatus}
                      label={PROBLEM_ASSIGNMENT_LABELS[row.assignmentStatus as ProblemAssignmentStatus] ?? row.assignmentStatus}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {row.incident ? <Link href={`/olay/${row.incident.id}`} className="hover:underline">{row.incident.incidentNo}</Link> : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge value={row.status} label={PROBLEM_STATUS_LABELS[row.status as keyof typeof PROBLEM_STATUS_LABELS] ?? row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya olaydan türetilen ilk problemi ekleyin." />
      )}
    </div>
  );
}
