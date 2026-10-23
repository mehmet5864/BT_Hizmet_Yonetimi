import type { Locale } from "./config";
import { FORM_COPY, type FormBundle } from "./form-copy";

export type Messages = {
  appName: string;
  appShort: string;
  tagline: string;
  language: string;
  locales: { tr: string; en: string; ar: string; es: string; az: string };
  nav: {
    dashboard: string;
    personnel: string;
    inventory: string;
    custody: string;
    approvals: string;
    requests: string;
    changes: string;
    patches: string;
    config: string;
    vulns: string;
    vendorSla: string;
    incidents: string;
    problems: string;
    agile: string;
    catalog: string;
    itil: string;
    reports: string;
    guides: string;
    api: string;
    settings: string;
    version: string;
    expand: string;
    collapse: string;
    design: string;
    operations: string;
    transition: string;
    assets: string;
    evaluation: string;
    desk: string;
    changeEnablement: string;
  };
  header: {
    welcome: string;
    logout: string;
    search: string;
    searchAria: string;
    back: string;
    menu: string;
    account: string;
    roleManual: string;
    roleAd: string;
    roleBoth: string;
  };
  login: {
    subtitle: string;
    local: string;
    ad: string;
    signIn: string;
    register: string;
    username: string;
    usernameHint: string;
    password: string;
    passwordHint: string;
    submit: string;
    fullName: string;
    fullNameHint: string;
    email: string;
    emailHint: string;
    usernameNew: string;
    usernameNewHint: string;
    passwordNew: string;
    passwordNewHint: string;
    confirm: string;
    confirmHint: string;
    registerSubmit: string;
    adUser: string;
    adUserHint: string;
    adPassword: string;
    adPasswordHint: string;
    adSubmit: string;
    adRegName: string;
    adRegUser: string;
    adRegUserHint: string;
    adRegPass: string;
    adRegPassHint: string;
    adRegSubmit: string;
    userGuide: string;
    adminGuide: string;
    downloadPackage: string;
  };
  dashboard: {
    title: string;
    descAll: string;
    descScoped: string;
    newAsset: string;
    newRequest: string;
    totalRecords: string;
    typeCount: string;
    highCriticality: string;
    highHint: string;
    expiring: string;
    expiringHint: string;
    missingSupport: string;
    missingHint: string;
    people: string;
    peopleHint: string;
    openRequests: string;
    openRequestsMine: string;
    openRequestsAll: string;
    openChanges: string;
    openChangesHint: string;
    openVulns: string;
    openVulnsHint: string;
    openIncidents: string;
    openIncidentsHint: string;
    itilTitle: string;
    allPractices: string;
    activeCatalog: string;
    activeCatalogHint: string;
    assetTypes: string;
    viewAll: string;
    calendar: string;
    calendarHint: string;
    noContracts: string;
    noContractsHint: string;
    criticality: string;
    lifecycle: string;
    activity: string;
    activityHint: string;
    noActivity: string;
    noActivityHint: string;
    addAsset: string;
    openTicket: string;
    deletedRecord: string;
    record: string;
  };
  inbox: {
    title: string;
    close: string;
    closePanel: string;
    approvals: string;
    assigned: string;
    waiting: string;
    summaryAlert: string;
    summaryWaiting: string;
    summaryEmpty: string;
    empty: string;
    approve: string;
    reject: string;
    aria: string;
    ariaAlert: string;
  };
  common: {
    save: string;
    cancel: string;
    create: string;
    edit: string;
    delete: string;
    add: string;
    newRecord: string;
    empty: string;
    loading: string;
    all: string;
    status: string;
    seeAll: string;
  };
  forbidden: {
    title: string;
    body: string;
    back: string;
  };
  catalog: {
    title: string;
    description: string;
    add: string;
    count: string;
    active: string;
    userFacing: string;
    search: string;
    searchAria: string;
    allStatuses: string;
    emptyTitle: string;
    emptyBody: string;
    noSla: string;
    colNo: string;
    colService: string;
    colOwner: string;
    colHours: string;
    colAudience: string;
    colStatus: string;
  };
  process: {
    add: string;
    search: string;
    listed: string;
    emptyTitle: string;
    emptyBody: string;
    colNo: string;
    colTitle: string;
    colService: string;
    colRequester: string;
    colDept: string;
    colStatus: string;
  };
  hizmetler: {
    title: string;
    description: string;
  };
  guidesPage: {
    title: string;
    description: string;
    downloadPdf: string;
    readOnline: string;
    openInterface: string;
    files: string;
    userTitle: string;
    userDesc: string;
    adminTitle: string;
    adminDesc: string;
    apiTitle: string;
    apiDesc: string;
    itilTitle: string;
    itilDesc: string;
    itilReadTitle: string;
    itilReadDesc: string;
    toc: string;
    langNote: string;
    backToGuides: string;
  };
  roles: {
    USER: string;
    SYSTEM_ADMIN: string;
    UNIT_MANAGER: string;
    SENIOR_MANAGER: string;
    INFOSEC_MANAGER: string;
    SUPER_ADMIN: string;
  };
  assets: Record<string, { label: string; description: string }>;
  itil: Record<string, { label: string; description: string }>;
  criticality: { HIGH: string; MEDIUM: string; LOW: string };
  lifecycle: { ACTIVE: string; IN_STOCK: string; MAINTENANCE: string; RETIRED: string };
} & FormBundle;

function practice(
  items: Record<string, { label: string; description: string }>,
): Record<string, { label: string; description: string }> {
  return items;
}

