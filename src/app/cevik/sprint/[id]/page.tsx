import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Play, Plus, Square } from "lucide-react";

import { BurndownChart } from "@/components/agile/burndown-chart";
import { KanbanBoard } from "@/components/agile/board";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { WidgetRow } from "@/components/dashboard/module-widgets";
import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { closeAgileSprint, deleteAgileSprint, setAgileItemSprint, startAgileSprint } from "@/lib/actions/agile";
import { AGILE_BOARD_COLUMNS, AGILE_MEETING_KIND_LABELS, AGILE_SPRINT_STATUS_LABELS } from "@/lib/agile/constants";
import { buildBurndown, sumPoints } from "@/lib/agile/metrics";
import { formatDate } from "@/lib/inventory/format";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function AgileSprintPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const sprint = await db.agileSprint.findUnique({
    where: { id },
    include: {
      product: true,
      items: { include: { assignee: { select: { fullName: true } } }, orderBy: { rank: "asc" } },
      meetings: { orderBy: { meetingDate: "desc" } },
    },
  });
  if (!sprint) notFound();
  const otherActive = sprint.status === "PLANNED"
    ? await db.agileSprint.findFirst({ where: { productId: sprint.productId, status: "ACTIVE" } })
    : null;
  const carryTargets = sprint.status === "ACTIVE"
    ? await db.agileSprint.findMany({ where: { productId: sprint.productId, status: { not: "CLOSED" }, id: { not: id } }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } })
    : [];
  const total = sumPoints(sprint.items);
  const done = sumPoints(sprint.items.filter((i) => i.status === "DONE"));
  const remaining = total - done;
  const burndown = buildBurndown(sprint, sprint.items);
  const unfinished = sprint.items.filter((i) => i.status !== "DONE").length;
  const overCapacity = sprint.capacity != null && total > sprint.capacity;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={sprint.name}
        description={`${sprint.product.name} · ${sprint.startDate ? formatDate(sprint.startDate) : "—"} → ${sprint.endDate ? formatDate(sprint.endDate) : "—"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={sprint.status === "ACTIVE" ? "default" : "outline"}>{AGILE_SPRINT_STATUS_LABELS[sprint.status]}</Badge>
            {sprint.status === "PLANNED" ? (
              <form action={startAgileSprint}>
                <input type="hidden" name="id" value={sprint.id} />
                <Button type="submit" disabled={Boolean(otherActive)} title={otherActive ? "Üründe zaten aktif bir sprint var." : undefined}>
                  <Play className="size-4" />
                  Sprinti başlat
                </Button>
              </form>
            ) : null}
            {sprint.status === "ACTIVE" ? (
              <form action={closeAgileSprint} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={sprint.id} />
                {unfinished ? (
                  <select name="carryTo" aria-label="Bitmeyen işler" className="bg-background h-9 rounded-md border px-2 text-sm">
                    <option value="">Bitmeyenler backlog&apos;a dönsün</option>
                    {carryTargets.map((t) => (
                      <option key={t.id} value={t.id}>Bitmeyenler → {t.name}</option>
                    ))}
                  </select>
                ) : null}
                <Button type="submit" variant="outline" title={unfinished ? `${unfinished} bitmemiş iş backlog'a döner.` : undefined}>
                  <Square className="size-4" />
                  Sprinti kapat
                </Button>
              </form>
            ) : null}
            {sprint.status !== "CLOSED" ? (
              <Button asChild variant="outline">
                <Link href={`/cevik/is/yeni?urun=${sprint.productId}&sprint=${sprint.id}`}>
                  <Plus className="size-4" />
                  Yeni iş
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/cevik/sprint/${sprint.id}/duzenle`}>
                <Pencil className="size-4" />
                Düzenle
              </Link>
            </Button>
            {sprint.status === "PLANNED" ? (
              <form action={deleteAgileSprint} className="flex items-center gap-2">
                <input type="hidden" name="id" value={sprint.id} />
                <label className="text-muted-foreground flex items-center gap-1 text-xs">
                  <input type="checkbox" required /> Silmeyi onaylıyorum
                </label>
                <Button type="submit" variant="outline" size="sm">Sprinti sil</Button>
              </form>
            ) : null}
            <Button asChild variant="ghost">
              <Link href={`/cevik/urun/${sprint.productId}`}>Ürüne dön</Link>
            </Button>
          </div>
        }
      />
      {sprint.status === "CLOSED" && sprint.plannedPoints != null ? (
        <p className="text-muted-foreground text-sm">
          Kapanış özeti: planlanan {sprint.plannedPoints} puan, tamamlanan {sprint.donePoints ?? 0} puan, devredilen/geri dönen {sprint.carriedCount ?? 0} iş.
        </p>
      ) : null}
      {sprint.goal ? (
        <p className="text-sm">
          <span className="font-medium">Hedef:</span> {sprint.goal}
        </p>
      ) : null}
      {otherActive && sprint.status === "PLANNED" ? (
        <p className="text-muted-foreground text-sm">Bu üründe aktif sprint var ({otherActive.name}). Yenisini başlatmak için önce onu kapatın.</p>
      ) : null}

      <WidgetRow>
        <StatWidget icon={<Plus className="size-4" />} label="Toplam puan" value={total} hint={sprint.capacity != null ? `Kapasite ${sprint.capacity}` : "Kapasite girilmedi"} href={`/cevik/sprint/${id}`} tone={overCapacity ? "warning" : "info"} />
        <StatWidget icon={<Plus className="size-4" />} label="Biten puan" value={done} href={`/cevik/sprint/${id}`} tone="ok" bar={total ? Math.round((done / total) * 100) : 0} />
        <StatWidget icon={<Plus className="size-4" />} label="Kalan puan" value={remaining} href={`/cevik/sprint/${id}`} tone={remaining > 0 && sprint.status === "CLOSED" ? "warning" : "default"} />
        <StatWidget icon={<Plus className="size-4" />} label="İş sayısı" value={sprint.items.length} hint={`${unfinished} bitmemiş`} href={`/cevik/sprint/${id}`} />
      </WidgetRow>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Pano</h2>
        <div className="overflow-x-auto pb-2">
          <KanbanBoard columns={AGILE_BOARD_COLUMNS} items={sprint.items} wipLimit={sprint.product.wipLimit} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Burndown</h2>
          <Card>
            <CardContent>
              <BurndownChart data={burndown} />
              <p className="text-muted-foreground text-xs">Kesikli çizgi ideal gidişat, dolu çizgi kalan puandır.</p>
            </CardContent>
          </Card>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Retrospektif</h2>
          <Card>
            <CardContent>
              {sprint.retro ? (
                <p className="text-sm whitespace-pre-line">{sprint.retro}</p>
              ) : (
                <p className="text-muted-foreground text-sm">Not yok. Düzenle sayfasından retrospektif notlarını ekleyebilirsiniz.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Toplantılar</h2>
          <div className="flex gap-3 text-sm">
            <Link href={`/cevik/toplanti/yeni?urun=${sprint.productId}&sprint=${sprint.id}&tur=PLANNING`} className="hover:underline">+ Planlama</Link>
            <Link href={`/cevik/toplanti/yeni?urun=${sprint.productId}&sprint=${sprint.id}&tur=DAILY`} className="hover:underline">+ Günlük</Link>
            <Link href={`/cevik/toplanti/yeni?urun=${sprint.productId}&sprint=${sprint.id}&tur=REVIEW`} className="hover:underline">+ Değerlendirme</Link>
            <Link href={`/cevik/toplanti/yeni?urun=${sprint.productId}&sprint=${sprint.id}&tur=RETRO`} className="hover:underline">+ Retrospektif</Link>
          </div>
        </div>
        {sprint.meetings.length ? (
          <ul className="divide-y rounded-lg border">
            {sprint.meetings.map((m) => (
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
          <p className="text-muted-foreground text-sm">Bu sprint için toplantı kaydı yok.</p>
        )}
      </section>

      {sprint.status !== "CLOSED" && sprint.items.length ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">İşleri sprintten çıkar</h2>
          <div className="flex flex-wrap gap-2">
            {sprint.items.filter((i) => i.status !== "DONE").map((item) => (
              <form key={item.id} action={setAgileItemSprint} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="sprintId" value="" />
                <span className="font-mono">{item.itemNo}</span>
                <button type="submit" className="text-muted-foreground hover:text-destructive" title="Backlog'a geri al">
                  ✕
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
