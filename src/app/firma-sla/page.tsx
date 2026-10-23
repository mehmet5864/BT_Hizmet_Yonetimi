import Link from "next/link";
import { Building2, Plus, ShieldAlert, Ticket } from "lucide-react";

import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { CONTRACT_SLA_DEFAULTS, TICKET_STATUS_LABELS, TICKET_STATUSES, type TicketStatus } from "@/lib/itil/constants";
import { formatDateTime } from "@/lib/inventory/format";
import { isSlaOverdue, slaRemainingLabel } from "@/lib/itil/vendor-sla";
import { getSlaDashboard } from "@/lib/module-stats";
import { prisma } from "@/lib/prisma";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function FirmaSlaPage({ searchParams }: PageProps<"/firma-sla">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const query = param(params, "q");
  const status = param(params, "durum");
  const slaLevel = param(params, "seviye");
  const [vendors, tickets, dash] = await Promise.all([
    prisma.vendor.findMany({
      where: searchOr(query, ["name", "contact1Phone", "phone"]) as never,
      orderBy: { name: "asc" },
      include: { _count: { select: { slaTickets: true } } },
    }),
    db.slaTicket.findMany({
      where: mergeWhere(
        status ? { status } : {},
        slaLevel ? { slaLevel: Number(slaLevel) } : {},
        searchOr(query, ["ticketNo", "title", "application", "description", "requester.fullName", "vendor.name", "product.name"]),
      ) as never,
            include: { owner: true, vendor: true, product: true, requester: true, requestingManager: true },
      orderBy: { openedAt: "desc" },
      take: 300,
    }),
    getSlaDashboard(db),
  ]);
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-8">
      <ModuleHero
        title="Firma, sözleşme ve SLA"
        description="Firma sorumluları, şartname, ürünler ve 3 seviye SLA. Arıza kaydı bildirimi süreyi başlatır."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/firma-sla/firma/yeni">
                <Plus className="size-4" />
                Firma
              </Link>
            </Button>
            <Button asChild>
              <Link href="/firma-sla/sla/yeni">
                <Plus className="size-4" />
                Arıza bildirimi
              </Link>
            </Button>
          </div>
        }
      />

      <WidgetRow>
        <StatWidget icon={<Building2 className="size-4" />} label="Firma" value={dash.vendors} href="/firma-sla" tone="info" />
        <StatWidget icon={<Ticket className="size-4" />} label="SLA kaydı" value={dash.tickets} href="/firma-sla" />
        <StatWidget icon={<Ticket className="size-4" />} label="Açık arıza" value={dash.open} href="/firma-sla?durum=OPEN" tone={dash.open > 0 ? "warning" : "ok"} />
        <StatWidget icon={<ShieldAlert className="size-4" />} label="Yüksek / kritik" value={dash.high} href="/firma-sla" tone={dash.high > 0 ? "danger" : "ok"} />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Son SLA / arıza">
            {dash.recent.length ? (
              <ul className="divide-y">
                {dash.recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/firma-sla/sla/${row.id}`} className="font-mono text-xs font-medium hover:underline">{row.ticketNo}</Link>
                      <p className="truncate text-sm">{row.title}</p>
                    </div>
                    <StatusBadge value={row.status} label={TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="SLA kaydı yok" description="Arıza kaydı oluşturun." />
            )}
          </RecentCard>
        </div>
        <DistributionCard
          title="Durum"
          items={TICKET_STATUSES.map((status) => ({
            label: TICKET_STATUS_LABELS[status],
            value: dash.byStatus[status] ?? 0,
          })).filter((item) => item.value > 0)}
        />
      </div>

      <ListFilters
        searchPlaceholder="Firma, SLA no, tanım veya talep eden ara…"
        searchAriaLabel="Firma ve SLA ara"
        selects={[
          {
            key: "durum",
            label: "SLA durumu",
            allLabel: "Tüm durumlar",
            options: TICKET_STATUSES.map((item) => ({ value: item, label: TICKET_STATUS_LABELS[item] })),
          },
          {
            key: "seviye",
            label: "SLA seviyesi",
            allLabel: "Tüm seviyeler",
            className: "w-48",
            options: [1, 2, 3].map((level) => ({
              value: String(level),
              label: CONTRACT_SLA_DEFAULTS[level as 1 | 2 | 3].name,
            })),
          },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Firmalar</h2>
        {vendors.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {vendors.map((vendor) => (
              <Link key={vendor.id} href={`/firma-sla/firma/${vendor.id}`} className="hover:border-primary/40 rounded-lg border p-4">
                <p className="font-medium">{vendor.name}</p>
                <p className="text-muted-foreground text-xs">{vendor.contact1Phone ?? vendor.phone ?? "İrtibat yok"} · {vendor._count.slaTickets} SLA</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Firma yok" description="İlk bakım firmasını ekleyin." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">SLA / arıza kayıtları</h2>
        <p className="text-muted-foreground text-sm">{tickets.length} kayıt listeleniyor</p>
        {tickets.length ? (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">No</th>
                  <th className="px-3 py-2">Tanım</th>
                  <th className="px-3 py-2">Talep eden</th>
                  <th className="px-3 py-2">Birim amiri</th>
                  <th className="px-3 py-2">Firma / ürün</th>
                  <th className="px-3 py-2">SLA</th>
                  <th className="px-3 py-2">Süre</th>
                  <th className="px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <Link href={`/firma-sla/sla/${row.id}`} className="font-mono text-xs hover:underline">{row.ticketNo}</Link>
                    </td>
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2">{row.requester?.fullName ?? "—"}</td>
                    <td className="px-3 py-2">{row.requestingManager?.fullName ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.vendor?.name ?? "—"}
                      {row.product ? <p className="text-muted-foreground text-xs">{row.product.name}</p> : null}
                    </td>
                    <td className="px-3 py-2">{row.slaLevel ? `Seviye ${row.slaLevel}` : "—"}</td>
                    <td className="px-3 py-2">
                      <p className="text-xs">{formatDateTime(row.slaStartedAt ?? row.openedAt)}</p>
                      <p className={isSlaOverdue(row.slaDueAt, row.status, now) ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                        {row.status === "DONE" ? "Kapandı" : slaRemainingLabel(row.slaDueAt, now)}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={row.status} label={TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="SLA kaydı yok" description="Arıza kaydı oluşturun." />
        )}
      </section>
    </div>
  );
}
