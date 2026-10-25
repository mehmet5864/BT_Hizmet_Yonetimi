import { ACL_VERSION, defaultModuleGrants, migrateGrants, normalizeGrants, type ModuleGrant } from "@/lib/auth/acl";
import { DEFAULT_AD_ROLE_MAPS, type AdRoleMap } from "@/lib/auth/rbac";
import type { PersonnelRole } from "@/lib/itil/constants";
import { defaultOfficeNames, mergeOfficeNames, type OfficeNames } from "@/lib/itil/office-names";
import { defaultRequestGroups, mergeRequestGroups, type RequestGroupMap } from "@/lib/itil/request-groups";
import { isPatternId, isThemeId, type PatternId, type ThemeId } from "@/lib/theme";

export type SmtpSecure = "NONE" | "STARTTLS" | "SSL";
export type SiemProtocol = "UDP" | "TCP" | "TLS";
export type SiemLogFormat = "CEF" | "SYSLOG";
export type ScannerVendor = "NESSUS" | "TENABLE" | "QUALYS" | "OPENVAS" | "RAPID7" | "GENERIC";

export const SIEM_LOG_FORMATS: SiemLogFormat[] = ["CEF", "SYSLOG"];
export const SIEM_LOG_FORMAT_LABELS: Record<SiemLogFormat, string> = {
  CEF: "CEF",
  SYSLOG: "Syslog",
};

export const SIEM_SYSLOG_FACILITIES = [
  { value: 1, label: "user (1)" },
  { value: 3, label: "daemon (3)" },
  { value: 4, label: "auth (4)" },
  { value: 16, label: "local0 (16)" },
  { value: 17, label: "local1 (17)" },
  { value: 18, label: "local2 (18)" },
  { value: 19, label: "local3 (19)" },
] as const;
export type ScannerProtocol = "HTTPS" | "HTTP";

export const SCANNER_VENDORS: ScannerVendor[] = [
  "NESSUS",
  "TENABLE",
  "QUALYS",
  "OPENVAS",
  "RAPID7",
  "GENERIC",
];

export const SCANNER_VENDOR_LABELS: Record<ScannerVendor, string> = {
  NESSUS: "Nessus",
  TENABLE: "Tenable.io / Tenable.sc",
  QUALYS: "Qualys VMDR",
  OPENVAS: "OpenVAS / Greenbone",
  RAPID7: "Rapid7 InsightVM",
  GENERIC: "Genel REST API",
};

export const SCANNER_DEFAULT_PORTS: Record<ScannerVendor, number> = {
  NESSUS: 8834,
  TENABLE: 443,
  QUALYS: 443,
  OPENVAS: 9392,
  RAPID7: 3780,
  GENERIC: 443,
};

export const SCANNER_DEFAULT_PATHS: Record<ScannerVendor, string> = {
  NESSUS: "/scans",
  TENABLE: "/scans",
  QUALYS: "/api/2.0/fo/asset/host/vm/detection/?action=list",
  OPENVAS: "/api/v2/vulnerabilities",
  RAPID7: "/api/3/vulnerabilities",
  GENERIC: "/api/vulnerabilities",
};

export type SystemSettings = {
  ad: {
    enabled: boolean;
    host: string;
    port: number;
    useLdaps: boolean;
    /** Girişte kullanıcının OU yolundan birim ağacını kur ve kişiyi birime bağla (varsayılan kapalı). */
    ouSync: boolean;
    baseDn: string;
    bindDn: string;
    bindPassword: string;
    userFilter: string;
    groupFilter: string;
    defaultRole: PersonnelRole;
    roleMaps: AdRoleMap[];
  };
  siem: {
    enabled: boolean;
    host: string;
    port: number;
    protocol: SiemProtocol;
    logFormat: SiemLogFormat;
    cefVendor: string;
    cefProduct: string;
    cefVersion: string;
    syslogFacility: number;
    syslogAppName: string;
  };
  approval: {
    unitManager: boolean;
    seniorManager: boolean;
    infosec: boolean;
    notifyMail: boolean;
    slaHours: number;
    applyToRequests: boolean;
    applyToChanges: boolean;
    applyToPatches: boolean;
  };
  mail: {
    enabled: boolean;
    host: string;
    port: number;
    secure: SmtpSecure;
    user: string;
    password: string;
    from: string;
    fromName: string;
    testRecipient: string;
  };
  scanner: {
    enabled: boolean;
    vendor: ScannerVendor;
    host: string;
    port: number;
    protocol: ScannerProtocol;
    apiPath: string;
    accessKey: string;
    secretKey: string;
    username: string;
    password: string;
    verifyTls: boolean;
    autoMatchAssets: boolean;
    useDemoFeed: boolean;
    dueDaysCritical: number;
    dueDaysHigh: number;
    lastSyncAt: string | null;
    lastSyncMessage: string | null;
  };
  appearance: {
    theme: ThemeId;
    pattern: PatternId;
  };
  layout: {
    /** false: 1.3.0 menüsü. Kayıtlar silinmez. */
    itilV2: boolean;
  };
  acl: {
    grants: ModuleGrant[];
    version: number;
  };
  officers: Officers;
  officeNames: OfficeNames;
  /** Talep türü → AD güvenlik grubu */
  requestGroups: RequestGroupMap;
};

