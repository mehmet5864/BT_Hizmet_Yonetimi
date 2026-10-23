import {
  MODULE_LABELS,
  MODULE_ROLES,
  type AppModule,
  moduleForPath,
} from "@/lib/auth/rbac";
import type { PersonnelRole } from "@/lib/itil/constants";
import type { RequestOffice } from "@/lib/itil/request-types";

export const MODULE_LEVELS = ["VIEW", "HANDLE", "ADMIN"] as const;
export type ModuleLevel = (typeof MODULE_LEVELS)[number];

export const MODULE_LEVEL_RANK: Record<ModuleLevel, number> = {
  VIEW: 1,
  HANDLE: 2,
  ADMIN: 3,
};

export const MODULE_LEVEL_LABELS: Record<ModuleLevel, string> = {
  VIEW: "Görüntüle",
  HANDLE: "İşle",
  ADMIN: "Modül yöneticisi",
};

export type ModuleGrant = {
  module: AppModule;
  group: string;
  level: ModuleLevel;
};

export const ACL_MODULES = Object.keys(MODULE_LABELS) as AppModule[];

export function isModuleLevel(value: string): value is ModuleLevel {
  return (MODULE_LEVELS as readonly string[]).includes(value);
}

export function isAppModule(value: string): value is AppModule {
  return value in MODULE_LABELS;
}

/** Süreç yöneticisi (Ayarlar > Süreç yöneticileri) atamasının hangi modülün yöneticisi sayılacağı. */
export const OFFICER_MODULE: Record<string, AppModule> = {
  envanter: "envanter",
  zimmet: "envanter",
  personel: "personel",
  degisiklik: "degisiklik",
  yama: "yama",
  konfigurasyon: "konfigurasyon",
  zafiyet: "zafiyet",
  firmaSla: "firma-sla",
  olay: "olay",
  problem: "problem",
  katalog: "katalog",
  bilgi: "katalog",
  akis: "katalog",
  cevik: "cevik",
  rapor: "raporlar",
  tasarim: "surec",
  kullanilabilirlik: "surec",
  kapasite: "surec",
  sureklilik: "surec",
  dogrulama: "surec",
  surum: "surec",
  izleme: "surec",
  degerlendirme: "surec",
};

export function officerGrantName(module: AppModule) {
  return `officer:${module}`;
}

export function officerGroupsFor(personId: string, officers: Record<string, string>): string[] {
  const out = new Set<string>();
  for (const [key, mod] of Object.entries(OFFICER_MODULE)) {
    if (officers[key] && officers[key] === personId) out.add(officerGrantName(mod));
  }
  return [...out];
}

export function roleGrantName(role: PersonnelRole) {
  return `role:${role}`;
}

export function officeGrantName(office: RequestOffice) {
  return `office:${office}`;
}

