import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInstance } from "@/lib/workflow/engine";
import { parseGraph, type WorkflowEntity } from "@/lib/workflow/graph";

type Row = { label: string; decision: "APPROVED" | "REJECTED"; actorName: string; note: string | null; at: string };

/** Kaydın onay zinciri: tamamlanan adımlar ve sıradaki adım. Zincir yoksa hiçbir şey göstermez. */
export async function WorkflowProgress({ entity, entityId }: { entity: WorkflowEntity; entityId: string }) {
  const instance = await getInstance(entity, entityId).catch(() => null);
  if (!instance) return null;
  const graph = parseGraph(instance.graph);
  const current = graph.nodes.find((n) => n.id === instance.currentNodeId);
  let rows: Row[] = [];
  try {
    rows = JSON.parse(instance.history) as Row[];
  } catch {
    rows = [];
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Onay zinciri</CardTitle>
        <CardDescription>
          {instance.status === "RUNNING"
            ? `Sıradaki adım: ${current?.label ?? "-"}`
            : instance.status === "APPROVED"
              ? "Zincir tamamlandı: onaylandı."
              : "Zincir tamamlandı: reddedildi."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? <p className="text-muted-foreground">Henüz işlem yapılmadı.</p> : null}
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="text-muted-foreground text-xs">
                {row.actorName} · {new Date(row.at).toLocaleString("tr-TR")}
                {row.note ? ` · ${row.note}` : ""}
              </p>
            </div>
            <Badge variant={row.decision === "APPROVED" ? "default" : "destructive"}>{row.decision === "APPROVED" ? "Onaylandı" : "Reddedildi"}</Badge>
          </div>
        ))}
        {instance.status === "RUNNING" && current ? (
          <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
            <p className="font-medium">{current.label}</p>
            <Badge variant="secondary">Bekliyor</Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
