/** İş akışı grafı: tür tanımları, doğrulama ve yürütme yardımcıları. İstemci ve sunucuda kullanılabilir (saf kod). */

export const WORKFLOW_ENTITIES = ["request", "change", "patch"] as const;
export type WorkflowEntity = (typeof WORKFLOW_ENTITIES)[number];

export const ENTITY_LABELS: Record<WorkflowEntity, string> = {
  request: "Talep",
  change: "Değişiklik",
  patch: "Yama",
};

export type NodeType = "start" | "approval" | "condition" | "end";
export type EdgeLabel = "default" | "approved" | "rejected" | "yes" | "no";

export const APPROVER_KINDS = ["requestingManager", "handlingManager", "infosecManager", "person", "role"] as const;
export type ApproverKind = (typeof APPROVER_KINDS)[number];

export const APPROVER_LABELS: Record<ApproverKind, string> = {
  requestingManager: "Talep eden birim amiri",
  handlingManager: "İşleyen birim amiri",
  infosecManager: "Bilgi güvenliği yöneticisi",
  person: "Belirli kişi",
  role: "Roldeki herhangi biri",
};

export const ROLE_OPTIONS = [
  ["SYSTEM_ADMIN", "Sistem yöneticisi"],
  ["UNIT_MANAGER", "Birim amiri"],
  ["SENIOR_MANAGER", "Üst yönetici"],
  ["INFOSEC_MANAGER", "Bilgi güvenliği yöneticisi"],
  ["SUPER_ADMIN", "Süper yönetici"],
] as const;

export const COND_FIELDS: Record<WorkflowEntity, [string, string][]> = {
  request: [
    ["severity", "Önem (LOW/MEDIUM/HIGH/CRITICAL)"],
    ["office", "Büro"],
    ["requestType", "Talep türü"],
  ],
  change: [
    ["risk", "Risk (LOW/MEDIUM/HIGH/CRITICAL)"],
    ["changeType", "Tür (STANDARD/NORMAL/EMERGENCY)"],
  ],
  patch: [],
};

export type WfNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  approver?: { kind: ApproverKind; personId?: string; role?: string };
  cond?: { field: string; op: "eq" | "neq" | "in"; value: string };
  outcome?: "approved" | "rejected";
};

export type WfEdge = { id: string; from: string; to: string; label: EdgeLabel };
export type WfGraph = { nodes: WfNode[]; edges: WfEdge[] };

export type WfFacts = Record<string, string | null | undefined>;

export function emptyGraph(): WfGraph {
  return {
    nodes: [
      { id: "start", type: "start", x: 40, y: 140, label: "Başlangıç" },
      { id: "end-ok", type: "end", x: 700, y: 60, label: "Onaylandı", outcome: "approved" },
      { id: "end-no", type: "end", x: 700, y: 240, label: "Reddedildi", outcome: "rejected" },
    ],
    edges: [],
  };
}

