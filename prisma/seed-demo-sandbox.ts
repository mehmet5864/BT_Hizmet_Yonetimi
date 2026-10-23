// @ts-nocheck
/**
 * Örnek sandbox raporlarını uygun olaylara bağlar (idempotent).
 * PDF'ler prisma/demo-sandbox/ içindedir; yükleme klasörüne kopyalanır.
 * Docker: SEED_DEMO_EXTRA=true iken açılışta bir kez çalışır.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const REPORTS = [
  { title: "Dosya sunucusunda fidye yazılımı şüphesi", file: "3f6c2a10-8b1e-4d27-9a55-0c1d7e2b4a01.pdf", name: "sandbox-fidye-yazilimi-ornek.pdf" },
  { title: "Phishing e-postası — İK birimi", file: "7a91d5e4-2c3b-4f08-b6d7-5e8a9c0f1b02.pdf", name: "sandbox-phishing-ornek.pdf" },
  { title: "Core switch yönetim arayüzüne yetkisiz giriş denemesi", file: "c4e82b97-5d6a-41f3-8a19-2b7f0d3e9c03.pdf", name: "sandbox-switch-giris-ornek.pdf" },
];

async function main() {
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
  mkdirSync(uploadDir, { recursive: true });
  let count = 0;
  for (const report of REPORTS) {
    const source = path.join(process.cwd(), "prisma", "demo-sandbox", report.file);
    if (!existsSync(source)) continue;
    const incident = await prisma.incident.findFirst({ where: { title: report.title, sandboxReportUrl: null } });
    if (!incident) continue;
    copyFileSync(source, path.join(uploadDir, report.file));
    await prisma.incident.update({
      where: { id: incident.id },
      data: { sandboxReportUrl: `/uploads/${report.file}`, sandboxReportName: report.name },
    });
    count += 1;
  }
  console.log(`Örnek sandbox raporu bağlandı: ${count} olay.`);
}

main()
  .catch((error) => {
    console.error("Sandbox raporları yüklenemedi:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