export const OFFICER_DEFS = [
  { key: "infosec", label: "Bilgi güvenliği yöneticisi", hint: "Problem atamasını onaylar; siber süreçlerde varsayılan BG yöneticisidir." },
  { key: "degisiklik", label: "Değişiklik yöneticisi", hint: "Yeni değişiklik kaydında varsayılan talep amiri." },
  { key: "yama", label: "Yama yöneticisi", hint: "Yeni yama kaydında varsayılan talep amiri." },
  { key: "konfigurasyon", label: "Konfigürasyon yöneticisi", hint: "Uygulama konfigürasyon kayıtlarından sorumlu kişi." },
  { key: "zafiyet", label: "Zafiyet yöneticisi", hint: "Yeni zafiyet kaydında varsayılan cihaz amiri." },
  { key: "firmaSla", label: "Firma / SLA yöneticisi", hint: "Arıza bildiriminde varsayılan birim amiri." },
  { key: "olay", label: "Olay yöneticisi", hint: "Yeni olay kaydında varsayılan talep amiri." },
  { key: "problem", label: "Problem yöneticisi", hint: "Yeni problem kaydında varsayılan talep amiri; atama onayına yetkilidir." },
  { key: "sistem", label: "Sistem şube yöneticisi", hint: "Sistem taleplerini onaylar; onaydan sonra işlem açıkta devam eder." },
  { key: "network", label: "Network şube yöneticisi", hint: "Network taleplerini onaylar." },
  { key: "siber", label: "Siber güvenlik yöneticisi", hint: "Siber güvenlik taleplerini onaylar. Boşsa bilgi güvenliği yöneticisi kullanılır." },
  { key: "yazilim", label: "Yazılım daire yöneticisi", hint: "Yazılım taleplerini onaylar." },
  { key: "veritabani", label: "Veritabanı şube yöneticisi", hint: "Veritabanı taleplerini onaylar." },
  { key: "servis", label: "Servis masası yöneticisi", hint: "Servis masası taleplerini onaylar." },
  { key: "envanter", label: "Envanter yöneticisi", hint: "Envanter (varlık) kayıtlarından ve ekleme/silme onaylarından sorumlu kişi." },
  { key: "zimmet", label: "Zimmet yöneticisi", hint: "Zimmet devri, iade ve tutanaklardan sorumlu kişi." },
  { key: "personel", label: "Personel yöneticisi", hint: "Personel kayıtları, birim ve rol atamalarından sorumlu kişi." },
  { key: "katalog", label: "Hizmet kataloğu yöneticisi", hint: "Hizmet kataloğu girişlerinden sorumlu kişi; yeni hizmette varsayılan sahip." },
  { key: "bilgi", label: "Bilgi bankası yöneticisi", hint: "Bilgi bankası makalelerini inceler ve yayınlar." },
  { key: "akis", label: "Süreç akışı yöneticisi", hint: "Süreç şablonları ve canlı süreç akışlarından sorumlu kişi." },
  { key: "tasarim", label: "Hizmet tasarımı yöneticisi", hint: "Hizmet tasarımı kayıtlarında varsayılan sorumlu." },
  { key: "kullanilabilirlik", label: "Kullanılabilirlik yöneticisi", hint: "Kullanılabilirlik kayıtlarında varsayılan sorumlu." },
  { key: "kapasite", label: "Kapasite yöneticisi", hint: "Kapasite planlama kayıtlarında varsayılan sorumlu." },
  { key: "sureklilik", label: "Süreklilik (DR) yöneticisi", hint: "Felaket kurtarma ve süreklilik kayıtlarında varsayılan sorumlu." },
  { key: "dogrulama", label: "Doğrulama ve test yöneticisi", hint: "Test ve kabul kayıtlarında varsayılan sorumlu." },
  { key: "surum", label: "Sürüm yöneticisi", hint: "Sürüm ve dağıtım kayıtlarında varsayılan sorumlu." },
  { key: "izleme", label: "İzleme (olay izleme) yöneticisi", hint: "İzleme alarm kayıtlarında varsayılan sorumlu." },
  { key: "degerlendirme", label: "Hizmet değerlendirme yöneticisi", hint: "Hizmet değerlendirme kayıtlarında varsayılan sorumlu." },
  { key: "cevik", label: "Çevik çalışma yöneticisi", hint: "Çevik ürün, sprint ve iş akışlarından sorumlu kişi (ürün sahibi ürün bazında ayrıca seçilir)." },
  { key: "rapor", label: "Rapor yöneticisi", hint: "Raporlar, dışa aktarım ve denetim listelerinden sorumlu kişi." },
] as const;

