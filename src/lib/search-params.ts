export function param(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function contains(term: string) {
  return { contains: term, mode: "insensitive" as const };
}

export function searchOr(term: string | undefined, fields: string[]) {
  if (!term) return {};
  return {
    OR: fields.map((field) => nestContains(field, term)),
  };
}

function nestContains(path: string, term: string): Record<string, unknown> {
  const parts = path.split(".");
  return parts.reduceRight<Record<string, unknown>>(
    (acc, key) => ({ [key]: acc }),
    contains(term),
  );
}

export function mergeWhere(...parts: Array<Record<string, unknown> | undefined>) {
  const filled = parts.filter((part): part is Record<string, unknown> => Boolean(part && Object.keys(part).length));
  if (!filled.length) return {};
  if (filled.length === 1) return filled[0];
  return { AND: filled };
}
