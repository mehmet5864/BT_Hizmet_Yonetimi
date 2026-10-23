import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveItilProcess } from "@/lib/actions/itil-process";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";
import { getItilProcess, processFormFields } from "@/lib/itil/processes";

export const dynamic = "force-dynamic";

export default async function NewProcessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = getItilProcess(slug);
  if (!def) notFound();
  const [{ t }, catalog, values] = await Promise.all([
    getTranslator(),
    getItilCatalog(),
    withModuleManagerDefaults(def.officer, { status: def.statuses[0]?.value ?? "OPEN", severity: "MEDIUM", requestDate: new Date() }),
  ]);
  const typeLabel = t(`itil.${def.key}.label`);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newProcess", { type: typeLabel })} description={t(`itil.${def.key}.description`)} />
      <SimpleForm
        action={saveItilProcess}
        fields={processFormFields(def)}
        catalog={catalog}
        values={values}
        hidden={{ processSlug: def.slug }}
        cancelHref={def.href}
      />
    </div>
  );
}
