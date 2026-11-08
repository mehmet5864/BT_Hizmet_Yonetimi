/**
 * ITIL süreç / modül yöneticisi rolleri. Sistem rolünden (Süper admin, ServisAdmin, User, Manager, Supervisor) ayrı bir eksendir:
 * sistem rolü "ne tür kullanıcı", süreç rolü "hangi süreçte sorumlu" demektir. Kişiye elle ya da AD grubuyla bağlanır.
 */
export const PROCESS_ROLES = [
  "INCIDENT_MGR",
  "PROBLEM_MGR",
  "CHANGE_MGR",
  "CAB_MEMBER",
  "PATCH_MGR",
  "CMDB_MGR",
  "ASSET_CONFIG_MGR",
  "CUSTODY_MGR",
  "SECURITY_MGR",
  "PROCESS_MGR",
  "CATALOG_MGR",
  "SLM_MGR",
  "AGILE_MGR",
  "REPORT_MGR",
  "PERSONNEL_MGR",
] as const;

export type ProcessRole = (typeof PROCESS_ROLES)[number];

export const PROCESS_ROLE_LABELS: Record<ProcessRole, string> = {
  INCIDENT_MGR: "Olay yöneticisi",
  PROBLEM_MGR: "Problem yöneticisi",
  CHANGE_MGR: "Değişiklik yöneticisi",
  CAB_MEMBER: "CAB üyesi",
  PATCH_MGR: "Yama yöneticisi",
  CMDB_MGR: "Konfigürasyon (CMDB) yöneticisi",
  ASSET_CONFIG_MGR: "Envanter / varlık yöneticisi",
  CUSTODY_MGR: "Zimmet yöneticisi",
  SECURITY_MGR: "Bilgi güvenliği ve zafiyet yöneticisi",
  PROCESS_MGR: "Süreç yöneticisi (ITIL süreçleri)",
  CATALOG_MGR: "Hizmet kataloğu yöneticisi",
  SLM_MGR: "Servis seviyesi / Firma-SLA yöneticisi",
  AGILE_MGR: "Çevik çalışma yöneticisi",
  REPORT_MGR: "Rapor yöneticisi",
  PERSONNEL_MGR: "Personel yöneticisi",
};

/** Rol kataloğundaki grup başlığı. */
export const PROCESS_ROLE_CATEGORIES: Record<ProcessRole, string> = {
  INCIDENT_MGR: "Operasyon ve geçiş",
  PROBLEM_MGR: "Operasyon ve geçiş",
  CHANGE_MGR: "Operasyon ve geçiş",
  CAB_MEMBER: "Operasyon ve geçiş",
  PATCH_MGR: "Operasyon ve geçiş",
  CMDB_MGR: "Operasyon ve geçiş",
  ASSET_CONFIG_MGR: "Operasyon ve geçiş",
  CUSTODY_MGR: "Operasyon ve geçiş",
  SECURITY_MGR: "Operasyon ve geçiş",
  PROCESS_MGR: "Operasyon ve geçiş",
  CATALOG_MGR: "Tasarım ve iyileştirme",
  SLM_MGR: "Tasarım ve iyileştirme",
  AGILE_MGR: "Destek",
  REPORT_MGR: "Destek",
  PERSONNEL_MGR: "Destek",
};

/** Örnek AD grup adları (rol kataloğunda gruba bağlarken öneri olarak gösterilir). */
export const PROCESS_ROLE_AD_HINTS: Record<ProcessRole, string> = {
  INCIDENT_MGR: "IncidentMgmt_Group",
  PROBLEM_MGR: "ProblemMgmt_Group",
  CHANGE_MGR: "ChangeMgmt_Group",
  CAB_MEMBER: "CAB_Group",
  PATCH_MGR: "PatchMgmt_Group",
  CMDB_MGR: "CMDB_Group",
  ASSET_CONFIG_MGR: "AssetMgmt_Group",
  CUSTODY_MGR: "Custody_Group",
  SECURITY_MGR: "BGYS_Group",
  PROCESS_MGR: "ITILProcess_Group",
  CATALOG_MGR: "ServiceCatalog_Group",
  SLM_MGR: "SLM_Group",
  AGILE_MGR: "Agile_Group",
  REPORT_MGR: "Reporting_Group",
  PERSONNEL_MGR: "HR_Group",
};

export function isProcessRole(value: string): value is ProcessRole {
  return (PROCESS_ROLES as readonly string[]).includes(value);
}

