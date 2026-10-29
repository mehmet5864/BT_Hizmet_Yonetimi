/**
 * Envanter kaydının "hizmet / sunucu türü": üzerinden talep açılabilecek kayıtlar için açıkça girilir
 * (güvenlik duvarı, NAC, aktif dizin, sanallaştırma …). Doluysa talep formundaki ürün listeleri
 * adı/markayı tahmin etmek yerine bu türe bakar; boşsa eski otomatik tanıma çalışır.
 */
export type ServiceKind = { value: string; label: string; /** Bu türün listelendiği talep alanları */ fields: string[]; /** Topolojide çizim şekli */ shape?: "firewall" | "storage" | "database" | "antivirus" };

export const SERVICE_KINDS: ServiceKind[] = [
  { value: "FIREWALL", label: "Güvenlik duvarı (NGFW)", fields: ["fwVendor"], shape: "firewall" },
  { value: "WAF", label: "WAF (web uygulama güvenlik duvarı)", fields: ["wafProduct"], shape: "firewall" },
  { value: "NAC", label: "NAC (ağ erişim kontrolü)", fields: ["nacProduct"] },
  { value: "ACTIVE_DIRECTORY", label: "Aktif dizin (AD / DNS / DHCP / PKI)", fields: ["dnsProduct"] },
  { value: "VIRTUALIZATION", label: "Sanallaştırma platformu", fields: [] },
  { value: "ROUTER", label: "Router", fields: ["routeDevice"] },
  { value: "SWITCH", label: "Switch", fields: ["switchDevice"] },
  { value: "LOAD_BALANCER", label: "Yük dengeleyici", fields: ["lbProduct"] },
  { value: "WLAN", label: "Kablosuz ağ denetleyicisi", fields: ["wlanProduct"] },
  { value: "VPN", label: "VPN geçidi", fields: ["vpnProduct"] },
  { value: "MAIL_GATEWAY", label: "E-posta güvenlik geçidi", fields: ["mailGateway"] },
  { value: "MAIL_SERVER", label: "E-posta sunucusu (Exchange)", fields: [] },
  { value: "WEB_GATEWAY", label: "Proxy / web güvenlik geçidi", fields: ["wgProduct"] },
  { value: "SANDBOX", label: "Sandbox", fields: ["sandboxProduct"] },
  { value: "SIEM", label: "Log yönetimi / SIEM", fields: ["siemPlatform"] },
  { value: "FORENSIC", label: "Adli bilişim aracı", fields: ["forensicTool"] },
  { value: "VULN_SCANNER", label: "Zafiyet tarama", fields: ["scanProduct", "scanEngine"] },
  { value: "ANTIVIRUS_EDR", label: "Antivirüs / EDR", fields: ["avProduct"], shape: "antivirus" },
  { value: "DLP", label: "DLP", fields: ["dlpProduct"] },
  { value: "PAM", label: "PAM (ayrıcalıklı erişim)", fields: ["pamProduct"] },
  { value: "BACKUP", label: "Yedekleme sistemi", fields: ["backupProduct"] },
  { value: "SFTP", label: "Dosya aktarım (SFTP) sunucusu", fields: ["sftpServer"] },
  { value: "DATABASE", label: "Veritabanı sunucusu / motoru", fields: ["dbEngine"], shape: "database" },
  { value: "STORAGE", label: "Depolama (SAN / NAS)", fields: [], shape: "storage" },
  { value: "FILE_SERVER", label: "Dosya sunucusu", fields: [] },
  { value: "DEVOPS", label: "Yazılım geliştirme aracı (ALM / SCM / CI-CD)", fields: ["almTool", "scmProduct", "cicdProduct", "releaseTool", "qualityTool", "migrationTool"] },
  { value: "API_GATEWAY", label: "API yönetim geçidi", fields: ["apimProduct"] },
  { value: "SERVICE_DESK", label: "Hizmet masası aracı", fields: ["sdProduct"] },
  { value: "OTHER", label: "Diğer", fields: [] },
];

export const SERVICE_KIND_VALUES = new Set(SERVICE_KINDS.map((k) => k.value));

export function serviceKindOf(value: string | null | undefined) {
  return value ? SERVICE_KINDS.find((k) => k.value === value) : undefined;
}
