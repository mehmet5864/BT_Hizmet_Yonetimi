// @ts-nocheck
/**
 * Süreçleri anlamak için ek örnek veri (ikinci paket) — mevcut kayıtlara dokunmaz, yalnızca ekler.
 *  - Ayarlar → Süreç yöneticileri: her modül için sorumlu atanır (yalnızca boş olanlar doldurulur)
 *  - Olay, problem, değişiklik, yama, zafiyet, talep, SLA, hizmet kataloğu, 9 ITIL süreç kaydı
 *  - Bilgi bankası, süreç şablonu + canlı akış, Çevik ürün/sprint/iş
 * İşaret kaydı: "Posta sunucusunda disk hatası" olayı. Tekrar çalıştırılırsa atlar.
 * Elle: npx tsx prisma/seed-demo-processes.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function day(offset: number, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}


const OFFICER_KEYS = [
  "infosec","degisiklik","yama","konfigurasyon","zafiyet","firmaSla","olay","problem","sistem","network","siber","yazilim","veritabani","servis",
  "envanter","zimmet","personel","katalog","bilgi","akis","tasarim","kullanilabilirlik","kapasite","sureklilik","dogrulama","surum","izleme",
  "degerlendirme","cevik","rapor",
];
const SPARE_NAMES = [
  "Rıza Kaplan","Seda Ünal","Tuna Gür","Ulaş Er","Vildan Köse","Yağmur Say","Zafer Doğan","Aslı Bulut","Berk Yurt","Ceren Ay",
  "Doruk Işık","Ebru Sarı","Fırat Gök","Gül Tekin","Hakan Uçar","Irmak Ateş","Kerem Bal","Lale Oral","Metin Soy","Nazlı Er",
];

/** Boş kalan her yönetici alanına, başka alanda olmayan bir kişi atar; kişi yoksa yeni personel ekler. */
async function completeOfficers(prisma: any) {
  const cfg = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  if (!cfg) return;
  let payload: any;
  try {
    payload = JSON.parse(cfg.payload);
  } catch {
    return;
  }
  const officers: Record<string, string> = { ...(payload.officers ?? {}) };
  // Çift atamaları temizle
  const seen = new Set<string>();
  for (const key of OFFICER_KEYS) {
    const id = officers[key];
    if (!id) continue;
    if (seen.has(id)) officers[key] = "";
    else seen.add(id);
  }
  const dept = (await prisma.department.findFirst({ where: { code: "BIDB" } })) ?? (await prisma.department.findFirst());
  const boss = await prisma.person.findFirst({ where: { adUsername: "ahmet.yilmaz" } });
  const everyone = await prisma.person.findMany({ orderBy: { fullName: "asc" }, select: { id: true, role: true } });
  const free = everyone.filter((p: any) => !seen.has(p.id) && p.role !== "USER");
  const freeAny = everyone.filter((p: any) => !seen.has(p.id));
  let spare = 0;
  let filled = 0;
  for (const key of OFFICER_KEYS) {
    if (officers[key]) continue;
    let pick = free.shift() ?? freeAny.find((p: any) => !seen.has(p.id));
    if (!pick) {
      const name = SPARE_NAMES[spare] ?? `Yönetici Adayı ${spare + 1}`;
      const adUsername = name.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, ".");
      spare++;
      pick = await prisma.person.create({
        data: {
          fullName: name, adUsername, title: "Modül sorumlusu", duty: "Süreç yönetimi", workplace: dept?.name ?? "BIDB",
          email: `${adUsername}@kurum.gov.tr`, role: "UNIT_MANAGER", roleSource: "MANUAL", departmentId: dept?.id,
          parentDepartmentId: dept?.id, unitManagerId: boss?.id, parentManagerId: boss?.id, passwordHash: boss?.passwordHash ?? null,
        },
      });
    }
    officers[key] = pick.id;
    seen.add(pick.id);
    filled++;
  }
  payload.officers = officers;
  await prisma.systemConfig.update({ where: { id: "default" }, data: { payload: JSON.stringify(payload) } });
  console.log(`Boşta kalan yönetici alanı tamamlandı: ${filled} (yeni personel: ${spare})`);
}

const MORE_PEOPLE: [string, string, string, string][] = [
  ["Abdullah Yücel", "BIDB", "UNIT_MANAGER", "Uzman"],
  ["Banu Ergin", "IKM", "USER", "Uzman"],
  ["Cüneyt Aydoğan", "MHM", "USER", "Uzman"],
  ["Damla Karaca", "SGB", "UNIT_MANAGER", "Uzman"],
  ["Erkan Sönmez", "VMO", "USER", "Uzman"],
  ["Feride Güneş", "YAZ", "USER", "Uzman"],
  ["Güray Taş", "VTB", "UNIT_MANAGER", "Uzman"],
  ["Hülya Yılmazer", "SDM", "USER", "Uzman"],
  ["İsmail Koç", "ENV", "USER", "Uzman"],
  ["Jülide Sezgin", "BIDB", "UNIT_MANAGER", "Uzman"],
  ["Kadir Erdoğan", "IKM", "USER", "Uzman"],
  ["Lütfiye Aksoy", "MHM", "USER", "Uzman"],
  ["Murat Çetin", "SGB", "UNIT_MANAGER", "Uzman"],
  ["Neslihan Dağ", "VMO", "USER", "Uzman"],
  ["Orhan Kılıç", "YAZ", "USER", "Uzman"],
  ["Pınar Özdemir", "VTB", "UNIT_MANAGER", "Uzman"],
  ["Rabia Şen", "SDM", "USER", "Uzman"],
  ["Selçuk Avcı", "ENV", "USER", "Uzman"],
  ["Tuğba Yalçın", "BIDB", "UNIT_MANAGER", "Uzman"],
  ["Umut Başaran", "IKM", "USER", "Uzman"],
  ["Volkan Keskin", "MHM", "USER", "Uzman"],
  ["Yasemin Toprak", "SGB", "UNIT_MANAGER", "Uzman"],
  ["Zeki Karataş", "VMO", "USER", "Uzman"],
  ["Aylin Bozkurt", "YAZ", "USER", "Uzman"],
  ["Barış Çelik", "VTB", "UNIT_MANAGER", "Uzman"],
  ["Canan Uysal", "SDM", "USER", "Uzman"],
  ["Deniz Kaya", "ENV", "USER", "Uzman"],
  ["Esin Turan", "BIDB", "UNIT_MANAGER", "Uzman"],
  ["Fikret Akın", "IKM", "USER", "Uzman"],
  ["Gamze Polat", "MHM", "USER", "Uzman"],
];

