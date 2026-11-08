// @ts-nocheck
/**
 * GEÇİCİ: bir kişiye ServisAdmin rolü + tüm ITIL süreç görevlerini verir (içerik modüllerinde geniş yetki).
 * Kullanım:  docker compose exec app npx tsx prisma/gecici-yetki.ts ahmet.yilmaz
 * Geri alma: Ayarlar → Yetki ve roller → kişiyi düzenleyin (rolü ve ITIL görevlerini kaldırın) ya da  ... gecici-yetki.ts ahmet.yilmaz --geri
 * Yerleşik BTHS_Admin hesabına dokunmaz. Parola/gizli bilgi içermez.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const ALL = ["INCIDENT_MGR", "PROBLEM_MGR", "CHANGE_MGR", "RELEASE_MGR", "SECURITY_MGR", "ASSET_CONFIG_MGR", "SLM_MGR", "CAB_MEMBER"];

async function main() {
  const name = process.argv[2];
  const undo = process.argv.includes("--geri");
  if (!name) return console.error("Kullanım: npx tsx prisma/gecici-yetki.ts <kullanıcı adı> [--geri]");
  const person = await prisma.person.findFirst({ where: { adUsername: name } });
  if (!person) return console.error(`Kişi bulunamadı: ${name}`);
  if (person.isBuiltin) return console.error("Yerleşik hesaba dokunulmaz.");
  const data = undo
    ? { role: "USER", processRoles: null, requestOffice: null }
    : { role: "SYSTEM_ADMIN", roleSource: person.roleSource === "AD" ? "BOTH" : person.roleSource, processRoles: JSON.stringify(ALL) };
  await prisma.person.update({ where: { id: person.id }, data });
  await prisma.activityLog.create({ data: { entityType: "person", entityId: person.id, action: "TEMP_GRANT", note: undo ? "Geçici yetki geri alındı." : "Geçici geniş yetki verildi (ServisAdmin + tüm süreç görevleri)." } });
  console.log(`${name}: ${undo ? "geri alındı (User)" : "ServisAdmin + tüm ITIL süreç görevleri verildi"}. Oturumu kapatıp açın.`);
}
main().finally(() => prisma.$disconnect());
