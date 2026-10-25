import type { PersonnelRole } from "@/lib/itil/constants";
import { PERSONNEL_ROLE_LABELS, PERSONNEL_ROLES } from "@/lib/itil/constants";

export const ROLE_RANK: Record<PersonnelRole, number> = {
  USER: 1,
  UNIT_MANAGER: 2,
  SENIOR_MANAGER: 3,
  INFOSEC_MANAGER: 4,
  SYSTEM_ADMIN: 5,
  SUPER_ADMIN: 6,
};

export const ROLE_SOURCES = ["MANUAL", "AD", "BOTH"] as const;
export type RoleSource = (typeof ROLE_SOURCES)[number];

export const ROLE_SOURCE_LABELS: Record<RoleSource, string> = {
  MANUAL: "Manuel",
  AD: "Active Directory",
  BOTH: "AD + manuel (yüksek olan)",
};

export type AdRoleMap = { group: string; role: PersonnelRole };

export const DEFAULT_AD_ROLE_MAPS: AdRoleMap[] = [
  { group: "GG_SuperYoneticiler", role: "SUPER_ADMIN" },
  { group: "GG_SistemYoneticileri", role: "SYSTEM_ADMIN" },
  { group: "GG_UstAmirler", role: "SENIOR_MANAGER" },
  { group: "GG_BilgiGuvenligi", role: "INFOSEC_MANAGER" },
  { group: "GG_BirimAmirleri", role: "UNIT_MANAGER" },
  { group: "Domain Users", role: "USER" },
];

export function higherRole(a: PersonnelRole, b: PersonnelRole): PersonnelRole {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}

export function isPersonnelRole(value: string): value is PersonnelRole {
  return (PERSONNEL_ROLES as readonly string[]).includes(value);
}

export function mapAdGroupsToRole(groups: string[], maps: AdRoleMap[], fallback: PersonnelRole = "USER") {
  let role: PersonnelRole | null = null;
  const normalized = groups.map((group) => group.trim().toLocaleLowerCase("tr-TR"));
  for (const rule of maps) {
    const needle = rule.group.trim().toLocaleLowerCase("tr-TR");
    if (!needle) continue;
    const hit = normalized.some((group) => group === needle);
    if (hit) role = role ? higherRole(role, rule.role) : rule.role;
  }
  return role ?? fallback;
}

export function resolveEffectiveRole(input: {
  roleSource: string;
  manualRole: string;
  adGroups: string[];
  maps: AdRoleMap[];
  defaultAdRole?: PersonnelRole;
}): PersonnelRole {
  const manual = isPersonnelRole(input.manualRole) ? input.manualRole : "USER";
  const fromAd = mapAdGroupsToRole(input.adGroups, input.maps, input.defaultAdRole ?? "USER");
  if (input.roleSource === "AD") return fromAd;
  if (input.roleSource === "BOTH") return higherRole(manual, fromAd);
  return manual;
}

export type AppModule =
  | "dashboard"
  | "personel"
  | "envanter"
  | "talepler"
  | "degisiklik"
  | "yama"
  | "konfigurasyon"
  | "zafiyet"
  | "firma-sla"
  | "olay"
  | "problem"
  | "cevik"
  | "katalog"
  | "surec"
  | "hareketler"
  | "raporlar"
  | "kilavuzlar"
  | "api"
  | "ayarlar";

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: "Genel bakış",
  personel: "Personel",
  envanter: "Envanter yönetimi",
  talepler: "Talep yönetimi",
  degisiklik: "Değişiklik yönetimi",
  yama: "Yama yönetimi",
  konfigurasyon: "Konfigürasyon yönetimi",
  zafiyet: "Zafiyet yönetimi",
  "firma-sla": "Firma / SLA yönetimi",
  olay: "Olay yönetimi",
  problem: "Problem yönetimi",
  cevik: "Çevik çalışma (Agile)",
  katalog: "Hizmet kataloğu",
  surec: "ITIL süreçleri",
  hareketler: "Audit log",
  raporlar: "Raporlar",
  kilavuzlar: "Kılavuzlar",
  api: "API arayüzü",
  ayarlar: "Ayarlar",
};

const ALL_ROLES_NO_ADMIN: PersonnelRole[] = PERSONNEL_ROLES.filter((role) => role !== "USER");
const NO_API_ROLES: PersonnelRole[] = ["SUPER_ADMIN", "SYSTEM_ADMIN", "SENIOR_MANAGER", "INFOSEC_MANAGER"];

