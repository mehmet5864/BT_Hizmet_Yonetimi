import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveAgileProduct } from "@/lib/actions/agile";
import { AGILE_PRODUCT_FIELDS } from "@/lib/agile/forms";
import { getItilCatalog } from "@/lib/itil/catalog";

export const dynamic = "force-dynamic";

export default async function NewAgileProductPage() {
  const catalog = await getItilCatalog();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title="Yeni ürün / ekip" description="Backlog ve sprintlerin bağlanacağı ürün veya ekip." />
      <SimpleForm action={saveAgileProduct} fields={AGILE_PRODUCT_FIELDS} catalog={catalog} values={{ method: "SCRUM", status: "ACTIVE" }} cancelHref="/cevik" />
    </div>
  );
}
