import { notFound, redirect } from "next/navigation";

import { ArticleForm } from "@/components/itil/article-form";
import { PageHeader } from "@/components/ui-bits";
import { getViewer } from "@/lib/auth/viewer";
import { param } from "@/lib/search-params";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MakaleDuzenlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp, viewer] = await Promise.all([params, searchParams, getViewer()]);
  if (!viewer || viewer.role === "USER") redirect("/hizmetler/bilgi");
  const a = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!a) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={`Düzenle — ${a.articleNo}`} />
      <ArticleForm values={a} cancelHref={`/hizmetler/bilgi/${a.id}`} error={param(sp, "hata")} />
    </div>
  );
}