export function parsePersonGroups(adGroups: string | null | undefined): string[] {
  if (!adGroups?.trim()) return [];
  try {
    const parsed = JSON.parse(adGroups) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    /* comma-separated fallback */
  }
  return adGroups
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function viewerGrantNames(input: {
  role?: string | null;
  requestOffice?: string | null;
  adGroups?: string | null;
}): string[] {
  const names = new Set<string>(parsePersonGroups(input.adGroups).map((group) => group.trim()));
  if (input.role) names.add(`role:${input.role}`);
  if (input.requestOffice) names.add(`office:${input.requestOffice}`);
  return [...names];
}

export function defaultModuleGrants(): ModuleGrant[] {
  const grants: ModuleGrant[] = [];
  for (const [mod, roles] of Object.entries(MODULE_ROLES) as [AppModule, PersonnelRole[]][]) {
    for (const role of roles) {
      // Düz kullanıcı: envanter ve personelde yalnızca görüntüler; diğer modüllerde kendi kayıtlarında işlem yapar.
      const level: ModuleLevel =
        mod === "ayarlar"
          ? "ADMIN"
          : mod === "envanter" && role === "SUPER_ADMIN"
            ? "ADMIN"
            : role === "USER" && (mod === "envanter" || mod === "personel")
              ? "VIEW"
              : "HANDLE";
      grants.push({ module: mod, group: roleGrantName(role), level });
    }
  }
  grants.push({ module: "envanter", group: "GG_Envanter", level: "ADMIN" });
  grants.push({ module: "talepler", group: "office:SERVIS", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:SISTEM", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:NETWORK", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:SIBER", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:YAZILIM", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:VERITABANI", level: "HANDLE" });
  return grants;
}

export const ACL_VERSION = 2;

/** Eski (sürüm 1) kayıtlarda rol tabanlı yetkiler yeni varsayılanlarla değişir; AD grubu / ofis yetkileri korunur. */
export function migrateGrants(raw: unknown): ModuleGrant[] {
  const defaults = defaultModuleGrants();
  const kept = (Array.isArray(raw) ? normalizeGrants(raw) : []).filter((grant) => !grant.group.startsWith("role:"));
  const seen = new Set(defaults.map((grant) => `${grant.module}|${grant.group}`));
  return [...defaults, ...kept.filter((grant) => !seen.has(`${grant.module}|${grant.group}`))];
}

export function normalizeGrants(raw: unknown): ModuleGrant[] {
  if (!Array.isArray(raw)) return defaultModuleGrants();
  const grants: ModuleGrant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const moduleName = String(row.module ?? "");
    const group = String(row.group ?? "").trim();
    const level = String(row.level ?? "");
    if (!isAppModule(moduleName) || !group || !isModuleLevel(level)) continue;
    grants.push({ module: moduleName, group, level });
  }
  return grants.length ? grants : defaultModuleGrants();
}

export function moduleLevelFor(
  grants: ModuleGrant[],
  names: string[],
  moduleName: AppModule,
  role?: string | null,
): ModuleLevel | "NONE" {
  if (role === "SUPER_ADMIN") return "ADMIN";
  // Modülün atanmış süreç yöneticisi kendi modülünde otomatik "Modül yöneticisi" olur.
  if (names.includes(officerGrantName(moduleName))) return "ADMIN";
  const normalized = names.map((name) => name.trim().toLocaleLowerCase("tr-TR"));
  let best: ModuleLevel | "NONE" = "NONE";
  for (const grant of grants) {
    if (grant.module !== moduleName) continue;
    const needle = grant.group.trim().toLocaleLowerCase("tr-TR");
    if (!needle || !normalized.includes(needle)) continue;
    if (best === "NONE" || MODULE_LEVEL_RANK[grant.level] > MODULE_LEVEL_RANK[best]) {
      best = grant.level;
    }
  }
  return best;
}

export function hasModuleLevel(
  grants: ModuleGrant[],
  names: string[],
  moduleName: AppModule,
  needed: ModuleLevel,
  role?: string | null,
) {
  const level = moduleLevelFor(grants, names, moduleName, role);
  if (level === "NONE") return false;
  return MODULE_LEVEL_RANK[level] >= MODULE_LEVEL_RANK[needed];
}

export function canAccessWithAcl(
  grants: ModuleGrant[],
  names: string[],
  pathname: string,
  role?: string | null,
) {
  if (
    pathname.startsWith("/api/") ||
    pathname === "/yetkisiz" ||
    pathname === "/profilim" ||
    pathname.startsWith("/onay/posta") ||
    pathname === "/indir" ||
    pathname.startsWith("/indir/") ||
    pathname.startsWith("/personel/hareketler") ||
    pathname === "/hareketler" ||
    pathname.startsWith("/hareketler/")
  ) {
    return true;
  }
  if (role === "SUPER_ADMIN") return true;
  const mod = moduleForPath(pathname);
  if (!mod) return false;
  return hasModuleLevel(grants, names, mod, "VIEW", role);
}

export function isL1RequestType(requestType: string) {
  return requestType.startsWith("SD_");
}

export const LAYER2_OFFICES = [
  "SISTEM",
  "NETWORK",
  "SIBER",
  "YAZILIM",
  "VERITABANI",
] as const satisfies readonly RequestOffice[];

export function inventoryLevel(
  grants: ModuleGrant[],
  viewer: { role?: string | null; groups?: string[] | null },
): ModuleLevel | "NONE" {
  return moduleLevelFor(grants, viewer.groups ?? [], "envanter", viewer.role);
}

export function canSeeAllInventory(level: ModuleLevel | "NONE") {
  return level === "ADMIN";
}

export function canDirectMutateInventory(level: ModuleLevel | "NONE") {
  return level === "ADMIN";
}

export function canEditInventory(level: ModuleLevel | "NONE") {
  return level === "HANDLE" || level === "ADMIN";
}

export function canProposeInventory(level: ModuleLevel | "NONE") {
  return level !== "NONE";
}

type AssetViewer = {
  id: string;
  departmentId?: string | null;
  role?: string | null;
  groups?: string[] | null;
  unitPersonIds?: string[];
};

function assetOwnerIds(viewer: AssetViewer) {
  return viewer.unitPersonIds?.length ? viewer.unitPersonIds : [viewer.id];
}

/** Envanter yöneticisi hepsini görür; diğerleri yalnızca zimmetinde olanı (birim amiri / sistem yöneticisi: birim personelinin de). */
export function visibleAssetWhere(viewer: AssetViewer, grants: ModuleGrant[]) {
  if (canSeeAllInventory(inventoryLevel(grants, viewer))) return {};
  return { ownerId: { in: assetOwnerIds(viewer) } };
}

export function canViewAsset(
  viewer: AssetViewer,
  grants: ModuleGrant[],
  asset: { ownerId: string; departmentId?: string | null },
) {
  if (canSeeAllInventory(inventoryLevel(grants, viewer))) return true;
  return assetOwnerIds(viewer).includes(asset.ownerId);
}
