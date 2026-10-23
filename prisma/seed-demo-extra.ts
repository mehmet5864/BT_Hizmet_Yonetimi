// @ts-nocheck
/**
 * Ek örnek (test) veri — MEVCUT KAYITLARA DOKUNMAZ, yalnızca ekler.
 * Tekrar çalıştırılırsa ikinci kez eklemez (BIM-SRV-0004 işaret kaydı).
 * Docker: SEED_DEMO_EXTRA=true iken açılışta bir kez çalışır.
 * Elle: npx tsx prisma/seed-demo-extra.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { DEMO_PASSWORD, hashPassword } from "../src/lib/auth/password";
import { PrismaClient } from "../src/generated/prisma/client";
import { demoSerial } from "./demo-serials";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function day(offset: number, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
const iso = (offset: number) => day(offset).toISOString().slice(0, 10);

async function run(prisma: any) {
  const year = new Date().getFullYear();
  // Kayıt numaraları mevcut kayıtlara göre otomatik üretilir (çakışma olmaz).
  async function nextNo(model: string, field: string, prefix: string) {
    const rows = await prisma[model].findMany({ where: { [field]: { startsWith: `${prefix}-${year}-` } }, select: { [field]: true } });
    const max = rows.reduce((m: number, r: any) => Math.max(m, Number(String(r[field]).split("-").pop()) || 0), 0);
    return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
  }
  // Metinlerdeki "OLY-2026-0004" gibi başvuruları gerçekte üretilen numaralara çevirir.
  const M: Record<string, string> = {};
  const fx = (v: any): any =>
    typeof v === "string"
      ? v.replace(/\b(OLY|PRB|CHG|SLA)-\d{4}-(\d{4})\b/g, (m, p, n) => M[`${p}${Number(n)}`] ?? m)
      : Array.isArray(v)
        ? v.map(fx)
        : v && typeof v === "object" && !(v instanceof Date)
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fx(x)]))
          : v;
  if (await prisma.asset.findUnique({ where: { stockNo: "BIM-SRV-0004" } })) {
    console.log("Ek örnek veri zaten yüklü; atlandı.");
    return;
  }

  // ---- Mevcut temel kayıtlar -------------------------------------------------
  const names = ["ahmet.yilmaz", "elif.demir", "mehmet.kara", "kemal.ozkan", "zeynep.aydin", "burak.sahin", "selin.koc", "can.yildiz", "deniz.arslan", "merve.uslu", "nihan.celik"];
  const P: Record<string, any> = {};
  for (const u of names) {
    P[u] = await prisma.person.findFirst({ where: { adUsername: u } });
    if (!P[u]) {
      console.log(`Temel personel bulunamadı (${u}); ek örnek veri yüklenmedi.`);
      return;
    }
  }
  const D: Record<string, any> = {};
  for (const c of ["BIDB", "IKM", "MHM", "SGB", "VMO", "YAZ", "VTB", "SDM", "ENV"]) {
    D[c] = await prisma.department.findFirst({ where: { code: c } });
    if (!D[c]) {
      console.log(`Temel birim bulunamadı (${c}); ek örnek veri yüklenmedi.`);
      return;
    }
  }
  const V = {
    anadolu: await prisma.vendor.findFirst({ where: { name: "Anadolu Bilişim A.Ş." } }),
    teknopark: await prisma.vendor.findFirst({ where: { name: "Teknopark Sistem Ltd." } }),
    netguc: await prisma.vendor.findFirst({ where: { name: "NetGüç Teknoloji" } }),
    veri: await prisma.vendor.findFirst({ where: { name: "Veri Destek Hizmetleri" } }),
  };

  // ---- Yeni personel ---------------------------------------------------------
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const newPeople = [
    { fullName: "Fatma Güneş", sicilNo: "S-1012", tcNo: "10000000012", title: "İK Uzmanı", duty: "Özlük ve izin işlemleri", workplace: "İK", adUsername: "fatma.gunes", dept: "IKM" },
    { fullName: "Oğuz Tekin", sicilNo: "S-1013", tcNo: "10000000013", title: "Muhasebe Uzmanı", duty: "Tahakkuk ve ödeme", workplace: "Mali Hizmetler", adUsername: "oguz.tekin", dept: "MHM" },
    { fullName: "Pınar Yalçın", sicilNo: "S-1014", tcNo: "10000000014", title: "Strateji Uzmanı", duty: "Performans ve raporlama", workplace: "Strateji", adUsername: "pinar.yalcin", dept: "SGB" },
    { fullName: "Tolga Erdem", sicilNo: "S-1015", tcNo: "10000000015", title: "Sistem Uzmanı", duty: "Windows / Linux sunucu işletimi", workplace: "Veri Merkezi", adUsername: "tolga.erdem", dept: "VMO", role: "SYSTEM_ADMIN", requestOffice: "SISTEM" },
    { fullName: "Ayşe Polat", sicilNo: "S-1016", tcNo: "10000000016", title: "Yazılım Geliştirici", duty: "Web uygulama geliştirme", workplace: "Yazılım DB", adUsername: "ayse.polat", dept: "YAZ" },
    { fullName: "Rıza Bulut", sicilNo: "S-1017", tcNo: "10000000017", title: "Veritabanı Uzmanı", duty: "PostgreSQL / Oracle bakım", workplace: "Veritabanı Şb.", adUsername: "riza.bulut", dept: "VTB" },
    { fullName: "Gökhan Aksoy", sicilNo: "S-1018", tcNo: "10000000018", title: "Servis Masası Analisti", duty: "L1 olay ve talep karşılama", workplace: "Servis Masası", adUsername: "gokhan.aksoy", dept: "SDM" },
    { fullName: "Esra Kılıç", sicilNo: "S-1019", tcNo: "10000000019", title: "İK Asistanı", duty: "Evrak ve arşiv", workplace: "İK", adUsername: "esra.kilic", dept: "IKM" },
  ];
  for (const p of newPeople) {
    const { dept, ...rest } = p;
    const exists = await prisma.person.findFirst({ where: { OR: [{ adUsername: p.adUsername }, { fullName: p.fullName }] } });
    P[p.adUsername] =
      exists ??
      (await prisma.person.create({
        data: {
          ...rest,
          email: `${p.adUsername}@kurum.gov.tr`,
          phone: `0312 555 11 ${p.sicilNo.slice(-2)}`,
          departmentId: D[dept].id,
          role: p.role ?? "USER",
          roleSource: "MANUAL",
          unitManagerId: D[dept].managerId ?? P["ahmet.yilmaz"].id,
          parentManagerId: P["ahmet.yilmaz"].id,
          parentDepartmentId: D.BIDB.id,
          passwordHash,
        },
      }));
  }
  const person = (u: string) => P[u];

  // ---- Envanter --------------------------------------------------------------
  const A: Record<string, any> = {};
  async function asset(key: string, data: any) {
    A[key] = await prisma.asset.create({
      data: {
        ...(data.assetType !== "SOFTWARE" && data.stockNo ? { serialNo: data.deviceId ?? demoSerial(data.stockNo, data.brand) } : {}),
        formFactor: "PHYSICAL",
        criticality: "MEDIUM",
        status: "ACTIVE",
        supportStatus: "IN_WARRANTY",
        ...data,
      },
    });
    await prisma.activityLog.create({
      data: { assetId: A[key].id, action: "CREATE", actor: "kurulum", note: `${A[key].name} envanteri oluşturuldu` },
    });
  }
  const loc = (room: number, corridor: number, cabinet: number, shelf: number) => ({ locRoom: room, locCorridor: corridor, locCabinet: cabinet, locShelf: shelf });

  await asset("fileSrv", { assetType: "SERVER", stockNo: "BIM-SRV-0004", name: "SRV-FILE-04", servedApplication: "Kurumsal dosya paylaşımı", brand: "Dell", model: "PowerEdge R750", ipAddress: "10.10.20.31", macAddress: "B0:7B:25:3A:11:31", operatingSystem: "Windows Server", version: "2019", cpu: "2 x Intel Xeon Silver 4314", ram: "128 GB", disk: "8 x 1.92 TB SSD (RAID 6)", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, criticality: "HIGH", ...loc(1, 3, 2, 1), contractorVendorId: V.anadolu?.id, supportVendorId: V.anadolu?.id, supportStartDate: day(-500), supportEndDate: day(230), transactionDate: day(-500), description: "Birim ve ortak klasörlerin tutulduğu dosya sunucusu." });
  await asset("bkpSrv", { assetType: "SERVER", stockNo: "BIM-SRV-0005", name: "SRV-BKP-05", servedApplication: "Yedekleme (Veeam Backup & Replication)", brand: "HPE", model: "ProLiant DL380 Gen10 Plus", ipAddress: "10.10.20.41", macAddress: "3C:A8:2A:11:4F:41", operatingSystem: "Windows Server", version: "2022", cpu: "2 x Intel Xeon Silver 4310", ram: "96 GB", disk: "12 x 8 TB HDD (RAID 6)", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, criticality: "HIGH", ...loc(1, 3, 2, 3), contractorVendorId: V.teknopark?.id, supportVendorId: V.teknopark?.id, supportStartDate: day(-300), supportEndDate: day(430), transactionDate: day(-300), description: "Yedekleme deposu; kapasite %88 dolu." });
  await asset("monSrv", { assetType: "SERVER", formFactor: "VIRTUAL", stockNo: "BIM-SRV-0006", name: "SRV-MON-06", servedApplication: "İzleme (Zabbix)", brand: "VMware", model: "vSphere VM", ipAddress: "10.10.20.51", operatingSystem: "Ubuntu Server", version: "22.04 LTS", cpu: "4 vCPU", ram: "16 GB", disk: "300 GB", ownerId: person("elif.demir").id, departmentId: D.VMO.id, criticality: "MEDIUM", supportStatus: "UNDER_CONTRACT", description: "Altyapı izleme sunucusu." });
  await asset("dc", { assetType: "SERVER", formFactor: "VIRTUAL", stockNo: "BIM-SRV-0007", name: "SRV-DC-07", servedApplication: "Active Directory etki alanı denetleyicisi", brand: "VMware", model: "vSphere VM", ipAddress: "10.10.20.5", operatingSystem: "Windows Server", version: "2022", cpu: "4 vCPU", ram: "16 GB", disk: "120 GB", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, criticality: "HIGH", supportStatus: "UNDER_CONTRACT", description: "kurum.local etki alanı birincil denetleyicisi." });

  const pcs = [
    ["PC-MALI-021", "BIM-PC-0111", "burak.sahin", "MHM", "Dell", "OptiPlex 7010", "10.20.21.21", "Windows 11 Pro", "23H2", "Muhasebe iş istasyonu."],
    ["PC-MALI-022", "BIM-PC-0112", "oguz.tekin", "MHM", "Dell", "OptiPlex 7010", "10.20.21.22", "Windows 11 Pro", "23H2", "Tahakkuk iş istasyonu."],
    ["PC-IK-008", "BIM-PC-0113", "fatma.gunes", "IKM", "HP", "ProDesk 400 G9", "10.20.31.8", "Windows 11 Pro", "23H2", "İK özlük işleri."],
    ["PC-SGB-003", "BIM-PC-0114", "pinar.yalcin", "SGB", "Lenovo", "ThinkCentre M70q", "10.20.41.3", "Windows 11 Pro", "22H2", "Raporlama iş istasyonu."],
    ["PC-YAZ-011", "BIM-PC-0115", "ayse.polat", "YAZ", "Dell", "Precision 3660", "10.20.51.11", "Windows 11 Pro", "23H2", "Geliştirici iş istasyonu."],
    ["PC-VTB-002", "BIM-PC-0116", "riza.bulut", "VTB", "Lenovo", "ThinkStation P360", "10.20.61.2", "Ubuntu", "22.04 LTS", "Veritabanı yönetim istasyonu."],
  ];
  for (const [name, stockNo, owner, dept, brand, model, ip, os, ver, description] of pcs) {
    await asset(name, { assetType: "COMPUTER", stockNo, name, brand, model, ipAddress: ip, macAddress: `A4:BB:6D:${stockNo.slice(-2)}:${ip.split(".")[2].padStart(2, "0")}:${ip.split(".")[3].padStart(2, "0")}`, operatingSystem: os, version: ver, cpu: "Intel Core i5 / i7", ram: "16 GB", disk: "512 GB NVMe SSD", ownerId: person(owner).id, departmentId: D[dept].id, contractorVendorId: V.anadolu?.id, supportVendorId: V.anadolu?.id, supportStartDate: day(-200), supportEndDate: day(530), transactionDate: day(-200), description });
  }
  await asset("laptop1", { assetType: "COMPUTER", stockNo: "BIM-PC-0117", name: "NB-IK-004", brand: "Lenovo", model: "ThinkPad L14 Gen 4", ipAddress: "10.20.31.40", operatingSystem: "Windows 11 Pro", version: "23H2", cpu: "Intel Core i5-1335U", ram: "16 GB", disk: "512 GB NVMe SSD", ownerId: person("esra.kilic").id, departmentId: D.IKM.id, supportEndDate: day(-20), supportStatus: "EXPIRED", description: "Garantisi biten dizüstü; yenileme talebi var." });

  await asset("swAcc", { assetType: "NETWORK_DEVICE", stockNo: "BIM-NET-0603", name: "SW-ACC-02", deviceId: "FDO2411Q0AB", brand: "Cisco", model: "Catalyst 9200L-24P", ipAddress: "10.10.1.12", macAddress: "F8:0B:CB:55:AA:12", operatingSystem: "Cisco IOS XE", version: "17.06.05", ownerId: person("elif.demir").id, departmentId: D.VMO.id, criticality: "MEDIUM", supportStatus: "UNDER_CONTRACT", contractorVendorId: V.netguc?.id, supportVendorId: V.netguc?.id, supportStartDate: day(-300), supportEndDate: day(430), description: "2. kat erişim anahtarı." });
  await asset("fw", { assetType: "NETWORK_DEVICE", stockNo: "BIM-NET-0604", name: "FW-EDGE-01", deviceId: "PA-3410-0042", brand: "Palo Alto Networks", model: "PA-3410", ipAddress: "10.10.1.254", macAddress: "B4:0C:25:00:34:10", operatingSystem: "PAN-OS", version: "10.2.9", ownerId: person("selin.koc").id, departmentId: D.BIDB.id, criticality: "HIGH", supportStatus: "UNDER_CONTRACT", contractorVendorId: V.netguc?.id, supportVendorId: V.netguc?.id, supportStartDate: day(-400), supportEndDate: day(330), ...loc(1, 3, 1, 2), description: "Çevre güvenlik duvarı ve VPN geçidi." });
  await asset("ap", { assetType: "NETWORK_DEVICE", stockNo: "BIM-NET-0605", name: "AP-KAT2-03", brand: "Cisco", model: "Catalyst 9120AX", ipAddress: "10.10.1.43", operatingSystem: "Cisco IOS XE", version: "17.09", ownerId: person("elif.demir").id, departmentId: D.VMO.id, supportStatus: "UNDER_CONTRACT", contractorVendorId: V.netguc?.id, supportVendorId: V.netguc?.id, description: "2. kat kablosuz erişim noktası." });

  await asset("prn1", { assetType: "PRINTER", stockNo: "BIM-PRN-0302", name: "YZC-IK-01", brand: "HP", model: "LaserJet Pro M404dn", ipAddress: "10.20.31.100", ownerId: person("fatma.gunes").id, departmentId: D.IKM.id, description: "İK katı ağ yazıcısı." });
  await asset("prn2", { assetType: "PRINTER", stockNo: "BIM-PRN-0303", name: "YZC-MALI-01", brand: "Kyocera", model: "ECOSYS M3655idn", ipAddress: "10.20.21.100", ownerId: person("burak.sahin").id, departmentId: D.MHM.id, description: "Mali hizmetler çok işlevli yazıcı." });
  await asset("tel1", { assetType: "IP_PHONE", stockNo: "BIM-TEL-0502", name: "Dahili 1310", brand: "Cisco", model: "CP-8845", ipAddress: "10.30.1.10", ownerId: person("gokhan.aksoy").id, departmentId: D.SDM.id, description: "Servis masası hattı." });
  await asset("tel2", { assetType: "IP_PHONE", stockNo: "BIM-TEL-0503", name: "Dahili 1311", brand: "Cisco", model: "CP-8845", ipAddress: "10.30.1.11", ownerId: person("merve.uslu").id, departmentId: D.SDM.id, description: "Servis masası hattı." });
  await asset("tbl1", { assetType: "TABLET", stockNo: "BIM-TBL-0402", name: "TBL-ENV-01", brand: "Samsung", model: "Galaxy Tab Active4 Pro", ownerId: person("nihan.celik").id, departmentId: D.ENV.id, description: "Sayım ve etiketleme tableti." });
  await asset("scan", { assetType: "PERIPHERAL", stockNo: "BIM-CVR-0702", name: "Belge Tarayıcı - Arşiv", brand: "Fujitsu", model: "fi-7160", ownerId: person("esra.kilic").id, departmentId: D.IKM.id, description: "Arşiv belge tarayıcısı." });

  await asset("veeam", { assetType: "SOFTWARE", formFactor: "VIRTUAL", stockNo: "BIM-YZL-0903", name: "Veeam Backup & Replication", version: "12.1", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, criticality: "HIGH", supportStatus: "UNDER_CONTRACT", contractorVendorId: V.teknopark?.id, supportVendorId: V.teknopark?.id, supportStartDate: day(-300), supportEndDate: day(65), description: "Sunucu yedekleme yazılımı; abonelik yenilemesi yaklaşıyor." });
  await asset("vmw", { assetType: "SOFTWARE", formFactor: "VIRTUAL", stockNo: "BIM-YZL-0904", name: "VMware vSphere", version: "8.0 U2", ownerId: person("elif.demir").id, departmentId: D.VMO.id, criticality: "HIGH", supportStatus: "UNDER_CONTRACT", contractorVendorId: V.anadolu?.id, supportVendorId: V.anadolu?.id, supportStartDate: day(-340), supportEndDate: day(25), description: "Sanallaştırma platformu; abonelik 25 gün içinde bitiyor." });
  await asset("nessus", { assetType: "SOFTWARE", formFactor: "VIRTUAL", stockNo: "BIM-YZL-0905", name: "Nessus Professional", version: "10.7", ownerId: person("selin.koc").id, departmentId: D.BIDB.id, criticality: "MEDIUM", supportStatus: "UNDER_CONTRACT", supportEndDate: day(190), description: "Zafiyet tarama aracı." });

  const rel = (s: string, t: string) => ({ sourceId: A[s].id, targetId: A[t].id, relationType: "HOSTED_ON" });
  await prisma.assetRelation.createMany({
    data: [rel("veeam", "bkpSrv"), rel("nessus", "monSrv"), rel("vmw", "monSrv"), rel("fileSrv", "vmw")],
  });

  // ---- Servis talepleri ------------------------------------------------------
  const handling = {
    SISTEM: [D.BIDB, P["ahmet.yilmaz"]],
    NETWORK: [D.VMO, P["elif.demir"]],
    SIBER: [D.BIDB, P["selin.koc"]],
    YAZILIM: [D.YAZ, P["can.yildiz"]],
    VERITABANI: [D.VTB, P["deniz.arslan"]],
    SERVIS: [D.SDM, P["merve.uslu"]],
  };
  const deptOf = new Map(Object.values(D).map((d: any) => [d.id, d]));
    async function req(requestType: string, office: string, requester: string, status: string, severity: string, daysAgo: number, reason: string, details: any, extra: any = {}) {
    const who = person(requester);
    const dept: any = deptOf.get(who.departmentId);
    const [hDept, hMgr] = handling[office];
    await prisma.serviceRequest.create({
      data: {
        requestNo: await nextNo("serviceRequest", "requestNo", "TAL"),
        requestType, office, status, severity, reason,
        requesterId: who.id,
        requestingDeptId: who.departmentId,
        requestingManagerId: dept?.managerId ?? P["ahmet.yilmaz"].id,
        handlingDeptId: hDept.id,
        handlingManagerId: hMgr.id,
        details: JSON.stringify(details),
        requestDate: day(-daysAgo),
        createdAt: day(-daysAgo),
        ...extra,
      },
    });
  }
  await req("AD_USER", "SISTEM", "fatma.gunes", "DONE", "LOW", 12, "Yeni başlayan İK asistanı için hesap.", { username: "esra.kilic", actionKind: "CREATE", displayName: "Esra Kılıç", upn: "esra.kilic@kurum.gov.tr", ouPath: "OU=IK,OU=Kurum,DC=kurum,DC=local", directory: "AD" });
  await req("PASSWORD", "SISTEM", "oguz.tekin", "DONE", "MEDIUM", 9, "Parola süresi doldu, giriş yapılamıyor.", { username: "oguz.tekin", passwordAction: "RESET" });
  await req("VPN", "SIBER", "pinar.yalcin", "IN_PROGRESS", "MEDIUM", 4, "Saha çalışması için uzaktan erişim.", { vpnProduct: "GLOBALPROTECT", username: "pinar.yalcin", vpnProfile: "Uzaktan çalışma", splitTunnel: "SPLIT", validUntil: iso(90) });
  await req("FW_INTRANET", "SIBER", "ayse.polat", "OPEN", "HIGH", 2, "EBYS test API'sine geliştirici erişimi.", { sourceIp: "10.20.51.11", destIp: "10.10.20.21", portProtocol: "8443/TCP", fwVendor: "PALO" });
  await req("FW_INTERNET", "SIBER", "mehmet.kara", "WAITING", "MEDIUM", 8, "Dış kurum web servisine çıkış izni.", { sourceIp: "10.10.20.31", destIp: "198.51.100.20", portProtocol: "443/TCP", fwVendor: "PALO" });
  await req("BACKUP", "SISTEM", "tolga.erdem", "DONE", "MEDIUM", 20, "Dosya sunucusu için günlük yedek işi.", { hostName: "SRV-FILE-04", hostIp: "10.10.20.31", backupProduct: "VEEAM", jobName: "FILE-04-Gunluk", backupType: "INCREMENTAL", backupPeriod: "DAILY", retention: "30 gün", repository: "SRV-BKP-05" });
  await req("CERTIFICATE", "SISTEM", "can.yildiz", "IN_PROGRESS", "HIGH", 3, "EBYS sertifikası 15 gün içinde bitiyor.", { actionKind: "RENEW", commonName: "ebys.kurum.gov.tr", san: "ebys-test.kurum.gov.tr", certType: "WEB_TLS", validityYears: "1" });
  await req("VLAN", "NETWORK", "elif.demir", "OPEN", "LOW", 1, "Misafir Wi-Fi için ayrı ağ.", { actionKind: "CREATE", vlanId: "140", vlanName: "MISAFIR-WIFI", subnet: "10.40.0.0/24", gateway: "10.40.0.1", dhcpHelper: "10.10.20.5" });
  await req("ANTIVIRUS", "SIBER", "burak.sahin", "DONE", "LOW", 15, "Muhasebe programı için tarama istisnası.", { avProduct: "DEFENDER", hostName: "PC-MALI-021", exceptionPath: "C:\\Muhasebe\\Logo", validUntil: iso(180) });
  await req("REPO_ACCESS", "YAZILIM", "ayse.polat", "DONE", "MEDIUM", 18, "EBYS ön yüz deposuna geliştirici erişimi.", { scmProduct: "GITLAB", actionKind: "GRANT", repoPath: "kurum/ebys-frontend", accessLevel: "DEVELOPER", username: "ayse.polat" });
  await req("RELEASE_DEPLOY", "YAZILIM", "can.yildiz", "WAITING", "HIGH", 5, "EBYS 6.4.3 ön üretim dağıtımı.", { releaseTool: "GITLAB", appName: "EBYS Backend", version: "6.4.3", targetEnv: "PREPROD", changeWindow: "Cumartesi 22:00-24:00", rollbackPlan: "Önceki imaj etiketine dön." });
  await req("DB_USER", "VERITABANI", "mehmet.kara", "DONE", "MEDIUM", 7, "Kurumsal veritabanında okuma yetkisi.", { dbEngine: "POSTGRES", actionKind: "GRANT", dbName: "kurumsal_db", dbUsername: "mehmet.kara", privilege: "READ" });
  await req("DB_BACKUP", "VERITABANI", "deniz.arslan", "IN_PROGRESS", "HIGH", 2, "EBYS üretim veritabanı için tam yedek işi.", { dbEngine: "ORACLE", dbName: "EBYS_PROD", actionKind: "SCHEDULE", backupLevel: "FULL" });
  await req("SD_HARDWARE", "SERVIS", "fatma.gunes", "DONE", "LOW", 10, "Arızalı monitör değişimi.", { actionKind: "REPLACE", deviceClass: "MONITOR", assetTag: "BIM-PC-0102", location: "İK 2. kat" });
  await req("SD_HARDWARE", "SERVIS", "esra.kilic", "OPEN", "MEDIUM", 3, "Garantisi biten dizüstü için yenisi.", { actionKind: "NEW", deviceClass: "LAPTOP", assetTag: "BIM-PC-0117", location: "İK 2. kat" });
  await req("SD_SOFTWARE", "SERVIS", "burak.sahin", "DONE", "LOW", 14, "Office lisansı tahsisi.", { actionKind: "LICENSE", softwareName: "Microsoft Office LTSC", licenseSku: "Office-LTSC-2021", hostName: "PC-MALI-021" });
  await req("SD_ACCESS", "SERVIS", "oguz.tekin", "REJECTED", "LOW", 6, "EBYS yönetici ekranına erişim.", { accessTarget: "APP", systemName: "EBYS", username: "oguz.tekin", validUntil: iso(30) }, { description: "Reddedildi: yetki sahibi birim amiri onayı yok." });
  await req("SD_SUPPORT", "SERVIS", "pinar.yalcin", "IN_PROGRESS", "HIGH", 1, "E-posta gönderimi gecikiyor.", { sdProduct: "SDP", category: "INCIDENT", affectedService: "E-posta", urgency: "HIGH" });
  await req("SD_SUPPORT", "SERVIS", "fatma.gunes", "DONE", "LOW", 8, "Yazıcıdan çıktı alınamıyor.", { sdProduct: "SDP", category: "REQUEST", affectedService: "Yazıcı", urgency: "LOW" });
  await req("SD_SUPPORT", "SERVIS", "ayse.polat", "OPEN", "MEDIUM", 1, "2. katta kablosuz ağ sık kopuyor.", { sdProduct: "SDP", category: "INCIDENT", affectedService: "Kablosuz ağ", urgency: "MEDIUM" }, { escalationStatus: "PENDING", escalationKind: "MISROUTED", originalOffice: "SERVIS", escalatedOffice: "NETWORK", escalatedDeptId: D.VMO.id, escalationReason: "Sorun Wi-Fi altyapısında; Network ofisine devri önerilir.", escalatedAt: day(-1), escalatedById: P["merve.uslu"].id });
  await req("MAILBOX", "SISTEM", "zeynep.aydin", "CANCELLED", "LOW", 11, "Paylaşılan başvuru kutusu.", { actionKind: "SHARED", mailboxName: "ik-basvuru@kurum.gov.tr" }, { description: "Talep sahibi vazgeçti." });
  await req("SERVER_NEW", "SISTEM", "can.yildiz", "IN_PROGRESS", "MEDIUM", 6, "EBYS test ortamı için yeni sanal sunucu.", { environment: "TEST", platform: "VMWARE", hostName: "SRV-EBYS-TEST-08", cpu: "4", ram: "16 GB", disk: "200 GB", os: "RHEL 9" });
  await req("LOCAL_ADMIN", "SISTEM", "mehmet.kara", "OPEN", "LOW", 0, "Geliştirme aracı kurulumu için geçici yerel yönetici.", { username: "mehmet.kara", hostName: "PC-BIDB-014", validUntil: iso(7) });

  // ---- Olaylar ---------------------------------------------------------------
  const I: Record<string, any> = {};
  async function incident(key: string, no: number, data: any) {
    const incidentNo = await nextNo("incident", "incidentNo", "OLY");
    I[key] = await prisma.incident.create({
      data: { departmentId: D.BIDB.id, requestingManagerId: P["ahmet.yilmaz"].id, ...fx(data), incidentNo },
    });
    M[`OLY${no}`] = incidentNo;
  }
  await incident("ransom", 2, { title: "Dosya sunucusunda fidye yazılımı şüphesi", severity: "CRITICAL", layer: "L2", status: "CONTAINED", startedAt: day(-9), requesterId: person("tolga.erdem").id, l1AnalystId: P["kemal.ozkan"].id, l2AnalystId: P["selin.koc"].id, escalationStatus: "TRANSFERRED", escalatedOffice: "SIBER", escalationReason: "Şifreleme davranışı; BG ekibi incelemeli.", escalatedAt: day(-9), escalatedById: P["kemal.ozkan"].id, ioc: "SHA256 3b8f…e41 · .locked uzantılı dosyalar", assetId: A.fileSrv.id, description: "Bir kullanıcı paylaşımında toplu dosya adı değişikliği tespit edildi. Etkilenen paylaşım ağdan ayrıldı, yedekten geri dönüş yapıldı." });
  await incident("phish", 3, { title: "Phishing e-postası — İK birimi", severity: "MEDIUM", layer: "L1", status: "RESOLVED", startedAt: day(-14), endedAt: day(-13), requesterId: person("fatma.gunes").id, l1AnalystId: person("gokhan.aksoy").id, ioc: "hxxp://kurum-giris[.]example/login", description: "Sahte oturum açma sayfasına yönlendiren e-posta. 3 kullanıcı bağlantıya tıkladı, parolalar sıfırlandı, alan adı engellendi." });
  await incident("vpn", 4, { title: "VPN erişiminde aralıklı kopmalar", severity: "MEDIUM", layer: "L1", status: "INVESTIGATING", startedAt: day(-2), requesterId: person("pinar.yalcin").id, l1AnalystId: person("gokhan.aksoy").id, assetId: A.fw.id, description: "Uzaktan çalışan kullanıcılarda 10–15 dk aralıkla bağlantı kopması." });
  await incident("disk", 5, { title: "Veritabanı sunucusunda disk doluluğu %95", severity: "HIGH", layer: "L1", status: "CONTAINED", startedAt: day(-5), requesterId: person("deniz.arslan").id, l1AnalystId: P["kemal.ozkan"].id, assetId: (await prisma.asset.findFirst({ where: { name: "SRV-DB-01" } }))?.id, description: "Arşiv logları temizlendi, geçici alan açıldı; kalıcı çözüm problem kaydında." });
  await incident("swscan", 6, { title: "Core switch yönetim arayüzüne yetkisiz giriş denemesi", severity: "HIGH", layer: "L2", status: "INVESTIGATING", startedAt: day(-3), requesterId: P["elif.demir"].id, l1AnalystId: P["kemal.ozkan"].id, l2AnalystId: P["selin.koc"].id, escalationStatus: "TRANSFERRED", escalatedOffice: "SIBER", escalationReason: "Dış IP'den tekrarlı deneme.", escalatedAt: day(-3), escalatedById: P["kemal.ozkan"].id, ioc: "198.51.100.77 · ~120 başarısız giriş", assetId: (await prisma.asset.findFirst({ where: { name: "SW-CORE-01" } }))?.id, description: "SIEM korelasyonu ile tespit edildi; yönetim erişimi yalnızca yönetim VLAN'ından izinli kılındı." });
  await incident("backup", 7, { title: "Yedekleme işi art arda 3 gece başarısız", severity: "LOW", layer: "L1", status: "CLOSED", startedAt: day(-21), endedAt: day(-18), requesterId: person("tolga.erdem").id, l1AnalystId: person("gokhan.aksoy").id, assetId: A.bkpSrv.id, description: "Depo alanı yetersizdi; eski noktalar temizlendi, iş yeniden başarılı." });
  await incident("mail", 8, { title: "E-posta gönderim gecikmesi", severity: "LOW", layer: "L1", status: "OPEN", startedAt: day(-1), requesterId: person("pinar.yalcin").id, l1AnalystId: person("gokhan.aksoy").id, description: "Giden e-postalar 20–30 dk gecikmeli ulaşıyor." });
  await incident("ebys", 9, { title: "EBYS uygulaması yavaşlığı", severity: "MEDIUM", layer: "L1", status: "RESOLVED", startedAt: day(-11), endedAt: day(-10), requesterId: person("fatma.gunes").id, l1AnalystId: P["kemal.ozkan"].id, assetId: (await prisma.asset.findFirst({ where: { name: "SRV-APP-02" } }))?.id, description: "Rapor ekranında sorgu süreleri uzadı; indeks yenilemesi sonrası normale döndü." });

  // ---- Problemler ------------------------------------------------------------
  async function problem(no: number, data: any) {
    const problemNo = await nextNo("problem", "problemNo", "PRB");
    await prisma.problem.create({ data: { requestingManagerId: P["ahmet.yilmaz"].id, infosecManagerId: P["selin.koc"].id, ...fx(data), problemNo } });
    M[`PRB${no}`] = problemNo;
  }
  await problem(2, { title: "Dosya paylaşımlarında aşırı geniş yazma yetkileri", incidentId: I.ransom.id, requesterId: P["selin.koc"].id, proposedAssigneeId: person("tolga.erdem").id, assigneeId: person("tolga.erdem").id, assignmentStatus: "APPROVED", assignmentDecidedById: P["selin.koc"].id, assignedAt: day(-7), status: "INVESTIGATING", assetId: A.fileSrv.id, rootCause: "Herkes için yazma yetkisi olan eski paylaşımlar.", workaround: "Etkilenen paylaşımlar salt okunur yapıldı.", description: "Fidye yazılımı olayından türetildi; yetki gözden geçirmesi sürüyor." });
  await problem(3, { title: "Veritabanı arşiv logları disk alanını dolduruyor", incidentId: I.disk.id, requesterId: person("deniz.arslan").id, proposedAssigneeId: P["deniz.arslan"].id, assigneeId: P["deniz.arslan"].id, assignmentStatus: "APPROVED", assignmentDecidedById: P["selin.koc"].id, assignedAt: day(-4), status: "KNOWN_ERROR", rootCause: "Arşiv log temizleme işi zamanlanmamış.", workaround: "Haftalık elle temizlik; izleme eşiği %80.", description: "Kalıcı çözüm değişiklik kaydı bekliyor." });
  await problem(4, { title: "Yedekleme deposu kapasitesi yetersiz", incidentId: I.backup.id, requesterId: person("tolga.erdem").id, proposedAssigneeId: person("tolga.erdem").id, assignmentStatus: "PENDING", status: "OPEN", assetId: A.bkpSrv.id, workaround: "Eski kurtarma noktaları elle temizleniyor.", description: "Atama BG yöneticisi onayı bekliyor." });
  await problem(5, { title: "EBYS rapor sorgularında plan gerilemesi", incidentId: I.ebys.id, requesterId: P["kemal.ozkan"].id, proposedAssigneeId: P["deniz.arslan"].id, assigneeId: P["deniz.arslan"].id, assignmentStatus: "APPROVED", assignmentDecidedById: P["selin.koc"].id, assignedAt: day(-10), status: "RESOLVED", rootCause: "İstatistikler güncel değildi.", workaround: "Gece istatistik toplama işi eklendi.", description: "Kalıcı düzeltme uygulandı, izleniyor." });

  // ---- Değişiklikler ---------------------------------------------------------
  async function change(no: number, units: any[], data: any) {
    const changeNo = await nextNo("changeRecord", "changeNo", "CHG");
    await prisma.changeRecord.create({
      data: {
        requestingManagerId: P["ahmet.yilmaz"].id,
        infosecManagerId: P["selin.koc"].id,
        approvalUnitCount: units.length,
        targetDept1Id: units[0]?.[0].id, targetMgr1Id: units[0]?.[1].id,
        targetDept2Id: units[1]?.[0].id, targetMgr2Id: units[1]?.[1].id,
        targetDept3Id: units[2]?.[0].id, targetMgr3Id: units[2]?.[1].id,
        approvalUnits: { create: units.map(([d, m], i) => ({ sortOrder: i + 1, departmentId: d.id, managerId: m.id })) },
        ...fx(data),
        changeNo,
      },
    });
    M[`CHG${no}`] = changeNo;
  }
  const core = await prisma.asset.findFirst({ where: { name: "SW-CORE-01" } });
  await change(2, [[D.VMO, P["elif.demir"]]], { requesterId: person("tolga.erdem").id, requestingDeptId: D.VMO.id, changeIp: "10.10.20.31", changeKind: "SOFTWARE", machineType: "PHYSICAL", impact: "FULL", status: "APPROVED", requestDate: day(-6), approvalDate: day(-2), workStartDate: day(5), expectedEndDate: day(5, 18), assetId: A.fileSrv.id, description: "SRV-FILE-04 Windows Server 2019 → 2022 yükseltmesi (Cumartesi bakım penceresi)." });
  await change(3, [[D.VMO, P["elif.demir"]], [D.BIDB, P["selin.koc"]]], { requesterId: P["elif.demir"].id, requestingDeptId: D.VMO.id, changeIp: "10.10.1.1", changeKind: "SOFTWARE", machineType: "PHYSICAL", impact: "PARTIAL", status: "PENDING", requestDate: day(-3), workStartDate: day(12), expectedEndDate: day(12, 16), assetId: core?.id, description: "SW-CORE-01 IOS XE yaması (zafiyet kapatma). Kısa süreli kesinti bekleniyor." });
  await change(4, [[D.BIDB, P["selin.koc"]]], { requesterId: P["selin.koc"].id, requestingDeptId: D.BIDB.id, changeIp: "10.10.1.254", changeKind: "OTHER", machineType: "PHYSICAL", impact: "PARTIAL", status: "COMPLETED", requestDate: day(-20), approvalDate: day(-15), workStartDate: day(-12), expectedEndDate: day(-11), assetId: A.fw.id, description: "Güvenlik duvarı kural seti temizliği: kullanılmayan 84 kural kaldırıldı." });
  await change(5, [[D.YAZ, P["can.yildiz"]], [D.VTB, P["deniz.arslan"]], [D.BIDB, P["selin.koc"]]], { requesterId: P["can.yildiz"].id, requestingDeptId: D.YAZ.id, changeIp: "10.10.20.21", changeKind: "SOFTWARE", machineType: "VIRTUAL", impact: "PARTIAL", status: "IN_PROGRESS", requestDate: day(-8), approvalDate: day(-4), workStartDate: day(-1), expectedEndDate: day(2), description: "EBYS 6.4.2 → 6.4.3 sürüm geçişi (veritabanı şema güncellemesi dahil)." });
  await change(6, [[D.VMO, P["elif.demir"]]], { requesterId: person("tolga.erdem").id, requestingDeptId: D.VMO.id, changeIp: "10.10.20.41", changeKind: "HARDWARE", machineType: "PHYSICAL", impact: "PARTIAL", status: "DRAFT", requestDate: day(-1), assetId: A.bkpSrv.id, description: "SRV-BKP-05 için 4 x 8 TB disk eklenmesi (kapasite problemi PRB-2026-0004)." });
  await change(7, [[D.VMO, P["elif.demir"]], [D.BIDB, P["selin.koc"]]], { requesterId: P["elif.demir"].id, requestingDeptId: D.VMO.id, changeKind: "OTHER", machineType: "VIRTUAL", impact: "PARTIAL", status: "REJECTED", requestDate: day(-10), description: "Misafir Wi-Fi VLAN 140 devreye alma. Reddedildi: güvenlik duvarı kural tasarımı eksik." });

  // ---- Yamalar ---------------------------------------------------------------
  async function patch(no: number, data: any) {
    await prisma.patchRecord.create({ data: { requestingManagerId: P["ahmet.yilmaz"].id, ...fx(data), patchNo: await nextNo("patchRecord", "patchNo", "YAM") } });
  }
  await patch(2, { requesterId: person("tolga.erdem").id, title: "Windows Server aylık güvenlik güncellemeleri", scope: "Veri merkezi Windows sunucuları", systemType: "OS", systemKind: "SERVER", ipRange: "10.10.20.0/24", impact: "PARTIAL", assetOwnerId: person("tolga.erdem").id, distribution: "CUSTOM", risks: "Yeniden başlatma gerekir.", status: "COMPLETED", requestDate: day(-25), approvalDate: day(-22), workStartDate: day(-18), expectedEndDate: day(-17), description: "Aylık kümülatif güncelleme paketi uygulandı." });
  await patch(3, { requesterId: P["elif.demir"].id, title: "Cisco IOS XE güvenlik yaması", scope: "Omurga ve erişim anahtarları", systemType: "FIRMWARE", systemKind: "NETWORK", ipRange: "10.10.1.0/24", impact: "PARTIAL", assetOwnerId: P["elif.demir"].id, distribution: "MANUAL", risks: "Anahtar yeniden başlatması sırasında kısa kesinti.", status: "PENDING", requestDate: day(-3), assetId: core?.id, description: "CVE-2024-20353 için önerilen sürüm." });
  await patch(4, { requesterId: P["selin.koc"].id, title: "Palo Alto PAN-OS güncellemesi", scope: "Çevre güvenlik duvarı", systemType: "FIRMWARE", systemKind: "NETWORK", ipRange: "10.10.1.254/32", impact: "FULL", assetOwnerId: P["selin.koc"].id, distribution: "MANUAL", risks: "HA geçişi sırasında kısa kesinti.", status: "APPROVED", requestDate: day(-9), approvalDate: day(-5), workStartDate: day(9), expectedEndDate: day(9, 14), assetId: A.fw.id, description: "10.2.9 → 10.2.10 güvenlik sürümü." });
  await patch(5, { requesterId: P["kemal.ozkan"].id, title: "İstemci bilgisayarlar Windows 11 23H2 kümülatif", scope: "Kurum masaüstü bilgisayarları", systemType: "OS", systemKind: "CLIENT", ipRange: "10.20.0.0/16", impact: "PARTIAL", assetOwnerId: P["kemal.ozkan"].id, distribution: "SCCM", risks: "Kullanıcı oturumu yeniden başlatılır.", status: "IN_PROGRESS", requestDate: day(-7), approvalDate: day(-5), workStartDate: day(-2), expectedEndDate: day(3), description: "SCCM ile dalga dalga dağıtım (%60 tamamlandı)." });
  await patch(6, { requesterId: P["deniz.arslan"].id, title: "PostgreSQL 16 küçük sürüm güncellemesi", scope: "Kurumsal veritabanı sunucusu", systemType: "APPLICATION", systemKind: "SERVER", ipRange: "10.10.20.11/32", impact: "PARTIAL", assetOwnerId: P["deniz.arslan"].id, distribution: "MANUAL", risks: "Servis yeniden başlatması (~5 dk).", status: "COMPLETED", requestDate: day(-30), approvalDate: day(-27), workStartDate: day(-24), expectedEndDate: day(-24), description: "16.3 → 16.4 uygulandı." });
  await patch(7, { requesterId: person("ayse.polat").id, title: "Java çalışma ortamı güncellemesi (geliştirici makineler)", scope: "Yazılım birimi iş istasyonları", systemType: "APPLICATION", systemKind: "CLIENT", ipRange: "10.20.51.0/24", impact: "PARTIAL", assetOwnerId: P["can.yildiz"].id, distribution: "CUSTOM", risks: "Eski sürüme bağımlı projeler etkilenebilir.", status: "REJECTED", requestDate: day(-12), description: "Reddedildi: sürüm geçişi EBYS 6.4.3 sonrasına ertelendi." });

  // ---- Zafiyetler ------------------------------------------------------------
  async function vuln(deviceName: string, deviceIp: string, owner: string, sev: string, status: string, data: any) {
    await prisma.vulnerability.create({
      data: { vulnNo: await nextNo("vulnerability", "vulnNo", "ZAF"), deviceName, deviceIp, ownerId: P[owner].id, departmentId: P[owner].departmentId, managerId: P["ahmet.yilmaz"].id, severity: sev, status, ...data },
    });
  }
  const scan = (ip: string, cve: string, plugin: string) => ({ externalId: `nessus:${ip}:${cve}`, cve, pluginId: plugin, source: "SCANNER", scannerVendor: "NESSUS" });
  await vuln("SRV-FILE-04", "10.10.20.31", "tolga.erdem", "CRITICAL", "OPEN", { detectedAt: day(-6), dueDate: day(4), assetId: A.fileSrv.id, description: "SMB üzerinde uzaktan kod yürütme (yama eksik).", ...scan("10.10.20.31", "CVE-2024-43447", "209044") });
  await vuln("SRV-DC-07", "10.10.20.5", "tolga.erdem", "HIGH", "OPEN", { detectedAt: day(-10), dueDate: day(10), assetId: A.dc.id, description: "Kerberos yetki yükseltme zafiyeti.", ...scan("10.10.20.5", "CVE-2024-38124", "207834") });
  await vuln("FW-EDGE-01", "10.10.1.254", "selin.koc", "HIGH", "OPEN", { detectedAt: day(-4), dueDate: day(9), assetId: A.fw.id, description: "GlobalProtect portalında kimlik doğrulama atlatma.", ...scan("10.10.1.254", "CVE-2024-3400", "193174") });
  await vuln("SRV-MON-06", "10.10.20.51", "elif.demir", "MEDIUM", "OPEN", { detectedAt: day(-15), dueDate: day(20), assetId: A.monSrv.id, description: "Zabbix web arayüzünde XSS.", ...scan("10.10.20.51", "CVE-2024-22116", "190021") });
  await vuln("SW-ACC-02", "10.10.1.12", "elif.demir", "MEDIUM", "OPEN", { detectedAt: day(-12), dueDate: day(25), assetId: A.swAcc.id, description: "Eski SNMPv2 topluluk adı varsayılan.", ...scan("10.10.1.12", "CVE-2017-6736", "103902") });
  await vuln("PC-YAZ-011", "10.20.51.11", "ayse.polat", "LOW", "OPEN", { detectedAt: day(-8), dueDate: day(40), assetId: A.PCYAZ011?.id ?? A["PC-YAZ-011"]?.id, description: "Eski Git istemcisi sürümü.", source: "MANUAL" });
  await vuln("SRV-BKP-05", "10.10.20.41", "tolga.erdem", "HIGH", "CLOSED", { detectedAt: day(-45), dueDate: day(-30), closeDays: 12, assetId: A.bkpSrv.id, description: "Veeam kimlik doğrulama atlatma; yama uygulandı.", ...scan("10.10.20.41", "CVE-2024-40711", "205123") });
  await vuln("PC-MALI-021", "10.20.21.21", "burak.sahin", "MEDIUM", "CLOSED", { detectedAt: day(-35), dueDate: day(-20), closeDays: 9, assetId: A["PC-MALI-021"]?.id, description: "Eski Office bileşeni; güncellendi.", source: "MANUAL" });
  await vuln("YZC-IK-01", "10.20.31.100", "fatma.gunes", "MEDIUM", "ACCEPTED", { detectedAt: day(-50), assetId: A.prn1.id, notFixedReason: "Üretici yama yayımlamadı; yazıcı ayrı VLAN'a alınarak risk kabul edildi.", description: "Yazıcı web arayüzünde zayıf şifreleme.", source: "MANUAL" });
  await vuln("AP-KAT2-03", "10.10.1.43", "elif.demir", "LOW", "ACCEPTED", { detectedAt: day(-40), assetId: A.ap.id, notFixedReason: "Bir sonraki bakım penceresine bırakıldı.", description: "Bilgi sızıntısı (banner).", ...scan("10.10.1.43", "CVE-2023-20198", "180011") });

  // ---- Firma / SLA kayıtları -------------------------------------------------
  const ciscoProd = V.netguc ? await prisma.vendorProduct.findFirst({ where: { vendorId: V.netguc.id } }) : null;
  const veeamProd = V.teknopark ? await prisma.vendorProduct.findFirst({ where: { vendorId: V.teknopark.id } }) : null;
  const pgProd = V.veri ? await prisma.vendorProduct.findFirst({ where: { vendorId: V.veri.id } }) : null;
  const now = Date.now();
  async function sla(no: number, title: string, vendor: any, product: any, level: number, sev: string, owner: string, hoursAgo: number, status: string, extra: any = {}) {
    const start = new Date(now - hoursAgo * 3_600_000);
    const resp = [2, 4, 8][level - 1];
    const solve = [4, 8, 24][level - 1];
    const ticketNo = await nextNo("slaTicket", "ticketNo", "SLA");
    M[`SLA${no}`] = ticketNo;
    await prisma.slaTicket.create({
      data: {
        ticketNo, title: fx(title), application: product?.name, ownerId: P[owner].id, requesterId: P[owner].id,
        requestingManagerId: P["ahmet.yilmaz"].id, departmentId: P[owner].departmentId, vendorId: vendor?.id, productId: product?.id,
        slaLevel: level, severity: sev, status, openedAt: start, slaStartedAt: start,
        slaResponseDueAt: new Date(start.getTime() + resp * 3_600_000), slaDueAt: new Date(start.getTime() + solve * 3_600_000),
        notifyNote: "Örnek kayıt. SMTP kapalı ortamda bildirim kuyruğa yazılır.", ...extra,
      },
    });
  }
  await sla(2, "Yedekleme kopyalama işi yavaş", V.teknopark, veeamProd, 3, "MEDIUM", "tolga.erdem", 20, "OPEN", { assetId: A.veeam.id, description: "Kopya işi 3 kat uzadı." });
  await sla(3, "PostgreSQL replikasyon gecikmesi", V.veri, pgProd, 2, "HIGH", "deniz.arslan", 30, "CLOSED", { closedAt: new Date(now - 24 * 3_600_000), description: "Destek ekibi parametre ayarı ile çözdü." });
  await sla(4, "Erişim anahtarı port hata sayacı yükseldi", V.netguc, ciscoProd, 3, "LOW", "elif.demir", 6, "OPEN", { assetId: A.swAcc.id, description: "SW-ACC-02 Gi1/0/12 CRC hataları." });

  // ---- Uygulama yapılandırma yedekleri --------------------------------------
  await prisma.appConfig.createMany({
    data: [
      { appName: "Veeam Backup & Replication", version: "12.1", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, managerId: P["ahmet.yilmaz"].id, backupDate: day(-3), description: "Yapılandırma veritabanı yedeği.", assetId: A.veeam.id },
      { appName: "Zabbix", version: "6.4", ownerId: P["elif.demir"].id, departmentId: D.VMO.id, managerId: P["ahmet.yilmaz"].id, backupDate: day(-14), description: "İzleme ayarları dışa aktarımı.", assetId: A.monSrv.id },
      { appName: "Palo Alto güvenlik duvarı kuralları", version: "10.2.9", ownerId: P["selin.koc"].id, departmentId: D.BIDB.id, managerId: P["ahmet.yilmaz"].id, backupDate: day(-12), description: "Kural temizliği sonrası yapılandırma yedeği.", assetId: A.fw.id },
    ],
  });

  // ---- Hareket (aktivite) kayıtları -----------------------------------------
  await prisma.activityLog.createMany({
    data: [
      { assetId: A.bkpSrv.id, action: "UPDATE", actor: "tolga.erdem", note: "1 alan güncellendi", changes: JSON.stringify([{ field: "disk", label: "Disk", from: "8 x 8 TB HDD (RAID 6)", to: "12 x 8 TB HDD (RAID 6)" }]), createdAt: day(-40) },
      { assetId: A.fileSrv.id, action: "UPDATE", actor: "tolga.erdem", note: "1 alan güncellendi", changes: JSON.stringify([{ field: "ram", label: "RAM", from: "64 GB", to: "128 GB" }]), createdAt: day(-30) },
      { assetId: A.fw.id, action: "UPDATE", actor: "selin.koc", note: "1 alan güncellendi", changes: JSON.stringify([{ field: "version", label: "Versiyon / Sürüm", from: "10.2.7", to: "10.2.9" }]), createdAt: day(-25) },
      { assetId: A.laptop1.id, action: "UPDATE", actor: "nihan.celik", note: "Zimmet devri: Zeynep Aydın → Esra Kılıç", changes: JSON.stringify([{ field: "ownerId", label: "Zimmetli personel", from: "Zeynep Aydın", to: "Esra Kılıç" }]), createdAt: day(-18) },
      { assetId: A["PC-IK-008"].id, action: "UPDATE", actor: "gokhan.aksoy", note: "1 alan güncellendi", changes: JSON.stringify([{ field: "operatingSystem", label: "İşletim sistemi", from: "Windows 10 Pro", to: "Windows 11 Pro" }]), createdAt: day(-16) },
      { assetId: A.swAcc.id, action: "UPDATE", actor: "elif.demir", note: "1 alan güncellendi", changes: JSON.stringify([{ field: "version", label: "Versiyon / Sürüm", from: "17.03.04", to: "17.06.05" }]), createdAt: day(-12) },
    ],
  });

  // ---- ITIL 2.0: hizmet kataloğu ---------------------------------------------
  const S: Record<string, any> = {};
  for (const [key, name] of [["mail", "Kurumsal e-posta"], ["vpn", "VPN uzaktan erişim"], ["evrak", "Evrak yönetim sistemi"], ["virt", "Sanallaştırma platformu"]]) {
    S[key] = await prisma.catalogService.findFirst({ where: { name } });
  }
  const srvDb = await prisma.asset.findFirst({ where: { name: "SRV-DB-01" } });
  async function catalog(key: string, d: any) {
    S[key] = await prisma.catalogService.create({
      data: {
        serviceNo: await nextNo("catalogService", "serviceNo", "HIZ"),
        requesterId: P["ahmet.yilmaz"].id, requestingDeptId: D.BIDB.id, requestingManagerId: P["kemal.ozkan"].id,
        status: "ACTIVE", audience: "USER", criticality: "MEDIUM", ...d,
      },
    });
  }
  await catalog("files", { name: "Dosya paylaşımı", summary: "Birim ve ortak klasörler; kişisel ağ sürücüsü.", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, hours: "7/24", accessConditions: "Kurum personeli; klasör sahibi onayı ve birim amiri talebi.", requestOffice: "SISTEM", requestType: "FILE_SHARE", availabilityTarget: "99.5", responseHours: 2, resolveHours: 8, criticality: "HIGH", assetId: A.fileSrv.id, description: "SRV-FILE-04 üzerinde. Kota birim başına 500 GB; gece yedeği 01:00." });
  await catalog("backup", { name: "Yedekleme ve geri yükleme", summary: "Sunucu ve veritabanı yedekleri; geri yükleme talepleri.", audience: "BOTH", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, hours: "7/24 (geri yükleme mesai içi)", accessConditions: "Sistem sahibi talebi; geri yüklemede birim amiri onayı.", requestOffice: "SISTEM", requestType: "BACKUP", availabilityTarget: "99.0", responseHours: 4, resolveHours: 24, assetId: A.bkpSrv.id, description: "Veeam B&R, günlük artımlı + haftalık tam yedek; saklama 30 gün." });
  await catalog("wifi", { name: "Kablosuz ağ (Wi-Fi)", summary: "Kurum ağına kablosuz bağlantı.", ownerId: P["elif.demir"].id, departmentId: D.VMO.id, hours: "7/24", accessConditions: "Kurum personeli; cihaz kaydı gerekir.", requestOffice: "NETWORK", requestType: "WIRELESS", availabilityTarget: "99.5", responseHours: 2, resolveHours: 8, assetId: A.ap.id, description: "Tüm katlarda 802.1X kimlik doğrulama." });
  await catalog("guest", { name: "Misafir internet erişimi", summary: "Ziyaretçiler için izole internet erişimi.", status: "PLANNED", ownerId: P["elif.demir"].id, departmentId: D.VMO.id, hours: "Mesai 08:00–18:00", accessConditions: "Kurum personeli sponsorluğunda, günlük geçici hesap.", requestOffice: "NETWORK", requestType: "VLAN", availabilityTarget: "99.0", responseHours: 4, resolveHours: 24, criticality: "LOW", description: "VLAN 140 tasarımda; güvenlik testi tamamlanmadı." });
  await catalog("dev", { name: "Yazılım geliştirme ortamı (GitLab / CI)", summary: "Kod deposu, CI/CD ve test ortamı.", audience: "INTERNAL", ownerId: P["can.yildiz"].id, departmentId: D.YAZ.id, hours: "Mesai 08:00–18:00", accessConditions: "Yazılım birimi çalışanları; depo erişimi talep ile.", requestOffice: "YAZILIM", requestType: "REPO_ACCESS", availabilityTarget: "99.0", responseHours: 4, resolveHours: 24, description: "GitLab, runner havuzu, test ortamları." });
  await catalog("db", { name: "Veritabanı hizmeti", summary: "PostgreSQL / Oracle barındırma ve yetki yönetimi.", audience: "INTERNAL", ownerId: P["deniz.arslan"].id, departmentId: D.VTB.id, hours: "7/24", accessConditions: "Uygulama sahibi talebi; üretim erişimi BG onaylı.", requestOffice: "VERITABANI", requestType: "DB_USER", availabilityTarget: "99.9", responseHours: 1, resolveHours: 4, criticality: "CRITICAL", assetId: srvDb?.id, description: "Yedek: RMAN / pgBackRest. Replikasyon ikinci salonda." });
  await catalog("print", { name: "Yazıcı ve baskı hizmeti", summary: "Ağ yazıcıları ve sarf malzeme.", ownerId: P["merve.uslu"].id, departmentId: D.SDM.id, hours: "Mesai 08:00–18:00", accessConditions: "Kurum personeli; kat yazıcısı otomatik tanımlanır.", requestOffice: "SERVIS", requestType: "SD_HARDWARE", availabilityTarget: "98.0", responseHours: 8, resolveHours: 24, criticality: "LOW", assetId: A.prn1.id, description: "Toner değişimi ve arıza servis masası üzerinden." });
  await catalog("av", { name: "Uç nokta güvenliği (antivirüs)", summary: "Bilgisayarlarda zararlı yazılım koruması.", audience: "BOTH", ownerId: P["selin.koc"].id, departmentId: D.BIDB.id, hours: "7/24", accessConditions: "Tüm kurum cihazlarında zorunlu; istisna BG onayı ile.", requestOffice: "SIBER", requestType: "ANTIVIRUS", availabilityTarget: "99.0", responseHours: 4, resolveHours: 24, criticality: "HIGH", description: "Defender for Endpoint; politika merkezi." });
  await catalog("ftp", { name: "Eski FTP aktarım hizmeti", summary: "Dış kurumlarla dosya aktarımı (kaldırıldı).", status: "RETIRED", audience: "INTERNAL", ownerId: person("tolga.erdem").id, departmentId: D.VMO.id, hours: "Mesai", accessConditions: "Kullanımdan kalktı; yerine SFTP.", requestOffice: "SISTEM", availabilityTarget: "95.0", responseHours: 8, resolveHours: 48, criticality: "LOW", description: "Şifresiz protokol nedeniyle kapatıldı; değerlendirme kaydı DGR." });

  // ---- ITIL 2.0: süreç kayıtları ---------------------------------------------
  const PREFIX = { DESIGN: "TAS", SLA: "HSV", AVAILABILITY: "KUL", CAPACITY: "KAP", CONTINUITY: "DR", VALIDATION: "TST", RELEASE: "REL", MONITORING: "EVT", EVALUATION: "DGR" };
  async function proc(process: string, title: string, status: string, owner: string, severity: string, details: any, extra: any = {}) {
    const who = P[owner];
    await prisma.itilProcessRecord.create({
      data: {
        recordNo: await nextNo("itilProcessRecord", "recordNo", PREFIX[process]),
        process, title: fx(title), status, severity,
        requesterId: who.id, requestingDeptId: who.departmentId, requestingManagerId: P["ahmet.yilmaz"].id,
        ownerId: who.id, departmentId: who.departmentId,
        details: JSON.stringify(fx(details)),
        ...fx(extra),
      },
    });
  }
  const svc = (k: string) => ({ serviceId: S[k]?.id });
  const ast = (k: string) => ({ assetId: A[k]?.id });

  // Hizmet tasarımı
  await proc("DESIGN", "Misafir internet erişimi tasarımı", "IN_PROGRESS", "elif.demir", "MEDIUM", { businessGoal: "Ziyaretçilere kurum ağından izole internet sağlamak.", securityStandard: "ISO 27001, KVKK; kurum ağına erişim yok", customerExpectation: "Danışmada 5 dakikada geçici hesap", architectureNote: "VLAN 140, ayrı SSID, güvenlik duvarında yalnızca internet çıkışı, 8 saat oturum.", targetGoLive: iso(40) }, { ...svc("guest"), startDate: day(-10), description: "CHG-2026-0007 reddedildi; güvenlik duvarı kural tasarımı tamamlanınca yeniden sunulacak." });
  await proc("DESIGN", "Dosya paylaşımı yetki modeli yeniden tasarımı", "OPEN", "tolga.erdem", "HIGH", { businessGoal: "Herkese yazma yetkili paylaşımları kaldırmak.", securityStandard: "En az yetki ilkesi; ISO 27001 A.9", customerExpectation: "Klasör sahibi kendi yetkilerini görebilsin", architectureNote: "AD güvenlik grupları (G_<birim>_RW / _RO); miras kesme yasak.", targetGoLive: iso(60) }, { ...svc("files"), ...ast("fileSrv"), startDate: day(-7), description: "PRB-2026-0002 ve OLY-2026-0002 sonrası başlatıldı." });

  // Hizmet seviyesi
  await proc("SLA", "Dosya paylaşımı SLA Eylül ölçümü", "DONE", "tolga.erdem", "LOW", { measurementPeriod: `${year}-09`, targetAvailability: "99.5", actualAvailability: "99.62", breachCount: "1", reportNote: "Planlı olmayan 1 yeniden başlatma; hedef tuttu." }, { ...svc("files"), startDate: day(-20), endDate: day(-12) });
  await proc("SLA", "VPN SLA Eylül ölçümü", "DONE", "elif.demir", "MEDIUM", { measurementPeriod: `${year}-09`, targetAvailability: "99.5", actualAvailability: "99.31", breachCount: "2", reportNote: "Hedef kaçtı: aralıklı kopmalar (OLY-2026-0004). Güvenlik duvarı yazılımı güncellemesi planlandı." }, { ...svc("vpn"), startDate: day(-20), endDate: day(-12) });
  await proc("SLA", "Veritabanı hizmeti SLA Ekim ölçümü", "IN_PROGRESS", "deniz.arslan", "HIGH", { measurementPeriod: `${year}-10`, targetAvailability: "99.9", actualAvailability: "99.94", breachCount: "0", reportNote: "Dönem sürüyor; disk doluluğu olayı hizmeti kesmedi." }, { ...svc("db"), startDate: day(-10) });

  // Kullanılabilirlik
  await proc("AVAILABILITY", "Yedekleme hizmeti kullanılabilirlik gözden geçirmesi", "OPEN", "tolga.erdem", "HIGH", { uptimeTarget: "99.0", measurementWindow: "7/24, geri yükleme mesai içi", mttrHours: "6", mtbfHours: "960", lastOutage: "3 gece art arda başarısız yedek; neden depo kapasitesi (OLY-2026-0007)." }, { ...svc("backup"), ...ast("bkpSrv"), startDate: day(-5) });
  await proc("AVAILABILITY", "Kurumsal e-posta uptime izleme", "DONE", "kemal.ozkan", "MEDIUM", { uptimeTarget: "99.9", measurementWindow: "7/24", mttrHours: "2", mtbfHours: "1440", lastOutage: "Son çeyrekte planlı 40 dk bakım." }, { ...svc("mail"), startDate: day(-45), endDate: day(-30) });

  // Kapasite
  await proc("CAPACITY", "Yedekleme deposu kapasite planı", "IN_PROGRESS", "tolga.erdem", "HIGH", { cpuHeadroom: "55", ramHeadroom: "48", storageHeadroom: "12", peakLoad: "18 TB / gece", forecast: "Mevcut artışla 3 ayda dolar; 4 x 8 TB disk eklenmesi önerilir (CHG-2026-0006)." }, { ...ast("bkpSrv"), ...svc("backup"), startDate: day(-6) });
  await proc("CAPACITY", "Dosya sunucusu depolama tahmini", "OPEN", "tolga.erdem", "MEDIUM", { cpuHeadroom: "62", ramHeadroom: "40", storageHeadroom: "31", peakLoad: "420 eşzamanlı oturum", forecast: "Yıllık %20 büyüme; 2027 ortasında genişleme gerekir." }, { ...ast("fileSrv"), ...svc("files"), startDate: day(-3) });

  // Süreklilik
  await proc("CONTINUITY", "Active Directory felaket kurtarma planı", "OPEN", "tolga.erdem", "CRITICAL", { disasterScenario: "CYBER", recoverySite: "İkinci salon (yalıtılmış yedek DC)", rtoHours: "4", rpoHours: "0", lastDrill: "Geçen yıl yetki geri yükleme tatbikatı yapılmadı; plan açık madde." }, { ...ast("dc"), startDate: day(-14) });
  await proc("CONTINUITY", "Fidye yazılımı müdahale ve geri dönüş planı", "IN_PROGRESS", "selin.koc", "CRITICAL", { disasterScenario: "CYBER", recoverySite: "Yalıtılmış yedek deposu (SRV-BKP-05)", rtoHours: "8", rpoHours: "24", lastDrill: "OLY-2026-0002 gerçek olayı geri dönüş sürecini sınadı; ayrı bir masa başı tatbikat planlanıyor." }, { ...ast("fileSrv"), startDate: day(-8) });
  await proc("CONTINUITY", "Elektrik kesintisi UPS tatbikatı", "DONE", "elif.demir", "MEDIUM", { disasterScenario: "POWER", recoverySite: "Jeneratör + UPS (veri merkezi)", rtoHours: "1", rpoHours: "0", lastDrill: "Geçen ay yük testi başarılı; UPS pili 2027'de değişecek." }, { startDate: day(-35), endDate: day(-34) });

  // Doğrulama / test
  await proc("VALIDATION", "EBYS 6.4.3 kullanıcı kabul testi", "IN_PROGRESS", "can.yildiz", "HIGH", { testType: "UAT", environment: "Ön-üretim", result: "CONDITIONAL", goLiveReady: "HOLD", defects: "2 düşük öncelikli ekran hatası; rapor sorgu süresi izleniyor." }, { ...svc("evrak"), startDate: day(-4), description: "CHG-2026-0005 ile bağlı." });
  await proc("VALIDATION", "Güvenlik duvarı kural temizliği güvenlik testi", "DONE", "selin.koc", "MEDIUM", { testType: "SECURITY", environment: "Üretim (bakım penceresi)", result: "PASS", goLiveReady: "YES", defects: "Yok" }, { ...ast("fw"), startDate: day(-13), endDate: day(-11), description: "CHG-2026-0004 sonrası doğrulama." });
  await proc("VALIDATION", "Misafir Wi-Fi güvenlik testi", "WAITING", "selin.koc", "HIGH", { testType: "SECURITY", environment: "Test VLAN", result: "FAIL", goLiveReady: "NO", defects: "VLAN 140'tan kurum ağına erişim açık; izolasyon kuralı eksik." }, { ...svc("guest"), startDate: day(-9), description: "CHG-2026-0007 reddine neden olan bulgu." });

  // Sürüm
  await proc("RELEASE", "EBYS 6.4.3 sürümü", "IN_PROGRESS", "can.yildiz", "HIGH", { version: "6.4.3", window: "Cumartesi 22:00–24:00", packageContents: "Rapor sorgu iyileştirmeleri, 14 hata düzeltmesi, şema güncellemesi.", rollbackPlan: "VM snapshot ve veritabanı yedeğinden geri dönüş; önceki imaj etiketi." }, { ...svc("evrak"), startDate: day(-1) });
  await proc("RELEASE", "Windows Server Kasım yama paketi 2026.11-R1", "PLANNED", "tolga.erdem", "MEDIUM", { version: "2026.11-R1", window: "Cumartesi 02:00–06:00", packageContents: "Windows Server kümülatif güncelleme, SMB zafiyet düzeltmesi (CVE-2024-43447).", rollbackPlan: "Sunucu snapshot; güncelleme kaldırma." }, { startDate: day(12), ...ast("fileSrv") });
  await proc("RELEASE", "Palo Alto PAN-OS 10.2.10", "READY", "selin.koc", "HIGH", { version: "PAN-OS 10.2.10", window: "Cumartesi 03:00–05:00", packageContents: "Güvenlik düzeltmesi (GlobalProtect), hata düzeltmeleri.", rollbackPlan: "Önceki yazılım imajına dönüş; HA eşi pasife alınır." }, { ...ast("fw"), startDate: day(9) });
  await proc("RELEASE", "Eylül yama paketi 2026.09-R1", "DEPLOYED", "kemal.ozkan", "MEDIUM", { version: "2026.09-R1", window: "Cumartesi 02:00–06:00", packageContents: "İstemci ve sunucu işletim sistemi güvenlik yamaları.", rollbackPlan: "Snapshot geri dönüşü." }, { startDate: day(-24), endDate: day(-23) });

  // İzleme
  await proc("MONITORING", "SRV-BKP-05 yedek deposu doluluğu %88", "OPEN", "tolga.erdem", "HIGH", { source: "Zabbix (SRV-MON-06)", eventType: "THRESHOLD", threshold: "Depo doluluk > %85", onCall: "Sistem nöbet", lastAlert: "Depo %88, bugün 03:10; son 7 günde +%4." }, { ...ast("bkpSrv"), startDate: day(-1) });
  await proc("MONITORING", "SRV-DB-01 disk alanı eşik uyarısı", "CLEARED", "deniz.arslan", "HIGH", { source: "Zabbix (SRV-MON-06)", eventType: "THRESHOLD", threshold: "Disk > %90", onCall: "Veritabanı nöbet", lastAlert: "%95 → temizlik sonrası %71 (OLY-2026-0005)." }, { assetId: srvDb?.id, startDate: day(-5), endDate: day(-4) });
  await proc("MONITORING", "FW-EDGE-01 VPN eşzamanlı oturum sayısı", "ACKNOWLEDGED", "selin.koc", "MEDIUM", { source: "Palo Alto / Zabbix", eventType: "THRESHOLD", threshold: "Oturum > 450", onCall: "Siber nöbet", lastAlert: "Gün içi 468 oturum, 12 dk (OLY-2026-0004 ile ilişkili)." }, { ...ast("fw"), startDate: day(-2) });
  await proc("MONITORING", "SW-ACC-02 port CRC hata sayacı", "OPEN", "elif.demir", "LOW", { source: "Zabbix (SNMP)", eventType: "WARNING", threshold: "CRC > 100 / saat", onCall: "Network nöbet", lastAlert: "Gi1/0/12 CRC 340/saat; SLA-2026-0004 açıldı." }, { ...ast("swAcc"), startDate: day(0) });

  // Değerlendirme
  await proc("EVALUATION", "Dosya paylaşımı hizmetinin iş değeri", "DONE", "tolga.erdem", "MEDIUM", { intendedValue: "Birimlerin ortak belge erişimi ve gece yedeği.", actualValue: "420 aktif kullanıcı; yedek başarı oranı %99.", stakeholder: "İnsan Kaynakları, Mali Hizmetler", recommendation: "CONTINUE" }, { ...svc("files"), startDate: day(-30), endDate: day(-20) });
  await proc("EVALUATION", "Eski FTP hizmeti kullanımdan kaldırma değerlendirmesi", "DONE", "tolga.erdem", "LOW", { intendedValue: "Dış kurumlarla dosya aktarımı.", actualValue: "Son 6 ayda 3 aktarım; şifresiz protokol riski.", stakeholder: "Bilgi Güvenliği", recommendation: "RETIRE" }, { ...svc("ftp"), startDate: day(-60), endDate: day(-50) });
  await proc("EVALUATION", "Yedekleme hizmeti iş değeri", "IN_PROGRESS", "tolga.erdem", "MEDIUM", { intendedValue: "Fidye yazılımı ve arıza sonrası veri kurtarma.", actualValue: "OLY-2026-0002'de fidye yazılımı sonrası başarılı geri dönüş; kapasite sınırda.", stakeholder: "Tüm birimler", recommendation: "IMPROVE" }, { ...svc("backup"), startDate: day(-8) });

  console.log("Ek örnek veri yüklendi: personel, envanter, talep, olay, problem, değişiklik, yama, zafiyet, SLA, yapılandırma, hareket, hizmet kataloğu ve ITIL süreç kayıtları.");
}

// Tek işlem: herhangi bir hata olursa hiçbir kayıt yazılmaz (yarım veri kalmaz).
prisma
  .$transaction((tx) => run(tx), { timeout: 180_000, maxWait: 30_000 })
  .catch((error) => {
    console.error("Ek örnek veri yüklenemedi:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
