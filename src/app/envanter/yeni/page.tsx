import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AssetForm } from "@/components/asset-form";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getInventoryAccess } from "@/lib/auth/inventory";
import { getTranslator } from "@/lib/i18n";
import { ASSET_TYPE_LIST, getAssetTypeDef } from "@/lib/inventory/asset-types";
import { SLUG_TO_ASSET_TYPE } from "@/lib/inventory/constants";
import { getFormCatalog } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewAssetPage({ searchParams }: PageProps<"/envanter/yeni">) {
  const access = await getInventoryAccess();
  if (!access?.canDirectMutate) redirect("/yetkisiz");
  const { t } = await getTranslator();
  const params = await searchParams;
  const slug = Array.isArray(params.tur) ? params.tur[0] : params.tur;
  const assetType = slug ? SLUG_TO_ASSET_TYPE[slug] : undefined;
  const typeDef = assetType ? getAssetTypeDef(assetType) : undefined;

  if (!typeDef || !assetType) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
        <PageHeader title={t("pages.newAsset")} description={t("pages.newAssetDesc")} />
        <div className="grid gap-3 sm:grid-cols-2">
          {ASSET_TYPE_LIST.map((type) => (
            <Link key={type.key} href={`/envanter/yeni?tur=${type.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="flex items-start gap-3">
                  <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <AssetTypeIcon name={type.icon} className={cn("size-5", type.accent)} />
                  </div>
                  <div>
                    <p className="font-medium">{t(`assets.${type.key}.label`)}</p>
                    <p className="text-muted-foreground text-xs">{t(`assets.${type.key}.description`)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const catalog = await getFormCatalog();
  const typeLabel = t(`assets.${assetType}.label`);
  const typeDesc = t(`assets.${assetType}.description`);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/envanter/yeni">
          <ArrowLeft className="size-4" />
          {t("pages.backToTypes")}
        </Link>
      </Button>

      <PageHeader
        title={t("pages.newAssetType", { type: typeLabel })}
        description={access.canDirectMutate ? typeDesc : t("pages.newAssetNeedsApproval", { desc: typeDesc })}
      />

      <AssetForm
        assetType={assetType}
        typeLabel={typeLabel}
        catalog={catalog}
        values={{ criticality: "MEDIUM", status: "ACTIVE" }}
        cancelHref={`/envanter?tur=${typeDef.slug}`}
      />
    </div>
  );
}
