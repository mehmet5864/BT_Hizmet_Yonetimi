// @ts-nocheck
/**
 * Mevcut kayıtlar için geriye dönük puan defteri (idempotent).
 * Giriş puanı kaydı açan kişiye (talep eden / sahip), kapatılmış kayıtlarda tamamlama puanı
 * atanan kişiye (yoksa kaydı açana) yazılır. Aynı kayıt+işlem için olay varsa atlanır.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const BASE = { CREATE: 2, UPDATE: 1, COMPLETE: 4 };
const SEV = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 5 };
const WEIGHT = { request: 1, incident: 2, problem: 3, sla: 2, change: 3, patch: 2, config: 2, vuln: 2, catalog: 1 };
const FINAL = ["DONE", "COMPLETED", "RESOLVED", "CLOSED", "DEPLOYED", "CLEARED"];

async function main() {
  const rules = new Map((await prisma.scoreRule.findMany()).map((r) => [`${r.module}|${r.action}|${r.severity}`, r.points]));
  const people = new Set((await prisma.person.findMany({ select: { id: true } })).map((p) => p.id));
  const existing = new Set((await prisma.scoreEvent.findMany({ select: { entityId: true, action: true } })).map((e) => `${e.entityId}|${e.action}`));
  const data = [];

  const push = (module, action, personId, severity, id, no, at) => {
    if (!personId || !people.has(personId) || existing.has(`${id}|${action}`)) return;
    const sev = SEV[severity] ? severity : "MEDIUM";
    const points = rules.get(`${module}|${action}|${sev}`) ?? BASE[action] * SEV[sev] * (WEIGHT[module] ?? 2);
    data.push({ personId, module, action, severity: sev, points, entityId: id, entityNo: no, createdAt: at });
  };
  const handle = (module, rows, no, creator, handler) => {
    for (const r of rows) {
      const c = creator(r);
      push(module, "CREATE", c, r.severity, r.id, r[no], r.createdAt);
      if (r.status && FINAL.includes(r.status)) push(module, "COMPLETE", handler?.(r) || c, r.severity, r.id, r[no], r.updatedAt);
    }
  };

  handle("request", await prisma.serviceRequest.findMany(), "requestNo", (r) => r.requesterId);
  handle("incident", await prisma.incident.findMany(), "incidentNo", (r) => r.requesterId, (r) => r.l2AnalystId || r.l1AnalystId);
  handle("problem", await prisma.problem.findMany(), "problemNo", (r) => r.requesterId, (r) => r.assigneeId);
  handle("sla", await prisma.slaTicket.findMany(), "ticketNo", (r) => r.requesterId || r.ownerId, (r) => r.ownerId);
  handle("change", await prisma.changeRecord.findMany(), "changeNo", (r) => r.requesterId);
  handle("patch", await prisma.patchRecord.findMany(), "patchNo", (r) => r.requesterId);
  handle("config", await prisma.appConfig.findMany(), "id", (r) => r.ownerId);
  handle("vuln", await prisma.vulnerability.findMany(), "vulnNo", (r) => r.ownerId);
  handle("agile", (await prisma.agileItem.findMany()).map((r) => ({ ...r, severity: r.priority })), "itemNo", (r) => r.reporterId, (r) => r.assigneeId);
  handle("catalog", await prisma.catalogService.findMany(), "serviceNo", (r) => r.requesterId);
  for (const r of await prisma.itilProcessRecord.findMany()) {
    const module = `process:${r.process}`;
    push(module, "CREATE", r.requesterId, r.severity, r.id, r.recordNo, r.createdAt);
    if (FINAL.includes(r.status)) push(module, "COMPLETE", r.ownerId || r.requesterId, r.severity, r.id, r.recordNo, r.updatedAt);
  }
  if (data.length) await prisma.scoreEvent.createMany({ data });
  console.log(`Geriye dönük puan: ${data.length} olay eklendi.`);
}

main().finally(() => prisma.$disconnect());
