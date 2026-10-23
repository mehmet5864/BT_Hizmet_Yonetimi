import type { FieldDef } from "@/lib/inventory/fields";
import { defaultOfficeNames, type OfficeNames } from "@/lib/itil/office-names";

export const REQUEST_OFFICES = ["SISTEM", "NETWORK", "SIBER", "YAZILIM", "VERITABANI", "SERVIS"] as const;
export type RequestOffice = (typeof REQUEST_OFFICES)[number];

export const REQUEST_OFFICE_LABELS: Record<RequestOffice, string> = {
  SISTEM: "Sistem Şube Müdürlüğü",
  NETWORK: "Network Şube Müdürlüğü",
  SIBER: "Siber Güvenlik Daire Başkanlığı",
  YAZILIM: "Yazılım Daire Başkanlığı",
  VERITABANI: "Veritabanı Şube Müdürlüğü",
  SERVIS: "Servis Masası / Yardım Masası",
};

export const REQUEST_OFFICE_NAV_LABELS: Record<RequestOffice, string> = {
  SISTEM: "Sistem Şb. Md.",
  NETWORK: "Network Şb. Md.",
  SIBER: "Siber Güvenlik DB",
  YAZILIM: "Yazılım DB",
  VERITABANI: "Veritabanı Şb. Md.",
  SERVIS: "Servis Masası",
};

export type RequestTypeKey =
  | "AD_USER"
  | "AD_GROUP"
  | "GPO"
  | "LOCAL_ADMIN"
  | "PASSWORD"
  | "SERVICE_ACCOUNT"
  | "IP_RESERVE"
  | "SERVER_NEW"
  | "SERVER_UPDATE"
  | "SERVER_REMOVE"
  | "BACKUP"
  | "RESTORE"
  | "MAIL_RELAY"
  | "MAIL_RELAY_CANCEL"
  | "VMWARE_GUEST"
  | "SCCM_DEPLOY"
  | "FILE_SHARE"
  | "CERTIFICATE"
  | "MAILBOX"
  | "NAC"
  | "SERVER_MONITOR"
  | "VLAN"
  | "LOAD_BALANCER"
  | "WIRELESS"
  | "FW_INTRANET"
  | "FW_INTERNET"
  | "SIEM_LOG"
  | "SIEM_CORRELATION"
  | "FORENSIC"
  | "VULN_SCAN"
  | "DNS"
  | "VPN"
  | "PORTABLE_SCAN"
  | "ANTIVIRUS"
  | "DLP_EXCEPTION"
  | "WAF"
  | "PAM_ACCESS"
  | "APP_PROJECT"
  | "REPO_ACCESS"
  | "CICD_PIPELINE"
  | "RELEASE_DEPLOY"
  | "TEST_ENV"
  | "API_INTEGRATION"
  | "CODE_QUALITY"
  | "DB_CREATE"
  | "DB_USER"
  | "DB_SCRIPT"
  | "DB_BACKUP"
  | "DB_PERF"
  | "DB_EXPORT"
  | "DB_REFRESH"
  | "SD_SUPPORT"
  | "SD_HARDWARE"
  | "SD_ACCESS"
  | "SD_SOFTWARE";

type RequestField = Omit<FieldDef, "id"> & { id: string };

export type RequestTypeDef = {
  key: RequestTypeKey;
  office: RequestOffice;
  label: string;
  group: string;
  description: string;
  slug: string;
  extraFields: RequestField[];
};

