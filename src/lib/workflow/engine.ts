import { prisma } from "@/lib/prisma";
import { describeRecord, mailStepApprovers } from "@/lib/workflow/notify";
import {
  advance,
  APPROVER_LABELS,
  parseGraph,
  validateGraph,
  type EdgeLabel,
  type WfFacts,
  type WfGraph,
  type WfNode,
  type WorkflowEntity,
} from "@/lib/workflow/graph";

type Facts = WfFacts & {
  requesterId?: string | null;
  requestingManagerId?: string | null;
  handlingManagerId?: string | null;
  infosecManagerId?: string | null;
};

type HistoryRow = {
  nodeId: string;
  label: string;
  decision: "APPROVED" | "REJECTED";
  actorId: string;
  actorName: string;
  note: string | null;
  at: string;
};

export type WorkflowActor = { id: string; role?: string | null };

async function loadFacts(entity: WorkflowEntity, id: string): Promise<{ facts: Facts; pending: boolean } | null> {
  if (entity === "request") {
    const row = await prisma.serviceRequest.findUnique({
      where: { id },
      select: { status: true, requesterId: true, requestingManagerId: true, handlingManagerId: true, severity: true, office: true, requestType: true },
    });
    if (!row) return null;
    return { facts: { ...row }, pending: row.status === "WAITING" };
  }
  if (entity === "change") {
    const row = await prisma.changeRecord.findUnique({
      where: { id },
      select: { status: true, requesterId: true, requestingManagerId: true, infosecManagerId: true, risk: true, changeType: true },
    });
    if (!row) return null;
    return { facts: { ...row }, pending: row.status === "PENDING" };
  }
  const row = await prisma.patchRecord.findUnique({ where: { id }, select: { status: true, requesterId: true, requestingManagerId: true } });
  if (!row) return null;
  return { facts: { ...row }, pending: row.status === "PENDING" };
}

/** Onay adımı için izin verilen kişi kimlikleri. Boşsa yalnızca süper yönetici onaylayabilir. */
export async function resolveApprovers(node: WfNode, facts: Facts): Promise<string[]> {
  const a = node.approver;
  if (!a) return [];
  if (a.kind === "requestingManager") return facts.requestingManagerId ? [facts.requestingManagerId] : [];
  if (a.kind === "handlingManager") return facts.handlingManagerId ? [facts.handlingManagerId] : [];
  if (a.kind === "infosecManager") return facts.infosecManagerId ? [facts.infosecManagerId] : [];
  if (a.kind === "person") return a.personId ? [a.personId] : [];
  if (a.kind === "role" && a.role) {
    const rows = await prisma.person.findMany({ where: { role: a.role }, select: { id: true }, take: 500 });
    return rows.map((row) => row.id);
  }
  return [];
}

export function approverText(node: WfNode) {
  const a = node.approver;
  if (!a) return "-";
  if (a.kind === "role") return `${APPROVER_LABELS.role}: ${a.role}`;
  return APPROVER_LABELS[a.kind];
}

export async function findActiveDefinition(entity: WorkflowEntity) {
  const defs = await prisma.workflowDefinition.findMany({
    where: { entityType: entity, enabled: true },
    orderBy: { updatedAt: "desc" },
    take: 1,
  });
  return defs[0] ?? null;
}

type Step = ReturnType<typeof advance>;

/**
 * Sıradaki onay adımının tek onaycısı az önce işlem yapan kişiyse (ör. aynı kişi hem talep eden hem karşılayan amir)
 * adımı otomatik geçer. allowTerminal=false iken zincir bitmeden önce durur (son adım gerçekten onaylanmalı).
 */
