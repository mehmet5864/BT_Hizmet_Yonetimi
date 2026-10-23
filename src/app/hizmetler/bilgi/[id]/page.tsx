import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteArticle } from "@/lib/actions/knowledge";
import { getViewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KIND_PATH: Record<string, string> = { INCIDENT: "olay", PROBLEM: "problem", CHANGE: "degisiklik", REQUEST: "talepler", VULNERABILITY: "zafiyet", PATCH: "yama" };

export default async function MakalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, viewer] = await Promise.all([prisma.knowledgeArticle.findUnique({ where: { id } }), getViewer()]);
  const staff = !!viewer && viewer.role !== "USER";
  if (!a || (a.status !== "PUBLISHED" && !staff)) notFound();
  const author = a.authorId ? await prisma.person.findUnique({ where: { id: a.authorId }, select: { fullName: true } }) : null;
  const canDelete = staff && (["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(String(viewer!.role)) || a.authorId === viewer!.id);
  // Kaynak kayıt yalnızca personelde bağlantı olarak görünür
  const sourceHref = staff && a.sourceType && a.sourceId && KIND_PATH[a.sourceType] ? `/${KIND_PATH[a.sourceType]}/${a.sourceId}` : null;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={a.title}
        description={`${a.articleNo} · ${[a.category, a.tags].filter(Boolean).join(" · ") || "Kategorisiz"}`}
        actions={
          staff ? (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href={`/hizmetler/bilgi/${a.id}/duzenle`}>Düzenle</Link>
              </Button>
              {canDelete ? (
                <form action={deleteArticle}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" size="sm" variant="outline">Sil</Button>
                </form>
              ) : null}
            </>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="pt-6">
          <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-3 text-xs">
            {a.status === "DRAFT" ? <Badge variant="outline">Taslak</Badge> : <Badge>Yayında</Badge>}
            <span>Güncelleme: {formatDate(a.updatedAt)}</span>
            {author ? <span>Yazan: {author.fullName}</span> : null}
            {sourceHref ? <Link href={sourceHref} className="underline">Kaynak: {a.sourceNo || "kayıt"}</Link> : null}
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{a.body}</div>
        </CardContent>
      </Card>
    </div>
  );
}