export const TR: Messages = {
  appName: "BT Hizmet Yönetimi",
  appShort: "BT HY",
  tagline: "Hizmet Yönetimi",
  language: "Dil",
  locales: { tr: "Türkçe", en: "English", ar: "العربية", es: "Español", az: "Azərbaycan" },
  nav: {
    dashboard: "Genel bakış",
    personnel: "Personel yönetimi",
    inventory: "Envanter yönetimi",
    custody: "Zimmet formu",
    approvals: "Ekleme / silme onayları",
    requests: "Talep yönetimi",
    changes: "Değişiklik yönetimi",
    patches: "Yama yönetimi",
    config: "Konfigürasyon yönetimi",
    vulns: "Zafiyet yönetimi",
    vendorSla: "Firma / SLA (tedarikçi)",
    incidents: "Olay yönetimi",
    problems: "Problem yönetimi",
    agile: "Çevik çalışma",
    catalog: "Hizmet kataloğu",
    itil: "ITIL süreçleri",
    reports: "Raporlar",
    guides: "Kılavuzlar",
    api: "API arayüzü",
    settings: "Ayarlar",
    version: "Sürüm {version}",
    expand: "Menüyü aç",
    collapse: "Menüyü daralt",
    design: "Tasarım",
    operations: "Operasyon",
    transition: "Geçiş",
    assets: "Varlık",
    evaluation: "Değerlendirme",
    desk: "Hizmet masası",
    changeEnablement: "Değişiklik kontrolü",
  },
  header: {
    welcome: "Tekrar hoş geldiniz, {name}",
    logout: "Çıkış",
    search: "Kayıt ara…",
    searchAria: "Envanter ara",
    back: "Geri",
    menu: "Menüyü aç",
    account: "Hesap menüsü",
    roleManual: "Manuel hesap",
    roleAd: "Active Directory",
    roleBoth: "AD + manuel",
  },
  login: {
    subtitle: "Lokal veya Active Directory ile giriş / kayıt · sürüm {version}",
    local: "Lokal",
    ad: "Active Directory",
    signIn: "Giriş",
    register: "Kayıt",
    username: "Kullanıcı",
    usernameHint: "Personel kartındaki AD kullanıcı adı veya yerel kullanıcı adı.",
    password: "Parola",
    passwordHint: "Personel kartındaki yerel parola.",
    submit: "Giriş yap",
    fullName: "Ad soyad",
    fullNameHint: "Personel kartında görünecek resmi ad soyad.",
    email: "E-posta",
    emailHint: "Bildirimler ve onay iletileri bu adrese gider.",
    usernameNew: "Kullanıcı adı",
    usernameNewHint: "Lokal girişte kullanacağınız benzersiz ad.",
    passwordNew: "Parola",
    passwordNewHint: "En az 8 karakter. Kurum parolası önerilir.",
    confirm: "Parola tekrar",
    confirmHint: "Aynı parolayı doğrulamak için tekrar yazın.",
    registerSubmit: "Kayıt ol",
    adUser: "AD kullanıcı adı",
    adUserHint: "Active Directory sAMAccountName. Ayarlar’daki LDAP sunucusuna bağlanır.",
    adPassword: "Parola",
    adPasswordHint: "Etki alanı parolası. Uygulamada saklanmaz.",
    adSubmit: "AD ile giriş",
    adRegName: "Ad soyad",
    adRegUser: "AD kullanıcı adı",
    adRegUserHint: "Dizinde doğrulanacak sAMAccountName. Rol AD grup eşlemesinden gelir.",
    adRegPass: "Parola",
    adRegPassHint: "Etki alanı parolası. Kayıt sırasında bir kez doğrulanır.",
    adRegSubmit: "AD ile kayıt",
    userGuide: "Kullanıcı kılavuzu",
    adminGuide: "Yönetici kılavuzu",
    downloadPackage: "{version} paketini indir",
  },
  dashboard: {
    title: "Genel bakış",
    descAll: "Kurum BT envanterinin anlık durumu, bakım/lisans takvimi ve son hareketler.",
    descScoped: "Size zimmetli ve biriminizdeki envanter ile kendi açtığınız talepler.",
    newAsset: "Yeni envanter",
    newRequest: "Yeni talep",
    totalRecords: "Toplam kayıt",
    typeCount: "{count} farklı türde",
    highCriticality: "Yüksek kritiklik",
    highHint: "Öncelikli izlenmesi gereken varlıklar",
    expiring: "Bakım / lisans süresi yaklaşan",
    expiringHint: "Önümüzdeki 60 gün içinde",
    missingSupport: "Destek bilgisi eksik",
    missingHint: "Bakım bitiş tarihi girilmemiş cihazlar",
    people: "Personel",
    peopleHint: "Kayıtlı personel",
    openRequests: "Açık talepler",
    openRequestsMine: "Sizin açık talepleriniz",
    openRequestsAll: "İşlem bekleyen servis talepleri",
    openChanges: "Aktif değişiklik",
    openChangesHint: "Onay / uygulama sürecinde",
    openVulns: "Açık zafiyet",
    openVulnsHint: "Kapatılmamış zafiyetler",
    openIncidents: "Açık olay",
    openIncidentsHint: "Devam eden olaylar",
    itilTitle: "ITIL hizmet yönetimi",
    allPractices: "Tüm süreçler",
    activeCatalog: "Aktif katalog hizmeti",
    activeCatalogHint: "Kullanıcılara açık kayıtlı hizmet",
    assetTypes: "Envanter türleri",
    viewAll: "Tümünü gör",
    calendar: "Bakım / lisans takvimi",
    calendarHint: "Süresi dolan veya 60 gün içinde dolacak sözleşmeler.",
    noContracts: "Takipte bekleyen sözleşme yok",
    noContractsHint: "Bakım veya lisans bitiş tarihi yaklaşan bir kayıt bulunmuyor. Tarihleri girdikçe bu liste otomatik dolacaktır.",
    criticality: "Kritiklik dağılımı",
    lifecycle: "Yaşam döngüsü",
    activity: "Son hareketler",
    activityHint: "Her envanter değişikliği denetim izine yazılır; değişiklik yönetimi süreci bu kayıtlar üzerine kurulur.",
    noActivity: "Henüz hareket yok",
    noActivityHint: "İlk envanter kaydını oluşturduğunuzda burada değişiklik geçmişini görebileceksiniz.",
    addAsset: "Envanter ekle",
    openTicket: "Talep aç",
    deletedRecord: "Silinmiş kayıt",
    record: "Kayıt",
  },
  inbox: {
    title: "Hızlı işlemler",
    close: "Kapat",
    closePanel: "Hızlı işlemler panelini kapat",
    approvals: "Onaylar",
    assigned: "Atanan görevler",
    waiting: "Bekleyen işler",
    summaryAlert: "{approval} onay, {assigned} atanan görev.",
    summaryWaiting: "{count} bekleyen iş.",
    summaryEmpty: "Bekleyen onay veya göreviniz yok.",
    empty: "Size atanmış görev, onay veya bekleyen iş bulunmuyor.",
    approve: "Onay ver",
    reject: "Reddet",
    aria: "Hızlı işlemler",
    ariaAlert: "Hızlı işlemler, {count} bekleyen",
  },
  common: {
    save: "Kaydet",
    cancel: "Vazgeç",
    create: "Oluştur",
    edit: "Düzenle",
    delete: "Sil",
    add: "Ekle",
    newRecord: "Kayıt ekle",
    empty: "Kayıt yok",
    loading: "Yükleniyor…",
    all: "Tümü",
    status: "Durum",
    seeAll: "Tümünü gör",
  },
  forbidden: {
    title: "Bu sayfa yetkinizin dışında",
    body: "Rolünüz bu modülü açmıyor. Sistem yöneticisi personel kaydından manuel rol verebilir veya AD grup eşlemesini güncelleyebilir.",
    back: "Genel bakışa dön",
  },
  catalog: {
    title: "Hizmet kataloğu",
    description: "Kullanıcılara açık BT hizmetlerinin listesi, ayrıntısı ve erişim şartları. Talep, buradaki hizmete göre Hizmet masasından açılır.",
    add: "Hizmet ekle",
    count: "Katalogdaki hizmet",
    active: "Aktif",
    userFacing: "Kullanıcıya açık",
    search: "Hizmet adı, no veya sahip ara…",
    searchAria: "Katalog ara",
    allStatuses: "Tüm durumlar",
    emptyTitle: "Katalog boş",
    emptyBody: "Kullanıcıların göreceği ilk hizmeti ekleyin.",
    noSla: "SLA yok",
    colNo: "No",
    colService: "Hizmet",
    colOwner: "Sahip / birim",
    colHours: "Saat / SLA",
    colAudience: "Kimler",
    colStatus: "Durum",
  },
  process: {
    add: "Kayıt ekle",
    search: "No, tanım veya hizmet ara…",
    listed: "{count} kayıt listeleniyor",
    emptyTitle: "Kayıt yok",
    emptyBody: "İlk kaydı ekleyin.",
    colNo: "No",
    colTitle: "Tanım",
    colService: "Hizmet",
    colRequester: "Kaydeden",
    colDept: "Birim",
    colStatus: "Durum",
  },
  hizmetler: {
    title: "ITIL hizmet yönetimi",
    description: "1.3.0’daki envanter, talep, olay, problem, değişiklik ve CMDB duruyor. 2.0.0 eksik süreçleri katalog ve süreç kayıtlarıyla tamamlar. Ayarlar → Görünüm’den 1.3.0 menüsüne dönülebilir; kayıtlar silinmez.",
  },
  guidesPage: {
    title: "Kılavuzlar",
    description: "Kullanıcı, yönetici, API ve ITIL 4 kılavuzları. ITIL belgesi uygulamada okunur; tümü PDF indirilir.",
    downloadPdf: "PDF indir",
    readOnline: "Uygulamada oku",
    openInterface: "Arayüzü aç",
    files: "Dosyalar: /docs/itil-v4-kilavuzu.pdf, /docs/kullanici-kilavuzu.pdf, /docs/yonetici-kilavuzu.pdf, /docs/api-kilavuzu.pdf",
    userTitle: "Kullanıcı kılavuzu",
    userDesc: "Giriş, L1/L2 talep açma, Taleplerim, birim envanteri, ekleme/silme onayı, raporlar ve API denemesi.",
    adminTitle: "Yönetici kılavuzu",
    adminDesc: "Roller, servis masası / Katman 2, grup yetkileri, envanter onayı, SIEM / AD / API anahtarları.",
    apiTitle: "API kılavuzu",
    apiDesc: "REST v1 uçları, Bearer / X-Api-Key, kapsamlar, talep örneği ve OpenAPI. Canlı deneme: API arayüzü menüsü.",
    itilTitle: "ITIL 4 kılavuzu",
    itilDesc: "Hizmet değeri, dört boyut, değer zinciri, 17 pratik ve bu uygulamadaki ekran eşlemesi. Ayrıntılı işletme notu.",
    itilReadTitle: "ITIL 4 kılavuzu",
    itilReadDesc: "Hizmet değer sistemi, yönlendirici ilkeler ve menüdeki 17 pratik. Sürüm 1.0 · 1 Ekim 2026.",
    toc: "İçindekiler",
    langNote: "Bu kılavuzun gövdesi Türkçedir. Menü ve form etiketleri seçilen dile uyar.",
    backToGuides: "Kılavuzlara dön",
  },
  roles: {
    USER: "Kullanıcı",
    SYSTEM_ADMIN: "Sistem yöneticisi",
    UNIT_MANAGER: "Birim amiri",
    SENIOR_MANAGER: "Üst amir",
    INFOSEC_MANAGER: "Bilgi güvenliği yöneticisi",
    SUPER_ADMIN: "Süper yönetici",
  },
  assets: {
    COMPUTER: { label: "Bilgisayar", description: "Masaüstü ve dizüstü istemciler, sanal masaüstleri." },
    SERVER: { label: "Sunucu", description: "Fiziksel ve sanal sunucular, hizmet verdikleri uygulamalar." },
    PRINTER: { label: "Yazıcı", description: "Yazıcılar, tarayıcılar ve çok fonksiyonlu cihazlar." },
    TABLET: { label: "Tablet", description: "Tablet ve mobil uç cihazlar." },
    MOBILE_PHONE: { label: "Mobil telefon", description: "Kurumsal cep telefonları ve akıllı telefonlar." },
    SOFTWARE: { label: "Yazılım / Lisans", description: "Uygulama yazılımları ve lisans kayıtları." },
    APPLICATION: { label: "Uygulama", description: "Kurumun iş uygulamaları: çalıştığı sunucular ve servis verdiği hizmetler." },
    IP_PHONE: { label: "IP telefon", description: "IP telefon setleri ve konferans cihazları." },
    NETWORK_DEVICE: { label: "Router / Switch", description: "Yönlendirici, anahtar ve diğer ağ cihazları." },
    PERIPHERAL: { label: "Çevre birimi", description: "Monitör, klavye, barkod okuyucu gibi çevre birimleri." },
    FIXTURE: { label: "Demirbaş", description: "Zimmetli demirbaş kayıtları." },
  },
  itil: practice({
    catalog: { label: "Hizmet kataloğu yönetimi", description: "Kullanıcılara açık BT hizmetleri, ayrıntı ve erişim şartları." },
    design: { label: "Hizmet tasarımı", description: "Yeni veya değişen hizmetin iş, güvenlik ve beklentiye göre tasarımı." },
    sla: { label: "Hizmet seviyesi yönetimi", description: "İç SLA hedefleri ve ölçüm. Firma arızası ayrı modüldedir." },
    availability: { label: "Kullanılabilirlik yönetimi", description: "Taahhüt edilen sürelerde kesintisiz çalışma." },
    capacity: { label: "Kapasite ve performans", description: "CPU, RAM, depolama ve yük planı." },
    continuity: { label: "Hizmet sürekliliği", description: "Afet ve kriz için felaket kurtarma planı." },
    validation: { label: "Hizmet doğrulama ve test", description: "Canlıya alınmadan hatasız çalışma sınaması." },
    itam: { label: "Varlık yönetimi", description: "Donanım, lisans ve bulut varlığının ömür döngüsü." },
    cmdb: { label: "Konfigürasyon yönetimi", description: "CI ilişkileri ve bağımlılıklar (CMDB)." },
    desk: { label: "Hizmet masası", description: "Tek temas noktası; talep ve şikayetlerin ilk karşılama yeri." },
    incident: { label: "Olay yönetimi", description: "Kesinti ve yavaşlamayı en kısa sürede giderme." },
    problem: { label: "Sorun / problem yönetimi", description: "Kök neden ve kalıcı çözüm." },
    request: { label: "Hizmet talebi yönetimi", description: "Şifre, yetki, yeni bilgisayar gibi rutin istekler." },
    change: { label: "Değişiklik kontrolü", description: "Canlı güncellemenin risk analizi ve planlı onayı." },
    release: { label: "Sürüm ve dağıtım", description: "Onaylı değişiklik ve yamaların paketlenmesi." },
    monitoring: { label: "İş takibi ve izleme", description: "7/24 izleme, log ve erken uyarı." },
    evaluation: { label: "Hizmet doğrulama ve değerlendirme", description: "Hizmetin iş değerini tarafsız ölçme." },
    DESIGN: { label: "Hizmet tasarımı", description: "Yeni veya değişen hizmetin iş hedefi, güvenlik standardı ve müşteri beklentisine göre tasarımı." },
    SLA: { label: "Hizmet seviyesi yönetimi", description: "SLA hedeflerini belirler, ölçer ve sapmaları raporlar." },
    AVAILABILITY: { label: "Kullanılabilirlik yönetimi", description: "Hizmetin ihtiyaç duyulan anda, taahhüt edilen sürelerde çalışmasını güvenceye alır." },
    CAPACITY: { label: "Kapasite ve performans", description: "CPU, RAM, depolama ve trafik yükünün bugünü ve geleceği için kaynak planı." },
    CONTINUITY: { label: "Hizmet sürekliliği", description: "Afet ve kriz anında hizmetin ayağa kaldırılması planı." },
    VALIDATION: { label: "Hizmet doğrulama ve test", description: "Canlıya alınmadan tasarım gereksinimlerini karşıladığını test eder." },
    RELEASE: { label: "Sürüm ve dağıtım", description: "Onaylı değişiklik, kod ve yamaların canlıya aktarılmaya hazırlanması." },
    MONITORING: { label: "İş takibi ve izleme", description: "Altyapıyı 7/24 izler; kesinti olmadan anormal log ve olayları ekibe iletir." },
    EVALUATION: { label: "Hizmet doğrulama ve değerlendirme", description: "Yeni hizmetin hedeflenen iş değerini yaratıp yaratmadığını değerlendirir." },
  }),
  criticality: { HIGH: "Yüksek", MEDIUM: "Orta", LOW: "Düşük" },
  lifecycle: { ACTIVE: "Kullanımda", IN_STOCK: "Depoda", MAINTENANCE: "Bakımda", RETIRED: "Hurda / Kullanım dışı" },
  ...FORM_COPY.tr,
};

