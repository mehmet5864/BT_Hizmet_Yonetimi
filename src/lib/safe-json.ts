export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseJsonRecord(raw: string | null | undefined): Record<string, string> {
  const parsed = parseJson<unknown>(raw, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
}

export function parseJsonObject<T extends object>(raw: string | null | undefined, fallback: T): T {
  const parsed = parseJson<unknown>(raw, fallback);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
  return parsed as T;
}

export type ActivityChange = { label: string; from: string | null; to: string | null };

export function parseActivityChanges(raw: string | null | undefined): ActivityChange[] {
  const parsed = parseJson<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      label: String(item.label ?? item.field ?? "Alan"),
      from: item.from == null ? null : String(item.from),
      to: item.to == null ? null : String(item.to),
    }));
}
