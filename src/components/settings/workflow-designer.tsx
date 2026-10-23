"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWorkflow } from "@/lib/actions/workflow";
import { EMPTY_STATE } from "@/lib/actions/shared";
import {
  APPROVER_KINDS,
  APPROVER_LABELS,
  COND_FIELDS,
  ENTITY_LABELS,
  ROLE_OPTIONS,
  validateGraph,
  WORKFLOW_ENTITIES,
  type ApproverKind,
  type EdgeLabel,
  type NodeType,
  type WfEdge,
  type WfGraph,
  type WfNode,
  type WorkflowEntity,
} from "@/lib/workflow/graph";

const NODE_W = 168;
const NODE_H = 64;
const CANVAS_W = 1200;
const CANVAS_H = 620;

const TYPE_STYLE: Record<NodeType, string> = {
  start: "border-sky-500 bg-sky-500/10",
  approval: "border-primary bg-primary/10",
  condition: "border-amber-500 bg-amber-500/10",
  end: "border-emerald-500 bg-emerald-500/10",
};
const TYPE_NAME: Record<NodeType, string> = {
  start: "Başlangıç",
  approval: "Onay adımı",
  condition: "Koşul",
  end: "Bitiş",
};
const EDGE_NAME: Record<EdgeLabel, string> = {
  default: "→",
  approved: "Onay",
  rejected: "Red",
  yes: "Evet",
  no: "Hayır",
};
const EDGE_COLOR: Record<EdgeLabel, string> = {
  default: "#64748b",
  approved: "#10b981",
  rejected: "#ef4444",
  yes: "#10b981",
  no: "#f59e0b",
};

type Person = { id: string; label: string };

