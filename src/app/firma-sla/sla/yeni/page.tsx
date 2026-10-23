import { SlaIncidentForm } from "@/components/itil/sla-incident-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog, getSlaProductCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";

export const dynamic = "force-dynamic";

export default async function NewSlaPage() {
  const [{ t }, catalog, products, defaults] = await Promise.all([
    getTranslator(),
    getItilCatalog(),
    getSlaProductCatalog(),
    withModuleManagerDefaults("firmaSla"),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newSla")} description={t("pages.newSlaDesc")} />
      <SlaIncidentForm
        products={products}
        people={catalog.people}
        values={{
          requesterId: String(defaults.requesterId ?? ""),
          requestingManagerId: String(defaults.requestingManagerId ?? ""),
        }}
        cancelHref="/firma-sla"
      />
    </div>
  );
}