function asciiUser(name: string) {
  return name.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, ".");
}

/** 30 ek kullanıcı (idempotent: kullanıcı adı veya ad varsa atlanır). */
async function addMorePeople(prisma: any) {
  const boss = await prisma.person.findFirst({ where: { adUsername: "ahmet.yilmaz" } });
  const depts = await prisma.department.findMany({ orderBy: { code: "asc" } });
  let added = 0;
  for (let i = 0; i < MORE_PEOPLE.length; i++) {
    const [fullName, code, role, title] = MORE_PEOPLE[i];
    const adUsername = asciiUser(fullName);
    const sicilNo = `S-${1200 + i}`;
    const exists = await prisma.person.findFirst({ where: { OR: [{ adUsername }, { fullName }, { sicilNo }] } });
    if (exists) continue;
    const d = depts.find((x: any) => x.code === code) ?? depts[0];
    await prisma.person.create({
      data: {
        fullName, adUsername, sicilNo, tcNo: `100000020${String(i).padStart(2, "0")}`, title: `${title} (${d?.name ?? code})`, duty: title,
        workplace: d?.name ?? code, email: `${adUsername}@kurum.gov.tr`, phone: `0312 555 13 ${String(i).padStart(2, "0")}`, role, roleSource: "MANUAL",
        departmentId: d?.id, parentDepartmentId: depts.find((x: any) => x.code === "BIDB")?.id ?? d?.id,
        unitManagerId: d?.managerId ?? boss?.id, parentManagerId: boss?.id, passwordHash: boss?.passwordHash ?? null,
      },
    });
    added++;
  }
  console.log(`Ek kullanıcı eklendi: ${added}`);
}

const MARK = "Posta sunucusunda disk hatası";

