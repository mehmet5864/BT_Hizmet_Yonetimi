import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import PDFDocument from "pdfkit";

import { AGILE_GUIDE } from "../src/lib/guides/agile";
import { ITIL_V4_GUIDE } from "../src/lib/guides/itil-v4";
import type { Guide } from "../src/lib/guides/types";

const OUT_DIR = join(process.cwd(), "public", "docs");
const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const TEAL = "#0f766e";
const INK = "#0f172a";
const MUTED = "#475569";
const LINE = "#cbd5e1";
const SOFT = "#f1f5f9";
const VERSION = "1.1";
const DATE = "25 Eylül 2026";

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]) {
  const startX = doc.page.margins.left;
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colW = usable / headers.length;
  const pad = 5;

  const rowHeight = (values: string[], bold: boolean) => {
    let h = 16;
    values.forEach((value) => {
      doc.font(bold ? "bold" : "regular").fontSize(8);
      h = Math.max(h, doc.heightOfString(value || "—", { width: colW - pad * 2 }) + 8);
    });
    return Math.min(h, 96);
  };

  const paint = (values: string[], bold: boolean) => {
    const h = rowHeight(values, bold);
    ensureSpace(doc, h + 2);
    const y = doc.y;
    values.forEach((value, i) => {
      const x = startX + i * colW;
      doc.rect(x, y, colW, h).fillAndStroke(bold ? TEAL : i % 2 ? "#ffffff" : SOFT, LINE);
        doc
          .fillColor(bold ? "#ffffff" : INK)
          .font(bold ? "bold" : "regular")
          .fontSize(8)
          .text(value || "—", x + pad, y + 4, {
            width: colW - pad * 2,
            height: h - 6,
            ellipsis: true,
            lineBreak: true,
          });
    });
    doc.y = y + h;
  };

  paint(headers, true);
  rows.forEach((row) => paint(row, false));
  doc.moveDown(0.6);
}

function renderGuide(guide: Guide): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 54,
      bufferPages: true,
      info: {
        Title: guide.title,
        Author: "BT Hizmet Yönetimi",
        Subject: guide.subtitle,
        Creator: "BT Hizmet Yönetimi",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("regular", FONT_REGULAR);
    doc.registerFont("bold", FONT_BOLD);

    const footer = () => {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        const y = doc.page.height - 36;
        doc
          .moveTo(54, y - 8)
          .lineTo(doc.page.width - 54, y - 8)
          .strokeColor(LINE)
          .stroke();
        doc.font("regular").fontSize(8).fillColor(MUTED);
        doc.text("BT Hizmet Yönetimi", 54, y, { width: 220, align: "left" });
        doc.text(`${guide.title}  ·  s. ${i + 1}`, 54, y, {
          width: doc.page.width - 108,
          align: "right",
        });
      }
    };

    // Cover
    doc.rect(0, 0, doc.page.width, 210).fill(TEAL);
    doc.fillColor("#ffffff").font("bold").fontSize(12).text("BT HİZMET YÖNETİMİ", 54, 56);
    doc.fontSize(28).text(guide.title, 54, 92, { width: 480 });
    doc.font("regular").fontSize(13).text(guide.subtitle, 54, 150, { width: 480 });
    const version = guide.version ?? VERSION;
    const date = guide.date ?? DATE;
    doc.fontSize(10).text(`${guide.audience}  ·  Sürüm ${version}  ·  ${date}`, 54, 178);
    doc.fillColor(INK).font("regular").fontSize(11).text(
      guide.intro ??
        "Bu belge kurumsal BT envanter, servis talebi ve ITIL süreç uygulamasının resmi kullanım kılavuzudur. Ekran adları ve menü yolları uygulamanın Türkçe arayüzüyle birebir eşleşir.",
      54,
      240,
      { width: 480, lineGap: 3 },
    );

    const toc = guide.blocks.filter((b) => b.t === "h1").map((b, i) => `${i + 1}.  ${b.text}`);
    if (toc.length > 8) doc.addPage();
    else doc.y = 320;
    doc.font("bold").fontSize(14).fillColor(TEAL).text("İçindekiler");
    doc.moveDown(0.4);
    doc.font("regular").fontSize(11).fillColor(INK);
    toc.forEach((line) => {
      ensureSpace(doc, 18);
      doc.text(line, { lineGap: 4 });
    });

    guide.blocks.forEach((block) => {
      if (block.t === "h1") {
        doc.addPage();
        doc.font("bold").fontSize(16).fillColor(TEAL).text(block.text);
        doc.moveTo(54, doc.y + 6).lineTo(doc.page.width - 54, doc.y + 6).strokeColor(TEAL).stroke();
        doc.moveDown(1);
        return;
      }
      if (block.t === "h2") {
        ensureSpace(doc, 36);
        doc.moveDown(0.3);
        doc.font("bold").fontSize(12).fillColor(INK).text(block.text);
        doc.moveDown(0.25);
        return;
      }
      if (block.t === "p") {
        ensureSpace(doc, 28);
        doc.font("regular").fontSize(10).fillColor(INK).text(block.text, { align: "justify", lineGap: 2 });
        doc.moveDown(0.45);
        return;
      }
      if (block.t === "ul" || block.t === "ol") {
        block.items.forEach((item, index) => {
          const bullet = block.t === "ol" ? `${index + 1}.` : "•";
          ensureSpace(doc, 22);
          doc.font("regular").fontSize(10).fillColor(INK).text(`${bullet}  ${item}`, { lineGap: 2 });
        });
        doc.moveDown(0.4);
        return;
      }
      if (block.t === "table") {
        ensureSpace(doc, 40);
        drawTable(doc, block.headers, block.rows);
        return;
      }
      if (block.t === "note") {
        const title = block.title ?? "Not";
        doc.font("regular").fontSize(10);
        const h = doc.heightOfString(block.text, { width: 460 }) + 28;
        ensureSpace(doc, h);
        const y = doc.y;
        doc.rect(54, y, doc.page.width - 108, h).fillAndStroke("#ecfdf5", "#99f6e4");
        doc.fillColor(TEAL).font("bold").fontSize(9).text(title, 64, y + 8);
        doc.fillColor(INK).font("regular").fontSize(9).text(block.text, 64, y + 22, { width: 460 });
        doc.y = y + h + 10;
      }
    });

    const pages = doc.bufferedPageRange();
    console.log(`${guide.file} sayfa ${pages.count}`);
    footer();
    doc.end();
  });
}

