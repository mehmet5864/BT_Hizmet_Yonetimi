import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { PriorityBadge, TypeBadge } from "@/components/agile/agile-bits";
import { KanbanBoard } from "@/components/agile/board";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { WidgetRow } from "@/components/dashboard/module-widgets";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteAgileProduct, setAgileItemSprint } from "@/lib/actions/agile";
import {
  AGILE_BOARD_COLUMNS,
  AGILE_MEETING_KIND_LABELS,
  AGILE_METHOD_LABELS,
  AGILE_SPRINT_STATUS_LABELS,
} from "@/lib/agile/constants";
import { sumPoints } from "@/lib/agile/metrics";
import { formatDate } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default async function AgileProductPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const product = await db.agileProduct.findUnique({
    where: { id },
    include: {
      owner: { select: { fullName: true } },
      service: { select: { name: true, serviceNo: true } },
      sprints: { orderBy: { createdAt: "desc" }, include: { items: { select: { points: true, status: true } } } },
      items: { include: { assignee: { select: { fullName: true } } }, orderBy: [{ rank: "asc" }] },
      meetings: { orderBy: { meetingDate: "desc" }, take: 6 },
    },
  });
  if (!product) notFound();

  const kanban = product.method === "KANBAN";
  const active = product.sprints.find((s) => s.status === "ACTIVE");
  const backlog = product.items
    .filter((i) => i.status === "BACKLOG" && !i.sprintId)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || a.rank - b.rank);
  const boardItems = kanban
    ? product.items.filter((i) => i.status !== "DONE" || (i.completedAt && i.completedAt.getTime() > Date.now() - 30 * 86_400_000))
    : product.items.filter((i) => i.sprintId === active?.id);
  const boardCols = kanban ? (["BACKLOG", ...AGILE_BOARD_COLUMNS] as const) : AGILE_BOARD_COLUMNS;
  const openSprints = product.sprints.filter((s) => s.status !== "CLOSED");
  const closed = product.sprints.filter((s) => s.status === "CLOSED").slice(0, 8).reverse();
  const velocities = closed.map((s) => ({ name: s.name, done: sumPoints(s.items.filter((i) => i.status === "DONE")) }));
  const avgVelocity = velocities.length ? Math.round(velocities.reduce((s, v) => s + v.done, 0) / velocities.length) : 0;
  const maxV = Math.max(1, ...velocities.map((v) => v.done));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={`${product.name} (${product.key})`}
        description={`${AGILE_METHOD_LABELS[product.method]}${product.owner ? ` · Ürün sahibi: ${product.owner.fullName}` : ""}${product.service ? ` · Hizmet: ${product.service.serviceNo} ${product.service.name}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/cevik/is/yeni?urun=${product.id}`}>
                <Plus className="size-4" />
                Yeni iş
              </Link>
            </Button>
            {!kanban ? (
              <Button asChild variant="outline">
                <Link href={`/cevik/sprint/yeni?urun=${product.id}`}>
                  <Plus className="size-4" />
                  Yeni sprint
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/cevik/urun/${product.id}/yol-haritasi`}>Yol haritası</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/cevik/urun/${product.id}/duzenle`}>
                <Pencil className="size-4" />
                Düzenle
              </Link>
            </Button>
            <form action={deleteAgileProduct} className="flex items-center gap-2">
              <input type="hidden" name="id" value={product.id} />
              <label className="text-muted-foreground flex items-center gap-1 text-xs" title={product.items.length ? "İçinde iş olan ürünü yalnızca yönetici siler; diğerleri arşivler." : undefined}>
                <input type="checkbox" required /> Silmeyi onaylıyorum
              </label>
              <Button type="submit" variant="outline" size="sm">Ürünü sil</Button>
            </form>
          </div>
        }
      />
      {product.description ? <p className="text-muted-foreground text-sm whitespace-pre-line">{product.description}</p> : null}

      <WidgetRow>
        <StatWidget icon={<Plus className="size-4" />} label="Backlog" value={backlog.length} hint={`${sumPoints(backlog)} puan`} href={`/cevik/urun/${id}`} tone="info" />
        <StatWidget icon={<Plus className="size-4" />} label="Açık iş" value={product.items.filter((i) => i.status !== "DONE").length} href={`/cevik/urun/${id}`} />
        <StatWidget icon={<Plus className="size-4" />} label={kanban ? "Biten (30 gün)" : "Aktif sprint"} value={kanban ? boardItems.filter((i) => i.status === "DONE").length : (active?.name ?? "Yok")} href={active ? `/cevik/sprint/${active.id}` : `/cevik/urun/${id}`} tone={active || kanban ? "ok" : "warning"} />
        {!kanban ? <StatWidget icon={<Plus className="size-4" />} label="Ortalama velocity" value={avgVelocity} hint="Kapanan sprintlerde biten puan" href={`/cevik/urun/${id}`} /> : null}
      </WidgetRow>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {kanban ? "Kanban panosu" : active ? `Pano — ${active.name}` : "Pano"}
          </h2>
          {active ? (
            <Link href={`/cevik/sprint/${active.id}`} className="text-sm hover:underline">
              Sprint ayrıntısı ve burndown →
            </Link>
          ) : null}
        </div>
        {kanban || active ? (
          <div className="overflow-x-auto pb-2">
            <KanbanBoard columns={boardCols} items={boardItems} wipLimit={product.wipLimit} />
          </div>
        ) : (
          <EmptyState title="Aktif sprint yok" description="Bir sprint oluşturup backlog'dan iş ekleyin, sonra sprint sayfasından başlatın." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Backlog</h2>
        {backlog.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">No</th>
                  <th className="px-3 py-2 font-medium">Başlık</th>
                  <th className="px-3 py-2 font-medium">Tür</th>
                  <th className="px-3 py-2 font-medium">Öncelik</th>
                  <th className="px-3 py-2 font-medium">Puan</th>
                  <th className="px-3 py-2 font-medium">Sorumlu</th>
                  {!kanban ? <th className="px-3 py-2 font-medium">Sprinte ekle</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {backlog.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs">{item.itemNo}</td>
                    <td className="px-3 py-2">
                      <Link href={`/cevik/is/${item.id}`} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                      {item.sourceNo ? <p className="text-muted-foreground text-xs">Kaynak: {item.sourceNo}</p> : null}
                    </td>
                    <td className="px-3 py-2"><TypeBadge value={item.type} /></td>
                    <td className="px-3 py-2"><PriorityBadge value={item.priority} /></td>
                    <td className="px-3 py-2 tabular-nums">{item.points ?? "—"}</td>
                    <td className="px-3 py-2">{item.assignee?.fullName ?? "—"}</td>
                    {!kanban ? (
                      <td className="px-3 py-2">
                        {openSprints.length ? (
                          <form action={setAgileItemSprint} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={item.id} />
                            <select name="sprintId" aria-label="Sprint" className="bg-background h-8 rounded-md border px-2 text-xs">
                              {openSprints.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" size="sm" variant="outline" className="h-8">
                              Ekle
                            </Button>
                          </form>
                        ) : (
                          <span className="text-muted-foreground text-xs">Önce sprint oluşturun</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Backlog boş" description="Yeni iş ekleyin veya Olay / Problem / Değişiklik kaydından iş açın." />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Toplantı kayıtları</h2>
          <Link href={`/cevik/toplanti/yeni?urun=${product.id}`} className="text-sm hover:underline">
            + Yeni kayıt
          </Link>
        </div>
        {product.meetings.length ? (
          <ul className="divide-y rounded-lg border">
            {product.meetings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <Link href={`/cevik/toplanti/${m.id}`} className="font-medium hover:underline">
                  {m.title}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {AGILE_MEETING_KIND_LABELS[m.kind] ?? m.kind} · {formatDate(m.meetingDate)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Henüz toplantı kaydı yok.</p>
        )}
      </section>

      {!kanban ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Sprintler</h2>
            {product.sprints.length ? (
              product.sprints.map((s) => {
                const total = sumPoints(s.items);
                const done = sumPoints(s.items.filter((i) => i.status === "DONE"));
                return (
                  <Card key={s.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link href={`/cevik/sprint/${s.id}`} className="font-medium hover:underline">
                          {s.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {s.startDate ? formatDate(s.startDate) : "—"} → {s.endDate ? formatDate(s.endDate) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums">
                          {done}/{total} puan
                        </span>
                        <Badge variant={s.status === "ACTIVE" ? "default" : "outline"}>{AGILE_SPRINT_STATUS_LABELS[s.status]}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <EmptyState title="Sprint yok" description="İlk sprinti oluşturun." />
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Velocity</h2>
            {velocities.length ? (
              <Card>
                <CardContent className="space-y-2">
                  {velocities.map((v) => (
                    <div key={v.name} className="flex items-center gap-2 text-xs">
                      <span className="w-24 truncate">{v.name}</span>
                      <div className="bg-muted h-4 flex-1 rounded">
                        <div className="bg-primary h-4 rounded" style={{ width: `${(v.done / maxV) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums">{v.done}</span>
                    </div>
                  ))}
                  <p className="text-muted-foreground pt-1 text-xs">Ortalama: {avgVelocity} puan / sprint</p>
                </CardContent>
              </Card>
            ) : (
              <EmptyState title="Veri yok" description="Sprint kapatıldıkça velocity burada görünür." />
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
