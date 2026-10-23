import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { savePatch } from "@/lib/actions/itil";
import { getItilCatalog } from "@/lib/itil/catalog";
import { PATCH_FIELDS } from "@/lib/itil/form-fields";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function EditPatchPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [{ t }, row, catalog] = await Promise.all([
    getTranslator(),
    db.patchRecord.findUnique({ where: { id } }),
    getItilCatalog(),
  ]);
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: row.patchNo })} />
      <SimpleForm action={savePatch} fields={PATCH_FIELDS} catalog={catalog} values={row as unknown as Record<string, unknown>} hidden={{ id: row.id }} cancelHref={`/yama/${row.id}`} />
    </div>
  );
}