const USER_GUIDE: Guide = {
  file: "kullanici-kilavuzu.pdf",
  title: "Kullanıcı Kılavuzu",
  subtitle: "Giriş, talep açma, zimmetli envanter ve raporlar",
  audience: "Tüm kurum kullanıcıları",
  blocks: [
    {
      t: "h1",
      text: "Uygulama nedir?",
    },
    {
      t: "p",
      text: "BT Hizmet Yönetimi, kurumun bilgi işlem varlıklarını (CMDB) ve servis taleplerini tek yerden yönetmek için kullanılır. Bilgisayar, sunucu, yazıcı, yazılım lisansı gibi envanter kayıtlarının yanı sıra Sistem, Network, Siber Güvenlik, Yazılım, Veritabanı ve Servis Masası birimlerine giden talepleri kapsar.",
    },
    {
      t: "p",
      text: "Normal kullanıcı (rol: Kullanıcı) her türlü servis talebini açabilir. Görüntülediği veriler kendisine ve birimine aittir: kendi açtığı talepler, üzerine zimmetli ve birimindeki envanter, bu kapsamla sınırlı raporlar. Diğer birimlerin uzman kuyruğunu göremez. Yeni envanter ekleme veya silme isteği envanter yöneticisi / süper yönetici onayına düşer.",
    },
    {
      t: "note",
      title: "Kısaca yetkiniz",
      text: "Açabilirsiniz: tüm talep türleri. Görebilirsiniz: kendi talepleriniz, kendi ve biriminizdeki envanter. Ekleme / silme: onaya gider. Yapamazsınız: başka birimin uzman kuyruğu, personel, değişiklik, yama, ayarlar.",
    },
    { t: "h1", text: "Giriş ve kayıt" },
    {
      t: "p",
      text: "Tarayıcıda uygulamanın adresini açın. Oturum yoksa /giris sayfasına yönlendirilirsiniz. İki yöntem vardır:",
    },
    {
      t: "ul",
      items: [
        "Manuel: kurumun size verdiği kullanıcı adı (genelde ad.soyad) ve parola ile Giriş.",
        "Active Directory: AD hesabınız açıksa aynı ekranda Active Directory sekmesini kullanın.",
        "Kayıt sekmeleri yeni hesap açmak içindir. Manuel kayıt sonrası rol varsayılan olarak Kullanıcıdır; yetki yükseltmesini yöneticiniz yapar.",
      ],
    },
    {
      t: "p",
      text: "Başarılı girişten sonra Genel bakış açılır. Sağ üstte adınız ve rolünüz görünür. Çıkış için menüdeki Çıkış düğmesini kullanın. Oturum çerezi tarayıcıda tutulur; ortak bilgisayarda işiniz bitince çıkış yapın.",
    },
    { t: "h2", text: "Ekranın düzeni" },
    {
      t: "ul",
      items: [
        "Sol menü: Genel bakış, Envanter, Raporlar, Talepler (alt kırılımlar), API arayüzü, Kılavuzlar.",
        "Üst çubuk: Geri (←) ile bir önceki sayfa, Taleplerim çekmecesi.",
        "Taleplerim: sağdan kayan pencerede sizin açtığınız son talepler.",
        "Kılavuzlar: kullanıcı, yönetici ve API PDF’leri.",
        "Yetkiniz olmayan menüler (Personel, Ayarlar, Olay vb.) size gösterilmez.",
      ],
    },
    { t: "h1", text: "Genel bakış" },
    {
      t: "p",
      text: "Ana sayfa size zimmetli envanterin özetini ve sizin açık taleplerinizi gösterir. Kartlara tıklayarak ilgili listeye gidersiniz. Kullanıcı rolünde Personel, Değişiklik, Zafiyet veya Olay widget’ları görünmez; bunlar operasyon ekiplerinedir.",
    },
    {
      t: "ul",
      items: [
        "Toplam kayıt: üzerinizdeki envanter sayısı.",
        "Yüksek kritiklik / süresi yaklaşan: bakım veya lisans tarihi yakın olan kendi varlıklarınız.",
        "Açık talepler: sizin hâlâ kapanmamış talepleriniz.",
        "Yeni talep düğmesi sizi talep türü seçimine götürür.",
      ],
    },
    { t: "h1", text: "Servis talebi açmak" },
    {
      t: "p",
      text: "Sol menüde Talepler’i genişletin. Sistem, Network, Siber Güvenlik, Yazılım, Veritabanı ve Servis Masası altındaki her tür sizin için açıktır. Kullanıcı rolünde menü öğesi sizi Yeni talep formuna götürür; gelen kuyruk listesini açmaz.",
    },
    { t: "h2", text: "Arıza önce servis masasına gider" },
    {
      t: "p",
      text: "Destek, donanım, erişim ve yazılım kurulumu gibi arıza / hizmet talepleri (Servis Masası türleri) önce Servis Masası kuyruğuna düşer. Servis masası çözebildiğini kapatır; aşan işleri Katman 2 uzman birime (Sistem, Network, Siber, Yazılım, Veritabanı) aktarır. Firewall, IP sabitleme, AD kullanıcısı gibi uzman talepler doğrudan ilgili şubeye gider; siz o kuyruğu göremezsiniz, yalnızca kendi kaydınızı izlersiniz.",
    },
    { t: "h2", text: "Talep ofisleri" },
    {
      t: "p",
      text: "Şube adları Ayarlar → Tanımlar → Talep şubeleri sekmesinden değiştirilir. Menü adı kenar çubuğunda, tam ad form ve listelerde görünür.",
    },
    {
      t: "table",
      headers: ["Ofis", "Örnek talep türleri"],
      rows: [
        ["Sistem Şube Müdürlüğü", "AD kullanıcı/grup, GPO, sunucu, yedekleme, VMware, SCCM, dosya paylaşımı, sertifika, posta kutusu"],
        ["Network Şube Müdürlüğü", "NAC istisna, VLAN, güvenlik duvarı, kablosuz, yük dengeleyici, sunucu takip"],
        ["Siber Güvenlik", "SIEM kaynak, korelasyon, zafiyet tarama, VPN, DLP istisna, WAF, PAM"],
        ["Yazılım Daire Başkanlığı", "Proje, depo erişimi, CI/CD, sürüm, test ortamı, API, kod kalitesi"],
        ["Veritabanı Şube Müdürlüğü", "Veritabanı oluşturma, kullanıcı, betik, yedek, performans, dışa aktarım"],
        ["Servis Masası", "Destek, donanım, erişim, yazılım kurulumu"],
      ],
    },
    { t: "h2", text: "Formu doldurma" },
    {
      t: "ol",
      items: [
        "Talep eden alanı sizin adınıza kilitlidir; başkası adına açılamaz.",
        "Talep tarihi ve talep eden birim aynı satırda durur. Birim, kişiden otomatik gelir. İşlem yapan birim ve amir seçilmez; kayıt, talep türünün ofisine ve Ayarlar’daki şube yöneticisine gider.",
        "Önem derecesi: Düşük, Orta, Yüksek, Kritik. Yüksek ve Kritik talepler üst birime otomatik bilgi / yükseltme üretebilir.",
        "Gerekçe ve açıklamayı somut yazın (kim, ne, ne zamana, hangi sistem).",
        "Türe özel alanları (ör. MAC adresi, VLAN, depo adı, şema) doldurun. Zorunlu alan boşsa kayıt olmaz.",
        "Kaydet’ten sonra “İşlem yapıldı.” uyarısı görünür ve talep kartına gidersiniz.",
      ],
    },
    {
      t: "note",
      title: "Durum alanını siz değiştirmezsiniz",
      text: "Formda durum ve işlem yapan birim seçilmez. Talep, türünün ofisine düşer; amir Ayarlar’daki şube yöneticisidir. Yeni talep Açık (veya onay açıksa Beklemede) başlar.",
    },
    { t: "h2", text: "Talep durumları" },
    {
      t: "table",
      headers: ["Durum", "Anlamı"],
      rows: [
        ["Açık", "Kuyruğa düştü, henüz işlenmiyor"],
        ["İşlemde", "İlgili şube üzerinde çalışıyor"],
        ["Beklemede", "Onay, bilgi veya üst birim bekleniyor"],
        ["Tamamlandı", "İş bitti"],
        ["Reddedildi", "Uygun bulunmadı"],
        ["İptal", "Kapatıldı / vazgeçildi"],
      ],
    },
    { t: "h2", text: "Yükseltme (servis masası → uzman)" },
    {
      t: "p",
      text: "Arıza kaydınız Servis Masası’nda çözülemezse kartta “Katman 2 / uzman birim” ile Sistem, Network, Siber, Yazılım veya Veritabanı’na aktarılır. Siz ofisi değiştiremezsiniz; yalnızca durumu izlersiniz.",
    },
    {
      t: "table",
      headers: ["Yükseltme durumu", "Anlamı"],
      rows: [
        ["Yok", "Hâlâ ilk ofiste"],
        ["Yükseltme bekliyor", "Üst birim kabul / red bekliyor"],
        ["Doğru birime aktarıldı", "Servis masası uzman şubeye verdi; L1 kuyruğundan çıktı"],
        ["Üst birim aldı", "Yükseltme kabul edildi, işlem devam ediyor"],
        ["Yükseltme reddedildi", "Üst birim işi geri çevirdi"],
      ],
    },
    { t: "h2", text: "Kendi talebinizi düzenlemek" },
    {
      t: "p",
      text: "Açık veya Beklemede iken talep kartındaki Düzenle ile gerekçe ve ayrıntıları düzeltebilirsiniz. Tamamlanan veya reddedilen kaydı kullanıcı değiştiremez. Durumu siz ilerletemezsiniz.",
    },
    { t: "h2", text: "Taleplerim" },
    {
      t: "p",
      text: "Üst çubuktaki Taleplerim, sağdan açılan listede sizin kayıtlarınızı numarası, türü, önemi ve durumuyla gösterir. Satıra tıklayarak karta gidin.",
    },
    { t: "h1", text: "Envanter (zimmetiniz ve biriminiz)" },
    {
      t: "p",
      text: "Envanter menüsü size zimmetli varlıkları ve aynı birimdeki kayıtları listeler. Başka birimin sunucusunu veya lisansını göremezsiniz. Yeni kayıt eklemek veya silmek isterseniz form / “Silme iste” ile başvurursunuz; Envanter Şube yöneticisi veya süper yönetici onaylamadan işlem uygulanmaz. Toplu Excel yükleme yalnızca envanter yöneticisine açıktır.",
    },
    {
      t: "ul",
      items: [
        "Türler: Bilgisayar, Sunucu, Yazıcı, Tablet, Yazılım / Lisans, IP telefon, Router / Switch, Çevre birimi, Demirbaş.",
        "Filtreler: tür, kritiklik, durum, birim, arama, süresi yaklaşan, açık zafiyetli.",
        "Kartta stok no, IP, sahip, bakım bitişi ve varsa açık zafiyetler görünür.",
        "Bekleyen ekleme / silme isteklerinizi Envanter → Onaylar veya listedeki “Bekleyen isteklerim” ile izlersiniz.",
        "Varlık üzerinde açık zafiyet varsa listede uyarı çıkar. Giderme işi bilgi güvenliği / sistem ekibindedir.",
      ],
    },
    { t: "h1", text: "Raporlar" },
    {
      t: "p",
      text: "Raporlar sayfasında size açık olanlar envanter ve talep raporlarıdır. Personel, değişiklik, zafiyet, olay veya hareket günlüğü raporları kullanıcıya listelenmez. İndirmeden önce tarih, birim, durum gibi filtreleri doldurun; çıktı CSV, PDF veya Word olabilir.",
    },
    {
      t: "note",
      title: "Kapsam",
      text: "Rapor satırları da yetkinizle sınırlıdır. “Tüm envanter” sizin için “zimmetim + birimim” anlamına gelir.",
    },
    { t: "h1", text: "API arayüzü (kullanıcı)" },
    {
      t: "p",
      text: "Sol menüdeki API arayüzü, REST uçlarını, kapsamları ve canlı denemeyi gösterir. Anahtar boş bırakılırsa isteğiniz oturumunuzla gider; yazma yalnızca bu uygulamadan (aynı kaynak) kabul edilir. Dış sistem bağlamak için süper yöneticinin aynı sayfada, yazma ise bir personele bağlı anahtar üretmesi gerekir. Ayrıntılı uç listesi Kılavuzlar’daki API dokümanındadır.",
    },
    { t: "h1", text: "Sık durumlar" },
    {
      t: "table",
      headers: ["Durum", "Ne yapmalısınız"],
      rows: [
        ["Sayfa Yetkisiz", "O menü rolünüze kapalıdır. İş için talep açın veya yöneticinize rol sorun."],
        ["Talep yanlış birime gitti", "Kartı açın; yükseltmeyi şube yetkilisi “Yanlış birim” ile yapar. Siz ofis değiştiremezsiniz."],
        ["Talebim uzman birime gitti", "Yükseltme durumu “Doğru birime aktarıldı” olur. İşlem o şubededir; siz yalnızca izlersiniz."],
        ["Acil / kritik iş", "Önem = Kritik seçin. Sistem üst birimi bilgilendirir; yine de telefon / olay prosedürünü uygulayın."],
        ["Zimmetimde olmayan cihaz", "Başka birimdeyse görünmez. Kendi biriminizdeyse listede vardır. Sahip güncellemesi için ekleme/silme onayı veya talep açın."],
        ["Yeni cihaz kaydı reddedildi", "Envanter onayları sayfasından gerekçeyi okuyun; düzeltip yeniden isteyin veya Servis Masası talebi açın."],
        ["Parola unuttum", "Manuel hesapta BT yöneticisi sıfırlar. AD hesabında kurum AD prosedürü geçerlidir."],
      ],
    },
    { t: "h1", text: "İletişim ve yardım" },
    {
      t: "p",
      text: "Yönetici işlemleri için Yönetici Kılavuzu’na, REST entegrasyonu için API Kılavuzu’na bakın (Kılavuzlar menüsü). Operasyonel acillerde Servis Masası talebi açın veya kurumun olay bildirim kanalını kullanın.",
    },
  ],
};

