import type { FieldDef } from "@/lib/inventory/fields";
import type { OfficerKey } from "@/lib/settings";
import {
  REQUEST_OFFICE_LABELS,
  REQUEST_OFFICES,
} from "./request-types";
import { REQUESTER_DEPT_PAIR } from "./form-fields";
import { REQUEST_SEVERITY_LABELS, REQUEST_SEVERITIES, TICKET_STATUS_LABELS, TICKET_STATUSES } from "./constants";

const opt = <T extends string>(labels: Record<T, string>, keys: readonly T[]) =>
  keys.map((value) => ({ value, label: labels[value] }));

export const CATALOG_STATUSES = ["ACTIVE", "PLANNED", "RETIRED"] as const;
export const CATALOG_STATUS_LABELS: Record<(typeof CATALOG_STATUSES)[number], string> = {
  ACTIVE: "Aktif / kullanıcılara açık",
  PLANNED: "Tasarımda",
  RETIRED: "Kullanımdan kalktı",
};

export const CATALOG_AUDIENCES = ["USER", "INTERNAL", "BOTH"] as const;
export const CATALOG_AUDIENCE_LABELS: Record<(typeof CATALOG_AUDIENCES)[number], string> = {
  USER: "Kurum kullanıcıları",
  INTERNAL: "Yalnızca BT içi",
  BOTH: "Kullanıcı + BT",
};

export const RELEASE_STATUSES = ["PLANNED", "IN_PROGRESS", "READY", "DEPLOYED", "ROLLED_BACK", "CANCELLED"] as const;
export const RELEASE_STATUS_LABELS: Record<(typeof RELEASE_STATUSES)[number], string> = {
  PLANNED: "Planlandı",
  IN_PROGRESS: "Hazırlanıyor",
  READY: "Canlıya hazır",
  DEPLOYED: "Dağıtıldı",
  ROLLED_BACK: "Geri alındı",
  CANCELLED: "İptal",
};

export const MONITORING_STATUSES = ["OPEN", "ACKNOWLEDGED", "CLEARED", "CLOSED"] as const;
export const MONITORING_STATUS_LABELS: Record<(typeof MONITORING_STATUSES)[number], string> = {
  OPEN: "Açık alarm",
  ACKNOWLEDGED: "Üstlenildi",
  CLEARED: "Normalleşti",
  CLOSED: "Kapatıldı",
};

export type ItilProcessKey =
  | "DESIGN"
  | "SLA"
  | "AVAILABILITY"
  | "CAPACITY"
  | "CONTINUITY"
  | "VALIDATION"
  | "RELEASE"
  | "MONITORING"
  | "EVALUATION";

export type ItilProcessDef = {
  key: ItilProcessKey;
  slug: string;
  prefix: string;
  label: string;
  english: string;
  description: string;
  href: string;
  officer: OfficerKey;
  group: "tasarim" | "operasyon" | "gecis" | "degerlendirme";
  statuses: { value: string; label: string }[];
  extraFields: FieldDef[];
};

const ticketStatusOpts = opt(TICKET_STATUS_LABELS, TICKET_STATUSES);
const severityOpts = opt(REQUEST_SEVERITY_LABELS, REQUEST_SEVERITIES);

