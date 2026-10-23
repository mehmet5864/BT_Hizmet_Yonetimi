import { notFound } from "next/navigation";

import { SlaIncidentForm } from "@/components/itil/sla-incident-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog, getSlaProductCatalog } from "@/lib/itil/catalog";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function EditSlaPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [{ t }, row, catalog, products] = await Promise.all([
    getTranslator(),
    db.slaTicket.findUnique({ where: { id } }),
    getItilCatalog(),
    getSlaProductCatalog(),
  ]);
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: row.ticketNo })} />
      <SlaIncidentForm
        products={products}
        people={catalog.people}
        values={{
          id: row.id,
          title: row.title,
          requesterId: row.requesterId,
          requestingManagerId: row.requestingManagerId,
          productId: row.productId,
          slaLevel: row.slaLevel != null ? String(row.slaLevel) : "",
          status: row.status,
          description: row.description,
        }}
        cancelHref={`/firma-sla/sla/${row.id}`}
      />
    </div>
  );
}
