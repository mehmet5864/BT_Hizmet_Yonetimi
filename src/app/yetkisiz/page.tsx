import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n";

export default async function ForbiddenPage({ searchParams }: PageProps<"/yetkisiz">) {
  const { t } = await getTranslator();
  const params = await searchParams;
  const neden = Array.isArray(params.neden) ? params.neden[0] : params.neden;
  const lisans = neden === "lisans";
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
        <ShieldOff className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold">{lisans ? "Bu modül lisansınızda yok" : t("forbidden.title")}</h1>
      <p className="text-muted-foreground text-sm">
        {lisans
          ? "Bu modül mevcut lisansta kapalı. Süper yönetici Ayarlar → Lisans bölümünden lisansı yükseltebilir."
          : t("forbidden.body")}
      </p>
      <Button asChild>
        <Link href="/">{t("forbidden.back")}</Link>
      </Button>
    </div>
  );
}
