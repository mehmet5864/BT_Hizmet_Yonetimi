import { ChangeForm } from "@/components/itil/change-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { defaultInfosecManagerId, getItilCatalog, withModuleManagerDefaults } from "@/lib/itil/catalog";

export const dynamic = "force-dynamic";

export default async function NewChangePage() {
  const [{ t }, catalog, defaults, infosecManagerId] = await Promise.all([
    getTranslator(),
    getItilCatalog(),
    withModuleManagerDefaults("degisiklik", { status: "PENDING", requestDate: new Date() }),
    defaultInfosecManagerId(),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newChange")} description={t("pages.newChangeDesc")} />
      <ChangeForm
        catalog={catalog}
        values={{
          requesterId: defaults.requesterId ? String(defaults.requesterId) : "",
          requestingDeptId: defaults.requestingDeptId ? String(defaults.requestingDeptId) : "",
          requestingManagerId: defaults.requestingManagerId ? String(defaults.requestingManagerId) : "",
          infosecManagerId,
          status: "PENDING",
          requestDate: new Date(),
        }}
        cancelHref="/degisiklik"
      />
    </div>
  );
}
