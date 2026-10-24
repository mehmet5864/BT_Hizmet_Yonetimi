// Kılavuz resimlerini (şematik SVG) üretir: node tools/generate-guide-images.mjs
// Çıktı: public/guides/*.svg  — Bunlar gerçek ekran görüntüsü değil, ekran düzeninin şemasıdır.
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "public/guides";
mkdirSync(OUT, { recursive: true });
const F = "font-family=\"Segoe UI, Arial, sans-serif\"";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const txt = (x, y, s, size = 12, fill = "#1f2937", extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${F} ${extra}>${esc(s)}</text>`;
const rect = (x, y, w, h, fill, stroke = "none", r = 6, sw = 1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const badge = (x, y, n) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="#e11d48"/>${txt(x, y + 4, n, 12, "#fff", 'text-anchor="middle" font-weight="700"')}`;
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">` +
  `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker></defs>` +
  `<rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;
const save = (name, w, h, body) => writeFileSync(`${OUT}/${name}.svg`, svg(w, h, body));

/* ---------- Ekran şemaları ---------- */
const MENU = [
  "Genel bakış", "Personel", "Envanter", "Talepler", "Değişiklik", "Yama", "Konfigürasyon", "Zafiyet",
  "Firma / SLA", "Olay", "Problem", "Çevik çalışma", "Hizmet kataloğu", "Bilgi bankası", "Süreç akışları",
  "İş akışı onayları", "Raporlar", "API arayüzü", "Kılavuzlar", "Ayarlar",
];

function shell(active, title, buttons = []) {
  let b = rect(0, 0, 900, 540, "#f8fafc", "#cbd5e1", 8);
  b += rect(0, 0, 150, 540, "#1e293b", "none", 8);
  b += txt(14, 26, "BT Hizmet Yönetimi", 12, "#fff", 'font-weight="700"');
  MENU.forEach((m, i) => {
    const y = 40 + i * 24;
    if (m === active) b += rect(6, y - 4, 138, 22, "#3b82f6", "none", 5);
    b += txt(16, y + 11, m, 11, m === active ? "#fff" : "#cbd5e1");
  });
  b += rect(150, 0, 750, 40, "#fff", "#e2e8f0", 0);
  b += rect(170, 10, 220, 20, "#f1f5f9", "#e2e8f0", 10) + txt(182, 24, "Ara…", 11, "#94a3b8");
  b += rect(820, 8, 62, 24, "#e2e8f0", "none", 12) + txt(851, 24, "Profil", 11, "#334155", 'text-anchor="middle"');
  b += txt(172, 72, title, 17, "#0f172a", 'font-weight="700"');
  let bx = 880;
  [...buttons].reverse().forEach((label, i) => {
    const w = Math.max(70, label.length * 7 + 22);
    bx -= w;
    b += rect(bx, 54, w, 26, i === buttons.length - 1 ? "#2563eb" : "#fff", i === buttons.length - 1 ? "none" : "#94a3b8", 6);
    b += txt(bx + w / 2, 71, label, 11, i === buttons.length - 1 ? "#fff" : "#334155", 'text-anchor="middle"');
    bx -= 8;
  });
  return b;
}

function listBody(s) {
  let b = "";
  let x = 172;
  (s.filters || []).forEach((f) => {
    const w = Math.max(90, f.length * 7 + 28);
    b += rect(x, 96, w, 26, "#fff", "#cbd5e1", 6) + txt(x + 10, 113, f, 11, "#64748b") + txt(x + w - 16, 113, "▾", 10, "#94a3b8");
    x += w + 8;
  });
  const cols = s.cols;
  const cw = 710 / cols.length;
  b += rect(172, 136, 710, 28, "#e2e8f0", "none", 4);
  cols.forEach((c, i) => (b += txt(182 + i * cw, 154, c, 11, "#334155", 'font-weight="700"')));
  for (let r = 0; r < 6; r++) {
    const y = 168 + r * 34;
    b += rect(172, y, 710, 30, r % 2 ? "#f8fafc" : "#fff", "#e2e8f0", 4);
    cols.forEach((c, i) => {
      const w = i === 0 ? 38 : 30 + ((r * 13 + i * 17) % 40);
      b += rect(182 + i * cw, y + 12, w, 6, "#cbd5e1", "none", 3);
    });
  }
  b += rect(172, 380, 710, 120, "#fff", "#cbd5e1", 8) + txt(186, 402, s.detail || "Seçili kaydın ayrıntısı", 12, "#0f172a", 'font-weight="700"');
  [0, 1, 2, 3].forEach((i) => (b += rect(186, 414 + i * 20, 200 + ((i * 53) % 160), 7, "#e2e8f0", "none", 3)));
  b += rect(640, 414, 220, 70, "#eff6ff", "#bfdbfe", 6) + txt(652, 436, s.side || "Onay / durum paneli", 11, "#1d4ed8", 'font-weight="700"');
  b += rect(652, 446, 120, 7, "#bfdbfe", "none", 3) + rect(652, 462, 90, 7, "#bfdbfe", "none", 3);
  return b + badge(205, 50, 1) + badge(172, 94, 2) + badge(172, 134, 3) + badge(172, 166, 4) + badge(160, 378, 5);
}

function cardsBody(s) {
  let b = "";
  const items = s.cards;
  const n = items.length;
  const cols = n > 6 ? 4 : 3;
  const w = (710 - (cols - 1) * 12) / cols;
  items.forEach((c, i) => {
    const x = 172 + (i % cols) * (w + 12);
    const y = 100 + Math.floor(i / cols) * 112;
    b += rect(x, y, w, 100, "#fff", "#cbd5e1", 8);
    b += txt(x + 12, y + 24, c, 12, "#0f172a", 'font-weight="700"');
    b += rect(x + 12, y + 40, w - 60, 7, "#e2e8f0", "none", 3) + rect(x + 12, y + 56, w - 90, 7, "#e2e8f0", "none", 3);
    b += rect(x + 12, y + 76, 56, 14, "#dbeafe", "none", 7);
  });
  return b + badge(205, 50, 1) + badge(172, 98, 2) + badge(172 + (cols > 1 ? w + 12 : 0), 98, 3) + badge(172, 212, 4);
}

function boardBody(s) {
  let b = "";
  const cols = s.columns;
  const w = (710 - (cols.length - 1) * 10) / cols.length;
  cols.forEach((c, i) => {
    const x = 172 + i * (w + 10);
    b += rect(x, 100, w, 400, "#f1f5f9", "#e2e8f0", 8) + txt(x + 10, 120, c, 12, "#0f172a", 'font-weight="700"');
    for (let k = 0; k < 3 - (i % 2); k++) {
      const y = 134 + k * 78;
      b += rect(x + 8, y, w - 16, 68, "#fff", "#cbd5e1", 6) + rect(x + 16, y + 12, w - 60, 7, "#cbd5e1", "none", 3) + rect(x + 16, y + 30, w - 90, 7, "#e2e8f0", "none", 3) + rect(x + 16, y + 48, 40, 10, "#dbeafe", "none", 5);
    }
  });
  return b + badge(205, 50, 1) + badge(172, 98, 2) + badge(172 + w + 10, 132, 3) + badge(172 + 2 * (w + 10), 132, 4);
}

function formBody(s) {
  let b = "";
  if (s.tabs) {
    let x = 172;
    s.tabs.forEach((t) => {
      const w = t.length * 7 + 24;
      const on = t === s.activeTab;
      b += rect(x, 92, w, 26, on ? "#2563eb" : "#fff", on ? "none" : "#cbd5e1", 6) + txt(x + w / 2, 109, t, 11, on ? "#fff" : "#475569", 'text-anchor="middle"');
      x += w + 6;
    });
  }
  const fields = s.fields;
  fields.forEach((f, i) => {
    const wide = f.startsWith("*");
    const label = wide ? f.slice(1) : f;
    const col = wide ? 0 : i % 2;
    const row = Math.floor(i / 2);
    const x = 172 + col * 360;
    const y = 136 + row * 62;
    const w = wide ? 710 : 340;
    const isFlag = label.startsWith("☐");
    if (isFlag) {
      b += rect(x, y + 6, 16, 16, "#fff", "#64748b", 3) + txt(x + 26, y + 19, label.slice(1).trim(), 11, "#0f172a");
    } else {
      b += txt(x, y + 8, label, 11, "#334155", 'font-weight="600"') + rect(x, y + 14, w, 28, "#fff", "#cbd5e1", 6);
    }
  });
  const bottom = 136 + Math.ceil(fields.length / 2) * 62 + 6;
  b += rect(172, Math.min(bottom, 478), 120, 30, "#2563eb", "none", 6) + txt(232, Math.min(bottom, 478) + 20, s.save || "Kaydet", 12, "#fff", 'text-anchor="middle"');
  b += rect(302, Math.min(bottom, 478), 150, 30, "#fff", "#94a3b8", 6) + txt(377, Math.min(bottom, 478) + 20, s.test || "Bağlantıyı dene", 12, "#334155", 'text-anchor="middle"');
  const marks = s.marks || [];
  marks.forEach((m, i) => {
    const idx = m;
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    b += badge(172 + col * 360 - 10, 136 + row * 62 + 4, i + 1);
  });
  return b + badge(Math.min(0, 0) + 160, Math.min(bottom, 478) + 15, marks.length + 1) + badge(290, Math.min(bottom, 478) - 4, marks.length + 2);
}

function screen(s) {
  const body = s.kind === "cards" ? cardsBody(s) : s.kind === "board" ? boardBody(s) : s.kind === "form" ? formBody(s) : listBody(s);
  save(s.file, 900, 540, shell(s.menu, s.title, s.buttons) + body);
}

const LIST = (file, menu, title, buttons, filters, cols, detail, side) => ({ file, menu, title, buttons, filters, cols, detail, side, kind: "list" });

const screens = [
  { file: "ekran-genel-bakis", menu: "Genel bakış", title: "Genel bakış", kind: "cards", buttons: ["Yenile"], cards: ["Açık olaylar", "SLA uyumu", "Bekleyen onaylar", "Kritik zafiyetler", "Planlı değişiklikler", "Bekleyen yamalar", "Envanter özeti", "Bugünün işleri"] },
  LIST("ekran-personel", "Personel", "Personel", ["Dışa aktar", "Yeni personel"], ["Birim", "Rol", "Durum"], ["Ad soyad", "Sicil", "Birim", "Rol", "Amir", "Durum"], "Personel kartı: iletişim, rol, zimmetler, hareketler", "Rol ve birim ataması"),
  LIST("ekran-envanter", "Envanter", "Envanter", ["Toplu içe aktar", "Yeni varlık"], ["Tür", "Durum", "Birim"], ["Etiket", "Tür", "Marka / model", "Zimmet", "Durum", "Ofis"], "Varlık kartı: seri no, zimmet geçmişi, bağlı zafiyet ve yamalar", "Ekleme / silme onayı"),
  LIST("ekran-talepler", "Talepler", "Talepler (Hizmet masası)", ["Dışa aktar", "Yeni talep"], ["Durum", "Öncelik", "Atanan"], ["No", "Konu", "Talep eden", "Öncelik", "Atanan", "Durum"], "Talep ayrıntısı: açıklama, yorumlar, onay zinciri", "Onay kademeleri"),
  LIST("ekran-degisiklik", "Değişiklik", "Değişiklik yönetimi", ["Dışa aktar", "Yeni değişiklik"], ["Tür", "Risk", "Durum"], ["No", "Başlık", "Tür", "Risk", "Planlanan tarih", "Durum"], "Değişiklik ayrıntısı: gerekçe, etki, geri dönüş planı", "Onay zinciri (amir → bilgi güvenliği)"),
  LIST("ekran-yama", "Yama", "Yama yönetimi", ["Dışa aktar", "Yeni yama"], ["Önem", "Durum", "Hedef"], ["No", "Yama / KB", "Hedef sistem", "Önem", "Termin", "Durum"], "Yama ayrıntısı: kapsam, test sonucu, uygulama notu", "Onay zinciri"),
  LIST("ekran-konfigurasyon", "Konfigürasyon", "Konfigürasyon yönetimi (CMDB)", ["Yeni kayıt"], ["Tür", "Kritiklik"], ["Ad", "Tür", "Sahibi", "Kritiklik", "Bağımlılık", "Durum"], "Konfigürasyon öğesi: ilişkiler ve bağlı kayıtlar", "Etki analizi"),
  LIST("ekran-zafiyet", "Zafiyet", "Zafiyet yönetimi", ["Tarayıcıdan çek", "Yeni zafiyet"], ["Önem", "Durum", "Cihaz"], ["Cihaz", "IP", "Zafiyet / CVE", "Önem", "Termin", "Durum"], "Zafiyet ayrıntısı: açıklama, bağlı varlık, kapatma notu", "Kapatma onayı"),
  LIST("ekran-firma-sla", "Firma / SLA", "Firma ve SLA", ["Yeni firma", "Yeni sözleşme"], ["Firma", "Durum"], ["Firma", "Hizmet", "Sözleşme bitişi", "Yanıt süresi", "Çözüm süresi", "Durum"], "Firma / sözleşme kartı ve SLA hedefleri", "Süre ve ceza maddeleri"),
  LIST("ekran-olay", "Olay", "Olay yönetimi", ["Dışa aktar", "Yeni olay"], ["Öncelik", "Durum", "Atanan"], ["No", "Özet", "Etki", "Öncelik", "Atanan", "SLA"], "Olay ayrıntısı: zaman çizelgesi, çözüm notu, bağlı problem", "SLA sayacı"),
  LIST("ekran-problem", "Problem", "Problem yönetimi", ["Yeni problem"], ["Durum", "Önem"], ["No", "Başlık", "Bağlı olaylar", "Kök neden", "Bilinen hata", "Durum"], "Problem ayrıntısı: kök neden analizi, geçici çözüm", "Bağlı olaylar"),
  { file: "ekran-cevik", menu: "Çevik çalışma", title: "Çevik çalışma", kind: "board", buttons: ["Yeni iş", "Sprint planla"], columns: ["Backlog", "Yapılacak", "Devam ediyor", "Test", "Bitti"] },
  { file: "ekran-katalog", menu: "Hizmet kataloğu", title: "Hizmet kataloğu", kind: "cards", buttons: ["Yeni hizmet"], cards: ["Hesap ve erişim", "Cihaz talebi", "Yazılım kurulumu", "VPN / uzaktan erişim", "E-posta", "Ağ ve internet", "Yazıcı", "Güvenlik talebi"] },
  LIST("ekran-bilgi", "Bilgi bankası", "Bilgi bankası", ["Yeni makale"], ["Kategori", "Durum"], ["Başlık", "Kategori", "Yazar", "Güncelleme", "Görüntülenme", "Durum"], "Makale: adımlar, ekran notları, ilgili hizmetler", "Yayın durumu"),
  { file: "ekran-surec-akis", menu: "Süreç akışları", title: "Süreç akışları", kind: "cards", buttons: ["Yeni akış"], cards: ["Olay akışı", "Değişiklik akışı", "Yama akışı", "Zafiyet akışı", "DevSecOps: kod → yayın", "DevSecOps: güvenlik kapısı"] },
  LIST("ekran-is-akisi", "İş akışı onayları", "İş akışı onaylarım", [], ["Kayıt türü", "Durum"], ["Kayıt", "Tür", "Konu", "Talep eden", "Bekleme", "Karar"], "Seçili kaydın özeti ve geçmiş kararlar", "Onayla / Reddet / Yorum"),
  { file: "ekran-raporlar", menu: "Raporlar", title: "Raporlar", kind: "cards", buttons: ["Zamanla"], cards: ["Yönetici özeti", "SLA uyumu", "Çözüm süreleri", "Açık yaşlandırma", "Değişiklik başarı", "Zafiyet termin", "Onay süreleri", "Erişim denetimi"] },
  LIST("ekran-api", "API arayüzü", "API arayüzü", ["Anahtarlar"], ["Kaynak", "Yöntem"], ["Yöntem", "Yol", "Kapsam", "Açıklama", "Yazma", "Durum"], "Uç nokta: örnek istek ve yanıt", "Dene"),
  { file: "ekran-kilavuzlar", menu: "Kılavuzlar", title: "Kılavuzlar", kind: "cards", buttons: [], cards: ["ITIL v4", "Çevik çalışma", "Kullanıcı rehberi", "Yönetici rehberi", "API kılavuzu"] },
  { file: "ekran-ayarlar", menu: "Ayarlar", title: "Ayarlar", kind: "form", buttons: [], tabs: ["Tanımlar", "Active Directory", "SIEM", "Zafiyet tarama", "Yönetici onayları", "E-posta", "Yetkilendirme", "Modül yetkileri", "Yedek", "Audit log"], activeTab: "Tanımlar", fields: ["Birim türü", "Birim adı", "Bağlı olduğu üst birim", "Birim amiri"], marks: [0, 3], save: "Birimi kaydet", test: "İptal" },
];
screens.forEach(screen);

/* Yönetici: ayar ekranı şemaları */
screen({ file: "yonetim-ad", menu: "Ayarlar", title: "Ayarlar › Active Directory", kind: "form", buttons: [], tabs: ["Tanımlar", "Active Directory", "SIEM", "Zafiyet tarama", "Yönetici onayları", "E-posta"], activeTab: "Active Directory", fields: ["☐ AD entegrasyonunu aç", "☐ LDAPS kullan", "Sunucu / domain", "Port", "Base DN", "Bind DN / kullanıcı", "Bind parolası", "Kullanıcı filtresi", "Grup filtresi"], marks: [0, 2, 4, 5], test: "Bağlantıyı dene" });
screen({ file: "yonetim-siem", menu: "Ayarlar", title: "Ayarlar › SIEM", kind: "form", buttons: [], tabs: ["Tanımlar", "Active Directory", "SIEM", "Zafiyet tarama", "Yönetici onayları", "E-posta"], activeTab: "SIEM", fields: ["☐ SIEM gönderimini aç", "SIEM adresi", "Port", "Protokol (UDP / TCP / TLS)", "Log formatı (CEF / Syslog)", "CEF Device Vendor", "CEF Device Product", "Syslog facility"], marks: [0, 2, 3, 4], test: "Test kaydı gönder" });
screen({ file: "yonetim-tarayici", menu: "Ayarlar", title: "Ayarlar › Zafiyet tarama", kind: "form", buttons: [], tabs: ["Tanımlar", "Active Directory", "SIEM", "Zafiyet tarama", "Yönetici onayları", "E-posta"], activeTab: "Zafiyet tarama", fields: ["☐ Tarama cihazı bağlantısını aç", "☐ Envanter ile otomatik eşle", "Cihaz / ürün", "Protokol", "Cihaz adresi", "Port", "*API yolu", "API access key", "API secret key", "Kritik termin (gün)", "Yüksek termin (gün)"], marks: [0, 2, 4, 7], test: "Bağlantıyı dene" });
screen({ file: "yonetim-eposta", menu: "Ayarlar", title: "Ayarlar › E-posta", kind: "form", buttons: [], tabs: ["Tanımlar", "Active Directory", "SIEM", "Zafiyet tarama", "Yönetici onayları", "E-posta"], activeTab: "E-posta", fields: ["☐ E-posta gönderimini aç", "SMTP sunucu", "Port", "Şifreleme", "Kullanıcı adı", "Parola", "Gönderen adresi", "Test alıcısı"], marks: [1, 2, 3, 7], test: "SMTP / test iletisi" });
screen({ file: "yonetim-onay", menu: "Ayarlar", title: "Ayarlar › Yönetici onayları", kind: "form", buttons: [], tabs: ["Tanımlar", "Active Directory", "SIEM", "Zafiyet tarama", "Yönetici onayları", "E-posta"], activeTab: "Yönetici onayları", fields: ["☐ Birim amiri onayı", "☐ Üst amir onayı", "☐ Bilgi güvenliği onayı", "☐ Onay beklerken e-posta gönder", "☐ Servis taleplerinde uygula", "☐ Değişiklik yönetiminde uygula", "☐ Yama yönetiminde uygula", "Onay süresi (saat)"], marks: [0, 3, 4, 7], test: "Sıfırla" });
screen({ file: "yonetim-rbac", menu: "Ayarlar", title: "Ayarlar › Yetkilendirme", kind: "form", buttons: [], tabs: ["Tanımlar", "SIEM", "Zafiyet tarama", "Yönetici onayları", "E-posta", "Yetkilendirme", "Modül yetkileri"], activeTab: "Yetkilendirme", fields: ["Eşleşme yoksa AD rolü", "*GG_BilgiGuvenligi  →  Bilgi güvenliği yöneticisi", "*GG_BirimAmirleri  →  Birim amiri", "*GG_SistemYoneticileri  →  Sistem yöneticisi"], marks: [0, 1, 2], save: "Kaydet", test: "Grup eşlemesi ekle" });

/* ---------- Akış diyagramları ---------- */
function flow({ file, title, subtitle, steps, perRow = 4, color = "#2563eb" }) {
  const bw = 190, bh = 92, gx = 40, gy = 54, left = 30, top = 80;
  const rows = Math.ceil(steps.length / perRow);
  const W = left * 2 + perRow * bw + (perRow - 1) * gx;
  const H = top + rows * bh + (rows - 1) * gy + 40;
  let b = txt(left, 34, title, 18, "#0f172a", 'font-weight="700"');
  if (subtitle) b += txt(left, 56, subtitle, 12, "#64748b");
  const pos = (i) => {
    const r = Math.floor(i / perRow);
    const c = r % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow);
    return { x: left + c * (bw + gx), y: top + r * (bh + gy), r, c };
  };
  steps.forEach((s, i) => {
    const p = pos(i);
    const fill = s.c || "#eff6ff";
    b += rect(p.x, p.y, bw, bh, fill, color, 10, 1.5);
    b += `<circle cx="${p.x + 16}" cy="${p.y + 16}" r="11" fill="${color}"/>` + txt(p.x + 16, p.y + 20, i + 1, 12, "#fff", 'text-anchor="middle" font-weight="700"');
    b += txt(p.x + 34, p.y + 21, s.t, 12, "#0f172a", 'font-weight="700"');
    wrap(s.s || "", 30).forEach((ln, k) => (b += txt(p.x + 12, p.y + 44 + k * 15, ln, 11, "#475569")));
    if (i < steps.length - 1) {
      const q = pos(i + 1);
      if (q.r === p.r) {
        const dir = q.x > p.x ? 1 : -1;
        const x1 = dir > 0 ? p.x + bw : p.x;
        b += `<line x1="${x1}" y1="${p.y + bh / 2}" x2="${x1 + dir * gx}" y2="${p.y + bh / 2}" stroke="#475569" stroke-width="2" marker-end="url(#ar)"/>`;
      } else {
        b += `<line x1="${p.x + bw / 2}" y1="${p.y + bh}" x2="${q.x + bw / 2}" y2="${q.y}" stroke="#475569" stroke-width="2" marker-end="url(#ar)"/>`;
      }
    }
  });
  save(file, W, H, b);
}
function wrap(s, n) {
  const words = String(s).split(" ");
  const lines = [];
  let cur = "";
  words.forEach((w) => {
    if ((cur + " " + w).trim().length > n) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

flow({ file: "akis-itil-deger-zinciri", title: "ITIL hizmet değer zinciri", subtitle: "Altı etkinlik; her menü bu zincirin bir parçasını taşır", perRow: 3, steps: [
  { t: "Planla", s: "Strateji, mimari, portföy. Hizmet kataloğu, Çevik backlog." },
  { t: "İyileştir", s: "Sürekli iyileştirme. Problem, retrospektif, raporlar." },
  { t: "Katılım", s: "Kullanıcıyla ilişki. Hizmet masası, bilgi bankası." },
  { t: "Tasarla ve geçiş", s: "Yeni/değişen hizmet. Değişiklik, yama, konfigürasyon." },
  { t: "Edin / geliştir", s: "Bileşen sağlama. Envanter, zimmet, firma / SLA." },
  { t: "Teslim ve destek", s: "Çalıştırma ve olay çözümü. Olay, zafiyet, SLA." },
] });
flow({ file: "akis-olay", title: "Olay yönetimi akışı", subtitle: "Hizmet kesintisini en kısa sürede gidermek", perRow: 4, steps: [
  { t: "Kaydet", s: "Olay > Yeni olay. Etki ve aciliyetten öncelik çıkar." },
  { t: "Sınıfla ve ata", s: "Kategori seç, teknisyene ata. SLA sayacı başlar." },
  { t: "Teşhis ve çöz", s: "Bilgi bankasına bak, geçici çözümü uygula." },
  { t: "Kapat", s: "Çözüm notu yaz, kullanıcıya haber ver." },
  { t: "Tekrar ediyorsa", s: "Problem kaydı aç, olayları bağla." },
  { t: "Büyük olay", s: "Yönetici bilgilendir, SIEM'e olay gönder." },
  { t: "İncele", s: "SLA ihlali ve yaşlandırma raporuna bak." },
  { t: "Öğren", s: "Bilgi bankasına makale ekle." },
] });
flow({ file: "akis-degisiklik", title: "Değişiklik yönetimi akışı", subtitle: "Riski kontrol altında tutarak üretim ortamını değiştirmek", perRow: 4, steps: [
  { t: "Talep", s: "Gerekçe, etki, geri dönüş planı ile kaydı aç." },
  { t: "Risk ve etki", s: "Konfigürasyon (CMDB) ilişkilerinden etkilenen sistemler." },
  { t: "Onay zinciri", s: "Birim amiri → bilgi güvenliği (Ayarlar'daki akış)." },
  { t: "Zamanla", s: "Planlanan tarih, bakım penceresi, bildirim." },
  { t: "Uygula", s: "Teknisyen uygular, durumu günceller." },
  { t: "Doğrula", s: "Test sonucu ve geri dönüş gerekip gerekmediği." },
  { t: "Kapat", s: "Başarılı / başarısız. Değişiklik başarı raporuna girer." },
  { t: "Gözden geçir", s: "Başarısızlar için problem veya iyileştirme işi." },
] });
flow({ file: "akis-yama-zafiyet", title: "Zafiyet ve yama akışı", subtitle: "Bulgudan kapatmaya", perRow: 4, color: "#b45309", steps: [
  { t: "Tara", s: "Nessus / Tenable / Qualys taraması." },
  { t: "Al", s: "Zafiyet > Tarayıcıdan çek veya API ile gönder." },
  { t: "Değerlendir", s: "Önem, varlık kritikliği, termin (kritik / yüksek gün)." },
  { t: "Yama kaydı", s: "Yama yönetiminde kayıt aç, bulguya bağla." },
  { t: "Onay", s: "Onay zinciri tamamlanınca uygulama başlar." },
  { t: "Uygula ve test et", s: "Pilot sistem, sonra tümü." },
  { t: "Yeniden tara", s: "Bulgu kapandıysa zafiyeti kapat." },
  { t: "Raporla", s: "Zafiyet termin raporu, SIEM olayı." },
] });
flow({ file: "akis-agile", title: "Çevik (Scrum) döngüsü", subtitle: "Sprint: 1-4 hafta, her sonunda kullanılabilir bir sonuç", perRow: 3, color: "#047857", steps: [
  { t: "Ürün backlog'u", s: "Ürün sahibi hikâyeleri sıralar. Olay/değişiklikten iş açılabilir." },
  { t: "Sprint planlama", s: "Ekip hedef belirler, işleri sprint'e alır, puanlar." },
  { t: "Günlük toplantı", s: "Panoda iş: Yapılacak → Devam → Test → Bitti." },
  { t: "Sprint gözden geçirme", s: "Biten işler paydaşlara gösterilir." },
  { t: "Retrospektif", s: "Ne iyi gitti, ne düzeltilecek; aksiyonlar işe dönüşür." },
  { t: "Ölçüm", s: "Burndown ve velocity ile tahmin yapılır." },
] });
flow({ file: "akis-devsecops", title: "DevSecOps boru hattı ve güvenlik kapıları", subtitle: "Güvenlik sona bırakılmaz, her aşamada kontrol edilir", perRow: 4, color: "#7c3aed", steps: [
  { t: "Planla", s: "Tehdit modeli, güvenlik gereksinimleri hikâyeye eklenir." },
  { t: "Kodla", s: "Gizli anahtar taraması, kod incelemesi (SAST)." },
  { t: "Derle", s: "Bağımlılık taraması (SCA), imzalı paket." },
  { t: "Test et", s: "DAST, penetrasyon testi, kabul testi." },
  { t: "Onayla", s: "Değişiklik kaydı + bilgi güvenliği onayı (kapı)." },
  { t: "Yayınla", s: "Planlı yayın, geri dönüş planı hazır." },
  { t: "İşlet ve izle", s: "SIEM, olay yönetimi, yama ve zafiyet taraması." },
  { t: "Geri bildir", s: "Bulgular backlog'a; problem ve iyileştirme." },
] });
flow({ file: "akis-onay-zinciri", title: "Onay zinciri (iş akışı) nasıl çalışır", subtitle: "Ayarlar > Yönetici onayları ve Ayarlar > İş akışları", perRow: 4, color: "#0f766e", steps: [
  { t: "Kayıt oluşur", s: "Talep, değişiklik veya yama bekleyen durumda açılır." },
  { t: "Akış başlar", s: "Kayıt türüne ait etkin akış örneği oluşur." },
  { t: "Onaycı bulunur", s: "Birim amiri, üst amir veya bilgi güvenliği." },
  { t: "E-posta gider", s: "SMTP açıksa Onayla / Reddet bağlantısı iletilir." },
  { t: "Karar", s: "İş akışı onaylarım sayfasından veya e-postadan." },
  { t: "Koşul", s: "Örn. yüksek risk ise bilgi güvenliğine de gider." },
  { t: "Tamamlanır", s: "Kayıt onaylı olur, işleme alınır." },
  { t: "Reddedilirse", s: "Kayıt reddedilir; talep eden bilgilendirilir." },
] });

/* ---------- Entegrasyon mimarisi ---------- */
function arch({ file, title, targets, note }) {
  const W = 900, H = Math.max(270, 120 + targets.length * 110);
  let b = txt(30, 34, title, 18, "#0f172a", 'font-weight="700"');
  b += rect(40, 70, 220, H - 110, "#eff6ff", "#2563eb", 12, 2) + txt(150, 100, "BT Hizmet Yönetimi", 14, "#1d4ed8", 'text-anchor="middle" font-weight="700"');
  b += txt(150, 124, "(Docker sunucusu)", 11, "#475569", 'text-anchor="middle"');
  b += rect(70, 140, 160, 28, "#fff", "#93c5fd", 6) + txt(150, 159, "Ayarlar > Entegrasyon", 11, "#1e3a8a", 'text-anchor="middle"');
  b += rect(70, 178, 160, 28, "#fff", "#93c5fd", 6) + txt(150, 197, "Denetim kaydı (audit)", 11, "#1e3a8a", 'text-anchor="middle"');
  targets.forEach((t, i) => {
    const y = 70 + i * 110;
    b += rect(620, y, 250, 90, "#f0fdf4", "#16a34a", 12, 2) + txt(745, y + 28, t.name, 13, "#14532d", 'text-anchor="middle" font-weight="700"');
    wrap(t.desc, 36).forEach((ln, k) => (b += txt(745, y + 50 + k * 15, ln, 11, "#475569", 'text-anchor="middle"')));
    const sy = y + 45;
    const dy = y + 45;
    b += `<line x1="260" y1="${sy}" x2="620" y2="${dy}" stroke="#475569" stroke-width="2" ${t.back ? 'marker-start="url(#ar)"' : ""} marker-end="url(#ar)"/>`;
    b += rect(340, dy - 30, 200, 34, "#fff", "#cbd5e1", 6);
    b += txt(440, dy - 16, t.proto, 11, "#0f172a", 'text-anchor="middle" font-weight="700"') + txt(440, dy - 2, t.port, 10, "#64748b", 'text-anchor="middle"');
  });
  if (note) b += txt(30, H - 12, note, 11, "#64748b");
  save(file, W, H, b);
}
arch({ file: "mimari-entegrasyonlar", title: "Entegrasyon haritası", note: "Oklar bağlantının yönünü gösterir. Güvenlik duvarında yalnızca belirtilen kaynak → hedef port açılır.", targets: [
  { name: "Active Directory", desc: "Giriş doğrulama ve grup → rol eşlemesi", proto: "LDAP / LDAPS", port: "389 veya 636 (TCP)", back: true },
  { name: "SIEM / log toplayıcı", desc: "Güvenlik ve denetim olayları (CEF / Syslog)", proto: "UDP / TCP / TLS", port: "514 veya 6514" },
  { name: "Zafiyet tarayıcı", desc: "Nessus, Tenable, Qualys, OpenVAS, Rapid7", proto: "HTTPS REST", port: "8834, 443, 9392, 3780", back: true },
  { name: "SMTP sunucusu", desc: "Onay ve bildirim e-postaları", proto: "SMTP", port: "25, 587 veya 465" },
  { name: "Dış sistemler (API)", desc: "Kendi betikleriniz, CI/CD, servis masası botu", proto: "HTTPS /api/v1", port: "Bearer anahtar", back: true },
] });
const single = (file, title, t, note) => arch({ file, title, targets: [t], note });
single("mimari-ad", "Active Directory akışı", { name: "Domain Controller", desc: "dc01.kurum.local · Base DN: DC=kurum,DC=local", proto: "1) Bind  2) Ara (memberOf)", port: "LDAP 389 / LDAPS 636", back: true }, "Önce servis hesabı ile bağlanılır; kullanıcı bulunur, parolası doğrulanır, grupları role çevrilir.");
single("mimari-siem", "SIEM log akışı", { name: "SIEM toplayıcı", desc: "ArcSight, QRadar, Splunk, Wazuh vb.", proto: "CEF veya Syslog (RFC 5424)", port: "UDP/TCP 514 · TLS 6514" }, "Uygulama olay üretince (giriş, onay, değişiklik, zafiyet) bir satır log yollar.");
single("mimari-tarayici", "Zafiyet tarayıcı akışı", { name: "Tarama konsolu", desc: "Nessus · Tenable · Qualys · OpenVAS · Rapid7", proto: "GET API yolu (HTTPS)", port: "Ürüne göre port", back: true }, "Çekme tek bir GET isteğidir. Ayrıntılı bulgu için tarayıcıdan POST /api/v1/zafiyet ile itmek daha sağlamdır.");
single("mimari-eposta", "E-posta akışı", { name: "SMTP sunucusu", desc: "Kurum posta geçidi (relay)", proto: "SMTP + STARTTLS / SSL", port: "25 · 587 · 465" }, "Onay isteği ve test iletileri bu hesaptan çıkar.");
console.log("Kılavuz resimleri üretildi.");
