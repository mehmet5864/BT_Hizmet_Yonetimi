import type { PersonnelRole } from "@/lib/itil/constants";
import type { RequestOffice } from "@/lib/itil/request-types";
import { prisma } from "@/lib/prisma";
import type { OfficerKey, Officers } from "@/lib/settings";
import { getSystemSettings } from "@/lib/settings-store";

export const OFFICE_OFFICER: Record<RequestOffice, OfficerKey> = {
  SISTEM: "sistem",
  NETWORK: "network",
  SIBER: "siber",
  YAZILIM: "yazilim",
  VERITABANI: "veritabani",
  SERVIS: "servis",
};

const MANAGER_ROLES: PersonnelRole[] = [
  "UNIT_MANAGER",
  "SENIOR_MANAGER",
  "SYSTEM_ADMIN",
  "INFOSEC_MANAGER",
  "SUPER_ADMIN",
];

const MODULE_ROLE: Partial<Record<OfficerKey, PersonnelRole[]>> = {
  infosec: ["INFOSEC_MANAGER"],
  siber: ["INFOSEC_MANAGER"],
  zafiyet: ["INFOSEC_MANAGER"],
  olay: ["INFOSEC_MANAGER", "SYSTEM_ADMIN"],
  problem: ["INFOSEC_MANAGER", "SYSTEM_ADMIN"],
  sistem: ["SYSTEM_ADMIN"],
  yama: ["SYSTEM_ADMIN"],
  degisiklik: ["SYSTEM_ADMIN"],
  konfigurasyon: ["SYSTEM_ADMIN"],
  veritabani: ["SYSTEM_ADMIN"],
  network: ["UNIT_MANAGER", "SYSTEM_ADMIN"],
  yazilim: ["UNIT_MANAGER", "SYSTEM_ADMIN"],
  servis: ["UNIT_MANAGER"],
  firmaSla: ["UNIT_MANAGER", "SYSTEM_ADMIN"],
  envanter: ["UNIT_MANAGER", "SYSTEM_ADMIN"],
  zimmet: ["UNIT_MANAGER", "SYSTEM_ADMIN"],
  personel: ["UNIT_MANAGER", "SYSTEM_ADMIN"],
  katalog: ["SYSTEM_ADMIN", "UNIT_MANAGER"],
  bilgi: ["INFOSEC_MANAGER", "SYSTEM_ADMIN"],
  akis: ["SYSTEM_ADMIN"],
  tasarim: ["SYSTEM_ADMIN"],
  kullanilabilirlik: ["SYSTEM_ADMIN"],
  kapasite: ["SYSTEM_ADMIN"],
  sureklilik: ["INFOSEC_MANAGER", "SYSTEM_ADMIN"],
  dogrulama: ["SYSTEM_ADMIN"],
  surum: ["SYSTEM_ADMIN"],
  izleme: ["SYSTEM_ADMIN"],
  degerlendirme: ["UNIT_MANAGER", "SYSTEM_ADMIN"],
  cevik: ["SYSTEM_ADMIN", "UNIT_MANAGER"],
  rapor: ["INFOSEC_MANAGER", "SYSTEM_ADMIN"],
};

async function existingId(id?: string | null) {
  if (!id) return undefined;
  const row = await prisma.person.findUnique({ where: { id }, select: { id: true } });
  return row?.id;
}

export async function officerIdFromSettings(key: OfficerKey, officers?: Officers) {
  const source = officers ?? (await getSystemSettings()).officers;
  return existingId(source[key]);
}

export async function managerByRole(roles: PersonnelRole[], office?: RequestOffice | null) {
  const row = await prisma.person.findFirst({
    where: {
      role: { in: roles },
      ...(office ? { requestOffice: office } : {}),
    },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  if (row) return row.id;
  if (!office) return undefined;
  const anyOffice = await prisma.person.findFirst({
    where: { role: { in: roles } },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  return anyOffice?.id;
}

export async function requesterLineManager(requesterId?: string | null) {
  if (!requesterId) return undefined;
  const person = await prisma.person.findUnique({
    where: { id: requesterId },
    select: { unitManagerId: true, department: { select: { managerId: true } } },
  });
  return existingId(person?.unitManagerId ?? person?.department?.managerId);
}

/** Ayarlar yöneticisi → personel rolü → talep edenin amiri. */
export async function resolveModuleManager(key: OfficerKey, requesterId?: string | null) {
  const officers = (await getSystemSettings()).officers;
  const fromSettings = await officerIdFromSettings(key, officers);
  if (fromSettings) return fromSettings;
  if (key === "siber") {
    const infosec = await officerIdFromSettings("infosec", officers);
    if (infosec) return infosec;
  }
  const roles = MODULE_ROLE[key];
  if (roles?.length) {
    const byRole = await managerByRole(roles);
    if (byRole) return byRole;
  }
  return requesterLineManager(requesterId);
}

export async function resolveOfficeApprover(office: RequestOffice, requesterId?: string | null) {
  const officers = (await getSystemSettings()).officers;
  const key = OFFICE_OFFICER[office];
  const fromOffice = await officerIdFromSettings(key, officers);
  if (fromOffice) return fromOffice;
  if (office === "SIBER") {
    const infosec = await officerIdFromSettings("infosec", officers);
    if (infosec) return infosec;
  }
  const byOfficeRole = await managerByRole(MANAGER_ROLES, office);
  if (byOfficeRole) return byOfficeRole;
  return requesterLineManager(requesterId);
}

export async function officesManagedBy(personId: string) {
  const officers = (await getSystemSettings()).officers;
  const offices = (Object.keys(OFFICE_OFFICER) as RequestOffice[]).filter((office) => {
    const key = OFFICE_OFFICER[office];
    if (officers[key] === personId) return true;
    return office === "SIBER" && officers.infosec === personId;
  });
  return offices;
}

export function isOfficeOfficerKey(key: string): key is OfficerKey {
  return (Object.values(OFFICE_OFFICER) as string[]).includes(key);
}