export function defaultGraph(entity: WorkflowEntity): WfGraph {
  const g = emptyGraph();
  if (entity === "request") {
    g.nodes.push(
      { id: "a1", type: "approval", x: 250, y: 140, label: "Talep eden birim amiri", approver: { kind: "requestingManager" } },
      { id: "a2", type: "approval", x: 470, y: 140, label: "Karşılayan amir", approver: { kind: "handlingManager" } },
    );
    g.edges.push(
      { id: "e1", from: "start", to: "a1", label: "default" },
      { id: "e2", from: "a1", to: "a2", label: "approved" },
      { id: "e3", from: "a1", to: "end-no", label: "rejected" },
      { id: "e4", from: "a2", to: "end-ok", label: "approved" },
      { id: "e5", from: "a2", to: "end-no", label: "rejected" },
    );
    return g;
  }
  if (entity === "change") {
    // DevSecOps güvenlik kapılı yayın: yüksek/kritik riskte bilgi güvenliği ve üst yönetici de onaylar.
    g.nodes.push(
      { id: "a1", type: "approval", x: 220, y: 140, label: "Birim amiri onayı", approver: { kind: "requestingManager" } },
      { id: "c1", type: "condition", x: 400, y: 140, label: "Risk yüksek mi?", cond: { field: "risk", op: "in", value: "HIGH,CRITICAL" } },
      { id: "a2", type: "approval", x: 540, y: 60, label: "Bilgi güvenliği (güvenlik kapısı)", approver: { kind: "infosecManager" } },
      { id: "a3", type: "approval", x: 700, y: 60, label: "Üst yönetici (CAB)", approver: { kind: "role", role: "SENIOR_MANAGER" } },
    );
    g.nodes = g.nodes.map((n) => (n.id === "end-ok" ? { ...n, x: 860, y: 140 } : n.id === "end-no" ? { ...n, x: 860, y: 280 } : n));
    g.edges.push(
      { id: "e1", from: "start", to: "a1", label: "default" },
      { id: "e2", from: "a1", to: "c1", label: "approved" },
      { id: "e3", from: "a1", to: "end-no", label: "rejected" },
      { id: "e4", from: "c1", to: "a2", label: "yes" },
      { id: "e5", from: "c1", to: "end-ok", label: "no" },
      { id: "e6", from: "a2", to: "a3", label: "approved" },
      { id: "e7", from: "a2", to: "end-no", label: "rejected" },
      { id: "e8", from: "a3", to: "end-ok", label: "approved" },
      { id: "e9", from: "a3", to: "end-no", label: "rejected" },
    );
    return g;
  }
  g.nodes.push({
    id: "a1",
    type: "approval",
    x: 280,
    y: 140,
    label: entity === "change" ? "Birim amiri onayı" : "Amir onayı",
    approver: { kind: "requestingManager" },
  });
  g.edges.push(
    { id: "e1", from: "start", to: "a1", label: "default" },
    { id: "e2", from: "a1", to: "end-ok", label: "approved" },
    { id: "e3", from: "a1", to: "end-no", label: "rejected" },
  );
  return g;
}

