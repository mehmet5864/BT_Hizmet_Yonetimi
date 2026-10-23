import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveItilProcess } from "@/lib/actions/itil-process";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog } from "@/lib/itil/catalog";
import { getItilProcess, processFormFields } from "@/lib/itil/processes";
import { parseJsonRecord } from "@/lib/safe-json";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function EditProcessPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const db = await getScopedDb();
  const { slug, id } = await params;
  const def = getItilProcess(slug);
  if (!def) notFound();
  const [{ t }, row, catalog] = await Promise.all([
    getTranslator(),
    db.itilProcessRecord.findUnique({ where: { id } }),
    getItilCatalog(),
  ]);
  if (!row || row.process !== def.key) notFound();
  const extras = parseJsonRecord(row.details);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: row.recordNo })} description={t(`itil.${def.key}.label`)} />
      <SimpleForm
        action={saveItilProcess}
        fields={processFormFields(def)}
        catalog={catalog}
        values={{ ...row, ...extras, requestDate: row.startDate }}
        hidden={{ id: row.id, processSlug: def.slug }}
        cancelHref={`${def.href}/${row.id}`}
      />
    </div>
  );
}
