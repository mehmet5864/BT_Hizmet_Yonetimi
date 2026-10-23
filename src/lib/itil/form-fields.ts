import type { FieldDef } from "@/lib/inventory/fields";
import {
  CHANGE_STATUSES,
  CHANGE_STATUS_LABELS,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  PERSONNEL_ROLE_LABELS,
  PERSONNEL_ROLES,
  PROBLEM_STATUSES,
  PROBLEM_STATUS_LABELS,
  REQUEST_SEVERITIES,
  REQUEST_SEVERITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  VULN_SEVERITIES,
  VULN_SEVERITY_LABELS,
  VULN_STATUSES,
  VULN_STATUS_LABELS,
} from "./constants";
import { officeLabel, type OfficeNames } from "@/lib/itil/office-names";
import { REQUEST_OFFICE_LABELS, REQUEST_OFFICES } from "./request-types";
import { IMPACT_LEVELS, LEVEL_LABELS } from "./sla";

const opt = <T extends string>(labels: Record<T, string>, keys: readonly T[]) =>
  keys.map((value) => ({ value, label: labels[value] }));

const REQUESTER_HINT = "Talep eden, oturum açan kişidir; değiştirilemez.";
const REQUESTER_DEPT_HINT = "Talebi açan kişinin birimi; personel kartından gelir.";

/** Birim alanı olmayan formlarda: talep eden | talep eden birim amiri. */
export const REQUESTER_PAIR: FieldDef[] = [
  { id: "requesterId", label: "Talep eden", kind: "person", required: true, row: "talep-eden", readOnly: true, hint: REQUESTER_HINT },
  { id: "requestingManagerId", label: "Talep eden birim amiri", kind: "person", row: "talep-eden", hint: "Ayarlardaki şube yöneticisi, yoksa personel rolü, yoksa talep edenin amiri." },
];

/** Birim alanı olan formlarda: talep eden birim | talep eden birim amiri. */
export const REQUESTER_DEPT_PAIR: FieldDef[] = [
  { id: "requestingDeptId", label: "Talep eden birim", kind: "department", row: "talep-birim", readOnly: true, hint: REQUESTER_DEPT_HINT },
  { id: "requestingManagerId", label: "Talep eden birim amiri", kind: "person", row: "talep-birim", hint: "Ayarlardaki şube yöneticisi, yoksa personel rolü, yoksa talep edenin amiri." },
];

export const PERSONNEL_FIELDS: FieldDef[] = [
  { id: "tcNo", label: "TC kimlik no", kind: "text", placeholder: "11 haneli", row: "kimlik", hint: "11 haneli T.C. kimlik numarası. Benzersiz olmalıdır." },
  { id: "sicilNo", label: "Sicil no", kind: "text", row: "kimlik", hint: "Kurum sicil numarası." },
  { id: "fullName", label: "Adı soyadı", kind: "text", required: true, hint: "Personelin resmi adı soyadı." },
  { id: "phone", label: "Telefon no", kind: "text", row: "iletisim", hint: "Kurum veya cep telefonu." },
  { id: "email", label: "E-posta", kind: "text", row: "iletisim", hint: "Bildirimler bu adrese gider." },
  { id: "title", label: "Unvanı", kind: "text", row: "gorev", hint: "Kadrodaki unvan." },
  { id: "duty", label: "Görevi", kind: "text", row: "gorev", hint: "Fiili görev tanımı." },
  { id: "workplace", label: "Görev yeri", kind: "text", hint: "Kampüs, bina veya çalışma yeri." },
  { id: "departmentId", label: "Birimi", kind: "department", row: "birim", hint: "Personelin bağlı olduğu birim." },
  { id: "unitManagerId", label: "Birim amiri", kind: "person", row: "birim", hint: "Doğrudan amir." },
  { id: "parentDepartmentId", label: "Üst birimi", kind: "department", row: "ust-birim", hint: "Birimin bağlı olduğu üst birim." },
  { id: "parentManagerId", label: "Üst birim amiri", kind: "person", row: "ust-birim", hint: "Üst birimin amiri." },
  { id: "adUsername", label: "AD kullanıcı adı", kind: "text", placeholder: "ad.soyad", hint: "Active Directory oturum adı. Manuel girişte de kullanılır." },
  { id: "roleSource", label: "Yetki kaynağı", kind: "select", required: true, row: "yetki", hint: "Manuel: personel kartındaki rol. AD: grup eşlemesi. İkisi: yüksek olan geçerli.", options: [
    { value: "MANUAL", label: "Manuel" },
    { value: "AD", label: "Active Directory" },
    { value: "BOTH", label: "AD + manuel (yüksek olan)" },
  ] },
  { id: "role", label: "Manuel rol", kind: "select", required: true, row: "yetki", hint: "Karttaki rol. AD kaynağında yok sayılabilir; BOTH’ta AD ile karşılaştırılır.", options: opt(PERSONNEL_ROLE_LABELS, PERSONNEL_ROLES) },
  { id: "requestOffice", label: "Talep ofisi / şubesi", kind: "select", options: opt(REQUEST_OFFICE_LABELS, REQUEST_OFFICES), hint: "Birim amiri, sistem veya BG yöneticisinin gelen kuyruğu. Düz kullanıcıda yok sayılır." },
  { id: "password", label: "Yerel parola", kind: "password", hint: "Boş bırakılırsa değişmez. İlk kayıtta boşsa varsayılan atanır." },
  { id: "photoUrl", label: "Fotoğraf", kind: "image", fullWidth: true },
];

