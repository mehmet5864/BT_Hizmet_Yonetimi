import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveProblem } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { defaultInfosecManagerId, getItilCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";
import { PROBLEM_FIELDS } from "@/lib/itil/form-fields";

export const dynamic = "force-dynamic";

export default async function NewProblemPage() {
  const [{ t }, catalog, infosecManagerId, values] = await Promise.all([
    getTranslator(),
    getItilCatalog(),
    defaultInfosecManagerId(),
    withModuleManagerDefaults("problem", { status: "OPEN" }),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newProblem")} description={t("pages.newProblemDesc")} />
      <SimpleForm
        action={saveProblem}
        fields={PROBLEM_FIELDS}
        catalog={catalog}
        values={{ ...values, infosecManagerId }}
        cancelHref="/problem"
      />
    </div>
  );
}
