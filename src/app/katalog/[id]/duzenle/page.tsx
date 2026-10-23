import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { saveCatalogService } from "@/lib/actions/itil-process";
import { getItilCatalog } from "@/lib/itil/catalog";
import { CATALOG_FIELDS } from "@/lib/itil/processes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditCatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ t }, row, catalog] = await Promise.all([
    getTranslator(),
    prisma.catalogService.findUnique({ where: { id } }),
    getItilCatalog(),
  ]);
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: row.serviceNo })} description={row.name} />
      <SimpleForm
        action={saveCatalogService}
        fields={CATALOG_FIELDS}
        catalog={catalog}
        values={row as unknown as Record<string, unknown>}
        hidden={{ id: row.id }}
        cancelHref={`/katalog/${row.id}`}
      />
    </div>
  );
}
