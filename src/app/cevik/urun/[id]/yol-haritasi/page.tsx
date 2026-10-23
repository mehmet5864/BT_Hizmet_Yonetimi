import Link from "next/link";
import { notFound } from "next/navigation";

import { PriorityBadge } from "@/components/agile/agile-bits";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AGILE_STATUS_LABELS } from "@/lib/agile/constants";
import { sumPoints } from "@/lib/agile/metrics";
import { prisma } from "@/lib/prisma";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const product = await prisma.agileProduct.findUnique({
    where: { id },
    include: {
      items: { where: { type: "EPIC" }, orderBy: { rank: "asc" }, include: { children: { select: { id: true, itemNo: true, title: true, status: true, points: true }, orderBy: { rank: "asc" } } } },
    },
  });
  if (!product) notFound();
  const orphans = await db.agileItem.count({ where: { productId: id, type: { not: "EPIC" }, epicId: null, status: { not: "DONE" } } });
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={`Yol haritası — ${product.name}`}
        description="Epikler ve altındaki işlerin ilerlemesi (puan bazında)."
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/cevik/is/yeni?urun=${product.id}&tur=EPIC`}>Yeni epik</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/cevik/urun/${product.id}`}>Ürüne dön</Link>
            </Button>
          </div>
        }
      />
      {product.items.length ? (
        product.items.map((epic) => {
          const total = sumPoints(epic.children);
          const done = sumPoints(epic.children.filter((c) => c.status === "DONE"));
          const pct = total ? Math.round((done / total) * 100) : epic.status === "DONE" ? 100 : 0;
          return (
            <Card key={epic.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/cevik/is/${epic.id}`} className="font-medium hover:underline">
                      {epic.title}
                    </Link>
                    <span className="text-muted-foreground font-mono text-xs">{epic.itemNo}</span>
                    <PriorityBadge value={epic.priority} />
                  </div>
                  <span className="text-sm tabular-nums">
                    %{pct} · {done}/{total} puan · {epic.children.length} iş
                  </span>
                </div>
                <div className="bg-muted h-2 rounded">
                  <div className="bg-primary h-2 rounded" style={{ width: `${pct}%` }} />
                </div>
                {epic.children.length ? (
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {epic.children.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <Link href={`/cevik/is/${c.id}`} className="truncate hover:underline">
                          <span className="text-muted-foreground font-mono text-xs">{c.itemNo}</span> {c.title}
                        </Link>
                        <span className="text-muted-foreground shrink-0 text-xs">{AGILE_STATUS_LABELS[c.status]}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <EmptyState title="Epik yok" description="Büyük hedefleri epik olarak ekleyin, hikâyeleri epiğe bağlayın." />
      )}
      {orphans ? <p className="text-muted-foreground text-sm">Epiğe bağlı olmayan {orphans} bitmemiş iş var.</p> : null}
    </div>
  );
}