/**
 * Modül erişimi (rol bazlı taban):
 * - Düz kullanıcı: hizmet masası (talepler), envanter/personel (yalnızca kendi kaydı), katalog, rapor, kılavuz. ITIL süreç modüllerini yalnızca kendisine görev atandığında görür (assigned.ts).
 * - Birim amiri: Ayarlar ve API hariç tüm modüller (kayıtlar kapsam filtresiyle sınırlanır, bkz. data-scope.ts).
 * - Sistem yöneticisi: Ayarlar hariç tüm modüller.
 * - Diğer roller (üst amir, bilgi güvenliği, süper admin): önceki davranış.
 */
export const MODULE_ROLES: Record<AppModule, PersonnelRole[]> = {
  dashboard: [...PERSONNEL_ROLES],
  envanter: [...PERSONNEL_ROLES],
  talepler: [...PERSONNEL_ROLES],
  katalog: [...PERSONNEL_ROLES],
  personel: [...PERSONNEL_ROLES],
  degisiklik: ALL_ROLES_NO_ADMIN,
  yama: ALL_ROLES_NO_ADMIN,
  konfigurasyon: ALL_ROLES_NO_ADMIN,
  zafiyet: ALL_ROLES_NO_ADMIN,
  "firma-sla": ALL_ROLES_NO_ADMIN,
  olay: ALL_ROLES_NO_ADMIN,
  problem: ALL_ROLES_NO_ADMIN,
  cevik: ALL_ROLES_NO_ADMIN,
  surec: ALL_ROLES_NO_ADMIN,
  hareketler: [...PERSONNEL_ROLES],
  raporlar: [...PERSONNEL_ROLES],
  kilavuzlar: [...PERSONNEL_ROLES],
  api: NO_API_ROLES,
  ayarlar: ["SUPER_ADMIN"],
};

export function isRequesterOnly(role?: string | null) {
  return !role || role === "USER";
}

export function canMutateInventory(role?: string | null) {
  return isPersonnelRole(role ?? "") && role !== "USER";
}

export function canAssignRole(actorRole: string | null | undefined, targetRole: string) {
  if (!actorRole || !isPersonnelRole(actorRole) || !isPersonnelRole(targetRole)) return false;
  if (actorRole === "SUPER_ADMIN") return true;
  if (targetRole === "SUPER_ADMIN") return false;
  return ROLE_RANK[actorRole] >= ROLE_RANK[targetRole];
}

export function moduleForPath(pathname: string): AppModule | null {
  if (pathname === "/" || pathname === "") return "dashboard";
  if (pathname.startsWith("/personel/hareketler") || pathname.startsWith("/hareketler")) return "hareketler";
  if (pathname.startsWith("/personel")) return "personel";
  if (pathname.startsWith("/envanter")) return "envanter";
  if (pathname.startsWith("/talepler")) return "talepler";
  if (pathname.startsWith("/katalog") || pathname.startsWith("/hizmetler")) return "katalog";
  if (pathname.startsWith("/surec")) return "surec";
  if (pathname.startsWith("/degisiklik")) return "degisiklik";
  if (pathname.startsWith("/yama")) return "yama";
  if (pathname.startsWith("/konfigurasyon")) return "konfigurasyon";
  if (pathname.startsWith("/zafiyet")) return "zafiyet";
  if (pathname.startsWith("/firma-sla")) return "firma-sla";
  if (pathname.startsWith("/olay")) return "olay";
  if (pathname.startsWith("/problem")) return "problem";
  if (pathname.startsWith("/cevik")) return "cevik";
  if (pathname.startsWith("/raporlar")) return "raporlar";
  if (pathname.startsWith("/kilavuzlar")) return "kilavuzlar";
  if (pathname.startsWith("/api-arayuzu")) return "api";
  if (pathname.startsWith("/is-akisi")) return "dashboard";
  if (pathname.startsWith("/ayarlar")) return "ayarlar";
  return null;
}

export function canManagePerson(actorRole: string | null | undefined, targetRole: string) {
  if (!actorRole || !isPersonnelRole(actorRole) || !isPersonnelRole(targetRole)) return false;
  if (actorRole === "SUPER_ADMIN") return true;
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

export function canDeleteRecords(role?: string | null) {
  return role === "SUPER_ADMIN";
}

export function roleLabel(role: string) {
  return isPersonnelRole(role) ? PERSONNEL_ROLE_LABELS[role] : role;
}