export function parseGraph(raw: string | null | undefined): WfGraph {
  try {
    const value = JSON.parse(raw ?? "{}") as Partial<WfGraph>;
    if (!value || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return emptyGraph();
    return { nodes: value.nodes as WfNode[], edges: value.edges as WfEdge[] };
  } catch {
    return emptyGraph();
  }
}

const EDGE_OK: Record<NodeType, EdgeLabel[]> = {
  start: ["default"],
  approval: ["approved", "rejected"],
  condition: ["yes", "no"],
  end: [],
};

/** Hata listesi döndürür; boşsa graf geçerlidir. */
export function validateGraph(graph: WfGraph): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id || ids.has(node.id)) errors.push(`Tekrarlı ya da boş düğüm kimliği: ${node.id}`);
    ids.add(node.id);
  }
  const starts = graph.nodes.filter((n) => n.type === "start");
  if (starts.length !== 1) errors.push("Tam olarak bir Başlangıç düğümü olmalı.");
  const ends = graph.nodes.filter((n) => n.type === "end");
  if (!ends.length) errors.push("En az bir Bitiş düğümü olmalı.");
  if (!graph.nodes.some((n) => n.type === "approval")) errors.push("En az bir Onay adımı olmalı.");

  for (const edge of graph.edges) {
    const from = graph.nodes.find((n) => n.id === edge.from);
    const to = graph.nodes.find((n) => n.id === edge.to);
    if (!from || !to) {
      errors.push("Bağlantı olmayan bir düğüme gidiyor.");
      continue;
    }
    if (!EDGE_OK[from.type].includes(edge.label)) errors.push(`"${from.label}" düğümünde geçersiz bağlantı türü.`);
    if (to.type === "start") errors.push("Başlangıç düğümüne bağlantı girilemez.");
  }

  for (const node of graph.nodes) {
    const out = graph.edges.filter((e) => e.from === node.id);
    for (const label of EDGE_OK[node.type]) {
      if (out.filter((e) => e.label === label).length > 1) errors.push(`"${node.label}" düğümünde "${label}" bağlantısı birden fazla.`);
    }
    if (node.type === "start" && !out.length) errors.push("Başlangıç bir adıma bağlanmalı.");
    if (node.type === "approval") {
      if (!out.some((e) => e.label === "approved")) errors.push(`"${node.label}": onaylanırsa gidilecek adım bağlanmalı.`);
      const a = node.approver;
      if (!a || !APPROVER_KINDS.includes(a.kind)) errors.push(`"${node.label}": onaycı seçilmeli.`);
      else if (a.kind === "person" && !a.personId) errors.push(`"${node.label}": kişi seçilmeli.`);
      else if (a.kind === "role" && !a.role) errors.push(`"${node.label}": rol seçilmeli.`);
    }
    if (node.type === "condition") {
      if (!out.some((e) => e.label === "yes") || !out.some((e) => e.label === "no")) {
        errors.push(`"${node.label}": Evet ve Hayır bağlantıları gerekli.`);
      }
      if (!node.cond?.field || !node.cond.value?.trim()) errors.push(`"${node.label}": koşul eksik.`);
    }
    if (node.type === "end" && node.outcome !== "approved" && node.outcome !== "rejected") {
      errors.push(`"${node.label}": sonuç (onay/red) seçilmeli.`);
    }
    if (node.type === "end" && out.length) errors.push(`"${node.label}": bitiş düğümünden bağlantı çıkamaz.`);
  }

  // Döngü ve erişilebilirlik
  const start = starts[0];
  if (start && errors.length === 0) {
    const reach = new Set<string>();
    const stack: string[] = [];
    const visit = (id: string): boolean => {
      if (stack.includes(id)) return false;
      if (reach.has(id)) return true;
      reach.add(id);
      stack.push(id);
      for (const e of graph.edges.filter((x) => x.from === id)) {
        if (!visit(e.to)) return false;
      }
      stack.pop();
      return true;
    };
    if (!visit(start.id)) errors.push("Akışta döngü var; geriye bağlantı çizilemez.");
    for (const node of graph.nodes) {
      if (!reach.has(node.id)) errors.push(`"${node.label}" başlangıçtan ulaşılamıyor.`);
    }
  }
  return errors;
}

export function evalCondition(cond: NonNullable<WfNode["cond"]>, facts: WfFacts): boolean {
  const actual = String(facts[cond.field] ?? "").trim().toLowerCase();
  const wanted = cond.value.trim().toLowerCase();
  if (cond.op === "in") return wanted.split(",").map((s) => s.trim()).includes(actual);
  if (cond.op === "neq") return actual !== wanted;
  return actual === wanted;
}

export type AdvanceResult =
  | { state: "WAITING"; nodeId: string }
  | { state: "APPROVED" | "REJECTED" };

/** Verilen düğümden başlayarak koşulları geçer; onay adımında durur ya da bitişe ulaşır. */
export function advance(graph: WfGraph, fromNodeId: string, facts: WfFacts, via?: EdgeLabel): AdvanceResult {
  let current = graph.nodes.find((n) => n.id === fromNodeId);
  let label: EdgeLabel | undefined = via;
  for (let step = 0; step < 100 && current; step += 1) {
    if (current.type === "end") return { state: current.outcome === "approved" ? "APPROVED" : "REJECTED" };
    if (current.type === "approval" && !label) return { state: "WAITING", nodeId: current.id };
    let take: EdgeLabel;
    if (label) take = label;
    else if (current.type === "condition") take = current.cond && evalCondition(current.cond, facts) ? "yes" : "no";
    else take = "default";
    const edge = graph.edges.find((e) => e.from === current!.id && e.label === take);
    if (!edge) return { state: "REJECTED" };
    current = graph.nodes.find((n) => n.id === edge.to);
    label = undefined;
  }
  return { state: "REJECTED" };
}
