/** Olay önceliği (etki × aciliyet) ve SLA süreleri. Süreler takvim saatiyle hesaplanır. */

export const IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Level = (typeof IMPACT_LEVELS)[number];
export const LEVEL_LABELS: Record<Level, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek" };

export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: "P1 — Kritik",
  P2: "P2 — Yüksek",
  P3: "P3 — Orta",
  P4: "P4 — Düşük",
};

/** Önceliğe göre hedefler (dakika): ilk yanıt ve çözüm. */
export const INCIDENT_SLA: Record<Priority, { respondMin: number; resolveMin: number }> = {
  P1: { respondMin: 15, resolveMin: 4 * 60 },
  P2: { respondMin: 30, resolveMin: 8 * 60 },
  P3: { respondMin: 2 * 60, resolveMin: 24 * 60 },
  P4: { respondMin: 8 * 60, resolveMin: 72 * 60 },
};

/** Talep çözüm hedefi (saat), önem derecesine göre. */
export const REQUEST_SLA_HOURS: Record<string, number> = { CRITICAL: 8, HIGH: 24, MEDIUM: 72, LOW: 120 };

const score = (v: string | null | undefined) => (v === "HIGH" ? 3 : v === "MEDIUM" ? 2 : v === "LOW" ? 1 : 0);

export function isLevel(v: string | null | undefined): v is Level {
  return !!v && (IMPACT_LEVELS as readonly string[]).includes(v);
}

/** Etki ve aciliyet verilmişse matristen, yoksa önem derecesinden öncelik türetir. */
export function derivePriority(input: {
  impact?: string | null;
  urgency?: string | null;
  severity?: string | null;
  isMajor?: boolean;
}): Priority {
  if (input.isMajor) return "P1";
  const i = score(input.impact);
  const u = score(input.urgency);
  if (i && u) {
    const p = i * u;
    if (p >= 9) return "P1";
    if (p >= 6) return "P2";
    if (p >= 3) return "P3";
    return "P4";
  }
  switch (input.severity) {
    case "CRITICAL": return "P1";
    case "HIGH": return "P2";
    case "LOW": return "P4";
    default: return "P3";
  }
}

export function incidentDueDates(start: Date, priority: Priority) {
  const t = INCIDENT_SLA[priority];
  return {
    respondDueAt: new Date(start.getTime() + t.respondMin * 60_000),
    resolveDueAt: new Date(start.getTime() + t.resolveMin * 60_000),
  };
}

export function requestDueDate(start: Date, severity: string) {
  return new Date(start.getTime() + (REQUEST_SLA_HOURS[severity] ?? 72) * 3_600_000);
}

export type SlaState = "NONE" | "OK" | "WARN" | "BREACH" | "MET" | "LATE";

/** Hedefe göre durum: süre içinde/uyarı/ihlal; kapanmışsa karşılandı/geç. */
export function slaState(input: { start: Date; due: Date | null; doneAt: Date | null; now?: Date }): SlaState {
  if (!input.due) return "NONE";
  if (input.doneAt) return input.doneAt <= input.due ? "MET" : "LATE";
  const now = input.now ?? new Date();
  if (now > input.due) return "BREACH";
  const total = input.due.getTime() - input.start.getTime();
  return total > 0 && now.getTime() - input.start.getTime() > total * 0.75 ? "WARN" : "OK";
}

export const SLA_STATE_LABELS: Record<SlaState, string> = {
  NONE: "—",
  OK: "Süresinde",
  WARN: "Süre azalıyor",
  BREACH: "SLA ihlali",
  MET: "Süresinde kapandı",
  LATE: "Geç kapandı",
};

export function formatRemaining(due: Date, now = new Date()) {
  const diff = due.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const text = h >= 48 ? `${Math.floor(h / 24)} gün` : h ? `${h} sa ${m} dk` : `${m} dk`;
  return diff >= 0 ? `${text} kaldı` : `${text} geçti`;
}