async function settle(
  graph: WfGraph,
  step: Step,
  facts: Facts,
  history: HistoryRow[],
  actorId: string | null | undefined,
  actorName: string,
  allowTerminal: boolean,
): Promise<Step> {
  let cur = step;
  for (let i = 0; i < 10 && actorId; i += 1) {
    if (cur.state !== "WAITING") break;
    const waitingId: string = cur.nodeId;
    const node = graph.nodes.find((n) => n.id === waitingId);
    if (!node) break;
    const approvers = await resolveApprovers(node, facts);
    if (!approvers.length || !approvers.every((id) => id === actorId)) break;
    const next = advance(graph, node.id, facts, "approved");
    if (!allowTerminal && next.state !== "WAITING") break;
    history.push({
      nodeId: node.id,
      label: node.label,
      decision: "APPROVED",
      actorId,
      actorName,
      note: "Aynı kişi önceki adımda işlem yaptığı için otomatik geçildi.",
      at: new Date().toISOString(),
    });
    cur = next;
  }
  return cur;
}

/** Kayıt onay bekleyen durumdaysa ve bu tür için etkin bir akış varsa örnek başlatır. */
export async function startWorkflowIfAny(entity: WorkflowEntity, entityId: string, opts: { notify?: boolean } = {}) {
  const existing = await prisma.workflowInstance.findUnique({ where: { entityType_entityId: { entityType: entity, entityId } } });
  if (existing) return existing;
  const def = await findActiveDefinition(entity);
  if (!def) return null;
  const graph = parseGraph(def.graph);
  if (validateGraph(graph).length) return null;
  const loaded = await loadFacts(entity, entityId);
  if (!loaded || !loaded.pending) return null;
  const start = graph.nodes.find((n) => n.type === "start");
  if (!start) return null;
  const history: HistoryRow[] = [];
  const requesterName = loaded.facts.requesterId
    ? (await prisma.person.findUnique({ where: { id: loaded.facts.requesterId }, select: { fullName: true } }))?.fullName ?? "-"
    : "-";
  const first = advance(graph, start.id, loaded.facts);
  const step = await settle(graph, first, loaded.facts, history, loaded.facts.requesterId, requesterName, false);
  if (step.state !== "WAITING") return null;
  const created = await prisma.workflowInstance.create({
    data: {
      definitionId: def.id,
      entityType: entity,
      entityId,
      status: "RUNNING",
      currentNodeId: step.nodeId,
      history: JSON.stringify(history),
      graph: JSON.stringify(graph),
    },
  });
  if (opts.notify !== false) {
    const stepNodeId: string = step.nodeId;
    const node = graph.nodes.find((n) => n.id === stepNodeId);
    if (node) {
      const approverIds = await resolveApprovers(node, loaded.facts);
      await mailStepApprovers({ entity, entityId, stepLabel: node.label, approverIds }).catch(() => null);
    }
  }
  return created;
}

export type WorkflowDecision =
  | { ok: false; message: string }
  | { ok: true; state: "RUNNING"; message: string }
  | { ok: true; state: "APPROVED" | "REJECTED"; message: string; undo: () => Promise<void> };

/**
 * Onay kararını akışa işler. Akış yoksa null döner (eski tek adımlı onay çalışır).
 * Akış sonuçlanırsa çağıran kayıt durumunu günceller; bir ön koşul başarısız olursa undo() ile adım geri alınır.
 */
