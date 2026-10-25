import Link from "next/link";
import { CheckCircle2, KanbanSquare, ListTodo, Plus, Timer } from "lucide-react";

import { ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { PersonDot, PRIORITY_STRIPE, PriorityBadge, ProgressBar, TypeBadge } from "@/components/agile/agile-bits";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { EmptyState } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AGILE_METHOD_LABELS, AGILE_STATUS_LABELS } from "@/lib/agile/constants";
import { getSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/inventory/format";
import { getDataScope, getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function AgileHomePage() {
  const db = await getScopedDb();
  const user = await getSession();
  const [products, mine, activeSprints, openCount, doneWeek] = await Promise.all([
    db.agileProduct.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: {
        owner: { select: { fullName: true } },
        sprints: { where: { status: "ACTIVE" }, take: 1 },
        _count: { select: { items: true } },
      },
    }),
    user?.id
      ? db.agileItem.findMany({
          where: { assigneeId: user.id, status: { not: "DONE" } },
          orderBy: [{ updatedAt: "desc" }],
          take: 12,
          include: { product: { select: { key: true } } },
        })
      : Promise.resolve([]),
    db.agileSprint.count({ where: { status: "ACTIVE" } }),
    db.agileItem.count({ where: { status: { not: "DONE" } } }),
    db.agileItem.count({ where: { status: "DONE", completedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
  ]);
  // Düz kullanıcı, kendisine hiç görev düşmemişse ürün / ekip listesini görmez.
  const dataScope = await getDataScope();
  const cevikScope = dataScope?.modules?.cevik ?? dataScope;
  const plainUser = Boolean(cevikScope && !cevikScope.all && cevikScope.role === "USER");
  const showProducts = products.length > 0 || !plainUser;
  const itemCounts = await db.agileItem.groupBy({ by: ["productId", "status"], _count: { _all: true } });
  const openBy = new Map<string, number>();
  const doneBy = new Map<string, number>();
  for (const row of itemCounts) if (row.status === "DONE") doneBy.set(row.productId, row._count._all);
  for (const row of itemCounts) if (row.status !== "DONE") openBy.set(row.productId, (openBy.get(row.productId) ?? 0) + row._count._all);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Çevik çalışma"
        description="Ürün veya ekip bazında backlog, sprint ve Kanban panosu. Olay, problem ve değişiklik kayıtlarından doğrudan iş açılabilir."
        actions={
          <Button asChild>
            <Link href="/cevik/urun/yeni">
              <Plus className="size-4" />
              Ürün ekle
            </Link>
          </Button>
        }
      />
      <WidgetRow>
        <StatWidget icon={<KanbanSquare className="size-4" />} label="Aktif ürün / ekip" value={products.length} href="/cevik" tone="info" />
        <StatWidget icon={<Timer className="size-4" />} label="Aktif sprint" value={activeSprints} href="/cevik" tone={activeSprints > 0 ? "ok" : "default"} />
        <StatWidget icon={<ListTodo className="size-4" />} label="Açık iş" value={openCount} hint="Bitmemiş tüm işler" href="/cevik" tone={openCount > 0 ? "warning" : "ok"} />
        <StatWidget icon={<CheckCircle2 className="size-4" />} label="Son 7 günde biten" value={doneWeek} href="/cevik" tone="ok" />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        {showProducts ? (
        <div className="space-y-3 lg:col-span-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Ürünler / ekipler</h2>
          {products.length ? (
            products.map((product) => (
              <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                  <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold">{product.key.slice(0, 2)}</span>
                  <div className="min-w-0">
                    <Link href={`/cevik/urun/${product.id}`} className="font-medium hover:underline">
                      {product.name}
                    </Link>{" "}
                    <span className="text-muted-foreground font-mono text-xs">{product.key}</span>
                    <p className="text-muted-foreground text-xs">
                      {AGILE_METHOD_LABELS[product.method]}
                      {product.owner ? ` · Ürün sahibi: ${product.owner.fullName}` : ""}
                    </p>
                    {product.sprints[0] ? (
                      <p className="text-xs">
                        Aktif sprint:{" "}
                        <Link href={`/cevik/sprint/${product.sprints[0].id}`} className="font-medium hover:underline">
                          {product.sprints[0].name}
                        </Link>
                        {product.sprints[0].endDate ? ` (bitiş ${formatDate(product.sprints[0].endDate)})` : ""}
                      </p>
                    ) : null}
                  </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{`${openBy.get(product.id) ?? 0} açık iş`}</Badge>
                    <Badge variant="outline">{`${product._count.items} toplam`}</Badge>
                  </div>
                </div>
                {product._count.items ? (
                  <div className="space-y-1">
                    <ProgressBar value={((doneBy.get(product.id) ?? 0) / product._count.items) * 100} barClassName="bg-emerald-500" />
                    <p className="text-muted-foreground text-[11px] tabular-nums">
                      {doneBy.get(product.id) ?? 0}/{product._count.items} · %{Math.round(((doneBy.get(product.id) ?? 0) / product._count.items) * 100)}
                    </p>
                  </div>
                ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState title="Henüz ürün yok" description="İlk ürün veya ekibi ekleyerek backlog ve sprintleri başlatın." />
          )}
        </div>
        ) : null}
        <div className={showProducts ? "lg:col-span-2" : "lg:col-span-5"}>
          <RecentCard title="Bana atanan işler" description="Bitmemiş işleriniz.">
            {mine.length ? (
              <ul className="divide-y">
                {mine.map((item) => (
                  <li key={item.id} className="relative space-y-1 py-2.5 ps-3">
                    <span className={`absolute inset-y-2 start-0 w-1 rounded-full ${PRIORITY_STRIPE[item.priority] ?? "bg-muted"}`} aria-hidden />
                    <Link href={`/cevik/is/${item.id}`} className="text-sm font-medium hover:underline">
                      {item.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground font-mono text-xs">{item.itemNo}</span>
                      <TypeBadge value={item.type} />
                      <PriorityBadge value={item.priority} />
                      <span className="text-muted-foreground text-xs">{AGILE_STATUS_LABELS[item.status]}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Atanmış iş yok" description="Size atanan bitmemiş iş görünmüyor." />
            )}
          </RecentCard>
        </div>
      </div>
    </div>
  );
}
