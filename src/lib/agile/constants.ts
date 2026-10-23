export const AGILE_METHODS = ["SCRUM", "KANBAN"] as const;
export const AGILE_METHOD_LABELS: Record<string, string> = { SCRUM: "Scrum (sprintli)", KANBAN: "Kanban (sürekli akış)" };

export const AGILE_PRODUCT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const AGILE_PRODUCT_STATUS_LABELS: Record<string, string> = { ACTIVE: "Aktif", ARCHIVED: "Arşiv" };

export const AGILE_SPRINT_STATUSES = ["PLANNED", "ACTIVE", "CLOSED"] as const;
export const AGILE_SPRINT_STATUS_LABELS: Record<string, string> = { PLANNED: "Planlandı", ACTIVE: "Aktif", CLOSED: "Kapandı" };

export const AGILE_TYPES = ["EPIC", "STORY", "TASK", "BUG"] as const;
export const AGILE_TYPE_LABELS: Record<string, string> = { EPIC: "Epik", STORY: "Hikâye", TASK: "Görev", BUG: "Hata" };

export const AGILE_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type AgileStatus = (typeof AGILE_STATUSES)[number];
export const AGILE_STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam ediyor",
  REVIEW: "İncelemede",
  DONE: "Bitti",
};
/** Pano sütunları (backlog dışı) */
export const AGILE_BOARD_COLUMNS = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;

export const AGILE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const AGILE_PRIORITY_LABELS: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", CRITICAL: "Kritik" };

export const AGILE_SOURCES = ["INCIDENT", "PROBLEM", "CHANGE", "REQUEST", "VULNERABILITY", "PATCH"] as const;
export const AGILE_SOURCE_LABELS: Record<string, string> = {
  INCIDENT: "Olay",
  PROBLEM: "Problem",
  CHANGE: "Değişiklik",
  REQUEST: "Talep",
  VULNERABILITY: "Zafiyet",
  PATCH: "Yama",
};
export const AGILE_SOURCE_HREF: Record<string, string> = {
  INCIDENT: "/olay",
  PROBLEM: "/problem",
  CHANGE: "/degisiklik",
  REQUEST: "/talepler",
  VULNERABILITY: "/zafiyet",
  PATCH: "/yama",
};

export function isAgileStatus(v: unknown): v is AgileStatus {
  return typeof v === "string" && (AGILE_STATUSES as readonly string[]).includes(v);
}

export const AGILE_MEETING_KINDS = ["PLANNING", "DAILY", "REFINEMENT", "REVIEW", "RETRO"] as const;
export const AGILE_MEETING_KIND_LABELS: Record<string, string> = {
  PLANNING: "Sprint planlama",
  DAILY: "Günlük toplantı",
  REFINEMENT: "Backlog düzenleme",
  REVIEW: "Sprint değerlendirme",
  RETRO: "Retrospektif",
};