export const ITIL_PROCESSES: ItilProcessDef[] = [
  {
    key: "DESIGN",
    slug: "tasarim",
    prefix: "TAS",
    label: "Hizmet tasarımı",
    english: "Service Design",
    description: "Yeni veya değişen hizmetin iş hedefi, güvenlik standardı ve müşteri beklentisine göre tasarımı.",
    href: "/surec/tasarim",
    officer: "tasarim",
    group: "tasarim",
    statuses: ticketStatusOpts,
    extraFields: [
      { id: "businessGoal", label: "İş hedefi", kind: "textarea", fullWidth: true, hint: "Hizmetin karşılaması beklenen iş sonucu." },
      { id: "securityStandard", label: "Güvenlik standardı", kind: "text", row: "guvenlik", hint: "ISO 27001, KVKK, kurum BG politikası." },
      { id: "customerExpectation", label: "Müşteri / kullanıcı beklentisi", kind: "text", row: "guvenlik", hint: "Kesinti penceresi, self-servis, erişim saati." },
      { id: "architectureNote", label: "Mimari not", kind: "textarea", fullWidth: true, hint: "Bileşenler, bağımlılıklar, entegrasyon." },
      { id: "targetGoLive", label: "Hedef canlı tarihi", kind: "date", hint: "Tasarımın canlıya alınması planı." },
    ],
  },
  {
    key: "SLA",
    slug: "hizmet-seviyesi",
    prefix: "HSV",
    label: "Hizmet seviyesi yönetimi",
    english: "Service Level Management",
    description: "SLA hedeflerini belirler, ölçer ve sapmaları raporlar. Firma arızaları Firma / SLA modülündedir.",
    href: "/surec/hizmet-seviyesi",
    officer: "firmaSla",
    group: "tasarim",
    statuses: ticketStatusOpts,
    extraFields: [
      { id: "measurementPeriod", label: "Ölçüm dönemi", kind: "text", row: "olcum", hint: "Örn. 2026-10 veya 2026 Q4." },
      { id: "targetAvailability", label: "Hedef kullanılabilirlik %", kind: "text", row: "olcum", hint: "Kataloğundaki SLA hedefi. Örn. 99.9." },
      { id: "actualAvailability", label: "Gerçekleşen %", kind: "text", row: "gercek", hint: "Dönem sonunda ölçülen değer." },
      { id: "breachCount", label: "İhlal sayısı", kind: "text", row: "gercek", hint: "Hedefi kaçıran olay / arıza adedi." },
      { id: "reportNote", label: "Rapor notu", kind: "textarea", fullWidth: true, hint: "Sapma nedeni ve iyileştirme." },
    ],
  },
  {
    key: "AVAILABILITY",
    slug: "kullanilabilirlik",
    prefix: "KUL",
    label: "Kullanılabilirlik yönetimi",
    english: "Availability Management",
    description: "Hizmetin ihtiyaç duyulan anda, taahhüt edilen sürelerde çalışmasını güvenceye alır.",
    href: "/surec/kullanilabilirlik",
    officer: "kullanilabilirlik",
    group: "tasarim",
    statuses: ticketStatusOpts,
    extraFields: [
      { id: "uptimeTarget", label: "Uptime hedefi %", kind: "text", row: "uptime", hint: "Yıllık veya aylık hedef. Örn. 99.95." },
      { id: "measurementWindow", label: "Ölçüm penceresi", kind: "text", row: "uptime", hint: "7/24 veya mesai (08:00–18:00)." },
      { id: "mttrHours", label: "MTTR (saat)", kind: "text", row: "mt", hint: "Ortalama onarım süresi." },
      { id: "mtbfHours", label: "MTBF (saat)", kind: "text", row: "mt", hint: "Arızalar arası ortalama süre." },
      { id: "lastOutage", label: "Son kesinti", kind: "textarea", fullWidth: true, hint: "Tarih, süre, etki ve alınan önlem." },
    ],
  },
  {
    key: "CAPACITY",
    slug: "kapasite",
    prefix: "KAP",
    label: "Kapasite ve performans",
    english: "Capacity and Performance Management",
    description: "CPU, RAM, depolama ve trafik yükünün bugünü ve geleceği için kaynak planı.",
    href: "/surec/kapasite",
    officer: "kapasite",
    group: "tasarim",
    statuses: ticketStatusOpts,
    extraFields: [
      { id: "cpuHeadroom", label: "CPU boşluğu %", kind: "text", row: "kaynak", hint: "Zirve yüke göre kalan işlemci payı." },
      { id: "ramHeadroom", label: "RAM boşluğu %", kind: "text", row: "kaynak", hint: "Zirve yüke göre kalan bellek." },
      { id: "storageHeadroom", label: "Depolama boşluğu %", kind: "text", row: "depo", hint: "Disk / volume doluluk marjı." },
      { id: "peakLoad", label: "Zirve yük", kind: "text", row: "depo", hint: "Eşzamanlı oturum, TPS veya Mbps." },
      { id: "forecast", label: "12 aylık tahmin", kind: "textarea", fullWidth: true, hint: "Büyüme varsayımı ve alınması gereken kaynak." },
    ],
  },
  {
    key: "CONTINUITY",
    slug: "sureklilik",
    prefix: "DR",
    label: "Hizmet sürekliliği",
    english: "Service Continuity Management",
    description: "Afet ve kriz anında hizmetin ayağa kaldırılması (felaket kurtarma) planı.",
    href: "/surec/sureklilik",
    officer: "sureklilik",
    group: "tasarim",
    statuses: ticketStatusOpts,
    extraFields: [
      { id: "disasterScenario", label: "Senaryo", kind: "select", row: "senaryo", hint: "Planın kapsadığı afet türü.", options: [
        { value: "EARTHQUAKE", label: "Deprem" },
        { value: "CYBER", label: "Siber saldırı" },
        { value: "POWER", label: "Büyük elektrik kesintisi" },
        { value: "FIRE", label: "Yangın / su baskını" },
        { value: "OTHER", label: "Diğer" },
      ] },
      { id: "recoverySite", label: "Kurtarma yeri", kind: "text", row: "senaryo", hint: "DR salonu, bulut bölgesi veya yedek kampüs." },
      { id: "rtoHours", label: "RTO (saat)", kind: "text", row: "rto", hint: "Hizmetin ayağa kalkma hedefi." },
      { id: "rpoHours", label: "RPO (saat)", kind: "text", row: "rto", hint: "Kabul edilen veri kaybı penceresi." },
      { id: "lastDrill", label: "Son tatbikat", kind: "textarea", fullWidth: true, hint: "Tarih, sonuç ve açık maddeler." },
    ],
  },
  {
    key: "VALIDATION",
    slug: "dogrulama",
    prefix: "TST",
    label: "Hizmet doğrulama ve test",
    english: "Service Validation and Testing",
    description: "Yeni veya değişen hizmetin canlıya alınmadan tasarım gereksinimlerini karşıladığını test eder.",
    href: "/surec/dogrulama",
    officer: "dogrulama",
    group: "tasarim",
    statuses: ticketStatusOpts,
    extraFields: [
      { id: "testType", label: "Test türü", kind: "select", row: "test", hint: "UAT, güvenlik, performans veya regresyon.", options: [
        { value: "UAT", label: "Kullanıcı kabul (UAT)" },
        { value: "SECURITY", label: "Güvenlik" },
        { value: "PERFORMANCE", label: "Performans" },
        { value: "REGRESSION", label: "Regresyon" },
        { value: "DRILL", label: "DR tatbikatı" },
      ] },
      { id: "environment", label: "Ortam", kind: "text", row: "test", hint: "Test, ön-üretim veya izole DR." },
      { id: "result", label: "Sonuç", kind: "select", row: "sonuc", hint: "Geçti, koşullu veya kaldı.", options: [
        { value: "PASS", label: "Geçti" },
        { value: "CONDITIONAL", label: "Koşullu geçti" },
        { value: "FAIL", label: "Kaldı" },
      ] },
      { id: "goLiveReady", label: "Canlıya hazır mı", kind: "select", row: "sonuc", hint: "Test kapanışı sonrası karar.", options: [
        { value: "YES", label: "Evet" },
        { value: "NO", label: "Hayır" },
        { value: "HOLD", label: "Beklet" },
      ] },
      { id: "defects", label: "Açık hatalar", kind: "textarea", fullWidth: true, hint: "Kalan kusurlar ve iş etkisi." },
    ],
  },
  {
    key: "RELEASE",
    slug: "surum",
    prefix: "REL",
    label: "Sürüm ve dağıtım",
    english: "Release Management",
    description: "Onaylı değişiklik, kod ve yamaların bir araya getirilip canlıya aktarılmaya hazırlanması.",
    href: "/surec/surum",
    officer: "surum",
    group: "gecis",
    statuses: opt(RELEASE_STATUS_LABELS, RELEASE_STATUSES),
    extraFields: [
      { id: "version", label: "Sürüm no", kind: "text", row: "surum", hint: "Örn. 2.0.0 veya 2026.10-R1." },
      { id: "window", label: "Dağıtım penceresi", kind: "text", row: "surum", hint: "Planlanan kesinti / bakım saati." },
      { id: "packageContents", label: "Paket içeriği", kind: "textarea", fullWidth: true, hint: "Değişiklik no, yama no, konfigürasyon." },
      { id: "rollbackPlan", label: "Geri alma planı", kind: "textarea", fullWidth: true, hint: "Başarısız olursa nasıl dönülecek." },
    ],
  },
  {
    key: "MONITORING",
    slug: "izleme",
    prefix: "EVT",
    label: "İş takibi ve izleme",
    english: "Monitoring and Event Management",
    description: "Altyapıyı 7/24 izler; kesinti olmadan anormal log ve olayları ekibe iletir.",
    href: "/surec/izleme",
    officer: "izleme",
    group: "operasyon",
    statuses: opt(MONITORING_STATUS_LABELS, MONITORING_STATUSES),
    extraFields: [
      { id: "source", label: "Kaynak", kind: "text", row: "kaynak", hint: "Zabbix, SIEM, vCenter, uygulama APM." },
      { id: "eventType", label: "Olay türü", kind: "select", row: "kaynak", hint: "Eşik, kesinti habercisi veya bilgi.", options: [
        { value: "THRESHOLD", label: "Eşik aşıldı" },
        { value: "WARNING", label: "Uyarı" },
        { value: "INFO", label: "Bilgi" },
        { value: "HEARTBEAT", label: "Kalp atışı kaybı" },
      ] },
      { id: "threshold", label: "Eşik", kind: "text", row: "esik", hint: "Örn. CPU > %85 / 10 dk." },
      { id: "onCall", label: "Nöbetçi ekip", kind: "text", row: "esik", hint: "İlk uyarılan grup veya kişi." },
      { id: "lastAlert", label: "Son alarm ayrıntısı", kind: "textarea", fullWidth: true, hint: "Zaman, metin, ilgili CI." },
    ],
  },
  {
    key: "EVALUATION",
    slug: "degerlendirme",
    prefix: "DGR",
    label: "Hizmet doğrulama ve değerlendirme",
    english: "Service Evaluation",
    description: "Yeni hizmetin hedeflenen iş değerini yaratıp yaratmadığını tarafsız değerlendirir.",
    href: "/surec/degerlendirme",
    officer: "degerlendirme",
    group: "degerlendirme",
    statuses: ticketStatusOpts,
    extraFields: [
      { id: "intendedValue", label: "Hedeflenen iş değeri", kind: "textarea", row: "deger", hint: "Tasarımda yazılan fayda." },
      { id: "actualValue", label: "Gerçekleşen değer", kind: "textarea", row: "deger", hint: "Kullanım, süre, maliyet, memnuniyet." },
      { id: "stakeholder", label: "Paydaş", kind: "text", hint: "Değerlendirmeyi talep eden birim." },
      { id: "recommendation", label: "Tavsiye", kind: "select", hint: "Sürdür, iyileştir veya durdur.", options: [
        { value: "CONTINUE", label: "Sürdür" },
        { value: "IMPROVE", label: "İyileştir" },
        { value: "RETIRE", label: "Kullanımdan kaldır" },
      ] },
    ],
  },
];

