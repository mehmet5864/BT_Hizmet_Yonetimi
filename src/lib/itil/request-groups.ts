import { ALL_REQUEST_TYPES, type RequestOffice } from "@/lib/itil/request-types";

/** Talep türü → AD güvenlik grubu. Gruba üye olanlar o türdeki talepleri görür, işler ve kendilerine atanır.
 *  Ayarlarda kategori (örn. "Güvenlik duvarı") bazında girilir ve kategorideki tüm türlere uygulanır. */
export type RequestGroupMap = Record<string, string>;

/** Kategori adı → varsayılan AD grubu. Listede olmayan kategoriler birimin grubunu kullanır. */
const BY_CATEGORY: Record<string, string> = {
  "Güvenlik duvarı": "fw_admins",
  "Web güvenliği": "webgateway_admins",
  "Sandbox / tehdit analizi": "sandbox_admins",
  "Tehdit istihbaratı": "Security_admins",
  "Hat ve bağlantı": "Network_admins",
  "DNS / VPN": "dns_vpn_admins",
  "NAC istisna": "Nac_admins",
  "AD grup ve yetki": "DC_admins",
  "Uygulama güvenliği": "waf_admins",
  "Yük dengeleme": "LB_admins",
  "SIEM / Log": "SIEM_admins",
  "Ayrıcalıklı erişim": "PAM_admins",
  Zafiyet: "Vuln_admins",
  "Güvenlik testi": "Vuln_admins",
  Yedekleme: "Backup_admins",
  "Yedek ve kurtarma": "Backup_admins",
  "Mail relay": "Mail_admins",
  "E-posta": "Mail_admins",
  Sanallaştırma: "Virt_admins",
  Yönlendirme: "Network_admins",
  "IP ve ağ": "Network_admins",
  "Ağ segmentasyonu": "Network_admins",
  Kablosuz: "Network_admins",
};

const BY_OFFICE: Record<RequestOffice, string> = {
  SISTEM: "System_admins",
  NETWORK: "Network_admins",
  SIBER: "Security_admins",
  YAZILIM: "Dev_admins",
  VERITABANI: "DB_admins",
  SERVIS: "ServiceDesk",
};

export function defaultRequestGroups(): RequestGroupMap {
  return Object.fromEntries(ALL_REQUEST_TYPES.map((t) => [t.key, BY_CATEGORY[t.group] ?? BY_OFFICE[t.office]]));
}

export function mergeRequestGroups(incoming: unknown): RequestGroupMap {
  const next = defaultRequestGroups();
  if (!incoming || typeof incoming !== "object") return next;
  const raw = incoming as Record<string, unknown>;
  for (const t of ALL_REQUEST_TYPES) {
    if (!(t.key in raw)) continue;
    next[t.key] = String(raw[t.key] ?? "").trim().slice(0, 80);
  }
  return next;
}

const norm = (value: string) => value.trim().toLocaleLowerCase("tr");

/** Kullanıcının AD gruplarına göre hangi talep türlerinin işleyicisi olduğu. */
export function handledTypesFor(adGroups: string[], map: RequestGroupMap): string[] {
  const mine = new Set(adGroups.map(norm));
  return Object.entries(map)
    .filter(([, group]) => group && mine.has(norm(group)))
    .map(([type]) => type);
}
