import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveCatalogService } from "@/lib/actions/itil-process";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";
import { CATALOG_FIELDS } from "@/lib/itil/processes";

export const dynamic = "force-dynamic";

export default async function NewCatalogPage() {
  const [{ t }, catalog, values] = await Promise.all([
    getTranslator(),
    getItilCatalog(),
    withModuleManagerDefaults("katalog", { status: "ACTIVE", audience: "USER", hours: "Mesai 08:00–18:00", criticality: "MEDIUM" }),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newCatalog")} description={t("pages.newCatalogDesc")} />
      <SimpleForm action={saveCatalogService} fields={CATALOG_FIELDS} catalog={catalog} values={values} cancelHref="/katalog" />
    </div>
  );
}
