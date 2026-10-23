import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { savePerson } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog } from "@/lib/itil/catalog";
import { personnelFields } from "@/lib/itil/form-fields";
import { getOfficeNames } from "@/lib/settings-store";
import { redirect } from "next/navigation";
import { canHandleModule } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export default async function NewPersonPage() {
  if (!(await canHandleModule("/personel"))) redirect("/yetkisiz");
  const [{ t }, catalog, officeNames] = await Promise.all([getTranslator(), getItilCatalog(), getOfficeNames()]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.newPerson")} description={t("pages.newPersonDesc")} />
      <SimpleForm
        action={savePerson}
        fields={personnelFields(officeNames)}
        catalog={catalog}
        values={{ role: "USER" }}
        cancelHref="/personel"
      />
    </div>
  );
}
