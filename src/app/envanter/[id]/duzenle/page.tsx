import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AssetForm } from "@/components/asset-form";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { getInventoryAccess, viewerCanSeeAsset } from "@/lib/auth/inventory";
import { getTranslator } from "@/lib/i18n";
import type { AssetTypeKey } from "@/lib/inventory/constants";
import { assetDisplayName } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";
import { getFormCatalog } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditAssetPage({ params }: PageProps<"/envanter/[id]/duzenle">) {
  const { id } = await params;

  const [{ t }, asset, catalog] = await Promise.all([
    getTranslator(),
    prisma.asset.findUnique({
      where: { id },
      include: { outgoingRelations: { where: { relationType: "HOSTED_ON" } }, catalogServices: { select: { id: true } } },
    }),
    getFormCatalog(),
  ]);

  if (!asset) notFound();
  const access = await getInventoryAccess();
  if (!access?.canEdit || !viewerCanSeeAsset(access, asset)) redirect("/yetkisiz");

  const typeLabel = t(`assets.${asset.assetType}.label`);
  const { outgoingRelations, catalogServices, ...scalars } = asset;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href={`/envanter/${asset.id}`}>
          <ArrowLeft className="size-4" />
          {t("pages.backToRecord")}
        </Link>
      </Button>

      <PageHeader
        title={t("pages.editName", { name: assetDisplayName(asset) })}
        description={t("pages.editAssetDesc", { type: typeLabel })}
      />

      <AssetForm
        assetType={asset.assetType as AssetTypeKey}
        typeLabel={typeLabel}
        catalog={catalog}
        values={{
          ...scalars,
          hostServers: outgoingRelations.map((relation) => relation.targetId),
          servedServices: catalogServices.map((service) => service.id),
        }}
        cancelHref={`/envanter/${asset.id}`}
      />
    </div>
  );
}
