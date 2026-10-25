import { ASSET_TYPE_LIST } from "@/lib/inventory/asset-types";
import { CRITICALITY_LABELS, CRITICALITY_LEVELS, LIFECYCLE_STATUS_LABELS, LIFECYCLE_STATUSES } from "@/lib/inventory/constants";
import {
  CHANGE_STATUS_LABELS,
  CHANGE_STATUSES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUSES,
  PERSONNEL_ROLE_LABELS,
  PERSONNEL_ROLES,
  PROBLEM_STATUS_LABELS,
  PROBLEM_STATUSES,
  REQUEST_SEVERITIES,
  REQUEST_SEVERITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  VULN_SEVERITIES,
  VULN_SEVERITY_LABELS,
  VULN_STATUS_LABELS,
  VULN_STATUSES,
} from "@/lib/itil/constants";
import { officeLabel, type OfficeNames } from "@/lib/itil/office-names";
import { REQUEST_OFFICE_LABELS, REQUEST_OFFICES } from "@/lib/itil/request-types";
import type { ReportDef, ReportFilterDef, ReportFilterOption } from "./types";

const opt = (labels: Record<string, string>, keys: readonly string[]): ReportFilterOption[] =>
  keys.map((value) => ({ value, label: labels[value] ?? value }));

const ASSET_TYPE_OPTIONS = ASSET_TYPE_LIST.map((item) => ({ value: item.key, label: item.label }));
const SEARCH: ReportFilterDef = { key: "q", label: "Arama", kind: "text", placeholder: "Ad, stok, IP…" };
const DATES: ReportFilterDef[] = [
  { key: "dateFrom", label: "Başlangıç", kind: "date" },
  { key: "dateTo", label: "Bitiş", kind: "date" },
];
const DEPARTMENT: ReportFilterDef = { key: "departmentId", label: "Birim", kind: "select", optionSource: "departments" };