let counter = 0;
function uid(prefix: string) {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

export function WorkflowDesigner({
  initial,
  people,
}: {
  initial: { id: string; name: string; entityType: WorkflowEntity; enabled: boolean; graph: WfGraph };
  people: Person[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveWorkflow, EMPTY_STATE);
  const [name, setName] = useState(initial.name);
  const [entity, setEntity] = useState<WorkflowEntity>(initial.entityType);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [nodes, setNodes] = useState<WfNode[]>(initial.graph.nodes);
  const [edges, setEdges] = useState<WfEdge[]>(initial.graph.edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [linking, setLinking] = useState<{ from: string; label: EdgeLabel } | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const graph: WfGraph = useMemo(() => ({ nodes, edges }), [nodes, edges]);
  const errors = useMemo(() => validateGraph(graph), [graph]);
  const sel = nodes.find((n) => n.id === selected) ?? null;

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      if (state.redirectTo && !initial.id) router.push(state.redirectTo);
      else router.refresh();
    } else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  function patchNode(id: string, patch: Partial<WfNode>) {
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function addNode(type: NodeType, outcome?: "approved" | "rejected") {
    const id = uid(type === "approval" ? "a" : type === "condition" ? "c" : "e");
    const base: WfNode = {
      id,
      type,
      x: 260 + (nodes.length % 4) * 30,
      y: 60 + (nodes.length % 6) * 70,
      label: type === "approval" ? "Yeni onay adımı" : type === "condition" ? "Koşul" : outcome === "approved" ? "Onaylandı" : "Reddedildi",
    };
    if (type === "approval") base.approver = { kind: "requestingManager" };
    if (type === "condition") base.cond = { field: COND_FIELDS[entity][0]?.[0] ?? "severity", op: "eq", value: "" };
    if (type === "end") base.outcome = outcome;
    setNodes((list) => [...list, base]);
    setSelected(id);
  }

  function removeNode(id: string) {
    const node = nodes.find((n) => n.id === id);
    if (!node || node.type === "start") return;
    setNodes((list) => list.filter((n) => n.id !== id));
    setEdges((list) => list.filter((e) => e.from !== id && e.to !== id));
    setSelected(null);
    setLinking(null);
  }

  function connect(to: string) {
    if (!linking || linking.from === to) return;
    const target = nodes.find((n) => n.id === to);
    if (!target || target.type === "start") return;
    setEdges((list) => [
      ...list.filter((e) => !(e.from === linking.from && e.label === linking.label)),
      { id: uid("x"), from: linking.from, to, label: linking.label },
    ]);
    setLinking(null);
  }

  function onNodePointerDown(event: React.PointerEvent<HTMLDivElement>, node: WfNode) {
    if (linking) {
      event.preventDefault();
      connect(node.id);
      return;
    }
    setSelected(node.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { id: node.id, dx: event.clientX - rect.left - node.x, dy: event.clientY - rect.top - node.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const x = Math.min(CANVAS_W - NODE_W, Math.max(0, event.clientX - rect.left - d.dx));
    const y = Math.min(CANVAS_H - NODE_H, Math.max(0, event.clientY - rect.top - d.dy));
    patchNode(d.id, { x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 });
  }

  const linkOptions: { label: EdgeLabel; text: string }[] = !sel
    ? []
    : sel.type === "start"
      ? [{ label: "default", text: "İlk adıma bağla" }]
      : sel.type === "approval"
        ? [
            { label: "approved", text: "Onaylanırsa →" },
            { label: "rejected", text: "Reddedilirse →" },
          ]
        : sel.type === "condition"
          ? [
              { label: "yes", text: "Evet ise →" },
              { label: "no", text: "Hayır ise →" },
            ]
          : [];

  const nodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="graph" value={JSON.stringify(graph)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Akış bilgileri</CardTitle>
          <CardDescription>Etkin akış, seçilen kayıt türünde eski tek adımlı onayın yerine geçer. Aynı türde tek akış etkin olabilir.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name">Ad</Label>
            <Input id="wf-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wf-entity">Kayıt türü</Label>
            <select
              id="wf-entity"
              name="entityType"
              value={entity}
              onChange={(e) => setEntity(e.target.value as WorkflowEntity)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              {WORKFLOW_ENTITIES.map((key) => (
                <option key={key} value={key}>
                  {ENTITY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4" />
            Etkin
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Tasarım alanı</CardTitle>
            <CardDescription>
              Düğümleri sürükleyin. Bir düğümü seçin, sağdan bağlantı türünü seçip hedef düğüme tıklayın.
              {linking ? " Şimdi hedef düğüme tıklayın (iptal: boş alana tıklayın)." : ""}
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" onClick={() => addNode("approval")}>
                <Plus className="size-3.5" /> Onay adımı
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addNode("condition")}>
                <Plus className="size-3.5" /> Koşul
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addNode("end", "approved")}>
                <Plus className="size-3.5" /> Bitiş (onay)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addNode("end", "rejected")}>
                <Plus className="size-3.5" /> Bitiş (red)
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border">
              <div
                ref={canvasRef}
                className="relative select-none"
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  backgroundImage: "radial-gradient(circle, rgba(100,116,139,0.28) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
                onPointerMove={onPointerMove}
                onPointerUp={() => (drag.current = null)}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setLinking(null);
                    setSelected(null);
                  }
                }}
              >
                <svg width={CANVAS_W} height={CANVAS_H} className="pointer-events-none absolute inset-0">
                  <defs>
                    {(Object.keys(EDGE_COLOR) as EdgeLabel[]).map((key) => (
                      <marker key={key} id={`arrow-${key}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill={EDGE_COLOR[key]} />
                      </marker>
                    ))}
                  </defs>
                  {edges.map((edge) => {
                    const a = nodeById(edge.from);
                    const b = nodeById(edge.to);
                    if (!a || !b) return null;
                    const x1 = a.x + NODE_W;
                    const y1 = a.y + NODE_H / 2;
                    const x2 = b.x;
                    const y2 = b.y + NODE_H / 2;
                    const dx = Math.max(40, Math.abs(x2 - x1) / 2);
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2;
                    return (
                      <g key={edge.id}>
                        <path
                          d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`}
                          fill="none"
                          stroke={EDGE_COLOR[edge.label]}
                          strokeWidth={2}
                          markerEnd={`url(#arrow-${edge.label})`}
                        />
                        <text x={mx} y={my - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill={EDGE_COLOR[edge.label]}>
                          {EDGE_NAME[edge.label]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => onNodePointerDown(e, node)}
                    className={`absolute flex cursor-grab flex-col justify-center rounded-xl border-2 px-3 text-xs shadow-sm active:cursor-grabbing ${TYPE_STYLE[node.type]} ${
                      selected === node.id ? "ring-primary ring-2 ring-offset-2" : ""
                    } ${linking && linking.from !== node.id && node.type !== "start" ? "outline-primary outline-dashed" : ""}`}
                    style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H, touchAction: "none" }}
                  >
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      {TYPE_NAME[node.type]}
                      {node.type === "end" ? (node.outcome === "approved" ? " · onay" : " · red") : ""}
                    </span>
                    <span className="truncate font-semibold">{node.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{sel ? `${TYPE_NAME[sel.type]} ayarları` : "Düğüm ayarları"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!sel ? <p className="text-muted-foreground">Bir düğüm seçin.</p> : null}
              {sel ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Ad</Label>
                    <Input value={sel.label} onChange={(e) => patchNode(sel.id, { label: e.target.value })} maxLength={60} />
                  </div>

                  {sel.type === "approval" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>Kim onaylar?</Label>
                        <select
                          value={sel.approver?.kind ?? "requestingManager"}
                          onChange={(e) => patchNode(sel.id, { approver: { kind: e.target.value as ApproverKind } })}
                          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                        >
                          {APPROVER_KINDS.filter((k) => entity === "change" || k !== "infosecManager").map((kind) => (
                            <option key={kind} value={kind}>
                              {APPROVER_LABELS[kind]}
                            </option>
                          ))}
                        </select>
                      </div>
                      {sel.approver?.kind === "person" ? (
                        <select
                          value={sel.approver.personId ?? ""}
                          onChange={(e) => patchNode(sel.id, { approver: { kind: "person", personId: e.target.value } })}
                          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                        >
                          <option value="">Kişi seçin…</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {sel.approver?.kind === "role" ? (
                        <select
                          value={sel.approver.role ?? ""}
                          onChange={(e) => patchNode(sel.id, { approver: { kind: "role", role: e.target.value } })}
                          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                        >
                          <option value="">Rol seçin…</option>
                          {ROLE_OPTIONS.map(([value, text]) => (
                            <option key={value} value={value}>
                              {text}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </>
                  ) : null}

                  {sel.type === "condition" ? (
                    <div className="space-y-2">
                      <Label>Koşul</Label>
                      <select
                        value={sel.cond?.field ?? ""}
                        onChange={(e) => patchNode(sel.id, { cond: { field: e.target.value, op: sel.cond?.op ?? "eq", value: sel.cond?.value ?? "" } })}
                        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                      >
                        {COND_FIELDS[entity].length === 0 ? <option value="">Bu türde koşul alanı yok</option> : null}
                        {COND_FIELDS[entity].map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sel.cond?.op ?? "eq"}
                        onChange={(e) =>
                          patchNode(sel.id, { cond: { field: sel.cond?.field ?? "", op: e.target.value as "eq" | "neq" | "in", value: sel.cond?.value ?? "" } })
                        }
                        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                      >
                        <option value="eq">eşittir</option>
                        <option value="neq">eşit değildir</option>
                        <option value="in">şunlardan biri (virgülle)</option>
                      </select>
                      <Input
                        value={sel.cond?.value ?? ""}
                        placeholder="Örn. CRITICAL ya da HIGH,CRITICAL"
                        onChange={(e) =>
                          patchNode(sel.id, { cond: { field: sel.cond?.field ?? "", op: sel.cond?.op ?? "eq", value: e.target.value } })
                        }
                      />
                    </div>
                  ) : null}

                  {linkOptions.length ? (
                    <div className="space-y-1.5">
                      <Label>Bağlantı ekle</Label>
                      <div className="flex flex-wrap gap-2">
                        {linkOptions.map((opt) => (
                          <Button
                            key={opt.label}
                            type="button"
                            size="sm"
                            variant={linking?.from === sel.id && linking.label === opt.label ? "default" : "outline"}
                            onClick={() => setLinking({ from: sel.id, label: opt.label })}
                          >
                            {opt.text}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {edges.filter((e) => e.from === sel.id).length ? (
                    <div className="space-y-1">
                      <Label>Çıkan bağlantılar</Label>
                      {edges
                        .filter((e) => e.from === sel.id)
                        .map((e) => (
                          <div key={e.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                            <span>
                              {EDGE_NAME[e.label]} → {nodeById(e.to)?.label ?? "?"}
                            </span>
                            <button type="button" aria-label="Bağlantıyı sil" onClick={() => setEdges((list) => list.filter((x) => x.id !== e.id))}>
                              <Trash2 className="text-destructive size-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : null}

                  {sel.type !== "start" ? (
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeNode(sel.id)}>
                      <Trash2 className="size-3.5" /> Düğümü sil
                    </Button>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Denetim</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {errors.length === 0 ? (
                <p className="text-emerald-600">Akış geçerli.</p>
              ) : (
                <ul className="list-disc space-y-1 ps-4">
                  {errors.slice(0, 6).map((message, i) => (
                    <li key={i} className="text-amber-700 dark:text-amber-400">
                      {message}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {state.message && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Kaydet
      </Button>
    </form>
  );
}
