import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveAgileSprint } from "@/lib/actions/agile";
import { AGILE_SPRINT_FIELDS } from "@/lib/agile/forms";
import { getItilCatalog } from "@/lib/itil/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewSprintPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const productId = Array.isArray(sp.urun) ? sp.urun[0] : sp.urun;
  const product = productId ? await prisma.agileProduct.findUnique({ where: { id: productId }, include: { _count: { select: { sprints: true } } } }) : null;
  if (!product) notFound();
  const catalog = await getItilCatalog();
  const fields = AGILE_SPRINT_FIELDS.filter((f) => f.id !== "status" && f.id !== "retro");
  const start = new Date();
  const end = new Date(start.getTime() + 13 * 86_400_000);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={`Yeni sprint — ${product.name}`} />
      <SimpleForm
        action={saveAgileSprint}
        fields={fields}
        catalog={catalog}
        values={{ name: `Sprint ${product._count.sprints + 1}`, startDate: start, endDate: end }}
        hidden={{ productId: product.id }}
        cancelHref={`/cevik/urun/${product.id}`}
      />
    </div>
  );
}
