import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveAgileMeeting } from "@/lib/actions/agile";
import { AGILE_MEETING_FIELDS } from "@/lib/agile/forms";
import { getItilCatalog } from "@/lib/itil/catalog";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await getScopedDb();
  const { id } = await params;
  const [row, catalog] = await Promise.all([db.agileMeeting.findUnique({ where: { id } }), getItilCatalog()]);
  if (!row) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={`Düzenle: ${row.title}`} />
      <SimpleForm action={saveAgileMeeting} fields={AGILE_MEETING_FIELDS} catalog={catalog} values={row as unknown as Record<string, unknown>} hidden={{ id: row.id }} cancelHref={`/cevik/toplanti/${row.id}`} />
    </div>
  );
}
