import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveVulnerability } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { defaultOfficerId, getItilCatalog } from "@/lib/itil/catalog";
import { VULN_FIELDS } from "@/lib/itil/form-fields";

export const dynamic = "force-dynamic";

export default async function NewVulnPage() {
  const [{ t }, catalog, managerId] = await Promise.all([getTranslator(), getItilCatalog(), defaultOfficerId("zafiyet")]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newVuln")} />
      <SimpleForm
        action={saveVulnerability}
        fields={VULN_FIELDS}
        catalog={catalog}
        values={{ status: "OPEN", severity: "MEDIUM", detectedAt: new Date(), managerId }}
        cancelHref="/zafiyet"
      />
    </div>
  );
}
