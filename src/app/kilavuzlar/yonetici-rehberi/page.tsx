import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { GuideArticle } from "@/components/guide-article";
import { PageHeader } from "@/components/ui-bits";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ADMIN_GUIDE_ILLUSTRATED } from "@/lib/guides/yonetici-rehberi";
import { getTranslator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminIllustratedGuidePage() {
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
        title="Yönetici rehberi (resimli)"
        description="Active Directory, SIEM, zafiyet tarayıcıları, e-posta, onay, yetki, lisans, API ve yedek kurulumu."
      />
      {locale !== "tr" ? (
        <Alert>
          <AlertDescription>{t("guidesPage.langNote")}</AlertDescription>
        </Alert>
      ) : null}
      <GuideArticle guide={ADMIN_GUIDE_ILLUSTRATED} tocLabel={t("guidesPage.toc")} />
    </div>
  );
}
