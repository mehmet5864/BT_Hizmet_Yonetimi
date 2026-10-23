import {
  REQUEST_OFFICE_LABELS,
  REQUEST_OFFICE_NAV_LABELS,
  REQUEST_OFFICES,
  type RequestOffice,
} from "@/lib/itil/request-types";

export type OfficeName = { label: string; navLabel: string };
export type OfficeNames = Record<RequestOffice, OfficeName>;

export function defaultOfficeNames(): OfficeNames {
  return Object.fromEntries(
    REQUEST_OFFICES.map((office) => [
      office,
      { label: REQUEST_OFFICE_LABELS[office], navLabel: REQUEST_OFFICE_NAV_LABELS[office] },
    ]),
  ) as OfficeNames;
}

export function mergeOfficeNames(incoming: unknown): OfficeNames {
  const next = defaultOfficeNames();
  if (!incoming || typeof incoming !== "object") return next;
  const raw = incoming as Record<string, unknown>;
  for (const office of REQUEST_OFFICES) {
    const row = raw[office];
    if (typeof row === "string") {
      const label = row.trim();
      if (label) next[office] = { label, navLabel: label };
      continue;
    }
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const label = String(rec.label ?? "").trim();
    const navLabel = String(rec.navLabel ?? "").trim();
    if (label) next[office].label = label.slice(0, 80);
    if (navLabel) next[office].navLabel = navLabel.slice(0, 40);
    else if (label) next[office].navLabel = label.slice(0, 40);
  }
  return next;
}

export function officeLabel(office: string | null | undefined, names?: OfficeNames | null) {
  if (!office) return "—";
  const map = names ?? defaultOfficeNames();
  return map[office as RequestOffice]?.label ?? office;
}

export function officeNavLabel(office: string | null | undefined, names?: OfficeNames | null) {
  if (!office) return "—";
  const map = names ?? defaultOfficeNames();
  return map[office as RequestOffice]?.navLabel ?? office;
}
