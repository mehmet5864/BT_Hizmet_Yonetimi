import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ZimmetFormPanel } from "@/components/zimmet-form-panel";
import { ModuleHero } from "@/components/dashboard/module-widgets";
import { Button } from "@/components/ui/button";
import { getInventoryAccess } from "@/lib/auth/inventory";
import { parseAssetIds } from "@/lib/inventory/zimmet-form";
import { assetDisplayName } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ZimmetFormPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getInventoryAccess();
  if (!access?.canView) redirect("/yetkisiz");

  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const initialPersonId = single("personId") ?? "";
  const initialAssetIds = parseAssetIds([single("assetId") ?? "", ...(Array.isArray(params.assetIds) ? params.assetIds : params.assetIds ? [params.assetIds] : [])]);

  const assets = await prisma.asset.findMany({
    where: access.assetWhere as never,
    select: {
      id: true,
      name: true,
      stockNo: true,
      brand: true,
      model: true,
      ownerId: true,
      custody: true,
      owner: { select: { fullName: true } },
    },
    orderBy: [{ name: "asc" }, { stockNo: "asc" }],
    take: 500,
  });

  const ownerIds = [...new Set(assets.map((asset) => asset.ownerId))];
  const people = access.canSeeAll
    ? await prisma.person.findMany({
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, title: true, department: { select: { name: true } } },
      })
    : await prisma.person.findMany({
        where: { id: { in: ownerIds.length ? ownerIds : ["__none__"] } },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, title: true, department: { select: { name: true } } },
      });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/envanter">
          <ArrowLeft className="size-4" />
          Envanter
        </Link>
      </Button>

      <ModuleHero
        title="Zimmet formu"
        description="Personeli seçin, zimmetindeki kayıtlardan istediğinizi işaretleyin. Çıktı Taşınır Teslim Belgesi (Örnek 6/A) düzeninde PDF veya Word olur."
      />

      <ZimmetFormPanel
        people={people.map((person) => ({
          id: person.id,
          label: person.fullName,
          meta: person.department?.name ?? person.title ?? undefined,
        }))}
        assets={assets.map((asset) => ({
          id: asset.id,
          label: assetDisplayName(asset),
          ownerId: asset.ownerId,
          ownerLabel: asset.owner.fullName,
          custody: asset.custody,
          meta: asset.stockNo ?? undefined,
        }))}
        initialPersonId={initialPersonId}
        initialAssetIds={initialAssetIds}
      />
    </div>
  );
}
