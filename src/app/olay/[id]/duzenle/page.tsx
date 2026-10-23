import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { getTranslator } from "@/lib/i18n";
import { saveIncident } from "@/lib/actions/itil";
import { getItilCatalog } from "@/lib/itil/catalog";
import { INCIDENT_FIELDS } from "@/lib/itil/form-fields";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function EditIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [{ t }, row, catalog] = await Promise.all([
    getTranslator(),
    db.incident.findUnique({ where: { id } }),
    getItilCatalog(),
  ]);
  if (!row) notFound();
  const relChange = row.changeId ? await db.changeRecord.findUnique({ where: { id: row.changeId }, select: { changeNo: true } }) : null;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: row.incidentNo })} />
      <SimpleForm action={saveIncident} fields={INCIDENT_FIELDS} catalog={catalog} values={{ ...row, isMajor: row.isMajor ? "YES" : "NO", relatedChangeNo: relChange?.changeNo ?? "" } as unknown as Record<string, unknown>} hidden={{ id: row.id }} cancelHref={`/olay/${row.id}`} />
    </div>
  );
}
