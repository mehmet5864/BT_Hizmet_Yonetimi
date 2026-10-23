import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveAgileMeeting } from "@/lib/actions/agile";
import { AGILE_MEETING_KIND_LABELS } from "@/lib/agile/constants";
import { AGILE_MEETING_FIELDS } from "@/lib/agile/forms";
import { getItilCatalog } from "@/lib/itil/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const productId = one("urun");
  const sprintId = one("sprint");
  const kindParam = one("tur");
  const product = productId ? await prisma.agileProduct.findUnique({ where: { id: productId } }) : null;
  if (!product) notFound();
  const sprint = sprintId ? await prisma.agileSprint.findUnique({ where: { id: sprintId } }) : null;
  const catalog = await getItilCatalog();
  const kind = kindParam && kindParam in AGILE_MEETING_KIND_LABELS ? kindParam : "DAILY";
  const hidden: Record<string, string> = { productId: product.id };
  if (sprint) hidden.sprintId = sprint.id;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={`Yeni toplantı kaydı — ${product.name}`} description={sprint ? `Sprint: ${sprint.name}` : undefined} />
      <SimpleForm
        action={saveAgileMeeting}
        fields={AGILE_MEETING_FIELDS}
        catalog={catalog}
        values={{ kind, meetingDate: new Date(), title: sprint ? `${sprint.name} — ${AGILE_MEETING_KIND_LABELS[kind]}` : AGILE_MEETING_KIND_LABELS[kind] }}
        hidden={hidden}
        cancelHref={sprint ? `/cevik/sprint/${sprint.id}` : `/cevik/urun/${product.id}`}
      />
    </div>
  );
}