export const EN: Messages = {
  appName: "IT Service Management",
  appShort: "ITSM",
  tagline: "Service Management",
  language: "Language",
  locales: { tr: "Türkçe", en: "English", ar: "العربية", es: "Español", az: "Azərbaycan" },
  nav: {
    dashboard: "Overview",
    personnel: "Personnel",
    inventory: "IT assets",
    custody: "Custody form",
    approvals: "Add / delete approvals",
    requests: "Service requests",
    changes: "Change management",
    patches: "Patch management",
    config: "Configuration management",
    vulns: "Vulnerability management",
    vendorSla: "Vendor / SLA",
    incidents: "Incident management",
    problems: "Problem management",
    agile: "Agile",
    catalog: "Service catalogue",
    itil: "ITIL practices",
    reports: "Reports",
    guides: "Guides",
    api: "API console",
    settings: "Settings",
    version: "Version {version}",
    expand: "Expand menu",
    collapse: "Collapse menu",
    design: "Design",
    operations: "Operations",
    transition: "Transition",
    assets: "Assets",
    evaluation: "Evaluation",
    desk: "Service desk",
    changeEnablement: "Change enablement",
  },
  header: {
    welcome: "Welcome back, {name}",
    logout: "Sign out",
    search: "Search records…",
    searchAria: "Search inventory",
    back: "Back",
    menu: "Open menu",
    account: "Account menu",
    roleManual: "Local account",
    roleAd: "Active Directory",
    roleBoth: "AD + local",
  },
  login: {
    subtitle: "Sign in or register with a local account or Active Directory · version {version}",
    local: "Local",
    ad: "Active Directory",
    signIn: "Sign in",
    register: "Register",
    username: "Username",
    usernameHint: "AD username or local username from the personnel record.",
    password: "Password",
    passwordHint: "Local password on the personnel record.",
    submit: "Sign in",
    fullName: "Full name",
    fullNameHint: "Official name shown on the personnel card.",
    email: "Email",
    emailHint: "Notifications and approvals are sent here.",
    usernameNew: "Username",
    usernameNewHint: "Unique name for local sign-in.",
    passwordNew: "Password",
    passwordNewHint: "At least 8 characters. Use a work password.",
    confirm: "Confirm password",
    confirmHint: "Type the same password again.",
    registerSubmit: "Create account",
    adUser: "AD username",
    adUserHint: "Active Directory sAMAccountName. Binds to the LDAP host in Settings.",
    adPassword: "Password",
    adPasswordHint: "Domain password. It is not stored.",
    adSubmit: "Sign in with AD",
    adRegName: "Full name",
    adRegUser: "AD username",
    adRegUserHint: "sAMAccountName to verify in the directory. Role comes from AD group mapping.",
    adRegPass: "Password",
    adRegPassHint: "Domain password. Verified once during registration.",
    adRegSubmit: "Register with AD",
    userGuide: "User guide",
    adminGuide: "Admin guide",
    downloadPackage: "Download {version} package",
  },
  dashboard: {
    title: "Overview",
    descAll: "Live inventory status, maintenance and licence calendar, and recent activity.",
    descScoped: "Assets in your custody or unit, and the requests you opened.",
    newAsset: "New asset",
    newRequest: "New request",
    totalRecords: "Total records",
    typeCount: "{count} asset types",
    highCriticality: "High criticality",
    highHint: "Assets that need closer watch",
    expiring: "Support / licence ending soon",
    expiringHint: "Within the next 60 days",
    missingSupport: "Missing support data",
    missingHint: "Devices without a support end date",
    people: "Personnel",
    peopleHint: "Registered people",
    openRequests: "Open requests",
    openRequestsMine: "Your open requests",
    openRequestsAll: "Service requests waiting to be handled",
    openChanges: "Active changes",
    openChangesHint: "In approval or implementation",
    openVulns: "Open vulnerabilities",
    openVulnsHint: "Not yet closed",
    openIncidents: "Open incidents",
    openIncidentsHint: "Incidents still in progress",
    itilTitle: "ITIL service management",
    allPractices: "All practices",
    activeCatalog: "Active catalogue services",
    activeCatalogHint: "Services published to users",
    assetTypes: "Asset types",
    viewAll: "View all",
    calendar: "Maintenance / licence calendar",
    calendarHint: "Contracts that have expired or will expire within 60 days.",
    noContracts: "No contracts due",
    noContractsHint: "Nothing is approaching a support or licence end date. Dates appear here as you enter them.",
    criticality: "Criticality mix",
    lifecycle: "Lifecycle",
    activity: "Recent activity",
    activityHint: "Every inventory change is written to the audit trail.",
    noActivity: "No activity yet",
    noActivityHint: "Activity appears here after the first inventory record.",
    addAsset: "Add asset",
    openTicket: "Open a request",
    deletedRecord: "Deleted record",
    record: "Record",
  },
  inbox: {
    title: "Quick actions",
    close: "Close",
    closePanel: "Close quick actions",
    approvals: "Approvals",
    assigned: "Assigned work",
    waiting: "Waiting",
    summaryAlert: "{approval} approvals, {assigned} assigned.",
    summaryWaiting: "{count} waiting items.",
    summaryEmpty: "No pending approvals or tasks.",
    empty: "You have no assigned work, approvals or waiting items.",
    approve: "Approve",
    reject: "Reject",
    aria: "Quick actions",
    ariaAlert: "Quick actions, {count} pending",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    newRecord: "Add record",
    empty: "No records",
    loading: "Loading…",
    all: "All",
    status: "Status",
    seeAll: "View all",
  },
  forbidden: {
    title: "You cannot open this page",
    body: "Your role does not include this module. An administrator can assign a manual role or update AD group mapping.",
    back: "Back to overview",
  },
  catalog: {
    title: "Service catalogue",
    description: "Live list of IT services offered to users, with details and access conditions. Requests are opened from the service desk against these services.",
    add: "Add service",
    count: "Catalogue services",
    active: "Active",
    userFacing: "User-facing",
    search: "Search name, number or owner…",
    searchAria: "Search catalogue",
    allStatuses: "All statuses",
    emptyTitle: "Catalogue is empty",
    emptyBody: "Add the first service users will see.",
    noSla: "No SLA",
    colNo: "No.",
    colService: "Service",
    colOwner: "Owner / unit",
    colHours: "Hours / SLA",
    colAudience: "Audience",
    colStatus: "Status",
  },
  process: {
    add: "Add record",
    search: "Search number, title or service…",
    listed: "{count} records listed",
    emptyTitle: "No records",
    emptyBody: "Add the first record.",
    colNo: "No.",
    colTitle: "Title",
    colService: "Service",
    colRequester: "Logged by",
    colDept: "Unit",
    colStatus: "Status",
  },
  hizmetler: {
    title: "ITIL service management",
    description: "Inventory, requests, incidents, problems, change and CMDB from 1.3.0 remain. 2.0.0 adds the missing practices. Settings → Appearance can restore the 1.3.0 menu; records are not deleted.",
  },
  guidesPage: {
    title: "Guides",
    description: "User, admin, API and ITIL 4 guides. The ITIL document can be read in the app; all are available as PDF.",
    downloadPdf: "Download PDF",
    readOnline: "Read in the app",
    openInterface: "Open interface",
    files: "Files: /docs/itil-v4-kilavuzu.pdf, /docs/kullanici-kilavuzu.pdf, /docs/yonetici-kilavuzu.pdf, /docs/api-kilavuzu.pdf",
    userTitle: "User guide",
    userDesc: "Sign-in, L1/L2 requests, My requests, unit inventory, add/delete approval, reports and API trial.",
    adminTitle: "Admin guide",
    adminDesc: "Roles, service desk / Layer 2, group permissions, inventory approval, SIEM / AD / API keys.",
    apiTitle: "API guide",
    apiDesc: "REST v1 endpoints, Bearer / X-Api-Key, scopes, request example and OpenAPI. Live trial: API interface menu.",
    itilTitle: "ITIL 4 guide",
    itilDesc: "Service value, four dimensions, value chain, 17 practices and how they map to this app. Detailed operating note.",
    itilReadTitle: "ITIL 4 guide",
    itilReadDesc: "Service value system, guiding principles and the 17 practices in the menu. Version 1.0 · 1 October 2026.",
    toc: "Contents",
    langNote: "The body of this guide is in Turkish. Menu and form labels follow the selected language.",
    backToGuides: "Back to guides",
  },
  roles: {
    USER: "User",
    SYSTEM_ADMIN: "System administrator",
    UNIT_MANAGER: "Unit manager",
    SENIOR_MANAGER: "Senior manager",
    INFOSEC_MANAGER: "Information security manager",
    SUPER_ADMIN: "Super administrator",
  },
  assets: {
    COMPUTER: { label: "Computer", description: "Desktops, laptops and VDI clients." },
    SERVER: { label: "Server", description: "Physical and virtual servers and the applications they host." },
    PRINTER: { label: "Printer", description: "Printers, scanners and MFDs." },
    TABLET: { label: "Tablet", description: "Tablets and handheld endpoints." },
    MOBILE_PHONE: { label: "Mobile phone", description: "Corporate mobile phones and smartphones." },
    SOFTWARE: { label: "Software / licence", description: "Application software and licence records." },
    APPLICATION: { label: "Application", description: "Business applications: hosting servers and the services they provide." },
    IP_PHONE: { label: "IP phone", description: "IP handsets and conference devices." },
    NETWORK_DEVICE: { label: "Router / switch", description: "Routers, switches and other network gear." },
    PERIPHERAL: { label: "Peripheral", description: "Monitors, keyboards, barcode scanners and similar." },
    FIXTURE: { label: "Fixture", description: "Custodied fixtures and furniture." },
  },
  itil: practice({
    catalog: { label: "Service catalogue management", description: "Live catalogue of IT services, details and access conditions." },
    design: { label: "Service design", description: "Design new or changed services against business, security and user needs." },
    sla: { label: "Service level management", description: "Set and measure internal SLA targets. Vendor faults sit in a separate module." },
    availability: { label: "Availability management", description: "Keep services running for the committed hours." },
    capacity: { label: "Capacity and performance", description: "Plan CPU, RAM, storage and load." },
    continuity: { label: "Service continuity", description: "Disaster recovery for crises and outages." },
    validation: { label: "Service validation and testing", description: "Prove a service meets design before go-live." },
    itam: { label: "IT asset management", description: "Hardware, licences and cloud lifecycle." },
    cmdb: { label: "Service configuration management", description: "CI relationships and dependencies (CMDB)." },
    desk: { label: "Service desk", description: "Single point of contact for requests and complaints." },
    incident: { label: "Incident management", description: "Restore service after outages or slowdowns." },
    problem: { label: "Problem management", description: "Root cause and lasting fixes." },
    request: { label: "Service request management", description: "Routine items such as password reset or new PC." },
    change: { label: "Change enablement", description: "Risk analysis and planned approval of live updates." },
    release: { label: "Release management", description: "Package approved changes and patches for production." },
    monitoring: { label: "Monitoring and event management", description: "24/7 monitoring, logs and early warning." },
    evaluation: { label: "Service evaluation", description: "Independent check of delivered business value." },
    DESIGN: { label: "Service design", description: "Design against business goals, security standards and customer expectations." },
    SLA: { label: "Service level management", description: "Define, measure and report SLA targets." },
    AVAILABILITY: { label: "Availability management", description: "Guarantee the service runs when it is needed." },
    CAPACITY: { label: "Capacity and performance", description: "Resource plan for current and future load." },
    CONTINUITY: { label: "Service continuity", description: "How the service is recovered after a disaster." },
    VALIDATION: { label: "Service validation and testing", description: "Test that design requirements are met before go-live." },
    RELEASE: { label: "Release management", description: "Stage approved changes, code and patches for production." },
    MONITORING: { label: "Monitoring and event management", description: "Watch the estate 24/7 and alert before an outage." },
    EVALUATION: { label: "Service evaluation", description: "Judge whether the service created the intended value." },
  }),
  criticality: { HIGH: "High", MEDIUM: "Medium", LOW: "Low" },
  lifecycle: { ACTIVE: "In use", IN_STOCK: "In store", MAINTENANCE: "Maintenance", RETIRED: "Retired" },
  ...FORM_COPY.en,
};

