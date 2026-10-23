import { PrismaPg } from "@prisma/adapter-pg";

import { DEMO_PASSWORD, hashPassword } from "../src/lib/auth/password";
import { PrismaClient } from "../src/generated/prisma/client";
import { fixDemoApplications, fixDemoMobiles } from "./demo-apps";
import { fillDemoSerials } from "./demo-serials";
import { seedItilV2IfEmpty } from "./seed-itil-v2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.inventoryApproval.deleteMany();
  await prisma.assetRelation.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.slaTicket.deleteMany();
  try {
    await prisma.itilProcessRecord.deleteMany();
    await prisma.catalogService.deleteMany();
  } catch {
    /* 1.3.0 şemasında tablolar yok */
  }
  await prisma.vulnerability.deleteMany();
  await prisma.appConfig.deleteMany();
  await prisma.patchRecord.deleteMany();
  await prisma.changeRecord.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.person.deleteMany();
  await prisma.department.deleteMany();
  await prisma.vendor.deleteMany();

  const departments = await Promise.all(
    [
      { name: "Bilgi İşlem Daire Başkanlığı", code: "BIDB" },
      { name: "İnsan Kaynakları Müdürlüğü", code: "IKM" },
      { name: "Mali Hizmetler Müdürlüğü", code: "MHM" },
      { name: "Strateji Geliştirme Birimi", code: "SGB" },
      { name: "Veri Merkezi Operasyon", code: "VMO" },
      { name: "Yazılım Daire Başkanlığı", code: "YAZ" },
      { name: "Veritabanı Şube Müdürlüğü", code: "VTB" },
      { name: "Servis Masası / Yardım Masası", code: "SDM" },
      { name: "Envanter Şube Müdürlüğü", code: "ENV" },
    ].map((data) => prisma.department.create({ data })),
  );

  const [bidb, ik, mali, strateji, veriMerkezi, yazilim, veritabani, servisMasasi, envanterSube] = departments;

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const people = await Promise.all(
    [
      { fullName: "Ahmet Yılmaz", sicilNo: "S-1001", tcNo: "10000000001", title: "Süper yönetici", duty: "Sunucu işletimi", workplace: "Veri Merkezi", email: "ahmet.yilmaz@kurum.gov.tr", phone: "0312 555 11 01", departmentId: bidb.id, role: "SUPER_ADMIN", roleSource: "BOTH", adUsername: "ahmet.yilmaz", adGroups: JSON.stringify(["GG_SuperYoneticiler", "GG_SistemYoneticileri"]), requestOffice: "SISTEM", passwordHash },
      { fullName: "Elif Demir", sicilNo: "S-1002", tcNo: "10000000002", title: "Ağ Uzmanı", duty: "Ağ işletimi", workplace: "Veri Merkezi", email: "elif.demir@kurum.gov.tr", phone: "0312 555 11 02", departmentId: veriMerkezi.id, role: "UNIT_MANAGER", roleSource: "MANUAL", adUsername: "elif.demir", requestOffice: "NETWORK", passwordHash },
      { fullName: "Mehmet Kara", sicilNo: "S-1003", tcNo: "10000000003", title: "Uygulama Geliştirici", duty: "Uygulama geliştirme", workplace: "BIDB", email: "mehmet.kara@kurum.gov.tr", phone: "0312 555 11 03", departmentId: bidb.id, role: "USER", roleSource: "MANUAL", adUsername: "mehmet.kara", passwordHash },
      { fullName: "Kemal Özkan", sicilNo: "S-1010", tcNo: "10000000010", title: "Sistem Yöneticisi", duty: "Sistem işletimi ve talep karşılama", workplace: "Veri Merkezi", email: "kemal.ozkan@kurum.gov.tr", phone: "0312 555 11 10", departmentId: veriMerkezi.id, role: "SYSTEM_ADMIN", roleSource: "MANUAL", adUsername: "kemal.ozkan", requestOffice: "SISTEM", passwordHash },
      { fullName: "Zeynep Aydın", sicilNo: "S-1004", tcNo: "10000000004", title: "İK Uzmanı", duty: "Özlük işleri", workplace: "İK", email: "zeynep.aydin@kurum.gov.tr", phone: "0312 555 11 04", departmentId: ik.id, role: "UNIT_MANAGER", roleSource: "MANUAL", adUsername: "zeynep.aydin", passwordHash },
      { fullName: "Burak Şahin", sicilNo: "S-1005", tcNo: "10000000005", title: "Mali Hizmetler Uzmanı", duty: "Muhasebe", workplace: "Mali Hizmetler", email: "burak.sahin@kurum.gov.tr", phone: "0312 555 11 05", departmentId: mali.id, role: "USER", roleSource: "MANUAL", adUsername: "burak.sahin", passwordHash },
      { fullName: "Selin Koç", sicilNo: "S-1006", tcNo: "10000000006", title: "Bilgi Güvenliği Uzmanı", duty: "BG yönetimi", workplace: "BIDB", email: "selin.koc@kurum.gov.tr", phone: "0312 555 11 06", departmentId: bidb.id, role: "INFOSEC_MANAGER", roleSource: "AD", adUsername: "selin.koc", adGroups: JSON.stringify(["GG_BilgiGuvenligi"]), requestOffice: "SIBER", passwordHash },
      { fullName: "Can Yıldız", sicilNo: "S-1007", tcNo: "10000000007", title: "Yazılım Şube Müdürü", duty: "Uygulama geliştirme yönetimi", workplace: "Yazılım DB", email: "can.yildiz@kurum.gov.tr", phone: "0312 555 11 07", departmentId: yazilim.id, role: "UNIT_MANAGER", roleSource: "MANUAL", adUsername: "can.yildiz", requestOffice: "YAZILIM", passwordHash },
      { fullName: "Deniz Arslan", sicilNo: "S-1008", tcNo: "10000000008", title: "Veritabanı Yöneticisi", duty: "Oracle / SQL Server / PostgreSQL işletimi", workplace: "Veritabanı Şb.", email: "deniz.arslan@kurum.gov.tr", phone: "0312 555 11 08", departmentId: veritabani.id, role: "UNIT_MANAGER", roleSource: "MANUAL", adUsername: "deniz.arslan", requestOffice: "VERITABANI", passwordHash },
      { fullName: "Merve Uslu", sicilNo: "S-1009", tcNo: "10000000009", title: "Servis Masası Uzmanı", duty: "Hizmet talebi ve olay karşılama", workplace: "Servis Masası", email: "merve.uslu@kurum.gov.tr", phone: "0312 555 11 09", departmentId: servisMasasi.id, role: "UNIT_MANAGER", roleSource: "MANUAL", adUsername: "merve.uslu", requestOffice: "SERVIS", passwordHash },
      { fullName: "Nihan Çelik", sicilNo: "S-1011", tcNo: "10000000011", title: "Envanter Şube Müdürü", duty: "Kurum envanter kaydı ve CI yönetimi", workplace: "Envanter Şb.", email: "nihan.celik@kurum.gov.tr", phone: "0312 555 11 11", departmentId: envanterSube.id, role: "UNIT_MANAGER", roleSource: "BOTH", adUsername: "nihan.celik", adGroups: JSON.stringify(["GG_Envanter"]), requestOffice: null, passwordHash },
    ].map((data) => prisma.person.create({ data })),
  );

  const [ahmet, elif, mehmet, kemal, zeynep, burak, selin, can, deniz, merve, nihan] = people;

  const vendors = await Promise.all(
    [
      { name: "Anadolu Bilişim A.Ş.", contactPerson: "Kemal Tan", phone: "0312 555 10 10" },
      { name: "Teknopark Sistem Ltd.", contactPerson: "Derya Ak", phone: "0216 555 20 20" },
      { name: "NetGüç Teknoloji", contactPerson: "Hakan Er", phone: "0232 555 30 30" },
      { name: "Veri Destek Hizmetleri", contactPerson: "Aslı Gün", phone: "0312 555 40 40" },
    ].map((data) => prisma.vendor.create({ data })),
  );

  const [anadolu, teknopark, netguc, veriDestek] = vendors;

  await prisma.department.update({
    where: { id: bidb.id },
    data: { managerId: ahmet.id, parentManagerId: selin.id },
  });
  await prisma.department.update({
    where: { id: veriMerkezi.id },
    data: { parentId: bidb.id, managerId: elif.id, parentManagerId: ahmet.id },
  });
  await prisma.department.update({
    where: { id: yazilim.id },
    data: { parentId: bidb.id, managerId: can.id, parentManagerId: ahmet.id },
  });
  await prisma.department.update({
    where: { id: veritabani.id },
    data: { parentId: bidb.id, managerId: deniz.id, parentManagerId: ahmet.id },
  });
  await prisma.department.update({
    where: { id: servisMasasi.id },
    data: { parentId: bidb.id, managerId: merve.id, parentManagerId: ahmet.id },
  });
  await prisma.department.update({
    where: { id: envanterSube.id },
    data: { parentId: bidb.id, managerId: nihan.id, parentManagerId: ahmet.id },
  });
  await prisma.person.update({
    where: { id: nihan.id },
    data: { unitManagerId: ahmet.id, parentDepartmentId: bidb.id, parentManagerId: ahmet.id },
  });
  await prisma.person.update({
    where: { id: can.id },
    data: { unitManagerId: ahmet.id, parentDepartmentId: bidb.id, parentManagerId: ahmet.id },
  });
  await prisma.person.update({
    where: { id: deniz.id },
    data: { unitManagerId: ahmet.id, parentDepartmentId: bidb.id, parentManagerId: ahmet.id },
  });
  await prisma.person.update({
    where: { id: merve.id },
    data: { unitManagerId: ahmet.id, parentDepartmentId: bidb.id, parentManagerId: ahmet.id },
  });
  await prisma.person.update({
    where: { id: mehmet.id },
    data: { unitManagerId: kemal.id, parentManagerId: ahmet.id, parentDepartmentId: bidb.id },
  });
  await prisma.person.update({
    where: { id: elif.id },
    data: { unitManagerId: ahmet.id, parentDepartmentId: bidb.id, parentManagerId: ahmet.id },
  });
  async function fillVendor(
    vendorId: string,
    data: {
      supportEmail: string;
      description: string;
      contacts: { name: string; email: string; phone: string; kind: string }[];
      products: { name: string; licenseType: string; quantity: number; version?: string }[];
    },
  ) {
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        supportEmail: data.supportEmail,
        specKind: "TEKNIK",
        description: data.description,
        contact1Email: data.contacts[0]?.email,
        contact1Phone: data.contacts[0]?.phone,
        contact2Email: data.contacts[1]?.email,
        contact2Phone: data.contacts[1]?.phone,
        contacts: {
          create: data.contacts.map((row, index) => ({ ...row, sortOrder: index })),
        },
        products: { create: data.products },
        slaLevels: {
          create: [
            { level: 1, name: "Seviye 1 — Kritik", responseHours: 2, resolveHours: 4, description: "Hizmet durmuş." },
            { level: 2, name: "Seviye 2 — Yüksek", responseHours: 4, resolveHours: 8, description: "Kritik işlev etkilenmiş." },
            { level: 3, name: "Seviye 3 — Normal", responseHours: 8, resolveHours: 24, description: "Planlı mesai." },
          ],
        },
      },
    });
  }

  await fillVendor(anadolu.id, {
    supportEmail: "destek@anadolu.example",
    description: "Sunucu ve uç nokta bakım sözleşmesi.",
    contacts: [
      { name: "Kemal Tan", email: "kemal.tan@anadolu.example", phone: "0312 555 10 11", kind: "SORUMLU" },
      { name: "Destek masası", email: "destek@anadolu.example", phone: "0312 555 10 12", kind: "DESTEK" },
    ],
    products: [
      { name: "HPE ProLiant bakım", licenseType: "SUPPORT", quantity: 4, version: "Gen10" },
      { name: "VMware vSphere", licenseType: "SUBSCRIPTION", quantity: 12, version: "8.0" },
    ],
  });
  await fillVendor(teknopark.id, {
    supportEmail: "destek@teknopark.example",
    description: "Uygulama ve yedekleme sözleşmesi.",
    contacts: [{ name: "Derya Ak", email: "derya.ak@teknopark.example", phone: "0216 555 20 21", kind: "SORUMLU" }],
    products: [{ name: "Veeam Backup", licenseType: "SUBSCRIPTION", quantity: 2, version: "12" }],
  });
  await fillVendor(netguc.id, {
    supportEmail: "noc@netguc.example",
    description: "Ağ omurgası ve güvenlik duvarı.",
    contacts: [
      { name: "Hakan Er", email: "hakan.er@netguc.example", phone: "0232 555 30 31", kind: "SORUMLU" },
      { name: "NOC", email: "noc@netguc.example", phone: "0232 555 30 00", kind: "DESTEK" },
    ],
    products: [{ name: "Cisco Catalyst 9500", licenseType: "SUPPORT", quantity: 2, version: "IOS XE" }],
  });
  await fillVendor(veriDestek.id, {
    supportEmail: "destek@veridestek.example",
    description: "Veritabanı destek sözleşmesi.",
    contacts: [{ name: "Aslı Gün", email: "asli.gun@veridestek.example", phone: "0312 555 40 41", kind: "SORUMLU" }],
    products: [{ name: "PostgreSQL kurumsal destek", licenseType: "SUPPORT", quantity: 1, version: "16" }],
  });

  const netgucSwitch = await prisma.vendorProduct.findFirst({
    where: { vendorId: netguc.id, name: "Cisco Catalyst 9500" },
  });

  const dbServer = await prisma.asset.create({
    data: {
      assetType: "SERVER",
      formFactor: "PHYSICAL",
      stockNo: "BIM-SRV-0001",
      name: "SRV-DB-01",
      servedApplication: "Kurumsal Veritabanı (PostgreSQL)",
      brand: "HPE",
      model: "ProLiant DL380 Gen10",
      ipAddress: "10.10.20.11",
      macAddress: "3C:A8:2A:11:4F:01",
      operatingSystem: "Red Hat Enterprise Linux",
      version: "9.4",
      cpu: "2 x Intel Xeon Gold 6338",
      ram: "256 GB",
      disk: "4 x 1.92 TB SSD (RAID 10)",
      ownerId: ahmet.id,
      departmentId: veriMerkezi.id,
      criticality: "HIGH",
      status: "ACTIVE",
      locRoom: 1,
      locCorridor: 3,
      locCabinet: 4,
      locShelf: 10,
      supportStatus: "UNDER_CONTRACT",
      contractorVendorId: anadolu.id,
      supportVendorId: veriDestek.id,
      supportStartDate: daysFromNow(-500),
      supportEndDate: daysFromNow(35),
      transactionDate: daysFromNow(-500),
      description: "Kurumsal uygulamaların merkezi veritabanı sunucusu. Yedekleme her gece 02:00'de alınır.",
    },
  });

  const appServer = await prisma.asset.create({
    data: {
      assetType: "SERVER",
      formFactor: "VIRTUAL",
      stockNo: "BIM-SRV-0002",
      name: "SRV-APP-02",
      servedApplication: "Elektronik Belge Yönetim Sistemi",
      brand: "VMware",
      model: "vSphere VM",
      ipAddress: "10.10.20.21",
      macAddress: "00:50:56:9A:2B:7C",
      operatingSystem: "Ubuntu Server",
      version: "24.04 LTS",
      cpu: "8 vCPU",
      ram: "32 GB",
      disk: "500 GB Thin",
      ownerId: mehmet.id,
      departmentId: bidb.id,
      criticality: "HIGH",
      status: "ACTIVE",
      locRoom: 1,
      locCorridor: 3,
      locCabinet: 5,
      locShelf: 2,
      supportStatus: "UNDER_CONTRACT",
      contractorVendorId: teknopark.id,
      supportVendorId: teknopark.id,
      supportStartDate: daysFromNow(-200),
      supportEndDate: daysFromNow(165),
      transactionDate: daysFromNow(-200),
      description: "EBYS uygulama sunucusu. Yama pencereleri ayın ilk cumartesi günü.",
    },
  });

  const webServer = await prisma.asset.create({
    data: {
      assetType: "SERVER",
      formFactor: "VIRTUAL",
      stockNo: "BIM-SRV-0003",
      name: "SRV-WEB-03",
      servedApplication: "Kurumsal İnternet Sitesi",
      brand: "VMware",
      model: "vSphere VM",
      ipAddress: "10.10.20.31",
      macAddress: "00:50:56:9A:2B:8D",
      operatingSystem: "Windows Server",
      version: "2022 Standard",
      cpu: "4 vCPU",
      ram: "16 GB",
      disk: "250 GB Thin",
      ownerId: selin.id,
      departmentId: bidb.id,
      criticality: "MEDIUM",
      status: "ACTIVE",
      locRoom: 1,
      locCorridor: 3,
      locCabinet: 5,
      locShelf: 3,
      supportStatus: "IN_WARRANTY",
      contractorVendorId: teknopark.id,
      supportStartDate: daysFromNow(-90),
      supportEndDate: daysFromNow(275),
      transactionDate: daysFromNow(-90),
    },
  });

  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        assetType: "COMPUTER",
        formFactor: "PHYSICAL",
        stockNo: "BIM-PC-0101",
        name: "PC-BIDB-014",
        brand: "Dell",
        model: "OptiPlex 7010",
        ipAddress: "10.20.14.14",
        macAddress: "A4:BB:6D:1F:90:2C",
        operatingSystem: "Windows 11 Pro",
        version: "23H2",
        cpu: "Intel Core i5-12400",
        ram: "16 GB",
        disk: "512 GB NVMe SSD",
        ownerId: mehmet.id,
        departmentId: bidb.id,
        criticality: "MEDIUM",
        status: "ACTIVE",
        locRoom: 2,
        locCorridor: 1,
        locCabinet: 1,
        locShelf: 4,
        supportStatus: "IN_WARRANTY",
        contractorVendorId: anadolu.id,
        supportVendorId: anadolu.id,
        supportStartDate: daysFromNow(-400),
        supportEndDate: daysFromNow(330),
        transactionDate: daysFromNow(-400),
        description: "Geliştirici iş istasyonu.",
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "COMPUTER",
        formFactor: "PHYSICAL",
        stockNo: "BIM-PC-0102",
        name: "PC-IK-007",
        brand: "Lenovo",
        model: "ThinkCentre M70q",
        ipAddress: "10.20.15.7",
        macAddress: "54:BF:64:2A:11:03",
        operatingSystem: "Windows 10 Pro",
        version: "22H2",
        cpu: "Intel Core i5-10400T",
        ram: "8 GB",
        disk: "256 GB SSD",
        ownerId: zeynep.id,
        departmentId: ik.id,
        criticality: "LOW",
        status: "ACTIVE",
        locRoom: 4,
        locCorridor: 2,
        locCabinet: 1,
        locShelf: 1,
        supportStatus: "EXPIRED",
        contractorVendorId: anadolu.id,
        supportStartDate: daysFromNow(-1200),
        supportEndDate: daysFromNow(-45),
        transactionDate: daysFromNow(-1200),
        description: "İşletim sistemi desteği sona eriyor, yükseltme planlanmalı.",
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "COMPUTER",
        formFactor: "VIRTUAL",
        stockNo: "BIM-VDI-0203",
        name: "VDI-MALI-03",
        brand: "VMware",
        model: "Horizon Desktop",
        ipAddress: "10.30.5.23",
        macAddress: "00:50:56:B1:44:0A",
        operatingSystem: "Windows 11 Enterprise",
        version: "23H2",
        cpu: "4 vCPU",
        ram: "8 GB",
        disk: "120 GB",
        ownerId: burak.id,
        departmentId: mali.id,
        criticality: "MEDIUM",
        status: "ACTIVE",
        supportStatus: "UNDER_CONTRACT",
        supportVendorId: teknopark.id,
        supportStartDate: daysFromNow(-150),
        supportEndDate: daysFromNow(215),
        transactionDate: daysFromNow(-150),
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "PRINTER",
        stockNo: "BIM-PRN-0301",
        name: "YZC-BIDB-01",
        brand: "HP",
        model: "LaserJet Enterprise M507dn",
        version: "Firmware 2407A",
        ipAddress: "10.20.14.200",
        macAddress: "B0:5A:DA:77:12:9F",
        ownerId: ahmet.id,
        departmentId: bidb.id,
        criticality: "LOW",
        status: "ACTIVE",
        locRoom: 2,
        locCorridor: 1,
        locCabinet: 2,
        locShelf: 1,
        supportStatus: "UNDER_CONTRACT",
        contractorVendorId: anadolu.id,
        supportVendorId: veriDestek.id,
        supportStartDate: daysFromNow(-300),
        supportEndDate: daysFromNow(50),
        transactionDate: daysFromNow(-300),
        description: "Kat koridoru ortak yazıcısı.",
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "TABLET",
        stockNo: "BIM-TBL-0401",
        name: "TBL-SGB-02",
        brand: "Samsung",
        model: "Galaxy Tab S9",
        ipAddress: "10.40.2.12",
        macAddress: "DC:44:27:8E:60:21",
        operatingSystem: "Android",
        version: "14",
        cpu: "Snapdragon 8 Gen 2",
        ram: "8 GB",
        disk: "128 GB",
        ownerId: selin.id,
        departmentId: strateji.id,
        criticality: "LOW",
        status: "ACTIVE",
        locRoom: 5,
        locCorridor: 1,
        locCabinet: 3,
        locShelf: 2,
        supportStatus: "IN_WARRANTY",
        contractorVendorId: teknopark.id,
        supportStartDate: daysFromNow(-120),
        supportEndDate: daysFromNow(610),
        transactionDate: daysFromNow(-120),
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "IP_PHONE",
        stockNo: "BIM-TEL-0501",
        name: "Dahili 1204",
        brand: "Yealink",
        model: "SIP-T46U",
        ipAddress: "10.50.1.204",
        macAddress: "80:5E:C0:33:19:4B",
        ownerId: zeynep.id,
        departmentId: ik.id,
        criticality: "LOW",
        status: "ACTIVE",
        locRoom: 4,
        locCorridor: 2,
        locCabinet: 1,
        locShelf: 2,
        supportStatus: "UNDER_CONTRACT",
        contractorVendorId: netguc.id,
        supportVendorId: netguc.id,
        supportStartDate: daysFromNow(-250),
        supportEndDate: daysFromNow(115),
        transactionDate: daysFromNow(-250),
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "NETWORK_DEVICE",
        formFactor: "PHYSICAL",
        stockNo: "BIM-NET-0601",
        name: "SW-CORE-01",
        deviceId: "FDO2345R09K",
        brand: "Cisco",
        model: "Catalyst 9300-48P",
        ipAddress: "10.10.1.1",
        macAddress: "F8:0B:CB:55:AA:10",
        operatingSystem: "Cisco IOS XE",
        version: "17.09.04a",
        cpu: "ARM Cortex",
        ram: "8 GB",
        disk: "16 GB Flash",
        ownerId: elif.id,
        departmentId: veriMerkezi.id,
        criticality: "HIGH",
        status: "ACTIVE",
        locRoom: 1,
        locCorridor: 3,
        locCabinet: 1,
        locShelf: 1,
        supportStatus: "UNDER_CONTRACT",
        contractorVendorId: netguc.id,
        supportVendorId: netguc.id,
        supportStartDate: daysFromNow(-700),
        supportEndDate: daysFromNow(-10),
        transactionDate: daysFromNow(-700),
        description: "Omurga anahtar. Sözleşme yenileme süreci başlatılmalı.",
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "NETWORK_DEVICE",
        formFactor: "PHYSICAL",
        stockNo: "BIM-NET-0602",
        name: "RTR-WAN-01",
        deviceId: "FTX1948L0PQ",
        brand: "Cisco",
        model: "ISR 4331",
        ipAddress: "10.10.1.254",
        macAddress: "F8:0B:CB:55:AA:FE",
        operatingSystem: "Cisco IOS XE",
        version: "16.12.05",
        cpu: "Multicore",
        ram: "4 GB",
        disk: "8 GB Flash",
        ownerId: elif.id,
        departmentId: veriMerkezi.id,
        criticality: "HIGH",
        status: "ACTIVE",
        locRoom: 1,
        locCorridor: 3,
        locCabinet: 1,
        locShelf: 2,
        supportStatus: "UNDER_CONTRACT",
        contractorVendorId: netguc.id,
        supportVendorId: netguc.id,
        supportStartDate: daysFromNow(-400),
        supportEndDate: daysFromNow(330),
        transactionDate: daysFromNow(-400),
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "PERIPHERAL",
        stockNo: "BIM-CVR-0701",
        name: "Barkod Okuyucu - Arşiv",
        deviceId: "ZBR-88142",
        brand: "Zebra",
        model: "DS2208",
        ownerId: burak.id,
        departmentId: mali.id,
        criticality: "LOW",
        status: "ACTIVE",
        locRoom: 3,
        locCorridor: 2,
        locCabinet: 2,
        locShelf: 5,
        supportStatus: "NONE",
        transactionDate: daysFromNow(-60),
      },
    }),
    prisma.asset.create({
      data: {
        assetType: "FIXTURE",
        stockNo: "BIM-DMB-0801",
        name: "Sunucu Kabini 42U",
        deviceId: "KAB-42U-04",
        brand: "Rittal",
        model: "TS IT 42U",
        ownerId: ahmet.id,
        departmentId: veriMerkezi.id,
        criticality: "MEDIUM",
        status: "ACTIVE",
        locRoom: 1,
        locCorridor: 3,
        locCabinet: 4,
        locShelf: 0,
        supportStatus: "NONE",
        transactionDate: daysFromNow(-900),
        description: "Veri merkezi 4. kabin.",
      },
    }),
  ]);

  const ebys = await prisma.asset.create({
    data: {
      assetType: "SOFTWARE",
      formFactor: "VIRTUAL",
      stockNo: "BIM-YZL-0901",
      name: "Elektronik Belge Yönetim Sistemi",
      version: "6.4.2",
      ownerId: mehmet.id,
      departmentId: bidb.id,
      criticality: "HIGH",
      status: "ACTIVE",
      contractorVendorId: teknopark.id,
      supportVendorId: teknopark.id,
      supportStartDate: daysFromNow(-365),
      supportEndDate: daysFromNow(20),
      transactionDate: daysFromNow(-365),
      description: "Kurum genelinde kullanılan evrak yönetim uygulaması. Lisans yenilemesi yaklaşıyor.",
    },
  });

  const antivirus = await prisma.asset.create({
    data: {
      assetType: "SOFTWARE",
      formFactor: "PHYSICAL",
      stockNo: "BIM-YZL-0902",
      name: "Uç Nokta Güvenlik Lisansı (500 kullanıcı)",
      version: "2025.1",
      ownerId: selin.id,
      departmentId: bidb.id,
      criticality: "HIGH",
      status: "ACTIVE",
      contractorVendorId: anadolu.id,
      supportVendorId: veriDestek.id,
      supportStartDate: daysFromNow(-180),
      supportEndDate: daysFromNow(185),
      transactionDate: daysFromNow(-180),
    },
  });

  await prisma.assetRelation.createMany({
    data: [
      { sourceId: ebys.id, targetId: appServer.id, relationType: "HOSTED_ON" },
      { sourceId: ebys.id, targetId: dbServer.id, relationType: "HOSTED_ON" },
      { sourceId: antivirus.id, targetId: webServer.id, relationType: "HOSTED_ON" },
    ],
  });

  const created = [dbServer, appServer, webServer, ebys, antivirus, ...assets];
  await prisma.activityLog.createMany({
    data: created.map((asset) => ({
      assetId: asset.id,
      action: "CREATE",
      actor: "kurulum",
      note: `${asset.name} envanteri oluşturuldu`,
    })),
  });

  await prisma.activityLog.create({
    data: {
      assetId: dbServer.id,
      action: "UPDATE",
      actor: "ahmet.yilmaz",
      note: "2 alan güncellendi",
      changes: JSON.stringify([
        { field: "ram", label: "RAM", from: "128 GB", to: "256 GB" },
        { field: "version", label: "Versiyon / Sürüm", from: "9.3", to: "9.4" },
      ]),
    },
  });

  await prisma.serviceRequest.create({
    data: {
      requestNo: "TAL-2026-0001",
      requestType: "PASSWORD",
      office: "SISTEM",
      requesterId: zeynep.id,
      requestingDeptId: ik.id,
      requestingManagerId: zeynep.id,
      handlingDeptId: bidb.id,
      handlingManagerId: ahmet.id,
      status: "IN_PROGRESS",
      reason: "Kullanıcı parolasını unuttu.",
      description: "İK kullanıcısı için acil sıfırlama.",
      details: JSON.stringify({ username: "zeynep.aydin", passwordAction: "RESET" }),
    },
  });
  await prisma.serviceRequest.create({
    data: {
      requestNo: "TAL-2026-0002",
      requestType: "FW_INTRANET",
      office: "SIBER",
      requesterId: mehmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: ahmet.id,
      handlingDeptId: bidb.id,
      handlingManagerId: selin.id,
      status: "OPEN",
      reason: "EBYS test ortamına erişim.",
      details: JSON.stringify({ sourceIp: "10.20.14.14", destIp: "10.10.20.21", portProtocol: "443/TCP", fwVendor: "PALO" }),
    },
  });
  await prisma.serviceRequest.create({
    data: {
      requestNo: "TAL-2026-0003",
      requestType: "REPO_ACCESS",
      office: "YAZILIM",
      requesterId: mehmet.id,
      requestingDeptId: bidb.id,
      requestingManagerId: ahmet.id,
      handlingDeptId: yazilim.id,
      handlingManagerId: can.id,
      status: "OPEN",
      severity: "MEDIUM",
      reason: "EBYS backend deposuna geliştirici erişimi.",
      details: JSON.stringify({
        scmProduct: "GITLAB",
        actionKind: "GRANT",
        repoPath: "kurum/ebys-backend",
        accessLevel: "DEVELOPER",
        username: "mehmet.kara",
      }),
    },
  });
  await prisma.serviceRequest.create({
    data: {
      requestNo: "TAL-2026-0004",
      requestType: "DB_USER",
      office: "VERITABANI",
      requesterId: can.id,
      requestingDeptId: yazilim.id,
      requestingManagerId: can.id,
      handlingDeptId: veritabani.id,
      handlingManagerId: deniz.id,
      status: "WAITING",
      severity: "HIGH",
      reason: "EBYS test şemasına okuma yetkisi.",
      details: JSON.stringify({
        dbEngine: "ORACLE",
        actionKind: "GRANT",
        dbName: "EBYS_TEST",
        dbUsername: "EBYS_APP",
        privilege: "READ",
      }),
    },
  });
  await prisma.serviceRequest.create({
    data: {
      requestNo: "TAL-2026-0005",
      requestType: "SD_SUPPORT",
      office: "SERVIS",
      requesterId: zeynep.id,
      requestingDeptId: ik.id,
      requestingManagerId: zeynep.id,
      handlingDeptId: servisMasasi.id,
      handlingManagerId: merve.id,
      status: "IN_PROGRESS",
      severity: "LOW",
      reason: "İK uygulaması giriş ekranı açılmıyor.",
      details: JSON.stringify({
        sdProduct: "SDP",
        category: "INCIDENT",
        affectedService: "İK Özlük",
        urgency: "MEDIUM",
      }),
    },
  });
  await prisma.changeRecord.create({
    data: {
      changeNo: "CHG-2026-0001",
      requesterId: ahmet.id,
      requestingDeptId: veriMerkezi.id,
      requestingManagerId: ahmet.id,
      approvalUnitCount: 2,
      targetDept1Id: bidb.id,
      targetMgr1Id: selin.id,
      targetDept2Id: veriMerkezi.id,
      targetMgr2Id: elif.id,
      infosecManagerId: selin.id,
      changeIp: "10.10.20.11",
      changeKind: "HARDWARE",
      machineType: "PHYSICAL",
      impact: "PARTIAL",
      status: "PENDING",
      description: "SRV-DB-01 bellek yükseltmesi.",
      assetId: dbServer.id,
      approvalUnits: {
        create: [
          { sortOrder: 1, departmentId: bidb.id, managerId: selin.id },
          { sortOrder: 2, departmentId: veriMerkezi.id, managerId: elif.id },
        ],
      },
    },
  });
  await prisma.patchRecord.create({
    data: {
      patchNo: "YAM-2026-0001",
      requesterId: selin.id,
      requestingManagerId: ahmet.id,
      title: "RHEL 9 güvenlik yamaları",
      scope: "Veri merkezi Linux sunucuları",
      systemType: "OS",
      systemKind: "SERVER",
      ipRange: "10.10.20.0/24",
      impact: "PARTIAL",
      assetOwnerId: ahmet.id,
      distribution: "MANUAL",
      risks: "Kısa kesinti olabilir.",
      status: "APPROVED",
      description: "Kritik CVE kapatma paketi.",
    },
  });
  await prisma.appConfig.create({
    data: {
      appName: "Elektronik Belge Yönetim Sistemi",
      version: "6.4.2",
      ownerId: mehmet.id,
      departmentId: bidb.id,
      managerId: ahmet.id,
      backupDate: daysFromNow(-7),
      description: "Uygulama sunucusu yapılandırma yedeği.",
      assetId: ebys.id,
    },
  });
  const coreSwitch = await prisma.asset.findFirst({ where: { ipAddress: "10.10.1.1" } });
  await prisma.vulnerability.create({
    data: {
      vulnNo: "ZAF-2026-0001",
      deviceName: "SW-CORE-01",
      deviceIp: "10.10.1.1",
      ownerId: elif.id,
      departmentId: veriMerkezi.id,
      managerId: ahmet.id,
      severity: "HIGH",
      status: "OPEN",
      dueDate: daysFromNow(14),
      description: "IOS XE sürümünde bilinen CVE. Sözleşme yenilemesiyle yama planlanacak.",
      assetId: coreSwitch?.id,
      externalId: "nessus:10.10.1.1:CVE-2024-20353",
      cve: "CVE-2024-20353",
      pluginId: "198234",
      source: "SCANNER",
      scannerVendor: "NESSUS",
    },
  });
  const slaStart = new Date();
  await prisma.slaTicket.create({
    data: {
      ticketNo: "SLA-2026-0001",
      title: "Omurga switch yönetim kartı yanıt vermiyor",
      application: "Cisco Catalyst 9500",
      ownerId: elif.id,
      requesterId: elif.id,
      requestingManagerId: ahmet.id,
      departmentId: veriMerkezi.id,
      vendorId: netguc.id,
      productId: netgucSwitch?.id,
      slaLevel: 1,
      severity: "CRITICAL",
      status: "OPEN",
      description: "SW-CORE-01 yönetim kartı yanıt vermiyor.",
      openedAt: slaStart,
      slaStartedAt: slaStart,
      slaResponseDueAt: new Date(slaStart.getTime() + 2 * 3_600_000),
      slaDueAt: new Date(slaStart.getTime() + 4 * 3_600_000),
      notifyNote: "Örnek kayıt. SMTP kapalı ortamda bildirim kuyruğa yazılır.",
    },
  });
  const incident = await prisma.incident.create({
    data: {
      incidentNo: "OLY-2026-0001",
      title: "Şüpheli dış bağlantı denemesi",
      departmentId: bidb.id,
      requesterId: kemal.id,
      requestingManagerId: ahmet.id,
      l1AnalystId: kemal.id,
      severity: "HIGH",
      layer: "L1",
      escalationStatus: "PENDING",
      ioc: "203.0.113.44 · ssh brute-force",
      status: "INVESTIGATING",
      description: "SIEM korelasyonu ile tespit edildi. Seviye 1 incelemede; yüksek önem nedeniyle Seviye 2 bekleniyor.",
    },
  });
  await prisma.problem.create({
    data: {
      problemNo: "PRB-2026-0001",
      title: "Tekrarlayan SSH brute-force kaynaklı hesap kilitlenmeleri",
      incidentId: incident.id,
      requesterId: kemal.id,
      requestingManagerId: ahmet.id,
      proposedAssigneeId: kemal.id,
      infosecManagerId: selin.id,
      assignmentStatus: "PENDING",
      rootCause: "İnternete açık yönetim portu.",
      workaround: "Fail2ban ve VPN zorunluluğu.",
      status: "OPEN",
      description: "Olaydan türetilen problem kaydı. Atama BG onayı bekliyor.",
    },
  });

  const officers = {
    infosec: selin.id,
    degisiklik: kemal.id,
    yama: kemal.id,
    konfigurasyon: kemal.id,
    zafiyet: selin.id,
    firmaSla: kemal.id,
    olay: selin.id,
    problem: selin.id,
  };
  const existingConfig = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  let existingPayload: Record<string, unknown> = {};
  if (existingConfig?.payload) {
    try {
      existingPayload = JSON.parse(existingConfig.payload) as Record<string, unknown>;
    } catch {
      existingPayload = {};
    }
  }
  await prisma.systemConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      payload: JSON.stringify({
        ad: { enabled: false, host: "dc01.kurum.local", port: 389, useLdaps: false, baseDn: "DC=kurum,DC=local", bindDn: "", bindPassword: "", userFilter: "(&(objectCategory=person)(objectClass=user))", groupFilter: "(objectClass=group)" },
        siem: { enabled: false, host: "siem.kurum.local", port: 514, protocol: "UDP", cefVendor: "Kurum", cefProduct: "BTHizmetYonetimi", cefVersion: "1.0" },
        scanner: { enabled: false, vendor: "NESSUS", host: "nessus.kurum.local", port: 8834, protocol: "HTTPS", apiPath: "/scans", accessKey: "", secretKey: "", username: "", password: "", verifyTls: false, autoMatchAssets: true, useDemoFeed: true, dueDaysCritical: 7, dueDaysHigh: 14, lastSyncAt: null, lastSyncMessage: null },
        approval: { unitManager: true, seniorManager: false, infosec: true, notifyMail: true, slaHours: 24, applyToRequests: true, applyToChanges: true, applyToPatches: true },
        mail: { enabled: false, host: "smtp.kurum.local", port: 587, secure: "STARTTLS", user: "", password: "", from: "bt-hizmet@kurum.gov.tr", fromName: "BT Hizmet Yönetimi", testRecipient: "" },
        officers,
      }),
    },
    update: {
      payload: JSON.stringify({ ...existingPayload, officers }),
    },
  });

  await seedItilV2IfEmpty(prisma);
  await fillDemoSerials(prisma);
  await fixDemoApplications(prisma);
  await fixDemoMobiles(prisma);

  console.log(
    `Örnek veriler yüklendi: ${created.length} envanter, ${people.length} kişi, ITIL süreç kayıtları.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
