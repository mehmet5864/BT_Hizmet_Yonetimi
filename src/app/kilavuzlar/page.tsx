import Link from "next/link";
import { BookOpen, Code2, Download, KanbanSquare, Layers, Shield, UserRound } from "lucide-react";

import { ModuleHero } from "@/components/dashboard/module-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function GuidesPage() {
  const { t } = await getTranslator();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero title={t("guidesPage.title")} description={t("guidesPage.description")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4" />
              {t("guidesPage.itilTitle")}
            </CardTitle>
            <CardDescription>{t("guidesPage.itilDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/kilavuzlar/itil-v4">{t("guidesPage.readOnline")}</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="/docs/itil-v4-kilavuzu.pdf" download>
                <Download className="size-4" />
                {t("guidesPage.downloadPdf")}
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KanbanSquare className="size-4" />
              Çevik çalışma (Agile) kılavuzu
            </CardTitle>
            <CardDescription>
              Scrum ve Kanban, hikâye ve puanlama, sprint toplantıları, burndown / velocity ve ITIL kayıtlarından iş açma. Senaryolar ve sözlük dahil.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/kilavuzlar/agile">{t("guidesPage.readOnline")}</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="/docs/agile-kilavuzu.pdf" download>
                <Download className="size-4" />
                {t("guidesPage.downloadPdf")}
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4" />
              Kullanıcı rehberi (resimli)
            </CardTitle>
            <CardDescription>
              Her menüde ne yapılır, nasıl çalışır ve ITIL, Agile ve DevSecOps’a göre nasıl olmalı. Şemalı ekran anlatımı.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/kilavuzlar/kullanici-rehberi">{t("guidesPage.readOnline")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              Yönetici rehberi (resimli)
            </CardTitle>
            <CardDescription>
              AD, SIEM, Nessus / Tenable / Qualys gibi zafiyet tarayıcıları, e-posta, onay, yetki, API ve yedek kurulumu adım adım.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/kilavuzlar/yonetici-rehberi">{t("guidesPage.readOnline")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4" />
              {t("guidesPage.userTitle")}
            </CardTitle>
            <CardDescription>{t("guidesPage.userDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/docs/kullanici-kilavuzu.pdf" download>
                <Download className="size-4" />
                {t("guidesPage.downloadPdf")}
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              {t("guidesPage.adminTitle")}
            </CardTitle>
            <CardDescription>{t("guidesPage.adminDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/docs/yonetici-kilavuzu.pdf" download>
                <Download className="size-4" />
                {t("guidesPage.downloadPdf")}
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="size-4" />
              {t("guidesPage.apiTitle")}
            </CardTitle>
            <CardDescription>{t("guidesPage.apiDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/docs/api-kilavuzu.pdf" download>
                <Download className="size-4" />
                {t("guidesPage.downloadPdf")}
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/api-arayuzu">{t("guidesPage.openInterface")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <BookOpen className="size-4 shrink-0" />
        {t("guidesPage.files")}
      </p>
    </div>
  );
}