export type OfficerKey = (typeof OFFICER_DEFS)[number]["key"];

/** Önce atanması gerekenler: talep onayı (şube yöneticileri), bilgi güvenliği ve envanter onayları. */
export const CORE_OFFICER_KEYS = ["sistem", "network", "siber", "yazilim", "veritabani", "servis", "infosec", "envanter"] as const satisfies readonly OfficerKey[];
/** Önerilen: yeni kayıtlarda varsayılan talep amiri olur. */
export const RECOMMENDED_OFFICER_KEYS = ["degisiklik", "yama"] as const satisfies readonly OfficerKey[];
export type Officers = Record<OfficerKey, string>;

export function emptyOfficers(): Officers {
  return Object.fromEntries(OFFICER_DEFS.map((def) => [def.key, ""])) as Officers;
}

export function isOfficerKey(value: string): value is OfficerKey {
  return OFFICER_DEFS.some((def) => def.key === value);
}

export function officerCount(officers: Officers) {
  return OFFICER_DEFS.filter((def) => officers[def.key]).length;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  ad: {
    enabled: false,
    host: "",
    port: 389,
    useLdaps: false,
    ouSync: false,
    baseDn: "",
    bindDn: "",
    bindPassword: "",
    userFilter: "(&(objectCategory=person)(objectClass=user))",
    groupFilter: "(objectClass=group)",
    defaultRole: "USER",
    roleMaps: DEFAULT_AD_ROLE_MAPS,
  },
  siem: {
    enabled: false,
    host: "",
    port: 514,
    protocol: "UDP",
    logFormat: "CEF",
    cefVendor: "Kurum",
    cefProduct: "BTHizmetYonetimi",
    cefVersion: "1.0",
    syslogFacility: 16,
    syslogAppName: "BTHizmetYonetimi",
  },
  approval: {
    unitManager: true,
    seniorManager: false,
    infosec: true,
    notifyMail: true,
    slaHours: 24,
    applyToRequests: true,
    applyToChanges: true,
    applyToPatches: true,
  },
  mail: {
    enabled: false,
    host: "",
    port: 587,
    secure: "STARTTLS",
    user: "",
    password: "",
    from: "",
    fromName: "BT Hizmet Yönetimi",
    testRecipient: "",
  },
  scanner: {
    enabled: false,
    vendor: "NESSUS",
    host: "",
    port: 8834,
    protocol: "HTTPS",
    apiPath: "/scans",
    accessKey: "",
    secretKey: "",
    username: "",
    password: "",
    verifyTls: false,
    autoMatchAssets: true,
    useDemoFeed: true,
    dueDaysCritical: 7,
    dueDaysHigh: 14,
    lastSyncAt: null,
    lastSyncMessage: null,
  },
  appearance: {
    theme: "deniz",
    pattern: "nokta",
  },
  layout: {
    itilV2: true,
  },
  acl: {
    grants: defaultModuleGrants(),
    version: ACL_VERSION,
  },
  officers: emptyOfficers(),
  officeNames: defaultOfficeNames(),
  requestGroups: defaultRequestGroups(),
};

function mergeSection<T extends object>(base: T, incoming: unknown): T {
  if (!incoming || typeof incoming !== "object") return base;
  return { ...base, ...(incoming as T) };
}

