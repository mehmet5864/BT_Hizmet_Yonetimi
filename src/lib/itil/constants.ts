export const PERSONNEL_ROLES = [
  "USER",
  "SYSTEM_ADMIN",
  "UNIT_MANAGER",
  "SENIOR_MANAGER",
  "INFOSEC_MANAGER",
  "SUPER_ADMIN",
] as const;

export type PersonnelRole = (typeof PERSONNEL_ROLES)[number];

export const PERSONNEL_ROLE_LABELS: Record<PersonnelRole, string> = {
  USER: "Kullanıcı",
  SYSTEM_ADMIN: "Sistem yöneticisi",
  UNIT_MANAGER: "Birim amiri",
  SENIOR_MANAGER: "Üst amir",
  INFOSEC_MANAGER: "Bilgi güvenliği yöneticisi",
  SUPER_ADMIN: "Süper yönetici",
};

export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "DONE",
  "REJECTED",
  "CANCELLED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşlemde",
  WAITING: "Beklemede",
  DONE: "Tamamlandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal",
};

export const OPEN_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING"] as const;

export function isOpenTicketStatus(status: string) {
  return (OPEN_TICKET_STATUSES as readonly string[]).includes(status);
}

export const CHANGE_STATUSES = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;

export const CHANGE_STATUS_LABELS: Record<(typeof CHANGE_STATUSES)[number], string> = {
  DRAFT: "Taslak",
  PENDING: "Onay bekliyor",
  APPROVED: "Onaylandı",
  IN_PROGRESS: "Çalışılıyor",
  COMPLETED: "Tamamlandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal",
};

export const VULN_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const VULN_SEVERITY_LABELS: Record<(typeof VULN_SEVERITIES)[number], string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  CRITICAL: "Kritik",
};

export const REQUEST_SEVERITIES = VULN_SEVERITIES;
export type RequestSeverity = (typeof REQUEST_SEVERITIES)[number];
export const REQUEST_SEVERITY_LABELS = VULN_SEVERITY_LABELS;

export const ESCALATION_KINDS = ["MISROUTED", "UPPER_UNIT", "LAYER2"] as const;
export type EscalationKind = (typeof ESCALATION_KINDS)[number];
export const ESCALATION_KIND_LABELS: Record<EscalationKind, string> = {
  MISROUTED: "Yanlış birim",
  UPPER_UNIT: "Üst birim",
  LAYER2: "Katman 2 / uzman birim",
};

export const ESCALATION_STATUSES = ["NONE", "PENDING", "TRANSFERRED", "ACCEPTED", "REJECTED"] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];
export const ESCALATION_STATUS_LABELS: Record<EscalationStatus, string> = {
  NONE: "Yok",
  PENDING: "Yükseltme bekliyor",
  TRANSFERRED: "Doğru birime aktarıldı",
  ACCEPTED: "Üst birim aldı",
  REJECTED: "Yükseltme reddedildi",
};

export const VULN_STATUSES = ["OPEN", "CLOSED", "ACCEPTED"] as const;
export const VULN_STATUS_LABELS: Record<(typeof VULN_STATUSES)[number], string> = {
  OPEN: "Açık",
  CLOSED: "Kapatıldı",
  ACCEPTED: "Kabul edildi",
};

export const INCIDENT_STATUSES = ["OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"] as const;
export const INCIDENT_STATUS_LABELS: Record<(typeof INCIDENT_STATUSES)[number], string> = {
  OPEN: "Açık",
  INVESTIGATING: "İnceleniyor",
  CONTAINED: "Kontrol altında",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapatıldı",
};

export const INCIDENT_LAYERS = ["L1", "L2"] as const;
export type IncidentLayer = (typeof INCIDENT_LAYERS)[number];
export const INCIDENT_LAYER_LABELS: Record<IncidentLayer, string> = {
  L1: "Seviye 1",
  L2: "Seviye 2",
};

export const PROBLEM_STATUSES = ["OPEN", "INVESTIGATING", "KNOWN_ERROR", "RESOLVED", "CLOSED"] as const;
export const PROBLEM_STATUS_LABELS: Record<(typeof PROBLEM_STATUSES)[number], string> = {
  OPEN: "Açık",
  INVESTIGATING: "İnceleniyor",
  KNOWN_ERROR: "Bilinen hata",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapatıldı",
};