export const AR: Messages = {
  appName: "إدارة خدمات تقنية المعلومات",
  appShort: "ITSM",
  tagline: "إدارة الخدمات",
  language: "اللغة",
  locales: { tr: "Türkçe", en: "English", ar: "العربية", es: "Español", az: "Azərbaycan" },
  nav: {
    dashboard: "نظرة عامة",
    personnel: "إدارة الموظفين",
    inventory: "إدارة الأصول",
    custody: "نموذج العهدة",
    approvals: "موافقات الإضافة / الحذف",
    requests: "إدارة الطلبات",
    changes: "إدارة التغيير",
    patches: "إدارة التحديثات",
    config: "إدارة التهيئة",
    vulns: "إدارة الثغرات",
    vendorSla: "المورد / اتفاقية الخدمة",
    incidents: "إدارة الحوادث",
    problems: "إدارة المشكلات",
    agile: "العمل الرشيق (Agile)",
    catalog: "كتالوج الخدمات",
    itil: "ممارسات ITIL",
    reports: "التقارير",
    guides: "الأدلة",
    api: "واجهة API",
    settings: "الإعدادات",
    version: "الإصدار {version}",
    expand: "فتح القائمة",
    collapse: "طي القائمة",
    design: "التصميم",
    operations: "التشغيل",
    transition: "الانتقال",
    assets: "الأصول",
    evaluation: "التقييم",
    desk: "مكتب الخدمة",
    changeEnablement: "تمكين التغيير",
  },
  header: {
    welcome: "مرحبًا بعودتك، {name}",
    logout: "تسجيل الخروج",
    search: "بحث في السجلات…",
    searchAria: "بحث في الأصول",
    back: "رجوع",
    menu: "فتح القائمة",
    account: "قائمة الحساب",
    roleManual: "حساب محلي",
    roleAd: "Active Directory",
    roleBoth: "الدليل + محلي",
  },
  login: {
    subtitle: "دخول أو تسجيل بحساب محلي أو Active Directory · الإصدار {version}",
    local: "محلي",
    ad: "Active Directory",
    signIn: "دخول",
    register: "تسجيل",
    username: "اسم المستخدم",
    usernameHint: "اسم مستخدم الدليل أو الحساب المحلي في بطاقة الموظف.",
    password: "كلمة المرور",
    passwordHint: "كلمة المرور المحلية في بطاقة الموظف.",
    submit: "تسجيل الدخول",
    fullName: "الاسم الكامل",
    fullNameHint: "الاسم الرسمي في بطاقة الموظف.",
    email: "البريد الإلكتروني",
    emailHint: "تُرسل الإشعارات والموافقات إلى هذا العنوان.",
    usernameNew: "اسم المستخدم",
    usernameNewHint: "اسم فريد للدخول المحلي.",
    passwordNew: "كلمة المرور",
    passwordNewHint: "ثمانية أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور",
    confirmHint: "أعد كتابة الكلمة نفسها.",
    registerSubmit: "إنشاء حساب",
    adUser: "مستخدم الدليل",
    adUserHint: "sAMAccountName في Active Directory.",
    adPassword: "كلمة المرور",
    adPasswordHint: "كلمة مرور النطاق. لا تُحفظ.",
    adSubmit: "دخول بالدليل",
    adRegName: "الاسم الكامل",
    adRegUser: "مستخدم الدليل",
    adRegUserHint: "يُتحقق منه في الدليل. الدور من مجموعات AD.",
    adRegPass: "كلمة المرور",
    adRegPassHint: "كلمة مرور النطاق. تُتحقق مرة عند التسجيل.",
    adRegSubmit: "تسجيل بالدليل",
    userGuide: "دليل المستخدم",
    adminGuide: "دليل المسؤول",
    downloadPackage: "تنزيل حزمة {version}",
  },
  dashboard: {
    title: "نظرة عامة",
    descAll: "حالة الأصول، تقويم الصيانة والتراخيص، وآخر الحركات.",
    descScoped: "الأصول في عهدتك أو وحدتك والطلبات التي فتحتها.",
    newAsset: "أصل جديد",
    newRequest: "طلب جديد",
    totalRecords: "إجمالي السجلات",
    typeCount: "{count} أنواع",
    highCriticality: "حرجية عالية",
    highHint: "أصول تحتاج متابعة أوثق",
    expiring: "صيانة / ترخيص قارب الانتهاء",
    expiringHint: "خلال 60 يومًا",
    missingSupport: "بيانات دعم ناقصة",
    missingHint: "أجهزة بلا تاريخ انتهاء دعم",
    people: "الموظفون",
    peopleHint: "المسجلون",
    openRequests: "طلبات مفتوحة",
    openRequestsMine: "طلباتك المفتوحة",
    openRequestsAll: "طلبات بانتظار المعالجة",
    openChanges: "تغييرات نشطة",
    openChangesHint: "في الموافقة أو التنفيذ",
    openVulns: "ثغرات مفتوحة",
    openVulnsHint: "لم تُغلق بعد",
    openIncidents: "حوادث مفتوحة",
    openIncidentsHint: "ما زالت قيد المعالجة",
    itilTitle: "إدارة خدمات ITIL",
    allPractices: "كل الممارسات",
    activeCatalog: "خدمات الكتالوج النشطة",
    activeCatalogHint: "خدمات منشورة للمستخدمين",
    assetTypes: "أنواع الأصول",
    viewAll: "عرض الكل",
    calendar: "تقويم الصيانة / الترخيص",
    calendarHint: "عقود انتهت أو ستنتهي خلال 60 يومًا.",
    noContracts: "لا عقود مستحقة",
    noContractsHint: "لا يوجد تاريخ انتهاء قريب. تظهر التواريخ هنا عند إدخالها.",
    criticality: "توزيع الحرجية",
    lifecycle: "دورة الحياة",
    activity: "آخر الحركات",
    activityHint: "كل تغيير في الأصول يُسجل في مسار التدقيق.",
    noActivity: "لا حركات بعد",
    noActivityHint: "تظهر الحركات بعد أول سجل أصول.",
    addAsset: "إضافة أصل",
    openTicket: "فتح طلب",
    deletedRecord: "سجل محذوف",
    record: "سجل",
  },
  inbox: {
    title: "إجراءات سريعة",
    close: "إغلاق",
    closePanel: "إغلاق الإجراءات السريعة",
    approvals: "الموافقات",
    assigned: "مهام مسندة",
    waiting: "قيد الانتظار",
    summaryAlert: "{approval} موافقات، {assigned} مهام مسندة.",
    summaryWaiting: "{count} عناصر منتظرة.",
    summaryEmpty: "لا موافقات أو مهام معلّقة.",
    empty: "لا مهام أو موافقات أو عناصر منتظرة.",
    approve: "موافقة",
    reject: "رفض",
    aria: "إجراءات سريعة",
    ariaAlert: "إجراءات سريعة، {count} معلّقة",
  },
  common: {
    save: "حفظ",
    cancel: "إلغاء",
    create: "إنشاء",
    edit: "تعديل",
    delete: "حذف",
    add: "إضافة",
    newRecord: "إضافة سجل",
    empty: "لا سجلات",
    loading: "جارٍ التحميل…",
    all: "الكل",
    status: "الحالة",
    seeAll: "عرض الكل",
  },
  forbidden: {
    title: "هذه الصفحة خارج صلاحيتك",
    body: "دورك لا يشمل هذه الوحدة. يمكن للمسؤول تعيين دور يدوي أو تحديث ربط مجموعات الدليل.",
    back: "العودة إلى النظرة العامة",
  },
  catalog: {
    title: "كتالوج الخدمات",
    description: "قائمة الخدمات المقدمة للمستخدمين مع التفاصيل وشروط الوصول. تُفتح الطلبات من مكتب الخدمة وفق هذه الخدمات.",
    add: "إضافة خدمة",
    count: "خدمات الكتالوج",
    active: "نشط",
    userFacing: "موجه للمستخدم",
    search: "ابحث بالاسم أو الرقم أو المالك…",
    searchAria: "بحث في الكتالوج",
    allStatuses: "كل الحالات",
    emptyTitle: "الكتالوج فارغ",
    emptyBody: "أضف أول خدمة يراها المستخدمون.",
    noSla: "لا اتفاقية",
    colNo: "رقم",
    colService: "الخدمة",
    colOwner: "المالك / الوحدة",
    colHours: "الساعات / الاتفاقية",
    colAudience: "الجمهور",
    colStatus: "الحالة",
  },
  process: {
    add: "إضافة سجل",
    search: "ابحث بالرقم أو العنوان أو الخدمة…",
    listed: "{count} سجلات",
    emptyTitle: "لا سجلات",
    emptyBody: "أضف أول سجل.",
    colNo: "رقم",
    colTitle: "العنوان",
    colService: "الخدمة",
    colRequester: "المسجّل",
    colDept: "الوحدة",
    colStatus: "الحالة",
  },
  hizmetler: {
    title: "إدارة خدمات ITIL",
    description: "أصول 1.3.0 والطلبات والحوادث والمشكلات والتغيير وCMDB باقية. أضاف 2.0.0 الممارسات الناقصة. من الإعدادات → المظهر يمكن إعادة قائمة 1.3.0 دون حذف السجلات.",
  },
  guidesPage: {
    title: "الأدلة",
    description: "أدلة المستخدم والمسؤول وواجهة البرمجة وITIL 4. دليل ITIL يُقرأ في التطبيق؛ والجميع يُنزَّل PDF.",
    downloadPdf: "تنزيل PDF",
    readOnline: "اقرأ في التطبيق",
    openInterface: "افتح الواجهة",
    files: "الملفات: /docs/itil-v4-kilavuzu.pdf، /docs/kullanici-kilavuzu.pdf، /docs/yonetici-kilavuzu.pdf، /docs/api-kilavuzu.pdf",
    userTitle: "دليل المستخدم",
    userDesc: "الدخول، طلبات المستوى 1/2، طلباتي، مخزون الوحدة، موافقة الإضافة/الحذف، التقارير وتجربة واجهة البرمجة.",
    adminTitle: "دليل المسؤول",
    adminDesc: "الأدوار، مكتب الخدمة / الطبقة 2، صلاحيات المجموعات، موافقة المخزون، SIEM / AD / مفاتيح واجهة البرمجة.",
    apiTitle: "دليل واجهة البرمجة",
    apiDesc: "نقاط REST v1، Bearer / X-Api-Key، النطاقات، مثال الطلب وOpenAPI. التجربة الحية: قائمة واجهة البرمجة.",
    itilTitle: "دليل ITIL 4",
    itilDesc: "قيمة الخدمة، الأبعاد الأربعة، سلسلة القيمة، 17 ممارسة وربطها بهذه الشاشات. مذكرة تشغيل مفصّلة.",
    itilReadTitle: "دليل ITIL 4",
    itilReadDesc: "نظام قيمة الخدمة والمبادئ التوجيهية و17 ممارسة في القائمة. الإصدار 1.0 · 1 تشرين الأول 2026.",
    toc: "المحتويات",
    langNote: "متن هذا الدليل باللغة التركية. تتوافق تسميات القائمة والنماذج مع اللغة المختارة.",
    backToGuides: "العودة إلى الأدلة",
  },
  roles: {
    USER: "مستخدم",
    SYSTEM_ADMIN: "مسؤول النظام",
    UNIT_MANAGER: "مدير الوحدة",
    SENIOR_MANAGER: "مدير أعلى",
    INFOSEC_MANAGER: "مسؤول أمن المعلومات",
    SUPER_ADMIN: "المسؤول الأعلى",
  },
  assets: {
    COMPUTER: { label: "حاسوب", description: "أجهزة مكتبية ومحمولة وعملاء سطح المكتب الافتراضي." },
    SERVER: { label: "خادم", description: "خوادم فعلية وافتراضية والتطبيقات التي تستضيفها." },
    PRINTER: { label: "طابعة", description: "طابعات وماسحات وأجهزة متعددة الوظائف." },
    TABLET: { label: "لوحي", description: "أجهزة لوحية ونقاط طرفية محمولة." },
    MOBILE_PHONE: { label: "هاتف محمول", description: "الهواتف المحمولة وأجهزة الهاتف الذكي الخاصة بالمؤسسة." },
    SOFTWARE: { label: "برمجيات / ترخيص", description: "تطبيقات وسجلات التراخيص." },
    APPLICATION: { label: "تطبيق", description: "تطبيقات الأعمال: الخوادم المضيفة والخدمات التي تقدمها." },
    IP_PHONE: { label: "هاتف IP", description: "هواتف IP وأجهزة المؤتمرات." },
    NETWORK_DEVICE: { label: "موجه / مبدّل", description: "موجهات ومبدّلات وأجهزة شبكة أخرى." },
    PERIPHERAL: { label: "ملحق", description: "شاشات ولوحات مفاتيح وماسحات باركود." },
    FIXTURE: { label: "أثاث وأصول ثابتة", description: "أصول ثابتة في العهدة." },
  },
  itil: practice({
    catalog: { label: "إدارة كتالوج الخدمات", description: "خدمات تقنية المعلومات المتاحة وتفاصيلها وشروط الوصول." },
    design: { label: "تصميم الخدمة", description: "تصميم خدمة جديدة أو متغيرة وفق العمل والأمن وتوقعات المستخدم." },
    sla: { label: "إدارة مستوى الخدمة", description: "تحديد أهداف الاتفاقية وقياسها. أعطال المورد في وحدة منفصلة." },
    availability: { label: "إدارة التوفر", description: "تشغيل الخدمة في الأوقات المتعهد بها." },
    capacity: { label: "السعة والأداء", description: "تخطيط المعالج والذاكرة والتخزين والحمل." },
    continuity: { label: "استمرارية الخدمة", description: "التعافي من الكوارث والأزمات." },
    validation: { label: "التحقق والاختبار", description: "إثبات مطابقة التصميم قبل الإنتاج." },
    itam: { label: "إدارة أصول تقنية المعلومات", description: "دورة حياة العتاد والتراخيص والسحابة." },
    cmdb: { label: "إدارة التهيئة", description: "علاقات عناصر التهيئة والاعتماديات." },
    desk: { label: "مكتب الخدمة", description: "نقطة الاتصال الوحيدة للطلبات والشكاوى." },
    incident: { label: "إدارة الحوادث", description: "استعادة الخدمة بعد الانقطاع أو البطء." },
    problem: { label: "إدارة المشكلات", description: "السبب الجذري والحلول الدائمة." },
    request: { label: "إدارة طلبات الخدمة", description: "طلبات روتينية مثل إعادة كلمة المرور أو جهاز جديد." },
    change: { label: "تمكين التغيير", description: "تحليل المخاطر والموافقة المخططة على التحديثات." },
    release: { label: "إدارة الإصدار", description: "تجميع التغييرات والتحديثات للإنتاج." },
    monitoring: { label: "المراقبة والأحداث", description: "مراقبة على مدار الساعة وسجلات وإنذار مبكر." },
    evaluation: { label: "تقييم الخدمة", description: "قياس القيمة المحققة للعمل بشكل مستقل." },
    DESIGN: { label: "تصميم الخدمة", description: "التصميم وفق أهداف العمل ومعايير الأمن وتوقعات العميل." },
    SLA: { label: "إدارة مستوى الخدمة", description: "تحديد الأهداف وقياسها والإبلاغ عن الانحراف." },
    AVAILABILITY: { label: "إدارة التوفر", description: "ضمان التشغيل عند الحاجة وللمدد المتعهد بها." },
    CAPACITY: { label: "السعة والأداء", description: "خطة موارد للحمل الحالي والمستقبلي." },
    CONTINUITY: { label: "استمرارية الخدمة", description: "كيفية استعادة الخدمة بعد كارثة." },
    VALIDATION: { label: "التحقق والاختبار", description: "اختبار استيفاء متطلبات التصميم قبل الإطلاق." },
    RELEASE: { label: "إدارة الإصدار", description: "تجهيز التغييرات والأكواد والتحديثات للإنتاج." },
    MONITORING: { label: "المراقبة والأحداث", description: "مراقبة البنية 24/7 والتنبيه قبل الانقطاع." },
    EVALUATION: { label: "تقييم الخدمة", description: "الحكم على ما إذا كانت الخدمة حققت القيمة المستهدفة." },
  }),
  criticality: { HIGH: "عالٍ", MEDIUM: "متوسط", LOW: "منخفض" },
  lifecycle: { ACTIVE: "قيد الاستخدام", IN_STOCK: "في المخزن", MAINTENANCE: "صيانة", RETIRED: "مُخرج" },
  ...FORM_COPY.ar,
};

