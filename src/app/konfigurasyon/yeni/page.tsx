import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveConfig } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";
import { CONFIG_FIELDS } from "@/lib/itil/form-fields";

export const dynamic = "force-dynamic";

export default async function NewConfigPage() {
  const [{ t }, catalog, defaults] = await Promise.all([getTranslator(), getItilCatalog(), withModuleManagerDefaults("konfigurasyon")]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newConfig")} />
      <SimpleForm action={saveConfig} fields={CONFIG_FIELDS} catalog={catalog} values={defaults} cancelHref="/konfigurasyon" />
    </div>
  );
}
