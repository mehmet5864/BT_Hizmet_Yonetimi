import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveIncident } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { defaultOfficerId, getItilCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";
import { INCIDENT_FIELDS } from "@/lib/itil/form-fields";

export const dynamic = "force-dynamic";

export default async function NewIncidentPage() {
  const [{ t }, catalog, values, l1AnalystId] = await Promise.all([
    getTranslator(),
    getItilCatalog(),
    withModuleManagerDefaults("olay", { status: "OPEN", startedAt: new Date(), severity: "MEDIUM", layer: "L1", isMajor: "NO" }),
    defaultOfficerId("olay"),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newIncident")} description={t("pages.newIncidentDesc")} />
      <SimpleForm
        action={saveIncident}
        fields={INCIDENT_FIELDS}
        catalog={catalog}
        values={{ ...values, l1AnalystId }}
        cancelHref="/olay"
      />
    </div>
  );
}
