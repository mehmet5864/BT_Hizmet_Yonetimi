import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Inbox, Plus, ShieldAlert, Ticket, Timer } from "lucide-react";

import { StatWidget } from "@/components/dashboard/stat-widget";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TICKET_STATUS_LABELS, TICKET_STATUSES, type TicketStatus } from "@/lib/itil/constants";
import { officeIcon, OFFICE_STYLE } from "@/components/itil/request-visual";
import {
  ALL_REQUEST_TYPES,
  REQUEST_OFFICES,
  getRequestType,
  slugifyRequestGroup,
} from "@/lib/itil/request-types";
import { officeLabel, type OfficeNames } from "@/lib/itil/office-names";
import { formatDate } from "@/lib/inventory/format";
import type { getRequestDashboard } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Dashboard = Awaited<ReturnType<typeof getRequestDashboard>>;

export function RequestDashboard({
  data,
  offices = "ALL",
  toolbar,
  officeNames,
}: {
  data: Dashboard;
  offices?: Array<(typeof REQUEST_OFFICES)[number]> | "ALL";
  toolbar?: ReactNode;
  officeNames?: OfficeNames;
}) {
  const completion = data.total ? Math.round((data.done / data.total) * 100) : 0;
  const visibleOffices = offices === "ALL" ? REQUEST_OFFICES : offices;
  const listHref = visibleOffices[0] ? `/talepler?ofis=${visibleOffices[0]}` : "/talepler";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 sm:p-8">
      <div className="hero-banner overflow-hidden rounded-xl p-6 sm:p-8">
        <PageHeader
          title="Talep panosu"
          description={
            visibleOffices.length === 1 && visibleOffices[0] === "SERVIS"
              ? "Arıza ve hizmet talepleri önce servis masasına düşer. Çözebildiklerinizi kapatın; aşanları Katman 2 uzman birime aktarın."
              : visibleOffices.length
                ? "Biriminize gelen uzman talepleri ve servis masasından aktarılan Katman 2 kayıtları. Diğer şubelerin kuyruğu görünmez."
                : "Kendi açtığınız talepler. Firewall, IP sabitleme gibi uzman talepleri yalnızca ilgili birimde görünür."
          }
          actions={
            <Button asChild>
              <Link href="/talepler/yeni">
                <Plus className="size-4" />
                Yeni talep
              </Link>
            </Button>
          }
        />
      </div>

      {toolbar}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget
          icon={<Ticket className="size-4" />}
          label="Toplam talep"
          value={data.total}
          hint={visibleOffices.length ? "Yetkili olduğunuz kuyruk ve kendi talepleriniz" : "Yalnızca kendi açtığınız talepler"}
          href={listHref}
          tone="info"
        />
        <StatWidget
          icon={<Inbox className="size-4" />}
          label="Aktif kuyruk"
          value={data.active}
          hint="Açık, işlemde ve beklemede"
          href={listHref}
          tone={data.active > 0 ? "warning" : "ok"}
          bar={data.total ? Math.round((data.active / data.total) * 100) : 0}
        />
        <StatWidget
          icon={<Timer className="size-4" />}
          label="Onay / beklemede"
          value={data.waiting}
          hint="Amir veya bilgi güvenliği onayı"
          href="/talepler"
          tone={data.waiting > 0 ? "warning" : "default"}
        />
        <StatWidget
          icon={<ShieldAlert className="size-4" />}
          label="Yüksek / kritik"
          value={data.critical}
          hint="Önem derecesi yüksek talepler"
          href={listHref}
          tone={data.critical > 0 ? "danger" : "ok"}
        />
        <StatWidget
          icon={<ArrowRight className="size-4" />}
          label="Yönlendirme / yükseltme"
          value={data.escalated}
          hint="Yanlış birim veya üst birim kuyruğu"
          href={listHref}
          tone={data.escalated > 0 ? "warning" : "default"}
        />
        <StatWidget
          icon={<CheckCircle2 className="size-4" />}
          label="Tamamlanan"
          value={data.done}
          hint={`Kapanış oranı %${completion}`}
          href="/talepler"
          tone="ok"
          bar={completion}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleOffices.map((office) => {
          const count = data.byOffice[office] ?? 0;
          const ratio = data.total ? Math.round((count / data.total) * 100) : 0;
          const style = OFFICE_STYLE[office];
          const OfficeIcon = officeIcon(office);
          return (
            <Link key={office} href={`/talepler?ofis=${office}`} className="group block">
              <Card className={cn("office-tile h-full border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-lg", style.border)}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex size-9 items-center justify-center rounded-lg", style.icon)}>
                        <OfficeIcon className="size-5" />
                      </span>
                      <p className="text-sm font-medium">{officeLabel(office, officeNames)}</p>
                    </div>
                    <span className="text-2xl font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${ratio}%` }} />
                  </div>
                  <p className="text-muted-foreground text-xs">Şube kuyruğunu aç</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget
          icon={<Inbox className="size-4" />}
          label="Açık"
          value={data.open}
          hint={TICKET_STATUS_LABELS.OPEN}
          href="/talepler"
          tone={data.open > 0 ? "info" : "default"}
        />
        <StatWidget
          icon={<Clock3 className="size-4" />}
          label="İşlemde"
          value={data.inProgress}
          hint={TICKET_STATUS_LABELS.IN_PROGRESS}
          href="/talepler"
          tone={data.inProgress > 0 ? "warning" : "default"}
        />
        <StatWidget
          icon={<CheckCircle2 className="size-4" />}
          label="Tamamlandı"
          value={data.done}
          hint={TICKET_STATUS_LABELS.DONE}
          href="/talepler"
          tone="ok"
        />
        <StatWidget
          icon={<ShieldAlert className="size-4" />}
          label="Reddedilen"
          value={data.rejected}
          hint={TICKET_STATUS_LABELS.REJECTED}
          href="/talepler"
          tone={data.rejected > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Son talepler</CardTitle>
              <CardDescription>Güncellenen son kayıtlar.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={listHref}>
                Liste <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recent.length ? (
              <ul className="divide-y">
                {data.recent.map((request) => {
                  const typeDef = getRequestType(request.requestType);
                  return (
                    <li key={request.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/talepler/${request.id}`} className="font-mono text-xs font-medium hover:underline">
                          {request.requestNo}
                        </Link>
                        <p className="truncate text-sm">{typeDef?.label ?? request.requestType}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {request.requester.fullName}
                          {request.requestingDept ? ` · ${request.requestingDept.name}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge
                          value={request.status}
                          label={TICKET_STATUS_LABELS[request.status as TicketStatus] ?? request.status}
                        />
                        <span className="text-muted-foreground text-xs">{formatDate(request.requestDate)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="Henüz talep yok"
                description="İlk servis talebini oluşturduğunuzda burada görünecek."
                action={
                  <Button asChild size="sm">
                    <Link href="/talepler/yeni">Talep aç</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Durum dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TICKET_STATUSES.map((status) => {
                const count = data.byStatus[status] ?? 0;
                const ratio = data.total ? Math.round((count / data.total) * 100) : 0;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{TICKET_STATUS_LABELS[status]}</span>
                      <span className="tabular-nums">{count}</span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div className="widget-bar h-full rounded-full" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sık açılan türler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ALL_REQUEST_TYPES
                .map((item) => ({ item, count: data.byType[item.key] ?? 0 }))
                .filter((row) => row.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
                .map(({ item, count }) => (
                  <Link
                    key={item.key}
                    href={
                      offices === "ALL" || offices.includes(item.office)
                        ? `/talepler?ofis=${item.office}&grup=${slugifyRequestGroup(item.group)}&tur=${item.key}`
                        : `/talepler/yeni?tur=${item.slug}`
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/40",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="tabular-nums font-medium">{count}</span>
                  </Link>
                ))}
              {!Object.values(data.byType).some((count) => count > 0) ? (
                <p className="text-muted-foreground text-sm">Tür kırılımı henüz oluşmadı.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
