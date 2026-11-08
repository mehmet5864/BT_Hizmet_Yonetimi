// @ts-nocheck
/**
 * Yerleşik süper yönetici hesabını (BTHS_Admin) güvenle oluşturur. Her açılışta çalışır, tekrar çalışması zararsızdır.
 *
 * - Parola kaynak koduna YAZILMAZ. İlk oluşturmada `BTHS_ADMIN_PASSWORD` ortam değişkeninden (.env) okunur
 *   ve yalnızca hash olarak saklanır. Değişken yoksa hesap oluşturulmaz, uyarı yazılır.
 * - Hesap zaten varsa parolasına DOKUNULMAZ (kullanıcı değiştirmiş olabilir); yalnızca rol / kaynak / yerleşik işareti düzeltilir.
 * - İlk girişte parola değiştirmesi zorunludur (mustChangePassword).
 * - Hesap yerel (MANUAL) kaynaklıdır: AD kapalıyken de girer, AD bu hesabı eşleyemez.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const USERNAME = "BTHS_Admin";
const FULL_NAME = "BTHS Admin";
const MIN_LENGTH = 12;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const existing = await prisma.person.findFirst({ where: { adUsername: USERNAME } });
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (existing.role !== "SUPER_ADMIN") patch.role = "SUPER_ADMIN";
    if (existing.roleSource !== "MANUAL") patch.roleSource = "MANUAL";
    if (!existing.isBuiltin) patch.isBuiltin = true;
    if (Object.keys(patch).length) {
      await prisma.person.update({ where: { id: existing.id }, data: patch });
      console.log(`Yerleşik süper yönetici hesabı düzeltildi: ${Object.keys(patch).join(", ")}`);
    }
    return;
  }

  const password = (process.env.BTHS_ADMIN_PASSWORD ?? "").trim();
  if (!password) {
    console.warn("UYARI: BTHS_ADMIN_PASSWORD tanımlı değil; yerleşik süper yönetici hesabı (BTHS_Admin) oluşturulmadı.");
    console.warn("       .env dosyasına BTHS_ADMIN_PASSWORD=... ekleyip uygulamayı yeniden başlatın.");
    return;
  }
  if (password.length < MIN_LENGTH) {
    console.warn(`UYARI: BTHS_ADMIN_PASSWORD en az ${MIN_LENGTH} karakter olmalı; hesap oluşturulmadı.`);
    return;
  }

  const nameTaken = await prisma.person.findUnique({ where: { fullName: FULL_NAME } });
  await prisma.person.create({
    data: {
      fullName: nameTaken ? `${FULL_NAME} (yerleşik)` : FULL_NAME,
      title: "Platform yöneticisi",
      duty: "Sistem yönetimi (iş verisi yok)",
      adUsername: USERNAME,
      role: "SUPER_ADMIN",
      roleSource: "MANUAL",
      passwordHash: hashPassword(password),
      mustChangePassword: true,
      isBuiltin: true,
    },
  });
  console.log("Yerleşik süper yönetici hesabı oluşturuldu: BTHS_Admin (ilk girişte parola değiştirilecek).");
}

main()
  .catch((e) => {
    // Hesap oluşturulamaması uygulamanın açılmasını engellemez.
    console.error("Yerleşik süper yönetici hesabı oluşturulamadı:", e instanceof Error ? e.message : e);
  })
  .finally(() => prisma.$disconnect());