async function run(prisma: any) {
  const year = new Date().getFullYear();
  async function nextNo(model: string, field: string, prefix: string) {
    const rows = await prisma[model].findMany({ where: { [field]: { startsWith: `${prefix}-${year}-` } }, select: { [field]: true } });
    const max = rows.reduce((m: number, r: any) => Math.max(m, Number(String(r[field]).split("-").pop()) || 0), 0);
    return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
  }

  if (await prisma.incident.findFirst({ where: { title: { contains: MARK } } })) {
    console.log("Süreç örnek verisi (2. paket) zaten yüklü; yalnızca boş yönetici alanları tamamlanıyor.");
    await addMorePeople(prisma);
    await completeOfficers(prisma);
    return;
  }

  // ---- Kişiler (olmayan atlanır; yedek: ilk personel) --------------------------
  const first = await prisma.person.findFirst({ orderBy: { fullName: "asc" } });
  if (!first) {
    console.log("Personel yok; süreç örnek verisi yüklenmedi.");
    return;
  }
  const cache: Record<string, any> = {};
  async function who(user: string) {
    if (!cache[user]) cache[user] = (await prisma.person.findFirst({ where: { adUsername: user } })) ?? first;
    return cache[user];
  }
  const ahmet = await who("ahmet.yilmaz");
  const elif = await who("elif.demir");
  const kemal = await who("kemal.ozkan");
  const selin = await who("selin.koc");
  const can = await who("can.yildiz");
  const deniz = await who("deniz.arslan");
  const merve = await who("merve.uslu");
  const nihan = await who("nihan.celik");
  const zeynep = await who("zeynep.aydin");
  const tolga = await who("tolga.erdem");
  const gokhan = await who("gokhan.aksoy");
  const ayse = await who("ayse.polat");
  const pinar = await who("pinar.yalcin");
  const fatma = await who("fatma.gunes");
  const oguz = await who("oguz.tekin");
  const burak = await who("burak.sahin");
  const mehmet = await who("mehmet.kara");

  const deptId = (p: any) => p.departmentId;
  const asset = async (name: string) => (await prisma.asset.findFirst({ where: { name } }))?.id ?? null;
  const A = {
    file: await asset("SRV-FILE-04"),
    db: await asset("SRV-DB-01"),
    core: await asset("SW-CORE-01"),
    app: await asset("SRV-APP-02"),
    mon: await asset("SRV-MON-06"),
    dc: await asset("SRV-DC-07"),
  };

  // ---- 1) Süreç yöneticileri: her modüle FARKLI bir kişi (bir kişi tek modül) ----------
  // Eksik kişiler önce personel olarak eklenir.
  const depts = await prisma.department.findMany({ orderBy: { code: "asc" } });
  const dByCode = (c: string) => depts.find((d: any) => d.code === c) ?? depts[0];
  const extraPeople = [
    ["Arda Korkmaz", "arda.korkmaz", "Envanter Uzmanı", "ENV", "S-1101"],
    ["Bahar Tunç", "bahar.tunc", "Zimmet Sorumlusu", "ENV", "S-1102"],
    ["Cem Aksu", "cem.aksu", "Personel İşleri Uzmanı", "IKM", "S-1103"],
    ["Derya Eren", "derya.eren", "Hizmet Kataloğu Sorumlusu", "SDM", "S-1104"],
    ["Emre Polat", "emre.polat", "Bilgi Bankası Editörü", "BIDB", "S-1105"],
    ["Figen Yavuz", "figen.yavuz", "Süreç Analisti", "BIDB", "S-1106"],
    ["Gökhan Tan", "gokhan.tan", "Hizmet Tasarım Uzmanı", "BIDB", "S-1107"],
    ["Hande Sezer", "hande.sezer", "Kullanılabilirlik Analisti", "VMO", "S-1108"],
    ["İlker Duman", "ilker.duman", "Kapasite Planlama Uzmanı", "VMO", "S-1109"],
    ["Jale Kurt", "jale.kurt", "Süreklilik Koordinatörü", "SGB", "S-1110"],
    ["Kaan Özer", "kaan.ozer", "Test Mühendisi", "YAZ", "S-1111"],
    ["Leyla Çınar", "leyla.cinar", "Sürüm Yöneticisi", "YAZ", "S-1112"],
    ["Mert Aslan", "mert.aslan", "İzleme Uzmanı", "VMO", "S-1113"],
    ["Nur Bayram", "nur.bayram", "Hizmet Değerlendirme Uzmanı", "BIDB", "S-1114"],
    ["Onur Çakır", "onur.cakir", "Çevik Koç", "YAZ", "S-1115"],
    ["Pelin Acar", "pelin.acar", "Raporlama Uzmanı", "BIDB", "S-1116"],
  ];
  const hash = ahmet.passwordHash ?? null;
  for (const [fullName, adUsername, title, dc, sicilNo] of extraPeople) {
    const exists = await prisma.person.findFirst({ where: { OR: [{ adUsername }, { fullName }, { sicilNo }] } });
    if (exists) continue;
    const d = dByCode(dc);
    await prisma.person.create({
      data: {
        fullName, adUsername, title, sicilNo, tcNo: `100000001${sicilNo.slice(-2)}`, duty: title, workplace: d?.name ?? "BIDB",
        email: `${adUsername}@kurum.gov.tr`, phone: `0312 555 12 ${sicilNo.slice(-2)}`, role: "UNIT_MANAGER", roleSource: "MANUAL",
        departmentId: d?.id, parentDepartmentId: dByCode("BIDB")?.id, unitManagerId: ahmet.id, parentManagerId: ahmet.id, passwordHash: hash,
      },
    });
  }
  const u = async (name: string) => (await prisma.person.findFirst({ where: { adUsername: name } })) ?? null;
  const assign: Record<string, any> = {
    infosec: selin, degisiklik: kemal, yama: tolga, konfigurasyon: gokhan, zafiyet: await u("burak.sahin"), firmaSla: elif, olay: merve,
    problem: can, sistem: ahmet, network: await u("mehmet.kara"), siber: await u("zeynep.aydin"), yazilim: ayse, veritabani: deniz, servis: fatma,
    envanter: nihan, zimmet: await u("bahar.tunc"), personel: await u("cem.aksu"), katalog: await u("derya.eren"), bilgi: await u("emre.polat"),
    akis: await u("figen.yavuz"), tasarim: await u("gokhan.tan"), kullanilabilirlik: await u("hande.sezer"), kapasite: await u("ilker.duman"),
    sureklilik: await u("jale.kurt"), dogrulama: await u("kaan.ozer"), surum: await u("leyla.cinar"), izleme: await u("mert.aslan"),
    degerlendirme: await u("nur.bayram"), cevik: await u("onur.cakir"), rapor: await u("pelin.acar"),
  };
  const cfg = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  if (cfg) {
    try {
      const payload = JSON.parse(cfg.payload);
      payload.officers = payload.officers ?? {};
      // Önce kişiler benzersiz mi bak: aynı kişi iki kez atanmışsa ve tanım listesinde yoksa boşalt.
      const wanted = new Set<string>();
      const final: Record<string, string> = {};
      for (const [key, person] of Object.entries(assign)) {
        if (!person || wanted.has(person.id)) continue;
        wanted.add(person.id);
        final[key] = person.id;
      }
      payload.officers = { ...final };
      await prisma.systemConfig.update({ where: { id: "default" }, data: { payload: JSON.stringify(payload) } });
      console.log(`Süreç yöneticisi atandı (her biri farklı kişi): ${Object.keys(final).length}`);
    } catch {
      console.log("Ayar kaydı okunamadı; yöneticiler uygulama açılışında otomatik atanır.");
    }
  }

  await addMorePeople(prisma);
  await completeOfficers(prisma);

  // ---- 2) Olaylar ----------------------------------------------------------------
  const I: Record<string, any> = {};
  async function incident(key: string, data: any) {
    I[key] = await prisma.incident.create({
      data: { departmentId: deptId(data.requester), requestingManagerId: ahmet.id, requesterId: data.requester.id, ...data.d, incidentNo: await nextNo("incident", "incidentNo", "OLY") },
    });
  }
  await incident("mail", { requester: pinar, d: { title: MARK, severity: "HIGH", layer: "L1", status: "INVESTIGATING", startedAt: day(-1), l1AnalystId: gokhan.id, description: "Posta sunucusunun veri diskinde okuma hataları var; kuyruk birikiyor." } });
  await incident("print", { requester: fatma, d: { title: "2. kat ortak yazıcı çıktı vermiyor", severity: "LOW", layer: "L1", status: "RESOLVED", startedAt: day(-6), endedAt: day(-5), l1AnalystId: merve.id, description: "Yazdırma kuyruğu takıldı; hizmet yeniden başlatıldı." } });
  await incident("dc", { requester: tolga, d: { title: "Etki alanı denetleyicisinde replikasyon uyarısı", severity: "HIGH", layer: "L2", status: "CONTAINED", startedAt: day(-4), l1AnalystId: kemal.id, l2AnalystId: ahmet.id, escalationStatus: "TRANSFERRED", escalatedOffice: "SISTEM", escalationReason: "AD replikasyonu; sistem uzmanı gerekli.", escalatedAt: day(-4), escalatedById: kemal.id, assetId: A.dc, description: "Replikasyon gecikmesi 40 dk; zaman senkronu düzeltildi." } });
  await incident("ransom2", { requester: burak, d: { title: "Şüpheli ek dosyası açıldı — Mali Hizmetler", severity: "CRITICAL", layer: "L2", status: "CONTAINED", startedAt: day(-2), l1AnalystId: gokhan.id, l2AnalystId: selin.id, escalationStatus: "TRANSFERRED", escalatedOffice: "SIBER", escalationReason: "Makro içeren belge; uç nokta izolasyonu gerekli.", escalatedAt: day(-2), escalatedById: gokhan.id, ioc: "invoice_0912.xlsm · SHA256 9ac1…77e", description: "Bilgisayar ağdan ayrıldı, EDR taraması temiz; kullanıcıya farkındalık bildirimi gönderildi." } });
  await incident("wifi", { requester: ayse, d: { title: "Katlarda Wi-Fi bağlantı kopmaları", severity: "MEDIUM", layer: "L1", status: "OPEN", startedAt: day(0), l1AnalystId: merve.id, description: "2. ve 3. katta bağlantı sık kopuyor." } });
  await incident("app", { requester: fatma, d: { title: "EBYS oturum zaman aşımı hataları", severity: "MEDIUM", layer: "L1", status: "RESOLVED", startedAt: day(-8), endedAt: day(-7), l1AnalystId: kemal.id, assetId: A.app, description: "Oturum havuzu sınırı artırıldı." } });
  await incident("backupfail", { requester: tolga, d: { title: "Yedekleme işi başarısız (kimlik bilgisi süresi doldu)", severity: "LOW", layer: "L1", status: "CLOSED", startedAt: day(-15), endedAt: day(-14), l1AnalystId: gokhan.id, description: "Servis hesabı parolası yenilendi." } });
  await incident("dbslow", { requester: deniz, d: { title: "Veritabanı sorgularında yavaşlama", severity: "HIGH", layer: "L1", status: "INVESTIGATING", startedAt: day(-1), l1AnalystId: kemal.id, assetId: A.db, description: "Yoğun saatlerde sorgu süreleri 3 kat arttı." } });

  // ---- 3) Problemler ---------------------------------------------------------------
  const PR: Record<string, any> = {};
  async function problem(key: string, data: any) {
    PR[key] = await prisma.problem.create({
      data: { requestingManagerId: ahmet.id, infosecManagerId: selin.id, ...data, problemNo: await nextNo("problem", "problemNo", "PRB") },
    });
  }
  await problem("mail", { title: "Posta sunucusu disk dayanıklılığı yetersiz", incidentId: I.mail.id, requesterId: pinar.id, proposedAssigneeId: kemal.id, assigneeId: kemal.id, assignmentStatus: "APPROVED", assignmentDecidedById: selin.id, assignedAt: day(-1), status: "INVESTIGATING", workaround: "Kuyruk elle boşaltılıyor.", description: "RAID durumu incelemede." });
  await problem("dc", { title: "NTP yapılandırması tutarsız", incidentId: I.dc.id, requesterId: tolga.id, proposedAssigneeId: tolga.id, assignmentStatus: "PENDING", status: "OPEN", description: "Atama BG yöneticisi onayı bekliyor." });
  await problem("macro", { title: "Ofis makrolarının kullanıcı tarafından açılabilmesi", incidentId: I.ransom2.id, requesterId: selin.id, proposedAssigneeId: selin.id, assigneeId: selin.id, assignmentStatus: "APPROVED", assignmentDecidedById: selin.id, assignedAt: day(-2), status: "KNOWN_ERROR", rootCause: "İnternetten gelen makroları engelleyen GPO uygulanmamış.", workaround: "E-posta geçidinde .xlsm eklentileri karantinaya alınıyor.", description: "Kalıcı çözüm değişiklik kaydında." });

  // ---- 4) Değişiklikler ------------------------------------------------------------
  const C: Record<string, any> = {};
  async function change(key: string, units: any[], data: any) {
    C[key] = await prisma.changeRecord.create({
      data: {
        requestingManagerId: ahmet.id, infosecManagerId: selin.id, approvalUnitCount: units.length,
        targetDept1Id: units[0]?.[0], targetMgr1Id: units[0]?.[1],
        targetDept2Id: units[1]?.[0], targetMgr2Id: units[1]?.[1],
        approvalUnits: { create: units.map(([d, m], i) => ({ sortOrder: i + 1, departmentId: d, managerId: m })) },
        ...data, changeNo: await nextNo("changeRecord", "changeNo", "CHG"),
      },
    });
  }
  await change("gpo", [[deptId(kemal), kemal.id], [deptId(selin), selin.id]], { requesterId: selin.id, requestingDeptId: deptId(selin), changeKind: "SOFTWARE", machineType: "VIRTUAL", impact: "PARTIAL", status: "PENDING", requestDate: day(-1), workStartDate: day(8), expectedEndDate: day(8, 12), description: "Makro engelleme GPO'su tüm istemcilere uygulanacak (PRB makro problemi)." });
  await change("mailraid", [[deptId(kemal), kemal.id]], { requesterId: kemal.id, requestingDeptId: deptId(kemal), changeKind: "HARDWARE", machineType: "PHYSICAL", impact: "FULL", status: "APPROVED", requestDate: day(-1), approvalDate: day(0), workStartDate: day(4), expectedEndDate: day(4, 18), description: "Posta sunucusu disk grubu yenilenecek; kısa kesinti." });
  await change("ntp", [[deptId(kemal), kemal.id]], { requesterId: tolga.id, requestingDeptId: deptId(tolga), changeKind: "SOFTWARE", machineType: "VIRTUAL", impact: "PARTIAL", status: "COMPLETED", requestDate: day(-12), approvalDate: day(-10), workStartDate: day(-8), expectedEndDate: day(-8, 14), description: "NTP kaynakları domain genelinde tek kurala bağlandı." });

  // ---- 5) Yamalar ---------------------------------------------------------------------
  async function patch(data: any) {
    await prisma.patchRecord.create({ data: { requestingManagerId: ahmet.id, ...data, patchNo: await nextNo("patchRecord", "patchNo", "YAM") } });
  }
  await patch({ requesterId: kemal.id, title: "Exchange güvenlik güncellemesi", scope: "Posta sunucusu", systemType: "APPLICATION", systemKind: "SERVER", ipRange: "10.10.20.60/32", impact: "PARTIAL", assetOwnerId: kemal.id, distribution: "MANUAL", risks: "Servis yeniden başlatılır.", status: "PENDING", requestDate: day(-2), description: "Disk değişiminden sonraya planlandı." });
  await patch({ requesterId: elif.id, title: "Erişim anahtarları firmware güncellemesi", scope: "Kat anahtarları", systemType: "FIRMWARE", systemKind: "NETWORK", ipRange: "10.10.1.0/24", impact: "PARTIAL", assetOwnerId: elif.id, distribution: "MANUAL", risks: "Anahtar başına 5 dk kesinti.", status: "APPROVED", requestDate: day(-6), approvalDate: day(-3), workStartDate: day(10), expectedEndDate: day(10, 20), description: "Gece bakım penceresi." });
  await patch({ requesterId: deniz.id, title: "Oracle CPU yaması", scope: "EBYS Oracle", systemType: "APPLICATION", systemKind: "SERVER", ipRange: "10.10.20.12/32", impact: "FULL", assetOwnerId: deniz.id, distribution: "MANUAL", risks: "Üretim kesintisi 30 dk.", status: "COMPLETED", requestDate: day(-35), approvalDate: day(-30), workStartDate: day(-26), expectedEndDate: day(-26, 16), description: "Çeyreklik yama uygulandı." });

  // ---- 6) Zafiyetler ------------------------------------------------------------------------
  async function vuln(deviceName: string, ip: string, owner: any, sev: string, status: string, data: any) {
    await prisma.vulnerability.create({
      data: { vulnNo: await nextNo("vulnerability", "vulnNo", "ZAF"), deviceName, deviceIp: ip, ownerId: owner.id, departmentId: owner.departmentId, managerId: ahmet.id, severity: sev, status, source: "MANUAL", ...data },
    });
  }
  await vuln("SRV-MAIL-01", "10.10.20.60", kemal, "HIGH", "OPEN", { detectedAt: day(-3), dueDate: day(11), description: "Exchange ProxyNotShell benzeri zafiyet, yama bekliyor." });
  await vuln("PC-MALI-014", "10.20.21.14", burak, "MEDIUM", "OPEN", { detectedAt: day(-2), dueDate: day(20), description: "Makro güvenlik ayarı gevşek." });
  await vuln("SW-ACC-05", "10.10.1.15", elif, "LOW", "CLOSED", { detectedAt: day(-40), dueDate: day(-20), closeDays: 10, description: "Telnet açık; kapatıldı." });
  await vuln("WEB-INT-02", "10.10.30.12", can, "CRITICAL", "OPEN", { detectedAt: day(-1), dueDate: day(3), description: "Dahili web uygulamasında SQL enjeksiyonu bulgusu." });
  await vuln("PRN-KAT3", "10.20.31.103", merve, "LOW", "ACCEPTED", { detectedAt: day(-30), notFixedReason: "Yazıcı ağ izolasyonunda; yama çıkmadı.", description: "Varsayılan yönetici parolası." });

  // ---- 7) Servis talepleri ---------------------------------------------------------------------
  const handling: Record<string, [string, string]> = {
    SISTEM: [deptId(kemal), kemal.id], NETWORK: [deptId(elif), elif.id], SIBER: [deptId(selin), selin.id],
    YAZILIM: [deptId(can), can.id], VERITABANI: [deptId(deniz), deniz.id], SERVIS: [deptId(merve), merve.id],
  };
  async function req(type: string, office: string, requester: any, status: string, severity: string, ago: number, reason: string, details: any) {
    const [hd, hm] = handling[office];
    await prisma.serviceRequest.create({
      data: {
        requestNo: await nextNo("serviceRequest", "requestNo", "TAL"), requestType: type, office, status, severity, reason,
        requesterId: requester.id, requestingDeptId: requester.departmentId, requestingManagerId: ahmet.id,
        handlingDeptId: hd, handlingManagerId: hm, details: JSON.stringify(details), requestDate: day(-ago), createdAt: day(-ago),
      },
    });
  }
  await req("AD_USER", "SISTEM", zeynep, "OPEN", "LOW", 1, "Yeni işe başlayan stajyer için hesap.", { username: "stajyer.01", actionKind: "CREATE", displayName: "Stajyer Bir", directory: "AD" });
  await req("PASSWORD", "SISTEM", oguz, "DONE", "LOW", 3, "Parola sıfırlama.", { username: "oguz.tekin", passwordAction: "RESET" });
  await req("VLAN", "NETWORK", ayse, "IN_PROGRESS", "MEDIUM", 4, "Geliştirme ağı ayrımı.", { actionKind: "CREATE", vlanId: "150", vlanName: "GELISTIRME", subnet: "10.50.0.0/24", gateway: "10.50.0.1" });
  await req("VPN", "SIBER", fatma, "OPEN", "LOW", 1, "Uzaktan çalışma erişimi.", { vpnProduct: "GLOBALPROTECT", username: "fatma.gunes", vpnProfile: "Uzaktan çalışma", splitTunnel: "SPLIT" });
  await req("REPO_ACCESS", "YAZILIM", mehmet, "DONE", "LOW", 6, "Depo okuma erişimi.", { scmProduct: "GITLAB", actionKind: "GRANT", repoPath: "kurum/portal", accessLevel: "REPORTER", username: "mehmet.kara" });
  await req("DB_USER", "VERITABANI", ayse, "WAITING", "MEDIUM", 2, "Test veritabanı yazma yetkisi.", { dbEngine: "POSTGRES", actionKind: "GRANT", dbName: "test_db", dbUsername: "ayse.polat", privilege: "WRITE" });
  await req("SD_SUPPORT", "SERVIS", pinar, "IN_PROGRESS", "MEDIUM", 1, "Outlook açılmıyor.", { sdProduct: "SDP", category: "INCIDENT", affectedService: "E-posta", urgency: "MEDIUM" });
  await req("SD_HARDWARE", "SERVIS", burak, "OPEN", "LOW", 2, "Fare ve klavye değişimi.", { actionKind: "REPLACE", deviceClass: "OTHER", location: "Mali Hizmetler" });

  // ---- 8) Firma / SLA ----------------------------------------------------------------------------
  const vendor = await prisma.vendor.findFirst();
  const product = vendor ? await prisma.vendorProduct.findFirst({ where: { vendorId: vendor.id } }) : null;
  if (vendor && product) {
    const start = new Date(Date.now() - 5 * 3_600_000);
    await prisma.slaTicket.create({
      data: {
        ticketNo: await nextNo("slaTicket", "ticketNo", "SLA"), title: "Posta sunucusu disk desteği", application: product.name,
        ownerId: kemal.id, requesterId: kemal.id, requestingManagerId: ahmet.id, departmentId: deptId(kemal),
        vendorId: vendor.id, productId: product.id, slaLevel: 1, severity: "HIGH", status: "OPEN", openedAt: start, slaStartedAt: start,
        slaResponseDueAt: new Date(start.getTime() + 2 * 3_600_000), slaDueAt: new Date(start.getTime() + 4 * 3_600_000),
        notifyNote: "Örnek kayıt (2. paket).", description: "Üretici desteği: disk değişimi.",
      },
    });
  }

  // ---- 9) Hizmet kataloğu --------------------------------------------------------------------------
  const S: Record<string, any> = {};
  async function catalog(key: string, d: any) {
    S[key] = await prisma.catalogService.create({
      data: {
        serviceNo: await nextNo("catalogService", "serviceNo", "HIZ"), requesterId: ahmet.id, requestingDeptId: deptId(ahmet),
        requestingManagerId: kemal.id, status: "ACTIVE", audience: "USER", criticality: "MEDIUM", ...d,
      },
    });
  }
  await catalog("posta", { name: "Posta sunucusu (Exchange)", summary: "Kurumsal e-posta altyapısı.", ownerId: kemal.id, departmentId: deptId(kemal), hours: "7/24", accessConditions: "Tüm personel.", requestOffice: "SISTEM", requestType: "MAILBOX", availabilityTarget: "99.9", responseHours: 1, resolveHours: 4, criticality: "CRITICAL", description: "Disk arızası olayı bu hizmeti etkiledi." });
  await catalog("portal", { name: "Kurum iç portalı", summary: "Duyuru, form ve belge portalı.", ownerId: can.id, departmentId: deptId(can), hours: "7/24", accessConditions: "Kurum personeli.", requestOffice: "YAZILIM", availabilityTarget: "99.0", responseHours: 4, resolveHours: 24, description: "SharePoint tabanlı." });
  await catalog("sso", { name: "Tek oturum açma (SSO)", summary: "Uygulamalarda merkezi kimlik doğrulama.", audience: "BOTH", ownerId: selin.id, departmentId: deptId(selin), hours: "7/24", accessConditions: "Kurum personeli.", requestOffice: "SIBER", availabilityTarget: "99.9", responseHours: 1, resolveHours: 4, criticality: "HIGH", description: "AD FS ve çok faktörlü doğrulama." });

  // ---- 10) ITIL süreç kayıtları (9 süreç x 2) ------------------------------------------------------
  const PREFIX = { DESIGN: "TAS", SLA: "HSV", AVAILABILITY: "KUL", CAPACITY: "KAP", CONTINUITY: "DR", VALIDATION: "TST", RELEASE: "REL", MONITORING: "EVT", EVALUATION: "DGR" };
  async function proc(process: string, title: string, status: string, owner: any, severity: string, details: any, extra: any = {}) {
    await prisma.itilProcessRecord.create({
      data: {
        recordNo: await nextNo("itilProcessRecord", "recordNo", PREFIX[process]), process, title, status, severity,
        requesterId: owner.id, requestingDeptId: owner.departmentId, requestingManagerId: ahmet.id,
        ownerId: owner.id, departmentId: owner.departmentId, details: JSON.stringify(details), ...extra,
      },
    });
  }
  const sv = (k: string) => ({ serviceId: S[k]?.id });
  await proc("DESIGN", "Kurum iç portalı yeni tasarım", "IN_PROGRESS", can, "MEDIUM", { businessGoal: "Tek giriş noktası.", securityStandard: "ISO 27001", customerExpectation: "Mobil uyumlu", architectureNote: "SPA + API", targetGoLive: day(60).toISOString().slice(0, 10) }, { ...sv("portal"), startDate: day(-5) });
  await proc("DESIGN", "SSO genişletme tasarımı", "OPEN", selin, "HIGH", { businessGoal: "Tüm iç uygulamalar SSO.", securityStandard: "MFA zorunlu", customerExpectation: "Tek parola", architectureNote: "SAML/OIDC geçidi", targetGoLive: day(90).toISOString().slice(0, 10) }, { ...sv("sso"), startDate: day(-2) });
  await proc("SLA", "Posta hizmeti SLA ölçümü", "IN_PROGRESS", elif, "HIGH", { measurementPeriod: `${year}-10`, targetAvailability: "99.9", actualAvailability: "99.62", breachCount: "1", reportNote: "Disk arızası kesintisi hedefi düşürdü." }, { ...sv("posta"), startDate: day(-8) });
  await proc("SLA", "Portal SLA ölçümü", "DONE", can, "LOW", { measurementPeriod: `${year}-09`, targetAvailability: "99.0", actualAvailability: "99.8", breachCount: "0", reportNote: "Hedef tuttu." }, { ...sv("portal"), startDate: day(-30), endDate: day(-20) });
  await proc("AVAILABILITY", "Posta hizmeti kullanılabilirlik analizi", "OPEN", kemal, "HIGH", { uptimeTarget: "99.9", measurementWindow: "7/24", mttrHours: "5", mtbfHours: "720", lastOutage: "Disk hatası (bu hafta)." }, { ...sv("posta"), startDate: day(-1) });
  await proc("AVAILABILITY", "SSO kullanılabilirlik izleme", "DONE", selin, "MEDIUM", { uptimeTarget: "99.9", measurementWindow: "7/24", mttrHours: "1", mtbfHours: "2160", lastOutage: "Yok." }, { ...sv("sso"), startDate: day(-40), endDate: day(-25) });
  await proc("CAPACITY", "Posta deposu kapasite planı", "IN_PROGRESS", tolga, "HIGH", { cpuHeadroom: "50", ramHeadroom: "35", storageHeadroom: "9", peakLoad: "6 TB", forecast: "Disk yenileme sonrası %60 boşluk hedefi." }, { ...sv("posta"), startDate: day(-3) });
  await proc("CAPACITY", "Veritabanı sunucusu CPU planı", "OPEN", deniz, "MEDIUM", { cpuHeadroom: "18", ramHeadroom: "30", storageHeadroom: "40", peakLoad: "%82 CPU", forecast: "6 ayda 2 çekirdek ekleme." }, { assetId: A.db, startDate: day(-1) });
  await proc("CONTINUITY", "Posta hizmeti DR planı", "OPEN", kemal, "CRITICAL", { disasterScenario: "HARDWARE", recoverySite: "İkinci salon", rtoHours: "4", rpoHours: "1", lastDrill: "Henüz yapılmadı." }, { ...sv("posta"), startDate: day(-2) });
  await proc("CONTINUITY", "Ofis dışı çalışma (pandemi) planı", "DONE", ahmet, "LOW", { disasterScenario: "PANDEMIC", recoverySite: "Uzaktan çalışma (VPN)", rtoHours: "24", rpoHours: "24", lastDrill: "Geçen yıl 1 günlük tatbikat." }, { startDate: day(-60), endDate: day(-58) });
  await proc("VALIDATION", "Makro GPO test sonucu", "WAITING", selin, "MEDIUM", { testType: "SECURITY", environment: "Pilot grup", result: "CONDITIONAL", goLiveReady: "HOLD", defects: "2 eski makro dosyası çalışmıyor." }, { startDate: day(-1) });
  await proc("VALIDATION", "Portal kullanıcı kabul testi", "IN_PROGRESS", can, "HIGH", { testType: "UAT", environment: "Test", result: "PASS", goLiveReady: "YES", defects: "Yok" }, { ...sv("portal"), startDate: day(-3) });
  await proc("RELEASE", "Portal 2.1 sürümü", "PLANNED", can, "MEDIUM", { version: "2.1", window: "Cumartesi 22:00", packageContents: "Yeni ana sayfa ve arama.", rollbackPlan: "Önceki paket." }, { ...sv("portal"), startDate: day(14) });
  await proc("RELEASE", "Exchange güvenlik paketi", "READY", kemal, "HIGH", { version: "CU14-SU3", window: "Pazar 02:00", packageContents: "Güvenlik güncellemeleri.", rollbackPlan: "Snapshot geri dönüşü." }, { ...sv("posta"), startDate: day(5) });
  await proc("MONITORING", "Posta sunucusu disk hata alarmı", "OPEN", elif, "CRITICAL", { source: "Zabbix", eventType: "FAILURE", threshold: "SMART hata", onCall: "Sistem nöbet", lastAlert: "Okuma hatası tekrarladı." }, { ...sv("posta"), startDate: day(-1) });
  await proc("MONITORING", "AD replikasyon gecikmesi", "CLEARED", kemal, "HIGH", { source: "Zabbix", eventType: "THRESHOLD", threshold: "> 15 dk", onCall: "Sistem nöbet", lastAlert: "NTP düzeltmesi sonrası normal." }, { assetId: A.dc, startDate: day(-4), endDate: day(-3) });
  await proc("EVALUATION", "Posta hizmeti değerlendirmesi", "IN_PROGRESS", ahmet, "MEDIUM", { intendedValue: "Güvenli kurumsal e-posta.", actualValue: "Donanım dayanıklılığı yetersiz.", stakeholder: "Tüm birimler", recommendation: "IMPROVE" }, { ...sv("posta"), startDate: day(-2) });
  await proc("EVALUATION", "Portal iş değeri", "DONE", can, "LOW", { intendedValue: "Belge ve duyuru.", actualValue: "Günlük 300 ziyaret.", stakeholder: "İK", recommendation: "CONTINUE" }, { ...sv("portal"), startDate: day(-40), endDate: day(-30) });

  // ---- 11) Bilgi bankası -----------------------------------------------------------------------------
  async function article(title: string, category: string, tags: string, body: string, status: string, author: any, src: any = {}) {
    await prisma.knowledgeArticle.create({
      data: { articleNo: await nextNo("knowledgeArticle", "articleNo", "BIL"), title, category, tags, body, status, authorId: author.id, ...src },
    });
  }
  await article("Yazıcı kuyruğu takılınca ne yapılır?", "Servis masası", "yazıcı,kuyruk", "1) Yazdırma biriktiricisi hizmetini yeniden başlatın.\n2) Bekleyen işleri silin.\n3) Yazıcıyı kapatıp açın.\nSorun sürerse servis masasına bildirin.", "PUBLISHED", merve, { sourceType: "INCIDENT", sourceId: I.print.id, sourceNo: I.print.incidentNo });
  await article("Wi-Fi bağlantı kopmalarında ilk kontroller", "Network", "wifi,ağ", "Cihazın Wi-Fi'ını kapatıp açın, kayıtlı ağı unutup yeniden bağlanın, sorun sürüyorsa kat ve saat bilgisiyle bildirin.", "PUBLISHED", elif);
  await article("Şüpheli e-posta ve makro dosyası bildirimi", "Bilgi güvenliği", "phishing,makro", "Şüpheli ek dosyasını açmayın; ağdan çıkmadan servis masasını arayın. BG ekibi bilgisayarı izole eder.", "PUBLISHED", selin, { sourceType: "INCIDENT", sourceId: I.ransom2.id, sourceNo: I.ransom2.incidentNo });
  await article("Posta sunucusu disk arızası geçici çözümü", "Sistem", "exchange,disk", "Kuyruk sınırı artırılır, etkilenen veritabanı diğer diske taşınır. Kalıcı çözüm değişiklik kaydında.", "DRAFT", kemal, { sourceType: "PROBLEM", sourceId: PR.mail.id, sourceNo: PR.mail.problemNo });
  await article("AD replikasyon uyarısı analiz adımları", "Sistem", "ad,ntp", "repadmin /replsummary çalıştırın; zaman farkını w32tm ile kontrol edin.", "PUBLISHED", kemal, { sourceType: "INCIDENT", sourceId: I.dc.id, sourceNo: I.dc.incidentNo });
  await article("Yeni işe başlayan personel BT kontrol listesi", "Servis masası", "işe başlama,hesap", "Hesap, e-posta, VPN, zimmet ve yetkiler için talep açılır; amir onayı gerekir.", "PUBLISHED", merve);

  // ---- 12) Süreç şablonu + canlı akış ---------------------------------------------------------------------
  const steps = [
    { kind: "INCIDENT", title: "Olay kaydı aç ve ilk müdahale" },
    { kind: "PROBLEM", title: "Kök neden için problem kaydı" },
    { kind: "CHANGE", title: "Kalıcı çözüm için değişiklik" },
    { kind: "PATCH", title: "Gerekli yamayı uygula" },
  ];
  await prisma.processTemplate.create({ data: { name: "Olaydan kalıcı çözüme", description: "Olay → Problem → Değişiklik → Yama", steps: JSON.stringify(steps), createdById: ahmet.id } });
  const flowCount = await prisma.processFlow.count({ where: { flowNo: { startsWith: `AKS-${year}-` } } });
  await prisma.processFlow.create({
    data: {
      flowNo: `AKS-${year}-${String(flowCount + 1).padStart(4, "0")}`, name: "Posta sunucusu disk arızası", note: "Örnek akış: olay → problem → değişiklik", createdById: ahmet.id,
      steps: {
        create: [
          { position: 1, kind: "INCIDENT", title: steps[0].title, recordId: I.mail.id, recordNo: I.mail.incidentNo },
          { position: 2, kind: "PROBLEM", title: steps[1].title, recordId: PR.mail.id, recordNo: PR.mail.problemNo },
          { position: 3, kind: "CHANGE", title: steps[2].title, recordId: C.mailraid.id, recordNo: C.mailraid.changeNo },
          { position: 4, kind: "PATCH", title: steps[3].title },
        ],
      },
    },
  });

  // ---- 13) Çevik: yeni ürün + işler -----------------------------------------------------------------------
  let envProduct = await prisma.agileProduct.findUnique({ where: { key: "ENVT" } });
  if (!envProduct) {
    envProduct = await prisma.agileProduct.create({ data: { key: "ENVT", name: "Envanter ve Zimmet İyileştirmeleri", method: "KANBAN", description: "Envanter kalitesi ve zimmet süreci işleri.", ownerId: nihan.id } });
  }
  const sprintProduct = await prisma.agileProduct.findUnique({ where: { key: "BTHM" } });
  const activeSprint = sprintProduct ? await prisma.agileSprint.findFirst({ where: { productId: sprintProduct.id, status: "ACTIVE" } }) : null;
  async function agile(product: any, d: any) {
    const rows = await prisma.agileItem.findMany({ where: { productId: product.id }, select: { itemNo: true } });
    const max = rows.reduce((m: number, r: any) => Math.max(m, Number(r.itemNo.split("-").pop()) || 0), 0);
    return prisma.agileItem.create({ data: { productId: product.id, itemNo: `${product.key}-${String(max + 1).padStart(3, "0")}`, reporterId: ahmet.id, ...d } });
  }
  const epic = await agile(envProduct, { type: "EPIC", title: "Envanter veri kalitesi", status: "IN_PROGRESS", priority: "HIGH", assigneeId: nihan.id, description: "Eksik seri no, sahip ve konum alanları tamamlanacak." });
  await agile(envProduct, { type: "STORY", title: "Seri numarası boş kayıtların listelenmesi", status: "DONE", priority: "MEDIUM", points: 3, assigneeId: gokhan.id, epicId: epic.id, completedAt: day(-3) });
  await agile(envProduct, { type: "TASK", title: "Sahipsiz cihazları sahiplerle eşleştir", status: "IN_PROGRESS", priority: "HIGH", points: 5, assigneeId: nihan.id, epicId: epic.id, startedAt: day(-2) });
  await agile(envProduct, { type: "TASK", title: "Zimmet tutanağı şablonunu güncelle", status: "REVIEW", priority: "MEDIUM", points: 2, assigneeId: merve.id });
  await agile(envProduct, { type: "BUG", title: "Zimmet iadesinde kişi filtresi boş geliyor", status: "TODO", priority: "HIGH", points: 2, assigneeId: gokhan.id });
  await agile(envProduct, { type: "STORY", title: "Toplu yüklemede hata raporu indir", status: "BACKLOG", priority: "LOW", points: 5 });
  await agile(envProduct, { type: "TASK", title: "Lisans bitiş uyarıları", status: "TODO", priority: "MEDIUM", points: 3, blockedReason: "Satın alma verisi bekleniyor.", assigneeId: nihan.id });
  if (sprintProduct) {
    await agile(sprintProduct, { type: "STORY", title: "Posta kuyruğu uyarı bildirimi", status: "IN_PROGRESS", priority: "HIGH", points: 5, assigneeId: can.id, sprintId: activeSprint?.id, sourceType: "INCIDENT", sourceId: I.mail.id, sourceNo: I.mail.incidentNo });
    await agile(sprintProduct, { type: "TASK", title: "Makro GPO pilot raporu", status: "TODO", priority: "MEDIUM", points: 3, assigneeId: selin.id, sprintId: activeSprint?.id, sourceType: "CHANGE", sourceId: C.gpo.id, sourceNo: C.gpo.changeNo });
    await agile(sprintProduct, { type: "BUG", title: "Portalda oturum zaman aşımı mesajı yanlış", status: "REVIEW", priority: "MEDIUM", points: 2, assigneeId: ayse.id, sprintId: activeSprint?.id });
    await agile(sprintProduct, { type: "STORY", title: "Wi-Fi sorunlarını katlara göre raporla", status: "BACKLOG", priority: "LOW", points: 8, assigneeId: elif.id, sourceType: "INCIDENT", sourceId: I.wifi.id, sourceNo: I.wifi.incidentNo });
  }

  console.log("Süreç örnek verisi yüklendi: yöneticiler, olay, problem, değişiklik, yama, zafiyet, talep, SLA, katalog, ITIL süreçleri, bilgi bankası, süreç akışı ve Çevik işler.");
}

prisma
  .$transaction((tx) => run(tx), { timeout: 180_000, maxWait: 30_000 })
  .catch((error) => {
    console.error("Süreç örnek verisi yüklenemedi:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