export const PROBLEM_ASSIGNMENT_STATUSES = ["NONE", "PENDING", "APPROVED", "REJECTED"] as const;
export type ProblemAssignmentStatus = (typeof PROBLEM_ASSIGNMENT_STATUSES)[number];
export const PROBLEM_ASSIGNMENT_LABELS: Record<ProblemAssignmentStatus, string> = {
  NONE: "Atama yok",
  PENDING: "BG onayı bekliyor",
  APPROVED: "Görev atandı",
  REJECTED: "Atama reddedildi",
};

export function canApproveProblemAssignment(
  role?: string | null,
  viewerId?: string | null,
  infosecManagerId?: string | null,
  extraOfficerIds: (string | null | undefined)[] = [],
) {
  if (role === "SUPER_ADMIN" || role === "INFOSEC_MANAGER") return true;
  const allowed = [infosecManagerId, ...extraOfficerIds].filter((id): id is string => Boolean(id));
  return Boolean(viewerId && allowed.includes(viewerId));
}

export const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  IN_PROGRESS: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  INVESTIGATING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  WAITING: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  DONE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  RESOLVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  CLOSED: "border-muted-foreground/30 bg-muted text-muted-foreground",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  CANCELLED: "border-muted-foreground/30 bg-muted text-muted-foreground",
  DRAFT: "border-muted-foreground/30 bg-muted text-muted-foreground",
  CONTAINED: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  KNOWN_ERROR: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  ACCEPTED: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  LOW: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  HIGH: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  CRITICAL: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  NONE: "border-muted-foreground/30 bg-muted text-muted-foreground",
  TRANSFERRED: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  L1: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  L2: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  PLANNED: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  RETIRED: "border-muted-foreground/30 bg-muted text-muted-foreground",
  READY: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  DEPLOYED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ROLLED_BACK: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  ACKNOWLEDGED: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CLEARED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? "border-border bg-muted text-foreground";
}

export const VENDOR_LICENSE_TYPES = [
  "PERPETUAL",
  "SUBSCRIPTION",
  "SUPPORT",
  "OEM",
  "OPEN_SOURCE",
  "OTHER",
] as const;
export type VendorLicenseType = (typeof VENDOR_LICENSE_TYPES)[number];
export const VENDOR_LICENSE_LABELS: Record<VendorLicenseType, string> = {
  PERPETUAL: "Sürekli lisans",
  SUBSCRIPTION: "Abonelik",
  SUPPORT: "Bakım / destek",
  OEM: "OEM",
  OPEN_SOURCE: "Açık kaynak",
  OTHER: "Diğer",
};

export const VENDOR_SPEC_KINDS = ["TEKNIK", "IDARI"] as const;
export type VendorSpecKind = (typeof VENDOR_SPEC_KINDS)[number];
export const VENDOR_SPEC_KIND_LABELS: Record<VendorSpecKind, string> = {
  TEKNIK: "Teknik şartname",
  IDARI: "İdari şartname",
};

export const VENDOR_CONTACT_KINDS = ["SORUMLU", "DESTEK"] as const;
export type VendorContactKind = (typeof VENDOR_CONTACT_KINDS)[number];
export const VENDOR_CONTACT_KIND_LABELS: Record<VendorContactKind, string> = {
  SORUMLU: "Firma sorumlusu",
  DESTEK: "Destek irtibatı",
};

export const CONTRACT_SLA_LEVELS = [1, 2, 3] as const;
export type ContractSlaLevel = (typeof CONTRACT_SLA_LEVELS)[number];
export const CONTRACT_SLA_DEFAULTS: Record<
  ContractSlaLevel,
  { name: string; responseHours: number; resolveHours: number; description: string }
> = {
  1: {
    name: "Seviye 1 — Kritik",
    responseHours: 2,
    resolveHours: 4,
    description: "Hizmet tamamen durmuş veya güvenlik ihlali.",
  },
  2: {
    name: "Seviye 2 — Yüksek",
    responseHours: 4,
    resolveHours: 8,
    description: "Kritik işlev etkilenmiş, geçici çözüm mümkün.",
  },
  3: {
    name: "Seviye 3 — Normal",
    responseHours: 8,
    resolveHours: 24,
    description: "Kısıtlı etki; planlı mesai içinde giderilir.",
  },
};

export function slaLevelToSeverity(level: number): "CRITICAL" | "HIGH" | "MEDIUM" {
  if (level === 1) return "CRITICAL";
  if (level === 2) return "HIGH";
  return "MEDIUM";
}

export function nextTicketNo(prefix: string, last?: string | null) {
  const year = new Date().getFullYear();
  const match = last?.match(new RegExp(`^${prefix}-${year}-(\\d+)$`));
  const seq = match ? Number(match[1]) + 1 : 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
