import Link from "next/link";
import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { saveAgileItem } from "@/lib/actions/agile";
import { AGILE_SOURCE_LABELS } from "@/lib/agile/constants";
import { AGILE_ITEM_FIELDS } from "@/lib/agile/forms";
import { getItilCatalog } from "@/lib/itil/catalog";
import { prisma } from "@/lib/prisma";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

type Source = { type: string; id: string; no: string; title: string; description: string | null; priority: string; type2: string };

async function loadSource(type: string, id: string): Promise<Source | null> {
  const db = await getScopedDb();
  const pr = (s?: string | null) => (s && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(s) ? s : "MEDIUM");
  if (type === "INCIDENT") {
    const r = await db.incident.findUnique({ where: { id } });
    return r ? { type, id, no: r.incidentNo, title: r.title, description: r.description, priority: pr(r.severity), type2: "BUG" } : null;
  }
  if (type === "PROBLEM") {
    const r = await db.problem.findUnique({ where: { id } });
    return r ? { type, id, no: r.problemNo, title: r.title, description: [r.rootCause && `Kök neden: ${r.rootCause}`, r.workaround && `Geçici çözüm: ${r.workaround}`, r.description].filter(Boolean).join("\n\n") || null, priority: "HIGH", type2: "STORY" } : null;
  }
  if (type === "CHANGE") {
    const r = await db.changeRecord.findUnique({ where: { id } });
    return r ? { type, id, no: r.changeNo, title: r.description?.split("\n")[0].slice(0, 90) || r.changeNo, description: r.description, priority: "MEDIUM", type2: "TASK" } : null;
  }
  if (type === "REQUEST") {
    const r = await prisma.serviceRequest.findUnique({ where: { id } });
    return r ? { type, id, no: r.requestNo, title: r.description?.slice(0, 80) || r.requestNo, description: r.description, priority: pr(r.severity), type2: "TASK" } : null;
  }
  if (type === "VULNERABILITY") {
    const r = await db.vulnerability.findUnique({ where: { id } });
    return r ? { type, id, no: r.vulnNo, title: r.deviceName ? `${r.deviceName}${r.cve ? ` — ${r.cve}` : ""}` : r.cve || r.vulnNo, description: r.description, priority: pr(r.severity), type2: "BUG" } : null;
  }
  if (type === "PATCH") {
    const r = await db.patchRecord.findUnique({ where: { id } });
    return r ? { type, id, no: r.patchNo, title: r.title, description: r.description, priority: "MEDIUM", type2: "TASK" } : null;
  }
  return null;
}

export default async function NewAgileItemPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const productId = one("urun");
  const sprintId = one("sprint");
  const srcType = one("kaynak");
  const typeParam = one("tur");
  const epicParam = one("epik");
  const parentParam = one("ust");
  const srcId = one("kid");
  const source = srcType && srcId ? await loadSource(srcType, srcId) : null;

  if (!productId) {
    const products = await prisma.agileProduct.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
    const extra = source ? `&kaynak=${source.type}&kid=${source.id}` : "";
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <PageHeader
          title="Hangi ürüne eklensin?"
          description={source ? `${AGILE_SOURCE_LABELS[source.type]} ${source.no}: ${source.title}` : "İşin ekleneceği ürün veya ekibi seçin."}
        />
        {products.length ? (
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/cevik/is/yeni?urun=${p.id}${extra}`} className="hover:bg-muted/50 block rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">{p.name}</span> <span className="text-muted-foreground font-mono text-xs">{p.key}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Henüz ürün yok" description="Önce Çevik çalışma sayfasından bir ürün veya ekip ekleyin." />
        )}
      </div>
    );
  }

  const [product, catalog] = await Promise.all([prisma.agileProduct.findUnique({ where: { id: productId } }), getItilCatalog()]);
  if (!product) notFound();
  const hidden: Record<string, string> = { productId: product.id };
  if (sprintId) hidden.sprintId = sprintId;
  if (epicParam) hidden.epicId = epicParam;
  if (parentParam) hidden.parentId = parentParam;
  if (source) {
    hidden.sourceType = source.type;
    hidden.sourceId = source.id;
    hidden.sourceNo = source.no;
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={`Yeni iş — ${product.name}`}
        description={source ? `Kaynak: ${AGILE_SOURCE_LABELS[source.type]} ${source.no}` : undefined}
      />
      <SimpleForm
        action={saveAgileItem}
        fields={AGILE_ITEM_FIELDS}
        catalog={catalog}
        values={{
          type: typeParam && ["EPIC", "STORY", "TASK", "BUG"].includes(typeParam) ? typeParam : (source?.type2 ?? "STORY"),
          priority: source?.priority ?? "MEDIUM",
          status: sprintId ? "TODO" : "BACKLOG",
          title: source ? `${source.no} — ${source.title}` : "",
          description: source?.description ?? "",
        }}
        hidden={hidden}
        cancelHref={`/cevik/urun/${product.id}`}
      />
    </div>
  );
}