const ADMIN_GUIDE: Guide = {
  file: "yonetici-kilavuzu.pdf",
  title: "Yönetici Kılavuzu",
  subtitle: "Roller, L1/L2 kuyruklar, grup ACL, envanter onayı, API ve kurulum",
  audience: "Sistem, şube, bilgi güvenliği ve süper yöneticiler",
  blocks: [
    { t: "h1", text: "Amaç ve kapsam" },
    {
      t: "p",
      text: "Bu kılavuz BT Hizmet Yönetimi uygulamasını işleten roller içindir: birim amiri, üst amir, bilgi güvenliği yöneticisi, sistem yöneticisi ve süper yönetici. Kullanıcıların günlük talep / zimmet adımları Kullanıcı Kılavuzu’ndadır.",
    },
    {
      t: "p",
      text: "Uygulama CMDB (9 envanter türü), ITIL servis talepleri, değişiklik, yama, konfigürasyon, zafiyet, firma/SLA, olay, problem ve denetim izini bir arada tutar. Kayıtlar Asset (CI) kimliği üzerinden bağlanır.",
    },
    { t: "h1", text: "Roller ve görünürlük" },
    {
      t: "p",
      text: "Temel kural: herkes kendi taleplerini görür. Ayrıca ofis kuyruğu yalnızca o ofisi işleten role açılır. Düz kullanıcıya talep ofisi atanmış olsa bile kuyruk açılmaz.",
    },
    {
      t: "table",
      headers: ["Rol", "Gelen kuyruk", "Envanter", "Operasyon", "Ayarlar"],
      rows: [
        ["Kullanıcı", "Yok (yalnızca kendi talebi)", "Zimmet + birim; ekleme/silme onaya düşer", "Yok", "Yok"],
        ["Sistem yöneticisi", "Sistem + kendi talepleri + SD’den gelen L2", "Zimmet + birim; yazma HANDLE", "Değişiklik, yama, konfig, zafiyet, olay, problem, SLA", "Yok"],
        ["Bilgi güvenliği", "Siber + kendi talepleri + SD’den gelen L2", "Zimmet + birim", "Zafiyet, olay, problem, değişiklik", "Yok"],
        ["Birim amiri + ofis", "Atanan ofis + kendi + SD’den aktarılan L2", "Zimmet + birim; HANDLE düzenleme", "Ofise göre (değişiklik, yama, SLA, konfig)", "Yok"],
        ["Envanter şube (GG_Envanter)", "Kendi talepleri (ofis yoksa kuyruk yok)", "Tümü; ekleme/silme/onay/toplu yükleme", "Yok (aksi ACL ile açılır)", "Yok"],
        ["Üst amir", "Tüm ofisler", "ACL’ye göre (varsayılan HANDLE)", "Çoğu operasyon + hareketler", "Yok"],
        ["Süper yönetici", "Tüm ofisler", "Tümü, onaylar, silme", "Tümü", "Var; grup ACL ve API anahtarları"],
      ],
    },
    {
      t: "p",
      text: "Rol, personel kartında Manuel / Active Directory / her ikisi (yüksek olan) kaynaklarından çözülür. Süper yönetici dışındaki yöneticiler kendilerinden yüksek rol atayamaz; Süper yönetici rolünü yalnızca süper yönetici verir.",
    },
    {
      t: "note",
      title: "Talep ofisi alanı",
      text: "Personelde “Talep ofisi / şubesi” birim amiri, sistem veya BG yöneticisinin gelen kuyruğunu belirler. Kullanıcı rolünde bu alan yok sayılır.",
    },
    { t: "h1", text: "Giriş, personel ve yetki kaynağı" },
    {
      t: "ul",
      items: [
        "Manuel giriş: ad.soyad + yerel parola (scrypt).",
        "AD giriş: Ayarlar’daki LDAP/LDAPS ve grup → rol eşlemesi.",
        "BOTH: manuel rol ile AD rolünden yüksek olan geçerli olur.",
        "Yeni personel: /personel/yeni. AD kullanıcı adı, rol, rol kaynağı ve talep ofisini doldurun.",
        "Yerel parola boş bırakılırsa ilk kurulumda örnek ortam parolası yazılabilir; üretimde mutlaka değiştirin.",
      ],
    },
    {
      t: "table",
      headers: ["Varsayılan AD grubu", "Rol"],
      rows: [
        ["GG_SuperYoneticiler", "Süper yönetici"],
        ["GG_SistemYoneticileri", "Sistem yöneticisi"],
        ["GG_UstAmirler", "Üst amir"],
        ["GG_BilgiGuvenligi", "Bilgi güvenliği yöneticisi"],
        ["GG_BirimAmirleri", "Birim amiri"],
        ["GG_Envanter", "Birim amiri + envanter ADMIN kapsamı"],
        ["Domain Users", "Kullanıcı"],
      ],
    },
    { t: "h1", text: "ITIL L1 / L2 talep akışı" },
    {
      t: "p",
      text: "Kurum yapısına göre arıza ve hizmet talepleri önce Servis Masası’na (Katman 1) düşer. Firewall, IP sabitleme, AD, veritabanı gibi uzman talepler doğrudan ilgili şubeye gider ve yalnızca o birimin yetkilileri görür / çözer.",
    },
    {
      t: "ul",
      items: [
        "L1 türler: SD_ ile başlayan Servis Masası kayıtları (destek, donanım, erişim, yazılım).",
        "Servis masası çözdüğünü kapatır (Tamamlandı / Red).",
        "Aşan iş: talep kartında “Katman 2 / uzman birim”. Hedef şube seçilir; kayıt SERVIS kuyruğundan çıkar, ofis uzman şubeye geçer (TRANSFERRED).",
        "Uzman şube hem kendi doğrudan taleplerini hem SD’den aktarılan L2 kayıtlarını işler.",
        "Yanlış birim aktarımı hâlâ MISROUTED ile yapılır; üst birim yükseltmesi UPPER_UNIT olarak PENDING kalır.",
      ],
    },
    { t: "h1", text: "Talep kuyruğunu işlemek" },
    {
      t: "p",
      text: "Yetkili olduğunuz ofiste menü öğesi /talepler?ofis=… listesini açar. Pano, o ofise gelen + sizin açtığınız talepleri sayar. Sistem yöneticisi Network kuyruğunu görmez; Network birim amiri Sistem kuyruğunu görmez. Başka ofise kendi talebiniz düştüyse onu “kendi kaydım” olarak görürsünüz, işleyemezsiniz.",
    },
    { t: "h2", text: "İşlem yetkisi" },
    {
      t: "ul",
      items: [
        "Durum değiştirme (Açık → İşlemde → Tamamlandı / Red).",
        "Yanlış birim aktarımı (hedef ofis zorunlu).",
        "Üst birime yükseltme (bekleyen yükseltmeyi kabul / red).",
        "Yüksek / Kritik önemde otomatik UPPER_UNIT kaydı oluşabilir; Kritik bazen Beklemede’ye alınır.",
      ],
    },
    {
      t: "table",
      headers: ["Yükseltme", "Kim yapar", "Sonuç"],
      rows: [
        ["Yanlış birim", "Yalnızca kuyruk yetkilisi", "Ofis değişir, TRANSFERRED"],
        ["Katman 2", "Yalnızca Servis Masası kuyruk yetkilisi", "Uzman ofise geçer, SD kuyruğundan çıkar"],
        ["Üst birim", "Görebilen (sahip veya yetkili)", "PENDING; hedef şube kabul ederse İşlemde"],
      ],
    },
    { t: "h1", text: "Grup bazlı modül yetkileri" },
    {
      t: "p",
      text: "Uygulama birden fazla birim tarafından kullanılır. Süper yönetici Ayarlar → Modül yetkileri ile AD grubu (GG_Envanter), rol (role:USER) veya ofis (office:SERVIS) satırlarına Görüntüle / İşle / Modül yöneticisi verir. Süper yönetici her zaman tam yetkilidir. Menü görünürlüğü bu tabloya göre süzülür.",
    },
    {
      t: "note",
      title: "Örnek",
      text: "GG_Envanter → Envanter yönetimi → Modül yöneticisi. role:USER → Envanter → Görüntüle (zimmet + birim). office:NETWORK → Talepler → İşle (yalnızca Network kuyruğu).",
    },
    { t: "h1", text: "Envanter yönetimi" },
    {
      t: "p",
      text: "Görüntüleme: VIEW = kendi + birim. HANDLE = aynı kapsamda düzenleme. ADMIN (GG_Envanter veya süper yönetici) = tüm kayıtlar, doğrudan ekleme/silme, toplu Excel, onay kuyruğu. Normal kullanıcı ve diğer birimler ekleme / silmeyi onaya gönderir; /envanter/onaylar.",
    },
    {
      t: "ul",
      items: [
        "Toplu yükleme: /envanter/toplu. Yalnızca envanter ADMIN. Şablonu indirin, doldurun, yükleyin.",
        "Onay kuyruğu menüde Envanter yönetimi altında “Ekleme / silme onayları”.",
        "İlişkiler: varlık kartında giden / gelen CI bağları.",
        "Açık zafiyetler varlık kartında ve listede görünür.",
        "Yaşam döngüsü HANDLE ve ADMIN içindir.",
        "Kalıcı silme: envanter ADMIN veya süper yönetici. Diğerleri silme isteği yollar.",
      ],
    },
    { t: "h1", text: "ITIL operasyon modülleri" },
    {
      t: "table",
      headers: ["Modül", "Kim kullanır", "Ne işe yarar"],
      rows: [
        ["Değişiklik", "Sistem, birim, BG, üst, süper", "Değişiklik kaydı, hedef birimler, BG onayı, pencere"],
        ["Yama", "Sistem, birim, üst, süper", "Yama tanımı, kapsam, dağıtım, risk"],
        ["Konfigürasyon", "Sistem, birim, süper", "Uygulama / sürüm / yedek tarihi"],
        ["Zafiyet", "Sistem, BG, üst, süper", "Manuel kayıt veya tarayıcıdan çekim"],
        ["Firma / SLA", "Sistem, birim, üst, süper", "Tedarikçi ve arıza / SLA bileti"],
        ["Olay / Problem", "Sistem, BG, süper", "Olay müdahalesi ve kök neden"],
        ["Hareketler", "Sistem, BG, üst, süper", "Denetim izi"],
      ],
    },
    {
      t: "p",
      text: "Yeni kayıtlar onay ayarı açıksa Beklemede / Onay bekliyor başlar. SIEM açıksa oluşturma olayı CEF veya Syslog olarak iletilir. SMTP ve onay e-postası açıksa amirlere ileti gider.",
    },
    { t: "h1", text: "Raporlar" },
    {
      t: "p",
      text: "Rapor kartı, rolünüzün göremeyeceği modülleri gizler. Filtreledikten sonra CSV, PDF veya Word alın. API /api/raporlar/[id]?format=csv aynı yetki kontrolünü uygular.",
    },
    { t: "h1", text: "Ayarlar (yalnızca süper yönetici)" },
    { t: "h2", text: "Active Directory" },
    {
      t: "p",
      text: "Sunucu, port, Base DN, Bind DN, LDAPS, kullanıcı / grup filtresi. “Bağlantıyı dene” ile LDAP probe edilir. Yetkilendirme sekmesinde grup → rol satırlarını kurumunuzdaki GG_* gruplarına göre düzenleyin.",
    },
    { t: "h2", text: "SIEM" },
    {
      t: "p",
      text: "Sekme adı SIEM’dir. Taşıma: UDP, TCP veya TLS. Log formatı ayrı seçilir:",
    },
    {
      t: "ul",
      items: [
        "CEF: CEF:0|üretici|ürün|sürüm|imza|ad|önem|uzantılar. Vendor / product / version alanlarını doldurun.",
        "Syslog: RFC 5424. Uygulama adı ve facility (local0 varsayılan). PRI = facility × 8 + önem.",
        "Test kaydı gönder, seçili formatta HEARTBEAT yollar. Hedef kapalıysa hata hareket günlüğüne de düşer.",
      ],
    },
    { t: "h2", text: "Zafiyet tarama cihazı" },
    {
      t: "p",
      text: "Nessus, Tenable, Qualys, OpenVAS, Rapid7 veya genel REST. Demo kaynak laboratuvar içindir; üretimde kapatın. “Tarayıcıdan çek” Zafiyet sayfasındadır; IP / ad ile envanter eşlenir.",
    },
    { t: "h2", text: "Onaylar, e-posta, tema" },
    {
      t: "ul",
      items: [
        "Birim amiri / üst amir / bilgi güvenliği onay anahtarları; talep, değişiklik, yama için ayrı uygulansın kutuları.",
        "SMTP: STARTTLS / SSL, gönderen, test alıcısı.",
        "Görünüm: tema tüm oturumlara yazılır. Audit log bu sekmenin yanındadır.",
        "Modül yetkileri: grup / rol / ofis → VIEW|HANDLE|ADMIN.",
      ],
    },
    { t: "h1", text: "REST API" },
    {
      t: "p",
      text: "Dış sistemler /api/v1 üzerinden bağlanır. Kimlik: Authorization Bearer, X-Api-Key veya oturum çerezi. Anahtar üretme ve iptal API arayüzü sayfasındadır (yalnızca süper yönetici). Yazma (talep açma, durum, olay) yalnızca bağlı anahtar veya aynı kaynak oturumu ile yapılır. Servis anahtarı salt okunurdur. OpenAPI oturum/anahtar ister. Tam uç listesi API Kılavuzu PDF’indedir (Kılavuzlar).",
    },
    {
      t: "ul",
      items: [
        "Yazma kapsamı için personel bağlayın; kapsam o kişinin ACL’i ile kesişir. Bağlı olmayan anahtara yazma verilmez.",
        "İzinli IP / CIDR ve varsayılan 90 gün süre tanımlayın. Yazma anahtarında süre en fazla 365 gündür.",
        "Hız: okuma 60/dk, yazma 20/dk, başarısız kimlik 20/dk. İptal veya süresi dolmuş anahtar aynı 401 metnini döner.",
        "POST /api/v1/talepler L1 türlerde ofisi SERVIS yapar; durum API’den ilk açılışta Açık (veya onay) olur.",
      ],
    },
    { t: "h1", text: "Kurulum ve işletme" },
    { t: "h2", text: "Yerel" },
    {
      t: "ol",
      items: [
        "npm install && cp .env.example .env",
        "npx prisma migrate deploy && npm run db:seed",
        "npm run dev  →  http://localhost:43130",
      ],
    },
    { t: "h2", text: "Docker" },
    {
      t: "p",
      text: "docker compose up --build. Uygulama 43130, PostgreSQL (pgdata volume) kullanılır. SEED_ON_START=false boş şema açar. docker compose down -v veriyi siler.",
    },
    {
      t: "p",
      text: "DATABASE_URL docker-compose tarafından PostgreSQL için ayarlanır. Üretimde SESSION_SECRET tanımlayın; aksi halde geliştirme anahtarı kullanılır.",
    },
    { t: "h2", text: "Örnek hesaplar (yalnızca laboratuvar)" },
    {
      t: "table",
      headers: ["Kullanıcı", "Rol", "Ofis kuyruğu"],
      rows: [
        ["ahmet.yilmaz", "Süper yönetici", "Tümü"],
        ["nihan.celik", "Envanter şube (GG_Envanter)", "Kuyruk yok"],
        ["kemal.ozkan", "Sistem yöneticisi", "Sistem"],
        ["mehmet.kara", "Kullanıcı", "Yok"],
        ["elif.demir", "Birim amiri", "Network"],
        ["selin.koc", "Bilgi güvenliği", "Siber"],
        ["can.yildiz", "Birim amiri", "Yazılım"],
        ["deniz.arslan", "Birim amiri", "Veritabanı"],
        ["merve.uslu", "Birim amiri", "Servis Masası"],
        ["zeynep.aydin", "Birim amiri", "Ofis yok (yalnızca kendi)"],
        ["burak.sahin", "Kullanıcı", "Yok"],
      ],
    },
    {
      t: "note",
      title: "Parola",
      text: "Tohum veride tüm örnek hesapların parolası Kurum123! şeklindedir. Üretime çıkmadan değiştirin veya tohumu kapatın.",
    },
    { t: "h1", text: "Güvenlik notları" },
    {
      t: "ul",
      items: [
        "Sunucu eylemleri (kaydet, sil, ayar, tarayıcı çekimi) oturum ve rol kontrolü yapar; yalnızca menüyü gizlemek yetmez.",
        "Kayıt silme SUPER_ADMIN veya envanter ADMIN ile sınırlıdır; diğerleri onay ister.",
        "REST /api/v1 oturumsuz açılır ama anahtar veya çerez ister; /api/uploads ve rapor indirme oturum ister.",
        "Rapor ve envanter şablon API’leri aynı yetki matrisini kullanır.",
        "SIEM ve SMTP hataları hareket günlüğüne SIEM_ERROR / MAIL_ERROR olarak yazılır.",
        "Ortak hesap kullanmayın; her işlemin aktörü personel kimliğine bağlanır.",
      ],
    },
    { t: "h1", text: "Hızlı kontrol listesi" },
    {
      t: "ol",
      items: [
        "Süper yönetici ile Ayarlar: AD, SIEM, tarayıcı, SMTP, onaylar, Modül yetkileri. API anahtarları API arayüzündedir.",
        "Servis masasına UNIT_MANAGER + SERVIS verin; L1 kapatma ve Katman 2 aktarımını deneyin.",
        "Uzman şubelere doğru talep ofisi verin; firewall / IP talebinin yalnızca o kuyrukta olduğunu doğrulayın.",
        "Envanter Şube’ye GG_Envanter verin; kullanıcı ekleme isteğinin onaya düştüğünü kontrol edin.",
        "Kullanıcıları USER bırakın; ofis alanı kuyruk açmaz.",
        "Örnek parolaları değiştirin, demo tarayıcı kaynağını kapatın.",
        "API arayüzü ve /api/v1/health ile entegrasyonu doğrulayın.",
      ],
    },
  ],
};