export const REQUEST_TYPES: Record<RequestTypeKey, RequestTypeDef> = {
  AD_USER: {
    key: "AD_USER",
    office: "SISTEM",
    label: "Kullanıcı oluşturma / silme / güncelleme",
    group: "AD grup ve yetki",
    description: "Microsoft Active Directory / Entra ID hesap işlemi.",
    slug: "kullanici",
    extraFields: [
      { id: "username", label: "Kullanıcı adı (sAMAccountName)", kind: "text", required: true, row: "islem" },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "CREATE", label: "Oluşturma" },
        { value: "UPDATE", label: "Güncelleme" },
        { value: "DELETE", label: "Silme" },
        { value: "ENABLE", label: "Etkinleştirme" },
        { value: "DISABLE", label: "Devre dışı bırakma" },
      ] },
      { id: "displayName", label: "Görünen ad", kind: "text", row: "kimlik" },
      { id: "upn", label: "UPN / e-posta", kind: "text", row: "kimlik", placeholder: "ad.soyad@kurum.gov.tr" },
      { id: "ouPath", label: "OU / birim yolu", kind: "text", row: "dizin", placeholder: "OU=IK,OU=Kurum,DC=kurum,DC=local" },
      { id: "directory", label: "Dizin", kind: "select", row: "dizin", options: [
        { value: "AD", label: "Active Directory" },
        { value: "ENTRA", label: "Microsoft Entra ID" },
        { value: "BOTH", label: "AD + Entra (hybrid)" },
      ] },
    ],
  },
  AD_GROUP: {
    key: "AD_GROUP",
    office: "SISTEM",
    label: "Grup talep / yetkilendirme",
    group: "AD grup ve yetki",
    description: "AD güvenlik / dağıtım grubu veya Entra ID rol grubu.",
    slug: "grup-yetki",
    extraFields: [
      { id: "username", label: "Kullanıcı adı", kind: "text", row: "grup" },
      { id: "groupName", label: "Grup adı", kind: "text", required: true, row: "grup" },
      { id: "actionKind", label: "İşlem", kind: "select", options: [
        { value: "ADD", label: "Ekleme" },
        { value: "REMOVE", label: "Çıkarma" },
        { value: "CREATE_GROUP", label: "Yeni grup oluştur" },
      ] },
      { id: "groupType", label: "Grup türü", kind: "select", row: "tur", options: [
        { value: "SECURITY", label: "Güvenlik grubu" },
        { value: "DISTRIBUTION", label: "Dağıtım grubu" },
        { value: "ENTRA_ROLE", label: "Entra ID rol grubu" },
      ] },
      { id: "groupScope", label: "Kapsam", kind: "select", row: "tur", options: [
        { value: "GLOBAL", label: "Global" },
        { value: "DOMAIN_LOCAL", label: "Domain Local" },
        { value: "UNIVERSAL", label: "Universal" },
      ] },
    ],
  },
  GPO: {
    key: "GPO",
    office: "SISTEM",
    label: "GPO talep",
    group: "AD grup ve yetki",
    description: "Microsoft Group Policy — OU bağlantısı, WMI filtresi ve güvenlik süzgeci.",
    slug: "gpo",
    extraFields: [
      { id: "gpoName", label: "GPO adı", kind: "text", required: true, row: "gpo" },
      { id: "targetOu", label: "Hedef OU / birim", kind: "text", row: "gpo" },
      { id: "gpoAction", label: "İşlem", kind: "select", row: "politika", options: [
        { value: "CREATE", label: "Yeni GPO" },
        { value: "LINK", label: "OU'ya bağla" },
        { value: "UPDATE", label: "Ayar güncelle" },
        { value: "UNLINK", label: "Bağlantıyı kaldır" },
      ] },
      { id: "wmiFilter", label: "WMI filtresi / güvenlik süzgeci", kind: "text", row: "politika" },
    ],
  },
  LOCAL_ADMIN: {
    key: "LOCAL_ADMIN",
    office: "SISTEM",
    label: "Local admin yetkisi",
    group: "AD grup ve yetki",
    description: "Yerel Administrators, LAPS veya Privileged Access Workstation istisnası.",
    slug: "local-admin",
    extraFields: [
      { id: "username", label: "Kullanıcı adı", kind: "text", required: true },
      { id: "hostName", label: "Sunucu / istemci adı", kind: "text", row: "hedef" },
      { id: "hostIp", label: "IP adresi", kind: "text", row: "hedef" },
      { id: "adminScope", label: "Yetki türü", kind: "select", row: "yetki", options: [
        { value: "LOCAL_ADMIN", label: "Yerel Administrators" },
        { value: "LAPS", label: "LAPS / Windows LAPS" },
        { value: "SUDO", label: "Linux sudo" },
        { value: "PAW", label: "PAW / ayrıcalıklı iş istasyonu" },
      ] },
      { id: "validUntil", label: "Geçerlilik süresi", kind: "date", row: "yetki" },
    ],
  },
  PASSWORD: {
    key: "PASSWORD",
    office: "SISTEM",
    label: "Şifre değişiklik / sıfırlama",
    group: "AD grup ve yetki",
    description: "",
    slug: "sifre",
    extraFields: [
      { id: "username", label: "Kullanıcı adı", kind: "text", required: true, row: "sifre" },
      { id: "passwordAction", label: "Şifre işlemi", kind: "select", required: true, row: "sifre", options: [
        { value: "RESET", label: "Sıfırlama" },
        { value: "UPDATE", label: "Güncelleme" },
        { value: "UNLOCK", label: "Hesap kilidi aç" },
      ] },
      { id: "mustChange", label: "İlk girişte değiştirilsin", kind: "select", options: [
        { value: "YES", label: "Evet" },
        { value: "NO", label: "Hayır" },
      ] },
    ],
  },
  SERVICE_ACCOUNT: {
    key: "SERVICE_ACCOUNT",
    office: "SISTEM",
    label: "Servis kullanıcı talep",
    group: "AD grup ve yetki",
    description: "gMSA, klasik servis hesabı veya uygulama kimliği.",
    slug: "servis-kullanici",
    extraFields: [
      { id: "username", label: "Hesap adı", kind: "text", row: "hesap" },
      { id: "systemName", label: "Kullanılacak sistem / uygulama", kind: "text", required: true, row: "hesap" },
      { id: "hostName", label: "Sunucu / istemci adı", kind: "text", row: "hedef" },
      { id: "hostIp", label: "Sunucu / istemci IP", kind: "text", row: "hedef" },
      { id: "accountKind", label: "Hesap türü", kind: "select", row: "tur", options: [
        { value: "CLASSIC", label: "Klasik servis hesabı" },
        { value: "GMSA", label: "gMSA" },
        { value: "MANAGED_IDENTITY", label: "Managed Identity / uygulama kimliği" },
      ] },
      { id: "spn", label: "SPN", kind: "text", row: "tur", placeholder: "HTTP/uygulama.kurum.local" },
    ],
  },
  IP_RESERVE: {
    key: "IP_RESERVE",
    office: "SISTEM",
    label: "IP sabitleme talep",
    group: "IP sabitleme",
    description: "DHCP rezervasyonu (Microsoft DHCP / Infoblox / Cisco).",
    slug: "ip-sabitleme",
    extraFields: [
      { id: "hostName", label: "Sunucu / istemci adı", kind: "text", required: true, row: "hedef" },
      { id: "hostIp", label: "Sunucu / istemci IP", kind: "text", required: true, row: "hedef" },
      { id: "macAddress", label: "MAC adresi", kind: "text", row: "ag" },
      { id: "dhcpScope", label: "DHCP kapsamı / Infoblox ağı", kind: "text", row: "ag" },
    ],
  },
  SERVER_NEW: {
    key: "SERVER_NEW",
    office: "SISTEM",
    label: "Sunucu talebi",
    group: "Sunucu işlemleri",
    description: "VMware vSphere, Microsoft Hyper-V, Nutanix AHV veya KVM üzerinde yeni sunucu.",
    slug: "sunucu-talep",
    extraFields: [
      { id: "hostName", label: "Önerilen sunucu adı", kind: "text", required: true, row: "kimlik" },
      { id: "environment", label: "Ortam", kind: "select", required: true, row: "kimlik", options: [
        { value: "PROD", label: "Üretim" },
        { value: "TEST", label: "Test" },
        { value: "DEV", label: "Geliştirme" },
        { value: "DR", label: "Felaket kurtarma" },
      ] },
      { id: "hypervisor", label: "Sanallaştırma platformu", kind: "select", required: true, row: "platform", hint: "Yalnızca hipervizör ailesi. Nessus / Acunetix / OpenShift burada yoktur.", options: [
        { value: "VMWARE", label: "Sanallaştırma · VMware vSphere / ESXi" },
        { value: "HYPERV", label: "Sanallaştırma · Microsoft Hyper-V" },
        { value: "NUTANIX", label: "Sanallaştırma · Nutanix AHV" },
        { value: "KVM", label: "Sanallaştırma · KVM / Proxmox" },
        { value: "PHYSICAL", label: "Fiziksel sunucu" },
      ] },
      { id: "clusterName", label: "Küme / vCenter / cluster", kind: "text", row: "platform" },
      { id: "operatingSystem", label: "İşletim sistemi", kind: "text", required: true, placeholder: "Windows Server 2022, RHEL 9…" },
      { id: "cpuCount", label: "vCPU / işlemci", kind: "text", row: "kaynak" },
      { id: "ramAmount", label: "RAM miktarı", kind: "text", row: "kaynak" },
      { id: "diskCapacity", label: "Disk kapasitesi", kind: "text", row: "depolama" },
      { id: "interfaceCount", label: "Ağ kartı sayısı", kind: "text", row: "depolama" },
      { id: "purpose", label: "Kullanım amacı / uygulama", kind: "text", fullWidth: true },
    ],
  },
  SERVER_UPDATE: {
    key: "SERVER_UPDATE",
    office: "SISTEM",
    label: "Sunucu güncelleme talebi",
    group: "Sunucu işlemleri",
    description: "Kaynak artırımı, disk ekleme veya ağ kartı değişikliği.",
    slug: "sunucu-guncelleme",
    extraFields: [
      { id: "hostName", label: "Sunucu / istemci adı", kind: "text", required: true, row: "hedef" },
      { id: "hostIp", label: "Sunucu / istemci IP", kind: "text", row: "hedef" },
      { id: "macAddress", label: "MAC adresi", kind: "text" },
      { id: "operatingSystem", label: "İşletim sistemi", kind: "text" },
      { id: "cpuCount", label: "İşlemci sayısı", kind: "text", row: "kaynak" },
      { id: "ramAmount", label: "RAM miktarı", kind: "text", row: "kaynak" },
      { id: "diskCapacity", label: "Disk kapasitesi", kind: "text", row: "depolama" },
      { id: "interfaceCount", label: "Interface sayısı", kind: "text", row: "depolama" },
      { id: "changeReason", label: "Değişiklik gerekçesi", kind: "textarea", fullWidth: true },
    ],
  },
  SERVER_REMOVE: {
    key: "SERVER_REMOVE",
    office: "SISTEM",
    label: "Sunucu kaldırma talebi",
    group: "Sunucu işlemleri",
    description: "vSphere / Hyper-V envanterinden çıkarma ve yedek teyidi.",
    slug: "sunucu-kaldirma",
    extraFields: [
      { id: "hostName", label: "Sunucu / istemci adı", kind: "text", required: true, row: "hedef" },
      { id: "hostIp", label: "Sunucu / istemci IP", kind: "text", row: "hedef" },
      { id: "backupConfirmed", label: "Yedek alındı mı?", kind: "select", required: true, row: "kapatma", options: [
        { value: "YES", label: "Evet, yedek doğrulandı" },
        { value: "NO", label: "Hayır" },
        { value: "NA", label: "Gerekmiyor" },
      ] },
      { id: "decommissionReason", label: "Kaldırma nedeni", kind: "text", row: "kapatma" },
    ],
  },
  BACKUP: {
    key: "BACKUP",
    office: "SISTEM",
    label: "Yedekleme (backup) talebi",
    group: "Yedekleme",
    description: "Veeam Backup & Replication, Veritas NetBackup, Commvault veya Microsoft DPM işi.",
    slug: "yedekleme",
    extraFields: [
      { id: "hostName", label: "Sunucu / istemci adı", kind: "text", required: true, row: "hedef" },
      { id: "hostIp", label: "Sunucu / istemci IP", kind: "text", row: "hedef" },
      { id: "backupProduct", label: "Yedekleme ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "VEEAM", label: "Veeam Backup & Replication" },
        { value: "NETBACKUP", label: "Veritas NetBackup" },
        { value: "COMMVAULT", label: "Commvault" },
        { value: "DPM", label: "Microsoft DPM" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "jobName", label: "İş / job adı", kind: "text", row: "urun" },
      { id: "backupType", label: "Yedekleme türü", kind: "select", required: true, row: "yedek", options: [
        { value: "FULL", label: "Full" },
        { value: "DIFFERENTIAL", label: "Differential" },
        { value: "INCREMENTAL", label: "Incremental" },
        { value: "SYNTHETIC", label: "Synthetic full" },
      ] },
      { id: "backupPeriod", label: "Yedekleme periyodu", kind: "select", required: true, row: "yedek", options: [
        { value: "MONTHLY", label: "Aylık" },
        { value: "WEEKLY", label: "Haftalık" },
        { value: "DAILY", label: "Günlük" },
        { value: "HOURLY", label: "Saatlik" },
      ] },
      { id: "retention", label: "Saklama süresi", kind: "text", row: "saklama", placeholder: "14 gün / 4 hafta / 12 ay" },
      { id: "repository", label: "Depo / repository / Scale-out", kind: "text", row: "saklama" },
    ],
  },
  RESTORE: {
    key: "RESTORE",
    office: "SISTEM",
    label: "Geri yükleme (restore) talebi",
    group: "Yedekleme",
    description: "Veeam Instant Recovery, NetBackup veya Commvault geri yükleme.",
    slug: "restore",
    extraFields: [
      { id: "hostName", label: "Sunucu / istemci adı", kind: "text", required: true, row: "hedef" },
      { id: "hostIp", label: "Sunucu / istemci IP", kind: "text", row: "hedef" },
      { id: "backupProduct", label: "Yedekleme ürünü", kind: "select", row: "urun", options: [
        { value: "VEEAM", label: "Veeam" },
        { value: "NETBACKUP", label: "NetBackup" },
        { value: "COMMVAULT", label: "Commvault" },
        { value: "DPM", label: "Microsoft DPM" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "restoreType", label: "Geri yükleme türü", kind: "select", row: "urun", options: [
        { value: "FULL_VM", label: "Tam makine / Instant Recovery" },
        { value: "FILE", label: "Dosya / klasör" },
        { value: "APP", label: "Uygulama (SQL / Exchange)" },
        { value: "DISK", label: "Disk / volume" },
      ] },
      { id: "restoreDate", label: "Geri yükleme noktası", kind: "date", required: true, row: "nokta" },
      { id: "restoreTarget", label: "Hedef konum", kind: "text", row: "nokta", placeholder: "Orijinal / alternatif sunucu" },
    ],
  },
  MAIL_RELAY: {
    key: "MAIL_RELAY",
    office: "SISTEM",
    label: "Mail relay talebi",
    group: "Mail relay",
    description: "Exchange / Exchange Online / postfix izin listesi (anonim veya kimlik doğrulamalı SMTP).",
    slug: "mail-relay",
    extraFields: [
      { id: "cidr", label: "Talep edilen IP / CIDR", kind: "text", required: true, placeholder: "10.20.30.0/24", row: "ag" },
      { id: "smtpHost", label: "SMTP sunucusu", kind: "text", row: "ag", placeholder: "smtp.kurum.gov.tr" },
      { id: "senderDomain", label: "Gönderen alan adı", kind: "text", row: "posta" },
      { id: "relayPurpose", label: "Amaç / uygulama", kind: "text", row: "posta" },
      { id: "tlsRequired", label: "TLS zorunlu", kind: "select", options: [
        { value: "YES", label: "Evet" },
        { value: "NO", label: "Hayır" },
      ] },
    ],
  },
  MAIL_RELAY_CANCEL: {
    key: "MAIL_RELAY_CANCEL",
    office: "SISTEM",
    label: "Mail relay iptal talebi",
    group: "Mail relay",
    description: "",
    slug: "mail-relay-iptal",
    extraFields: [
      { id: "cidr", label: "İptal edilen IP / CIDR", kind: "text", required: true, row: "iptal" },
      { id: "smtpHost", label: "SMTP sunucusu", kind: "text", row: "iptal" },
      { id: "cancelReason", label: "İptal nedeni", kind: "textarea", fullWidth: true },
    ],
  },
  VMWARE_GUEST: {
    key: "VMWARE_GUEST",
    office: "SISTEM",
    label: "Sanal makine / snapshot",
    group: "Sanallaştırma",
    description: "VMware vSphere, Hyper-V veya Nutanix üzerinde snapshot, klon, vMotion veya şablon.",
    slug: "sanal-makine",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "SNAPSHOT", label: "Snapshot al" },
        { value: "CLONE", label: "Klon / şablondan oluştur" },
        { value: "VMOTION", label: "vMotion / canlı taşıma" },
        { value: "TEMPLATE", label: "Şablon güncelle" },
        { value: "RESIZE", label: "Kaynak değiştir" },
      ] },
      { id: "hypervisor", label: "Platform", kind: "select", required: true, row: "islem", hint: "Yalnızca sanallaştırma. Nessus / Acunetix / OpenShift bu listede yoktur.", options: [
        { value: "VMWARE", label: "Sanallaştırma · VMware vSphere" },
        { value: "HYPERV", label: "Sanallaştırma · Hyper-V" },
        { value: "NUTANIX", label: "Sanallaştırma · Nutanix AHV" },
      ] },
      { id: "hostName", label: "Sanal makine adı", kind: "text", required: true, row: "hedef" },
      { id: "vcenter", label: "vCenter / SCVMM / Prism", kind: "text", row: "hedef" },
      { id: "snapshotRetain", label: "Snapshot saklama", kind: "text", placeholder: "24 saat / bakım bitene kadar" },
    ],
  },
  SCCM_DEPLOY: {
    key: "SCCM_DEPLOY",
    office: "SISTEM",
    label: "Paket / uygulama dağıtımı",
    group: "Uç nokta yönetimi",
    description: "Microsoft Configuration Manager (SCCM/MECM) veya Intune uygulama / güncelleme koleksiyonu.",
    slug: "paket-dagitim",
    extraFields: [
      { id: "platform", label: "Dağıtım platformu", kind: "select", required: true, row: "platform", options: [
        { value: "SCCM", label: "Microsoft Configuration Manager (SCCM / MECM)" },
        { value: "INTUNE", label: "Microsoft Intune" },
        { value: "BOTH", label: "SCCM + Intune (co-management)" },
      ] },
      { id: "packageName", label: "Paket / uygulama adı", kind: "text", required: true, row: "platform" },
      { id: "collection", label: "Koleksiyon / Azure AD grubu", kind: "text", row: "hedef" },
      { id: "deployIntent", label: "Dağıtım amacı", kind: "select", row: "hedef", options: [
        { value: "REQUIRED", label: "Zorunlu (Required)" },
        { value: "AVAILABLE", label: "Kullanılabilir (Available)" },
        { value: "PILOT", label: "Pilot koleksiyon" },
      ] },
      { id: "maintenanceWindow", label: "Bakım penceresi", kind: "text", placeholder: "Pazar 02:00–06:00" },
    ],
  },
  FILE_SHARE: {
    key: "FILE_SHARE",
    office: "SISTEM",
    label: "Dosya paylaşımı / DFS",
    group: "Depolama",
    description: "Windows dosya sunucusu, DFS Namespace veya SMB paylaşımı.",
    slug: "dosya-paylasim",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "CREATE", label: "Yeni paylaşım" },
        { value: "GRANT", label: "Yetki ver" },
        { value: "REVOKE", label: "Yetki al" },
        { value: "QUOTA", label: "Kota değiştir" },
      ] },
      { id: "sharePath", label: "UNC / DFS yolu", kind: "text", required: true, row: "islem", placeholder: "\\\\kurum\\dfs\\birim" },
      { id: "accessLevel", label: "Erişim", kind: "select", row: "yetki", options: [
        { value: "READ", label: "Okuma" },
        { value: "MODIFY", label: "Değiştirme" },
        { value: "FULL", label: "Tam denetim" },
      ] },
      { id: "quota", label: "Kota", kind: "text", row: "yetki", placeholder: "50 GB" },
    ],
  },
  CERTIFICATE: {
    key: "CERTIFICATE",
    office: "SISTEM",
    label: "Sertifika / PKI",
    group: "Kimlik ve sertifika",
    description: "Microsoft AD CS, genel CA veya iç PKI sunucu / uygulama sertifikası.",
    slug: "sertifika",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "ISSUE", label: "Yeni sertifika" },
        { value: "RENEW", label: "Yenileme" },
        { value: "REVOKE", label: "İptal" },
      ] },
      { id: "commonName", label: "CN / FQDN", kind: "text", required: true, row: "islem" },
      { id: "san", label: "SAN listesi", kind: "text", placeholder: "uygulama.kurum.gov.tr, www.…" },
      { id: "certType", label: "Sertifika türü", kind: "select", row: "tur", options: [
        { value: "WEB_TLS", label: "Web / TLS (sunucu)" },
        { value: "CLIENT", label: "İstemci / cihaz" },
        { value: "CODE_SIGN", label: "Kod imzalama" },
        { value: "WILDCARD", label: "Joker (*.kurum.gov.tr)" },
      ] },
      { id: "validityYears", label: "Geçerlilik", kind: "select", row: "tur", options: [
        { value: "1", label: "1 yıl" },
        { value: "2", label: "2 yıl" },
        { value: "3", label: "3 yıl" },
      ] },
    ],
  },
  MAILBOX: {
    key: "MAILBOX",
    office: "SISTEM",
    label: "Posta kutusu / dağıtım listesi",
    group: "E-posta",
    description: "Microsoft Exchange veya Exchange Online posta kutusu, paylaşılan kutu, dağıtım listesi.",
    slug: "eposta-kutusu",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "CREATE", label: "Posta kutusu aç" },
        { value: "SHARED", label: "Paylaşılan kutu" },
        { value: "DL", label: "Dağıtım listesi" },
        { value: "QUOTA", label: "Kota / arşiv" },
        { value: "DELEGATE", label: "Vekil / Full Access" },
      ] },
      { id: "mailbox", label: "Posta adresi", kind: "text", required: true, row: "islem" },
      { id: "licenseSku", label: "Lisans / SKU", kind: "select", row: "lisans", options: [
        { value: "E3", label: "Microsoft 365 E3" },
        { value: "E5", label: "Microsoft 365 E5" },
        { value: "EXCHANGE_ONLINE", label: "Exchange Online" },
        { value: "ONPREM", label: "Yerel Exchange" },
      ] },
      { id: "quota", label: "Kota / arşiv", kind: "text", row: "lisans" },
    ],
  },
  NAC: {
    key: "NAC",
    office: "NETWORK",
    label: "NAC istisna talebi",
    group: "NAC istisna",
    description: "Cisco ISE, Aruba ClearPass veya FortiNAC üzerinde politika / duruş / karantina istisnası (MAC listesi, Authorization Exception, ANC kaldırma).",
    slug: "nac-istisna",
    extraFields: [
      { id: "nacProduct", label: "NAC ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "ISE", label: "Cisco ISE" },
        { value: "CLEARPASS", label: "Aruba ClearPass" },
        { value: "FORTINAC", label: "FortiNAC" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "exceptionType", label: "İstisna türü", kind: "select", required: true, row: "urun", options: [
        { value: "MAC_EXCEPTION", label: "MAC istisnası / Endpoint Exception" },
        { value: "MAB_STATIC", label: "Statik MAB / Identity Group ataması" },
        { value: "POSTURE_BYPASS", label: "Duruş (posture) muafiyeti" },
        { value: "QUARANTINE_RELEASE", label: "Karantina / ANC kaldırma" },
        { value: "AUTHZ_OVERRIDE", label: "Authorization Exception / dACL aşımı" },
        { value: "PROFILING", label: "Profilleme istisnası" },
        { value: "GUEST_BYPASS", label: "Misafir VLAN'dan çıkış" },
      ] },
      { id: "currentState", label: "Mevcut NAC durumu", kind: "select", required: true, row: "durum", options: [
        { value: "DENIED", label: "Reddedildi / Auth Fail" },
        { value: "QUARANTINE", label: "Karantina / Restricted" },
        { value: "GUEST", label: "Misafir VLAN" },
        { value: "UNKNOWN", label: "Bilinmeyen / Unprofiled" },
        { value: "COMPLIANT_BLOCK", label: "Uyumlu ama kural engelliyor" },
      ] },
      { id: "authMethod", label: "Kimlik yöntemi", kind: "select", row: "durum", options: [
        { value: "MAB", label: "MAB (MAC Authentication Bypass)" },
        { value: "DOT1X", label: "802.1X" },
        { value: "BOTH", label: "MAB + 802.1X" },
        { value: "NONE", label: "Yok / geçersiz" },
      ] },
      { id: "hostName", label: "Cihaz adı", kind: "text", row: "hedef" },
      { id: "hostIp", label: "IP adresi", kind: "text", row: "hedef" },
      { id: "macAddress", label: "MAC adresi", kind: "text", required: true, row: "port" },
      { id: "deviceClass", label: "Cihaz sınıfı", kind: "select", row: "port", options: [
        { value: "PRINTER", label: "Yazıcı" },
        { value: "CAMERA", label: "Kamera / NVR" },
        { value: "MEDICAL", label: "Tıbbi cihaz" },
        { value: "IOT", label: "IoT / otomasyon" },
        { value: "PHONE", label: "IP telefon" },
        { value: "SERVER", label: "Sunucu" },
        { value: "WORKSTATION", label: "İş istasyonu" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "switchName", label: "Anahtar / NAS adı", kind: "text", row: "vlan" },
      { id: "switchPort", label: "Port", kind: "text", row: "vlan", placeholder: "Gi1/0/12" },
      { id: "requestedVlan", label: "İstenen VLAN / Authz profili", kind: "text", row: "sonuc", placeholder: "PROD / Printer_AuthZ" },
      { id: "identityGroup", label: "ISE / ClearPass Identity Group", kind: "text", row: "sonuc", placeholder: "Exception_Printers" },
      { id: "exceptionScope", label: "Kapsam", kind: "select", required: true, row: "sure", options: [
        { value: "SINGLE_MAC", label: "Tek MAC" },
        { value: "OUI", label: "OUI / üretici" },
        { value: "ENDPOINT_GROUP", label: "Endpoint grubu" },
      ] },
      { id: "validUntil", label: "İstisna bitiş tarihi", kind: "date", required: true, row: "sure" },
      { id: "exceptionReason", label: "İstisna gerekçesi / risk kabulü", kind: "textarea", fullWidth: true, required: true, placeholder: "802.1X desteklemiyor, bakım penceresi, üretici kısıtı…" },
    ],
  },
  SERVER_MONITOR: {
    key: "SERVER_MONITOR",
    office: "NETWORK",
    label: "Sunucu izleme kaydı",
    group: "İzleme / takip",
    description: "ManageEngine OpManager / Applications Manager ve ServiceDesk Plus altyapısına sunucu veya uygulama izleme kaydı.",
    slug: "sunucu-izleme",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "me-islem", options: [
        { value: "ADD", label: "İzlemeye ekle" },
        { value: "UPDATE", label: "İzlemeyi güncelle" },
        { value: "REMOVE", label: "İzlemeden çıkar" },
      ] },
      { id: "displayName", label: "Görünen ad (Display Name)", kind: "text", required: true, row: "me-islem", placeholder: "OpManager / SDP görünen adı" },
      { id: "hostName", label: "DNS / sunucu adı", kind: "text", required: true, row: "hedef" },
      { id: "hostIp", label: "IP adresi", kind: "text", required: true, row: "hedef", placeholder: "10.20.30.40" },
      { id: "deviceCategory", label: "Cihaz kategorisi", kind: "select", required: true, row: "kategori", options: [
        { value: "WINDOWS_SERVER", label: "Windows Server" },
        { value: "LINUX_SERVER", label: "Linux / Unix Server" },
        { value: "DOMAIN_CONTROLLER", label: "Domain Controller" },
        { value: "APP_SERVER", label: "Uygulama sunucusu" },
        { value: "DB_SERVER", label: "Veritabanı sunucusu" },
        { value: "VMWARE", label: "VMware / ESXi" },
        { value: "HYPERV", label: "Hyper-V" },
        { value: "NETWORK_DEVICE", label: "Ağ cihazı" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "vendorOs", label: "Üretici / işletim sistemi", kind: "text", row: "kategori", placeholder: "Windows Server 2022, RHEL 9…" },
      { id: "credentialType", label: "Keşif / kimlik yöntemi", kind: "select", required: true, row: "kimlik", options: [
        { value: "SNMP", label: "SNMP" },
        { value: "WMI", label: "WMI" },
        { value: "SSH", label: "SSH / CLI" },
        { value: "ICMP", label: "ICMP (ping)" },
        { value: "AGENT", label: "ManageEngine ajanı" },
      ] },
      { id: "credentialProfile", label: "Kimlik profili adı", kind: "text", row: "kimlik", placeholder: "OpManager Credential Profile" },
      { id: "snmpVersion", label: "SNMP sürümü", kind: "select", row: "protokol", options: [
        { value: "V2C", label: "SNMP v2c" },
        { value: "V3", label: "SNMP v3" },
        { value: "V1", label: "SNMP v1" },
        { value: "NA", label: "Kullanılmıyor" },
      ] },
      { id: "pollInterval", label: "Tarama aralığı", kind: "select", row: "protokol", options: [
        { value: "1", label: "1 dakika" },
        { value: "5", label: "5 dakika" },
        { value: "10", label: "10 dakika" },
        { value: "15", label: "15 dakika" },
        { value: "30", label: "30 dakika" },
      ] },
      { id: "monitorPack", label: "İzlenecek metrikler", kind: "select", required: true, row: "metrik", options: [
        { value: "BASIC", label: "Temel: CPU, bellek, disk" },
        { value: "FULL_OS", label: "Tam OS + arayüz + servis" },
        { value: "INTERFACE", label: "Ağ arayüzü / bant genişliği" },
        { value: "PROCESS_SERVICE", label: "Süreç / Windows servisi" },
        { value: "APP_URL", label: "Uygulama / URL (Applications Manager)" },
        { value: "CUSTOM", label: "Özel şablon" },
      ] },
      { id: "appName", label: "Uygulama / servis adı", kind: "text", row: "metrik", placeholder: "Applications Manager monitor adı" },
      { id: "siteLocation", label: "Site / konum", kind: "text", row: "sdp", placeholder: "ServiceDesk Plus Site" },
      { id: "businessView", label: "Business View / iş servisi", kind: "text", row: "sdp" },
      { id: "priority", label: "Öncelik (Priority)", kind: "select", required: true, row: "sdp-pri", options: [
        { value: "CRITICAL", label: "Kritik" },
        { value: "HIGH", label: "Yüksek" },
        { value: "MEDIUM", label: "Orta" },
        { value: "LOW", label: "Düşük" },
      ] },
      { id: "urgency", label: "Aciliyet (Urgency)", kind: "select", row: "sdp-pri", options: [
        { value: "HIGH", label: "Yüksek" },
        { value: "MEDIUM", label: "Orta" },
        { value: "LOW", label: "Düşük" },
      ] },
      { id: "impact", label: "Etki (Impact)", kind: "select", row: "alarm", options: [
        { value: "HIGH", label: "Yüksek — hizmet kesilir" },
        { value: "MEDIUM", label: "Orta — kısmi etki" },
        { value: "LOW", label: "Düşük" },
      ] },
      { id: "notificationProfile", label: "Bildirim profili", kind: "text", row: "alarm", placeholder: "OpManager Notification Profile" },
      { id: "alarmThreshold", label: "Alarm eşiği / kural", kind: "textarea", fullWidth: true, placeholder: "CPU > %90 / 5 dk, disk < %10 boş, Down ise SMS…" },
    ],
  },
  VLAN: {
    key: "VLAN",
    office: "NETWORK",
    label: "VLAN / SVI talebi",
    group: "Ağ segmentasyonu",
    description: "Cisco Catalyst / Nexus veya Juniper EX üzerinde VLAN, SVI ve DHCP helper.",
    slug: "vlan",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "CREATE", label: "Yeni VLAN" },
        { value: "EXTEND", label: "Mevcut VLAN'ı genişlet" },
        { value: "SVI", label: "SVI / gateway" },
        { value: "DELETE", label: "VLAN kaldır" },
      ] },
      { id: "vlanId", label: "VLAN ID", kind: "text", required: true, row: "islem" },
      { id: "vlanName", label: "VLAN adı", kind: "text", row: "ag" },
      { id: "subnet", label: "Alt ağ / maske", kind: "text", row: "ag", placeholder: "10.40.12.0/24" },
      { id: "gateway", label: "Ağ geçidi / SVI", kind: "text", row: "l3" },
      { id: "dhcpHelper", label: "DHCP helper / relay", kind: "text", row: "l3" },
    ],
  },
  LOAD_BALANCER: {
    key: "LOAD_BALANCER",
    office: "NETWORK",
    label: "Yük dengeleyici (VIP / pool)",
    group: "Yük dengeleme",
    description: "F5 BIG-IP, Citrix ADC (NetScaler), NGINX Plus veya HAProxy sanal sunucu.",
    slug: "yuk-dengeleyici",
    extraFields: [
      { id: "lbProduct", label: "Ürün", kind: "select", required: true, row: "urun", options: [
        { value: "F5", label: "F5 BIG-IP" },
        { value: "CITRIX", label: "Citrix ADC / NetScaler" },
        { value: "NGINX", label: "NGINX Plus" },
        { value: "HAPROXY", label: "HAProxy" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "VIP", label: "Yeni VIP / sanal sunucu" },
        { value: "POOL_MEMBER", label: "Havuz üyesi ekle / çıkar" },
        { value: "CERT", label: "SSL profil / sertifika" },
        { value: "IRULE", label: "iRule / politika" },
      ] },
      { id: "virtualIp", label: "VIP / sanal IP", kind: "text", required: true, row: "vip" },
      { id: "virtualPort", label: "Port / protokol", kind: "text", row: "vip", placeholder: "443/TCP" },
      { id: "poolMembers", label: "Havuz üyeleri", kind: "textarea", fullWidth: true, placeholder: "10.10.20.21:443, 10.10.20.22:443" },
      { id: "persistMethod", label: "Kalıcılık / sağlık kontrolü", kind: "text", placeholder: "cookie / source-ip · https monitor" },
    ],
  },
  WIRELESS: {
    key: "WIRELESS",
    office: "NETWORK",
    label: "Kablosuz ağ / SSID",
    group: "Kablosuz",
    description: "Cisco WLC / Catalyst 9800, Aruba Central veya FortiAP SSID, VLAN ve RADIUS.",
    slug: "kablosuz",
    extraFields: [
      { id: "wlanProduct", label: "Kablosuz platform", kind: "select", row: "urun", options: [
        { value: "CISCO_WLC", label: "Cisco WLC / Catalyst 9800" },
        { value: "ARUBA", label: "Aruba Central / Instant" },
        { value: "FORTIAP", label: "FortiAP / FortiGate" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", row: "urun", options: [
        { value: "SSID", label: "SSID aç / kapat" },
        { value: "VLAN", label: "SSID VLAN eşle" },
        { value: "GUEST", label: "Misafir erişimi" },
        { value: "AP", label: "Erişim noktası kaydı" },
      ] },
      { id: "ssid", label: "SSID", kind: "text", required: true, row: "ssid" },
      { id: "vlanId", label: "VLAN", kind: "text", row: "ssid" },
      { id: "siteLocation", label: "Bina / kat / konum", kind: "text" },
    ],
  },
  FW_INTRANET: {
    key: "FW_INTRANET",
    office: "SIBER",
    label: "İntranet erişim talebi",
    group: "Güvenlik duvarı",
    description: "Palo Alto NGFW, FortiGate, Check Point veya Cisco ASA/FTD kuralı.",
    slug: "intranet-erisim",
    extraFields: [
      { id: "fwVendor", label: "Güvenlik duvarı", kind: "select", row: "urun", options: [
        { value: "PALO", label: "Palo Alto Networks" },
        { value: "FORTINET", label: "FortiGate" },
        { value: "CHECKPOINT", label: "Check Point" },
        { value: "CISCO", label: "Cisco ASA / FTD" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", row: "urun", options: [
        { value: "ALLOW", label: "İzin ver" },
        { value: "DENY", label: "Engelle" },
        { value: "CHANGE", label: "Mevcut kuralı güncelle" },
      ] },
      { id: "sourceIp", label: "Kaynak IP / nesne", kind: "text", required: true, row: "erisim" },
      { id: "destIp", label: "Hedef IP / nesne", kind: "text", required: true, row: "erisim" },
      { id: "portProtocol", label: "Port / protokol / App-ID", kind: "text", placeholder: "443/TCP · ssl", row: "sure" },
      { id: "validUntil", label: "Geçerlilik süresi", kind: "date", row: "sure" },
    ],
  },
  FW_INTERNET: {
    key: "FW_INTERNET",
    office: "SIBER",
    label: "İnternet erişim talebi",
    group: "Güvenlik duvarı",
    description: "URL filtre, App-ID veya kategori istisnası (Palo Alto / FortiGate / Check Point).",
    slug: "internet-erisim",
    extraFields: [
      { id: "fwVendor", label: "Güvenlik duvarı", kind: "select", row: "urun", options: [
        { value: "PALO", label: "Palo Alto Networks" },
        { value: "FORTINET", label: "FortiGate" },
        { value: "CHECKPOINT", label: "Check Point" },
        { value: "CISCO", label: "Cisco ASA / FTD" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "sourceIp", label: "Kaynak IP", kind: "text", required: true, row: "erisim" },
      { id: "destTarget", label: "Hedef kategori / IP / URL", kind: "text", required: true, row: "erisim" },
      { id: "urlCategory", label: "URL / App-ID kategorisi", kind: "text", row: "sure" },
      { id: "validUntil", label: "Geçerlilik süresi", kind: "date", row: "sure" },
    ],
  },
  SIEM_LOG: {
    key: "SIEM_LOG",
    office: "SIBER",
    label: "Log alma talebi",
    group: "SIEM / Log",
    description: "Splunk, IBM QRadar, Microsoft Sentinel veya ArcSight kaynak onboarding (CEF / LEEF / Syslog).",
    slug: "log-alma",
    extraFields: [
      { id: "siemPlatform", label: "SIEM platformu", kind: "select", required: true, row: "platform", options: [
        { value: "SPLUNK", label: "Splunk" },
        { value: "QRADAR", label: "IBM QRadar" },
        { value: "SENTINEL", label: "Microsoft Sentinel" },
        { value: "ARCSIGHT", label: "OpenText ArcSight" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "logFormat", label: "Log formatı", kind: "select", required: true, row: "platform", options: [
        { value: "CEF", label: "CEF" },
        { value: "LEEF", label: "LEEF" },
        { value: "SYSLOG", label: "Syslog (RFC5424)" },
        { value: "WIN_EVENT", label: "Windows Event / WEF" },
        { value: "API", label: "API / HEC" },
      ] },
      { id: "systemName", label: "Log alınacak sistem adı", kind: "text", required: true, row: "sistem" },
      { id: "hostIp", label: "Sistem IP", kind: "text", row: "sistem" },
      { id: "logType", label: "Log türü", kind: "select", row: "log", options: [
        { value: "SYSLOG", label: "Syslog" },
        { value: "EVENT", label: "Event log" },
        { value: "AUDIT", label: "Audit log" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "logVolume", label: "Tahmini log boyutu", kind: "text", placeholder: "GB/gün", row: "log" },
    ],
  },
  SIEM_CORRELATION: {
    key: "SIEM_CORRELATION",
    office: "SIBER",
    label: "Korelasyon talebi",
    group: "SIEM / Log",
    description: "Use-case, MITRE ATT&CK eşlemesi ve uyarı eşiği.",
    slug: "korelasyon",
    extraFields: [
      { id: "siemPlatform", label: "SIEM platformu", kind: "select", row: "platform", options: [
        { value: "SPLUNK", label: "Splunk" },
        { value: "QRADAR", label: "IBM QRadar" },
        { value: "SENTINEL", label: "Microsoft Sentinel" },
        { value: "ARCSIGHT", label: "ArcSight" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "mitreTactic", label: "MITRE ATT&CK taktiği", kind: "text", row: "platform", placeholder: "Initial Access, Persistence…" },
      { id: "useCaseName", label: "Use-case / kural adı", kind: "text", required: true },
      { id: "correlationNote", label: "Korelasyon açıklaması", kind: "textarea", fullWidth: true, required: true },
    ],
  },
  FORENSIC: {
    key: "FORENSIC",
    office: "SIBER",
    label: "Forensic talep",
    group: "Adli bilişim",
    description: "OpenText EnCase, Exterro FTK veya Magnet AXIOM ile delil alma ve zincir belgesi.",
    slug: "forensic",
    extraFields: [
      { id: "forensicTool", label: "Adli bilişim aracı", kind: "select", required: true, row: "arac", options: [
        { value: "ENCASE", label: "OpenText EnCase" },
        { value: "FTK", label: "Exterro FTK" },
        { value: "AXIOM", label: "Magnet AXIOM" },
        { value: "AUTOPSY", label: "Autopsy / sleuthkit" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "evidenceType", label: "Delil türü", kind: "select", required: true, row: "arac", options: [
        { value: "DISK", label: "Disk / imaj" },
        { value: "MEMORY", label: "Bellek dökümü" },
        { value: "MOBILE", label: "Mobil cihaz" },
        { value: "LOG", label: "Log / e-posta" },
        { value: "NETWORK", label: "Ağ yakalama" },
      ] },
      { id: "hostName", label: "Kaynak cihaz / kullanıcı", kind: "text", row: "kaynak" },
      { id: "hostIp", label: "IP / envanter no", kind: "text", row: "kaynak" },
      { id: "legalHold", label: "Yasal saklama / case no", kind: "text", row: "zincir" },
      { id: "custodian", label: "Emanetçi (custodian)", kind: "text", row: "zincir" },
      { id: "chainOfCustody", label: "Zincir belgesi / teslim notu", kind: "textarea", fullWidth: true },
    ],
  },
  VULN_SCAN: {
    key: "VULN_SCAN",
    office: "SIBER",
    label: "Zafiyet tarama talep",
    group: "Zafiyet",
    description: "Tenable Nessus/io, Qualys VMDR, OpenVAS veya Acunetix / Burp DAST.",
    slug: "zafiyet-tarama",
    extraFields: [
      { id: "scanProduct", label: "Tarama ürünü", kind: "select", required: true, row: "urun", hint: "Yalnızca zafiyet tarama ailesi. VMware / OpenShift burada yoktur.", options: [
        { value: "NESSUS", label: "Ağ · Tenable Nessus / Tenable.io" },
        { value: "QUALYS", label: "Ağ · Qualys VMDR" },
        { value: "OPENVAS", label: "Ağ · OpenVAS / Greenbone" },
        { value: "RAPID7", label: "Ağ · Rapid7 InsightVM" },
        { value: "ACUNETIX", label: "DAST · Acunetix" },
        { value: "BURP", label: "DAST · Burp Suite Enterprise" },
      ] },
      { id: "scanType", label: "Tarama tipi", kind: "select", required: true, row: "urun", options: [
        { value: "AUTH_NETWORK", label: "Kimlikli ağ taraması" },
        { value: "UNAUTH_NETWORK", label: "Kimliksiz ağ taraması" },
        { value: "DAST", label: "DAST (web)" },
        { value: "SAST", label: "SAST (kaynak kod)" },
        { value: "CONTAINER", label: "Konteyner / imaj" },
      ] },
      { id: "scanTarget", label: "Taranacak IP / CIDR / URL", kind: "text", required: true, row: "hedef" },
      { id: "scanWindow", label: "Tarama penceresi", kind: "text", row: "hedef", placeholder: "Hafta içi 22:00–06:00" },
      { id: "credentialed", label: "Kimlik bilgisi", kind: "select", options: [
        { value: "YES", label: "Kimlikli (authenticated)" },
        { value: "NO", label: "Kimliksiz" },
      ] },
    ],
  },
  DNS: {
    key: "DNS",
    office: "SIBER",
    label: "DNS talep",
    group: "DNS / VPN",
    description: "Microsoft DNS, Infoblox veya BIND kaydı.",
    slug: "dns",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "CREATE", label: "Oluştur" },
        { value: "UPDATE", label: "Güncelle" },
        { value: "DELETE", label: "Sil" },
      ] },
      { id: "dnsProduct", label: "DNS platformu", kind: "select", row: "islem", options: [
        { value: "MS_DNS", label: "Microsoft DNS" },
        { value: "INFOBLOX", label: "Infoblox" },
        { value: "BIND", label: "BIND" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "recordName", label: "Kayıt adı", kind: "text", required: true, row: "kayit" },
      { id: "recordType", label: "Kayıt tipi", kind: "select", row: "kayit", options: [
        { value: "A", label: "A" },
        { value: "AAAA", label: "AAAA" },
        { value: "CNAME", label: "CNAME" },
        { value: "MX", label: "MX" },
        { value: "TXT", label: "TXT" },
        { value: "PTR", label: "PTR" },
        { value: "SRV", label: "SRV" },
      ] },
      { id: "recordValue", label: "Değer", kind: "text", row: "ttl" },
      { id: "ttl", label: "TTL (saniye)", kind: "text", row: "ttl", placeholder: "3600" },
    ],
  },
  VPN: {
    key: "VPN",
    office: "SIBER",
    label: "VPN talep",
    group: "DNS / VPN",
    description: "Cisco AnyConnect / Secure Client, FortiClient veya Palo Alto GlobalProtect.",
    slug: "vpn",
    extraFields: [
      { id: "vpnProduct", label: "VPN ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "ANYCONNECT", label: "Cisco AnyConnect / Secure Client" },
        { value: "FORTICLIENT", label: "FortiClient" },
        { value: "GLOBALPROTECT", label: "Palo Alto GlobalProtect" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "username", label: "Kullanıcı adı", kind: "text", required: true, row: "urun" },
      { id: "vpnProfile", label: "VPN profili / tünel", kind: "text", row: "profil" },
      { id: "splitTunnel", label: "Tünel türü", kind: "select", row: "profil", options: [
        { value: "FULL", label: "Tam tünel" },
        { value: "SPLIT", label: "Bölünmüş tünel" },
      ] },
      { id: "validUntil", label: "Geçerlilik süresi", kind: "date" },
    ],
  },
  PORTABLE_SCAN: {
    key: "PORTABLE_SCAN",
    office: "SIBER",
    label: "Taşınabilir cihaz tarama",
    group: "Cihaz tarama",
    description: "USB / harici disk zararlı tarama (Defender, CrowdStrike veya kurum AV).",
    slug: "tasinabilir-tarama",
    extraFields: [
      { id: "deviceOrigin", label: "Cihazın geldiği yer", kind: "text", row: "cihaz" },
      { id: "deviceContent", label: "Cihazın içeriği", kind: "text", placeholder: "imaj, dosya, program", row: "cihaz" },
      { id: "scannedDeviceId", label: "Taranacak cihaz ID", kind: "text", row: "tarama" },
      { id: "scanEngine", label: "Tarama motoru", kind: "select", row: "tarama", options: [
        { value: "DEFENDER", label: "Microsoft Defender" },
        { value: "CROWDSTRIKE", label: "CrowdStrike Falcon" },
        { value: "SYMANTEC", label: "Symantec / SEP" },
        { value: "OTHER", label: "Diğer" },
      ] },
    ],
  },
  ANTIVIRUS: {
    key: "ANTIVIRUS",
    office: "SIBER",
    label: "Antivirüs talep",
    group: "Antivirüs",
    description: "Microsoft Defender, CrowdStrike Falcon veya Symantec istisna / durdurma.",
    slug: "antivirus",
    extraFields: [
      { id: "avProduct", label: "AV / EDR ürünü", kind: "select", row: "urun", options: [
        { value: "DEFENDER", label: "Microsoft Defender for Endpoint" },
        { value: "CROWDSTRIKE", label: "CrowdStrike Falcon" },
        { value: "SYMANTEC", label: "Symantec Endpoint Protection" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "hostName", label: "Cihaz / sunucu", kind: "text", row: "urun" },
      { id: "exceptionPath", label: "İstisna dizin / dosya / hash", kind: "text", row: "av" },
      { id: "stopRequest", label: "Durdurma / izolasyon talebi", kind: "text", row: "av" },
      { id: "validUntil", label: "Geçerlilik süreci", kind: "date" },
    ],
  },
  DLP_EXCEPTION: {
    key: "DLP_EXCEPTION",
    office: "SIBER",
    label: "DLP istisna / politika",
    group: "Veri kaybı önleme",
    description: "Forcepoint DLP, Symantec DLP veya Microsoft Purview istisnası.",
    slug: "dlp-istisna",
    extraFields: [
      { id: "dlpProduct", label: "DLP ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "FORCEPOINT", label: "Forcepoint DLP" },
        { value: "SYMANTEC", label: "Symantec DLP" },
        { value: "PURVIEW", label: "Microsoft Purview" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "EXCEPTION", label: "İstisna" },
        { value: "POLICY", label: "Yeni politika" },
        { value: "CHANNEL", label: "Kanal (USB / e-posta / web)" },
      ] },
      { id: "dataClass", label: "Veri sınıfı", kind: "text", row: "kapsam", placeholder: "KVKK, mali, gizli" },
      { id: "channel", label: "Kanal", kind: "select", row: "kapsam", options: [
        { value: "EMAIL", label: "E-posta" },
        { value: "USB", label: "USB / çıkarılabilir" },
        { value: "WEB", label: "Web / bulut" },
        { value: "PRINT", label: "Yazıcı" },
      ] },
      { id: "validUntil", label: "Geçerlilik", kind: "date" },
    ],
  },
  WAF: {
    key: "WAF",
    office: "SIBER",
    label: "WAF kural / istisna",
    group: "Uygulama güvenliği",
    description: "F5 Advanced WAF, Imperva, Cloudflare WAF veya Azure Front Door kuralı.",
    slug: "waf",
    extraFields: [
      { id: "wafProduct", label: "WAF ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "F5", label: "F5 Advanced WAF" },
        { value: "IMPERVA", label: "Imperva" },
        { value: "CLOUDFLARE", label: "Cloudflare WAF" },
        { value: "AZURE", label: "Azure Front Door / App Gateway WAF" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "ALLOW", label: "İstisna / allow" },
        { value: "BLOCK", label: "Engelle" },
        { value: "TUNE", label: "İmza ayarı" },
        { value: "ONBOARD", label: "Yeni uygulama onboarding" },
      ] },
      { id: "appUrl", label: "Uygulama URL / VIP", kind: "text", required: true, row: "hedef" },
      { id: "ruleId", label: "Kural / imza ID", kind: "text", row: "hedef" },
    ],
  },
  PAM_ACCESS: {
    key: "PAM_ACCESS",
    office: "SIBER",
    label: "PAM / ayrıcalıklı erişim",
    group: "Ayrıcalıklı erişim",
    description: "CyberArk, BeyondTrust veya Delinea Safe / jump host erişimi.",
    slug: "pam-erisim",
    extraFields: [
      { id: "pamProduct", label: "PAM ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "CYBERARK", label: "CyberArk PAM" },
        { value: "BEYONDTRUST", label: "BeyondTrust" },
        { value: "DELINEA", label: "Delinea Secret Server" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "SAFE", label: "Safe / kasa erişimi" },
        { value: "ACCOUNT", label: "Yönetilen hesap" },
        { value: "PSM", label: "PSM / jump oturumu" },
        { value: "JUST_IN_TIME", label: "Just-in-time yetki" },
      ] },
      { id: "safeName", label: "Safe / kasa / sistem", kind: "text", required: true, row: "hedef" },
      { id: "targetAccount", label: "Hedef hesap", kind: "text", row: "hedef" },
      { id: "validUntil", label: "Geçerlilik", kind: "date" },
    ],
  },
  APP_PROJECT: {
    key: "APP_PROJECT",
    office: "YAZILIM",
    label: "Yazılım projesi / ürün kaydı",
    group: "Proje ve ürün",
    description: "Atlassian Jira projesi, Confluence alanı veya Azure DevOps ekip projesi.",
    slug: "yazilim-projesi",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "CREATE", label: "Yeni proje" },
        { value: "UPDATE", label: "Güncelle" },
        { value: "ARCHIVE", label: "Arşivle" },
      ] },
      { id: "almTool", label: "ALM aracı", kind: "select", required: true, row: "islem", options: [
        { value: "JIRA", label: "Atlassian Jira" },
        { value: "ADO", label: "Azure DevOps" },
        { value: "GITLAB", label: "GitLab" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "projectKey", label: "Proje anahtarı / kodu", kind: "text", required: true, row: "proje", placeholder: "EBYS" },
      { id: "projectName", label: "Proje / ürün adı", kind: "text", required: true, row: "proje" },
      { id: "methodology", label: "Yöntem", kind: "select", row: "yonetim", options: [
        { value: "SCRUM", label: "Scrum" },
        { value: "KANBAN", label: "Kanban" },
        { value: "WATERFALL", label: "Şelale" },
      ] },
      { id: "productOwner", label: "Ürün sahibi", kind: "text", row: "yonetim" },
    ],
  },
  REPO_ACCESS: {
    key: "REPO_ACCESS",
    office: "YAZILIM",
    label: "Kaynak kod deposu erişimi",
    group: "Kaynak kod",
    description: "GitLab, GitHub Enterprise, Azure Repos veya Bitbucket yetkisi.",
    slug: "depo-erisim",
    extraFields: [
      { id: "scmProduct", label: "SCM ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "GITLAB", label: "GitLab" },
        { value: "GITHUB", label: "GitHub Enterprise" },
        { value: "AZURE_REPOS", label: "Azure Repos" },
        { value: "BITBUCKET", label: "Bitbucket" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "GRANT", label: "Yetki ver" },
        { value: "REVOKE", label: "Yetki al" },
        { value: "CREATE_REPO", label: "Yeni depo" },
      ] },
      { id: "repoPath", label: "Grup / depo yolu", kind: "text", required: true, row: "depo", placeholder: "kurum/ebys-backend" },
      { id: "accessLevel", label: "Rol", kind: "select", required: true, row: "depo", options: [
        { value: "GUEST", label: "Guest / okuma" },
        { value: "DEVELOPER", label: "Developer / Contribute" },
        { value: "MAINTAINER", label: "Maintainer / Admin" },
        { value: "REPORTER", label: "Reporter" },
      ] },
      { id: "username", label: "Kullanıcı / grup", kind: "text" },
    ],
  },
  CICD_PIPELINE: {
    key: "CICD_PIPELINE",
    office: "YAZILIM",
    label: "CI/CD boru hattı",
    group: "CI / CD",
    description: "Jenkins, GitLab CI, Azure Pipelines veya GitHub Actions işi.",
    slug: "ci-cd",
    extraFields: [
      { id: "cicdProduct", label: "CI/CD ürünü", kind: "select", required: true, row: "urun", options: [
        { value: "JENKINS", label: "Jenkins" },
        { value: "GITLAB_CI", label: "GitLab CI" },
        { value: "AZURE_PIPELINES", label: "Azure Pipelines" },
        { value: "GITHUB_ACTIONS", label: "GitHub Actions" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "CREATE", label: "Yeni boru hattı" },
        { value: "UPDATE", label: "Güncelle" },
        { value: "SECRET", label: "Gizli / değişken" },
        { value: "RUNNER", label: "Runner / ajan" },
      ] },
      { id: "pipelineName", label: "Boru hattı / job adı", kind: "text", required: true, row: "hat" },
      { id: "repoPath", label: "Bağlı depo", kind: "text", row: "hat" },
      { id: "targetEnv", label: "Hedef ortam", kind: "select", options: [
        { value: "DEV", label: "Geliştirme" },
        { value: "TEST", label: "Test" },
        { value: "PREPROD", label: "Ön üretim" },
        { value: "PROD", label: "Üretim" },
      ] },
    ],
  },
  RELEASE_DEPLOY: {
    key: "RELEASE_DEPLOY",
    office: "YAZILIM",
    label: "Sürüm / canlıya alma",
    group: "CI / CD",
    description: "Azure DevOps Release, GitLab Deploy veya Jenkins production job — değişiklik kaydıyla uyumlu.",
    slug: "yayin-dagitim",
    extraFields: [
      { id: "releaseTool", label: "Yayın aracı", kind: "select", row: "urun", options: [
        { value: "ADO", label: "Azure DevOps Release" },
        { value: "GITLAB", label: "GitLab Deploy / Environments" },
        { value: "JENKINS", label: "Jenkins" },
        { value: "ARGOCD", label: "Argo CD / GitOps" },
      ] },
      { id: "appName", label: "Uygulama / servis", kind: "text", required: true, row: "urun" },
      { id: "version", label: "Sürüm / etiket", kind: "text", required: true, row: "surum" },
      { id: "targetEnv", label: "Hedef ortam", kind: "select", required: true, row: "surum", options: [
        { value: "TEST", label: "Test" },
        { value: "PREPROD", label: "Ön üretim" },
        { value: "PROD", label: "Üretim" },
      ] },
      { id: "changeWindow", label: "Yayın penceresi", kind: "text", placeholder: "25.09.2026 22:00–00:00" },
      { id: "rollbackPlan", label: "Geri dönüş planı", kind: "textarea", fullWidth: true },
    ],
  },
  TEST_ENV: {
    key: "TEST_ENV",
    office: "YAZILIM",
    label: "Test / geliştirme ortamı",
    group: "Ortamlar",
    description: "Kubernetes (OpenShift / AKS / Rancher), Docker veya klasik uygulama sunucusu ortamı.",
    slug: "test-ortami",
    extraFields: [
      { id: "platform", label: "Ortam platformu", kind: "select", required: true, row: "platform", hint: "Yazılım / konteyner ortamı. VMware hipervizör ve Nessus taraması burada yoktur.", options: [
        { value: "OPENSHIFT", label: "Yazılım ortamı · Red Hat OpenShift" },
        { value: "AKS", label: "Yazılım ortamı · Azure Kubernetes Service" },
        { value: "RANCHER", label: "Yazılım ortamı · SUSE Rancher" },
        { value: "DOCKER", label: "Yazılım ortamı · Docker / compose" },
        { value: "IIS", label: "Uygulama sunucusu · IIS / Windows" },
        { value: "TOMCAT", label: "Uygulama sunucusu · Apache Tomcat / WildFly" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "platform", options: [
        { value: "CREATE", label: "Yeni ortam / namespace" },
        { value: "QUOTA", label: "Kaynak kotası" },
        { value: "REFRESH", label: "Veri yenile" },
        { value: "DESTROY", label: "Ortamı kapat" },
      ] },
      { id: "namespace", label: "Namespace / site / instance", kind: "text", required: true, row: "hedef" },
      { id: "appName", label: "Uygulama", kind: "text", row: "hedef" },
    ],
  },
  API_INTEGRATION: {
    key: "API_INTEGRATION",
    office: "YAZILIM",
    label: "API / entegrasyon",
    group: "Entegrasyon",
    description: "Apigee, Kong, Azure API Management veya kurum ESB üzerinden API anahtarı / tüketici.",
    slug: "api-entegrasyon",
    extraFields: [
      { id: "apimProduct", label: "API platformu", kind: "select", required: true, row: "urun", options: [
        { value: "APIGEE", label: "Google Apigee" },
        { value: "KONG", label: "Kong Gateway" },
        { value: "AZURE_APIM", label: "Azure API Management" },
        { value: "MULESOFT", label: "MuleSoft Anypoint" },
        { value: "OTHER", label: "Diğer / ESB" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "CONSUMER", label: "Yeni tüketici / API anahtarı" },
        { value: "PUBLISH", label: "API yayınla" },
        { value: "THROTTLE", label: "Kota / throttle" },
        { value: "REVOKE", label: "Anahtar iptal" },
      ] },
      { id: "apiName", label: "API adı / ürün", kind: "text", required: true, row: "api" },
      { id: "consumerApp", label: "Tüketici uygulama", kind: "text", row: "api" },
      { id: "callbackUrl", label: "Callback / yönlendirme URL", kind: "text" },
    ],
  },
  CODE_QUALITY: {
    key: "CODE_QUALITY",
    office: "YAZILIM",
    label: "Kod kalitesi / SAST",
    group: "Kalite kapısı",
    description: "SonarQube, Fortify, Checkmarx veya GitLab SAST kalite kapısı.",
    slug: "kod-kalite",
    extraFields: [
      { id: "qualityTool", label: "Kalite aracı", kind: "select", required: true, row: "urun", options: [
        { value: "SONARQUBE", label: "SonarQube / SonarCloud" },
        { value: "FORTIFY", label: "OpenText Fortify" },
        { value: "CHECKMARX", label: "Checkmarx" },
        { value: "GITLAB_SAST", label: "GitLab SAST" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "urun", options: [
        { value: "ONBOARD", label: "Projeyi bağla" },
        { value: "QUALITY_GATE", label: "Kalite kapısı eşiği" },
        { value: "SCAN", label: "Tarama çalıştır" },
        { value: "EXCEPTION", label: "Bulgu istisnası" },
      ] },
      { id: "projectKey", label: "Proje anahtarı", kind: "text", required: true, row: "proje" },
      { id: "repoPath", label: "Depo yolu", kind: "text", row: "proje" },
      { id: "qualityGate", label: "Kalite kapısı / eşik", kind: "text", placeholder: "coverage ≥ %80, 0 new blocker" },
    ],
  },
  DB_CREATE: {
    key: "DB_CREATE",
    office: "VERITABANI",
    label: "Veritabanı / şema oluşturma",
    group: "Veritabanı yaşam döngüsü",
    description: "Oracle, Microsoft SQL Server, PostgreSQL veya MySQL instance / şema.",
    slug: "vt-olusturma",
    extraFields: [
      { id: "dbEngine", label: "Motor", kind: "select", required: true, row: "motor", options: [
        { value: "ORACLE", label: "Oracle Database" },
        { value: "MSSQL", label: "Microsoft SQL Server" },
        { value: "POSTGRES", label: "PostgreSQL / EDB" },
        { value: "MYSQL", label: "MySQL / MariaDB" },
        { value: "MONGODB", label: "MongoDB" },
      ] },
      { id: "environment", label: "Ortam", kind: "select", required: true, row: "motor", options: [
        { value: "PROD", label: "Üretim" },
        { value: "TEST", label: "Test" },
        { value: "DEV", label: "Geliştirme" },
        { value: "DR", label: "Felaket kurtarma" },
      ] },
      { id: "dbName", label: "Veritabanı / şema / PDB adı", kind: "text", required: true, row: "nesne" },
      { id: "instanceName", label: "Instance / listener / cluster", kind: "text", row: "nesne" },
      { id: "hostName", label: "Sunucu adı", kind: "text", row: "sunucu" },
      { id: "hostIp", label: "Sunucu IP", kind: "text", row: "sunucu" },
      { id: "charset", label: "Karakter seti / collation", kind: "text", row: "kaynak", placeholder: "AL32UTF8 / Turkish_CI_AS" },
      { id: "sizeEstimate", label: "Tahmini boyut", kind: "text", row: "kaynak", placeholder: "50 GB" },
    ],
  },
  DB_USER: {
    key: "DB_USER",
    office: "VERITABANI",
    label: "Veritabanı kullanıcısı / yetki",
    group: "Erişim ve yetki",
    description: "Oracle role/grant, SQL Server login, PostgreSQL role veya MongoDB user.",
    slug: "vt-kullanici",
    extraFields: [
      { id: "dbEngine", label: "Motor", kind: "select", required: true, row: "motor", options: [
        { value: "ORACLE", label: "Oracle Database" },
        { value: "MSSQL", label: "Microsoft SQL Server" },
        { value: "POSTGRES", label: "PostgreSQL / EDB" },
        { value: "MYSQL", label: "MySQL / MariaDB" },
        { value: "MONGODB", label: "MongoDB" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "motor", options: [
        { value: "CREATE", label: "Kullanıcı oluştur" },
        { value: "GRANT", label: "Yetki ver" },
        { value: "REVOKE", label: "Yetki al" },
        { value: "LOCK", label: "Kilitle / devre dışı" },
      ] },
      { id: "dbName", label: "Veritabanı / şema", kind: "text", required: true, row: "nesne" },
      { id: "dbUsername", label: "DB kullanıcısı", kind: "text", required: true, row: "nesne" },
      { id: "privilege", label: "Yetki / rol", kind: "select", row: "yetki", options: [
        { value: "READ", label: "SELECT / okuma" },
        { value: "WRITE", label: "DML (INSERT/UPDATE/DELETE)" },
        { value: "DDL", label: "DDL / schema owner" },
        { value: "DBA", label: "DBA / sysadmin (istisna)" },
        { value: "EXECUTE", label: "EXECUTE / paket" },
      ] },
      { id: "validUntil", label: "Geçerlilik", kind: "date", row: "yetki" },
    ],
  },
  DB_SCRIPT: {
    key: "DB_SCRIPT",
    office: "VERITABANI",
    label: "SQL / değişiklik scripti",
    group: "Değişiklik",
    description: "Liquibase, Flyway veya onaylı DBA script çalıştırma (üretim için değişiklik kaydı önerilir).",
    slug: "vt-script",
    extraFields: [
      { id: "dbEngine", label: "Motor", kind: "select", required: true, row: "motor", options: [
        { value: "ORACLE", label: "Oracle Database" },
        { value: "MSSQL", label: "Microsoft SQL Server" },
        { value: "POSTGRES", label: "PostgreSQL / EDB" },
        { value: "MYSQL", label: "MySQL / MariaDB" },
        { value: "MONGODB", label: "MongoDB" },
      ] },
      { id: "environment", label: "Ortam", kind: "select", required: true, row: "motor", options: [
        { value: "PROD", label: "Üretim" },
        { value: "TEST", label: "Test" },
        { value: "DEV", label: "Geliştirme" },
      ] },
      { id: "dbName", label: "Veritabanı / şema", kind: "text", required: true, row: "nesne" },
      { id: "migrationTool", label: "Geçiş aracı", kind: "select", row: "nesne", options: [
        { value: "MANUAL", label: "Elle / DBA" },
        { value: "LIQUIBASE", label: "Liquibase" },
        { value: "FLYWAY", label: "Flyway" },
        { value: "SSDT", label: "SQL Server DACPAC / SSDT" },
      ] },
      { id: "scriptSummary", label: "Script özeti", kind: "textarea", fullWidth: true, required: true, placeholder: "Tablo, indeks, paket, veri düzeltmesi…" },
      { id: "downtime", label: "Kesinti bekleniyor mu?", kind: "select", options: [
        { value: "NO", label: "Hayır" },
        { value: "SHORT", label: "Kısa (dakika)" },
        { value: "YES", label: "Evet, pencere gerekli" },
      ] },
    ],
  },
  DB_BACKUP: {
    key: "DB_BACKUP",
    office: "VERITABANI",
    label: "Veritabanı yedeği / RMAN",
    group: "Yedek ve kurtarma",
    description: "Oracle RMAN, SQL Server backup, pg_basebackup / pgBackRest veya mongodump.",
    slug: "vt-yedek",
    extraFields: [
      { id: "dbEngine", label: "Motor", kind: "select", required: true, row: "motor", options: [
        { value: "ORACLE", label: "Oracle RMAN" },
        { value: "MSSQL", label: "SQL Server backup" },
        { value: "POSTGRES", label: "pgBackRest / pg_basebackup" },
        { value: "MYSQL", label: "mysqldump / XtraBackup" },
        { value: "MONGODB", label: "mongodump / Ops Manager" },
      ] },
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "motor", options: [
        { value: "SCHEDULE", label: "Yedek işi tanımla" },
        { value: "ADHOC", label: "Anlık yedek" },
        { value: "RESTORE", label: "Geri yükle" },
        { value: "VALIDATE", label: "Yedek doğrula" },
      ] },
      { id: "dbName", label: "Veritabanı / PDB", kind: "text", required: true, row: "nesne" },
      { id: "backupLevel", label: "Seviye", kind: "select", row: "nesne", options: [
        { value: "FULL", label: "Full / level 0" },
        { value: "INCR", label: "Incremental / level 1" },
        { value: "LOG", label: "Archive / transaction log" },
      ] },
      { id: "retention", label: "Saklama", kind: "text", placeholder: "7 gün / 4 hafta" },
    ],
  },
  DB_PERF: {
    key: "DB_PERF",
    office: "VERITABANI",
    label: "Performans / AWR incelemesi",
    group: "İşletim",
    description: "Oracle AWR/ASH, SQL Server Query Store veya pg_stat_statements incelemesi.",
    slug: "vt-performans",
    extraFields: [
      { id: "dbEngine", label: "Motor", kind: "select", required: true, row: "motor", options: [
        { value: "ORACLE", label: "Oracle AWR / ASH" },
        { value: "MSSQL", label: "SQL Server Query Store" },
        { value: "POSTGRES", label: "PostgreSQL pg_stat_statements" },
        { value: "MYSQL", label: "MySQL Performance Schema" },
        { value: "MONGODB", label: "MongoDB Atlas / profiler" },
      ] },
      { id: "dbName", label: "Veritabanı", kind: "text", required: true, row: "motor" },
      { id: "symptom", label: "Belirti", kind: "select", row: "belirti", options: [
        { value: "SLOW_QUERY", label: "Yavaş sorgu" },
        { value: "LOCK", label: "Kilit / blocking" },
        { value: "CPU", label: "Yüksek CPU" },
        { value: "IO", label: "I/O bekleme" },
        { value: "SPACE", label: "Tablespace / disk doluluk" },
      ] },
      { id: "window", label: "Gözlem aralığı", kind: "text", row: "belirti" },
      { id: "sqlId", label: "SQL_ID / query hash", kind: "text" },
    ],
  },
  DB_EXPORT: {
    key: "DB_EXPORT",
    office: "VERITABANI",
    label: "Veri dışa aktarma / maskeleme",
    group: "Veri hizmetleri",
    description: "Data Pump, bcp, pg_dump veya KVKK uyumlu maskeli extract.",
    slug: "vt-export",
    extraFields: [
      { id: "dbEngine", label: "Motor", kind: "select", required: true, row: "motor", options: [
        { value: "ORACLE", label: "Oracle Data Pump" },
        { value: "MSSQL", label: "SQL Server bcp / SSIS" },
        { value: "POSTGRES", label: "pg_dump / COPY" },
        { value: "MYSQL", label: "mysqldump" },
        { value: "MONGODB", label: "mongoexport" },
      ] },
      { id: "dbName", label: "Kaynak veritabanı", kind: "text", required: true, row: "motor" },
      { id: "objectScope", label: "Kapsam (şema / tablo)", kind: "text", required: true },
      { id: "masking", label: "Maskeleme", kind: "select", required: true, row: "kvkk", options: [
        { value: "NONE", label: "Yok (üretim kopyası değil)" },
        { value: "MASKED", label: "KVKK / maskeli" },
        { value: "ANON", label: "Anonimleştirilmiş" },
      ] },
      { id: "delivery", label: "Teslim", kind: "select", row: "kvkk", options: [
        { value: "SHARE", label: "Dosya paylaşımı" },
        { value: "SFTP", label: "SFTP" },
        { value: "TICKET", label: "Talep eki" },
      ] },
    ],
  },
  DB_REFRESH: {
    key: "DB_REFRESH",
    office: "VERITABANI",
    label: "Test ortamı yenileme",
    group: "Veri hizmetleri",
    description: "Üretimden teste klon (Oracle PDB clone, SQL Server restore, PostgreSQL refresh).",
    slug: "vt-yenileme",
    extraFields: [
      { id: "dbEngine", label: "Motor", kind: "select", required: true, row: "motor", options: [
        { value: "ORACLE", label: "Oracle PDB / Data Guard klon" },
        { value: "MSSQL", label: "SQL Server restore" },
        { value: "POSTGRES", label: "PostgreSQL refresh" },
        { value: "MYSQL", label: "MySQL dump/restore" },
        { value: "MONGODB", label: "MongoDB dump/restore" },
      ] },
      { id: "sourceDb", label: "Kaynak (üretim)", kind: "text", required: true, row: "yon" },
      { id: "targetDb", label: "Hedef (test / dev)", kind: "text", required: true, row: "yon" },
      { id: "maskAfter", label: "Yenileme sonrası maskeleme", kind: "select", required: true, options: [
        { value: "YES", label: "Evet, maskele" },
        { value: "NO", label: "Hayır" },
      ] },
      { id: "refreshWindow", label: "Çalışma penceresi", kind: "text" },
    ],
  },
  SD_SUPPORT: {
    key: "SD_SUPPORT",
    office: "SERVIS",
    label: "Destek kaydı",
    group: "Yardım masası",
    description: "ServiceNow Incident, ManageEngine ServiceDesk Plus veya BMC Helix destek kaydı.",
    slug: "destek-kaydi",
    extraFields: [
      { id: "sdProduct", label: "Yardım masası ürünü", kind: "select", row: "urun", options: [
        { value: "SERVICENOW", label: "ServiceNow" },
        { value: "SDP", label: "ManageEngine ServiceDesk Plus" },
        { value: "HELIX", label: "BMC Helix" },
        { value: "JIRA_SM", label: "Jira Service Management" },
      ] },
      { id: "category", label: "Kategori", kind: "select", required: true, row: "urun", options: [
        { value: "INCIDENT", label: "Olay / arıza" },
        { value: "REQUEST", label: "Hizmet talebi" },
        { value: "HOWIT", label: "Nasıl yapılır" },
        { value: "COMPLAINT", label: "Şikayet" },
      ] },
      { id: "affectedService", label: "Etkilenen hizmet / CI", kind: "text", required: true, row: "etki" },
      { id: "urgency", label: "Aciliyet", kind: "select", row: "etki", options: [
        { value: "HIGH", label: "Yüksek" },
        { value: "MEDIUM", label: "Orta" },
        { value: "LOW", label: "Düşük" },
      ] },
      { id: "reproSteps", label: "Yeniden üretme adımları", kind: "textarea", fullWidth: true },
    ],
  },
  SD_HARDWARE: {
    key: "SD_HARDWARE",
    office: "SERVIS",
    label: "Donanım / uç nokta",
    group: "Varlık hizmeti",
    description: "ServiceNow HAM veya SDP varlık kaydı — dizüstü, monitör, çevre birimi.",
    slug: "donanim-destek",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "NEW", label: "Yeni cihaz talebi" },
        { value: "REPLACE", label: "Değişim / arıza" },
        { value: "LOAN", label: "Geçici zimmet" },
        { value: "RETURN", label: "İade" },
      ] },
      { id: "deviceClass", label: "Cihaz sınıfı", kind: "select", required: true, row: "islem", options: [
        { value: "LAPTOP", label: "Dizüstü" },
        { value: "DESKTOP", label: "Masaüstü" },
        { value: "MONITOR", label: "Monitör" },
        { value: "PERIPHERAL", label: "Çevre birimi" },
        { value: "PHONE", label: "IP telefon / mobil" },
      ] },
      { id: "assetTag", label: "Mevcut stok / zimmet no", kind: "text", row: "zimmet" },
      { id: "location", label: "Teslim konumu", kind: "text", row: "zimmet" },
    ],
  },
  SD_ACCESS: {
    key: "SD_ACCESS",
    office: "SERVIS",
    label: "Genel erişim / hesap",
    group: "Erişim",
    description: "ServiceNow Request / SDP katalog — uygulama, paylaşım veya misafir hesabı (uzman birime yönlendirilebilir).",
    slug: "erisim-destek",
    extraFields: [
      { id: "accessTarget", label: "Erişim hedefi", kind: "select", required: true, row: "hedef", options: [
        { value: "APP", label: "Kurumsal uygulama" },
        { value: "SHARE", label: "Dosya paylaşımı" },
        { value: "GUEST", label: "Misafir / geçici hesap" },
        { value: "BADGE", label: "Kart / fiziksel erişim yönlendirme" },
      ] },
      { id: "systemName", label: "Sistem / uygulama adı", kind: "text", required: true, row: "hedef" },
      { id: "username", label: "Kullanıcı adı", kind: "text", row: "sure" },
      { id: "validUntil", label: "Geçerlilik", kind: "date", row: "sure" },
    ],
  },
  SD_SOFTWARE: {
    key: "SD_SOFTWARE",
    office: "SERVIS",
    label: "Yazılım kurulumu / lisans",
    group: "Yazılım hizmeti",
    description: "ServiceNow SAM, Microsoft Intune Company Portal veya SCCM yazılım kataloğu.",
    slug: "yazilim-kurulum",
    extraFields: [
      { id: "actionKind", label: "İşlem", kind: "select", required: true, row: "islem", options: [
        { value: "INSTALL", label: "Kurulum" },
        { value: "LICENSE", label: "Lisans tahsisi" },
        { value: "UNINSTALL", label: "Kaldır" },
        { value: "UPGRADE", label: "Sürüm yükselt" },
      ] },
      { id: "softwareName", label: "Yazılım adı", kind: "text", required: true, row: "islem" },
      { id: "licenseSku", label: "Lisans / SKU", kind: "text", row: "lisans" },
      { id: "hostName", label: "Hedef cihaz", kind: "text", row: "lisans" },
    ],
  },
};

export const REQUEST_TYPE_LIST = Object.values(REQUEST_TYPES);

export const SLUG_TO_REQUEST_TYPE = {
  ...Object.fromEntries(REQUEST_TYPE_LIST.map((item) => [item.slug, item.key])),
  nac: "NAC",
} as Record<string, RequestTypeKey>;

export function getRequestType(key: string) {
  return REQUEST_TYPES[key as RequestTypeKey];
}

export function requestTypesByOffice(office: RequestOffice) {
  return REQUEST_TYPE_LIST.filter((item) => item.office === office);
}

export function slugifyRequestGroup(group: string) {
  return group
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type RequestGroupDef = {
  slug: string;
  label: string;
  office: RequestOffice;
  types: RequestTypeDef[];
};

export type RequestOfficeNode = {
  office: RequestOffice;
  label: string;
  navLabel: string;
  groups: RequestGroupDef[];
};

export function requestOfficeTree(names?: OfficeNames): RequestOfficeNode[] {
  const resolved = names ?? defaultOfficeNames();
  return REQUEST_OFFICES.map((office) => {
    const types = requestTypesByOffice(office);
    const groups: RequestGroupDef[] = [];
    for (const type of types) {
      const slug = slugifyRequestGroup(type.group);
      const existing = groups.find((group) => group.slug === slug);
      if (existing) {
        existing.types.push(type);
      } else {
        groups.push({ slug, label: type.group, office, types: [type] });
      }
    }
    return {
      office,
      label: resolved[office].label,
      navLabel: resolved[office].navLabel,
      groups,
    };
  });
}

export function findRequestGroup(slug: string) {
  const aliases: Record<string, string> = { "nac-erisim": "nac-istisna" };
  const resolved = aliases[slug] ?? slug;
  for (const office of requestOfficeTree()) {
    const group = office.groups.find((item) => item.slug === resolved);
    if (group) return group;
  }
  return undefined;
}