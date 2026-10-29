import { SERVICE_KINDS } from "./service-kinds";
import {
  CRITICALITY_LABELS,
  CRITICALITY_LEVELS,
  FORM_FACTOR_LABELS,
  LIFECYCLE_STATUSES,
  LIFECYCLE_STATUS_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  APP_ENVIRONMENTS,
  APP_ENVIRONMENT_LABELS,
  type FormFactor,
} from "./constants";

export type FieldKind =
  | "text"
  | "textarea"
  | "date"
  | "select"
  | "location"
  | "image"
  | "assetRefs"
  | "serviceRefs"
  | "person"
  | "department"
  | "vendor"
  | "catalog"
  | "password"
  | "document";

export type FieldOption = { value: string; label: string };

export type FieldDef = {
  /** Asset modelindeki kolon adı (location/image/hostServers gibi bileşikler hariç) */
  id: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** Yalnızca düzenlemede gösterilir; yeni kayıtta değeri süreç akışı belirler. */
  editOnly?: boolean;
  options?: FieldOption[];
  /** assetRefs alanının hedefleyeceği envanter türleri */
  refTypes?: string[];
  /** Tablo/detayda geniş alan kaplasın mı */
  fullWidth?: boolean;
  /** Aynı satırda tutulacak alan grubu (ör. talep eden + birim amiri) */
  row?: string;
  /** document alanında dosya adının yazılacağı form alanı */
  fileNameField?: string;
  /** Seçim kutusu yerine salt okunur etiket + gizli alan */
  readOnly?: boolean;
};

const opt = <T extends string>(labels: Record<T, string>, keys: readonly T[]): FieldOption[] =>
  keys.map((value) => ({ value, label: labels[value] }));

/**
 * Tüm envanter türlerinde kullanılabilen alanların merkezi kataloğu.
 * Yeni bir alan eklemek için buraya tanımı ekleyip ilgili türün alan listesine
 * adını yazmak yeterlidir; form, doğrulama, tablo ve detay ekranı otomatik uyum sağlar.
 */