const API_GUIDE: Guide = {
  file: "api-kilavuzu.pdf",
  title: "API Kılavuzu",
  subtitle: "REST v1, anahtarlar, kapsamlar ve örnek istekler",
  audience: "Entegrasyon ekipleri, sistem ve süper yöneticiler",
  blocks: [
    { t: "h1", text: "Nerede bulunur?" },
    {
      t: "ul",
      items: [
        "Uygulama menüsü: sol altta API arayüzü (/api-arayuzu). Uç listesi, kapsamlar, canlı deneme ve (süper yönetici) anahtar üretme / iptal.",
        "Kılavuzlar: bu PDF (api-kilavuzu.pdf).",
        "Makine okunur: GET /api/v1 katalog, GET /api/v1/openapi.json OpenAPI 3 tanımı, GET /api/v1/health sağlık.",
      ],
    },
    { t: "h1", text: "Kimlik doğrulama" },
    {
      t: "p",
      text: "Üç yöntemden biri yeterlidir. Anahtar değeri yalnızca oluşturulurken bir kez gösterilir; önek (bth_xxxxxxxx) listede kalır, tam sır tekrar üretilmez.",
    },
    {
      t: "ul",
      items: [
        "Authorization: Bearer bth_ön ek_gizli",
        "X-Api-Key: aynı değer",
        "Oturum çerezi: API arayüzü sayfasındaki deneme; kapsamlar sizin rol / ACL’nizden türetilir.",
      ],
    },
    {
      t: "note",
      title: "Yazma güvenliği",
      text: "POST / PATCH yalnızca bağlı anahtar veya aynı kaynak oturumu ile çalışır. Servis (bağlı olmayan) anahtar salt okunurdur. Bağlı anahtarın kapsamı kişinin ACL’i ile kesişir; süper yönetici olmayan bir kullanıcıya verilen fazladan yazma kapsamı yok sayılır.",
    },
    { t: "h1", text: "Kapsamlar" },
    {
      t: "table",
      headers: ["Kapsam", "Anlamı"],
      rows: [
        ["envanter:read / write", "Envanter listele; yazma ileride onaylı ekleme için ayrılmıştır"],
        ["talepler:read / write", "Talep oku; yaz = aç ve durum güncelle"],
        ["personel:read", "Personel listesi (TC / parola yok)"],
        ["zafiyet:read", "Zafiyet listesi"],
        ["olay:read / write", "Olay oku / yeni olay"],
        ["problem:read", "Problem listesi"],
        ["degisiklik:read", "Değişiklik listesi"],
        ["yama:read", "Yama listesi"],
      ],
    },
    { t: "h1", text: "Uçlar" },
    {
      t: "table",
      headers: ["Yöntem", "Yol", "Kapsam"],
      rows: [
        ["GET", "/api/v1", "Yok"],
        ["GET", "/api/v1/health", "Yok"],
        ["GET", "/api/v1/openapi.json", "Anahtar veya oturum"],
        ["GET", "/api/v1/me", "Anahtar veya oturum"],
        ["GET", "/api/v1/katalog", "talepler:read"],
        ["GET", "/api/v1/talepler", "talepler:read"],
        ["POST", "/api/v1/talepler", "talepler:write"],
        ["GET", "/api/v1/talepler/:id", "talepler:read"],
        ["PATCH", "/api/v1/talepler/:id", "talepler:write"],
        ["GET", "/api/v1/envanter", "envanter:read"],
        ["GET", "/api/v1/envanter/:id", "envanter:read"],
        ["GET", "/api/v1/personel", "personel:read"],
        ["GET", "/api/v1/zafiyet", "zafiyet:read"],
        ["GET", "/api/v1/olay", "olay:read"],
        ["POST", "/api/v1/olay", "olay:write"],
        ["GET", "/api/v1/problem", "problem:read"],
        ["GET", "/api/v1/degisiklik", "degisiklik:read"],
        ["GET", "/api/v1/yama", "yama:read"],
      ],
    },
    {
      t: "p",
      text: "Liste uçlarında q (arama), status, type / office, limit (en fazla 100, varsayılan 50) kullanılabilir. Yanıt biçimi { ok, data, count? } veya { ok: false, error } şeklindedir.",
    },
    { t: "h1", text: "Talep açma örneği" },
    {
      t: "p",
      text: "Arıza (SD_SUPPORT) önce Servis Masası’na düşer. requestType kataloğundaki anahtardır. Zorunlu türe özel alanlar details nesnesinde gider.",
    },
    {
      t: "ul",
      items: [
        "curl -H \"Authorization: Bearer bth_…\" -H \"Content-Type: application/json\" \\",
        "-d '{\"requestType\":\"SD_SUPPORT\",\"reason\":\"Yazıcı basmıyor\",\"severity\":\"MEDIUM\",\"details\":{\"category\":\"INCIDENT\",\"affectedService\":\"Kat yazıcısı\",\"sdProduct\":\"SDP\"}}' \\",
        "https://sunucu/api/v1/talepler",
      ],
    },
    {
      t: "p",
      text: "Durum güncelleme (yalnızca kuyruk yetkilisi veya servis anahtarı): PATCH /api/v1/talepler/{id}  {\"status\":\"IN_PROGRESS\"}. Geçerli durumlar: OPEN, IN_PROGRESS, WAITING, DONE, REJECTED, CANCELLED.",
    },
    { t: "h1", text: "ITIL ve yetki" },
    {
      t: "ul",
      items: [
        "L1 (SD_*) ofisi SERVIS’tir. L2 türler (FW_INTRANET, IP_RESERVE, …) kendi şubesine gider.",
        "Bağlı anahtar servis masası personeline aitse yalnızca SERVIS kuyruğu + kendi talepleri görünür.",
        "Envanter listesi VIEW kapsamındaki gibi zimmet + birimdir; SUPER / bağlı olmayan ADMIN anahtar tümünü görür.",
        "Yeni talep onay ayarı açıksa WAITING ile başlayabilir; Kritik önem üst birim yükseltmesi üretebilir.",
      ],
    },
    { t: "h1", text: "Güvenlik" },
    {
      t: "ul",
      items: [
        "Anahtarı günlük, SIEM veya depo dosyasına yazmayın. Sızdıysa API arayüzü → Anahtarlar’dan iptal edin.",
        "Özet HMAC-SHA256 (SESSION_SECRET). Gövde en fazla 32 KB; Content-Type application/json.",
        "Okuma 60/dk, yazma 20/dk, hatalı kimlik 20/dk; 429 + Retry-After.",
        "CORS yalnızca uygulamanın kökeni ve API_CORS_ORIGINS. Joker (*) yoktur.",
        "İsteğe bağlı IP / CIDR allowlist. OpenAPI ve tam katalog kimlik ister.",
        "Personel yanıtında TC, parola ve AD grupları yoktur.",
      ],
    },
    { t: "h1", text: "Hata kodları" },
    {
      t: "table",
      headers: ["HTTP", "Anlam"],
      rows: [
        ["200 / 201", "Başarılı; 201 oluşturma"],
        ["400", "Eksik alan veya geçersiz JSON / tür"],
        ["401", "Anahtar veya oturum yok / geçersiz"],
        ["403", "Kapsam veya kayıt görünürlüğü yetersiz"],
        ["404", "Uç veya kayıt yok"],
        ["405", "Yöntem yok"],
        ["429", "Hız sınırı"],
        ["500", "Sunucu hatası (ayrıntı sızdırılmaz)"],
      ],
    },
  ],
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const only = process.env.GUIDE_ONLY;
  for (const guide of [USER_GUIDE, ADMIN_GUIDE, API_GUIDE, ITIL_V4_GUIDE, AGILE_GUIDE]) {
    if (only && guide.file !== only) continue;
    const buffer = await renderGuide(guide);
    const target = join(OUT_DIR, guide.file);
    writeFileSync(target, buffer);
    console.log(`${guide.file}  ${buffer.length} byte`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
