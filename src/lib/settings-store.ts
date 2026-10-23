import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, OFFICER_DEFS, parseSettings, type OfficerKey, type Officers, type SystemSettings } from "@/lib/settings";

export async function getSystemSettings(): Promise<SystemSettings> {
  const row = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  return backfillOfficers(parseSettings(row?.payload));
}

export async function getOfficeNames() {
  return (await getSystemSettings()).officeNames;
}

export async function saveSystemSettings(settings: SystemSettings) {
  await prisma.systemConfig.upsert({
    where: { id: "default" },
    create: { id: "default", payload: JSON.stringify(settings) },
    update: { payload: JSON.stringify(settings) },
  });
  return settings;
}

export async function ensureSystemSettings() {
  const existing = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  const settings = existing ? parseSettings(existing.payload) : structuredClone(DEFAULT_SETTINGS);
  if (!existing) {
    await prisma.systemConfig.create({
      data: { id: "default", payload: JSON.stringify(settings) },
    });
  }
  return backfillOfficers(settings);
}

async function firstPerson(where: Record<string, unknown>) {
  const person = await prisma.person.findFirst({
    where,
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  return person?.id;
}

async function backfillOfficers(settings: SystemSettings) {
  // Eski kayıtlarda aynı kişi birden çok modüle atanmış olabilir: ilk atamayı koru, diğerlerini boşalt.
  let deduped = false;
  {
    const seen = new Set<string>();
    const cleaned: Officers = { ...settings.officers };
    for (const def of OFFICER_DEFS) {
      const id = cleaned[def.key];
      if (!id) continue;
      if (seen.has(id)) {
        cleaned[def.key] = "";
        deduped = true;
      } else seen.add(id);
    }
    if (deduped) settings.officers = cleaned;
  }
  if (!deduped && OFFICER_DEFS.every((def) => settings.officers[def.key])) return settings;

  const [infosec, sysadmin, unitManager] = await Promise.all([
    firstPerson({ role: "INFOSEC_MANAGER" }),
    firstPerson({ role: "SYSTEM_ADMIN" }),
    firstPerson({ role: "UNIT_MANAGER" }),
  ]);

  const fallback: Record<OfficerKey, string | undefined> = {
    infosec,
    degisiklik: sysadmin,
    yama: sysadmin,
    konfigurasyon: sysadmin,
    zafiyet: infosec,
    firmaSla: sysadmin,
    olay: infosec,
    problem: infosec,
    sistem: sysadmin,
    network: unitManager ?? sysadmin,
    siber: infosec,
    yazilim: unitManager ?? sysadmin,
    veritabani: sysadmin,
    servis: unitManager ?? sysadmin,
    envanter: unitManager ?? sysadmin,
    zimmet: unitManager ?? sysadmin,
    personel: unitManager ?? sysadmin,
    katalog: sysadmin,
    bilgi: infosec ?? sysadmin,
    akis: sysadmin,
    tasarim: sysadmin,
    kullanilabilirlik: sysadmin,
    kapasite: sysadmin,
    sureklilik: infosec ?? sysadmin,
    dogrulama: sysadmin,
    surum: sysadmin,
    izleme: sysadmin,
    degerlendirme: unitManager ?? sysadmin,
    cevik: sysadmin,
    rapor: infosec ?? sysadmin,
  };

  let changed = false;
  const next: Officers = { ...settings.officers };
  // Bir kişi tek modülün yöneticisi olabilir: kullanılmayan kişi seçilir.
  const taken = new Set(Object.values(next).filter(Boolean));
  const pool = await prisma.person.findMany({
    where: { role: { in: ["UNIT_MANAGER", "SYSTEM_ADMIN", "INFOSEC_MANAGER", "SENIOR_MANAGER", "SUPER_ADMIN"] } },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  for (const def of OFFICER_DEFS) {
    if (next[def.key]) continue;
    const preferred = fallback[def.key];
    const id = preferred && !taken.has(preferred) ? preferred : pool.find((p) => !taken.has(p.id))?.id;
    if (!id) continue;
    next[def.key] = id;
    taken.add(id);
    changed = true;
  }
  if (!changed && !deduped) return settings;
  settings.officers = next;
  await saveSystemSettings(settings);
  return settings;
}
