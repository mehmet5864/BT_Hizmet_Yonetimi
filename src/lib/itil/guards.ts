import {
  CHANGE_STATUSES,
  INCIDENT_STATUSES,
  PROBLEM_STATUSES,
  TICKET_STATUSES,
  VULN_STATUSES,
} from "@/lib/itil/constants";

/** Gelen durum değerini listeyle doğrular; boşsa fallback, geçersizse null. */
export function checkStatus<T extends string>(list: readonly T[], raw: string | null, fallback: T): T | null {
  if (!raw) return fallback;
  return (list as readonly string[]).includes(raw) ? (raw as T) : null;
}

export const STATUS_LISTS = {
  incident: INCIDENT_STATUSES,
  problem: PROBLEM_STATUSES,
  change: CHANGE_STATUSES,
  ticket: TICKET_STATUSES,
  vuln: VULN_STATUSES,
} as const;

export const INVALID_STATUS = "Geçersiz durum değeri.";

export const CHANGE_TYPES = ["STANDARD", "NORMAL", "EMERGENCY"] as const;
export const CHANGE_TYPE_LABELS: Record<(typeof CHANGE_TYPES)[number], string> = {
  STANDARD: "Standart",
  NORMAL: "Normal",
  EMERGENCY: "Acil",
};
export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const RISK_LABELS: Record<(typeof RISK_LEVELS)[number], string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  CRITICAL: "Kritik",
};
export const isIn = <T extends string>(list: readonly T[], v: string | null | undefined): v is T =>
  !!v && (list as readonly string[]).includes(v);
