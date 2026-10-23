import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewerAcl } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";

const AGILE_STATUS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam ediyor",
  REVIEW: "İncelemede",
  DONE: "Tamamlandı",
};

/** ITIL kaydına bağlı Çevik işleri ve bilgi bankası makalelerini gösterir (kayıt → iş yönü). */
export async function LinkedRecords({ sourceType, id, no }: { sourceType: string; id: string; no: string }) {
  const { viewer } = await getViewerAcl();
  // Yalnızca talep eden (USER) rolü bağlı iç kayıtları görmez.
  if (!viewer || viewer.role === "USER") return null;
  const [items, articles] = await Promise.all([
    prisma.agileItem.findMany({
      where: { sourceType, sourceId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, itemNo: true, title: true, status: true, assigneeId: true },
    }),
    prisma.knowledgeArticle.findMany({
      where: { sourceType, sourceId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, articleNo: true, title: true, status: true },
    }),
  ]);
  const canWrite = true;
  const done = items.filter((i) => i.status === "DONE").length;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Bağlı kayıtlar</CardTitle>
        {canWrite ? (
          <Link
            href={`/hizmetler/bilgi/yeni?kaynak=${sourceType}&kid=${id}&no=${encodeURIComponent(no)}`}
            className="text-primary text-sm underline"
          >
            Bilgi makalesi yaz
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground mb-1 text-xs uppercase">
            Çevik işler {items.length ? `(${done}/${items.length} tamamlandı)` : ""}
          </p>
          {items.length ? (
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <Link href={`/cevik/is/${i.id}`} className="hover:underline">
                    <span className="font-mono text-xs">{i.itemNo}</span> {i.title}
                  </Link>
                  <span className="text-muted-foreground text-xs">{AGILE_STATUS[i.status] ?? i.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Bağlı Çevik iş yok.</p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-xs uppercase">Bilgi bankası</p>
          {articles.length ? (
            <ul className="space-y-1">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link href={`/hizmetler/bilgi/${a.id}`} className="hover:underline">
                    <span className="font-mono text-xs">{a.articleNo}</span> {a.title}
                  </Link>
                  {a.status === "DRAFT" ? <span className="text-muted-foreground ms-2 text-xs">(taslak)</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Bağlı makale yok.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
