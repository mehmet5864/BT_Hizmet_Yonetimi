import { notFound } from "next/navigation";

import { VendorForm } from "@/components/itil/vendor-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ t }, vendor] = await Promise.all([
    getTranslator(),
    prisma.vendor.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { sortOrder: "asc" } },
        products: { orderBy: { name: "asc" } },
        slaLevels: { orderBy: { level: "asc" } },
      },
    }),
  ]);
  if (!vendor) notFound();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: vendor.name })} />
      <VendorForm
        cancelHref={`/firma-sla/firma/${vendor.id}`}
        values={{
          id: vendor.id,
          name: vendor.name,
          supportEmail: vendor.supportEmail,
          specFileUrl: vendor.specFileUrl ?? vendor.contractFileUrl,
          specFileName: vendor.specFileName,
          specKind: vendor.specKind,
          description: vendor.description,
          contacts: vendor.contacts.length
            ? vendor.contacts.map((row) => ({
                name: row.name,
                email: row.email ?? "",
                phone: row.phone ?? "",
                kind: row.kind,
              }))
            : [
                {
                  name: vendor.contactPerson ?? "",
                  email: vendor.contact1Email ?? vendor.email ?? "",
                  phone: vendor.contact1Phone ?? vendor.phone ?? "",
                  kind: "SORUMLU",
                },
              ],
          products: vendor.products.map((row) => ({
            name: row.name,
            licenseType: row.licenseType ?? "SUPPORT",
            quantity: String(row.quantity),
            version: row.version ?? "",
            serialNo: row.serialNo ?? "",
            notes: row.notes ?? "",
          })),
          slaLevels: vendor.slaLevels,
        }}
      />
    </div>
  );
}