export const ES: Messages = {
  appName: "Gestión de servicios de TI",
  appShort: "ITSM",
  tagline: "Gestión de servicios",
  language: "Idioma",
  locales: { tr: "Türkçe", en: "English", ar: "العربية", es: "Español", az: "Azərbaycan" },
  nav: {
    dashboard: "Vista general",
    personnel: "Personal",
    inventory: "Activos de TI",
    custody: "Formulario de custodia",
    approvals: "Aprobaciones de alta / baja",
    requests: "Gestión de solicitudes",
    changes: "Gestión de cambios",
    patches: "Gestión de parches",
    config: "Gestión de configuración",
    vulns: "Gestión de vulnerabilidades",
    vendorSla: "Proveedor / ANS",
    incidents: "Gestión de incidentes",
    problems: "Gestión de problemas",
    agile: "Trabajo ágil",
    catalog: "Catálogo de servicios",
    itil: "Prácticas ITIL",
    reports: "Informes",
    guides: "Guías",
    api: "Consola API",
    settings: "Ajustes",
    version: "Versión {version}",
    expand: "Abrir menú",
    collapse: "Cerrar menú",
    design: "Diseño",
    operations: "Operación",
    transition: "Transición",
    assets: "Activos",
    evaluation: "Evaluación",
    desk: "Mesa de servicio",
    changeEnablement: "Habilitación del cambio",
  },
  header: {
    welcome: "Bienvenido de nuevo, {name}",
    logout: "Cerrar sesión",
    search: "Buscar registros…",
    searchAria: "Buscar inventario",
    back: "Atrás",
    menu: "Abrir menú",
    account: "Menú de cuenta",
    roleManual: "Cuenta local",
    roleAd: "Active Directory",
    roleBoth: "AD + local",
  },
  login: {
    subtitle: "Entrar o registrarse con cuenta local o Active Directory · versión {version}",
    local: "Local",
    ad: "Active Directory",
    signIn: "Entrar",
    register: "Registro",
    username: "Usuario",
    usernameHint: "Usuario de AD o nombre local de la ficha de personal.",
    password: "Contraseña",
    passwordHint: "Contraseña local de la ficha de personal.",
    submit: "Iniciar sesión",
    fullName: "Nombre y apellidos",
    fullNameHint: "Nombre oficial en la ficha de personal.",
    email: "Correo",
    emailHint: "Avisos y aprobaciones se envían aquí.",
    usernameNew: "Nombre de usuario",
    usernameNewHint: "Nombre único para el acceso local.",
    passwordNew: "Contraseña",
    passwordNewHint: "Mínimo 8 caracteres.",
    confirm: "Repetir contraseña",
    confirmHint: "Escriba la misma contraseña.",
    registerSubmit: "Crear cuenta",
    adUser: "Usuario AD",
    adUserHint: "sAMAccountName de Active Directory.",
    adPassword: "Contraseña",
    adPasswordHint: "Contraseña de dominio. No se almacena.",
    adSubmit: "Entrar con AD",
    adRegName: "Nombre y apellidos",
    adRegUser: "Usuario AD",
    adRegUserHint: "sAMAccountName a verificar. El rol sale del mapeo de grupos.",
    adRegPass: "Contraseña",
    adRegPassHint: "Contraseña de dominio. Se verifica al registrarse.",
    adRegSubmit: "Registrarse con AD",
    userGuide: "Guía de usuario",
    adminGuide: "Guía de administrador",
    downloadPackage: "Descargar paquete {version}",
  },
  dashboard: {
    title: "Vista general",
    descAll: "Estado del inventario, calendario de mantenimiento y licencias, y actividad reciente.",
    descScoped: "Activos a su cargo o de su unidad y las solicitudes que abrió.",
    newAsset: "Nuevo activo",
    newRequest: "Nueva solicitud",
    totalRecords: "Total de registros",
    typeCount: "{count} tipos",
    highCriticality: "Alta criticidad",
    highHint: "Activos que conviene vigilar",
    expiring: "Mantenimiento / licencia próxima",
    expiringHint: "En los próximos 60 días",
    missingSupport: "Falta dato de soporte",
    missingHint: "Equipos sin fecha de fin de soporte",
    people: "Personal",
    peopleHint: "Personas registradas",
    openRequests: "Solicitudes abiertas",
    openRequestsMine: "Sus solicitudes abiertas",
    openRequestsAll: "Solicitudes pendientes de atender",
    openChanges: "Cambios activos",
    openChangesHint: "En aprobación o implantación",
    openVulns: "Vulnerabilidades abiertas",
    openVulnsHint: "Aún no cerradas",
    openIncidents: "Incidentes abiertos",
    openIncidentsHint: "Aún en curso",
    itilTitle: "Gestión de servicios ITIL",
    allPractices: "Todas las prácticas",
    activeCatalog: "Servicios de catálogo activos",
    activeCatalogHint: "Servicios publicados a usuarios",
    assetTypes: "Tipos de activo",
    viewAll: "Ver todo",
    calendar: "Calendario de mantenimiento / licencia",
    calendarHint: "Contratos vencidos o que vencen en 60 días.",
    noContracts: "Sin contratos pendientes",
    noContractsHint: "No hay fechas próximas. Aparecerán al introducirlas.",
    criticality: "Distribución de criticidad",
    lifecycle: "Ciclo de vida",
    activity: "Actividad reciente",
    activityHint: "Cada cambio de inventario se escribe en la pista de auditoría.",
    noActivity: "Aún no hay actividad",
    noActivityHint: "La actividad aparece tras el primer registro de inventario.",
    addAsset: "Añadir activo",
    openTicket: "Abrir solicitud",
    deletedRecord: "Registro eliminado",
    record: "Registro",
  },
  inbox: {
    title: "Acciones rápidas",
    close: "Cerrar",
    closePanel: "Cerrar acciones rápidas",
    approvals: "Aprobaciones",
    assigned: "Tareas asignadas",
    waiting: "En espera",
    summaryAlert: "{approval} aprobaciones, {assigned} asignadas.",
    summaryWaiting: "{count} elementos en espera.",
    summaryEmpty: "No hay aprobaciones ni tareas pendientes.",
    empty: "No tiene trabajo asignado, aprobaciones ni elementos en espera.",
    approve: "Aprobar",
    reject: "Rechazar",
    aria: "Acciones rápidas",
    ariaAlert: "Acciones rápidas, {count} pendientes",
  },
  common: {
    save: "Guardar",
    cancel: "Cancelar",
    create: "Crear",
    edit: "Editar",
    delete: "Eliminar",
    add: "Añadir",
    newRecord: "Añadir registro",
    empty: "Sin registros",
    loading: "Cargando…",
    all: "Todos",
    status: "Estado",
    seeAll: "Ver todo",
  },
  forbidden: {
    title: "No puede abrir esta página",
    body: "Su rol no incluye este módulo. Un administrador puede asignar un rol manual o actualizar el mapeo de grupos AD.",
    back: "Volver a la vista general",
  },
  catalog: {
    title: "Catálogo de servicios",
    description: "Lista viva de servicios de TI ofrecidos a los usuarios, con detalle y condiciones de acceso. Las solicitudes se abren desde la mesa de servicio.",
    add: "Añadir servicio",
    count: "Servicios del catálogo",
    active: "Activo",
    userFacing: "Para usuarios",
    search: "Buscar nombre, número o propietario…",
    searchAria: "Buscar catálogo",
    allStatuses: "Todos los estados",
    emptyTitle: "Catálogo vacío",
    emptyBody: "Añada el primer servicio que verán los usuarios.",
    noSla: "Sin ANS",
    colNo: "N.º",
    colService: "Servicio",
    colOwner: "Propietario / unidad",
    colHours: "Horario / ANS",
    colAudience: "Público",
    colStatus: "Estado",
  },
  process: {
    add: "Añadir registro",
    search: "Buscar número, título o servicio…",
    listed: "{count} registros",
    emptyTitle: "Sin registros",
    emptyBody: "Añada el primer registro.",
    colNo: "N.º",
    colTitle: "Título",
    colService: "Servicio",
    colRequester: "Registrado por",
    colDept: "Unidad",
    colStatus: "Estado",
  },
  hizmetler: {
    title: "Gestión de servicios ITIL",
    description: "Inventario, solicitudes, incidentes, problemas, cambio y CMDB de 1.3.0 se mantienen. 2.0.0 añade las prácticas que faltaban. Ajustes → Apariencia puede restaurar el menú 1.3.0; los registros no se borran.",
  },
  guidesPage: {
    title: "Guías",
    description: "Guías de usuario, administrador, API e ITIL 4. El documento ITIL se lee en la aplicación; todas se descargan en PDF.",
    downloadPdf: "Descargar PDF",
    readOnline: "Leer en la aplicación",
    openInterface: "Abrir interfaz",
    files: "Archivos: /docs/itil-v4-kilavuzu.pdf, /docs/kullanici-kilavuzu.pdf, /docs/yonetici-kilavuzu.pdf, /docs/api-kilavuzu.pdf",
    userTitle: "Guía de usuario",
    userDesc: "Acceso, solicitudes L1/L2, Mis solicitudes, inventario de unidad, aprobación de alta/baja, informes y prueba de API.",
    adminTitle: "Guía de administrador",
    adminDesc: "Roles, mesa de servicio / Capa 2, permisos de grupo, aprobación de inventario, SIEM / AD / claves API.",
    apiTitle: "Guía de API",
    apiDesc: "Extremos REST v1, Bearer / X-Api-Key, alcances, ejemplo de solicitud y OpenAPI. Prueba en vivo: menú Interfaz API.",
    itilTitle: "Guía ITIL 4",
    itilDesc: "Valor del servicio, cuatro dimensiones, cadena de valor, 17 prácticas y su equivalencia en esta aplicación. Nota operativa detallada.",
    itilReadTitle: "Guía ITIL 4",
    itilReadDesc: "Sistema de valor del servicio, principios rectores y las 17 prácticas del menú. Versión 1.0 · 1 de octubre de 2026.",
    toc: "Índice",
    langNote: "El cuerpo de esta guía está en turco. Las etiquetas de menú y formularios siguen el idioma seleccionado.",
    backToGuides: "Volver a las guías",
  },
  roles: {
    USER: "Usuario",
    SYSTEM_ADMIN: "Administrador de sistemas",
    UNIT_MANAGER: "Jefe de unidad",
    SENIOR_MANAGER: "Mandos superiores",
    INFOSEC_MANAGER: "Responsable de seguridad",
    SUPER_ADMIN: "Superadministrador",
  },
  assets: {
    COMPUTER: { label: "Ordenador", description: "Equipos de sobremesa, portátiles y VDI." },
    SERVER: { label: "Servidor", description: "Servidores físicos y virtuales y las aplicaciones que alojan." },
    PRINTER: { label: "Impresora", description: "Impresoras, escáneres y multifunción." },
    TABLET: { label: "Tableta", description: "Tabletas y terminales móviles." },
    MOBILE_PHONE: { label: "Teléfono móvil", description: "Teléfonos móviles y smartphones corporativos." },
    SOFTWARE: { label: "Software / licencia", description: "Aplicaciones y registros de licencia." },
    APPLICATION: { label: "Aplicación", description: "Aplicaciones de negocio: servidores y servicios que prestan." },
    IP_PHONE: { label: "Teléfono IP", description: "Teléfonos IP y conferencias." },
    NETWORK_DEVICE: { label: "Router / switch", description: "Enrutadores, conmutadores y otro equipo de red." },
    PERIPHERAL: { label: "Periférico", description: "Monitores, teclados, lectores de códigos." },
    FIXTURE: { label: "Inmovilizado", description: "Bienes en custodia." },
  },
  itil: practice({
    catalog: { label: "Gestión del catálogo de servicios", description: "Servicios de TI abiertos a usuarios, detalle y condiciones de acceso." },
    design: { label: "Diseño del servicio", description: "Diseño de un servicio nuevo o cambiado según negocio, seguridad y expectativas." },
    sla: { label: "Gestión del nivel de servicio", description: "Objetivos ANS internos y medición. Averías de proveedor van en otro módulo." },
    availability: { label: "Gestión de la disponibilidad", description: "Que el servicio funcione en las horas comprometidas." },
    capacity: { label: "Capacidad y rendimiento", description: "Plan de CPU, RAM, almacenamiento y carga." },
    continuity: { label: "Continuidad del servicio", description: "Recuperación ante desastres y crisis." },
    validation: { label: "Validación y pruebas", description: "Comprobar el diseño antes de producción." },
    itam: { label: "Gestión de activos de TI", description: "Ciclo de vida de hardware, licencias y nube." },
    cmdb: { label: "Gestión de la configuración", description: "Relaciones y dependencias de CI (CMDB)." },
    desk: { label: "Mesa de servicio", description: "Único punto de contacto para solicitudes y quejas." },
    incident: { label: "Gestión de incidentes", description: "Restablecer el servicio tras cortes o lentitud." },
    problem: { label: "Gestión de problemas", description: "Causa raíz y soluciones duraderas." },
    request: { label: "Gestión de solicitudes", description: "Peticiones rutinarias: contraseña, equipo nuevo, permisos." },
    change: { label: "Habilitación del cambio", description: "Análisis de riesgo y aprobación planificada." },
    release: { label: "Gestión de versiones", description: "Empaquetar cambios y parches para producción." },
    monitoring: { label: "Supervisión y eventos", description: "Supervisión 24/7, registros y aviso temprano." },
    evaluation: { label: "Evaluación del servicio", description: "Comprobar de forma imparcial el valor de negocio." },
    DESIGN: { label: "Diseño del servicio", description: "Diseño según objetivos de negocio, seguridad y expectativas." },
    SLA: { label: "Gestión del nivel de servicio", description: "Definir, medir e informar objetivos ANS." },
    AVAILABILITY: { label: "Gestión de la disponibilidad", description: "Garantizar el servicio cuando se necesita." },
    CAPACITY: { label: "Capacidad y rendimiento", description: "Plan de recursos para la carga actual y futura." },
    CONTINUITY: { label: "Continuidad del servicio", description: "Cómo se recupera el servicio tras un desastre." },
    VALIDATION: { label: "Validación y pruebas", description: "Probar los requisitos de diseño antes del paso a producción." },
    RELEASE: { label: "Gestión de versiones", description: "Preparar cambios, código y parches para producción." },
    MONITORING: { label: "Supervisión y eventos", description: "Vigilar la infraestructura 24/7 y avisar antes de un corte." },
    EVALUATION: { label: "Evaluación del servicio", description: "Valorar si el servicio creó el valor previsto." },
  }),
  criticality: { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" },
  lifecycle: { ACTIVE: "En uso", IN_STOCK: "En almacén", MAINTENANCE: "Mantenimiento", RETIRED: "Baja" },
  ...FORM_COPY.es,
};

export const AZ: Messages = {
  appName: "İT xidmət idarəetməsi",
  appShort: "ITSM",
  tagline: "Xidmət idarəetməsi",
  language: "Dil",
  locales: { tr: "Türkçe", en: "English", ar: "العربية", es: "Español", az: "Azərbaycan" },
  nav: {
    dashboard: "Ümumi baxış",
    personnel: "Heyət idarəetməsi",
    inventory: "İnventar idarəetməsi",
    custody: "Təhvil-təslim forması",
    approvals: "Əlavə / silmə təsdiqləri",
    requests: "Sorğu idarəetməsi",
    changes: "Dəyişiklik idarəetməsi",
    patches: "Yama idarəetməsi",
    config: "Konfiqurasiya idarəetməsi",
    vulns: "Zəiflik idarəetməsi",
    vendorSla: "Təchizatçı / SLA",
    incidents: "Hadisə idarəetməsi",
    problems: "Problem idarəetməsi",
    agile: "Çevik iş (Agile)",
    catalog: "Xidmət kataloqu",
    itil: "ITIL prosesləri",
    reports: "Hesabatlar",
    guides: "Bələdçilər",
    api: "API interfeysi",
    settings: "Parametrlər",
    version: "Versiya {version}",
    expand: "Menyunu aç",
    collapse: "Menyunu yığ",
    design: "Dizayn",
    operations: "Əməliyyat",
    transition: "Keçid",
    assets: "Aktivlər",
    evaluation: "Qiymətləndirmə",
    desk: "Xidmət masası",
    changeEnablement: "Dəyişiklik nəzarəti",
  },
  header: {
    welcome: "Yenidən xoş gəlmisiniz, {name}",
    logout: "Çıxış",
    search: "Qeyd axtar…",
    searchAria: "İnventar axtar",
    back: "Geri",
    menu: "Menyunu aç",
    account: "Hesab menyusu",
    roleManual: "Yerli hesab",
    roleAd: "Active Directory",
    roleBoth: "AD + yerli",
  },
  login: {
    subtitle: "Yerli və ya Active Directory ilə giriş / qeydiyyat · versiya {version}",
    local: "Yerli",
    ad: "Active Directory",
    signIn: "Giriş",
    register: "Qeydiyyat",
    username: "İstifadəçi",
    usernameHint: "İşçi kartındakı AD və ya yerli istifadəçi adı.",
    password: "Şifrə",
    passwordHint: "İşçi kartındakı yerli şifrə.",
    submit: "Daxil ol",
    fullName: "Ad soyad",
    fullNameHint: "İşçi kartında görünəcək rəsmi ad.",
    email: "E-poçt",
    emailHint: "Bildirişlər bu ünvana gedir.",
    usernameNew: "İstifadəçi adı",
    usernameNewHint: "Yerli giriş üçün unikal ad.",
    passwordNew: "Şifrə",
    passwordNewHint: "Ən azı 8 simvol.",
    confirm: "Şifrəni təkrarlayın",
    confirmHint: "Eyni şifrəni yenidən yazın.",
    registerSubmit: "Qeydiyyatdan keç",
    adUser: "AD istifadəçi adı",
    adUserHint: "Active Directory sAMAccountName.",
    adPassword: "Şifrə",
    adPasswordHint: "Domen şifrəsi. Saxlanılmır.",
    adSubmit: "AD ilə daxil ol",
    adRegName: "Ad soyad",
    adRegUser: "AD istifadəçi adı",
    adRegUserHint: "Kataloqda yoxlanılacaq sAMAccountName. Rol AD qrupundan gəlir.",
    adRegPass: "Şifrə",
    adRegPassHint: "Domen şifrəsi. Qeydiyyatda bir dəfə yoxlanılır.",
    adRegSubmit: "AD ilə qeydiyyat",
    userGuide: "İstifadəçi bələdçisi",
    adminGuide: "İnzibatçı bələdçisi",
    downloadPackage: "{version} paketini yüklə",
  },
  dashboard: {
    title: "Ümumi baxış",
    descAll: "İnventarın anlıq vəziyyəti, texniki xidmət/lisenziya təqvimi və son hərəkətlər.",
    descScoped: "Sizin və bölmənizdəki inventar ilə açdığınız sorğular.",
    newAsset: "Yeni inventar",
    newRequest: "Yeni sorğu",
    totalRecords: "Cəmi qeyd",
    typeCount: "{count} müxtəlif növ",
    highCriticality: "Yüksək kritiklik",
    highHint: "Daha sıx izlənilməli aktivlər",
    expiring: "Xidmət / lisenziya müddəti yaxınlaşır",
    expiringHint: "Növbəti 60 gün ərzində",
    missingSupport: "Dəstək məlumatı yoxdur",
    missingHint: "Dəstək bitmə tarixi yazılmamış cihazlar",
    people: "Heyət",
    peopleHint: "Qeydə alınmış şəxslər",
    openRequests: "Açıq sorğular",
    openRequestsMine: "Sizin açıq sorğularınız",
    openRequestsAll: "İcra gözləyən xidmət sorğuları",
    openChanges: "Aktiv dəyişiklik",
    openChangesHint: "Təsdiq / tətbiq prosesində",
    openVulns: "Açıq zəiflik",
    openVulnsHint: "Bağlanmamış zəifliklər",
    openIncidents: "Açıq hadisə",
    openIncidentsHint: "Davam edən hadisələr",
    itilTitle: "ITIL xidmət idarəetməsi",
    allPractices: "Bütün proseslər",
    activeCatalog: "Aktiv kataloq xidməti",
    activeCatalogHint: "İstifadəçilərə açıq xidmətlər",
    assetTypes: "İnventar növləri",
    viewAll: "Hamısına bax",
    calendar: "Texniki xidmət / lisenziya təqvimi",
    calendarHint: "Müddəti bitmiş və ya 60 gün ərzində bitəcək müqavilələr.",
    noContracts: "İzlənilən müqavilə yoxdur",
    noContractsHint: "Yaxınlaşan bitmə tarixi yoxdur. Tarixlər daxil edildikcə siyahı dolacaq.",
    criticality: "Kritiklik paylanması",
    lifecycle: "Həyat dövrü",
    activity: "Son hərəkətlər",
    activityHint: "Hər inventar dəyişikliyi audit izində yazılır.",
    noActivity: "Hələ hərəkət yoxdur",
    noActivityHint: "İlk inventar qeydindən sonra tarixçe burada görünəcək.",
    addAsset: "İnventar əlavə et",
    openTicket: "Sorğu aç",
    deletedRecord: "Silinmiş qeyd",
    record: "Qeyd",
  },
  inbox: {
    title: "Sürətli əməliyyatlar",
    close: "Bağla",
    closePanel: "Sürətli əməliyyatlar panelini bağla",
    approvals: "Təsdiqlər",
    assigned: "Təyin olunmuş tapşırıqlar",
    waiting: "Gözləyənlər",
    summaryAlert: "{approval} təsdiq, {assigned} təyinat.",
    summaryWaiting: "{count} gözləyən iş.",
    summaryEmpty: "Gözləyən təsdiq və ya tapşırıq yoxdur.",
    empty: "Sizə təyin olunmuş tapşırıq, təsdiq və ya gözləyən iş yoxdur.",
    approve: "Təsdiq et",
    reject: "Rədd et",
    aria: "Sürətli əməliyyatlar",
    ariaAlert: "Sürətli əməliyyatlar, {count} gözləyən",
  },
  common: {
    save: "Saxla",
    cancel: "Ləğv et",
    create: "Yarat",
    edit: "Düzəliş et",
    delete: "Sil",
    add: "Əlavə et",
    newRecord: "Qeyd əlavə et",
    empty: "Qeyd yoxdur",
    loading: "Yüklənir…",
    all: "Hamısı",
    status: "Status",
    seeAll: "Hamısına bax",
  },
  forbidden: {
    title: "Bu səhifə səlahiyyətinizdən kənardır",
    body: "Rolunuz bu modulu açmır. İnizibatçı əl ilə rol verə və ya AD qrup uyğunlaşdırmasını yeniləyə bilər.",
    back: "Ümumi baxışa qayıt",
  },
  catalog: {
    title: "Xidmət kataloqu",
    description: "İstifadəçilərə açıq İT xidmətlərinin siyahısı, təfərrüatı və giriş şərtləri. Sorğu xidmət masasından bu xidmətə görə açılır.",
    add: "Xidmət əlavə et",
    count: "Kataloqdakı xidmət",
    active: "Aktiv",
    userFacing: "İstifadəçiyə açıq",
    search: "Ad, nömrə və ya sahib axtar…",
    searchAria: "Kataloq axtar",
    allStatuses: "Bütün statuslar",
    emptyTitle: "Kataloq boşdur",
    emptyBody: "İstifadəçilərin görəcəyi ilk xidməti əlavə edin.",
    noSla: "SLA yoxdur",
    colNo: "№",
    colService: "Xidmət",
    colOwner: "Sahib / bölmə",
    colHours: "Saat / SLA",
    colAudience: "Kimlər",
    colStatus: "Status",
  },
  process: {
    add: "Qeyd əlavə et",
    search: "Nömrə, başlıq və ya xidmət axtar…",
    listed: "{count} qeyd siyahıdadır",
    emptyTitle: "Qeyd yoxdur",
    emptyBody: "İlk qeydi əlavə edin.",
    colNo: "№",
    colTitle: "Başlıq",
    colService: "Xidmət",
    colRequester: "Qeydə alan",
    colDept: "Bölmə",
    colStatus: "Status",
  },
  hizmetler: {
    title: "ITIL xidmət idarəetməsi",
    description: "1.3.0-dakı inventar, sorğu, hadisə, problem, dəyişiklik və CMDB qalır. 2.0.0 çatışmayan prosesləri tamamlayır. Parametrlər → Görünüşdən 1.3.0 menyusuna qayıtmaq olar; qeydlər silinmir.",
  },
  guidesPage: {
    title: "Bələdçilər",
    description: "İstifadəçi, inzibatçı, API və ITIL 4 bələdçiləri. ITIL sənədi tətbiqdə oxunur; hamısı PDF yüklənir.",
    downloadPdf: "PDF yüklə",
    readOnline: "Tətbiqdə oxu",
    openInterface: "İnterfeysi aç",
    files: "Fayllar: /docs/itil-v4-kilavuzu.pdf, /docs/kullanici-kilavuzu.pdf, /docs/yonetici-kilavuzu.pdf, /docs/api-kilavuzu.pdf",
    userTitle: "İstifadəçi bələdçisi",
    userDesc: "Giriş, L1/L2 sorğu, Sorğularım, bölmə inventarı, əlavə/silmə təsdiqi, hesabatlar və API sınağı.",
    adminTitle: "İnzibatçı bələdçisi",
    adminDesc: "Rollar, xidmət masası / Qat 2, qrup səlahiyyətləri, inventar təsdiqi, SIEM / AD / API açarları.",
    apiTitle: "API bələdçisi",
    apiDesc: "REST v1 ucları, Bearer / X-Api-Key, əhatələr, sorğu nümunəsi və OpenAPI. Canlı sınaq: API interfeysi menyusu.",
    itilTitle: "ITIL 4 bələdçisi",
    itilDesc: "Xidmət dəyəri, dörd ölçü, dəyər zənciri, 17 praktika və bu tətbiqdəki ekran uyğunluğu. Ətraflı əməliyyat qeydi.",
    itilReadTitle: "ITIL 4 bələdçisi",
    itilReadDesc: "Xidmət dəyər sistemi, istiqamətləndirici prinsiplər və menyudakı 17 praktika. Versiya 1.0 · 1 oktyabr 2026.",
    toc: "Mündəricat",
    langNote: "Bu bələdçinin mətni türkcədir. Menyu və forma etiketləri seçilmiş dilə uyğun gəlir.",
    backToGuides: "Bələdçilərə qayıt",
  },
  roles: {
    USER: "İstifadəçi",
    SYSTEM_ADMIN: "Sistem inzibatçısı",
    UNIT_MANAGER: "Bölmə rəhbəri",
    SENIOR_MANAGER: "Yuxarı rəhbər",
    INFOSEC_MANAGER: "İnformasiya təhlükəsizliyi rəhbəri",
    SUPER_ADMIN: "Super inzibatçı",
  },
  assets: {
    COMPUTER: { label: "Kompüter", description: "Masaüstü, noutbuk və virtual masaüstü müştəriləri." },
    SERVER: { label: "Server", description: "Fiziki və virtual serverlər və yerləşdirdikləri tətbiqlər." },
    PRINTER: { label: "Printer", description: "Printerlər, skanerlər və çoxfunksiyalı cihazlar." },
    TABLET: { label: "Planşet", description: "Planşet və mobil qurğular." },
    MOBILE_PHONE: { label: "Mobil telefon", description: "Korporativ mobil telefonlar və smartfonlar." },
    SOFTWARE: { label: "Proqram / lisenziya", description: "Tətbiq proqramları və lisenziya qeydləri." },
    APPLICATION: { label: "Tətbiq", description: "Biznes tətbiqləri: işlədiyi serverlər və göstərdiyi xidmətlər." },
    IP_PHONE: { label: "IP telefon", description: "IP telefonlar və konfrans cihazları." },
    NETWORK_DEVICE: { label: "Router / Switch", description: "Marşrutlaşdırıcı, kommutator və digər şəbəkə avadanlığı." },
    PERIPHERAL: { label: "Periferiya", description: "Monitor, klaviatura, barkod oxuyucu və oxşar." },
    FIXTURE: { label: "Əsas vəsait", description: "Təhvil verilmiş əsas vəsaitlər." },
  },
  itil: practice({
    catalog: { label: "Xidmət kataloqu idarəetməsi", description: "İstifadəçilərə açıq İT xidmətləri, təfərrüat və giriş şərtləri." },
    design: { label: "Xidmət dizaynı", description: "Yeni və ya dəyişən xidmətin iş, təhlükəsizlik və gözləntiyə görə dizaynı." },
    sla: { label: "Xidmət səviyyəsi idarəetməsi", description: "Daxili SLA hədəfləri və ölçmə. Təchizatçı nasazlığı ayrı modulda." },
    availability: { label: "Əlçatanlıq idarəetməsi", description: "Öhdəlik götürülən saatlarda fasiləsiz iş." },
    capacity: { label: "Tutum və performans", description: "CPU, RAM, yaddaş və yük planı." },
    continuity: { label: "Xidmət fasiləsizliyi", description: "Fəlakət və böhran üçün bərpa planı." },
    validation: { label: "Xidmət yoxlanması və test", description: "Canlıya alınmadan dizayn tələblərinin yoxlanması." },
    itam: { label: "İT aktiv idarəetməsi", description: "Aparat, lisenziya və bulud həyat dövrü." },
    cmdb: { label: "Konfiqurasiya idarəetməsi", description: "CI əlaqələri və asılılıqlar (CMDB)." },
    desk: { label: "Xidmət masası", description: "Sorğu və şikayətlər üçün tək əlaqə nöqtəsi." },
    incident: { label: "Hadisə idarəetməsi", description: "Kəsintini mümkün qədər tez aradan qaldırmaq." },
    problem: { label: "Problem idarəetməsi", description: "Kök səbəb və daimi həll." },
    request: { label: "Xidmət sorğusu idarəetməsi", description: "Şifrə, səlahiyyət, yeni kompüter kimi rutin sorğular." },
    change: { label: "Dəyişiklik nəzarəti", description: "Canlı yeniləmənin risk analizi və planlı təsdiqi." },
    release: { label: "Buraxılış idarəetməsi", description: "Təsdiqlənmiş dəyişiklik və yamaların paketlənməsi." },
    monitoring: { label: "İzləmə və hadisələr", description: "24/7 izləmə, jurnallar və erkən xəbərdarlıq." },
    evaluation: { label: "Xidmətin qiymətləndirilməsi", description: "İş dəyərinin qərəzsiz ölçülməsi." },
    DESIGN: { label: "Xidmət dizaynı", description: "İş hədəfi, təhlükəsizlik standartı və müştəri gözləntisinə görə dizayn." },
    SLA: { label: "Xidmət səviyyəsi idarəetməsi", description: "SLA hədəflərini müəyyənləşdirir, ölçür və sapmaları hesabat edir." },
    AVAILABILITY: { label: "Əlçatanlıq idarəetməsi", description: "Xidmətin lazım olan anda öhdəlik saatlarında işləməsini təmin edir." },
    CAPACITY: { label: "Tutum və performans", description: "Mövcud və gələcək yük üçün resurs planı." },
    CONTINUITY: { label: "Xidmət fasiləsizliyi", description: "Fəlakətdən sonra xidmətin bərpası planı." },
    VALIDATION: { label: "Xidmət yoxlanması və test", description: "Dizayn tələblərinin canlıya qədər təmin olunduğunu yoxlayır." },
    RELEASE: { label: "Buraxılış idarəetməsi", description: "Təsdiqlənmiş dəyişiklik, kod və yamaları canlıya hazırlayır." },
    MONITORING: { label: "İzləmə və hadisələr", description: "İnfrastrukturu 24/7 izləyir; kəsintidən əvvəl xəbərdar edir." },
    EVALUATION: { label: "Xidmətin qiymətləndirilməsi", description: "Xidmətin hədəflənən iş dəyərini yaradıb-yaratmadığını qiymətləndirir." },
  }),
  criticality: { HIGH: "Yüksək", MEDIUM: "Orta", LOW: "Aşağı" },
  lifecycle: { ACTIVE: "İstifadədə", IN_STOCK: "Anbarda", MAINTENANCE: "Təmir", RETIRED: "Silinmiş" },
  ...FORM_COPY.az,
};

export const DICTIONARIES: Record<Locale, Messages> = { tr: TR, en: EN, ar: AR, es: ES, az: AZ };


