import { moduleLevelFor, type ModuleGrant } from "@/lib/auth/acl";
import type { AppModule } from "@/lib/auth/rbac";
import type { RequestViewer } from "@/lib/itil/request-scope";

export const API_SCOPES = [
  "envanter:read",
  "envanter:write",
  "talepler:read",
  "talepler:write",
  "personel:read",
  "zafiyet:read",
  "zafiyet:write",
  "olay:read",
  "olay:write",
  "problem:read",
  "degisiklik:read",
  "degisiklik:write",
  "yama:read",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_LABELS: Record<ApiScope, string> = {
  "envanter:read": "Envanter oku",
  "envanter:write": "Envanter yaz",
  "talepler:read": "Talep oku",
  "talepler:write": "Talep aç / güncelle",
  "personel:read": "Personel oku",
  "zafiyet:read": "Zafiyet oku",
  "zafiyet:write": "Zafiyet aç (tarama/pipeline)",
  "olay:read": "Olay oku",
  "olay:write": "Olay aç",
  "problem:read": "Problem oku",
  "degisiklik:read": "Değişiklik oku",
  "degisiklik:write": "Değişiklik aç (yayın/pipeline)",
  "yama:read": "Yama oku",
};

export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}

export function normalizeScopes(raw: unknown): ApiScope[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item).trim()).filter(isApiScope);
}

export function parseScopeJson(payload: string | null | undefined): ApiScope[] {
  if (!payload) return [];
  try {
    return normalizeScopes(JSON.parse(payload));
  } catch {
    return [];
  }
}

export function hasScope(scopes: string[], needed: ApiScope) {
  if (scopes.includes(needed)) return true;
  if (needed.endsWith(":read")) {
    const write = needed.replace(/:read$/, ":write");
    return scopes.includes(write);
  }
  return false;
}

const SCOPE_MODULE: Record<ApiScope, AppModule> = {
  "envanter:read": "envanter",
  "envanter:write": "envanter",
  "talepler:read": "talepler",
  "talepler:write": "talepler",
  "personel:read": "personel",
  "zafiyet:read": "zafiyet",
  "zafiyet:write": "zafiyet",
  "olay:read": "olay",
  "olay:write": "olay",
  "problem:read": "problem",
  "degisiklik:read": "degisiklik",
  "degisiklik:write": "degisiklik",
  "yama:read": "yama",
};

export function scopeModule(scope: ApiScope): AppModule {
  return SCOPE_MODULE[scope];
}

export function scopesFromAcl(viewer: RequestViewer, grants: ModuleGrant[]): ApiScope[] {
  const scopes: ApiScope[] = [];
  for (const scope of API_SCOPES) {
    const mod = SCOPE_MODULE[scope];
    const level = moduleLevelFor(grants, viewer.groups ?? [], mod, viewer.role);
    if (level === "NONE") continue;
    if (scope.endsWith(":write")) {
      if (level === "HANDLE" || level === "ADMIN") scopes.push(scope);
    } else {
      scopes.push(scope);
    }
  }
  return scopes;
}
