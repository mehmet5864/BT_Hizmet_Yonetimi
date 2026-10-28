// @ts-nocheck
/**
 * Bekleyen sürümlü veri taşımalarını sırayla çalıştırır (açılışta, `prisma db push` sonrası).
 * Uygulananlar DataMigration tablosunda tutulur; tekrar çalışmaz.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { DATA_MIGRATIONS } from "./data-migrations";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const done = new Set((await prisma.dataMigration.findMany({ select: { id: true } })).map((m) => m.id));
  const pending = [...DATA_MIGRATIONS].sort((a, b) => a.id.localeCompare(b.id)).filter((m) => !done.has(m.id));
  if (!pending.length) {
    console.log("Bekleyen veri taşıması yok.");
    return;
  }
  let criticalFailed = false;
  for (const m of pending) {
    const t0 = Date.now();
    try {
      const note = await m.run(prisma);
      await prisma.dataMigration.create({ data: { id: m.id, name: m.name, durationMs: Date.now() - t0, note: note ? String(note).slice(0, 500) : null } });
      console.log(`Veri taşıması uygulandı: ${m.id} — ${m.name}`);
    } catch (e) {
      console.error(`Veri taşıması BAŞARISIZ: ${m.id} — ${m.name}:`, e instanceof Error ? e.message : e);
      if (m.critical) {
        criticalFailed = true;
        break;
      }
    }
  }
  if (criticalFailed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
