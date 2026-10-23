import Link from "next/link";

import { ModuleHero } from "@/components/dashboard/module-widgets";
import { WorkflowDesigner } from "@/components/settings/workflow-designer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteWorkflow } from "@/lib/actions/workflow";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { defaultGraph, ENTITY_LABELS, parseGraph, WORKFLOW_ENTITIES, type WorkflowEntity } from "@/lib/workflow/graph";

export const dynamic = "force-dynamic";

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WorkflowsPage({ searchParams }: PageProps<"/ayarlar/is-akislari">) {
  const viewer = await getViewer();
  if (viewer?.role !== "SUPER_ADMIN") {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <ModuleHero title="İş akışları" description="İş akışları yalnızca süper yönetici tarafından yönetilir." />
      </div>
    );
  }

  const params = await searchParams;
  const id = pick(params.id);
  const yeni = pick(params.yeni);

  const [defs, people] = await Promise.all([
    prisma.workflowDefinition.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.person.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true }, take: 2000 }),
  ]);
  const peopleOptions = people.map((p) => ({ id: p.id, label: p.fullName }));

  const current = id ? defs.find((d) => d.id === id) : null;
  const newEntity = (WORKFLOW_ENTITIES as readonly string[]).includes(yeni ?? "") ? (yeni as WorkflowEntity) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="İş akışları"
        description="Talep, değişiklik ve yama için çok adımlı onay zincirlerini görsel olarak çizin: onay adımları, koşullu dallar ve sonuçlar."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar">Ayarlara dön</Link>
          </Button>
        }
      />

      {current || newEntity ? (
        <>
          <div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/ayarlar/is-akislari">← Listeye dön</Link>
            </Button>
          </div>
          <WorkflowDesigner
            key={current?.id ?? `yeni-${newEntity}`}
            initial={
              current
                ? { id: current.id, name: current.name, entityType: current.entityType as WorkflowEntity, enabled: current.enabled, graph: parseGraph(current.graph) }
                : { id: "", name: `Yeni ${ENTITY_LABELS[newEntity!].toLowerCase()} onay akışı`, entityType: newEntity!, enabled: newEntity === "request", graph: defaultGraph(newEntity!) }
            }
            people={peopleOptions}
          />
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yeni akış</CardTitle>
              <CardDescription>Başlangıç şablonu: tek adımlı amir onayı. Üzerine adım ve koşul ekleyebilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {WORKFLOW_ENTITIES.map((key) => (
                <Button key={key} asChild size="sm">
                  <Link href={`/ayarlar/is-akislari?yeni=${key}`}>{ENTITY_LABELS[key]} akışı oluştur</Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tanımlı akışlar</CardTitle>
              <CardDescription>Etkin akış, kayıt türünde eski tek adımlı onayın yerine geçer. Onay bekleyenler: İş akışı onaylarım sayfasında.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {defs.length === 0 ? <p className="text-muted-foreground text-sm">Henüz akış yok.</p> : null}
              {defs.map((def) => (
                <div key={def.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{def.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {ENTITY_LABELS[def.entityType as WorkflowEntity] ?? def.entityType} · {parseGraph(def.graph).nodes.length} düğüm
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={def.enabled ? "default" : "secondary"}>{def.enabled ? "Etkin" : "Taslak"}</Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/ayarlar/is-akislari?id=${def.id}`}>Düzenle</Link>
                    </Button>
                    <form action={deleteWorkflow}>
                      <input type="hidden" name="id" value={def.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Sil
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
