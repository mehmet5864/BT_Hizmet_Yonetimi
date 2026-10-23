import type { ReportDef, ReportFilters } from "./types";

const KEYS: Array<keyof ReportFilters> = [
  "q",
  "departmentId",
  "assetType",
  "office",
  "status",
  "severity",
  "criticality",
  "role",
  "source",
  "kind",
  "dateFrom",
  "dateTo",
  "vendorId",
];

export function parseReportFilters(search: URLSearchParams): ReportFilters {
  const filters: ReportFilters = {};
  for (const key of KEYS) {
    const value = search.get(key)?.trim();
    if (value && value !== "ALL") filters[key] = value;
  }
  return filters;
}

export function hasReportFilters(filters: ReportFilters) {
  return KEYS.some((key) => Boolean(filters[key]));
}

export function dayStart(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function dayEnd(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function dateWhere(field: string, filters: ReportFilters) {
  const gte = dayStart(filters.dateFrom);
  const lte = dayEnd(filters.dateTo);
  if (!gte && !lte) return {};
  return { [field]: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } };
}

export function summarizeFilters(def: ReportDef, filters: ReportFilters, labels: Record<string, string> = {}) {
  if (!def.filters?.length || !hasReportFilters(filters)) return def.description;
  const parts = def.filters
    .map((field) => {
      const value = filters[field.key as keyof ReportFilters];
      if (!value) return null;
      const option = field.options?.find((item) => item.value === value);
      return `${field.label}: ${labels[`${field.key}:${value}`] ?? option?.label ?? value}`;
    })
    .filter(Boolean);
  return parts.length ? `${def.description} Filtre: ${parts.join(" · ")}` : def.description;
}