export const ITIL_PROCESS_BY_SLUG = Object.fromEntries(ITIL_PROCESSES.map((item) => [item.slug, item])) as Record<
  string,
  ItilProcessDef
>;

export const ITIL_PROCESS_BY_KEY = Object.fromEntries(ITIL_PROCESSES.map((item) => [item.key, item])) as Record<
  ItilProcessKey,
  ItilProcessDef
>;

export function getItilProcess(slug: string) {
  return ITIL_PROCESS_BY_SLUG[slug];
}

export const CATALOG_FIELDS: FieldDef[] = [
  { id: "requesterId", label: "Kaydeden", kind: "person", required: true, row: "talep-eden", readOnly: true, hint: "Kataloğa kaydı açan, oturumdaki kişidir." },
  { id: "requestingDeptId", label: "Kaydeden birim", kind: "department", row: "talep-eden", readOnly: true, hint: "Personel kartındaki birim." },
  { id: "name", label: "Hizmet adı", kind: "text", required: true, fullWidth: true, hint: "Kullanıcının göreceği kısa ad. Örn. Kurumsal e-posta." },
  { id: "summary", label: "Kısa tanım", kind: "text", fullWidth: true, hint: "Tek cümle: hizmet ne işe yarar." },
  { id: "status", label: "Durum", kind: "select", required: true, row: "durum", options: opt(CATALOG_STATUS_LABELS, CATALOG_STATUSES), hint: "Aktif hizmetler portalda görünür." },
  { id: "audience", label: "Kimler kullanır", kind: "select", required: true, row: "durum", options: opt(CATALOG_AUDIENCE_LABELS, CATALOG_AUDIENCES), hint: "Kullanıcı portalı mı, BT içi mi." },
  { id: "ownerId", label: "Hizmet sahibi", kind: "person", row: "sahip", hint: "Hizmetin iş / BT sahibi." },
  { id: "departmentId", label: "Sorumlu birim", kind: "department", row: "sahip", hint: "Hizmeti işleten birim." },
  { id: "hours", label: "Hizmet saati", kind: "text", row: "saat", hint: "7/24, mesai 08:00–18:00, hafta içi." },
  { id: "criticality", label: "Kritiklik", kind: "select", row: "saat", options: severityOpts, hint: "Kesintinin iş etkisi." },
  { id: "availabilityTarget", label: "SLA kullanılabilirlik %", kind: "text", row: "sla", hint: "Örn. 99.9. Hizmet seviyesi yönetiminde ölçülür." },
  { id: "responseHours", label: "Müdahale (saat)", kind: "text", row: "sla", hint: "İlk yanıt hedefi." },
  { id: "resolveHours", label: "Çözüm (saat)", kind: "text", row: "erisim", hint: "Olay kapanış hedefi." },
  { id: "requestOffice", label: "Talep şubesi", kind: "select", row: "erisim", options: opt(REQUEST_OFFICE_LABELS, REQUEST_OFFICES), hint: "Kullanıcı bu hizmeti hangi ofisten ister." },
  { id: "accessConditions", label: "Erişim şartları", kind: "textarea", fullWidth: true, hint: "Kim talep eder, hangi onay, hangi ağ / VPN gerekir." },
  { id: "description", label: "Ayrıntı", kind: "textarea", fullWidth: true, hint: "Kapsam, istisnalar, bağımlı sistemler." },
];

