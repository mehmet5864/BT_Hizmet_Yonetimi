import { prisma } from "@/lib/prisma";
import { SCORE_MODULES } from "@/lib/scoring-defs";

export type PersonStat = {
  opened: number;
  closed: number;
  otherCreated: number;
  otherUpdated: number;
  otherCompleted: number;
  points: number;
  byModule: { module: string; created: number; updated: number; completed: number; points: number }[];
};

const TICKET_MODULES = new Set(SCORE_MODULES.filter((m) => m.ticket).map((m) => m.key));

export function emptyStat(): PersonStat {
  return { opened: 0, closed: 0, otherCreated: 0, otherUpdated: 0, otherCompleted: 0, points: 0, byModule: [] };
}

export async function getPersonStats(personIds?: string[], range?: { from?: Date; to?: Date }) {
  const rows = await prisma.scoreEvent.groupBy({
    by: ["personId", "module", "action"],
    where: {
      ...(personIds ? { personId: { in: personIds } } : {}),
      ...(range?.from || range?.to
        ? { createdAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
        : {}),
    },
    _count: { _all: true },
    _sum: { points: true },
  });
  const result = new Map<string, PersonStat>();
  for (const row of rows) {
    const stat = result.get(row.personId) ?? emptyStat();
    result.set(row.personId, stat);
    const count = row._count._all;
    const points = row._sum.points ?? 0;
    stat.points += points;
    const ticket = TICKET_MODULES.has(row.module);
    if (ticket) {
      if (row.action === "CREATE") stat.opened += count;
      if (row.action === "COMPLETE") stat.closed += count;
    } else {
      if (row.action === "CREATE") stat.otherCreated += count;
      if (row.action === "UPDATE") stat.otherUpdated += count;
      if (row.action === "COMPLETE") stat.otherCompleted += count;
    }
    let mod = stat.byModule.find((m) => m.module === row.module);
    if (!mod) {
      mod = { module: row.module, created: 0, updated: 0, completed: 0, points: 0 };
      stat.byModule.push(mod);
    }
    if (row.action === "CREATE") mod.created += count;
    if (row.action === "UPDATE") mod.updated += count;
    if (row.action === "COMPLETE") mod.completed += count;
    mod.points += points;
  }
  return result;
}