export async function decideWorkflowFor(
  entity: WorkflowEntity,
  entityId: string,
  actor: WorkflowActor,
  decision: "APPROVED" | "REJECTED",
  note?: string | null,
): Promise<WorkflowDecision | null> {
  let instance = await prisma.workflowInstance.findUnique({ where: { entityType_entityId: { entityType: entity, entityId } } });
  if (!instance) instance = await startWorkflowIfAny(entity, entityId, { notify: false });
  if (!instance) return null;
  if (instance.status !== "RUNNING") return null;

  const graph: WfGraph = parseGraph(instance.graph);
  const node = graph.nodes.find((n) => n.id === instance!.currentNodeId);
  if (!node || node.type !== "approval") return null;

  const loaded = await loadFacts(entity, entityId);
  if (!loaded) return { ok: false, message: "Kayıt bulunamadı." };
  const approvers = await resolveApprovers(node, loaded.facts);
  const allowed = actor.role === "SUPER_ADMIN" || approvers.includes(actor.id);
  if (!allowed) {
    return { ok: false, message: `Sıradaki onay adımı "${node.label}" (${approverText(node)}). Bu adımı onaylama yetkiniz yok.` };
  }

  const person = await prisma.person.findUnique({ where: { id: actor.id }, select: { fullName: true } });
  const history: HistoryRow[] = (() => {
    try {
      return JSON.parse(instance!.history) as HistoryRow[];
    } catch {
      return [];
    }
  })();
  const before = { status: instance.status, currentNodeId: instance.currentNodeId, history: instance.history };
  history.push({
    nodeId: node.id,
    label: node.label,
    decision,
    actorId: actor.id,
    actorName: person?.fullName ?? "-",
    note: note?.trim() || null,
    at: new Date().toISOString(),
  });

  const via: EdgeLabel = decision === "APPROVED" ? "approved" : "rejected";
  const advanced = advance(graph, node.id, loaded.facts, via);
  const next = decision === "APPROVED"
    ? await settle(graph, advanced, loaded.facts, history, actor.id, person?.fullName ?? "-", true)
    : advanced;
  const instanceId = instance.id;
  const undo = async () => {
    await prisma.workflowInstance.update({ where: { id: instanceId }, data: before });
  };

  if (next.state === "WAITING") {
    const nextNodeId: string = next.nodeId;
    const nextNode = graph.nodes.find((n) => n.id === nextNodeId);
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { currentNodeId: next.nodeId, history: JSON.stringify(history) },
    });
    if (nextNode) {
      const approverIds = await resolveApprovers(nextNode, loaded.facts);
      await mailStepApprovers({ entity, entityId, stepLabel: nextNode.label, approverIds }).catch(() => null);
    }
    return {
      ok: true,
      state: "RUNNING",
      message: `"${node.label}" adımı kaydedildi. Sıradaki adım: ${nextNode?.label ?? "-"} (${nextNode ? approverText(nextNode) : "-"}).`,
    };
  }

  await prisma.workflowInstance.update({
    where: { id: instanceId },
    data: { status: next.state, currentNodeId: null, history: JSON.stringify(history) },
  });
  return { ok: true, state: next.state, message: next.state === "APPROVED" ? "Onay zinciri tamamlandı." : "Onay zinciri reddedildi.", undo };
}

export async function getInstance(entity: WorkflowEntity, entityId: string) {
  return prisma.workflowInstance.findUnique({ where: { entityType_entityId: { entityType: entity, entityId } } });
}

export type PendingStep = {
  instanceId: string;
  entity: WorkflowEntity;
  entityId: string;
  recordNo: string;
  title: string;
  stepLabel: string;
  workflowName: string;
};

/** Görüntüleyenin onaylayabileceği, çalışan akış adımları. */
export async function listPendingFor(viewerId: string, isSuper: boolean): Promise<PendingStep[]> {
  const rows = await prisma.workflowInstance.findMany({
    where: { status: "RUNNING" },
    orderBy: { updatedAt: "asc" },
    take: 300,
    include: { definition: { select: { name: true } } },
  });
  const out: PendingStep[] = [];
  for (const row of rows) {
    const entity = row.entityType as WorkflowEntity;
    const graph = parseGraph(row.graph);
    const node = graph.nodes.find((n) => n.id === row.currentNodeId);
    if (!node) continue;
    const loaded = await loadFacts(entity, row.entityId);
    if (!loaded || !loaded.pending) continue;
    if (!isSuper) {
      const approvers = await resolveApprovers(node, loaded.facts);
      if (!approvers.includes(viewerId)) continue;
    }
    const info = await describeRecord(entity, row.entityId);
    const recordNo = info?.no ?? row.entityId;
    const title = info?.title ?? "";
    out.push({ instanceId: row.id, entity, entityId: row.entityId, recordNo, title, stepLabel: node.label, workflowName: row.definition.name });
  }
  return out;
}
