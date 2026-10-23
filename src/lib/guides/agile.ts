import type { Guide } from "./types";

export const AGILE_GUIDE: Guide = {
  file: "agile-kilavuzu.pdf",
  title: "Çevik Çalışma (Agile) Kılavuzu",
  subtitle: "Scrum, Kanban ve bu uygulamadaki Çevik çalışma modülü",
  audience: "Ürün sahipleri, ekip üyeleri, birim amirleri ve BT yöneticileri",
  version: "1.0",
  date: "11 Ekim 2026",
  intro:
    "Bu belge çevik (agile) çalışmanın temel fikrini, Scrum ve Kanban yöntemlerini ve BT Hizmet Yönetimi 3.0.0’daki Çevik çalışma modülünün nasıl kullanılacağını anlatır. Çevik çalışma ITIL’in yerine geçmez; ITIL’in “ne yönetilecek” sorusuna, çevik yöntemler “işi nasıl küçük parçalarla, sık teslim ederek yapacağız” sorusuna cevap verir. Bu belge işletme içi uygulama notudur; Scrum Guide ve ITIL sertifika müfredatının yerine geçmez.",
  blocks: [
    { t: "h1", text: "Bu kılavuzu kim, nasıl kullanır" },
    {
      t: "p",
      text: "Çevik çalışma, belirsizliğin yüksek olduğu ve ihtiyaçların sürekli değiştiği işlerde (yazılım geliştirme, portal iyileştirme, otomasyon, güvenlik iyileştirme programları) kısa döngülerle ilerlemeyi sağlar. Uygulamadaki modül, bu işleri ürün veya ekip bazında backlog, sprint ve pano ile yönetmenizi sağlar.",
    },
    {
      t: "ul",
      items: [
        "Ürün sahibi: backlog’u önceliklendirir, hikâyeleri yazar, sprint hedefini belirler.",
        "Ekip üyesi: sprint işlerini üstlenir, panoda durumunu günceller, yorum yazar.",
        "Süreç yöneticisi / Scrum master: toplantıları yürütür, engelleri kaldırır, retrospektif aksiyonlarını izler.",
        "Birim amiri ve üst yönetici: ilerlemeyi yol haritası, velocity ve raporlardan izler.",
        "Son kullanıcı: bu belgeyi okumak zorunda değildir; Çevik çalışma modülü kullanıcı rolüne açılmaz.",
      ],
    },
    {
      t: "note",
      title: "Menü yolu",
      text: "ITIL süreçleri menüsü → Çevik çalışma (/cevik). Kılavuz: Kılavuzlar → Çevik çalışma kılavuzu. PDF: /docs/agile-kilavuzu.pdf. Yetki: Ayarlar → Modül yetkileri → “Çevik çalışma (Agile)”.",
    },

    { t: "h1", text: "Çevik yaklaşım nedir" },
    {
      t: "p",
      text: "Çevik yazılım geliştirme bildirgesi (2001) dört değeri öne çıkarır: süreç ve araçlardan çok bireyler ve etkileşim; kapsamlı dokümantasyondan çok çalışan yazılım; sözleşme pazarlığından çok müşteriyle iş birliği; plana bağlı kalmaktan çok değişime yanıt verme. Her ikinci unsur da değerlidir; ancak ilk unsurlar daha çok önemsenir.",
    },
    {
      t: "ul",
      items: [
        "Küçük parçalar: büyük iş, birkaç gün içinde bitebilecek parçalara bölünür.",
        "Sık teslim: her döngü sonunda kullanılabilir bir sonuç ortaya çıkar.",
        "Erken geri bildirim: yanlış yön erken fark edilir, maliyeti düşük kalır.",
        "Şeffaflık: pano ve backlog herkesin göreceği şekilde güncel tutulur.",
        "Sürekli iyileştirme: her döngü sonunda ekip çalışma biçimini değerlendirir (retrospektif).",
      ],
    },

    { t: "h1", text: "Scrum" },
    {
      t: "p",
      text: "Scrum, sabit uzunlukta döngüler (sprint) ve üç rol, beş olay, üç artefaktla çalışan bir çerçevedir. Uygulamada ürünün yöntemi “Scrum (sprintli)” seçilir.",
    },
    { t: "h2", text: "Roller" },
    {
      t: "table",
      headers: ["Rol", "Sorumluluk", "Uygulamadaki karşılığı"],
      rows: [
        ["Ürün sahibi", "Ürün backlog’unun sırası ve değeri", "Ürün kartındaki “Ürün sahibi” alanı"],
        ["Scrum master", "Çerçevenin doğru işlemesi, engellerin kalkması", "Toplantı kayıtlarını tutan süreç yöneticisi"],
        ["Geliştirme ekibi", "Sprint işlerini üretir", "İşlerde “Sorumlu” olarak atanan kişiler"],
      ],
    },
    { t: "h2", text: "Olaylar" },
    {
      t: "table",
      headers: ["Olay", "Süre (öneri)", "Amaç", "Uygulamada"],
      rows: [
        ["Sprint", "1–4 hafta", "Sabit uzunlukta döngü", "Sprint kartı: tarih, hedef, kapasite"],
        ["Sprint planlama", "Sprintin ilk günü", "Hedef ve sprinte alınacak işlerin seçimi", "Backlog’da “Sprinte ekle”; toplantı türü: Sprint planlama"],
        ["Günlük toplantı", "15 dakika", "Dünkü iş, bugünkü iş, engeller", "Panoda durum güncelleme; toplantı türü: Günlük toplantı"],
        ["Sprint değerlendirme", "Sprintin son günü", "Biten işin paydaşlara gösterilmesi", "Toplantı türü: Sprint değerlendirme"],
        ["Retrospektif", "Değerlendirmeden sonra", "Çalışma biçimini iyileştirme kararları", "Sprint sayfasındaki retrospektif notu; toplantı türü: Retrospektif"],
      ],
    },
    { t: "h2", text: "Artefaktlar" },
    {
      t: "ul",
      items: [
        "Ürün backlog’u: ürün için yapılacak tüm işlerin öncelik sıralı listesi. Uygulamada ürün sayfasındaki “Backlog” tablosu.",
        "Sprint backlog’u: sprinte alınan işler. Uygulamada sprint sayfasındaki pano.",
        "Artım: sprint sonunda kullanıma hazır sonuç. “Bitti” sütunundaki işler.",
        "Bitti tanımı (DoD): bir işin ne zaman bitmiş sayılacağına ekibin birlikte verdiği karar. Örnek: kod gözden geçirildi, test edildi, belgelendi, paydaş onayladı.",
      ],
    },

    { t: "h1", text: "Kanban" },
    {
      t: "p",
      text: "Kanban sabit sprint kullanmaz; işler sürekli akar. Amaç, aynı anda yapılan iş sayısını sınırlayarak darboğazı görünür kılmaktır. Uygulamada ürün yöntemi “Kanban (sürekli akış)” seçilir; panoda Backlog sütunu da görünür ve sprint oluşturma gerekmez.",
    },
    {
      t: "ul",
      items: [
        "İşi görünür kıl: her iş bir karttır, sütunlar iş akışının adımlarıdır (Yapılacak → Devam ediyor → İncelemede → Bitti).",
        "Devam eden işi sınırla (WIP): “Devam ediyor” sütununda kişi başı 1–2 iş önerilir. Uygulama sınırı zorlamaz; ekip anlaşması olarak uygulanır.",
        "Akışı ölç: bir işin başladı ve tamamlandı zamanı kaydedilir (iş sayfasında görülür). Döngü süresi uzayan işler darboğaz işaretidir.",
        "Kuralları açıkça yaz: bir kart İncelemede sütununa hangi koşulda geçer?",
      ],
    },
    {
      t: "table",
      headers: ["Konu", "Scrum", "Kanban"],
      rows: [
        ["Zamanlama", "Sabit sprintler", "Sürekli akış"],
        ["Planlama", "Sprint başında", "İhtiyaç oldukça"],
        ["Rol", "Üç tanımlı rol", "Zorunlu rol yok"],
        ["Ölçüm", "Velocity, burndown", "Döngü süresi, akış"],
        ["Değişiklik", "Sprint içinde dondurulur", "İstenen zamanda kabul edilir"],
        ["Uygun iş", "Planlanabilir ürün geliştirme", "Sürekli gelen destek ve iyileştirme işleri"],
      ],
    },

    { t: "h1", text: "İş kalemleri" },
    {
      t: "table",
      headers: ["Tür", "Ne zaman", "Örnek"],
      rows: [
        ["Epik", "Birkaç sprinte yayılan büyük hedef", "Bildirim ve uyarı altyapısı"],
        ["Hikâye", "Kullanıcıya değer katan tek parça iş", "SLA süresi dolmadan e-posta uyarısı"],
        ["Görev", "Teknik veya idari iş, kullanıcı değeri doğrudan yok", "Test SMTP sunucusunu kur"],
        ["Hata", "Beklenen davranıştan sapma", "Bildirim sayfasında sayfalama hatası"],
      ],
    },
    { t: "h2", text: "İyi hikâye nasıl yazılır" },
    {
      t: "p",
      text: "Klasik kalıp: “[Rol] olarak, [amaç] istiyorum, böylece [fayda]”. Kabul ölçütleri iş açıklamasına madde madde yazılır. İyi bir hikâye INVEST ölçütlerini karşılar: Bağımsız, Pazarlığa açık, Değerli, Tahmin edilebilir, Küçük, Test edilebilir.",
    },
    {
      t: "note",
      title: "Örnek",
      text: "Hizmet masası analisti olarak, SLA süresinin %80’i dolduğunda e-posta uyarısı almak istiyorum, böylece süre dolmadan müdahale edebilirim. Kabul ölçütleri: 1) Eşik Ayarlar’dan değiştirilebilir. 2) SMTP kapalıysa denetim izine yazılır. 3) Aynı kayıt için tek uyarı gider.",
    },
    { t: "h2", text: "Hikâye puanı" },
    {
      t: "p",
      text: "Hikâye puanı saat değil, göreceli büyüklüktür (karmaşıklık, belirsizlik, iş miktarı). Genelde 1, 2, 3, 5, 8, 13 dizisi kullanılır. 13’ten büyük iş bölünmelidir. Ekip, referans bir hikâyeye göre “bu ondan iki kat mı?” diye karşılaştırır. Puan sprint kapasitesi ve velocity hesabının temelidir.",
    },
    { t: "h2", text: "Öncelik" },
    {
      t: "p",
      text: "Öncelik Düşük, Orta, Yüksek ve Kritik olarak girilir. Aynı zamanda Puanlama sisteminde işin önem derecesidir: kritik işin tamamlanması düşük öncelikli işten daha çok puan kazandırabilir (Ayarlar → Puanlama).",
    },

    { t: "h1", text: "Uygulamada adım adım" },
    {
      t: "ol",
      items: [
        "Ürün oluşturun: Çevik çalışma → Ürün ekle. Anahtar (BT, PORTAL gibi 2–10 harf/rakam), ad, yöntem (Scrum veya Kanban), ürün sahibi ve isteğe bağlı bağlı hizmet girilir. Anahtar iş numaralarında kullanılır (BT-001) ve sonradan değişmez.",
        "Backlog’u doldurun: ürün sayfasında Yeni iş. Başlık, tür, öncelik, puan, sorumlu ve açıklama girin. Büyük hedefleri Epik türüyle açın.",
        "Epiğe bağlayın: işin sayfasındaki Epik bölümünden epik seçilir. Yol haritası sayfası epik ilerlemesini puan bazında gösterir.",
        "Sprint oluşturun (Scrum): Yeni sprint. Ad, tarih aralığı (varsayılan iki hafta), kapasite puanı ve hedef girilir.",
        "Planlama yapın: backlog tablosunda iş satırındaki seçimden sprinti seçip Ekle’ye basın. Sprint sayfasındaki Toplam puan kapasiteyi aşarsa kutu uyarı rengine döner.",
        "Sprinti başlatın: sprint sayfasında Sprinti başlat. Bir üründe aynı anda tek aktif sprint olabilir.",
        "Panoyu yürütün: kartları sütunlar arasında sürükleyin veya kart üzerindeki ok düğmelerini kullanın. Devam ediyor’a ilk geçişte başlangıç, Bitti’ye geçişte tamamlanma zamanı kaydedilir.",
        "Günlük toplantı notu alın: sprint sayfasında + Günlük bağlantısı yeni toplantı kaydı açar.",
        "Sprinti kapatın: Sprinti kapat. Bitmiş işler sprintte kalır (velocity’ye sayılır), bitmemiş işler backlog’a döner.",
        "Değerlendirme ve retrospektif: toplantı kaydı açın; retrospektif notunu sprint düzenleme formundaki alana da yazabilirsiniz.",
      ],
    },
    {
      t: "table",
      headers: ["Ekran", "Yol", "Ne gösterir"],
      rows: [
        ["Çevik çalışma ana sayfa", "/cevik", "Ürünler, aktif sprint, açık iş, bana atanan işler"],
        ["Ürün sayfası", "/cevik/urun/[id]", "Pano, backlog, sprintler, velocity, toplantılar"],
        ["Yol haritası", "/cevik/urun/[id]/yol-haritasi", "Epikler ve ilerleme çubuğu"],
        ["Sprint sayfası", "/cevik/sprint/[id]", "Pano, burndown, toplantılar, retrospektif"],
        ["İş sayfası", "/cevik/is/[id]", "Durum, epik, yorumlar, ITIL kaynağı"],
        ["Toplantı kaydı", "/cevik/toplanti/[id]", "Notlar, katılımcılar, kararlar"],
      ],
    },

    { t: "h1", text: "Ölçümler" },
    {
      t: "table",
      headers: ["Gösterge", "Anlamı", "Nasıl okunur"],
      rows: [
        ["Kapasite", "Sprintte alınabilecek planlanan puan", "Toplam puan kapasiteyi aşıyorsa fazla taahhüt vardır"],
        ["Burndown", "Gün gün kalan puan", "Dolu çizgi kesikli ideal çizginin üstünde kalıyorsa sprint geride"],
        ["Velocity", "Sprintte biten puan", "Son sprintlerin ortalaması bir sonraki sprintin planı için referanstır"],
        ["Döngü süresi", "Başladı → Bitti arası süre", "Uzayan süre darboğaz veya fazla WIP işaretidir"],
        ["Epik ilerlemesi", "Epiğe bağlı işlerin biten puan oranı", "Yol haritasında yüzde olarak görülür"],
      ],
    },
    {
      t: "note",
      title: "Dikkat",
      text: "Velocity takımlar arası karşılaştırma aracı değildir; her ekibin puan ölçeği farklıdır. Hedef velocity’yi artırmak değil, tahmin edilebilir ve sürdürülebilir hız yakalamaktır. Burndown yalnızca puanı olan işleri sayar; puansız işler grafiğe yansımaz.",
    },

    { t: "h1", text: "ITIL ile birlikte kullanım" },
    {
      t: "p",
      text: "ITIL günlük hizmet işletmesini (olay, talep, problem, değişiklik) yönetir; çevik modül ise bu kayıtlardan doğan iyileştirme ve geliştirme işlerini yönetir. İkisi birbirine kopyalama yapmadan bağlanır.",
    },
    {
      t: "table",
      headers: ["ITIL kaydı", "Çevik iş", "Örnek"],
      rows: [
        ["Olay", "Hata (kalıcı iyileştirme)", "Fidye yazılımı olayından sonra yedek doğrulama otomasyonu"],
        ["Problem", "Hikâye / epik (kök neden çalışması)", "Tekrarlayan disk dolması için izleme kuralları"],
        ["Değişiklik", "Görev (uygulama sonrası izleme)", "CHG sonrası geri dönüş testleri"],
        ["Talep", "Görev veya hikâye", "Yeni rapor isteği"],
        ["Zafiyet / Yama", "Hata / görev", "Kritik CVE için güncelleme planı"],
      ],
    },
    {
      t: "ol",
      items: [
        "Olay, problem, değişiklik, talep, zafiyet veya yama kaydının sayfasını açın.",
        "Çevik iş aç düğmesine basın.",
        "Hangi ürüne ekleneceğini seçin (tek ürün varsa yine seçim ekranı çıkar).",
        "Başlık, tür ve öncelik kayıttan hazır gelir: olay ve zafiyet Hata, problem Hikâye, değişiklik/talep/yama Görev olarak önerilir. Gerekirse değiştirip kaydedin.",
        "İş sayfasında “ITIL kaynağı” bağlantısı kayda geri götürür.",
      ],
    },
    {
      t: "note",
      title: "Sorumluluk ayrımı",
      text: "Çevik iş, ITIL kaydının yerine geçmez. Olay kapanışı, değişiklik onayı ve SLA takibi ITIL ekranlarında yapılır. Çevik iş bitince ITIL kaydının durumu otomatik değişmez; ilgili kaydı ayrıca güncelleyin. Değişiklik gerektiren çevik işler normal değişiklik onay akışından geçer.",
    },

    { t: "h1", text: "Puanlama ve raporlar" },
    {
      t: "ul",
      items: [
        "Puanlama: iş açma (giriş), güncelleme ve Bitti’ye taşıma (tamamlama) işlemleri “Çevik çalışma (Agile iş)” modülü altında puanlanır. Önem derecesi işin önceliğidir. Puanları süper yönetici Ayarlar → Puanlama sekmesinde düzenler; negatif puan da tanımlanabilir.",
        "Personel kartı: kişinin açtığı iş, güncellediği ve tamamladığı iş sayıları ve toplam puanı Personel sayfasında görünür.",
        "Raporlar → Çevik çalışma grubu: Sprint özeti ve velocity, Çevik iş listesi, Personel iş yükü, Epik ilerlemesi, Toplantı kayıtları. Hepsi CSV, PDF veya Word olarak indirilir.",
      ],
    },
    {
      t: "note",
      title: "Puan oyunlaştırması",
      text: "Her pano taşıması güncelleme puanı üretir. Gereksiz taşımaları ödüllendirmemek için güncelleme puanını düşük, tamamlama puanını yüksek tutun veya güncelleme puanını sıfırlayın.",
    },

    { t: "h1", text: "Yetki ve roller" },
    {
      t: "p",
      text: "Çevik çalışma modülü varsayılan olarak Süper yönetici, Sistem yöneticisi, Üst amir, Birim amiri ve Bilgi güvenliği yöneticisi rollerine açıktır; Kullanıcı rolüne kapalıdır. Ayarlar → Modül yetkileri sekmesinden grup bazlı Görüntüleme, İşlem ve Yönetim düzeyleri verilebilir. Yorum silme yalnızca yorum sahibine ve süper yöneticiye açıktır.",
    },

    { t: "h1", text: "Senaryolar" },
    { t: "h2", text: "1. Hizmet masası portalı iyileştirmesi (Scrum)" },
    {
      t: "ol",
      items: [
        "Ürün sahibi “BT Hizmet Masası İyileştirmeleri” ürününü Scrum olarak açar ve 10–15 hikâyeyi backlog’a yazar.",
        "Planlama toplantısında Sprint 1 için 20 puan kapasite belirlenir; öncelikli hikâyeler sprinte eklenir ve sprint başlatılır.",
        "Ekip her gün panoyu günceller; engeller günlük toplantı kaydına yazılır.",
        "Sprint sonunda kapatılır, bitmeyen iş backlog’a döner, retrospektif aksiyonları kayda geçer. Velocity grafiği bir sonraki planı yönlendirir.",
      ],
    },
    { t: "h2", text: "2. Tekrarlayan olaydan kalıcı çözüm" },
    {
      t: "ol",
      items: [
        "Aynı arıza üç kez yaşanınca problem kaydı açılır ve kök neden bulunur.",
        "Problem sayfasından Çevik iş aç ile ilgili ürüne hikâye eklenir; kök neden ve geçici çözüm açıklamaya otomatik gelir.",
        "İş bir sonraki sprintte yapılır; gerekirse ayrıca değişiklik kaydı açılıp onay akışından geçirilir.",
        "İş Bitti olduğunda problem kaydı Çözüldü durumuna ayrıca taşınır.",
      ],
    },
    { t: "h2", text: "3. Güvenlik ekibinde sürekli akış (Kanban)" },
    {
      t: "ol",
      items: [
        "Siber ekip “Siber İzleme” ürününü Kanban olarak açar; sprint kullanmaz.",
        "Yeni iyileştirme fikirleri Backlog sütununa düşer; ekip Devam ediyor sütununda kişi başı en fazla iki iş taşır.",
        "İncelemede sütunu bilgi güvenliği yöneticisinin onay adımıdır.",
        "Ayda bir toplantı kaydıyla ortalama döngü süresi ve takılan işler gözden geçirilir.",
      ],
    },

    { t: "h1", text: "Sık yapılan hatalar" },
    {
      t: "table",
      headers: ["Hata", "Sonuç", "Çözüm"],
      rows: [
        ["Sprinte kapasiteden çok iş almak", "Sprint hedefi tutmaz, ekip yorulur", "Son 3 sprint velocity ortalamasını baz alın"],
        ["Puansız iş açmak", "Burndown ve velocity gerçeği yansıtmaz", "Her hikâyeye göreceli puan verin"],
        ["Panoyu güncellememek", "Günlük toplantı bilgi paylaşımına dönüşmez, grafik yanlış kalır", "İş başlarken ve bitirirken kartı hemen taşıyın"],
        ["Çok büyük hikâye", "Sprint içinde bitmez", "13 puandan büyük işi bölün veya epik yapın"],
        ["Retrospektif atlamak", "Aynı sorunlar tekrar eder", "Her sprint sonu en az bir iyileştirme kararı alın"],
        ["Sprint ortasında kapsam eklemek", "Burndown bozulur", "Acil işi bile kapasite içinde değiş tokuş ederek ekleyin"],
        ["ITIL kaydını güncellememek", "Olay/problem açık görünür, iş bitmiştir", "Çevik iş bitince bağlı ITIL kaydını ayrıca kapatın"],
      ],
    },

    { t: "h1", text: "Sözlük" },
    {
      t: "table",
      headers: ["Terim", "Anlamı"],
      rows: [
        ["Backlog", "Yapılacak işlerin öncelik sıralı listesi"],
        ["Sprint", "Sabit uzunlukta (1–4 hafta) çalışma döngüsü"],
        ["Epik", "Birçok hikâyeden oluşan büyük hedef"],
        ["Hikâye", "Kullanıcıya değer katan, tek sprintte bitebilecek iş"],
        ["Hikâye puanı", "İşin göreceli büyüklüğü"],
        ["Velocity", "Sprint başına biten toplam puan"],
        ["Burndown", "Sprint boyunca kalan puanın grafiği"],
        ["WIP", "Devam eden iş sayısı"],
        ["Bitti tanımı (DoD)", "Bir işin bitmiş sayılması için ekibin kabul ettiği ölçütler"],
        ["Kabul ölçütü", "Hikâyenin kabul edilebilmesi için sağlanması gereken koşullar"],
        ["Retrospektif", "Sprint sonu çalışma biçimini iyileştirme toplantısı"],
        ["Döngü süresi", "İşin başlamasından bitmesine kadar geçen süre"],
        ["Ürün sahibi", "Ürünün değerinden ve backlog sırasından sorumlu kişi"],
      ],
    },
    {
      t: "note",
      title: "Kısıtlar",
      text: "Bu sürümde iş veya toplantıya dosya eki yüklenemez, WIP sınırı otomatik uygulanmaz, bağımlılıklar (iş A, iş B’yi bekler) ve alt görev ağacı yoktur. Epik–hikâye bağı tek seviyelidir.",
    },
  ],
};
