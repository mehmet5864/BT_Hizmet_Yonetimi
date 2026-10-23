import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveAgileItem } from "@/lib/actions/agile";
import { AGILE_ITEM_FIELDS } from "@/lib/agile/forms";
import { getItilCatalog } from "@/lib/itil/catalog";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function EditAgileItemPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [row, catalog] = await Promise.all([db.agileItem.findUnique({ where: { id } }), getItilCatalog()]);
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={`Düzenle: ${row.itemNo}`} />
      <SimpleForm action={saveAgileItem} fields={AGILE_ITEM_FIELDS} catalog={catalog} values={row as unknown as Record<string, unknown>} hidden={{ id: row.id }} cancelHref={`/cevik/is/${row.id}`} />
    </div>
  );
}
