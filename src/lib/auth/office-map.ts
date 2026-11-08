import type { RequestOffice } from "@/lib/itil/request-types";

/** AD grubu → talep ofisi (hizmet masası görevi). */
export type OfficeMap = { group: string; office: RequestOffice };

export const SERVICE_DESK_OFFICE: RequestOffice = "SERVIS";
const norm = (v: string) => v.trim().toLocaleLowerCase("tr-TR");

/** AD grup üyeliğinden gelen talep ofisi. Kişide açık ofis varsa o geçerlidir (çağıran karar verir). */
export function officeFromGroups(groups: readonly string[], maps: readonly OfficeMap[] | undefined): RequestOffice | null {
  if (!maps?.length) return null;
  const have = new Set(groups.map(norm));
  return maps.find((m) => have.has(norm(m.group)))?.office ?? null;
}

export function sanitizeOfficeMaps(raw: unknown): OfficeMap[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({ group: String((item as OfficeMap)?.group ?? "").trim(), office: String((item as OfficeMap)?.office ?? "") as RequestOffice }))
    .filter((m) => m.group && m.office === SERVICE_DESK_OFFICE)
    .slice(0, 100);
}
