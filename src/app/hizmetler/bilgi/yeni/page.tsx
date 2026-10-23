import { ArticleForm } from "@/components/itil/article-form";
import { PageHeader } from "@/components/ui-bits";
import { getViewer } from "@/lib/auth/viewer";
import { param } from "@/lib/search-params";
import { redirect } from "next/navigation";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

const KIND_PATH: Record<string, string> = { INCIDENT: "olay", PROBLEM: "problem", CHANGE: "degisiklik", REQUEST: "talepler", VULNERABILITY: "zafiyet", PATCH: "yama" };

export default async function YeniMakalePage({ searchParams }: PageProps<"/hizmetler/bilgi/yeni">) {
  const db = await getScopedDb();
  const params = await searchParams;
  const viewer = await getViewer();
  if (!viewer || viewer.role === "USER") redirect("/hizmetler/bilgi");
  const kaynak = param(params, "kaynak");
  const kid = param(params, "kid");
  const no = param(params, "no");
  const hata = param(params, "hata");
  const hidden: Record<string, string> = {};
  const values: { title?: string; body?: string; category?: string } = {};
  if (kaynak && kid && KIND_PATH[kaynak]) {
    hidden.sourceType = kaynak;
    hidden.sourceId = kid;
    hidden.sourceNo = no ?? "";
    // Problemde kök neden/geçici çözümü taslağa taşı
    if (kaynak === "PROBLEM") {
      const p = await db.problem.findUnique({ where: { id: kid }, select: { title: true, rootCause: true, workaround: true, permanentFix: true } });
      if (p) {
        values.title = p.title;
        values.body = [p.rootCause && `Neden:\n${p.rootCause}`, p.workaround && `Geçici çözüm:\n${p.workaround}`, p.permanentFix && `Kalıcı çözüm:\n${p.permanentFix}`].filter(Boolean).join("\n\n");
      }
    } else if (kaynak === "INCIDENT") {
      const i = await db.incident.findUnique({ where: { id: kid }, select: { title: true, description: true } });
      if (i) {
        values.title = i.title;
        values.body = i.description ? `Belirti / olay:\n${i.description}\n\nÇözüm:\n` : "";
      }
    }
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title="Yeni makale" description={no ? `Kaynak kayıt: ${no}` : undefined} />
      <ArticleForm values={values} hidden={hidden} cancelHref="/hizmetler/bilgi" error={hata} />
    </div>
  );
}