export const FIELD_CATALOG = {
  formFactor: {
    id: "formFactor",
    label: "Envanter tipi",
    kind: "select",
    options: opt<FormFactor>(FORM_FACTOR_LABELS, ["PHYSICAL", "VIRTUAL"]),
    hint: "Fiziksel cihaz veya sanal makine.",
  },
  stockNo: {
    id: "stockNo",
    label: "Stok no",
    kind: "text",
    placeholder: "BIM-2024-0001",
    hint: "Kurum stok / BİM numarası. Benzersiz olmalıdır.",
  },
  serialNo: { id: "serialNo", label: "Seri no", kind: "text", placeholder: "PF3K8XYZ", hint: "Üretici seri numarası (cihaz etiketindeki S/N)." },
  name: { id: "name", label: "Ad", kind: "text", placeholder: "Örn. PC-MUH-014", hint: "Envanterde görünecek kısa ad." },
  deviceId: { id: "deviceId", label: "Cihaz kimliği (Device ID)", kind: "text", placeholder: "FDO2345R09K", hint: "Ağ / yönetim sistemindeki cihaz kimliği." },
  brand: { id: "brand", label: "Marka", kind: "text", placeholder: "Dell", row: "marka", hint: "Üretici marka." },
  model: { id: "model", label: "Model", kind: "text", placeholder: "OptiPlex 7010", row: "marka", hint: "Cihaz veya yazılım modeli." },
  servedApplication: {
    id: "servedApplication",
    label: "Hizmet verdiği uygulama",
    kind: "text",
    placeholder: "Evrak Yönetim Sistemi",
    hint: "Bu varlığın desteklediği iş uygulaması.",
  },
  ipAddress: { id: "ipAddress", label: "IP adresi", kind: "text", placeholder: "10.20.30.40", row: "ag", hint: "Yönetim veya servis IP adresi." },
  macAddress: {
    id: "macAddress",
    label: "MAC adresi",
    kind: "text",
    placeholder: "A4:BB:6D:1F:90:2C",
    row: "ag",
    hint: "Ağ kartı donanım adresi. NAC ve keşifte kullanılır.",
  },
  operatingSystem: {
    id: "operatingSystem",
    label: "İşletim sistemi",
    kind: "text",
    placeholder: "Windows 11 Pro",
    row: "os",
    hint: "Kurulu işletim sistemi.",
  },
  version: { id: "version", label: "Versiyon / Sürüm", kind: "text", placeholder: "23H2", row: "os", hint: "OS, yazılım veya firmware sürümü." },
  cpu: { id: "cpu", label: "İşlemci", kind: "text", placeholder: "Intel Core i5-12400", hint: "İşlemci modeli ve adedi." },
  ram: { id: "ram", label: "RAM", kind: "text", placeholder: "16 GB", hint: "Toplam bellek." },
  disk: { id: "disk", label: "Disk", kind: "text", placeholder: "512 GB NVMe SSD", hint: "Disk kapasitesi ve tipi." },
  owner: { id: "owner", label: "Sahibi", kind: "person", required: true, row: "sahiplik", hint: "Zimmetli personel. Kullanıcı yalnızca kendi zimmetini görür." },
  department: { id: "department", label: "Kullanıldığı birim", kind: "department", row: "sahiplik", hint: "Varlığın kullanıldığı birim." },
  criticality: {
    id: "criticality",
    label: "Kritiklik derecesi",
    kind: "select",
    required: true,
    options: opt(CRITICALITY_LABELS, CRITICALITY_LEVELS),
    row: "durum",
    hint: "İş etkisi. Yüksek kayıtlar ana sayfada öne çıkar.",
  },
  status: {
    id: "status",
    label: "Yaşam döngüsü durumu",
    kind: "select",
    required: true,
    options: opt(LIFECYCLE_STATUS_LABELS, LIFECYCLE_STATUSES),
    row: "durum",
    hint: "Aktif, stok, hurda gibi yaşam döngüsü.",
  },
  location: {
    id: "location",
    label: "Konum",
    kind: "location",
    hint: "Oda / Koridor / Kabin / Raf → 1O-3K-4Ka-10",
    fullWidth: true,
  },
  image: { id: "image", label: "Resim", kind: "image", fullWidth: true, hint: "Cihaz veya etiket fotoğrafı." },
  supportStatus: {
    id: "supportStatus",
    label: "Bakım / Destek durumu",
    kind: "select",
    options: opt(SUPPORT_STATUS_LABELS, SUPPORT_STATUSES),
    hint: "Sözleşme kapsamı veya desteksiz.",
  },
  contractorVendor: { id: "contractorVendor", label: "Yüklenici firma", kind: "vendor", row: "firma", hint: "Satın alma / kurulum firması." },
  supportVendor: { id: "supportVendor", label: "Destek firma", kind: "vendor", row: "firma", hint: "Bakım ve arıza firması." },
  supportStartDate: { id: "supportStartDate", label: "Bakım/Destek başlangıç tarihi", kind: "date", row: "bakim", hint: "Sözleşme veya lisans başlangıcı." },
  supportEndDate: { id: "supportEndDate", label: "Bakım/Destek bitiş tarihi", kind: "date", row: "bakim", hint: "60 gün kala ana sayfada uyarılır." },
  transactionDate: { id: "transactionDate", label: "İşlem tarihi", kind: "date", hint: "Zimmet, teslim veya son işlem günü." },
  description: { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Seri no, özel not veya kullanım bilgisi." },
  serviceKind: {
    id: "serviceKind",
    label: "Hizmet / sunucu türü",
    kind: "select",
    options: SERVICE_KINDS.map((k) => ({ value: k.value, label: k.label })),
    fullWidth: true,
    hint: "Üzerinden talep açılabilecek kayıtlar için seçin (güvenlik duvarı, NAC, aktif dizin, sanallaştırma …). Talep formundaki ürün listeleri buna göre dolar; boş bırakırsanız ad, marka ve modelden tahmin edilir.",
  },
  appEnvironment: { id: "appEnvironment", label: "Ortam", kind: "select", row: "uyg", options: opt(APP_ENVIRONMENT_LABELS, APP_ENVIRONMENTS), hint: "Uygulamanın çalıştığı ortam." },
  appTechnology: { id: "appTechnology", label: "Teknoloji / altyapı", kind: "text", row: "uyg", placeholder: ".NET + MSSQL", hint: "Dil, çatı, veritabanı gibi teknik özet." },
  appUrl: { id: "appUrl", label: "Erişim adresi (URL)", kind: "text", row: "uyg2", placeholder: "https://ebys.kurum.local", hint: "Kullanıcıların uygulamaya eriştiği adres." },
  appUserCount: { id: "appUserCount", label: "Kullanıcı sayısı", kind: "text", row: "uyg2", placeholder: "420", hint: "Yaklaşık aktif kullanıcı sayısı." },
  appRto: { id: "appRto", label: "Kurtarma hedefi (RTO)", kind: "text", placeholder: "4 saat", hint: "Kesinti sonrası en geç ne kadar sürede ayağa kalkmalı." },
  servedServices: {
    id: "servedServices",
    label: "Servis verdiği hizmetler",
    kind: "serviceRefs",
    hint: "Hizmet kataloğundaki hangi hizmetleri sunuyor? Bir hizmet tek uygulamaya bağlanır.",
    fullWidth: true,
  },
  hostServers: {
    id: "hostServers",
    label: "Hizmeti veren sunucu",
    kind: "assetRefs",
    refTypes: ["SERVER"],
    hint: "Birden fazla sunucu seçilebilir.",
    fullWidth: true,
  },
} as const satisfies Record<string, FieldDef>;

export type FieldId = keyof typeof FIELD_CATALOG;

/** Bir türde alanın etiketini/zorunluluğunu değiştirmek için kullanılan referans. */
export type FieldRef = FieldId | (Partial<FieldDef> & { id: FieldId });

export function resolveField(ref: FieldRef): FieldDef {
  if (typeof ref === "string") return FIELD_CATALOG[ref] as FieldDef;
  return { ...(FIELD_CATALOG[ref.id] as FieldDef), ...ref };
}
