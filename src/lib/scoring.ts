import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import {
  defaultScorePoints,
  isScoreSeverity,
  SCORE_FINAL_STATUSES,
  type ScoreAction,
  type ScoreSeverity,
} from "@/lib/scoring-defs";

export async function loadScoreRules() {
  const rows = await prisma.scoreRule.findMany();
  const map = new Map<string, number>();
  for (const row of rows) map.set(`${row.module}|${row.action}|${row.severity}`, row.points);
  return map;
}

export function pointsFor(rules: Map<string, number>, module: string, action: ScoreAction, severity: ScoreSeverity) {
  return rules.get(`${module}|${action}|${severity}`) ?? defaultScorePoints(module, action, severity);
}

type ScoreInput = {
  module: string;
  /** Kayıt yeni mi oluşturuldu */
  created: boolean;
  entityId: string;
  entityNo?: string | null;
  severity?: string | null;
  /** Güncellemeden önceki durum (yeni kayıtta boş) */
  prevStatus?: string | null;
  status?: string | null;
  actorId?: string | null;
};

/**
 * Yapılan işi puanlar. Hata verirse asıl işlemi bozmaz.
 * Oluşturma → CREATE, güncelleme → UPDATE, kapanış durumuna geçiş → COMPLETE (ek olarak).
 */
export async function recordScore(input: ScoreInput) {
  try {
    const actorId = input.actorId ?? (await getViewer())?.id;
    if (!actorId) return;
    const severity: ScoreSeverity = isScoreSeverity(input.severity) ? input.severity : "MEDIUM";
    const actions: ScoreAction[] = [input.created ? "CREATE" : "UPDATE"];
    const wasFinal = input.prevStatus ? SCORE_FINAL_STATUSES.includes(input.prevStatus) : false;
    const isFinal = input.status ? SCORE_FINAL_STATUSES.includes(input.status) : false;
    if (isFinal && !wasFinal) actions.push("COMPLETE");
    // İstismarı önle: aynı kişi aynı kayıt için 30 dk içinde tekrar "güncelleme" puanı almaz;
    // "tamamlama" puanı bir kayıt için yalnızca bir kez verilir (aç-kapa ile tekrarlanamaz).
    const kept: ScoreAction[] = [];
    for (const action of actions) {
      if (action === "UPDATE") {
        const recent = await prisma.scoreEvent.findFirst({
          where: { personId: actorId, entityId: input.entityId, action: "UPDATE", createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
          select: { id: true },
        });
        if (recent) continue;
      }
      if (action === "COMPLETE") {
        const done = await prisma.scoreEvent.findFirst({
          where: { entityId: input.entityId, action: "COMPLETE" },
          select: { id: true },
        });
        if (done) continue;
      }
      kept.push(action);
    }
    if (!kept.length) return;
    const rules = await loadScoreRules();
    await prisma.scoreEvent.createMany({
      data: kept.map((action) => ({
        personId: actorId,
        module: input.module,
        action,
        severity,
        points: pointsFor(rules, input.module, action, severity),
        entityId: input.entityId,
        entityNo: input.entityNo ?? null,
      })),
    });
  } catch (error) {
    console.error("recordScore", error);
  }
}
