"use server";

import { revalidatePath } from "next/cache";

import { canAssignRole, isPersonnelRole } from "@/lib/auth/rbac";
import type { PersonnelRole } from "@/lib/itil/constants";
import { roleByKey } from "@/lib/auth/role-catalog";
import { SERVICE_DESK_OFFICE } from "@/lib/auth/office-map";
import { requireModule } from "@/lib/auth/viewer";
import { isProcessRole, parseProcessRoles, serializeProcessRoles } from "@/lib/itil/process-roles";
import { mergeRequestGroups } from "@/lib/itil/request-groups";
import { prisma } from "@/lib/prisma";
import { getSystemSettings, saveSystemSettings } from "@/lib/settings-store";
import { saved, type ActionState } from "./shared";

/** Rol kataloğu yalnızca Süper Admin tarafından kullanılır. */
async function requireSuperAdmin() {
  const access = await requireModule("/ayarlar");
  if (access.error) return { error: access.error, viewer: null };
  if (access.viewer.role !== "SUPER_ADMIN") return { error: { ok: false, message: "Rolleri yalnızca Süper Admin bağlar." } as ActionState, viewer: null };
  return { error: null, viewer: access.viewer };
}

function revalidateAll() {
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/talepler");
  revalidatePath("/personel");
  revalidatePath("/", "layout");
}

/**
 * Bir rolün bağlı AD gruplarını ve kişilerini kaydeder (tam liste gelir; fark uygulanır).
 *  - sistem rolü: AD grubu → rol eşlemesi, kişide Person.role
 *  - hizmet masası: AD grubu → ofis (SERVIS), kişide requestOffice
 *  - süreç rolü: AD grubu → süreç rolü eşlemesi, kişide Person.processRoles
 */
export async function saveRoleBindings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await requireSuperAdmin();
  if (guard.error || !guard.viewer) return guard.error ?? { ok: false, message: "Yetkisiz işlem." };
  const key = String(formData.get("role") ?? "");
  const def = roleByKey(key);
  if (!def || !def.bindable || def.kind === "team") return { ok: false, message: "Bu role bağlama yapılamaz." };

  let groups: string[] = [];
  let personIds: string[] = [];
  try {
    groups = [...new Set((JSON.parse(String(formData.get("groups") ?? "[]")) as unknown[]).map((g) => String(g).trim()).filter(Boolean))].slice(0, 100);
    personIds = [...new Set((JSON.parse(String(formData.get("people") ?? "[]")) as unknown[]).map(String))].slice(0, 2000);
  } catch {
    return { ok: false, message: "Bağlama verisi okunamadı." };
  }

  const people = await prisma.person.findMany({
    select: { id: true, fullName: true, role: true, roleSource: true, requestOffice: true, processRoles: true, isBuiltin: true },
  });
  const byId = new Map(people.map((p) => [p.id, p]));
  for (const id of personIds) {
    const person = byId.get(id);
    if (!person) return { ok: false, message: "Listedeki bir kişi bulunamadı." };
    if (person.isBuiltin || person.role === "SUPER_ADMIN") return { ok: false, message: `${person.fullName}: yerleşik Süper Admin hesabına rol bağlanamaz.` };
    // Supervisor salt okunurdur: görev (süreç rolü / hizmet masası) verilemez.
    if (person.role === "SUPERVISOR" && def.kind !== "system") return { ok: false, message: `${person.fullName} Supervisor (salt okunur); görev verilemez.` };
  }
  if (def.kind === "system" && !canAssignRole(guard.viewer.role, key)) return { ok: false, message: "Bu rolü atama yetkiniz yok." };

  const settings = await getSystemSettings();
  if (def.kind === "system") {
    settings.ad.roleMaps = [...settings.ad.roleMaps.filter((m) => m.role !== key), ...groups.map((group) => ({ group, role: key as PersonnelRole }))];
  } else if (def.kind === "desk") {
    settings.ad.officeMaps = groups.map((group) => ({ group, office: SERVICE_DESK_OFFICE }));
  } else if (isProcessRole(key)) {
    settings.ad.processRoleMaps = [...settings.ad.processRoleMaps.filter((m) => m.role !== key), ...groups.map((group) => ({ group, role: key }))];
  }
  await saveSystemSettings(settings);

  const wanted = new Set(personIds);
  for (const person of people) {
    if (person.isBuiltin || person.role === "SUPER_ADMIN") continue;
    const want = wanted.has(person.id);
    if (def.kind === "system") {
      if (want && person.role !== key) {
        await prisma.person.update({ where: { id: person.id }, data: { role: key, roleSource: person.roleSource === "AD" ? "BOTH" : person.roleSource } });
      } else if (!want && person.role === key && person.roleSource !== "AD" && isPersonnelRole(person.role)) {
        await prisma.person.update({ where: { id: person.id }, data: { role: "USER" } });
      }
    } else if (def.kind === "desk") {
      if (want && person.requestOffice !== SERVICE_DESK_OFFICE) await prisma.person.update({ where: { id: person.id }, data: { requestOffice: SERVICE_DESK_OFFICE } });
      else if (!want && person.requestOffice === SERVICE_DESK_OFFICE) await prisma.person.update({ where: { id: person.id }, data: { requestOffice: null } });
    } else if (isProcessRole(key)) {
      const current = parseProcessRoles(person.processRoles);
      const has = current.includes(key);
      if (want && !has) await prisma.person.update({ where: { id: person.id }, data: { processRoles: serializeProcessRoles([...current, key]) } });
      else if (!want && has) await prisma.person.update({ where: { id: person.id }, data: { processRoles: serializeProcessRoles(current.filter((r) => r !== key)) } });
    }
  }
  await prisma.activityLog.create({ data: { entityType: "role", entityId: key, action: "ROLE_BINDINGS", note: `${def.label}: ${groups.length} AD grubu, ${personIds.length} kişi bağlandı.` } });
  revalidateAll();
  return saved(undefined, `${def.label}: ${groups.length} AD grubu ve ${personIds.length} kişi bağlandı.`);
}

/** Talep karşılayan ekipler: talep türü → AD grubu yönlendirmesi (eskalasyon gruba yapılır). */
export async function saveTeamRouting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await requireSuperAdmin();
  if (guard.error || !guard.viewer) return guard.error ?? { ok: false, message: "Yetkisiz işlem." };
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("routing") ?? "{}"));
  } catch {
    return { ok: false, message: "Yönlendirme verisi okunamadı." };
  }
  const settings = await getSystemSettings();
  settings.requestGroups = mergeRequestGroups(raw);
  await saveSystemSettings(settings);
  revalidateAll();
  return saved(undefined, "Talep yönlendirmesi kaydedildi.");
}

export async function saveDefaultRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await requireSuperAdmin();
  if (guard.error || !guard.viewer) return guard.error ?? { ok: false, message: "Yetkisiz işlem." };
  const role = String(formData.get("defaultRole") ?? "");
  const settings = await getSystemSettings();
  settings.ad.defaultRole = isPersonnelRole(role) && role !== "SUPER_ADMIN" && role !== "SUPERVISOR" ? role : "USER";
  await saveSystemSettings(settings);
  revalidateAll();
  return saved(undefined, "Varsayılan rol kaydedildi.");
}

