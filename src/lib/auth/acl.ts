import {
  MODULE_LABELS,
  MODULE_ROLES,
  type AppModule,
  moduleForPath,
} from "@/lib/auth/rbac";
import { ASSIGNABLE_MODULES, assignedGrantName } from "@/lib/auth/assigned-defs";
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

/** Kapsam: düzey hangi kayıtlar üzerinde geçerli (kayıt süzmesi). */
export const MODULE_SCOPES = ["OWN", "UNIT", "OFFICE", "ALL"] as const;
export type ModuleScope = (typeof MODULE_SCOPES)[number];

export const MODULE_SCOPE_LABELS: Record<ModuleScope, string> = {
  OWN: "Kendi verisi",
  UNIT: "Alt çalışan verisi",
  OFFICE: "Talep birimi çalışanı",
  ALL: "Tam yetkili (tümü)",
};

export const MODULE_SCOPE_HINTS: Record<ModuleScope, string> = {
  OWN: "Kendi açtığı, kendine atanan veya sahibi olduğu kayıtlar (talep eden dahil).",
  UNIT: "Biriminin ve doğrudan bağlı çalışanlarının kayıtları.",
  OFFICE: "Çalıştığı talep biriminin (Sistem, Network, Siber…) kayıtları.",
  ALL: "Modüldeki tüm kayıtlar.",
};

export type ModuleGrant = {
  module: AppModule;
  group: string;
  level: ModuleLevel;
  /** Yoksa rolün eski (varsayılan) kapsam kuralı geçerlidir. */
  scopes?: ModuleScope[];
};

export function isModuleScope(value: string): value is ModuleScope {
  return (MODULE_SCOPES as readonly string[]).includes(value);
}

/**
 * Rolün varsayılan kapsamı (eski, koda gömülü davranışın birebir karşılığı).
 * Bir hücrede kapsam açıkça seçilmediyse ekran bunu gösterir; kayıt süzmesi eski kuralı uygular.
 */
export function defaultScopes(role: string, mod: AppModule): ModuleScope[] {
  if (role === "SUPER_ADMIN") return ["ALL"];
  if (mod === "personel") {
    if (role === "UNIT_MANAGER" || role === "SENIOR_MANAGER") return ["OWN", "UNIT"];
    return ["OWN"];
  }
  if (mod === "envanter") return role === "UNIT_MANAGER" || role === "SYSTEM_ADMIN" ? ["OWN", "UNIT"] : ["OWN"];
  if (role === "SENIOR_MANAGER" || role === "INFOSEC_MANAGER") return ["ALL"];
  if (role === "SYSTEM_ADMIN") return ["OWN", "UNIT", "OFFICE"];
  if (role === "UNIT_MANAGER") return ["OWN", "UNIT"];
  return ["OWN"];
}

/** Görüntüleyenin bu modüldeki açık kapsamları; hiçbir eşleşen yetkide kapsam yoksa null (eski kural). */
export function scopesFor(grants: ModuleGrant[], names: string[], moduleName: AppModule): ModuleScope[] | null {
  const normalized = names.map((name) => name.trim().toLocaleLowerCase("tr-TR"));
  let found: Set<ModuleScope> | null = null;
  for (const grant of grants) {
    if (grant.module !== moduleName || !grant.scopes?.length) continue;
    if (!normalized.includes(grant.group.trim().toLocaleLowerCase("tr-TR"))) continue;
    found ??= new Set();
    grant.scopes.forEach((scope) => found!.add(scope));
  }
  return found ? [...found] : null;
}

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
      // Personel yönetimi yalnızca süper yönetici; diğerleri yalnızca kendi (birim amiri: birimi) kaydını görür.
      const level: ModuleLevel =
        mod === "ayarlar"
          ? "ADMIN"
          : (mod === "envanter" || mod === "personel") && role === "SUPER_ADMIN"
            ? "ADMIN"
            : mod === "personel" || (role === "USER" && mod === "envanter")
              ? "VIEW"
              : "HANDLE";
      grants.push({ module: mod, group: roleGrantName(role), level });
    }
  }
  // Düz kullanıcı ITIL süreçlerini yalnızca kendisine görev atandığında görür ("assigned:<modül>" grubu).
  for (const mod of ASSIGNABLE_MODULES) grants.push({ module: mod, group: assignedGrantName(mod), level: "HANDLE" });
  grants.push({ module: "envanter", group: "GG_Envanter", level: "ADMIN" });
  grants.push({ module: "talepler", group: "office:SERVIS", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:SISTEM", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:NETWORK", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:SIBER", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:YAZILIM", level: "HANDLE" });
  grants.push({ module: "talepler", group: "office:VERITABANI", level: "HANDLE" });
  return grants;
}

/** Önerilen rol yetkileri: mevcut varsayılanlar + açık kapsam; bilgi güvenliği yöneticisi firma/SLA, çevik ve ITIL süreçlerinde yalnızca görür. */
export function recommendedRoleGrants(scopedModules: ReadonlySet<AppModule>): ModuleGrant[] {
  return defaultModuleGrants()
    .filter((grant) => grant.group.startsWith("role:"))
    .map((grant) => {
      const role = grant.group.slice("role:".length);
      const level: ModuleLevel =
        role === "INFOSEC_MANAGER" && ["firma-sla", "cevik", "surec"].includes(grant.module) ? "VIEW" : grant.level;
      return scopedModules.has(grant.module)
        ? { ...grant, level, scopes: defaultScopes(role, grant.module) }
        : { ...grant, level };
    });
}

export const ACL_VERSION = 3;

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
    const scopes = Array.isArray(row.scopes) ? row.scopes.map(String).filter(isModuleScope) : [];
    grants.push(scopes.length ? { module: moduleName, group, level, scopes } : { module: moduleName, group, level });
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

/** Envanterde açıkça seçilmiş kapsam (yetki matrisi); yoksa null ve eski kural geçerli. */
function inventoryScopes(viewer: AssetViewer, grants: ModuleGrant[]) {
  return viewer.role === "SUPER_ADMIN" ? null : scopesFor(grants, viewer.groups ?? [], "envanter");
}

function assetOwnerIds(viewer: AssetViewer, grants: ModuleGrant[] = []) {
  const tags = inventoryScopes(viewer, grants);
  if (tags) return tags.includes("UNIT") && viewer.unitPersonIds?.length ? viewer.unitPersonIds : [viewer.id];
  return viewer.unitPersonIds?.length ? viewer.unitPersonIds : [viewer.id];
}

function seesAllAssets(viewer: AssetViewer, grants: ModuleGrant[]) {
  if (canSeeAllInventory(inventoryLevel(grants, viewer))) return true;
  return Boolean(inventoryScopes(viewer, grants)?.includes("ALL"));
}

/** Envanter yöneticisi hepsini görür; diğerleri yalnızca zimmetinde olanı (birim amiri / sistem yöneticisi: birim personelinin de). */
export function visibleAssetWhere(viewer: AssetViewer, grants: ModuleGrant[]) {
  if (seesAllAssets(viewer, grants)) return {};
  return { ownerId: { in: assetOwnerIds(viewer, grants) } };
}

export function canViewAsset(
  viewer: AssetViewer,
  grants: ModuleGrant[],
  asset: { ownerId: string; departmentId?: string | null },
) {
  if (seesAllAssets(viewer, grants)) return true;
  return assetOwnerIds(viewer, grants).includes(asset.ownerId);
}