export const REPORTS: ReportDef[] = [
  {
    id: "envanter-tum",
    title: "Tüm envanter",
    description: "Tür, stok, IP, sahip, birim, kritiklik ve bakım bitişi.",
    group: "Envanter",
    filters: [
      SEARCH,
      { key: "assetType", label: "Tür", kind: "select", options: ASSET_TYPE_OPTIONS },
      DEPARTMENT,
      { key: "criticality", label: "Kritiklik", kind: "select", options: opt(CRITICALITY_LABELS, CRITICALITY_LEVELS) },
      { key: "status", label: "Yaşam döngüsü", kind: "select", options: opt(LIFECYCLE_STATUS_LABELS, LIFECYCLE_STATUSES) },
      ...DATES,
    ],
  },
  {
    id: "envanter-tur",
    title: "Türe göre envanter özeti",
    description: "Her envanter türünde toplam, yüksek kritiklik ve açık zafiyet.",
    group: "Envanter",
    filters: [{ key: "assetType", label: "Tür", kind: "select", options: ASSET_TYPE_OPTIONS }],
  },
  {
    id: "envanter-bakim",
    title: "Bakımı yaklaşan / dolan",
    description: "60 gün içinde biten veya tarihi geçmiş bakım ve lisanslar.",
    group: "Envanter",
    filters: [
      { key: "assetType", label: "Tür", kind: "select", options: ASSET_TYPE_OPTIONS },
      DEPARTMENT,
      ...DATES,
    ],
  },
  {
    id: "envanter-zafiyetli",
    title: "Açık zafiyetli varlıklar",
    description: "En az bir açık zafiyeti olan CI kayıtları.",
    group: "Envanter",
    filters: [
      SEARCH,
      { key: "assetType", label: "Tür", kind: "select", options: ASSET_TYPE_OPTIONS },
      DEPARTMENT,
    ],
  },
  {
    id: "personel-zimmet",
    title: "Personel ve zimmet",
    description: "Kişiler, roller, birimler ve üzerlerindeki envanter sayısı.",
    group: "Personel",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "Ad, sicil, e-posta…" },
      DEPARTMENT,
      { key: "role", label: "Rol", kind: "select", options: opt(PERSONNEL_ROLE_LABELS, PERSONNEL_ROLES) },
    ],
  },
  {
    id: "talepler-acik",
    title: "Açık servis talepleri",
    description: "Açık, işlemde ve bekleyen talepler. Durum filtresiyle tüm talepler de çıkarılabilir.",
    group: "ITIL",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "No, gerekçe…" },
      { key: "office", label: "Şube", kind: "select", options: opt(REQUEST_OFFICE_LABELS, REQUEST_OFFICES) },
      DEPARTMENT,
      { key: "severity", label: "Önem", kind: "select", options: opt(REQUEST_SEVERITY_LABELS, REQUEST_SEVERITIES) },
      { key: "status", label: "Durum", kind: "select", options: opt(TICKET_STATUS_LABELS, TICKET_STATUSES) },
      ...DATES,
    ],
  },
  {
    id: "degisiklik-yama",
    title: "Değişiklik ve yama",
    description: "Son değişiklik ve yama kayıtları, durumlarıyla.",
    group: "ITIL",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "No, başlık…" },
      {
        key: "kind",
        label: "Kayıt",
        kind: "select",
        options: [
          { value: "CHANGE", label: "Değişiklik" },
          { value: "PATCH", label: "Yama" },
        ],
      },
      { key: "status", label: "Durum", kind: "select", options: opt(CHANGE_STATUS_LABELS, CHANGE_STATUSES) },
      ...DATES,
    ],
  },
  {
    id: "zafiyet-acik",
    title: "Açık zafiyetler",
    description: "Seviye, CVE, cihaz, envanter ve termin. Durum filtresiyle kapananlar da alınabilir.",
    group: "Güvenlik",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "CVE, cihaz, IP…" },
      { key: "severity", label: "Seviye", kind: "select", options: opt(VULN_SEVERITY_LABELS, VULN_SEVERITIES) },
      { key: "status", label: "Durum", kind: "select", options: opt(VULN_STATUS_LABELS, VULN_STATUSES) },
      {
        key: "source",
        label: "Kaynak",
        kind: "select",
        options: [
          { value: "SCANNER", label: "Tarayıcı" },
          { value: "MANUAL", label: "Manuel" },
        ],
      },
      ...DATES,
    ],
  },
  {
    id: "olay-problem",
    title: "Olay ve problem",
    description: "Açık olaylar ile bağlı problem kayıtları.",
    group: "Güvenlik",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "No, başlık…" },
      {
        key: "kind",
        label: "Kayıt",
        kind: "select",
        options: [
          { value: "INCIDENT", label: "Olay" },
          { value: "PROBLEM", label: "Problem" },
        ],
      },
      DEPARTMENT,
      {
        key: "status",
        label: "Durum",
        kind: "select",
        options: [
          ...opt(INCIDENT_STATUS_LABELS, INCIDENT_STATUSES),
          ...opt(PROBLEM_STATUS_LABELS, PROBLEM_STATUSES).filter((item) => item.value === "KNOWN_ERROR"),
        ],
      },
      ...DATES,
    ],
  },
  {
    id: "firma-sla",
    title: "Firma ve SLA",
    description: "Firmalar, irtibat ve açık SLA / arıza kayıtları.",
    group: "Tedarik",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "Firma, no, tanım…" },
      {
        key: "kind",
        label: "Kayıt",
        kind: "select",
        options: [
          { value: "VENDOR", label: "Firma" },
          { value: "SLA", label: "SLA / arıza" },
        ],
      },
      { key: "vendorId", label: "Firma", kind: "select", optionSource: "vendors" },
      { key: "status", label: "SLA durumu", kind: "select", options: opt(TICKET_STATUS_LABELS, TICKET_STATUSES) },
      { key: "severity", label: "Seviye", kind: "select", options: opt(VULN_SEVERITY_LABELS, VULN_SEVERITIES) },
    ],
  },
  {
    id: "personel-performans",
    title: "Personel performans özeti",
    description: "Personel başına açtığı/kapattığı çağrı, diğer ITIL süreçlerinde giriş, güncelleme, tamamlama ve toplam puan (puana göre sıralı).",
    group: "Personel",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "Ad soyad, sicil…" },
      DEPARTMENT,
      ...DATES,
    ],
  },
  {
    id: "personel-performans-detay",
    title: "Personel performans dökümü (süreç bazında)",
    description: "Her personelin süreç bazında giriş, güncelleme, tamamlama sayıları ve puanı.",
    group: "Personel",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "Ad soyad, sicil…" },
      DEPARTMENT,
      ...DATES,
    ],
  },
  {
    id: "personel-is-yuku",
    title: "Personel iş yükü özeti",
    description: "Personel başına bekleyen onay, üzerindeki iş, Çevik görev, diğer yapılacaklar, aktif sprint ve açık talep sayısı (yüke göre sıralı).",
    group: "Personel",
    filters: [{ key: "q", label: "Arama", kind: "text", placeholder: "Ad soyad, sicil…" }, DEPARTMENT],
  },
  {
    id: "personel-is-yuku-detay",
    title: "Personel yapılacaklar dökümü",
    description: "Her personelin üzerindeki onay, iş, görev, sprint ve diğer yapılacakların tek tek listesi.",
    group: "Personel",
    filters: [{ key: "q", label: "Arama", kind: "text", placeholder: "Ad soyad, sicil…" }, DEPARTMENT],
  },
  {
    id: "agile-sprint",
    title: "Sprint özeti ve velocity",
    description: "Sprint başına planlanan ve biten puan, iş sayısı, tarihler (velocity).",
    group: "Çevik çalışma",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "Sprint veya ürün adı…" },
      { key: "status", label: "Sprint durumu", kind: "select", options: [{ value: "PLANNED", label: "Planlandı" }, { value: "ACTIVE", label: "Aktif" }, { value: "CLOSED", label: "Kapandı" }] },
      ...DATES,
    ],
  },
  {
    id: "agile-is-yuku",
    title: "Çevik personel iş yükü",
    description: "Kişi başına atanan açık iş, açık puan, son 30 günde biten iş ve puan.",
    group: "Çevik çalışma",
    filters: [{ key: "q", label: "Arama", kind: "text", placeholder: "Ad soyad…" }, DEPARTMENT],
  },
  {
    id: "agile-epik",
    title: "Epik ilerlemesi",
    description: "Epik başına bağlı iş sayısı, toplam ve biten puan, ilerleme yüzdesi.",
    group: "Çevik çalışma",
    filters: [{ key: "q", label: "Arama", kind: "text", placeholder: "Epik adı veya ürün…" }],
  },
  {
    id: "agile-toplanti",
    title: "Çevik toplantı kayıtları",
    description: "Planlama, günlük, değerlendirme ve retrospektif kayıtları: tarih, katılımcı, notlar ve kararlar.",
    group: "Çevik çalışma",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "Başlık, not, katılımcı…" },
      { key: "kind", label: "Toplantı türü", kind: "select", options: [{ value: "PLANNING", label: "Sprint planlama" }, { value: "DAILY", label: "Günlük toplantı" }, { value: "REFINEMENT", label: "Backlog düzenleme" }, { value: "REVIEW", label: "Sprint değerlendirme" }, { value: "RETRO", label: "Retrospektif" }] },
      ...DATES,
    ],
  },
  {
    id: "agile-isler",
    title: "Çevik iş listesi",
    description: "Backlog ve sprint işleri: tür, öncelik, durum, puan, sorumlu, ITIL kaynağı.",
    group: "Çevik çalışma",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "No, başlık…" },
      { key: "status", label: "Durum", kind: "select", options: [{ value: "BACKLOG", label: "Backlog" }, { value: "TODO", label: "Yapılacak" }, { value: "IN_PROGRESS", label: "Devam ediyor" }, { value: "REVIEW", label: "İncelemede" }, { value: "DONE", label: "Bitti" }] },
      ...DATES,
    ],
  },
  {
    id: "yonetici-ozeti",
    title: "Yönetici özeti (KPI panosu)",
    description: "Hizmet masası, olay, problem, değişiklik, zafiyet ve onay göstergelerinin tek sayfalık özeti.",
    group: "Yönetim ve KPI",
    filters: [...DATES],
  },
  {
    id: "sla-uyum",
    title: "SLA uyum raporu",
    description: "Talep ve olaylarda önem derecesine göre süresinde çözülen, SLA aşımı ve uyum oranı.",
    group: "Yönetim ve KPI",
    filters: [...DATES],
  },
  {
    id: "cozum-suresi",
    title: "Çözüm süresi (MTTR) ve ilk yanıt (MTTA)",
    description: "Önem derecesine göre ortalama, medyan ve en uzun çözüm süresi; olaylarda ilk yanıt süresi.",
    group: "Yönetim ve KPI",
    filters: [...DATES],
  },
  {
    id: "acik-yaslandirma",
    title: "Açık kayıt yaşlandırma",
    description: "Açık talep, olay, problem, değişiklik, yama ve zafiyetlerin yaş dağılımı (0–3, 4–7, 8–30, 31–90, 90+ gün).",
    group: "Yönetim ve KPI",
    filters: [],
  },
  {
    id: "degisiklik-basari",
    title: "Değişiklik ve yama başarı oranı",
    description: "Tür bazında tamamlanan, reddedilen, iptal ve devam eden kayıtlar; ortalama onay süresi.",
    group: "Yönetim ve KPI",
    filters: [...DATES],
  },
  {
    id: "zafiyet-termin",
    title: "Zafiyet termin uyumu",
    description: "Seviye bazında açık zafiyet, termin aşımı, ortalama kapanış ve yaş.",
    group: "Güvenlik",
    filters: [...DATES],
  },
  {
    id: "onay-sureleri",
    title: "Onay zinciri süreleri",
    description: "Talep, değişiklik ve yama onay zincirlerinde bekleyen, onaylanan, reddedilen ve ortalama tamamlanma süresi.",
    group: "Yönetim ve KPI",
    filters: [...DATES],
  },
  {
    id: "erisim-denetimi",
    title: "Erişim ve lisans denetimi",
    description: "Lisans doluluğu, hesap sayıları, kilitli hesaplar ve rol dağılımı (yetki inceleme kanıtı).",
    group: "Denetim",
    filters: [],
  },
  {
    id: "yetki-matrisi",
    title: "Yetki matrisi",
    description: "Modül yetkileri (grup → modül → düzey), AD grubu → rol eşlemesi ve talep kategorisi → AD grubu eşlemesi (yetki inceleme kanıtı).",
    group: "Denetim",
    filters: [{ key: "q", label: "Arama", kind: "text", placeholder: "Grup, modül, rol…" }],
  },
  {
    id: "hareketler",
    title: "Audit log",
    description: "Son 200 işlem: varlık, eylem ve not.",
    group: "Denetim",
    filters: [
      { key: "q", label: "Arama", kind: "text", placeholder: "Eylem, not, aktör…" },
      ...DATES,
    ],
  },
];

