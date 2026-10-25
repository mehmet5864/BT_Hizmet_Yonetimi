import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessRulePanel, type RuleRow } from "@/components/topology/access-rule-panel";
import { RelationPanel, type RelationRow } from "@/components/topology/relation-panel";
import { ReferencePanel, type ReferenceRow } from "@/components/topology/reference-panel";
import { ServiceSelect } from "@/components/topology/service-select";
import { TopologyDiagram } from "@/components/topology/topology-diagram";
import { ModuleHero } from "@/components/dashboard/module-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { param } from "@/lib/search-params";
import { canUseTopology } from "@/lib/topology/access";
import { assetLabel, buildServiceTopology } from "@/lib/topology/build";

export const dynamic = "force-dynamic";

export default async function TopologyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer || !canUseTopology(viewer.role)) redirect(viewer ? "/yetkisiz" : "/giris");

  const params = await searchParams;
  const serviceId = param(params, "hizmet") ?? "";
  const editParam = param(params, "duzenle") ?? "";

  const service = serviceId
    ? await prisma.catalogService.findUnique({
        where: { id: serviceId },
        select: {
          id: true,
          name: true,
          serviceNo: true,
          assetId: true,
          accessRules: { orderBy: { createdAt: "asc" }, select: { id: true, audience: true, kind: true, ports: true, note: true } },
        },
      })
    : null;
  const editAssetId = editParam || service?.assetId || "";

  const allServices = await prisma.catalogService.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, serviceNo: true, asset: { select: { name: true } } },
  });
  const serviceOptions = allServices.map((s) => ({ id: s.id, label: s.name, sub: [s.serviceNo, s.asset?.name].filter(Boolean).join(" · ") }));

  const [layoutRows, noteRows, refRows] = await Promise.all([
    service ? prisma.topologyLayout.findMany({ where: { serviceId: service.id }, select: { nodeKey: true, x: true, y: true } }) : Promise.resolve([]),
    service ? prisma.topologyNote.findMany({ where: { serviceId: service.id }, orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    prisma.topologyReference.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const initialPositions = Object.fromEntries(layoutRows.map((l) => [l.nodeKey, { x: l.x, y: l.y }]));
  const initialNotes = noteRows.map((n) => ({ id: n.id, nodeKey: n.nodeKey, text: n.text, author: n.author, createdAt: n.createdAt.toISOString() }));
  const references: ReferenceRow[] = refRows.map((r) => ({ id: r.id, title: r.title, url: r.url, kind: r.kind, note: r.note, uploadedBy: r.uploadedBy, createdAt: r.createdAt.toISOString() }));

  const [graph, editAsset, relations] = await Promise.all([
    service ? buildServiceTopology(service.id) : Promise.resolve({ nodes: [], edges: [], note: "Topoloji için hizmet kataloğundan bir hizmet seçin." }),
    editAssetId ? prisma.asset.findUnique({ where: { id: editAssetId }, select: { id: true, name: true, stockNo: true, assetType: true, brand: true, model: true } }) : Promise.resolve(null),
    editAssetId
      ? prisma.assetRelation.findMany({
          where: { OR: [{ sourceId: editAssetId }, { targetId: editAssetId }] },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            sourceId: true,
            relationType: true,
            port: true,
            protocol: true,
            note: true,
            source: { select: { name: true, stockNo: true, assetType: true, brand: true, model: true } },
            target: { select: { name: true, stockNo: true, assetType: true, brand: true, model: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const serviceInitial = service ? { id: service.id, label: service.name, sub: service.serviceNo } : null;
  const rules: RuleRow[] = service ? service.accessRules.map((r) => ({ id: r.id, audience: r.audience, kind: r.kind, ports: r.ports, note: r.note })) : [];
  const relationRows: RelationRow[] = relations.map((r) => ({
    id: r.id,
    direction: r.sourceId === editAssetId ? "out" : "in",
    otherLabel: assetLabel(r.sourceId === editAssetId ? r.target : r.source),
    type: r.relationType,
    port: r.port,
    protocol: r.protocol,
    note: r.note,
  }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-8">
      <ModuleHero
        title="Topoloji"
        description="Hizmet kataloğundan bir hizmet seçin: ağ yolu (anahtar, güvenlik duvarı, omurga/yük dengeleyici/DMZ), sunucular, işletim sistemleri, SAN/depolama ve kullanıcı ağlarının port / protokol bazında erişimi kendiliğinden çizilir."
      />

      <Card>
        <CardContent className="pt-6">
          <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <label htmlFor="f-hizmet" className="text-xs font-medium">Hizmet</label>
              <ServiceSelect id="f-hizmet" name="hizmet" options={serviceOptions} value={service?.id} />
            </div>
            {!serviceOptions.length ? <p className="text-muted-foreground text-xs sm:col-span-2">Hizmet kataloğunda kayıtlı hizmet yok. Önce Hizmet kataloğu menüsünden hizmet ekleyin.</p> : null}
            <div className="flex items-end gap-2">
              <Button type="submit">Topolojiyi çiz</Button>
              {service ? (
                <Button asChild variant="outline">
                  <Link href={`/katalog/${service.id}`}>Hizmet kaydı</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <TopologyDiagram key={`${service?.id ?? "-"}`} graph={graph} name={`topoloji-${service?.name ?? "hizmet"}`} serviceId={service?.id} initialPositions={initialPositions} initialNotes={initialNotes} />

      {service ? (
        <p className="text-muted-foreground rounded-md border p-3 text-xs leading-relaxed">
          Nasıl çizilir: Topoloji kayıtlardan kendiliğinden çıkar. Hizmetin bağlı varlığı, çalıştığı sunucular ve sunucuların bağlı olduğu ağ cihazları (güvenlik duvarı, anahtar, yük dengeleyici, SAN, depolama) varlık ilişkilerinden bulunur; kullanıcı birimleri hizmete açılan olay ve süreç kayıtlarından gelir. Kesikli oklar tahmindir; aşağıdaki “Erişim kuralları” ile kesinleştirin, ağ cihazı eksikse varlığa “bağlanır” ilişkisi ekleyin.
        </p>
      ) : null}
      {service ? <AccessRulePanel serviceId={service.id} serviceName={service.name} rows={rules} /> : null}
      <ReferencePanel rows={references} />
      {editAsset ? <RelationPanel assetId={editAsset.id} assetLabel={assetLabel(editAsset)} rows={relationRows} /> : null}
    </div>
  );
}
