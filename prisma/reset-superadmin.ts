// @ts-nocheck
/**
 * BTHS_Admin hesabını oluşturur ya da parolasını sıfırlar ve kilidini açar (ör. unutulan parola, hatalı giriş kilidi).
 * Parola kaynak koda YAZILMAZ: komut satırından (2. argüman) ya da BTHS_ADMIN_PASSWORD ortam değişkeninden okunur; yalnızca hash saklanır.
 * Kullanım:  docker exec envanter-yonetim-v4 npx tsx prisma/reset-superadmin.ts "<yeni parola, en az 12 karakter>"
 * İlk girişte parola değiştirmek zorunludur.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const password = (process.argv[2] ?? process.env.BTHS_ADMIN_PASSWORD ?? "").trim();
  if (password.length < 12) return console.error("Parola en az 12 karakter olmalı (argüman olarak verin).");
  const data = { passwordHash: hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null, role: "SUPER_ADMIN", roleSource: "MANUAL", isBuiltin: true };
  const existing = await prisma.person.findFirst({ where: { adUsername: "BTHS_Admin" } });
  if (existing) {
    await prisma.person.update({ where: { id: existing.id }, data });
    console.log("BTHS_Admin: parola sıfırlandı, kilit açıldı. İlk girişte parola değiştirilecek.");
  } else {
    const taken = await prisma.person.findUnique({ where: { fullName: "BTHS Admin" } });
    await prisma.person.create({ data: { ...data, fullName: taken ? "BTHS Admin (yerleşik)" : "BTHS Admin", title: "Platform yöneticisi", duty: "Sistem yönetimi (iş verisi yok)", adUsername: "BTHS_Admin" } });
    console.log("BTHS_Admin hesabı oluşturuldu. İlk girişte parola değiştirilecek.");
  }
}
main().finally(() => prisma.$disconnect());