/** Birleştirilen eski roller (v1.1.0): kayıtlı kişi ve AD eşlemeleri yeni role taşınır. */
const LEGACY_ROLE_ALIASES: Record<string, ProcessRole> = {
  VULN_MGR: "SECURITY_MGR",
  RELEASE_MGR: "PROCESS_MGR",
  MONITORING_MGR: "PROCESS_MGR",
  DESIGN_MGR: "PROCESS_MGR",
  AVAILABILITY_MGR: "PROCESS_MGR",
  CAPACITY_MGR: "PROCESS_MGR",
  CONTINUITY_MGR: "PROCESS_MGR",
  TEST_MGR: "PROCESS_MGR",
  EVAL_MGR: "PROCESS_MGR",
  KB_MGR: "PROCESS_MGR",
  FLOW_MGR: "PROCESS_MGR",
};

/** Geçerli rolü (eski adlar dahil) güncel role çevirir; tanınmazsa null. */
export function normalizeProcessRole(value: string): ProcessRole | null {
  if (isProcessRole(value)) return value;
  return LEGACY_ROLE_ALIASES[value] ?? null;
}

export function parseProcessRoles(raw: string | null | undefined): ProcessRole[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((v) => normalizeProcessRole(String(v))).filter((v): v is ProcessRole => v !== null))];
  } catch {
    return [];
  }
}

export function serializeProcessRoles(roles: readonly string[]): string | null {
  const clean = [...new Set(roles.filter(isProcessRole))];
  return clean.length ? JSON.stringify(clean) : null;
}

/** AD güvenlik grubu → süreç rolü eşlemesi (Ayarlar → Yetki ve roller → Rol kataloğu). */
export type ProcessRoleMap = { group: string; role: ProcessRole };

const norm = (value: string) => value.trim().toLocaleLowerCase("tr-TR");

export function mapAdGroupsToProcessRoles(groups: readonly string[], maps: readonly ProcessRoleMap[]): ProcessRole[] {
  const have = new Set(groups.map(norm));
  const out = new Set<ProcessRole>();
  for (const map of maps) {
    const role = normalizeProcessRole(String(map.role));
    if (!role) continue;
    const needle = norm(map.group);
    if (needle && have.has(needle)) out.add(role);
  }
  return [...out];
}

/**
 * Kişinin etkin süreç görevleri: elle atananlar + AD grup eşlemesinden gelenler (birleşim).
 * Rol kaynağı "yalnızca AD" olsa bile elle atanan görev korunur; AD'den gelen görev AD grubundan çıkınca kendiliğinden düşer.
 */
export function effectiveProcessRoles(
  manualRaw: string | null | undefined,
  adGroups: readonly string[],
  maps: readonly ProcessRoleMap[],
): ProcessRole[] {
  return [...new Set([...parseProcessRoles(manualRaw), ...mapAdGroupsToProcessRoles(adGroups, maps)])];
}

/**
 * Süreç görevinin kendiliğinden yönettiği / işlediği modüller (yetki matrisinde açık satır yoksa geçerli varsayılan).
 * Matriste süreç görevi sütunundan değiştirilebilir. Süreç görevi olmayan kişiyi etkilemez.
 */
export const PROCESS_ROLE_DEFAULTS: Record<ProcessRole, Partial<Record<string, "VIEW" | "HANDLE" | "ADMIN">>> = {
  INCIDENT_MGR: { "olay": "ADMIN" },
  PROBLEM_MGR: { "problem": "ADMIN" },
  CHANGE_MGR: { "degisiklik": "ADMIN" },
  CAB_MEMBER: { "degisiklik": "HANDLE" },
  PATCH_MGR: { "yama": "ADMIN" },
  CMDB_MGR: { "konfigurasyon": "ADMIN" },
  ASSET_CONFIG_MGR: { "envanter": "ADMIN" },
  CUSTODY_MGR: { "envanter": "HANDLE" },
  SECURITY_MGR: { "zafiyet": "ADMIN" },
  PROCESS_MGR: { "surec": "ADMIN" },
  CATALOG_MGR: { "katalog": "ADMIN" },
  SLM_MGR: { "firma-sla": "ADMIN" },
  AGILE_MGR: { "cevik": "ADMIN" },
  REPORT_MGR: { "raporlar": "ADMIN" },
  PERSONNEL_MGR: { "personel": "ADMIN" },
};
