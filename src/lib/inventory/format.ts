import {
  CRITICALITY_LABELS,
  EXPIRY_WARNING_DAYS,
  FORM_FACTOR_LABELS,
  LIFECYCLE_STATUS_LABELS,
  SUPPORT_STATUS_LABELS,
  type Criticality,
  type FormFactor,
  type LifecycleStatus,
  type SupportStatus,
} from "./constants";

export type LocationParts = {
  locRoom?: number | null;
  locCorridor?: number | null;
  locCabinet?: number | null;
  locShelf?: number | null;
};

/** 1O-3K-4Ka-10 biçiminde konum kodu üretir. */
export function formatLocation(parts: LocationParts): string | null {
  const segments = [
    parts.locRoom != null ? `${parts.locRoom}O` : null,
    parts.locCorridor != null ? `${parts.locCorridor}K` : null,
    parts.locCabinet != null ? `${parts.locCabinet}Ka` : null,
    parts.locShelf != null ? `${parts.locShelf}` : null,
  ].filter(Boolean);

  return segments.length ? segments.join("-") : null;
}

export function describeLocation(parts: LocationParts): string | null {
  const segments = [
    parts.locRoom != null ? `${parts.locRoom}. Oda` : null,
    parts.locCorridor != null ? `${parts.locCorridor}. Koridor` : null,
    parts.locCabinet != null ? `${parts.locCabinet}. Kabin` : null,
    parts.locShelf != null ? `${parts.locShelf}. Raf` : null,
  ].filter(Boolean);

  return segments.length ? segments.join(" / ") : null;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function criticalityLabel(value: string | null | undefined): string {
  return value ? (CRITICALITY_LABELS[value as Criticality] ?? value) : "—";
}

export function formFactorLabel(value: string | null | undefined): string {
  return value ? (FORM_FACTOR_LABELS[value as FormFactor] ?? value) : "—";
}

export function supportStatusLabel(value: string | null | undefined): string {
  return value ? (SUPPORT_STATUS_LABELS[value as SupportStatus] ?? value) : "—";
}

export function lifecycleLabel(value: string | null | undefined): string {
  return value ? (LIFECYCLE_STATUS_LABELS[value as LifecycleStatus] ?? value) : "—";
}

export type ExpiryState = "none" | "ok" | "soon" | "expired";

export function expiryState(endDate: Date | string | null | undefined, now = new Date()): ExpiryState {
  if (!endDate) return "none";
  const date = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (Number.isNaN(date.getTime())) return "none";
  const days = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARNING_DAYS) return "soon";
  return "ok";
}

export function daysUntil(endDate: Date | string, now = new Date()): number {
  const date = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (Number.isNaN(date.getTime())) return 0;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export function assetDisplayName(asset: {
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  stockNo?: string | null;
  id: string;
}): string {
  if (asset.name) return asset.name;
  const brandModel = [asset.brand, asset.model].filter(Boolean).join(" ");
  if (brandModel) return brandModel;
  if (asset.stockNo) return asset.stockNo;
  return `Kayıt ${asset.id.slice(-6).toUpperCase()}`;
}

export function brandModel(asset: { brand?: string | null; model?: string | null }): string {
  return [asset.brand, asset.model].filter(Boolean).join(" / ") || "—";
}