export function processFormFields(def: ItilProcessDef): FieldDef[] {
  return [
    { id: "requesterId", label: "Kaydeden", kind: "person", required: true, row: "talep-eden", readOnly: true, hint: "Kaydı açan, oturumdaki kişidir; değiştirilemez." },
    { id: "requestDate", label: "Kayıt tarihi", kind: "date", row: "talep-eden", hint: "Süreç kaydının resmi tarihi." },
    ...REQUESTER_DEPT_PAIR.map((field) =>
      field.id === "requestingDeptId" ? { ...field, readOnly: true } : field,
    ),
    { id: "title", label: "Kayıt tanımı", kind: "text", required: true, fullWidth: true, hint: "Listelerde görünen kısa başlık." },
    { id: "serviceId", label: "İlgili katalog hizmeti", kind: "catalog", row: "hizmet", hint: "Bu sürecin bağlandığı canlı hizmet." },
    { id: "status", label: "Durum", kind: "select", editOnly: true, required: true, row: "hizmet", options: def.statuses, hint: "Sürecin güncel adımı." },
    { id: "severity", label: "Önem", kind: "select", row: "seviye", options: severityOpts, hint: "İş etkisi." },
    { id: "ownerId", label: "Süreç sahibi", kind: "person", row: "seviye", hint: "Bu kaydı yürüten kişi." },
    { id: "startDate", label: "Başlangıç", kind: "date", row: "tarih" },
    { id: "endDate", label: "Bitiş", kind: "date", row: "tarih" },
    ...def.extraFields,
    { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Ek bağlam, kanıt veya karar." },
  ];
}

export const ITIL_NAV_GROUPS = [
  { key: "tasarim", label: "Hizmet tasarımı" },
  { key: "operasyon", label: "Hizmet operasyonu" },
  { key: "gecis", label: "Hizmet geçişi" },
  { key: "degerlendirme", label: "Değerlendirme" },
] as const;

export type MappedItilPractice = {
  id: string;
  label: string;
  english: string;
  description: string;
  href: string;
  existing?: boolean;
};

/** Kullanıcının verdiği 17 pratik — mevcut 1.3.0 ekranları korunur, yeniler /surec ve /katalog altındadır. */
export const ITIL_PRACTICE_MAP: MappedItilPractice[] = [
  { id: "catalog", label: "Hizmet kataloğu yönetimi", english: "Service Catalogue Management", description: "Kullanıcılara açık BT hizmetleri, ayrıntı ve erişim şartları.", href: "/katalog" },
  { id: "design", label: "Hizmet tasarımı", english: "Service Design", description: "Yeni veya değişen hizmetin iş, güvenlik ve beklentiye göre tasarımı.", href: "/surec/tasarim" },
  { id: "sla", label: "Hizmet seviyesi yönetimi", english: "Service Level Management", description: "İç SLA hedefleri ve ölçüm. Firma arızası ayrı modüldedir.", href: "/surec/hizmet-seviyesi" },
  { id: "availability", label: "Kullanılabilirlik yönetimi", english: "Availability Management", description: "Taahhüt edilen sürelerde kesintisiz çalışma.", href: "/surec/kullanilabilirlik" },
  { id: "capacity", label: "Kapasite ve performans", english: "Capacity and Performance Management", description: "CPU, RAM, depolama ve yük planı.", href: "/surec/kapasite" },
  { id: "continuity", label: "Hizmet sürekliliği", english: "Service Continuity Management", description: "Afet ve kriz için felaket kurtarma planı.", href: "/surec/sureklilik" },
  { id: "validation", label: "Hizmet doğrulama ve test", english: "Service Validation and Testing", description: "Canlıya alınmadan hatasız çalışma sınaması.", href: "/surec/dogrulama" },
  { id: "itam", label: "Varlık yönetimi", english: "IT Asset Management", description: "Donanım, lisans ve bulut varlığının ömür döngüsü.", href: "/envanter", existing: true },
  { id: "cmdb", label: "Konfigürasyon yönetimi", english: "Service Configuration Management", description: "CI ilişkileri ve bağımlılıklar (CMDB).", href: "/konfigurasyon", existing: true },
  { id: "desk", label: "Hizmet masası", english: "Service Desk", description: "Tek temas noktası; talep ve şikayetlerin ilk karşılama yeri.", href: "/talepler", existing: true },
  { id: "incident", label: "Olay yönetimi", english: "Incident Management", description: "Kesinti ve yavaşlamayı en kısa sürede giderme.", href: "/olay", existing: true },
  { id: "problem", label: "Sorun / problem yönetimi", english: "Problem Management", description: "Kök neden ve kalıcı çözüm.", href: "/problem", existing: true },
  { id: "request", label: "Hizmet talebi yönetimi", english: "Service Request Management", description: "Şifre, yetki, yeni bilgisayar gibi rutin istekler.", href: "/talepler", existing: true },
  { id: "change", label: "Değişiklik kontrolü", english: "Change Enablement", description: "Canlı güncellemenin risk analizi ve planlı onayı.", href: "/degisiklik", existing: true },
  { id: "release", label: "Sürüm ve dağıtım", english: "Release Management", description: "Onaylı değişiklik ve yamaların paketlenmesi.", href: "/surec/surum" },
  { id: "monitoring", label: "İş takibi ve izleme", english: "Monitoring and Event Management", description: "7/24 izleme, log ve erken uyarı.", href: "/surec/izleme" },
  { id: "evaluation", label: "Hizmet doğrulama ve değerlendirme", english: "Service Evaluation", description: "Hizmetin iş değerini tarafsız ölçme.", href: "/surec/degerlendirme" },
];
