/**
 * ITIL süreç görevleri. Sistem rolünden (Süper admin, ServisAdmin, User, Manager, Supervisor) ayrı bir eksendir:
 * rol "ne tür kullanıcı", süreç görevi "hangi süreçte sorumlu" demektir. Kişiye elle ya da AD grubuyla atanır.
 */
/**
 * ITIL süreç / modül yöneticisi rolleri. Sistem rolünden (Süper admin, ServisAdmin, User, Manager, Supervisor) ayrı bir eksendir:
 * sistem rolü "ne tür kullanıcı", süreç rolü "hangi süreçte sorumlu" demektir. Kişiye elle ya da AD grubuyla bağlanır.
 */
export const PROCESS_ROLES = [
  "INCIDENT_MGR",
  "PROBLEM_MGR",
  "CHANGE_MGR",
  "CAB_MEMBER",
  "RELEASE_MGR",
  "PATCH_MGR",
  "CMDB_MGR",
  "ASSET_CONFIG_MGR",
  "CUSTODY_MGR",
  "SECURITY_MGR",
  "VULN_MGR",
  "MONITORING_MGR",
  "CATALOG_MGR",
  "DESIGN_MGR",
  "SLM_MGR",
  "AVAILABILITY_MGR",
  "CAPACITY_MGR",
  "CONTINUITY_MGR",
  "TEST_MGR",
  "EVAL_MGR",
  "KB_MGR",
  "FLOW_MGR",
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
  RELEASE_MGR: "Sürüm yöneticisi",
  PATCH_MGR: "Yama yöneticisi",
  CMDB_MGR: "Konfigürasyon (CMDB) yöneticisi",
  ASSET_CONFIG_MGR: "Envanter / varlık yöneticisi",
  CUSTODY_MGR: "Zimmet yöneticisi",
  SECURITY_MGR: "Bilgi güvenliği yöneticisi (BGYS)",
  VULN_MGR: "Zafiyet yöneticisi",
  MONITORING_MGR: "İzleme (olay izleme) yöneticisi",
  CATALOG_MGR: "Hizmet kataloğu yöneticisi",
  DESIGN_MGR: "Hizmet tasarımı yöneticisi",
  SLM_MGR: "Servis seviyesi / Firma-SLA yöneticisi",
  AVAILABILITY_MGR: "Kullanılabilirlik yöneticisi",
  CAPACITY_MGR: "Kapasite yöneticisi",
  CONTINUITY_MGR: "Süreklilik (DR) yöneticisi",
  TEST_MGR: "Doğrulama ve test yöneticisi",
  EVAL_MGR: "Hizmet değerlendirme yöneticisi",
  KB_MGR: "Bilgi bankası yöneticisi",
  FLOW_MGR: "Süreç akışı yöneticisi",
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
  RELEASE_MGR: "Operasyon ve geçiş",
  PATCH_MGR: "Operasyon ve geçiş",
  CMDB_MGR: "Operasyon ve geçiş",
  ASSET_CONFIG_MGR: "Operasyon ve geçiş",
  CUSTODY_MGR: "Operasyon ve geçiş",
  SECURITY_MGR: "Operasyon ve geçiş",
  VULN_MGR: "Operasyon ve geçiş",
  MONITORING_MGR: "Operasyon ve geçiş",
  CATALOG_MGR: "Tasarım ve iyileştirme",
  DESIGN_MGR: "Tasarım ve iyileştirme",
  SLM_MGR: "Tasarım ve iyileştirme",
  AVAILABILITY_MGR: "Tasarım ve iyileştirme",
  CAPACITY_MGR: "Tasarım ve iyileştirme",
  CONTINUITY_MGR: "Tasarım ve iyileştirme",
  TEST_MGR: "Tasarım ve iyileştirme",
  EVAL_MGR: "Tasarım ve iyileştirme",
  KB_MGR: "Destek",
  FLOW_MGR: "Destek",
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
  RELEASE_MGR: "ReleaseMgmt_Group",
  PATCH_MGR: "PatchMgmt_Group",
  CMDB_MGR: "CMDB_Group",
  ASSET_CONFIG_MGR: "AssetMgmt_Group",
  CUSTODY_MGR: "Custody_Group",
  SECURITY_MGR: "BGYS_Group",
  VULN_MGR: "VulnMgmt_Group",
  MONITORING_MGR: "Monitoring_Group",
  CATALOG_MGR: "ServiceCatalog_Group",
  DESIGN_MGR: "ServiceDesign_Group",
  SLM_MGR: "SLM_Group",
  AVAILABILITY_MGR: "Availability_Group",
  CAPACITY_MGR: "Capacity_Group",
  CONTINUITY_MGR: "Continuity_Group",
  TEST_MGR: "Validation_Group",
  EVAL_MGR: "Evaluation_Group",
  KB_MGR: "KnowledgeBase_Group",
  FLOW_MGR: "ProcessFlow_Group",
  AGILE_MGR: "Agile_Group",
  REPORT_MGR: "Reporting_Group",
  PERSONNEL_MGR: "HR_Group",
};

export function isProcessRole(value: string): value is ProcessRole {
  return (PROCESS_ROLES as readonly string[]).includes(value);
}

export function parseProcessRoles(raw: string | null | undefined): ProcessRole[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(String).filter(isProcessRole))];
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
    if (!isProcessRole(map.role)) continue;
    const needle = norm(map.group);
    if (needle && have.has(needle)) out.add(map.role);
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
  RELEASE_MGR: { "surec": "HANDLE" },
  PATCH_MGR: { "yama": "ADMIN" },
  CMDB_MGR: { "konfigurasyon": "ADMIN" },
  ASSET_CONFIG_MGR: { "envanter": "ADMIN" },
  CUSTODY_MGR: { "envanter": "HANDLE" },
  SECURITY_MGR: { "zafiyet": "ADMIN" },
  VULN_MGR: { "zafiyet": "ADMIN" },
  MONITORING_MGR: { "surec": "HANDLE" },
  CATALOG_MGR: { "katalog": "ADMIN" },
  DESIGN_MGR: { "surec": "HANDLE" },
  SLM_MGR: { "firma-sla": "ADMIN" },
  AVAILABILITY_MGR: { "surec": "HANDLE" },
  CAPACITY_MGR: { "surec": "HANDLE" },
  CONTINUITY_MGR: { "surec": "HANDLE" },
  TEST_MGR: { "surec": "HANDLE" },
  EVAL_MGR: { "surec": "HANDLE" },
  KB_MGR: { "surec": "HANDLE" },
  FLOW_MGR: { "surec": "HANDLE" },
  AGILE_MGR: { "cevik": "ADMIN" },
  REPORT_MGR: { "raporlar": "ADMIN" },
  PERSONNEL_MGR: { "personel": "ADMIN" },
};
