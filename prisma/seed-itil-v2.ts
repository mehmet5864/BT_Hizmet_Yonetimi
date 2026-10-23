import { PrismaPg } from "@prisma/adapter-pg";

import { nextTicketNo } from "../src/lib/itil/constants";
import { PrismaClient } from "../src/generated/prisma/client";

type Db = PrismaClient;

export async function seedItilV2IfEmpty(prisma: Db) {
  const existing = await prisma.catalogService.count().catch(() => -1);
  if (existing < 0) {
    console.log("CatalogService tablosu yok; 2.0.0 migrasyonu uygulanmamış.");
    return;
  }
  if (existing > 0) {
    console.log("Hizmet kataloğu dolu; örnek 2.0 kayıtları atlandı.");
    return;
  }

  const ahmet = await prisma.person.findFirst({ where: { adUsername: "ahmet.yilmaz" } });
  const kemal = await prisma.person.findFirst({ where: { adUsername: "kemal.ozkan" } });
  const selin = await prisma.person.findFirst({ where: { adUsername: "selin.koc" } });
  const merve = await prisma.person.findFirst({ where: { adUsername: "merve.uslu" } });
  const elif = await prisma.person.findFirst({ where: { adUsername: "elif.demir" } });
  const bidb = await prisma.department.findFirst({ where: { code: "BIDB" } });
  const sdm = await prisma.department.findFirst({ where: { code: "SDM" } });
  const vmo = await prisma.department.findFirst({ where: { code: "VMO" } });
  if (!ahmet || !bidb) {
    console.log("Personel/birim yok; 2.0.0 örnek veri yüklenmedi.");
    return;
  }

  const owner = kemal ?? ahmet;
  const infosec = selin ?? ahmet;
  const desk = merve ?? ahmet;
  const net = elif ?? ahmet;

  const mail = await prisma.catalogService.create({
    data: {
      serviceNo: nextTicketNo("HIZ", null),
      name: "Kurumsal e-posta",
      summary: "Exchange / kurum posta kutusu, mobil ve web erişimi.",
      status: "ACTIVE",
      audience: "USER",
      requesterId: ahmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: desk.id,
      departmentId: sdm?.id ?? bidb.id,
      hours: "7/24",
      accessConditions: "Kurum personeli; Hizmet masasından AD_USER veya şifre sıfırlama talebi.",
      requestOffice: "SERVIS",
      requestType: "PASSWORD",
      availabilityTarget: "99.9",
      responseHours: 1,
      resolveHours: 8,
      criticality: "HIGH",
      description: "Kota 5 GB. VPN dışında OWA. Yedekleme gece 02:00.",
    },
  });
  const vpn = await prisma.catalogService.create({
    data: {
      serviceNo: nextTicketNo("HIZ", mail.serviceNo),
      name: "VPN uzaktan erişim",
      summary: "Kurum ağına şifreli uzaktan bağlantı.",
      status: "ACTIVE",
      audience: "USER",
      requesterId: ahmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: net.id,
      departmentId: vmo?.id ?? bidb.id,
      hours: "7/24",
      accessConditions: "Birim amiri onayı; kurum cihazı veya MDM kayıtlı istemci.",
      requestOffice: "NETWORK",
      availabilityTarget: "99.5",
      responseHours: 2,
      resolveHours: 12,
      criticality: "HIGH",
      description: "IPsec / SSL VPN. Eşzamanlı 500 oturum.",
    },
  });
  const evrak = await prisma.catalogService.create({
    data: {
      serviceNo: nextTicketNo("HIZ", vpn.serviceNo),
      name: "Evrak yönetim sistemi",
      summary: "Resmi yazışma, paraf ve arşiv.",
      status: "ACTIVE",
      audience: "BOTH",
      requesterId: ahmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: owner.id,
      departmentId: bidb.id,
      hours: "Mesai 08:00–18:00",
      accessConditions: "Kurum sicili; yazılım şubesinden yetki talebi.",
      requestOffice: "YAZILIM",
      availabilityTarget: "99.0",
      responseHours: 4,
      resolveHours: 24,
      criticality: "MEDIUM",
      description: "Üretim VM kümesi. Bağımlı: AD, veritabanı, nesne depolama.",
    },
  });
  await prisma.catalogService.create({
    data: {
      serviceNo: nextTicketNo("HIZ", evrak.serviceNo),
      name: "Sanallaştırma platformu",
      summary: "VMware kümesi; BT içi sunucu barındırma.",
      status: "ACTIVE",
      audience: "INTERNAL",
      requesterId: ahmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: owner.id,
      departmentId: vmo?.id ?? bidb.id,
      hours: "7/24",
      accessConditions: "Yalnızca sistem yöneticileri; sunucu talebi SISTEM ofisinden.",
      requestOffice: "SISTEM",
      availabilityTarget: "99.95",
      responseHours: 1,
      resolveHours: 4,
      criticality: "CRITICAL",
      description: "vCenter, 3 düğüm. DR ikinci salon.",
    },
  });

  const year = new Date().getFullYear();
  const processes: Array<Parameters<Db["itilProcessRecord"]["create"]>[0]["data"]> = [
    {
      recordNo: `TAS-${year}-0001`,
      process: "DESIGN",
      title: "VPN self-servis portal tasarımı",
      status: "IN_PROGRESS",
      requesterId: ahmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: net.id,
      serviceId: vpn.id,
      severity: "MEDIUM",
      details: JSON.stringify({
        businessGoal: "Uzaktan çalışanların VPN hesabını self-servis yenilemesi.",
        securityStandard: "ISO 27001, MFA zorunlu",
        customerExpectation: "Talep 1 iş gününde açılsın",
        architectureNote: "RADIUS + AD + mevcut SSL VPN",
      }),
      description: "Mevcut ağ ekibi onayı bekleniyor.",
    },
    {
      recordNo: `HSV-${year}-0001`,
      process: "SLA",
      title: "E-posta SLA Eylül ölçümü",
      status: "DONE",
      requesterId: desk.id,
      requestingDeptId: sdm?.id ?? bidb.id,
      requestingManagerId: desk.id,
      ownerId: desk.id,
      serviceId: mail.id,
      severity: "MEDIUM",
      details: JSON.stringify({
        measurementPeriod: `${year}-09`,
        targetAvailability: "99.9",
        actualAvailability: "99.97",
        breachCount: "0",
        reportNote: "Hedef tuttu.",
      }),
    },
    {
      recordNo: `KUL-${year}-0001`,
      process: "AVAILABILITY",
      title: "Evrak sistemi uptime planı",
      status: "OPEN",
      requesterId: owner.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: owner.id,
      serviceId: evrak.id,
      severity: "HIGH",
      details: JSON.stringify({
        uptimeTarget: "99.0",
        measurementWindow: "Mesai 08:00–18:00",
        mttrHours: "4",
        mtbfHours: "720",
        lastOutage: "Son çeyrekte planlı bakım 90 dk.",
      }),
    },
    {
      recordNo: `KAP-${year}-0001`,
      process: "CAPACITY",
      title: "Sanallaştırma 12 aylık kapasite",
      status: "IN_PROGRESS",
      requesterId: owner.id,
      requestingDeptId: vmo?.id ?? bidb.id,
      requestingManagerId: owner.id,
      ownerId: owner.id,
      severity: "HIGH",
      details: JSON.stringify({
        cpuHeadroom: "28",
        ramHeadroom: "22",
        storageHeadroom: "35",
        peakLoad: "410 eşzamanlı VM",
        forecast: "Yıl içinde %15 VM artışı; 2 düğüm ek kapasite önerilir.",
      }),
    },
    {
      recordNo: `DR-${year}-0001`,
      process: "CONTINUITY",
      title: "Veri merkezi deprem DR planı",
      status: "OPEN",
      requesterId: ahmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: owner.id,
      severity: "CRITICAL",
      details: JSON.stringify({
        disasterScenario: "EARTHQUAKE",
        recoverySite: "İkinci kampüs / soğuk salon",
        rtoHours: "8",
        rpoHours: "1",
        lastDrill: `${year - 1} Kasım masa başı tatbikat; DNS kesimi açık madde.`,
      }),
    },
    {
      recordNo: `TST-${year}-0001`,
      process: "VALIDATION",
      title: "E-posta MFA canlı öncesi UAT",
      status: "DONE",
      requesterId: infosec.id,
      requestingDeptId: bidb.id,
      requestingManagerId: infosec.id,
      ownerId: infosec.id,
      serviceId: mail.id,
      severity: "HIGH",
      details: JSON.stringify({
        testType: "UAT",
        environment: "Ön-üretim",
        result: "PASS",
        goLiveReady: "YES",
        defects: "Yok",
      }),
    },
    {
      recordNo: `REL-${year}-0001`,
      process: "RELEASE",
      title: "Ekim yama paketi 2026.10-R1",
      status: "PLANNED",
      requesterId: owner.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: owner.id,
      severity: "MEDIUM",
      details: JSON.stringify({
        version: "2026.10-R1",
        window: "Cumartesi 02:00–06:00",
        packageContents: "OS güvenlik yamaları, vCenter yaması, Evrak 1 küçük düzeltme",
        rollbackPlan: "Snapshot geri dönüş; DNS eski VIP.",
      }),
    },
    {
      recordNo: `EVT-${year}-0001`,
      process: "MONITORING",
      title: "vCenter CPU eşik uyarısı",
      status: "ACKNOWLEDGED",
      requesterId: owner.id,
      requestingDeptId: vmo?.id ?? bidb.id,
      requestingManagerId: owner.id,
      ownerId: owner.id,
      severity: "HIGH",
      details: JSON.stringify({
        source: "vCenter / Zabbix",
        eventType: "THRESHOLD",
        threshold: "CPU > %85 / 10 dk",
        onCall: "Sistem nöbet",
        lastAlert: "Küme-1 host-02 %91, 14 dk.",
      }),
    },
    {
      recordNo: `DGR-${year}-0001`,
      process: "EVALUATION",
      title: "VPN hizmetinin iş değeri",
      status: "IN_PROGRESS",
      requesterId: ahmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: owner.id,
      ownerId: net.id,
      serviceId: vpn.id,
      severity: "MEDIUM",
      details: JSON.stringify({
        intendedValue: "Uzaktan kesintisiz erişim, seyahat günlerinde iş sürekliliği.",
        actualValue: "Aylık 180 tekil kullanıcı; memnuniyet henüz ölçülmedi.",
        stakeholder: "Strateji Geliştirme",
        recommendation: "IMPROVE",
      }),
    },
  ];

  for (const data of processes) {
    await prisma.itilProcessRecord.create({ data });
  }
  console.log(`ITIL 2.0 örnek veri: 4 katalog hizmeti, ${processes.length} süreç kaydı.`);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    await seedItilV2IfEmpty(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const isDirect = process.argv[1]?.includes("seed-itil-v2");
if (isDirect) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
