import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { RelationGraph, type GLink, type GNode } from "@/components/itil/relation-graph";
import { LiveRefresh } from "@/components/live-refresh";
import { prisma } from "@/lib/prisma";
import { ITIL_PROCESS_BY_KEY, type ItilProcessKey } from "@/lib/itil/processes";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

const LIMIT = 120;

export default async function HaritaPage() {
  const db = await getScopedDb();
  const [incidents, problems, vulns, patches, services, procs, items, assets, changes] = await Promise.all([
    db.incident.findMany({ take: LIMIT, orderBy: { createdAt: "desc" }, select: { id: true, incidentNo: true, title: true, assetId: true, status: true } }),
    db.problem.findMany({ take: LIMIT, orderBy: { createdAt: "desc" }, select: { id: true, problemNo: true, title: true, assetId: true, incidentId: true, status: true } }),
    db.vulnerability.findMany({ take: LIMIT, orderBy: { createdAt: "desc" }, select: { id: true, vulnNo: true, assetId: true, status: true } }),
    db.patchRecord.findMany({ take: LIMIT, orderBy: { createdAt: "desc" }, select: { id: true, patchNo: true, title: true, assetId: true, status: true } }),
    prisma.catalogService.findMany({ take: LIMIT, select: { id: true, serviceNo: true, assetId: true, status: true } }),
    db.itilProcessRecord.findMany({ take: LIMIT, orderBy: { createdAt: "desc" }, select: { id: true, recordNo: true, process: true, title: true, serviceId: true, assetId: true } }),
    db.agileItem.findMany({ take: LIMIT, orderBy: { createdAt: "desc" }, select: { id: true, itemNo: true, title: true, sourceType: true, sourceId: true, status: true } }),
    prisma.asset.findMany({ select: { id: true, name: true, stockNo: true } }),
    db.changeRecord.findMany({ take: LIMIT, orderBy: { createdAt: "desc" }, select: { id: true, changeNo: true } }),
  ]);

  const nodes: GNode[] = [];
  const links: GLink[] = [];
  const ids = new Set<string>();
  const add = (n: GNode) => { if (!ids.has(n.id)) { ids.add(n.id); nodes.push(n); } };
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const needAsset = (assetId: string | null | undefined, from: string) => {
    if (!assetId) return;
    const a = assetMap.get(assetId);
    add({ id: `asset:${assetId}`, kind: "asset", label: a?.name || a?.stockNo || "Varlık", href: `/envanter/${assetId}` });
    links.push({ a: from, b: `asset:${assetId}` });
  };

  for (const r of incidents) { add({ id: `inc:${r.id}`, kind: "incident", label: r.incidentNo, sub: r.title, href: `/olay/${r.id}` }); needAsset(r.assetId, `inc:${r.id}`); }
  for (const r of problems) {
    add({ id: `prb:${r.id}`, kind: "problem", label: r.problemNo, sub: r.title, href: `/problem/${r.id}` });
    needAsset(r.assetId, `prb:${r.id}`);
    if (r.incidentId) links.push({ a: `prb:${r.id}`, b: `inc:${r.incidentId}` });
  }
  for (const r of vulns) { add({ id: `vul:${r.id}`, kind: "vuln", label: r.vulnNo, href: `/zafiyet/${r.id}` }); needAsset(r.assetId, `vul:${r.id}`); }
  for (const r of patches) { add({ id: `pat:${r.id}`, kind: "patch", label: r.patchNo, sub: r.title, href: `/yama/${r.id}` }); needAsset(r.assetId, `pat:${r.id}`); }
  for (const r of services) { add({ id: `svc:${r.id}`, kind: "service", label: r.serviceNo, href: `/katalog/${r.id}` }); needAsset(r.assetId, `svc:${r.id}`); }
  for (const r of procs) {
    add({ id: `prc:${r.id}`, kind: "process", label: r.recordNo, sub: r.title, href: `${ITIL_PROCESS_BY_KEY[r.process as ItilProcessKey]?.href ?? "/surec"}/${r.id}` });
    needAsset(r.assetId, `prc:${r.id}`);
    if (r.serviceId) links.push({ a: `prc:${r.id}`, b: `svc:${r.serviceId}` });
  }
  for (const r of changes) add({ id: `chg:${r.id}`, kind: "change", label: r.changeNo, href: `/degisiklik/${r.id}` });
  const srcPrefix: Record<string, string> = { INCIDENT: "inc", PROBLEM: "prb", VULNERABILITY: "vul", PATCH: "pat", CHANGE: "chg" };
  for (const r of items) {
    add({ id: `agi:${r.id}`, kind: "agile", label: r.itemNo, sub: r.title, href: `/cevik/is/${r.id}` });
    const pre = r.sourceType ? srcPrefix[r.sourceType.toUpperCase()] : null;
    if (pre && r.sourceId) links.push({ a: `agi:${r.id}`, b: `${pre}:${r.sourceId}` });
  }
  // yalnız var olan düğümleri bağla; bağsız düğümleri ele
  const okLinks = links.filter((l) => ids.has(l.a) && ids.has(l.b));
  const used = new Set(okLinks.flatMap((l) => [l.a, l.b]));
  const finalNodes = nodes.filter((n) => used.has(n.id));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <PageHeader title="İlişki haritası" description="Olay, problem, varlık, hizmet, süreç ve çevik işler arasındaki gerçek bağlantılar." />
      <div className="flex justify-end"><LiveRefresh seconds={45} /></div>
      <Card>
        <CardContent className="pt-6">
          {finalNodes.length ? <RelationGraph nodes={finalNodes} links={okLinks} /> : <p className="text-muted-foreground text-sm">Gösterilecek bağlantı yok.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