export function personnelFields(names?: OfficeNames) {
  const labels = Object.fromEntries(REQUEST_OFFICES.map((office) => [office, officeLabel(office, names)])) as Record<
    (typeof REQUEST_OFFICES)[number],
    string
  >;
  return PERSONNEL_FIELDS.map((field) =>
    field.id === "requestOffice" ? { ...field, options: opt(labels, REQUEST_OFFICES) } : field,
  );
}

export const REQUEST_COMMON_FIELDS: FieldDef[] = [
  { id: "requesterId", label: "Talep eden", kind: "person", required: true, row: "talep-eden", readOnly: true, hint: REQUESTER_HINT },
  { id: "requestDate", label: "Talep tarihi", kind: "date", required: true, row: "talep-eden", hint: "Talebin resmi açılış tarihi." },
  { id: "requestingDeptId", label: "Talep eden birim", kind: "department", row: "talep-birim", readOnly: true, hint: REQUESTER_DEPT_HINT },
  { id: "severity", label: "Önem derecesi", kind: "select", required: true, row: "seviye", options: opt(REQUEST_SEVERITY_LABELS, REQUEST_SEVERITIES), hint: "Yüksek ve kritik talepler üst birime otomatik bilgi / yükseltme üretir." },
  { id: "status", label: "Durum", kind: "select", editOnly: true, required: true, row: "seviye", options: opt(TICKET_STATUS_LABELS, TICKET_STATUSES), hint: "Kuyruk yetkilisi ilerletir. Kullanıcı bu alanı görmez." },
  { id: "reason", label: "Gerekçe", kind: "textarea", fullWidth: true, hint: "Talebin neden gerekli olduğunu kısaca yazın." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Sistem, tarih, kullanıcı ve ek teknik ayrıntılar." },
];

const REQUESTER_HIDDEN = new Set(["status"]);

/** Düz kullanıcı durumu değiştiremez. Talep eden ve birimi salt okunur gelir. */
export function requestCommonFields(options: { canProcess?: boolean } = {}) {
  return REQUEST_COMMON_FIELDS.filter((field) => {
    if (!options.canProcess && REQUESTER_HIDDEN.has(field.id)) return false;
    return true;
  });
}

export const CHANGE_FIELDS: FieldDef[] = [
  { id: "requesterId", label: "Talep eden", kind: "person", required: true, row: "talep-eden", readOnly: true, hint: REQUESTER_HINT },
  { id: "requestDate", label: "Talep tarihi", kind: "date", row: "talep-eden", hint: "Değişiklik talebinin resmi tarihi." },
  ...REQUESTER_DEPT_PAIR,
  { id: "infosecManagerId", label: "Bilgi güvenliği yöneticisi", kind: "person", row: "bg", hint: "Bilgi güvenliği onayını verecek yönetici." },
  { id: "changeIp", label: "Değişiklik IP", kind: "text", row: "bg", hint: "Etkilenen sunucu veya arayüz IP’si." },
  { id: "changeKind", label: "Değişiklik türü", kind: "select", row: "degisim-tur", hint: "Yazılım, donanım veya diğer.", options: [
    { value: "SOFTWARE", label: "Yazılım" },
    { value: "HARDWARE", label: "Donanım" },
    { value: "OTHER", label: "Diğer" },
  ] },
  { id: "machineType", label: "Makine tipi", kind: "select", row: "degisim-tur", hint: "Sanal veya fiziksel makine.", options: [
    { value: "VIRTUAL", label: "Sanal" },
    { value: "PHYSICAL", label: "Fiziksel" },
  ] },
  { id: "impact", label: "Değişiklik etkisi", kind: "select", hint: "Kesinti kısmi mi tüm sistem mi.", options: [
    { value: "PARTIAL", label: "Kısmi sistem" },
    { value: "FULL", label: "Tüm sistem" },
  ] },
  { id: "workStartDate", label: "Çalışma başlangıç tarihi", kind: "date", row: "calisma", hint: "Çalışmanın planlanan başlangıcı." },
  { id: "expectedEndDate", label: "Muhtemel bitiş tarihi", kind: "date", row: "calisma", hint: "Muhtemel bitiş tarihi." },
  { id: "approvalDate", label: "Onay tarihi", kind: "date", row: "onay", hint: "Onayın verildiği tarih." },
  { id: "status", label: "Güncel durum", kind: "select", editOnly: true, options: opt(CHANGE_STATUS_LABELS, CHANGE_STATUSES), row: "onay", hint: "Değişikliğin onay / uygulama durumu." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Yapılacak iş, kesinti ve geri alma notu." },
];

export const PATCH_FIELDS: FieldDef[] = [
  ...REQUESTER_PAIR,
  { id: "title", label: "Yama tanımı", kind: "text", required: true, fullWidth: true, hint: "KB / CVE veya yama paketinin kısa adı." },
  { id: "scope", label: "Yama kapsamı", kind: "textarea", fullWidth: true, hint: "Hangi sunucu, istemci veya uygulama grubuna uygulanacak." },
  { id: "systemType", label: "Sistem tipi", kind: "select", row: "sistem", hint: "İşletim sistemi, uygulama veya firmware.", options: [
    { value: "OS", label: "İşletim sistemi" },
    { value: "APPLICATION", label: "Uygulama" },
    { value: "FIRMWARE", label: "Firmware" },
    { value: "OTHER", label: "Diğer" },
  ] },
  { id: "systemKind", label: "Sistem türü", kind: "select", row: "sistem", hint: "Sunucu, istemci veya ağ cihazı.", options: [
    { value: "SERVER", label: "Sunucu" },
    { value: "CLIENT", label: "İstemci" },
    { value: "NETWORK", label: "Ağ" },
    { value: "OTHER", label: "Diğer" },
  ] },
  { id: "ipRange", label: "IP / subnet mask", kind: "text", row: "etki", hint: "Etkilenen IP veya subnet." },
  { id: "impact", label: "Sistem etkisi", kind: "select", row: "etki", hint: "Kesinti kısmi mi tüm sistem mi.", options: [
    { value: "PARTIAL", label: "Kısmi" },
    { value: "FULL", label: "Tüm sistem" },
  ] },
  { id: "assetOwnerId", label: "Envanter sahibi personel", kind: "person", row: "dagitim", hint: "Varlığın zimmetli personeli." },
  { id: "distribution", label: "Yama dağıtacak sistem", kind: "select", row: "dagitim", hint: "SCCM, özgün sistem veya manuel dağıtım.", options: [
    { value: "SCCM", label: "SCCM" },
    { value: "CUSTOM", label: "Özgün sistem" },
    { value: "MANUAL", label: "Manuel" },
  ] },
  { id: "risks", label: "Muhtemel riskler", kind: "textarea", fullWidth: true, hint: "Yama sonrası beklenen riskler ve geri alma notu." },
  { id: "requestDate", label: "Talep tarihi", kind: "date", row: "talep-tarih", hint: "Yama talebinin resmi tarihi." },
  { id: "approvalDate", label: "Onay tarihi", kind: "date", row: "talep-tarih", hint: "Onayın verildiği tarih." },
  { id: "workStartDate", label: "Çalışma başlangıç tarihi", kind: "date", row: "calisma", hint: "Dağıtımın planlanan başlangıcı." },
  { id: "expectedEndDate", label: "Muhtemel bitiş tarihi", kind: "date", row: "calisma", hint: "Dağıtımın muhtemel bitişi." },
  { id: "status", label: "Güncel durum", kind: "select", editOnly: true, options: opt(CHANGE_STATUS_LABELS, CHANGE_STATUSES), hint: "Onay ve dağıtım durumu." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "KB numarası, reboot ihtiyacı ve ek not." },
];

export const CONFIG_FIELDS: FieldDef[] = [
  { id: "appName", label: "Uygulama adı", kind: "text", required: true, hint: "Konfigürasyonu tutulan uygulamanın adı." },
  { id: "ownerId", label: "Uygulama sahibi", kind: "person", required: true, row: "sahip", hint: "Uygulamanın sahibi personel." },
  { id: "managerId", label: "Sahip amiri", kind: "person", row: "sahip", hint: "Sahibin birim amiri." },
  { id: "departmentId", label: "Sahip birim", kind: "department", row: "sahip-birim", hint: "Uygulamanın bağlı olduğu birim." },
  { id: "version", label: "Uygulama versiyonu", kind: "text", row: "sahip-birim", hint: "Yedeklenen konfigürasyonun sürümü." },
  { id: "backupDate", label: "Konfigürasyon yedekleme tarihi", kind: "date", hint: "Son konfigürasyon yedekleme tarihi." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Yedek yeri, dosya yolu veya özel not." },
];

export const VULN_FIELDS: FieldDef[] = [
  { id: "deviceName", label: "Cihaz adı", kind: "text", required: true, row: "cihaz", hint: "Cihazın envanter veya DNS adı." },
  { id: "deviceIp", label: "Cihaz IP", kind: "text", row: "cihaz", hint: "Cihazın IP adresi. Envanter eşlemesinde kullanılır." },
  { id: "cve", label: "CVE", kind: "text", placeholder: "CVE-2024-12345", hint: "Varsa resmi CVE numarası." },
  { id: "ownerId", label: "Cihaz sahibi", kind: "person", row: "sahip", hint: "Cihazın zimmetli personeli." },
  { id: "managerId", label: "Cihaz amiri", kind: "person", row: "sahip", hint: "Sahibin birim amiri." },
  { id: "departmentId", label: "Cihaz birimi", kind: "department", row: "cihaz-birim", hint: "Cihazın kullanıldığı birim." },
  { id: "closeDays", label: "Kapatılma süresi (gün)", kind: "text", row: "cihaz-birim", hint: "Politika gereği kapatılması beklenen gün sayısı." },
  { id: "detectedAt", label: "Tespit tarihi", kind: "date", row: "tarih", hint: "Zafiyetin tespit edildiği tarih." },
  { id: "dueDate", label: "Kapatılması gereken tarih", kind: "date", row: "tarih", hint: "Kapatılması gereken son tarih." },
  { id: "severity", label: "Zafiyet seviyesi", kind: "select", row: "seviye", options: opt(VULN_SEVERITY_LABELS, VULN_SEVERITIES), hint: "CVSS veya kurum skoru. Kritik kayıtlar panoda öne çıkar." },
  { id: "status", label: "Durum", kind: "select", editOnly: true, row: "seviye", options: opt(VULN_STATUS_LABELS, VULN_STATUSES), hint: "Açık, giderildi veya risk kabul." },
  { id: "notFixedReason", label: "Giderilememe nedeni", kind: "textarea", fullWidth: true, hint: "Neden kapatılamadığı veya risk kabul gerekçesi." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Bulgu özeti, eklenti ve ek teknik not." },
];

export const VENDOR_FIELDS: FieldDef[] = [
  { id: "name", label: "Firma adı", kind: "text", required: true, hint: "Sözleşmeli bakım veya tedarikçi unvanı." },
  { id: "contact1Phone", label: "İrtibat kişi 1 telefon", kind: "text", row: "iletisim-1", hint: "Birinci irtibat telefonu." },
  { id: "contact1Email", label: "İrtibat kişi 1 e-posta", kind: "text", row: "iletisim-1", hint: "Birinci irtibat e-postası." },
  { id: "contact2Phone", label: "İrtibat kişi 2 telefon", kind: "text", row: "iletisim-2", hint: "İkinci irtibat telefonu." },
  { id: "contact2Email", label: "İrtibat kişi 2 e-posta", kind: "text", row: "iletisim-2", hint: "İkinci irtibat e-postası." },
  { id: "contact3Phone", label: "İrtibat kişi 3 telefon", kind: "text", row: "iletisim-3", hint: "Üçüncü irtibat telefonu." },
  { id: "contact3Email", label: "İrtibat kişi 3 e-posta", kind: "text", row: "iletisim-3", hint: "Üçüncü irtibat e-postası." },
  { id: "contractFileUrl", label: "Bakım sözleşme / şartname", kind: "image", hint: "Tarama veya görsel yükleyin.", fullWidth: true },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Kapsam, sözleşme no veya özel not." },
];

export const SLA_FIELDS: FieldDef[] = [
  ...REQUESTER_PAIR,
  { id: "title", label: "Arıza tanımı", kind: "text", required: true, fullWidth: true, hint: "Firmaya iletilecek arızanın kısa tanımı." },
  { id: "application", label: "Arıza uygulama", kind: "text", row: "uygulama", hint: "Arızanın görüldüğü uygulama veya sistem." },
  { id: "ownerId", label: "Uygulama sahibi", kind: "person", row: "uygulama", hint: "Uygulamanın sahibi personel." },
  { id: "departmentId", label: "Uygulama birimi", kind: "department", row: "birim", hint: "Uygulamanın bağlı olduğu birim." },
  { id: "vendorId", label: "Firma", kind: "vendor", row: "birim", hint: "Bakım veya destek firması." },
  { id: "severity", label: "Arıza seviye", kind: "select", row: "seviye", options: opt(VULN_SEVERITY_LABELS, VULN_SEVERITIES), hint: "SLA süresini belirleyen önem." },
  { id: "status", label: "Durum", kind: "select", editOnly: true, row: "seviye", options: opt(TICKET_STATUS_LABELS, TICKET_STATUSES), hint: "Açık, işlemde veya kapalı." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Belirti, zaman ve firmaya iletilecek ayrıntı." },
];

export const INCIDENT_FIELDS: FieldDef[] = [
  ...REQUESTER_PAIR,
  { id: "title", label: "Olay tanımı", kind: "text", required: true, fullWidth: true, hint: "Olayın kısa başlığı. Listelerde bu görünür." },
  { id: "l1AnalystId", label: "Seviye 1 analist", kind: "person", required: true, row: "atama", hint: "Olayı ilk karşılayan analist. Görev bu kişiye atanır." },
  { id: "severity", label: "Önem derecesi", kind: "select", required: true, row: "atama", options: opt(REQUEST_SEVERITY_LABELS, REQUEST_SEVERITIES), hint: "Yüksek ve kritik olaylar Seviye 2 yükseltmesi bekler." },
  { id: "impact", label: "Etki", kind: "select", row: "oncelik", options: opt(LEVEL_LABELS, IMPACT_LEVELS), hint: "Kaç kullanıcı/sistem etkileniyor. Etki × aciliyet, önceliği (P1–P4) ve SLA süresini belirler." },
  { id: "urgency", label: "Aciliyet", kind: "select", row: "oncelik", options: opt(LEVEL_LABELS, IMPACT_LEVELS), hint: "İşin ne kadar çabuk çözülmesi gerekiyor. Boş bırakılırsa öncelik önem derecesinden gelir." },
  { id: "isMajor", label: "Büyük olay (major incident)", kind: "select", row: "buyuk", options: [{ value: "NO", label: "Hayır" }, { value: "YES", label: "Evet — P1, acil müdahale" }], hint: "Birçok hizmeti/kullanıcıyı etkileyen kritik kesintilerde Evet seçin; öncelik P1 olur." },
  { id: "serviceId", label: "Etkilenen hizmet", kind: "catalog", row: "buyuk", hint: "Olaydan etkilenen katalog hizmeti." },
  { id: "relatedChangeNo", label: "İlişkili değişiklik no", kind: "text", fullWidth: true, hint: "Bu olayı gideren veya doğuran değişiklik. Örn. CHG-2026-0001." },
  { id: "startedAt", label: "Başlangıç tarihi", kind: "date", row: "sure", hint: "Olayın başlangıç zamanı." },
  { id: "endedAt", label: "Bitiş tarihi", kind: "date", row: "sure", hint: "Olayın kapanış zamanı. Hâlâ açıksa boş bırakın." },
  { id: "departmentId", label: "İlgili birim", kind: "department", row: "birim", hint: "Olayı yöneten veya etkilenen birim." },
  { id: "status", label: "Durum", kind: "select", editOnly: true, row: "birim", options: opt(INCIDENT_STATUS_LABELS, INCIDENT_STATUSES), hint: "Açık, inceleniyor veya kapatıldı." },
  { id: "ioc", label: "IOC", kind: "textarea", fullWidth: true, hint: "Gösterge / hash / IP / domain." },
  { id: "sandboxReportUrl", label: "Sandbox raporu", kind: "document", fileNameField: "sandboxReportName", fullWidth: true, hint: "Sandbox analiz raporu (PDF veya ekran görüntüsü). Kayıttan sonra Görüntüle ile açılır." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "Zaman çizelgesi, etki ve alınan önlemler." },
];

export const PROBLEM_FIELDS: FieldDef[] = [
  ...REQUESTER_PAIR,
  { id: "title", label: "Problem tanımı", kind: "text", required: true, fullWidth: true, hint: "Tekrarlayan sorunun kısa tanımı." },
  { id: "proposedAssigneeId", label: "Atanacak personel", kind: "person", required: true, row: "atama", hint: "Göreve önerilen kişi. Görev, bilgi güvenliği yöneticisi onaylayınca atanır." },
  { id: "infosecManagerId", label: "Bilgi güvenliği yöneticisi", kind: "person", required: true, row: "atama", hint: "Atamayı onaylayan yönetici. Onaydan sonra görev başlar." },
  { id: "severity", label: "Önem derecesi", kind: "select", row: "onem", options: opt(REQUEST_SEVERITY_LABELS, REQUEST_SEVERITIES), hint: "Problemin etkisi. Puanlama ve raporlarda kullanılır." },
  { id: "serviceId", label: "Etkilenen hizmet", kind: "catalog", row: "onem", hint: "Problemden etkilenen katalog hizmeti." },
  { id: "relatedChangeNo", label: "Kalıcı çözüm değişikliği no", kind: "text", fullWidth: true, hint: "Kalıcı düzeltmeyi uygulayan değişiklik. Örn. CHG-2026-0001." },
  { id: "rootCause", label: "Kök neden", kind: "textarea", fullWidth: true, hint: "Tekrarın asıl nedeni." },
  { id: "workaround", label: "Geçici çözüm", kind: "textarea", fullWidth: true, hint: "Kalıcı düzeltmeye kadar uygulanan önlem." },
  { id: "permanentFix", label: "Kalıcı çözüm", kind: "textarea", fullWidth: true, hint: "Kök nedeni ortadan kaldıran kalıcı düzeltme." },
  { id: "status", label: "Durum", kind: "select", editOnly: true, options: opt(PROBLEM_STATUS_LABELS, PROBLEM_STATUSES), hint: "Çözüldü/kapatıldı için kök neden, bilinen hata için geçici çözüm zorunludur." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true, hint: "İlgili olaylar, etki ve kalıcı çözüm planı." },
];
