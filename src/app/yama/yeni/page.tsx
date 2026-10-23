import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { savePatch } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";
import { PATCH_FIELDS } from "@/lib/itil/form-fields";

export const dynamic = "force-dynamic";

export default async function NewPatchPage() {
  const [{ t }, catalog, values] = await Promise.all([
    getTranslator(),
    getItilCatalog(),
    withModuleManagerDefaults("yama", { status: "PENDING", requestDate: new Date() }),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newPatch")} />
      <SimpleForm action={savePatch} fields={PATCH_FIELDS} catalog={catalog} values={values} cancelHref="/yama" />
    </div>
  );
}
