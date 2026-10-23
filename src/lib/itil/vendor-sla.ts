import {
  CONTRACT_SLA_DEFAULTS,
  CONTRACT_SLA_LEVELS,
  VENDOR_LICENSE_LABELS,
  type ContractSlaLevel,
  type VendorLicenseType,
} from "@/lib/itil/constants";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailList(raw: string | null | undefined) {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => EMAIL_RE.test(item)),
    ),
  ];
}

export function isEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function hoursLabel(hours: number) {
  if (hours < 24) return `${hours} saat`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days} gün ${rest} saat` : `${days} gün`;
}

export function slaWindowLabel(responseHours: number, resolveHours: number) {
  return `${hoursLabel(responseHours)} müdahale · ${hoursLabel(resolveHours)} çözüm`;
}

export function slaRemainingLabel(due: Date | string | null | undefined, now: Date) {
  if (!due) return "Süre yok";
  const date = typeof due === "string" ? new Date(due) : due;
  if (Number.isNaN(date.getTime())) return "Süre yok";
  const hours = Math.round((date.getTime() - now.getTime()) / 3_600_000);
  if (hours < 0) return `${hoursLabel(Math.abs(hours))} aşıldı`;
  if (hours === 0) return "Süre doldu";
  return `${hoursLabel(hours)} kaldı`;
}

export function isSlaOverdue(due: Date | null | undefined, status: string, now: Date) {
  return Boolean(due && status !== "DONE" && due.getTime() < now.getTime());
}

export function licenseLabel(value: string | null | undefined) {
  if (!value) return "—";
  return VENDOR_LICENSE_LABELS[value as VendorLicenseType] ?? value;
}

export function defaultSlaLevelDraft(level: ContractSlaLevel) {
  return { level, ...CONTRACT_SLA_DEFAULTS[level] };
}

export const ALL_SLA_LEVEL_DRAFTS = CONTRACT_SLA_LEVELS.map(defaultSlaLevelDraft);

export type SlaProductOption = {
  id: string;
  name: string;
  licenseType: string | null;
  quantity: number;
  version: string | null;
  vendorId: string;
  vendorName: string;
  specFileUrl: string | null;
  specFileName: string | null;
  specKind: string | null;
  supportEmails: string[];
  contacts: { name: string; email: string | null; phone: string | null; kind: string }[];
  slaLevels: {
    level: number;
    name: string;
    responseHours: number;
    resolveHours: number;
    description: string | null;
  }[];
};

export function collectVendorEmails(input: {
  supportEmail?: string | null;
  email?: string | null;
  contact1Email?: string | null;
  contact2Email?: string | null;
  contact3Email?: string | null;
  contacts?: { email?: string | null }[];
}) {
  return parseEmailList(
    [
      input.supportEmail,
      input.email,
      input.contact1Email,
      input.contact2Email,
      input.contact3Email,
      ...(input.contacts ?? []).map((row) => row.email),
    ]
      .filter(Boolean)
      .join(","),
  );
}
