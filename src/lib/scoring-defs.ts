import { ITIL_PROCESSES } from "@/lib/itil/processes";

export const SCORE_ACTIONS = ["CREATE", "UPDATE", "COMPLETE"] as const;
export type ScoreAction = (typeof SCORE_ACTIONS)[number];
export const SCORE_ACTION_LABELS: Record<ScoreAction, string> = {
  CREATE: "Giriş (oluşturma)",
  UPDATE: "Güncelleme",
  COMPLETE: "Tamamlama / kapatma",
};

export const SCORE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type ScoreSeverity = (typeof SCORE_SEVERITIES)[number];
export const SCORE_SEVERITY_LABELS: Record<ScoreSeverity, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  CRITICAL: "Kritik",
};

export type ScoreModuleDef = {
  key: string;
  label: string;
  /** Çağrı sayacına (açılan / kapatılan) dahil mi */
  ticket: boolean;
  /** Varsayılan modül ağırlığı */
  weight: number;
};

export const SCORE_MODULES: ScoreModuleDef[] = [
  { key: "request", label: "Servis talebi", ticket: true, weight: 1 },
  { key: "incident", label: "Olay yönetimi", ticket: true, weight: 2 },
  { key: "problem", label: "Problem yönetimi", ticket: true, weight: 3 },
  { key: "sla", label: "Firma SLA arıza kaydı", ticket: true, weight: 2 },
  { key: "change", label: "Değişiklik yönetimi", ticket: false, weight: 3 },
  { key: "patch", label: "Yama yönetimi", ticket: false, weight: 2 },
  { key: "config", label: "Konfigürasyon yönetimi", ticket: false, weight: 2 },
  { key: "vuln", label: "Zafiyet yönetimi", ticket: false, weight: 2 },
  { key: "catalog", label: "Hizmet kataloğu", ticket: false, weight: 1 },
  { key: "agile", label: "Çevik çalışma (Agile iş)", ticket: false, weight: 2 },
  ...ITIL_PROCESSES.map((def) => ({
    key: `process:${def.key}`,
    label: def.label,
    ticket: false,
    weight: 2,
  })),
];

export const SCORE_MODULE_LABELS: Record<string, string> = Object.fromEntries(SCORE_MODULES.map((m) => [m.key, m.label]));

const BASE: Record<ScoreAction, number> = { CREATE: 2, UPDATE: 1, COMPLETE: 4 };
const SEV_MULT: Record<ScoreSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 5 };

export function defaultScorePoints(module: string, action: ScoreAction, severity: ScoreSeverity) {
  const weight = SCORE_MODULES.find((m) => m.key === module)?.weight ?? 1;
  return BASE[action] * SEV_MULT[severity] * weight;
}

export function isScoreSeverity(value: unknown): value is ScoreSeverity {
  return typeof value === "string" && (SCORE_SEVERITIES as readonly string[]).includes(value);
}

export const SCORE_FINAL_STATUSES = ["DONE", "COMPLETED", "RESOLVED", "CLOSED", "DEPLOYED", "CLEARED"];
