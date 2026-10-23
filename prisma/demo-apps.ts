// @ts-nocheck
/**
 * Örnek verideki uygulamaları "Uygulama" türüne taşır ve hizmet / sunucu bağlarını kurar.
 * Idempotent; yalnızca örnek kurulum işareti (BIM-SRV-0001) varsa çalışır.
 */

const APP_FIELDS = {
  "BIM-YZL-0901": { appEnvironment: "PROD", appUrl: "https://ebys.kurum.local", appUserCount: "420", appRto: "4 saat", appTechnology: ".NET + MSSQL", service: "Evrak yönetim sistemi", hosts: ["BIM-SRV-0002", "BIM-SRV-0001"] },
};

const NEW_APPS = [
  { stockNo: "BIM-UYG-0001", name: "Personel Bilgi Sistemi", version: "3.2", appEnvironment: "PROD", appUrl: "https://pbs.kurum.local", appUserCount: "85", appRto: "8 saat", appTechnology: "Java + PostgreSQL", servedApplication: "e-Devlet, Maaş Sistemi", service: null, hosts: ["BIM-SRV-0002", "BIM-SRV-0001"], criticality: "HIGH" },
  { stockNo: "BIM-UYG-0002", name: "Kurumsal E-posta (Exchange)", version: "2019 CU14", appEnvironment: "PROD", appUrl: "https://posta.kurum.local", appUserCount: "520", appRto: "2 saat", appTechnology: "Microsoft Exchange", servedApplication: "Active Directory", service: "Kurumsal e-posta", hosts: ["BIM-SRV-0003"], criticality: "HIGH" },
  { stockNo: "BIM-UYG-0003", name: "VPN Geçidi Yönetimi", version: "7.0", appEnvironment: "PROD", appUrl: "https://vpn.kurum.local", appUserCount: "150", appRto: "4 saat", appTechnology: "SSL VPN", servedApplication: "Active Directory", service: "VPN uzaktan erişim", hosts: ["BIM-SRV-0003"], criticality: "MEDIUM" },
];

export async function fixDemoApplications(prisma): Promise<number> {
  const marker = await prisma.asset.findUnique({ where: { stockNo: "BIM-SRV-0001" }, select: { id: true } });
  if (!marker) return 0;
  const byStock = async (stockNo: string) => prisma.asset.findUnique({ where: { stockNo } });
  const link = async (appId: string, hosts: string[], service: string | null) => {
    for (const stockNo of hosts) {
      const host = await byStock(stockNo);
      if (!host) continue;
      await prisma.assetRelation.upsert({
        where: { sourceId_targetId_relationType: { sourceId: appId, targetId: host.id, relationType: "HOSTED_ON" } },
        update: {},
        create: { sourceId: appId, targetId: host.id, relationType: "HOSTED_ON" },
      });
    }
    if (service) {
      const svc = await prisma.catalogService.findFirst({ where: { name: service, assetId: null } });
      if (svc) await prisma.catalogService.update({ where: { id: svc.id }, data: { assetId: appId } });
    }
  };

  let count = 0;
  for (const [stockNo, info] of Object.entries(APP_FIELDS)) {
    const row = await byStock(stockNo);
    if (!row || (row.assetType !== "SOFTWARE" && row.assetType !== "APPLICATION")) continue;
    const { service, hosts, ...fields } = info;
    await prisma.asset.update({
      where: { id: row.id },
      data: { assetType: "APPLICATION", formFactor: "VIRTUAL", appEnvironment: row.appEnvironment ?? fields.appEnvironment, appUrl: row.appUrl ?? fields.appUrl, appUserCount: row.appUserCount ?? fields.appUserCount, appRto: row.appRto ?? fields.appRto, appTechnology: row.appTechnology ?? fields.appTechnology },
    });
    await link(row.id, hosts, service);
    count++;
  }

  const owner = await prisma.asset.findUnique({ where: { stockNo: "BIM-YZL-0901" }, select: { ownerId: true, departmentId: true } });
  const ownerId = owner?.ownerId ?? (await prisma.asset.findUnique({ where: { stockNo: "BIM-SRV-0001" }, select: { ownerId: true } }))?.ownerId;
  const departmentId = owner?.departmentId ?? null;
  if (!ownerId) return count;
  for (const app of NEW_APPS) {
    let row = await byStock(app.stockNo);
    if (!row) {
      const { service, hosts, ...rest } = app;
      row = await prisma.asset.create({
        data: { assetType: "APPLICATION", formFactor: "VIRTUAL", status: "ACTIVE", ownerId, departmentId, ...rest },
      });
      await prisma.activityLog.create({ data: { assetId: row.id, action: "CREATE", actor: "kurulum", note: `${row.name} envanteri oluşturuldu` } });
      count++;
    }
    await link(row.id, app.hosts, app.service);
  }
  return count;
}

const NEW_PHONES = [
  { stockNo: "BIM-GSM-0001", name: "Kurumsal Telefon - Yönetim", brand: "Samsung", model: "Galaxy S23", operatingSystem: "Android", version: "14", cpu: "Snapdragon 8 Gen 2", ram: "8 GB", disk: "256 GB", criticality: "MEDIUM" },
  { stockNo: "BIM-GSM-0002", name: "Kurumsal Telefon - Saha Ekibi", brand: "Apple", model: "iPhone 14", operatingSystem: "iOS", version: "17", cpu: "A15 Bionic", ram: "6 GB", disk: "128 GB", criticality: "LOW" },
];

/** Örnek mobil telefonlar ekler; sahipsiz ama "Kullanımda" görünen kayıtları "Depoda" yapar (idempotent). */
export async function fixDemoMobiles(prisma): Promise<number> {
  let count = 0;
  const fixed = await prisma.asset.updateMany({ where: { custody: "FREE", status: "ACTIVE" }, data: { status: "IN_STOCK" } });
  count += fixed.count;
  const marker = await prisma.asset.findUnique({ where: { stockNo: "BIM-SRV-0001" }, select: { id: true } });
  if (!marker) return count;
  const tablet = await prisma.asset.findUnique({ where: { stockNo: "BIM-TBL-0401" }, select: { ownerId: true, departmentId: true } });
  const ownerId = tablet?.ownerId ?? (await prisma.asset.findUnique({ where: { stockNo: "BIM-SRV-0001" }, select: { ownerId: true } }))?.ownerId;
  if (!ownerId) return count;
  const { demoSerial } = await import("./demo-serials");
  for (const phone of NEW_PHONES) {
    if (await prisma.asset.findUnique({ where: { stockNo: phone.stockNo }, select: { id: true } })) continue;
    const row = await prisma.asset.create({
      data: { assetType: "MOBILE_PHONE", formFactor: "PHYSICAL", status: "ACTIVE", supportStatus: "IN_WARRANTY", ownerId, departmentId: tablet?.departmentId ?? null, serialNo: demoSerial(phone.stockNo, phone.brand), ...phone },
    });
    await prisma.activityLog.create({ data: { assetId: row.id, action: "CREATE", actor: "kurulum", note: `${row.name} envanteri oluşturuldu` } });
    count++;
  }
  return count;
}
