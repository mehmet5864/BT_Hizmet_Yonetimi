import { VendorForm } from "@/components/itil/vendor-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewVendorPage() {
  const { t } = await getTranslator();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newVendor")} description={t("pages.newVendorDesc")} />
      <VendorForm cancelHref="/firma-sla" />
    </div>
  );
}
