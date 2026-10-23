// @ts-nocheck
/**
 * Çevik çalışma örnek verisi (idempotent): 2 ürün, 3 sprint, ~25 iş.
 * Docker: SEED_DEMO_EXTRA=true iken açılışta bir kez çalışır.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function day(offset: number, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

async function person(user: string) {
  return (await prisma.person.findFirst({ where: { adUsername: user } })) ?? (await prisma.person.findFirst());
}

async function main() {
  if (await prisma.agileProduct.findUnique({ where: { key: "BTHM" } })) {
    console.log("Çevik örnek veri zaten yüklü; atlandı.");
    return;
  }
  const ahmet = await person("ahmet.yilmaz");
  const elif = await person("elif.demir");
  const mehmet = await person("mehmet.kara");
  const burak = await person("burak.sahin");
  const incident = await prisma.incident.findFirst({ orderBy: { incidentNo: "asc" } });
  const problem = await prisma.problem.findFirst({ orderBy: { problemNo: "asc" } });
  const change = await prisma.changeRecord.findFirst({ orderBy: { changeNo: "asc" } });

  const p1 = await prisma.agileProduct.create({
    data: { key: "BTHM", name: "BT Hizmet Masası İyileştirmeleri", method: "SCRUM", description: "Self-servis portalı, bildirim ve raporlama iyileştirmeleri.", ownerId: ahmet?.id },
  });
  const p2 = await prisma.agileProduct.create({
    data: { key: "SIBER", name: "Siber İzleme (Kanban)", method: "KANBAN", description: "Sürekli akışla yürüyen güvenlik iyileştirme işleri.", ownerId: mehmet?.id },
  });

  const s1 = await prisma.agileSprint.create({
    data: { productId: p1.id, name: "Sprint 1", goal: "Talep formunu sadeleştir.", startDate: day(-28), endDate: day(-15), status: "CLOSED", capacity: 20, closedAt: day(-15, 17), retro: "İyi: günlük toplantılar kısa kaldı.\nGeliştirilecek: kabul ölçütleri baştan yazılmalı." },
  });
  const s2 = await prisma.agileSprint.create({
    data: { productId: p1.id, name: "Sprint 2", goal: "E-posta bildirimleri ve SLA uyarıları.", startDate: day(-7), endDate: day(6), status: "ACTIVE", capacity: 24 },
  });
  await prisma.agileSprint.create({ data: { productId: p1.id, name: "Sprint 3", goal: "Yönetici panosu.", startDate: day(7), endDate: day(20), status: "PLANNED", capacity: 24 } });

  let n1 = 0;
  let n2 = 0;
  const item = (p, sprint, d) => {
    const isP1 = p.id === p1.id;
    const no = `${p.key}-${String(isP1 ? ++n1 : ++n2).padStart(3, "0")}`;
    return prisma.agileItem.create({
      data: {
        itemNo: no,
        productId: p.id,
        sprintId: sprint?.id ?? null,
        reporterId: ahmet?.id,
        rank: isP1 ? n1 : n2,
        type: "STORY",
        priority: "MEDIUM",
        status: sprint ? "TODO" : "BACKLOG",
        ...d,
      },
    });
  };

  // Sprint 1 (kapandı): hepsi bitti
  await item(p1, s1, { title: "Talep formunda zorunlu alanları azalt", points: 5, status: "DONE", assigneeId: elif?.id, startedAt: day(-27), completedAt: day(-22) });
  await item(p1, s1, { title: "Talep türüne göre dinamik form", points: 8, priority: "HIGH", status: "DONE", assigneeId: burak?.id, startedAt: day(-26), completedAt: day(-18) });
  await item(p1, s1, { title: "Mobilde form düzeni hatası", type: "BUG", points: 2, status: "DONE", assigneeId: elif?.id, startedAt: day(-20), completedAt: day(-17) });
  await item(p1, s1, { title: "Form alan ipuçlarını Türkçeleştir", type: "TASK", points: 3, status: "DONE", assigneeId: burak?.id, startedAt: day(-24), completedAt: day(-16) });
  // Sprint 2 (aktif)
  const slaItem = await item(p1, s2, { title: "SLA süresi dolmadan e-posta uyarısı", points: 8, epicId: null, priority: "HIGH", status: "IN_PROGRESS", assigneeId: burak?.id, startedAt: day(-5) });
  await item(p1, s2, { title: "Onay bekleyen kayıtlar için günlük özet e-postası", points: 5, status: "REVIEW", assigneeId: elif?.id, startedAt: day(-6) });
  await item(p1, s2, { title: "Bildirim şablonlarını düzenlenebilir yap", points: 5, status: "TODO", assigneeId: ahmet?.id });
  await item(p1, s2, { title: "E-posta gönderim hatalarını denetim izine yaz", type: "TASK", points: 3, status: "DONE", assigneeId: elif?.id, startedAt: day(-6), completedAt: day(-3) });
  await item(p1, s2, { title: "Bildirim sayfasında sayfalama hatası", type: "BUG", points: 2, priority: "HIGH", status: "DONE", assigneeId: burak?.id, startedAt: day(-4), completedAt: day(-1) });
  if (incident) {
    await item(p1, s2, { title: `${incident.incidentNo} — ${incident.title}: kalıcı iyileştirme`, type: "BUG", points: 5, priority: "CRITICAL", status: "TODO", assigneeId: mehmet?.id, sourceType: "INCIDENT", sourceId: incident.id, sourceNo: incident.incidentNo });
  }
  // Backlog
  const epicDash = await item(p1, null, { title: "Yönetici panosu: açık iş ve SLA özeti", points: 13, priority: "HIGH", type: "EPIC" });
  const epicNotify = await item(p1, null, { title: "Bildirim ve uyarı altyapısı", points: 0, priority: "HIGH", type: "EPIC" });
  await item(p1, null, { title: "Dashboard widget sırasını kullanıcı seçsin", points: 5, epicId: epicDash.id });
  await item(p1, null, { title: "Raporları zamanlanmış e-posta ile gönder", points: 8, epicId: epicNotify.id });
  await item(p1, null, { title: "Karanlık tema kontrast düzeltmeleri", type: "TASK", points: 3, priority: "LOW" });
  if (problem) {
    await item(p1, null, { title: `${problem.problemNo} — ${problem.title}: kök neden çalışması`, points: 8, priority: "HIGH", sourceType: "PROBLEM", sourceId: problem.id, sourceNo: problem.problemNo });
  }
  // Kanban ürünü
  await item(p2, null, { title: "Güvenlik duvarı kural gözden geçirmesi", type: "TASK", points: 5, status: "BACKLOG" });
  await item(p2, null, { title: "Log toplama kaynaklarını genişlet", points: 8, status: "TODO", priority: "HIGH", assigneeId: mehmet?.id });
  await item(p2, null, { title: "Phishing farkındalık simülasyonu", points: 5, status: "IN_PROGRESS", assigneeId: elif?.id, startedAt: day(-3) });
  await item(p2, null, { title: "Admin hesaplarında MFA zorunluluğu", points: 8, priority: "CRITICAL", status: "REVIEW", assigneeId: burak?.id, startedAt: day(-9) });
  await item(p2, null, { title: "Eski VPN profillerini kapat", type: "TASK", points: 2, status: "DONE", assigneeId: mehmet?.id, startedAt: day(-8), completedAt: day(-4) });
  if (change) {
    await item(p2, null, { title: `${change.changeNo}: uygulama sonrası izleme kuralları`, type: "TASK", points: 3, status: "TODO", sourceType: "CHANGE", sourceId: change.id, sourceNo: change.changeNo });
  }
  await prisma.agileItem.update({ where: { id: slaItem.id }, data: { epicId: epicNotify.id } });
  await prisma.agileComment.createMany({
    data: [
      { itemId: slaItem.id, authorId: ahmet?.id, body: "Uyarı eşiği SLA süresinin %80'i olsun, ayarlardan değiştirilebilir." },
      { itemId: slaItem.id, authorId: burak?.id, body: "Tamam. SMTP kapalıysa denetim izine yazıp atlıyorum." },
    ],
  });
  await prisma.agileMeeting.createMany({
    data: [
      { productId: p1.id, sprintId: s2.id, kind: "PLANNING", title: "Sprint 2 planlama", meetingDate: day(-7), attendees: "Ahmet Yılmaz, Elif Demir, Burak Şahin", notes: "Kapasite 24 puan. Bildirim işleri öncelikli, yönetici panosu Sprint 3'e kaldı.", decisions: "SLA uyarısı bu sprintte bitecek (Burak).\nÖzet e-posta için tasarım onayı Ahmet'ten." , createdById: ahmet?.id },
      { productId: p1.id, sprintId: s2.id, kind: "DAILY", title: "Günlük toplantı", meetingDate: day(-2), attendees: "Ekip", notes: "Burak: SLA uyarısı devam ediyor. Elif: özet e-posta incelemede.\nEngel: SMTP test sunucusu yok.", decisions: "Mehmet test SMTP sunucusunu yarın açacak.", createdById: elif?.id },
      { productId: p1.id, sprintId: s1.id, kind: "RETRO", title: "Sprint 1 retrospektif", meetingDate: day(-15), attendees: "Ekip", notes: "İyi: kısa günlük toplantılar. Geliştirilecek: kabul ölçütleri baştan yazılmalı.", decisions: "Her hikâyeye kabul ölçütü eklenecek.", createdById: ahmet?.id },
    ],
  });
  console.log("Çevik örnek veri yüklendi: 2 ürün, 3 sprint ve örnek işler.");
}

main().finally(() => prisma.$disconnect());
