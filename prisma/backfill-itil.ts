// @ts-nocheck
/**
 * 3.0.x: Mevcut olay ve taleplere SLA hedeflerini işler (idempotent; yalnızca hedefi boş kayıtlara dokunur).
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { fixDemoApplications, fixDemoMobiles } from "./demo-apps";
import { fillDemoSerials } from "./demo-serials";
import { derivePriority, incidentDueDates, requestDueDate } from "../src/lib/itil/sla";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const serials = await fillDemoSerials(prisma);
  if (serials) console.log(`Seri no eklendi: ${serials} örnek envanter kaydı.`);
  const mobiles = await fixDemoMobiles(prisma);
  if (mobiles) console.log(`Envanter düzeltildi/eklendi (mobil telefon, sahipsiz kayıt): ${mobiles}.`);
  const apps = await fixDemoApplications(prisma);
  if (apps) console.log(`Örnek uygulama kaydı güncellendi/eklendi: ${apps}.`);
  let inc = 0;
  for (const row of await prisma.incident.findMany({ where: { resolveDueAt: null } })) {
    const priority = derivePriority({ impact: row.impact, urgency: row.urgency, severity: row.severity, isMajor: row.isMajor });
    const final = row.status === "RESOLVED" || row.status === "CLOSED";
    await prisma.incident.update({
      where: { id: row.id },
      data: {
        priority,
        ...incidentDueDates(row.startedAt, priority),
        respondedAt: row.respondedAt ?? (row.status !== "OPEN" ? row.startedAt : null),
        resolvedAt: final ? (row.resolvedAt ?? row.endedAt ?? row.updatedAt) : null,
      },
    });
    inc++;
  }
  let req = 0;
  for (const row of await prisma.serviceRequest.findMany({ where: { resolveDueAt: null } })) {
    const final = ["DONE", "REJECTED", "CANCELLED"].includes(row.status);
    await prisma.serviceRequest.update({
      where: { id: row.id },
      data: {
        resolveDueAt: requestDueDate(row.createdAt, row.severity),
        resolvedAt: final ? (row.resolvedAt ?? row.updatedAt) : null,
      },
    });
    req++;
  }
  if (inc || req) console.log(`SLA hedefleri işlendi: ${inc} olay, ${req} talep.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