export function getReportDef(id: string) {
  return REPORTS.find((item) => item.id === id);
}

export function reportWithOfficeNames(report: ReportDef, names: OfficeNames): ReportDef {
  return {
    ...report,
    filters: (report.filters ?? []).map((filter) =>
      filter.key === "office"
        ? {
            ...filter,
            options: REQUEST_OFFICES.map((office) => ({ value: office, label: officeLabel(office, names) })),
          }
        : filter,
    ),
  };
}

export const REPORT_MODULE: Record<string, string> = {
  "envanter-tum": "/envanter",
  "envanter-tur": "/envanter",
  "envanter-bakim": "/envanter",
  "envanter-zafiyetli": "/envanter",
  "personel-zimmet": "/personel",
  "talepler-acik": "/talepler",
  "degisiklik-yama": "/degisiklik",
  "zafiyet-acik": "/zafiyet",
  "olay-problem": "/olay",
  "firma-sla": "/firma-sla",
  "personel-performans": "/personel",
  "personel-performans-detay": "/personel",
  "personel-is-yuku": "/personel",
  "personel-is-yuku-detay": "/personel",
  "agile-sprint": "/cevik",
  "agile-isler": "/cevik",
  "agile-is-yuku": "/cevik",
  "agile-epik": "/cevik",
  "agile-toplanti": "/cevik",
  hareketler: "/ayarlar",
  "yonetici-ozeti": "/ayarlar",
  "sla-uyum": "/olay",
  "cozum-suresi": "/olay",
  "acik-yaslandirma": "/olay",
  "degisiklik-basari": "/degisiklik",
  "zafiyet-termin": "/zafiyet",
  "onay-sureleri": "/ayarlar",
  "erisim-denetimi": "/ayarlar",
  "yetki-matrisi": "/ayarlar",
};

/** `canAccessPath`: Yetki matrisine göre yol erişimi (bkz. getAccessChecker). */
export function canViewReport(canAccessPath: (pathname: string) => boolean, reportId: string) {
  const path = REPORT_MODULE[reportId];
  if (!path) return false;
  return canAccessPath(path);
}

export const REPORT_GROUPS = [...new Set(REPORTS.map((item) => item.group))];
