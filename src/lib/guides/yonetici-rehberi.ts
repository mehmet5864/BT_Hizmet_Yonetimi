import type { Guide } from "./types";

const CAP = "Şema: alanların yerini ve sırasını gösterir; gerçek ekran görüntüsü değildir.";

export const ADMIN_GUIDE_ILLUSTRATED: Guide = {
  file: "yonetici-rehberi",
  title: "Yönetici Rehberi (resimli)",
  subtitle: "Active Directory, SIEM, zafiyet tarayıcıları, e-posta, onay, yetki, lisans, API ve yedek kurulumu",
  audience: "Sistem yöneticileri, ağ ve güvenlik ekipleri",
  version: "1.0",
  intro:
    "Bu rehber uygulamanın dış sistemlerle bağlantılarını adım adım anlatır. Her bölümde önkoşullar, uygulamadaki alanlar (numaralı şema), kontrol ve sorun giderme yer alır. Resimler şematiktir. Üçüncü taraf ürünlerin (Nessus, Tenable, Qualys vb.) kendi ekranları sürümden sürüme değişir; o adımlar için ürünün resmi belgesi esas alınmalıdır.",
  blocks: [
    { t: "h1", text: "Genel yaklaşım ve entegrasyon haritası" },
    {
      t: "p",
      text: "Uygulama Docker içinde çalışır ve dışarıya dört yönde bağlanır: Active Directory (giriş ve rol), SIEM (log), zafiyet tarayıcı (bulgu çekme) ve SMTP (e-posta). Dış sistemler ise API anahtarıyla uygulamaya bağlanır. Bütün bu ayarlar Ayarlar sayfasındaki sekmelerden yapılır ve her değişiklik denetim kaydına yazılır.",
    },
    { t: "img", src: "/guides/mimari-entegrasyonlar.svg", alt: "Entegrasyon haritası", caption: "Entegrasyon haritası (şema). Oklar bağlantının başladığı yönü gösterir." },
    {
      t: "table",
      headers: ["Entegrasyon", "Kaynak → hedef", "Port", "Not"],
      rows: [
        ["Active Directory", "Uygulama sunucusu → etki alanı denetleyicisi", "389 (LDAP) veya 636 (LDAPS)", "Konteynerin DC adını çözebilmesi gerekir"],
        ["SIEM", "Uygulama sunucusu → toplayıcı", "514 UDP/TCP veya 6514 TLS", "UDP için teslim garantisi yoktur"],
        ["Zafiyet tarayıcı", "Uygulama sunucusu → tarama konsolu", "8834 (Nessus), 443 (Tenable, Qualys), 9392 (OpenVAS), 3780 (Rapid7)", "Port ürüne göre değişebilir"],
        ["SMTP", "Uygulama sunucusu → posta sunucusu", "25, 587 veya 465", "Kurum geçidi kullanılması önerilir"],
        ["API", "Dış sistem → uygulama", "Uygulamanın kendi portu (HTTPS)", "Bearer anahtar, kapsam ve izinli IP"],
      ],
    },
    {
      t: "note",
      title: "Güvenlik duvarı",
      text: "Kaynak, uygulamanın çalıştığı sunucudur (Docker Desktop kullanıyorsanız bilgisayarın kendisi). Yalnızca ilgili hedef ve port için kural açın. İç ağdaki self-signed sertifikalar için TLS doğrulaması varsayılan olarak kapalıdır; kurum sertifikanız güvenilir bir CA tarafından verilmişse doğrulamayı açın (bu rehberin “TLS ve sertifikalar” bölümü).",
    },

    { t: "h1", text: "Kurulum sırası ve ön kontrol" },
    {
      t: "ol",
      items: [
        "Uygulamayı açın ve Süper yönetici rolüyle giriş yapın (Ayarlar yalnızca bu role açıktır).",
        "Lisansı yükleyin: Ayarlar → Lisans. Lisanssız modüller kapalı kalır.",
        "Ayarlar → Tanımlar: birimler (talep birimleri) ve süreç yöneticilerini girin.",
        "E-posta (SMTP): onay bildirimleri için önce bunu kurun ve test iletisi gönderin.",
        "Active Directory: servis hesabını hazırlayın, bağlantıyı deneyin, grup → rol eşlemesini yapın.",
        "Yönetici onayları ve iş akışlarını tanımlayın.",
        "Modül yetkilerini rollere göre ayarlayın.",
        "SIEM ve zafiyet tarayıcı entegrasyonlarını kurun, test edin.",
        "Güvenlik ayarlarını (parola, oturum, kilit) kurum politikasına göre belirleyin.",
        "Yedek alın ve geri yüklemeyi bir kez deneyin.",
      ],
    },
    { t: "img", src: "/guides/ekran-ayarlar.svg", alt: "Ayarlar ekranı", caption: "Ayarlar sayfası ve sekmeler (şema)." },
    {
      t: "p",
      text: "Sekmeler: Tanımlar, Active Directory, SIEM, Zafiyet tarama, Yönetici onayları, E-posta, Yetkilendirme, Modül yetkileri, Görünüm, Yedek, Puanlama ve Audit log. Lisans, İş akışları ve Güvenlik sayfalarına Ayarlar’ın üstündeki bağlantılardan gidilir; API anahtarları API arayüzü sayfasındadır.",
    },

    { t: "h1", text: "E-posta (SMTP)" },
    {
      t: "p",
      text: "Onay bekleyen kayıtlar için amire ve onaycıya bağlantılı e-posta gönderilir. SMTP kapalıysa onaylar yine uygulama içinde verilebilir, yalnızca e-posta gitmez.",
    },
    { t: "img", src: "/guides/yonetim-eposta.svg", alt: "E-posta ayarları", caption: CAP },
    { t: "img", src: "/guides/mimari-eposta.svg", alt: "E-posta akışı", caption: "E-posta akışı (şema)." },
    { t: "h2", text: "Adımlar" },
    {
      t: "ol",
      items: [
        "Posta yöneticinizden uygulama sunucusu için bir gönderim izni (relay) ve gerekirse bir hesap isteyin.",
        "Ayarlar → E-posta sekmesini açın; “E-posta gönderimini aç” kutusunu işaretleyin (1).",
        "SMTP sunucu adresini yazın (2). Port ve şifrelemeyi seçin: 587 + STARTTLS, 465 + SSL/TLS veya iç ağ geçidi için 25 + yok (3).",
        "Kimlik doğrulama gerekiyorsa kullanıcı adı ve parolayı girin. Parolayı boş bırakırsanız kayıtlı parola korunur.",
        "Gönderen adresi ve adını yazın; “Test alıcısı” alanına kendi adresinizi girin (4).",
        "Kaydedin, ardından “SMTP / test iletisi” düğmesine basın ve iletinin geldiğini doğrulayın.",
        "Ayarlar → Yönetici onayları sekmesinde “Onay beklerken e-posta gönder” seçeneğinin açık olduğunu kontrol edin.",
      ],
    },
    {
      t: "table",
      headers: ["Belirti", "Olası neden", "Ne yapılır"],
      rows: [
        ["Bağlantı zaman aşımı", "Güvenlik duvarı veya yanlış port", "Sunucudan posta sunucusuna portu kontrol edin"],
        ["Kimlik doğrulama hatası", "Kullanıcı veya parola yanlış; hesap SMTP’e kapalı", "Hesabı posta yöneticisiyle doğrulayın"],
        ["Test iletisi geldi, onay maili gelmiyor", "Onay ayarı kapalı veya amirin e-postası boş", "Personel kartında amirin e-posta adresini ve onay ayarını kontrol edin"],
        ["Sertifika hatası", "Self-signed sertifika", "Şifrelemeyi kurum politikasına göre seçin; güvenilir CA kullanın"],
      ],
    },

    { t: "h1", text: "Active Directory (LDAP / LDAPS)" },
    {
      t: "p",
      text: "AD entegrasyonu iki iş yapar: kullanıcıların kurum hesabıyla giriş yapması ve AD grup üyeliğinin uygulamadaki role çevrilmesi. Uygulama önce servis hesabıyla bağlanır, kullanıcıyı sAMAccountName ile arar, kullanıcının parolasını doğrular ve gruplarını (memberOf) okur.",
    },
    { t: "img", src: "/guides/mimari-ad.svg", alt: "AD akışı", caption: "AD giriş akışı (şema)." },
    { t: "h2", text: "AD tarafı hazırlığı" },
    {
      t: "ol",
      items: [
        "“Active Directory Kullanıcıları ve Bilgisayarları” aracında bu uygulamaya özel bir servis hesabı oluşturun (örn. svc-bthy). Yalnızca okuma yetkisi yeterlidir; yönetici yetkisi vermeyin.",
        "Parolanın süresiz olmasını isterseniz “Parola süresiz geçerli” işaretleyin ve parolayı kurum kasasında saklayın.",
        "Uygulamadaki rolleri temsil eden gruplar oluşturun (örn. GG_BT_Destek, GG_BilgiGuvenligi, GG_Yoneticiler) ve ilgili kullanıcıları ekleyin.",
        "LDAPS kullanacaksanız etki alanı denetleyicisinde geçerli bir sunucu sertifikası olduğunu doğrulayın (636/TCP).",
        "Uygulama sunucusundan DC adının çözüldüğünü ve portun açık olduğunu kontrol edin.",
      ],
    },
    { t: "h2", text: "Uygulama tarafı" },
    { t: "img", src: "/guides/yonetim-ad.svg", alt: "AD ayarları", caption: CAP },
    {
      t: "ol",
      items: [
        "Ayarlar → Active Directory sekmesini açın ve “AD entegrasyonunu aç” kutusunu işaretleyin (1).",
        "Sunucu / domain: DC adı veya IP (örn. dc01.kurum.local) (2).",
        "Port: LDAP için 389, LDAPS için 636. LDAPS’ı kullanacaksanız “LDAPS kullan” kutusunu işaretleyin.",
        "Base DN: aramanın başlayacağı kök (örn. DC=kurum,DC=local) (3).",
        "Bind DN / kullanıcı: servis hesabının UPN’si (svc-bthy@kurum.local) veya DN’si (4).",
        "Bind parolası: servis hesabının parolası. Boş bırakırsanız kayıtlı parola korunur.",
        "Kullanıcı ve grup filtreleri varsayılan değerlerle çalışır; yalnızca kurumunuzda farklı bir yapı varsa değiştirin.",
        "Kaydedin, ardından “Bağlantıyı dene” düğmesine basın; servis hesabıyla bağlanabildiği doğrulanır.",
      ],
    },
    {
      t: "table",
      headers: ["Alan", "Örnek", "Açıklama"],
      rows: [
        ["Sunucu / domain", "dc01.kurum.local", "DC’nin FQDN veya IP adresi"],
        ["Port", "389 / 636", "LDAPS için 636"],
        ["Base DN", "DC=kurum,DC=local", "Kullanıcı ve grupların altında olduğu kök"],
        ["Bind DN / kullanıcı", "svc-bthy@kurum.local", "UPN veya tam DN"],
        ["Kullanıcı filtresi", "(&(objectCategory=person)(objectClass=user))", "Varsayılan; ayrıca kullanıcı adı ile aranır"],
        ["Grup filtresi", "(objectClass=group)", "Varsayılan"],
      ],
    },
    { t: "h2", text: "Grupları role eşleme" },
    { t: "img", src: "/guides/yonetim-rbac.svg", alt: "Yetkilendirme sekmesi", caption: CAP },
    {
      t: "ol",
      items: [
        "Ayarlar → Yetkilendirme sekmesini açın.",
        "“Eşleşme yoksa AD rolü” alanını genelde Kullanıcı olarak bırakın (1).",
        "“Grup eşlemesi ekle” ile her AD grubunun adını ve karşılığı olan rolü seçin (2, 3).",
        "Kaydedin. Grup adı büyük/küçük harf fark etmeksizin birebir eşleşmelidir. Kullanıcı birden fazla eşlenmiş gruba üyeyse yetkisi en yüksek olan rol uygulanır (Kullanıcı < Birim amiri < Üst amir < Bilgi güvenliği yöneticisi < Sistem yöneticisi < Süper yönetici).",
        "Personel kartındaki “rol kaynağı” alanı belirleyicidir: Manuel ise elle atanan rol, Active Directory ise gruplardan gelen rol, “AD + manuel” ise ikisinden yüksek olanı geçerlidir.",
        "Ayarlar → Modül yetkileri sekmesinde hangi rolün hangi menüyü göreceğini belirleyin.",
      ],
    },
    { t: "h2", text: "Doğrulama" },
    {
      t: "ol",
      items: [
        "Başka bir tarayıcı penceresinde giriş sayfasını açın ve bir AD kullanıcısıyla giriş yapın (kullanıcı adı: sAMAccountName).",
        "Personel sayfasında kullanıcının otomatik oluştuğunu ve rolünün doğru geldiğini kontrol edin.",
        "Yanlış parola ile denemeyi yapın; kilit eşiğinin (Güvenlik sayfası) çalıştığını doğrulayın.",
      ],
    },
    {
      t: "table",
      headers: ["Belirti", "Olası neden", "Ne yapılır"],
      rows: [
        ["Bağlantı kurulamıyor", "DNS çözülmüyor veya port kapalı", "Sunucudan DC adı ve portu test edin; IP ile deneyin"],
        ["Servis hesabı bind hatası", "Hesap adı biçimi veya parola yanlış", "UPN ile deneyin; hesabın kilitli olmadığını kontrol edin"],
        ["Kullanıcı bulunamıyor", "Base DN yanlış", "Base DN’i kullanıcıların bulunduğu kök ile eşleştirin"],
        ["Giriş oluyor ama rol yanlış", "Grup adı eşlemede farklı yazılmış", "AD’deki grup adını birebir yazın; Eşleşme yoksa rolü kontrol edin"],
        ["LDAPS hatası", "Sertifika güvenilmiyor", "Kurum CA sertifikasını sunucuya tanıtın veya TLS doğrulamasını gözden geçirin"],
      ],
    },
    {
      t: "note",
      title: "İç yapı notu",
      text: "AD istemcisi uygulama içinde yazılmış basit bir LDAP istemcisidir (bind ve arama). Karmaşık AD yapılarında (iç içe gruplar, çok orman) sonuç farklı olabilir; canlıya almadan önce gerçek kullanıcılarla deneyin. Bu rehber bağlantıyı gerçek bir AD ortamında doğrulanmış olarak sunmaz.",
    },

    { t: "h1", text: "SIEM (CEF / Syslog)" },
    {
      t: "p",
      text: "Uygulama, kayıt oluşturma gibi olayları SIEM sisteminize tek satırlık log olarak gönderir. İki biçim vardır: CEF (ArcSight, QRadar gibi araçlar anlar) ve düz Syslog (RFC 5424). Taşıma UDP, TCP veya TLS olabilir.",
    },
    { t: "img", src: "/guides/mimari-siem.svg", alt: "SIEM akışı", caption: "SIEM log akışı (şema)." },
    { t: "h2", text: "SIEM tarafı hazırlığı" },
    {
      t: "ol",
      items: [
        "SIEM veya log toplayıcıda bir dinleyici (syslog input) açın: UDP 514, TCP 514 veya TLS 6514.",
        "Kaynak olarak uygulama sunucusunun IP adresine izin verin.",
        "Biçimi belirleyin: CEF dinleyicisi mi, genel syslog mu? (Ürününüzün belgesine bakın.)",
        "TLS kullanıyorsanız sunucu sertifikasını hazırlayın.",
      ],
    },
    { t: "h2", text: "Uygulama tarafı" },
    { t: "img", src: "/guides/yonetim-siem.svg", alt: "SIEM ayarları", caption: CAP },
    {
      t: "ol",
      items: [
        "Ayarlar → SIEM sekmesini açın ve “SIEM gönderimini aç” kutusunu işaretleyin (1).",
        "SIEM adresi: toplayıcının FQDN veya IP’si (2).",
        "Port ve protokolü seçin (3): UDP 514, TCP 514 veya TLS 6514.",
        "Log formatı: CEF veya Syslog (4). CEF’te Device Vendor / Product / Version alanlarını kurum standardınıza göre yazın.",
        "Syslog seçtiyseniz uygulama adı ve facility (örn. Local0 = 16) alanlarını ayarlayın.",
        "Kaydedin ve “Test kaydı gönder” düğmesine basın.",
        "SIEM’de test kaydının geldiğini arayarak doğrulayın.",
      ],
    },
    {
      t: "table",
      headers: ["Protokol", "Port", "Ne zaman"],
      rows: [
        ["UDP", "514", "Basit ve hızlı; teslim garantisi yoktur, kayıp olabilir"],
        ["TCP", "514", "Bağlantılı; kayıp riski daha düşük, şifreleme yok"],
        ["TLS", "6514", "Şifreli taşıma; önerilen yöntem"],
      ],
    },
    {
      t: "p",
      text: "Örnek CEF satırının yapısı: CEF:0|Üretici|Ürün|Sürüm|Olay kodu|Olay adı|Önem|anahtar=değer … Uygulamada olay adı örneğin “… oluşturuldu” biçimindedir; onay bekleyen kayıtlar daha yüksek önemle gönderilir. Gönderilen olaylar kayıt oluşturma anlarıdır (envanter, ITIL kayıtları, API ile açılan kayıtlar).",
    },
    {
      t: "table",
      headers: ["Belirti", "Olası neden", "Ne yapılır"],
      rows: [
        ["Test kaydı gitti ama SIEM’de yok (UDP)", "Güvenlik duvarı veya dinleyici yok", "SIEM’de dinleyiciyi ve kaynak IP iznini kontrol edin; TCP deneyin"],
        ["TLS bağlantı hatası", "Sertifika adı adresle uyuşmuyor", "Adresi sertifikadaki ad ile aynı yazın"],
        ["Satırlar geliyor ama ayrışmıyor", "Biçim yanlış (CEF yerine Syslog)", "SIEM dinleyicisinin biçimini uygulamayla eşleyin"],
        ["Uygulama yavaşlıyor", "SIEM hedefi yanıt vermiyor", "Gönderim kısa zaman aşımıyla yapılır; hedefi onarın veya kapatın"],
      ],
    },

    { t: "h1", text: "Zafiyet tarayıcıları (Nessus, Tenable, Qualys, OpenVAS, Rapid7, genel)" },
    {
      t: "p",
      text: "Zafiyet yönetimine bulgu almanın iki yolu vardır. Birincisi uygulamanın tarayıcının API adresine tek bir GET isteği atıp yanıtı okumasıdır (“Tarayıcıdan çek”). İkincisi tarayıcıdan veya bir betikten uygulamanın API’sine bulgu göndermektir (POST /api/v1/zafiyet). Gerçek ortamda ikincisi daha esnek ve sağlamdır.",
    },
    { t: "img", src: "/guides/mimari-tarayici.svg", alt: "Tarayıcı akışı", caption: "Tarayıcı bağlantısı (şema)." },
    {
      t: "note",
      title: "Dürüst sınırlama",
      text: "“Tarayıcıdan çek” tek bir adres okur ve yanıttan bulguları tahmin eder. Nessus ve Tenable’ın /scans adresi tarama listesini verir, her cihazın bulgularını değil. Ayrıntılı bulgu için tarama kimliği içeren bir adres vermeniz gerekir ya da bulguları API ile göndermelisiniz. Bu bağlantılar gerçek tarayıcılarla sizin ortamınızda denenmelidir; bu rehber bunları doğrulanmış olarak sunmaz.",
    },
    { t: "h2", text: "Ortak adımlar" },
    { t: "img", src: "/guides/yonetim-tarayici.svg", alt: "Tarayıcı ayarları", caption: CAP },
    {
      t: "ol",
      items: [
        "Ayarlar → Zafiyet tarama sekmesini açın.",
        "Başlangıçta “Örnek tarama kaynağı kullan” açıktır; bu demo veriyle çalışır. Gerçek cihaza geçerken kapatın.",
        "“Tarama cihazı bağlantısını aç” kutusunu işaretleyin (1).",
        "Cihaz / ürün listesinden ürünü seçin (2); port ve API yolu varsayılanla dolar.",
        "Cihaz adresini yazın (3) ve protokolü HTTPS seçin. Self-signed sertifika kullanıyorsanız TLS doğrulamasını kapalı bırakın.",
        "Kimlik bilgilerini girin (4): Nessus / Tenable için access ve secret key; Qualys, OpenVAS, Rapid7 için kullanıcı adı ve parola.",
        "Kritik ve yüksek termin günlerini belirleyin (varsayılan 7 ve 14).",
        "“Envanter ile otomatik eşle” açıksa bulgu aynı IP veya cihaz adlı varlığa bağlanır.",
        "Kaydedin, “Bağlantıyı dene” ile erişimi doğrulayın; sonra Zafiyet sayfasında “Tarayıcıdan çek” ile deneyin.",
      ],
    },
    {
      t: "table",
      headers: ["Ürün", "Varsayılan port / yol", "Kimlik doğrulama", "API anahtarı / hesap nasıl alınır"],
      rows: [
        ["Nessus", "8834 · /scans", "X-ApiKeys (access + secret)", "Nessus arayüzü → kullanıcı menüsü → My Account → API Keys → Generate"],
        ["Tenable.io / Tenable.sc", "443 · /scans", "X-ApiKeys (access + secret)", "Tenable.io: My Account → API Keys → Generate. Tenable.sc için ürün belgesine bakın"],
        ["Qualys VMDR", "443 · /api/2.0/fo/asset/host/vm/detection/?action=list", "Temel kimlik (kullanıcı/parola) + X-Requested-With", "Qualys’te API erişimi olan bir kullanıcı oluşturun; API sunucusu bölgenize özeldir (örn. qualysapi.qualys.eu)"],
        ["OpenVAS / Greenbone", "9392 · /api/v2/vulnerabilities", "Temel kimlik", "Greenbone kullanıcısı. Varsayılan yol Greenbone’un standart yolu değildir; kendi ağ geçidinizin yolunu yazın"],
        ["Rapid7 InsightVM", "3780 · /api/3/vulnerabilities", "Temel kimlik", "Konsolda API erişimi olan kullanıcı. Bu yol zafiyet tanımlarını verir, cihaz bazlı bulguları değil"],
        ["Genel REST API", "443 · /api/vulnerabilities", "Anahtar veya temel kimlik", "JSON dizisi dönen herhangi bir adres; alan adları tahmin edilir (title, severity, cve, hostname…)"],
      ],
    },
    {
      t: "h2",
      text: "Önerilen yöntem: API ile bulgu göndermek",
    },
    {
      t: "ol",
      items: [
        "API arayüzü sayfasında “API anahtarları” bölümünden zafiyet:write kapsamlı bir anahtar üretin; mümkünse izinli IP girin ve geçerlilik süresini kısa tutun.",
        "Anahtarı yalnızca bir kez göreceksiniz; kasaya kaydedin.",
        "Tarama sonuçlarını (CSV/JSON) bir betikle okuyup her bulgu için POST /api/v1/zafiyet çağırın.",
        "externalId alanına tarayıcıdaki bulgu kimliğini koyun; aynı kimlik tekrar gelirse yinelenmez.",
      ],
    },
    {
      t: "table",
      headers: ["Alan", "Zorunlu", "Açıklama"],
      rows: [
        ["deviceName / deviceIp / cve", "En az biri", "Cihaz adı, IP veya CVE numarası"],
        ["severity", "Hayır", "LOW, MEDIUM, HIGH veya CRITICAL (varsayılan MEDIUM)"],
        ["description", "Hayır", "Açıklama (en fazla 4000 karakter)"],
        ["dueDate", "Hayır", "Termin, YYYY-MM-DD"],
        ["source", "Hayır", "MANUAL veya SCANNER"],
        ["scannerVendor", "Hayır", "Aracın adı (örn. Nessus, SAST)"],
        ["externalId", "Hayır", "Yinelenmeyi önleyen dış kimlik"],
      ],
    },
    {
      t: "note",
      title: "Örnek (denenmemiş taslak)",
      text: "curl -X POST https://UYGULAMA/api/v1/zafiyet -H \"Authorization: Bearer bth_…\" -H \"Content-Type: application/json\" -d '{\"deviceIp\":\"10.0.0.15\",\"cve\":\"CVE-2026-12345\",\"severity\":\"HIGH\",\"dueDate\":\"2026-11-30\",\"source\":\"SCANNER\",\"scannerVendor\":\"Nessus\",\"externalId\":\"nessus-123-7\"}'. Adres ve anahtarı kendi ortamınıza göre değiştirin; kendi ortamınızda deneyin.",
    },
    {
      t: "table",
      headers: ["Belirti", "Olası neden", "Ne yapılır"],
      rows: [
        ["HTTP 401/403", "Anahtar veya parola yanlış; API kapalı", "Anahtarı yeniden üretin; kullanıcıya API izni verin"],
        ["Bağlantı sertifika hatası", "Self-signed sertifika", "TLS doğrulamasını kapalı tutun veya CA’yı güvenilir yapın"],
        ["“JSON veya Qualys XML döndürmedi”", "Yol yanlış, giriş sayfası dönüyor", "Adresi tarayıcının API belgesinden doğrulayın"],
        ["Çekme başarılı ama 0 bulgu", "Yol bulgu değil tarama listesi veriyor", "Tarama kimlikli adres verin veya API ile gönderin"],
        ["Bulgu envantere bağlanmıyor", "IP/cihaz adı eşleşmiyor", "Envanter kaydındaki IP ve adı tarayıcıdakiyle aynı yapın"],
      ],
    },

    { t: "h1", text: "Yönetici onayları ve iş akışları" },
    { t: "img", src: "/guides/yonetim-onay.svg", alt: "Yönetici onayları", caption: CAP },
    {
      t: "ol",
      items: [
        "Ayarlar → Yönetici onayları: birim amiri, üst amir ve bilgi güvenliği kademelerini seçin (1).",
        "“Onay beklerken e-posta gönder” seçeneğini SMTP kurulduktan sonra açın (4).",
        "Onayın hangi kayıt türlerinde uygulanacağını belirleyin: talepler, değişiklikler, yamalar (5).",
        "Onay süresini saat olarak yazın (8); süre dolunca kayıt gecikmiş sayılır.",
        "Daha karmaşık akış için Ayarlar → İş akışları sayfasında grafik akış tasarlayın: başlangıç, onay, koşul ve bitiş düğümleri.",
        "Personel kayıtlarında amir alanlarının dolu olduğunu kontrol edin; boşsa birim amiri adımı onaycı bulamaz.",
      ],
    },
    { t: "img", src: "/guides/akis-onay-zinciri.svg", alt: "Onay zinciri", caption: "Onay zinciri (şema)." },
    {
      t: "note",
      title: "İki ayrı akış türü",
      text: "Süreç akışları menüsündeki şablonlar yalnızca takip içindir. Onay zinciri Ayarlar → İş akışları ve Yönetici onayları ile tanımlanır. Bir akış çalışırken ilgili kaydın alanları API ile değiştirilemez.",
    },

    { t: "h1", text: "Modül yetkileri, güvenlik ve lisans" },
    {
      t: "ul",
      items: [
        "Modül yetkileri: hangi rolün hangi modülü hangi düzeyde (görme, işleme, yönetme) kullanacağı. Menüler buna göre görünür.",
        "Güvenlik (Ayarlar → Güvenlik): en az parola uzunluğu, oturum süresi, kilit için hatalı giriş sayısı ve kilit süresi. Kurum politikasına göre ayarlayın.",
        "Lisans (Ayarlar → Lisans): lisans dosyasını yükleyin. Süresi dolan veya modülü içermeyen özellikler kısıtlı modda çalışır; API de lisanssız modüle 403 döner.",
        "Puanlama ve Görünüm: puan kuralları ve tema ayarları.",
        "Audit log: tüm ayar ve kayıt değişikliklerinin kimin tarafından yapıldığı.",
      ],
    },

    { t: "h1", text: "API anahtarları ve dış sistemler" },
    {
      t: "ol",
      items: [
        "API arayüzü → API anahtarları: ad, bağlı personel, geçerlilik (gün) ve izinli IP/CIDR girin.",
        "Kapsamları en dar şekilde seçin (örn. yalnızca zafiyet:write).",
        "Anahtarı yalnızca bir kez görürsünüz; CI/CD sırlarında saklayın.",
        "Çağrılarda Authorization: Bearer bth_… başlığı kullanılır.",
        "Anahtar sızarsa hemen iptal edin ve yenisini üretin.",
      ],
    },
    {
      t: "table",
      headers: ["Kapsam", "Ne yapar"],
      rows: [
        ["envanter:read / write", "Envanter okuma / kayıt"],
        ["talepler:read / write", "Talepler"],
        ["personel:read", "Personel listesi"],
        ["zafiyet:read / write", "Zafiyet okuma / kayıt açma"],
        ["olay:read / write", "Olaylar"],
        ["problem:read", "Problemler"],
        ["degisiklik:read / write", "Değişiklik okuma / kayıt açma"],
        ["yama:read", "Yamalar"],
      ],
    },

    { t: "h1", text: "TLS ve sertifikalar" },
    {
      t: "p",
      text: "Varsayılan olarak entegrasyon bağlantılarında (AD LDAPS, SIEM TLS, SMTP, tarayıcı HTTPS) sertifika doğrulaması gevşektir; iç ağdaki self-signed sertifikalarla çalışabilmesi için böyledir. Kurumunuz güvenilir bir CA kullanıyorsa katı doğrulamayı açın: docker-compose ortamında INTEGRATION_TLS_STRICT=true değerini verin ve uygulamayı yeniden başlatın. Bu durumda sertifikanın güvenilir olması ve adın eşleşmesi gerekir.",
    },

    { t: "h1", text: "Yedekleme ve geri yükleme" },
    {
      t: "ol",
      items: [
        "Veritabanı + lisans + yüklemeler için yedekle-docker betiğini çalıştırın (yedekler klasörüne yazar).",
        "Yalnızca ayarlar için Ayarlar → Yedek sekmesinden JSON yedek indirin; geri yüklemeden önce mevcut ayarlar yedek/config altına kopyalanır.",
        "Geri yükleme: geri-yukle-docker betiği ile db yedeği (ve varsa dosyalar arşivi) verilir.",
        "Yedeği başka bir yere de kopyalayın ve geri yüklemeyi bir test ortamında deneyin.",
        "Güncelleme öncesi her zaman yedek alın (guncelle-docker).",
      ],
    },

    { t: "h1", text: "Kontrol listesi" },
    {
      t: "ul",
      items: [
        "SMTP test iletisi geldi.",
        "AD servis hesabıyla bağlantı denendi, bir AD kullanıcısı girebildi, rol doğru.",
        "SIEM’de test kaydı görüldü.",
        "Zafiyet tarayıcıdan veya API’den en az bir bulgu geldi ve envantere bağlandı.",
        "Onay zinciri bir deneme kaydıyla uçtan uca çalıştırıldı.",
        "Modül yetkileri her rol için bir deneme hesabıyla kontrol edildi.",
        "Yedek alındı ve geri yükleme denendi.",
        "Lisans geçerli ve süre takvime işlendi.",
      ],
    },
  ],
};
