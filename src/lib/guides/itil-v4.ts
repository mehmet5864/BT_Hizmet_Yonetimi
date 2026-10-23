import type { Guide } from "./types";

export const ITIL_V4_GUIDE: Guide = {
  file: "itil-v4-kilavuzu.pdf",
  title: "ITIL 4 Kılavuzu",
  subtitle: "Hizmet değeri, pratikler ve bu uygulamadaki 17 süreç",
  audience: "Hizmet masası, süreç sahipleri, birim amirleri ve BT yöneticileri",
  version: "1.0",
  date: "1 Ekim 2026",
  intro:
    "Bu belge ITIL 4’ün kurumda nasıl düşünüleceğini ve BT Hizmet Yönetimi uygulamasında hangi ekranın hangi pratiğe karşılık geldiğini anlatır. Ekran adları Türkçe arayüzledir. ITIL, Axelos / PeopleCert çerçevesidir; bu kılavuz eğitim ve işletme içi uygulama notudur, sertifika müfredatının yerine geçmez.",
  blocks: [
    { t: "h1", text: "Bu kılavuzu kim, nasıl kullanır" },
    {
      t: "p",
      text: "ITIL 4 (Information Technology Infrastructure Library, 4. sürüm) bir yazılım ürünü değil, hizmet yönetimi için ortak dil ve çalışma modelidir. Amaç, BT’nin “sunucu açmak / ticket kapatmak” değil, iş birimine ölçülebilir değer üretmesini sağlamaktır. Bu uygulamada 17 pratik menüye alınmıştır; 1.3.0’daki envanter, talep, olay, problem, değişiklik, yama, CMDB ve firma/SLA ekranları durur. Yeni süreçler 2.0.0 ile eklenir, volume silinmez.",
    },
    {
      t: "ul",
      items: [
        "Hizmet masası ve L1 analist: olay / talep ayrımı, öncelik, ilk temas, bilinen hata.",
        "Süreç sahibi ve sistem yöneticisi: katalog, SLA, kapasite, süreklilik, sürüm kayıtları.",
        "Birim amiri ve üst yönetici: onay, değişiklik, hizmet değerlendirme.",
        "Bilgi güvenliği yöneticisi: zafiyet, problem, değişiklik onayı, süreklilik senaryosu.",
        "Son kullanıcı: bu belgeyi okumak zorunda değildir; Kullanıcı kılavuzu yeterlidir.",
      ],
    },
    {
      t: "note",
      title: "Menü yolu",
      text: "Kılavuzlar → ITIL 4 kılavuzu (bu sayfa). PDF: /docs/itil-v4-kilavuzu.pdf. Süreç haritası: ITIL süreçleri (/hizmetler). Ayarlar → Görünüm → “ITIL 2.0 süreç menüsü” kapatılırsa 1.3.0 menüsü gelir; kayıt silinmez.",
    },
    {
      t: "table",
      headers: ["Belge", "Ne zaman"],
      rows: [
        ["Kullanıcı kılavuzu", "Giriş, talep açma, zimmet, onay"],
        ["Yönetici kılavuzu", "Rol, AD, SIEM, servis masası kuyruğu"],
        ["API kılavuzu", "REST v1, anahtar, OpenAPI"],
        ["ITIL 4 kılavuzu (bu belge)", "Süreç dili, pratik–ekran eşlemesi, senaryolar"],
      ],
    },

    { t: "h1", text: "ITIL 4 nedir, v3’ten ne değişti" },
    {
      t: "p",
      text: "ITIL 3 hizmeti beş yaşam döngüsü evresine ayırırdı: Strateji, Tasarım, Geçiş, Operasyon, Sürekli İyileştirme. Bu evreler hâlâ işe yarar bir planlama iskeletidir; uygulamanın menü grupları (Tasarım, Operasyon, Geçiş, Değerlendirme) bilinçli olarak bu dile yakındır. ITIL 4 ise evreyi merkeze koymaz. Merkez, Hizmet Değer Sistemi’dir (Service Value System, SVS): kuruluşun talebi değere dönüştürme biçimi.",
    },
    {
      t: "h2",
      text: "Neden v4",
    },
    {
      t: "ul",
      items: [
        "Çevik, DevOps ve yalın (lean) ile yan yana durur; “önce 40 sayfalık süreç belgesi” zorunlu değildir.",
        "Değer, sonuç, maliyet ve risk birlikte konuşulur (VOCR). Yalnızca kesinti süresi yetmez.",
        "34 pratik vardır; hepsini aynı anda kurmak gerekmez. Bu kurum 17’sini seçmiş ve ekrana bağlamıştır.",
        "Yönlendirici ilkeler günlük kararı süreç belgesinden önce tutar.",
      ],
    },
    {
      t: "h2",
      text: "v3 yaşam döngüsü bu uygulamada nerede durur",
    },
    {
      t: "table",
      headers: ["v3 evresi", "Bu uygulamadaki karşılık"],
      rows: [
        ["Hizmet stratejisi", "Katalog sahipliliği, değerlendirme kaydı, iş hedefi alanları"],
        ["Hizmet tasarımı", "Menü: Tasarım — tasarım, SLA, kullanılabilirlik, kapasite, süreklilik, doğrulama"],
        ["Hizmet geçişi", "Değişiklik, yama, sürüm, CMDB güncellemesi"],
        ["Hizmet operasyonu", "Hizmet masası, olay, problem, izleme, talep"],
        ["Sürekli iyileştirme", "Değerlendirme pratiği, SLA ihlal notu, problem kalıcı çözümü"],
      ],
    },
    {
      t: "note",
      title: "Kapsam",
      text: "ITIL 4’ün 34 pratiğinin tamamı bu yazılımda yoktur (ör. iş analizi, proje yönetimi, iş gücü ve yetenek). Eksik pratik, o işin yapılmayacağı anlamına gelmez; başka araç veya tutanakla yürür. Bu kılavuz, uygulamada olan 17 pratik ve onları besleyen kavramlar üzerinedir.",
    },

    { t: "h1", text: "Temel kavramlar" },
    {
      t: "h2",
      text: "Hizmet, ürün, değer",
    },
    {
      t: "p",
      text: "Hizmet, müşterinin (iş biriminin) belirli sonuçlara, belirli maliyet ve riskle ulaşmasını sağlayan bir değer sunma biçimidir. Ürün, hizmeti mümkün kılan kaynakların yapılandırılmış halidir: sunucu, lisans, ağ, uygulama, destek sözleşmesi. Değer, algılanan fayda, yararlılık ve önemdir; yalnızca “sistem ayakta” demek değer değildir. Kullanıcı evrakı zamanında imzalayabiliyorsa e-posta hizmeti değer üretiyordur.",
    },
    {
      t: "h2",
      text: "VOCR — değer, sonuç, maliyet, risk",
    },
    {
      t: "table",
      headers: ["Boyut", "Soru", "Uygulamada"],
      rows: [
        ["Değer (Value)", "Bu hizmet kime, ne kazandırır?", "Katalog kısa tanım, değerlendirme “hedeflenen iş değeri”"],
        ["Sonuç (Outcome)", "Hangi iş sonucu değişir?", "Tasarım kaydı: iş hedefi"],
        ["Maliyet (Cost)", "Kurulum + işletme + lisans?", "Envanter, lisans türü, firma ürün adedi"],
        ["Risk (Risk)", "Kesinti, sızıntı, uyumsuzluk?", "Kritiklik, zafiyet, süreklilik RTO/RPO, değişiklik etkisi"],
      ],
    },
    {
      t: "h2",
      text: "Fayda (utility) ve güvence (warranty)",
    },
    {
      t: "p",
      text: "Fayda “işe yarıyor mu” sorusudur (doğru işlev). Güvence “güvenilir, yeterli kapasitede, sürekli ve güvenli mi” sorusudur. Bir VPN hem bağlanmalı (fayda) hem mesai + nöbette ayakta, yetkisiz ağa düşmeden çalışmalıdır (güvence). Katalogdaki hizmet saati, SLA %, müdahale/çözüm saati güvence taahhüdüdür; erişim şartları ve kısa tanım faydayı tarif eder.",
    },
    {
      t: "h2",
      text: "Kuruluş, tüketici, kullanıcı, sponsor",
    },
    {
      t: "ul",
      items: [
        "Hizmet tüketicisi: hizmeti alan iş birimi (ör. Mali İşler).",
        "Kullanıcı: fiilen oturum açan kişi (personel kartı).",
        "Müşteri / hizmet sahibi: kapsam ve SLA’yı kabul eden taraf (katalogdaki hizmet sahibi).",
        "Sponsor: bütçeyi onaylayan (değerlendirme paydaşı, üst amir).",
        "Hizmet sağlayıcı: bu uygulamayı işleten BT örgütü.",
      ],
    },

    { t: "h1", text: "Hizmet yönetiminin dört boyutu" },
    {
      t: "p",
      text: "ITIL 4 her hizmeti dört boyutta düşünmeyi ister. Bir boyut ihmal edilirse hizmet kağıt üzerinde doğru, sahada kırılgan olur. Yeni katalog hizmeti veya tasarım kaydı açmadan önce bu dört soruyu yazın.",
    },
    {
      t: "table",
      headers: ["Boyut", "İçerik", "Bu uygulamada bakılacak yer"],
      rows: [
        ["Kuruluş ve insanlar", "Rol, yetkinlik, vardiya, iletişim", "Personel, rol kaynağı, talep ofisi, nöbetçi ekip"],
        ["Bilgi ve teknoloji", "Uygulama, veri, izleme, otomasyon", "CMDB, envanter, izleme kaydı, yama / zafiyet"],
        ["İş ortakları ve tedarikçiler", "Bakım firması, bulut, lisans", "Firma / SLA, ürün, şartname, 3 seviye"],
        ["Değer akışları ve süreçler", "İşin adım adım akışı", "Talep türü, değişiklik onay birimleri, sürüm penceresi"],
      ],
    },
    {
      t: "note",
      title: "Örnek",
      text: "Yeni EBYS tarayıcı sürümü: insanlar (tarama operatörü eğitimi), teknoloji (sunucu + tarayıcı CI), tedarikçi (yazılım bakım SLA’sı), değer akışı (tarama → OCR → imza → arşiv). Bunlardan biri eksikse “sürüm dağıtıldı” kaydı değer üretmez.",
    },

    { t: "h1", text: "Hizmet değer sistemi (SVS)" },
    {
      t: "p",
      text: "SVS, fırsat ve talebin soldan girip sağdan değer olarak çıkmasını tarif eder. Beş parça bir arada durur: yönlendirici ilkeler, yönetişim, hizmet değer zinciri, pratikler, sürekli iyileştirme. Uygulama pratikleri ve değer zinciri adımlarını ekrana bağlar; yönetişim Ayarlar, roller ve onay akışıdır; ilkeler bu kılavuzun çalışma ahlakıdır.",
    },
    {
      t: "ol",
      items: [
        "Fırsat / talep: kullanıcı portalı, izleme alarmı, denetim bulgusu, yeni yasa.",
        "SVS içinde çalışma: katalogdan hizmet seçilir veya olay/değişiklik açılır.",
        "Değer: kesinti biter, yetki verilir, yeni hizmet canlıya alınır, ihlal raporu çıkar.",
      ],
    },
    {
      t: "h2",
      text: "Yönetişim bu üründe nasıl görünür",
    },
    {
      t: "ul",
      items: [
        "Manuel rol veya AD grup eşlemesi (Ayarlar): kim hangi kuyruğu görür.",
        "Talep şubeleri ve şube yöneticisi: talebin hangi ofise düşeceği.",
        "Değişiklik: onay alınacak birim sayısı + bilgi güvenliği yöneticisi.",
        "Envanter ekleme/silme onayları (süper yönetici veya envanter yöneticisi).",
        "ITIL 2.0 menü anahtarı: süreç ekranlarını göstermek / 1.3.0’a dönmek.",
      ],
    },

    { t: "h1", text: "Yedi yönlendirici ilke" },
    {
      t: "p",
      text: "İlkeler, prosedür boşluğunda karar vermek içindir. Yeni bir alan veya onay basamağı eklemeden önce bunları geçirin.",
    },
    {
      t: "table",
      headers: ["İlke", "Anlamı", "Sahada"],
      rows: [
        ["Değere odaklan", "İş sonucu yoksa işlem yok", "Katalogda işe yaramayan “hayalet hizmet” açmayın"],
        ["Olduğu yerden başla", "Mevcut CMDB, AD, izlemeyi atma", "1.3.0 kayıtlarını silmeden 2.0 süreç eklenir"],
        ["Geri bildirimle ilerle", "Küçük dilim, ölç, düzelt", "Sürüm geri alma planı; değerlendirme tavsiyesi"],
        ["İşbirliği et, görünür kıl", "Gizli kuyruk olmasın", "Talep ofisi, zimmet, denetim izi"],
        ["Bütünsel düşün", "Dört boyut", "Yalnızca sunucu kaydı yetmez; lisans + firma + SLA"],
        ["Basit ve pratik tut", "Adım ekleme maliyeti", "Talep formundan gereksiz amir alanı 1.2.8’de kalktı"],
        ["İyileştir ve otomatikleştir", "Önce akış, sonra bot", "API ve izleme; bozuk süreci otomatikleştirmeyin"],
      ],
    },

    { t: "h1", text: "Hizmet değer zinciri" },
    {
      t: "p",
      text: "Değer zinciri altı etkinliktir. Bir pratik birkaç etkinlikte kullanılır. “Olay yönetimi yalnızca operasyondur” demek yanlıştır; majör olay iyileştirmeyi ve tasarımı da besler.",
    },
    {
      t: "table",
      headers: ["Etkinlik", "İş", "Menü"],
      rows: [
        ["Plan (Planla)", "Vizyon, mimari, kaynak", "Tasarım, kapasite, katalog sahibi"],
        ["Improve (İyileştir)", "Ölçülen sapmayı kapat", "Problem, değerlendirme, SLA ihlal notu"],
        ["Engage (Paydaşla çalış)", "Talep, şikayet, beklenti", "Hizmet masası, katalog erişim şartı"],
        ["Design & transition", "Yeni/değişen hizmeti hazırla", "Tasarım, doğrulama, değişiklik, sürüm"],
        ["Obtain/build (Elde et / inşa et)", "Satın al, kur, geliştir", "Envanter, yama, firma ürünü"],
        ["Deliver & support", "Çalışır durumda tut", "Olay, izleme, zimmet, firma arızası"],
      ],
    },
    {
      t: "h2",
      text: "Akış örneği — “Yazıcı basmıyor”",
    },
    {
      t: "ol",
      items: [
        "Engage: kullanıcı Hizmet masası / L1 talep veya olay açar.",
        "Deliver & support: L1 kuyruğu, zimmetli yazıcı CI, varsa bilinen hata.",
        "Obtain/build: toner yoksa envanter / satın alma; sürücü yaması varsa yama + değişiklik.",
        "Improve: aynı model üçüncü kez arızalanıyorsa problem kaydı, kök neden.",
        "Plan / design: model değişecekse katalog ve kapasite notu.",
      ],
    },

    { t: "h1", text: "Sürekli iyileştirme modeli" },
    {
      t: "p",
      text: "ITIL 4 iyileştirmeyi tek proje değil, tekrarlanan soru zinciri olarak tanımlar. Değerlendirme kaydı ve SLA rapor notu bu zincirin resmi yeridir.",
    },
    {
      t: "ol",
      items: [
        "Vizyon nedir? (iş hedefi — tasarım kaydı)",
        "Neredeyiz? (gerçekleşen kullanılabilirlik, açık zafiyet, MTTR)",
        "Nereye varmak istiyoruz? (SLA hedef %, RTO/RPO)",
        "Oraya nasıl gideriz? (problem kalıcı çözümü, değişiklik, sürüm)",
        "Harekete geçelim — onaylı değişiklik penceresi",
        "Oraya vardık mı? (değerlendirme: hedeflenen vs gerçekleşen değer)",
        "Hızı nasıl koruruz? (izleme eşiği, bilinen hata, katalog güncellemesi)",
      ],
    },

    { t: "h1", text: "Uygulamadaki 17 pratik — harita" },
    {
      t: "p",
      text: "Aşağıdaki tablo, ITIL 4 pratik adını, Türkçe menü etiketini ve kaydın açıldığı yolu verir. “1.3.0” işaretli ekranlar 2.0 öncesinden gelir ve durur.",
    },
    {
      t: "table",
      headers: ["ITIL 4 pratiği", "Menü", "Yol"],
      rows: [
        ["Service Catalogue Management", "Hizmet kataloğu", "/katalog"],
        ["Service Design", "Hizmet tasarımı", "/surec/tasarim"],
        ["Service Level Management", "Hizmet seviyesi yönetimi", "/surec/hizmet-seviyesi"],
        ["Availability Management", "Kullanılabilirlik yönetimi", "/surec/kullanilabilirlik"],
        ["Capacity and Performance", "Kapasite ve performans", "/surec/kapasite"],
        ["Service Continuity", "Hizmet sürekliliği", "/surec/sureklilik"],
        ["Service Validation and Testing", "Hizmet doğrulama ve test", "/surec/dogrulama"],
        ["IT Asset Management", "Envanter / varlık", "/envanter"],
        ["Service Configuration Management", "Konfigürasyon (CMDB)", "/konfigurasyon"],
        ["Service Desk", "Hizmet masası / talepler", "/talepler"],
        ["Incident Management", "Olay yönetimi", "/olay"],
        ["Problem Management", "Problem yönetimi", "/problem"],
        ["Service Request Management", "Hizmet talebi (aynı kuyruk)", "/talepler"],
        ["Change Enablement", "Değişiklik kontrolü", "/degisiklik"],
        ["Release Management", "Sürüm ve dağıtım", "/surec/surum"],
        ["Monitoring and Event Management", "İş takibi ve izleme", "/surec/izleme"],
        ["Service Evaluation*", "Hizmet doğrulama ve değerlendirme", "/surec/degerlendirme"],
      ],
    },
    {
      t: "note",
      title: "Ad notu",
      text: "“Service evaluation” resmi 34 pratik listesinde ayrı bir kart olarak her yayında aynı adla durmayabilir; bu üründe tasarlanan iş değeri ile gerçekleşen değerin tarafsız kıyasıdır. Firma arızası (tedarikçi SLA) ayrı modüldedir: /firma-sla — Supplier Management pratiğine yakındır, 17’nin üstüne eklenir.",
    },

    { t: "h1", text: "Hizmet kataloğu yönetimi" },
    {
      t: "p",
      text: "Katalog, kullanıcının ve BT’nin “hangi hizmetler canlı, kim kullanır, nasıl istenir, hangi taahhüt var” sorusunun tek listesidir. Teknik envanter kataloğu değildir. “Sunucu-14” katalog hizmeti olmaz; “Kurumsal e-posta” olur.",
    },
    {
      t: "h2",
      text: "Ne kaydedilir",
    },
    {
      t: "ul",
      items: [
        "Hizmet adı, kısa tanım, durum (aktif / tasarımda / kalktı), kimler kullanır.",
        "Hizmet sahibi ve sorumlu birim.",
        "Hizmet saati, kritiklik, SLA kullanılabilirlik %, müdahale ve çözüm saati.",
        "Talep şubesi: kullanıcı bu hizmeti hangi ofisten ister.",
        "Erişim şartları: kim talep eder, hangi onay, VPN / ağ.",
      ],
    },
    {
      t: "h2",
      text: "İşletme kuralları",
    },
    {
      t: "ol",
      items: [
        "Aktif kayıt kullanıcıya görünür kabul edilir; tasarımda olanı canlı gibi sunmayın.",
        "Her aktif hizmetin bir talep şubesi olsun. Şube yoksa masaya “bilinmeyen kuyruk” düşer.",
        "SLA % boşsa hizmet seviyesi yönetimi ölçemez. Hedefi katalogda yazın, dönemi süreç kaydında ölçün.",
        "Hizmet kalktıysa durumu “kullanımdan kalktı” yapın; silmek denetim izini zayıflatır.",
      ],
    },

    { t: "h1", text: "Hizmet tasarımı" },
    {
      t: "p",
      text: "Yeni veya değişen hizmetin iş hedefi, güvenlik standardı ve kullanıcı beklentisine göre kâğıda dökülmesidir. Kod yazmak veya demirbaş almak tasarımın kendisi değil, sonraki değer zinciri adımıdır.",
    },
    {
      t: "ul",
      items: [
        "Yol: ITIL süreçleri → Hizmet tasarımı → Yeni kayıt (/surec/tasarim/yeni).",
        "Zorunlu düşünce: iş hedefi, güvenlik standardı (ISO 27001, KVKK, kurum politikası), müşteri beklentisi (kesinti penceresi, self-servis).",
        "Mimari not: bileşen, bağımlılık, entegrasyon — CMDB’deki CI’larla çelişmesin.",
        "Hedef canlı tarihi: doğrulama ve sürüm pencereleri bu tarihe kilitlenir.",
      ],
    },
    {
      t: "note",
      title: "Tasarım bitmeden canlıya alma",
      text: "Doğrulama kaydı “kaldı” veya “canlıya hazır değil” iken sürüm “dağıtıldı” olmamalıdır. Değişiklik onayı, tasarım kaydındaki güvenlik standardını yok sayamaz.",
    },

    { t: "h1", text: "Hizmet seviyesi, kullanılabilirlik, kapasite, süreklilik" },
    {
      t: "h2",
      text: "Hizmet seviyesi yönetimi (SLM)",
    },
    {
      t: "p",
      text: "SLA (Service Level Agreement) iş birimi ile BT arasındaki hedeftir. OLA (Operational Level Agreement) BT içi ekipler arası; UC (Underpinning Contract / bakım sözleşmesi) tedarikçiyladır. Bu uygulamada iç SLA ölçümü /surec/hizmet-seviyesi kaydıdır. Firma ihlali /firma-sla arıza bildiriminde sayılır. İkisini tek satırda karıştırmayın.",
    },
    {
      t: "ul",
      items: [
        "Ölçüm dönemi (ay, çeyrek) + hedef % (katalogdan) + gerçekleşen % + ihlal sayısı + rapor notu.",
        "İhlal varsa problem veya değerlendirme tavsiyesine bağlayın; yalnızca yüzde yazmak SLM değildir.",
        "Müdahale / çözüm saatleri katalogda durur; olay ve firma arızası bu saate göre bakılır.",
      ],
    },
    {
      t: "h2",
      text: "Kullanılabilirlik",
    },
    {
      t: "p",
      text: "Hizmetin ihtiyaç anında, taahhüt penceresinde çalışmasıdır. Uptime hedefi, ölçüm penceresi (7/24 veya mesai), MTTR (ortalama onarım), MTBF (arızalar arası süre) ve son kesinti notu kaydedilir. Mesai SLA’sını 7/24 gibi raporlamak ihlali gizler.",
    },
    {
      t: "h2",
      text: "Kapasite ve performans",
    },
    {
      t: "p",
      text: "Bugünkü zirve yük ve 12 aylık tahmin. CPU / RAM / depolama boşluğu yüzde olarak tutulur. “Disk %92, tahmin yok” bir kapasite kaydı değil, izleme alarmıdır. Kapasite kaydı karardır: kaynak alınacak mı, hizmet kısıtlanacak mı, mimari değişecek mi.",
    },
    {
      t: "h2",
      text: "Hizmet sürekliliği (ITSCM) ve DR",
    },
    {
      t: "p",
      text: "Süreklilik, olağan kesintiden (olay) farklıdır: deprem, siber saldırı, uzun elektrik, yangın. RTO (Recovery Time Objective) hizmetin ayağa kalkma hedefi, RPO (Recovery Point Objective) kabul edilen veri kaybı penceresidir. Kurtarma yeri ve son tatbikat boşsa plan kâğıttır. Tatbikat türü doğrulama sürecinde “DR tatbikatı” olarak da işlenebilir.",
    },
    {
      t: "table",
      headers: ["Kavram", "Soru", "Yanlış kullanım"],
      rows: [
        ["SLA", "İş birimine ne söz verdik?", "Firma bakım süresini SLA sanmak"],
        ["OLA", "İç ekip kime kaç saatte döner?", "Katalogda OLA alanı yok; süreç notuna yazın"],
        ["UC / şartname", "Tedarikçi kaç saatte gelir?", "Firma / SLA 3 seviye"],
        ["RTO", "Afet sonrası ne kadar kapalı kalınır?", "Olay MTTR ile karıştırmak"],
        ["RPO", "Kaç saatlik veri kaybı kabul?", "Yedek alınmıyor ama RPO 0 yazmak"],
      ],
    },

    { t: "h1", text: "Doğrulama, sürüm, değişiklik" },
    {
      t: "h2",
      text: "Hizmet doğrulama ve test",
    },
    {
      t: "p",
      text: "Canlıya alınmadan “tasarımda yazılanı karşılıyor mu” sınamasıdır. Türler: UAT, güvenlik, performans, regresyon, DR tatbikatı. Sonuç: geçti / koşullu geçti / kaldı. Koşullu geçti ise açık hatalar alanına iş etkisi yazılır. Canlıya hazır mı: evet / hayır / beklet.",
    },
    {
      t: "h2",
      text: "Değişiklik kontrolü (Change enablement)",
    },
    {
      t: "p",
      text: "Canlı ortama bilinçli, izlenen, geri alınabilir müdahaledir. Bu formda talep eden oturumdaki kişidir; birim personel kartından kilitlidir. Önce onay alınacak birim sayısı seçilir; satırlar ona göre açılır. Bilgi güvenliği yöneticisi, değişiklik IP’si, yazılım/donanım/diğer, sanal/fiziksel, etki (kısmi / tüm sistem) ve çalışma penceresi zorunlu düşünce alanlarıdır.",
    },
    {
      t: "table",
      headers: ["ITIL değişiklik tipi", "Bu kurumda pratik"],
      rows: [
        ["Standart", "Önceden onaylı, düşük riskli tekrar iş (ör. şablon yama). Yine kayıt açın; onay sayısı 0 veya tek birim olabilir."],
        ["Normal", "Risk analizi ve birim onayları. Varsayılan yol."],
        ["Acil (emergency)", "Majör kesinti / aktif sömürü. Onayı daraltın ama kaydı sonra tamamlayın; CMDB’siz acil değişiklik borçtur."],
      ],
    },
    {
      t: "ul",
      items: [
        "Yol: Değişiklik yönetimi → Yeni kayıt (/degisiklik/yeni).",
        "Durum akışı taslak → onay bekler → onaylandı → tamamlandı / iptal / red.",
        "Açıklamaya geri alma notunu yazın; sürüm kaydı da aynı planı taşır.",
      ],
    },
    {
      t: "h2",
      text: "Sürüm ve dağıtım",
    },
    {
      t: "p",
      text: "Onaylı değişiklik, yama ve konfigürasyonun paketlenmesidir. Sürüm no, dağıtım penceresi, paket içeriği (değişiklik no, yama no), geri alma planı. Durumlar: planlandı, hazırlanıyor, canlıya hazır, dağıtıldı, geri alındı, iptal. “Yamayı sunucuya attım” sürüm değildir; paket ve pencere olmadan dağıtım, değişiklik kontrolünü deler.",
    },

    { t: "h1", text: "Varlık (ITAM) ve konfigürasyon (CMDB)" },
    {
      t: "p",
      text: "Varlık, parası ve zimmeti olan kayıttır (laptop, lisans, switch). Konfigürasyon öğesi (CI), hizmeti ayakta tutmak için ilişkisi bilinen kayıttır. Aynı sunucu hem envanterde hem CMDB’de durabilir; biri mali/zimmet, diğeri bağımlılık içindir.",
    },
    {
      t: "table",
      headers: ["Soru", "ITAM / envanter", "CMDB"],
      rows: [
        ["Kimin üzerinde?", "Zimmet, personel", "Teknik sahip / işletmeci"],
        ["Kaça mal oldu / lisans?", "Evet", "Hayır (gerekmez)"],
        ["Hangi hizmet düşer?", "Dolaylı", "CI ilişki ve bağımlılık"],
        ["Yol", "/envanter", "/konfigurasyon"],
      ],
    },
    {
      t: "ul",
      items: [
        "Zimmetli cihaz doğrudan başkasına verilmez; önce boşa çıkarılır veya zimmet yöneticisine alınır.",
        "Zimmet formu (PDF/Word) yalnızca seçilen kişinin üzerindeki kayıtlardan üretilir.",
        "CMDB kaydı olay ve değişiklik IP’si / etkilenen hizmet ile bağlanmalıdır.",
        "Toplu Excel yükleme envanter içindir; CMDB ilişkisi satır satır düşünülür.",
      ],
    },

    { t: "h1", text: "Hizmet masası, talep, olay, problem, izleme" },
    {
      t: "h2",
      text: "Hizmet masası",
    },
    {
      t: "p",
      text: "Tek temas noktasıdır (SPOC). Kullanıcı “nereye yazacağım”ı bilmek zorunda değildir. L1 türler SERVIS ofisine düşer; L2 türler (güvenlik duvarı, IP, sunucu, yedek) kendi şubesine gider. Karşılayan ofis ve amir, talep türü + Ayarlar’daki şube yöneticisinden atanır.",
    },
    {
      t: "h2",
      text: "Olay, talep, problem — ayırma",
    },
    {
      t: "table",
      headers: ["Tür", "Tanım", "Örnek", "Ekran"],
      rows: [
        ["Olay (incident)", "Hizmette beklenmeyen kesinti veya kalite düşüşü", "E-posta düştü, VPN bağlanmıyor", "/olay"],
        ["Hizmet talebi", "Onaylı, rutin, “yeni bir şey isteme”", "Şifre sıfırla, yazılım, yeni PC", "/talepler"],
        ["Problem", "Bir veya birçok olayın kök nedeni", "Aynı switch portu üçüncü kez düşüyor", "/problem"],
        ["Bilinen hata", "Kök neden biliniyor, kalıcı çözüm yok veya ertelendi", "Üretici yaması Nisan’da; geçici yol var", "Problem durumu KNOWN_ERROR"],
        ["Majör olay", "Yüksek/kritik, geniş etki, Seviye 2 bekler", "Tüm kampüs kimlik durdu", "/olay önem = yüksek/kritik"],
      ],
    },
    {
      t: "p",
      text: "Olay formunda Seviye 1 analist ve önem zorunludur. Yüksek / kritik olaylar Seviye 2 bekler. Amaç hizmeti mümkün olduğunca çabuk döndürmektir; kök nedeni olay kaydında çözmeye çalışmak kuyruğu kilitler — onu probleme aktarın. Problemde atanacak personel, bilgi güvenliği yöneticisi onaylayınca görev başlar.",
    },
    {
      t: "h2",
      text: "İzleme ve olay (event)",
    },
    {
      t: "p",
      text: "Event, izleme aracının ürettiği haberdir; incident henüz değildir. Eşik aşıldı, uyarı, bilgi, kalp atışı kaybı. Kaynak (Zabbix, SIEM, vCenter), eşik, nöbetçi ekip. Alarm üstlenilmeden olay açmak gürültüdür; alarmı olay yapma kuralını eşikte yazın (ör. CPU > %85 / 10 dk ve iş etkisi var).",
    },
    {
      t: "note",
      title: "Kuyruk disiplini",
      text: "Şifre sıfırlama olay değildir. Kesinti talep değildir. Üçüncü tekrar olay kapatılıp “çözüldü” denerek problem açılmazsa aynı kesinti dördüncü kez gelir. Firma ürün arızası hizmet masası L1’ine değil Firma / SLA arıza bildirimine gider; SLA saati orada işler.",
    },

    { t: "h1", text: "Yama, zafiyet ve tedarikçi SLA" },
    {
      t: "p",
      text: "Bu üç ekran 17 pratiğin “kenar”ıdır ama değer zincirinde Obtain/build ve Improve’u taşır.",
    },
    {
      t: "ul",
      items: [
        "Yama yönetimi (/yama): onaylı paketin parçası olmalı; tek başına “sunucuya KB attım” değişiklik ve sürüm kaydını atlar.",
        "Zafiyet yönetimi (/zafiyet): CVE, şiddet, tarama kaynağı. Yüksek zafiyet problem + acil değişiklik adayıdır; yalnızca Excel’de durmaz.",
        "Firma / SLA (/firma-sla): unvan, support e-posta, şartname dosyası, ürünler, teknik/idari şartnamedeki 3 seviye (müdahale ve çözüm saati). Arıza bildirimi ürün seçince şartname ve süreleri doldurur; kayıt saati SLA’yı başlatır.",
      ],
    },

    { t: "h1", text: "Hizmet değerlendirme" },
    {
      t: "p",
      text: "Canlıya alınan hizmet, tasarımda yazılan iş değerini üretiyor mu? Hedeflenen değer, gerçekleşen değer (kullanım, süre, maliyet, memnuniyet), paydaş, tavsiye: sürdür / iyileştir / kullanımdan kaldır. Bu kayıt “müdür beğendi” notu değildir; ölçülen kanıt ister. Tavsiye “kaldır” ise katalog durumu kalktı yapılır, süreklilik ve kapasite kayıtları kapatılır, zimmetli cihazlar boşa çıkarılır.",
    },

    { t: "h1", text: "Roller ve sorumluluk" },
    {
      t: "table",
      headers: ["Uygulama rolü", "ITIL’de yakın durduğu yer", "Tipik iş"],
      rows: [
        ["Kullanıcı", "Kullanıcı / talep eden", "Talep ve zimmetini görür"],
        ["Sistem yöneticisi", "Teknik uygulama, CI işletmecisi", "Envanter, CMDB, tasarım/kapasite"],
        ["Birim amiri", "Onaylayan (CAB üyesi adayı)", "Değişiklik ve birim onayları"],
        ["Üst yönetici", "Sponsor / üst onay", "Kritik değişiklik, değerlendirme"],
        ["Bilgi güvenliği yöneticisi", "Bilgi güvenliği, risk", "Problem atama, değişiklik BG onayı, zafiyet"],
        ["Süper yönetici", "Yönetişim", "Rol, Ayarlar, envanter onay, menü anahtarı"],
      ],
    },
    {
      t: "p",
      text: "ITIL 4 RACI’yi dayatmaz ama her pratikte “hesap veren” (accountable) tek kişi olmalıdır: katalog hizmet sahibi, olayda Seviye 1/2 analist, değişiklik onay birimi amiri. Formdaki kaydeden kişi oturumdan kilitlidir; raporda “kim açtı” tartışılmaz.",
    },

    { t: "h1", text: "Uçtan uca senaryolar" },
    {
      t: "h2",
      text: "Senaryo A — Yeni hizmet: “Kampüs misafir Wi-Fi”",
    },
    {
      t: "ol",
      items: [
        "Tasarım kaydı: iş hedefi (ziyaretçi interneti, kurum VLAN’ından ayrı), güvenlik standardı, beklenti (kupon / SMS, 8 saat).",
        "Katalog: durum tasarımda; saat, SLA %, talep şubesi Ağ.",
        "Kapasite: controller / lisans / eşzamanlı istemci tahmini.",
        "Süreklilik: controller yedekliği, RTO.",
        "CMDB: SSID, controller, switch, DHCP CI ilişkisi.",
        "Envanter: erişim noktaları zimmet ve lokasyon.",
        "Doğrulama: güvenlik testi + UAT.",
        "Değişiklik + sürüm: canlı SSID açma penceresi.",
        "Katalog durumu aktif. İzleme eşiği. Üç ay sonra değerlendirme.",
      ],
    },
    {
      t: "h2",
      text: "Senaryo B — Kesinti: “EBYS yavaş”",
    },
    {
      t: "ol",
      items: [
        "İzleme: yavaş sorgu eşiği, üstlenildi.",
        "Olay: önem yüksek, L1/L2, etkilenen hizmet katalogdaki EBYS.",
        "Hizmeti döndür (bağlantı havuzu, geçici kısıt) — olay kapanabilir.",
        "Problem: kök neden indeks / yetersiz RAM. Known error: geçici kısıt.",
        "Kapasite kaydı: RAM boşluğu ve 12 aylık tahmin.",
        "Değişiklik + yama/sürüm: indeks ve bellek. Doğrulama performans testi.",
        "SLA dönemi: ihlal sayısı. Değerlendirme: gerçekleşen değer.",
      ],
    },
    {
      t: "h2",
      text: "Senaryo C — Rutin talep: “Yeni personel dizüstü”",
    },
    {
      t: "ol",
      items: [
        "Katalogda “Uç nokta / dizüstü” hizmeti aktif, talep şubesi doğru ofis.",
        "Talep türü yeni cihaz; olay açılmaz.",
        "Onay birim amirinden (şube yöneticisi) gelir.",
        "Envanter kaydı + zimmet. CMDB’de gerekirse hostname CI.",
        "Teslim zimmet formu (PDF/Word). Talep kapanır.",
      ],
    },

    { t: "h1", text: "Sık yapılan hatalar" },
    {
      t: "ul",
      items: [
        "Her kesintiyi talep, her talebi olay yazmak.",
        "Olayı kök neden çözülmeden “tamamlandı” kapatıp problem açmamak.",
        "CMDB’siz değişiklik: IP değişir, kimse hangi hizmetin düşeceğini bilemez.",
        "Katalogsuz SLA: yüzde tutulur ama hangi hizmet olduğu belirsizdir.",
        "Firma bakım süresini iç SLA sanmak; kullanıcıya 4 saat, firmaya 8 saat söz verilmiş olabilir.",
        "RTO’yu MTTR gibi kullanmak.",
        "Zimmeti “arkadaşa teslim ettim” ile değiştirmek; form ve boşa çıkarma kuralını atlamak.",
        "Doğrulama “kaldı” iken sürüm “dağıtıldı”.",
        "ITIL menüsünü kapatıp kayıtların silindiğini sanmak — silinmez; yalnızca menü 1.3.0’a döner.",
        "Tüm 34 pratiği aynı anda “kurduk” demek. Önce bu 17’nin disiplini.",
      ],
    },

    { t: "h1", text: "Kayıt açma kontrol listesi" },
    {
      t: "table",
      headers: ["Kayıt", "Açmadan önce"],
      rows: [
        ["Katalog hizmeti", "Sahip, şube, saat, SLA %, erişim şartı"],
        ["Tasarım", "İş hedefi ve güvenlik standardı yazılı mı"],
        ["Olay", "Kesinti mi, talep mi; katalog hizmeti; önem"],
        ["Problem", "Hangi olaylara bağlı; geçici çözüm var mı"],
        ["Talep", "Doğru tür ve ofis; zimmet/yetki gerekçesi"],
        ["Değişiklik", "Etki, pencere, geri alma, onay birim sayısı"],
        ["Sürüm", "Hangi değişiklik/yama pakette; geri alma"],
        ["Süreklilik", "Senaryo, RTO, RPO, tatbikat tarihi"],
        ["Firma arızası", "Ürün seçildi mi; 3 SLA seviyesi tanımlı mı"],
        ["Değerlendirme", "Ölçülen kanıt (kullanım, ihlal, maliyet)"],
      ],
    },

    { t: "h1", text: "Terimler sözlüğü" },
    {
      t: "table",
      headers: ["Terim", "Kısa karşılık"],
      rows: [
        ["CI", "Configuration Item — CMDB’deki yapılandırma öğesi"],
        ["CMDB", "Hizmeti ayakta tutan CI’lar ve ilişkileri"],
        ["ITAM", "Varlığın mali ve zimmet yaşam döngüsü"],
        ["SLA / OLA / UC", "İş birimi / iç ekip / tedarikçi hedefi"],
        ["MTTR / MTBF", "Ortalama onarım / arızalar arası süre"],
        ["RTO / RPO", "Afet sonrası kalkış süresi / veri kaybı penceresi"],
        ["CAB", "Change advisory — bu üründe onay birimleri + BG yöneticisi"],
        ["Known error", "Kök nedeni bilinen, kalıcı çözümü bekleyen problem"],
        ["SPOC", "Tek temas noktası — hizmet masası"],
        ["Utility / warranty", "İşe yararlık / güvence (süre, kapasite, güvenlik)"],
        ["VOCR", "Value, outcome, cost, risk"],
        ["SVS", "Service value system — talepten değere çerçeve"],
        ["Value chain", "Plan, improve, engage, design & transition, obtain/build, deliver & support"],
        ["Event", "İzleme haberi; henüz olay olmayabilir"],
        ["Major incident", "Yüksek etki; Seviye 2 ve yönetim görünürlüğü"],
        ["Standard change", "Önceden onaylı düşük riskli tekrar iş"],
        ["Release", "Onaylı değişikliklerin paketlenmiş dağıtımı"],
        ["Workaround", "Geçici yol; known error ile birlikte yaşar"],
      ],
    },
    {
      t: "p",
      text: "Daha fazla işletme ayrıntısı (rol eşlemesi, AD, API anahtarı) Yönetici ve API kılavuzlarındadır. Günlük tıklama adımları Kullanıcı kılavuzundadır. Süreç ekranları: ITIL süreçleri menüsü ve /hizmetler haritası.",
    },
  ],
};
