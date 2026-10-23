import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plus, ShieldCheck } from "lucide-react";

import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { SlaBadge } from "@/components/itil/sla-badge";
import { StatusBadge } from "@/components/itil/status-badge";
import { PRIORITY_LABELS, type Priority } from "@/lib/itil/sla";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  ESCALATION_STATUS_LABELS,
  INCIDENT_LAYER_LABELS,
  INCIDENT_LAYERS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUSES,
  REQUEST_SEVERITIES,
  REQUEST_SEVERITY_LABELS,
  type EscalationStatus,
  type IncidentLayer,
  type RequestSeverity,
} from "@/lib/itil/constants";
import { formatDate } from "@/lib/inventory/format";
import { getIncidentDashboard } from "@/lib/module-stats";
import { prisma } from "@/lib/prisma";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function IncidentListPage({ searchParams }: PageProps<"/olay">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const departmentId = param(params, "birim");
  const severity = param(params, "onem");
  const layer = param(params, "katman");
  const slaFilter = param(params, "sla");
  const nowDate = new Date();
  const openStatuses = ["OPEN", "INVESTIGATING", "CONTAINED"];
  const [breached, rows, departments, dash] = await Promise.all([
    db.incident.count({ where: { status: { in: openStatuses }, resolveDueAt: { lt: nowDate } } }),
    db.incident.findMany({
      where: mergeWhere(
        status ? { status } : {},
        departmentId ? { departmentId } : {},
        severity ? { severity } : {},
        layer ? { layer } : {},
        slaFilter === "ihlal" ? { status: { in: openStatuses }, resolveDueAt: { lt: nowDate } } : {},
        searchOr(query, ["incidentNo", "title", "description", "ioc", "requester.fullName", "l1Analyst.fullName", "department.name"]),
      ) as never,
      include: { department: true, requester: true, requestingManager: true, l1Analyst: true, l2Analyst: true },
      orderBy: { startedAt: "desc" },
      take: 300,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getIncidentDashboard(db),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Olay yönetimi"
        description="Güvenlik ve operasyon olayları: Seviye 1 atama, önem derecesi ve Seviye 2 eskalasyonu."
        actions={
          <Button asChild>
            <Link href="/olay/yeni">
              <Plus className="size-4" />
              Olay ekle
            </Link>
          </Button>
        }
      />

      <WidgetRow>
        <StatWidget icon={<AlertTriangle className="size-4" />} label="Toplam olay" value={dash.total} href="/olay" tone="info" />
        <StatWidget icon={<AlertTriangle className="size-4" />} label="Açık / inceleniyor" value={dash.open} href="/olay?durum=OPEN" tone={dash.open > 0 ? "danger" : "ok"} />
        <StatWidget icon={<ShieldCheck className="size-4" />} label="Kontrol altında" value={dash.contained} href="/olay" tone={dash.contained > 0 ? "warning" : "default"} />
        <StatWidget icon={<CheckCircle2 className="size-4" />} label="Çözülen" value={dash.resolved} href="/olay" tone="ok" bar={dash.total ? Math.round((dash.resolved / dash.total) * 100) : 0} />
        <StatWidget
          icon={<AlertTriangle className="size-4" />}
          label="SLA ihlali"
          value={breached}
          href="/olay?sla=ihlal"
          tone={breached > 0 ? "danger" : "ok"}
          hint="Çözüm süresi geçen açık olaylar"
        />
        <StatWidget
          icon={<ShieldCheck className="size-4" />}
          label="Seviye 2"
          value={dash.layer2}
          href="/olay?katman=L2"
          tone={dash.pendingEscalate > 0 ? "warning" : dash.layer2 > 0 ? "info" : "default"}
          hint={dash.pendingEscalate ? `${dash.pendingEscalate} yükseltme bekliyor` : "Aktarılan olaylar"}
        />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Son olaylar">
            {dash.recent.length ? (
              <ul className="divide-y">
                {dash.recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/olay/${row.id}`} className="font-mono text-xs font-medium hover:underline">{row.incidentNo}</Link>
                      <p className="truncate text-sm">{row.title}</p>
                    </div>
                    <StatusBadge value={row.status} label={INCIDENT_STATUS_LABELS[row.status as keyof typeof INCIDENT_STATUS_LABELS] ?? row.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Olay kaydı yok" description="İlk olayı kaydedin." />
            )}
          </RecentCard>
        </div>
        <DistributionCard
          title="Durum"
          items={INCIDENT_STATUSES.map((status) => ({
            label: INCIDENT_STATUS_LABELS[status],
            value: dash.byStatus[status] ?? 0,
          }))}
        />
      </div>

      <ListFilters
        searchPlaceholder="Olay no, tanım, IOC veya birim ara…"
        searchAriaLabel="Olay ara"
        selects={[
          {
            key: "durum",
            label: "Durum",
            allLabel: "Tüm durumlar",
            options: INCIDENT_STATUSES.map((item) => ({ value: item, label: INCIDENT_STATUS_LABELS[item] })),
          },
          {
            key: "birim",
            label: "Birim",
            allLabel: "Tüm birimler",
            className: "w-52",
            options: departments.map((item) => ({ value: item.id, label: item.name })),
          },
          {
            key: "onem",
            label: "Önem",
            allLabel: "Tüm seviyeler",
            options: REQUEST_SEVERITIES.map((item) => ({ value: item, label: REQUEST_SEVERITY_LABELS[item] })),
          },
          {
            key: "katman",
            label: "Seviye",
            allLabel: "Tüm analist seviyeleri",
            options: INCIDENT_LAYERS.map((item) => ({ value: item, label: INCIDENT_LAYER_LABELS[item] })),
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
                <th className="px-3 py-2">Seviye 1</th>
                <th className="px-3 py-2">Önem / öncelik</th>
                <th className="px-3 py-2">SLA</th>
                <th className="px-3 py-2">Seviye</th>
                <th className="px-3 py-2">Birim</th>
                <th className="px-3 py-2">Başlangıç</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/olay/${row.id}`} className="font-mono text-xs hover:underline">{row.incidentNo}</Link>
                  </td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.l1Analyst?.fullName ?? row.requester?.fullName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <StatusBadge value={row.severity} label={REQUEST_SEVERITY_LABELS[row.severity as RequestSeverity] ?? row.severity} />
                      <span className="text-muted-foreground text-xs">
                        {PRIORITY_LABELS[row.priority as Priority] ?? row.priority}
                        {row.isMajor ? " · BÜYÜK OLAY" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <SlaBadge start={row.startedAt} due={row.resolveDueAt} doneAt={row.resolvedAt} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <StatusBadge value={row.layer} label={INCIDENT_LAYER_LABELS[row.layer as IncidentLayer] ?? row.layer} />
                      {row.escalationStatus !== "NONE" ? (
                        <span className="text-muted-foreground text-xs">
                          {ESCALATION_STATUS_LABELS[row.escalationStatus as EscalationStatus] ?? row.escalationStatus}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.department?.name ?? "—"}</td>
                  <td className="px-3 py-2">{formatDate(row.startedAt)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={row.status} label={INCIDENT_STATUS_LABELS[row.status as keyof typeof INCIDENT_STATUS_LABELS] ?? row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya ilk olayı kaydedin." />
      )}
    </div>
  );
}
