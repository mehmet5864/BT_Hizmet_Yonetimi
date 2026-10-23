import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { GuideArticle } from "@/components/guide-article";
import { PageHeader } from "@/components/ui-bits";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ITIL_V4_GUIDE } from "@/lib/guides/itil-v4";
import { getTranslator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ItilV4GuidePage() {
  const { t, locale } = await getTranslator();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/kilavuzlar">
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("guidesPage.backToGuides")}
        </Link>
      </Button>
      <PageHeader
        title={t("guidesPage.itilReadTitle")}
        description={t("guidesPage.itilReadDesc")}
        actions={
          <Button asChild variant="outline">
            <a href="/docs/itil-v4-kilavuzu.pdf" download>
              <Download className="size-4" />
              {t("guidesPage.downloadPdf")}
            </a>
          </Button>
        }
      />
      {locale !== "tr" ? <Alert><AlertDescription>{t("guidesPage.langNote")}</AlertDescription></Alert> : null}
      <GuideArticle guide={ITIL_V4_GUIDE} tocLabel={t("guidesPage.toc")} />
    </div>
  );
}
