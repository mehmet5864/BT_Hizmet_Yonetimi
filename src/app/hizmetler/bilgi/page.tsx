import Link from "next/link";

import { BookOpen, FileEdit, Clock, CheckCircle2 } from "lucide-react";

import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getViewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";
import { param } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function BilgiListPage({ searchParams }: PageProps<"/hizmetler/bilgi">) {
  const params = await searchParams;
  const q = param(params, "q")?.trim();
  const viewer = await getViewer();
  const staff = !!viewer && viewer.role !== "USER";
  const rows = await prisma.knowledgeArticle.findMany({
    where: {
      ...(staff ? {} : { status: "PUBLISHED" }),
      ...(q
        ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { body: { contains: q, mode: "insensitive" as const } }, { tags: { contains: q, mode: "insensitive" as const } }, { category: { contains: q, mode: "insensitive" as const } }, { articleNo: { contains: q, mode: "insensitive" as const } }] }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: { id: true, articleNo: true, title: true, category: true, tags: true, status: true, updatedAt: true },
  });
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalAll, published, draft, recentCount] = await Promise.all([
    prisma.knowledgeArticle.count({ where: staff ? {} : { status: "PUBLISHED" } }),
    prisma.knowledgeArticle.count({ where: { status: "PUBLISHED" } }),
    staff ? prisma.knowledgeArticle.count({ where: { status: "DRAFT" } }) : Promise.resolve(0),
    prisma.knowledgeArticle.count({ where: { ...(staff ? {} : { status: "PUBLISHED" }), updatedAt: { gte: monthAgo } } }),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Bilgi bankası"
        description="Olay ve problemlerden çıkan çözümler, sık sorulan sorular ve prosedürler."
        actions={
          staff ? (
            <Button asChild>
              <Link href="/hizmetler/bilgi/yeni">Yeni makale</Link>
            </Button>
          ) : undefined
        }
      />
      <WidgetRow>
        <StatWidget icon={<BookOpen className="size-4" />} label="Toplam makale" value={totalAll} hint={staff ? "Taslaklar dahil" : "Yayındaki makaleler"} href="/hizmetler/bilgi" tone="info" />
        <StatWidget icon={<CheckCircle2 className="size-4" />} label="Yayında" value={published} hint="Herkesin görebildiği" href="/hizmetler/bilgi" tone="ok" bar={totalAll ? Math.round((published / totalAll) * 100) : 0} />
        {staff ? <StatWidget icon={<FileEdit className="size-4" />} label="Taslak" value={draft} hint="Yayınlanmayı bekleyen" href="/hizmetler/bilgi" tone={draft > 0 ? "warning" : "default"} /> : null}
        <StatWidget icon={<Clock className="size-4" />} label="Son 30 gün" value={recentCount} hint="Güncellenen makale" href="/hizmetler/bilgi" />
      </WidgetRow>
      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Başlık, içerik, etiket veya no ara…" />
        <Button type="submit" variant="outline">Ara</Button>
      </form>
      <Card>
        <CardContent className="pt-6">
          {rows.length ? (
            <ul className="divide-y">
              {rows.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/hizmetler/bilgi/${a.id}`} className="font-medium hover:underline">
                      <span className="text-muted-foreground me-2 font-mono text-xs">{a.articleNo}</span>
                      {a.title}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {[a.category, a.tags].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "DRAFT" ? <Badge variant="outline">Taslak</Badge> : null}
                    <span className="text-muted-foreground text-xs">{formatDate(a.updatedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Makale bulunamadı.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