export function parseSettings(payload: string | null | undefined): SystemSettings {
  if (!payload) return structuredClone(DEFAULT_SETTINGS);
  try {
    const raw = JSON.parse(payload) as Partial<SystemSettings>;
    return {
      ad: {
        ...mergeSection(DEFAULT_SETTINGS.ad, raw.ad),
        roleMaps: Array.isArray(raw.ad?.roleMaps) && raw.ad.roleMaps.length
          ? raw.ad.roleMaps
          : DEFAULT_SETTINGS.ad.roleMaps,
      },
      siem: mergeSiem(raw.siem),
      approval: mergeSection(DEFAULT_SETTINGS.approval, raw.approval),
      mail: mergeSection(DEFAULT_SETTINGS.mail, raw.mail),
      scanner: mergeScanner(raw.scanner),
      appearance: {
        theme: isThemeId(String(raw.appearance?.theme ?? ""))
          ? (raw.appearance!.theme as ThemeId)
          : DEFAULT_SETTINGS.appearance.theme,
        pattern: isPatternId(String(raw.appearance?.pattern ?? ""))
          ? (raw.appearance!.pattern as PatternId)
          : DEFAULT_SETTINGS.appearance.pattern,
      },
      layout: {
        itilV2: raw.layout?.itilV2 !== false,
      },
      acl: {
        grants:
          raw.acl?.version === ACL_VERSION ? normalizeGrants(raw.acl?.grants) : migrateGrants(raw.acl?.grants),
        version: ACL_VERSION,
      },
      officers: mergeOfficers(raw.officers),
      officeNames: mergeOfficeNames(raw.officeNames),
      requestGroups: mergeRequestGroups(raw.requestGroups),
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function isSiemLogFormat(value: string): value is SiemLogFormat {
  return (SIEM_LOG_FORMATS as string[]).includes(value);
}

function mergeSiem(incoming: unknown): SystemSettings["siem"] {
  const merged = mergeSection(DEFAULT_SETTINGS.siem, incoming);
  if (!isSiemLogFormat(String(merged.logFormat))) merged.logFormat = "CEF";
  if (merged.protocol !== "UDP" && merged.protocol !== "TCP" && merged.protocol !== "TLS") {
    merged.protocol = "UDP";
  }
  const facility = Number(merged.syslogFacility);
  merged.syslogFacility = Number.isFinite(facility) && facility >= 0 && facility <= 23 ? facility : 16;
  if (!merged.syslogAppName?.trim()) merged.syslogAppName = DEFAULT_SETTINGS.siem.syslogAppName;
  return merged;
}

function isScannerVendor(value: string): value is ScannerVendor {
  return (SCANNER_VENDORS as string[]).includes(value);
}

function mergeScanner(incoming: unknown): SystemSettings["scanner"] {
  const merged = mergeSection(DEFAULT_SETTINGS.scanner, incoming);
  if (!isScannerVendor(String(merged.vendor))) merged.vendor = DEFAULT_SETTINGS.scanner.vendor;
  if (merged.protocol !== "HTTP" && merged.protocol !== "HTTPS") merged.protocol = "HTTPS";
  return merged;
}

export function publicSettings(settings: SystemSettings): SystemSettings {
  return {
    ...settings,
    ad: { ...settings.ad, bindPassword: settings.ad.bindPassword ? "__KEEP__" : "" },
    mail: { ...settings.mail, password: settings.mail.password ? "__KEEP__" : "" },
    scanner: {
      ...settings.scanner,
      accessKey: settings.scanner.accessKey ? "__KEEP__" : "",
      secretKey: settings.scanner.secretKey ? "__KEEP__" : "",
      password: settings.scanner.password ? "__KEEP__" : "",
    },
    appearance: settings.appearance,
    layout: settings.layout,
    acl: settings.acl,
    officers: settings.officers,
    officeNames: settings.officeNames,
    requestGroups: settings.requestGroups,
  };
}

function mergeOfficers(incoming: unknown): Officers {
  const raw = incoming && typeof incoming === "object" ? (incoming as Record<string, unknown>) : {};
  const next = emptyOfficers();
  for (const def of OFFICER_DEFS) {
    next[def.key] = String(raw[def.key] ?? "").trim();
  }
  if (!next.infosec) next.infosec = String(raw.infosecManagerId ?? "").trim();
  if (!next.yama) next.yama = String(raw.patchManagerId ?? "").trim();
  if (!next.problem) next.problem = String(raw.problemManagerId ?? "").trim();
  return next;
}

export function applySecret(next: string, previous: string) {
  if (!next || next === "__KEEP__") return previous;
  return next;
}
