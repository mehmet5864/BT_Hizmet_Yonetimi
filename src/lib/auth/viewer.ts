import { canAccessWithAcl, hasModuleLevel, officerGroupsFor, parsePersonGroups, scopesFor, viewerGrantNames, type ModuleLevel } from "@/lib/auth/acl";
import { assignedGroupsFor } from "@/lib/auth/assigned";
import { isPersonnelRole, moduleForPath } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { handledTypesFor } from "@/lib/itil/request-groups";
import { isRequestOffice, type RequestViewer } from "@/lib/itil/request-scope";
import { unitPersonIds } from "@/lib/auth/unit-people";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/actions/shared";
import { getSystemSettings } from "@/lib/settings-store";

export async function getViewer(): Promise<RequestViewer | null> {
  const user = await getSession();
  if (!user) return null;
  const person = await prisma.person.findUnique({
    where: { id: user.id },
    select: { role: true, requestOffice: true, departmentId: true, adGroups: true },
  });
  const role = person && isPersonnelRole(person.role) ? person.role : user.role;
  const requestOffice = isRequestOffice(person?.requestOffice ?? user.requestOffice)
    ? (person?.requestOffice ?? user.requestOffice)
    : null;
  const settings = await getSystemSettings();
  const departmentId = person?.departmentId ?? null;
  const names = [
    ...viewerGrantNames({ role, requestOffice, adGroups: person?.adGroups }),
    ...officerGroupsFor(user.id, settings.officers as Record<string, string>),
  ].map((name) => name.trim().toLocaleLowerCase("tr-TR"));
  // Yetki matrisinde "Alt çalışan verisi" kapsamı seçilmişse birim personeli her rol için hesaplanır.
  const needsUnit = settings.acl.grants.some(
    (grant) => grant.scopes?.includes("UNIT") && names.includes(grant.group.trim().toLocaleLowerCase("tr-TR")),
  );
  const unitIds =
    role === "UNIT_MANAGER" || role === "SYSTEM_ADMIN" || needsUnit
      ? await unitPersonIds({ id: user.id, departmentId })
      : [user.id];
  const groups = [
    ...viewerGrantNames({
      role,
      requestOffice,
      adGroups: person?.adGroups,
    }),
    ...officerGroupsFor(user.id, settings.officers as Record<string, string>),
    ...(role === "USER" ? await assignedGroupsFor(user.id) : []),
  ];
  return {
    id: user.id,
    role,
    requestOffice,
    departmentId,
    unitPersonIds: unitIds,
    handledTypes: handledTypesFor(parsePersonGroups(person?.adGroups), settings.requestGroups),
    requestScopes: scopesFor(settings.acl.grants, groups, "talepler"),
    groups,
  };
}

export async function getViewerAcl() {
  const [viewer, settings] = await Promise.all([getViewer(), getSystemSettings()]);
  return { viewer, grants: settings.acl.grants };
}

/** Menü, pano ve rapor listeleri için: kullanıcı bu yola (modüle) erişebilir mi? Tek kaynak: Yetki matrisi (ACL). */
export async function getAccessChecker(): Promise<(pathname: string) => boolean> {
  const { viewer, grants } = await getViewerAcl();
  if (!viewer) return () => false;
  return (pathname) => canAccessWithAcl(grants, viewer.groups ?? [], pathname, viewer.role);
}

/** Sunucu eylemleri varsayılan olarak "İşle" düzeyi ister; yalnızca görüntüleme yetkisi yazma işlemine yetmez. */
export async function requireModule(pathname: string, needed: ModuleLevel = "HANDLE"): Promise<
  { viewer: RequestViewer; error: null } | { viewer: null; error: ActionState }
> {
  const { viewer, grants } = await getViewerAcl();
  if (!viewer) return { viewer: null, error: { ok: false, message: "Oturum gerekli." } };
  if (!canAccessWithAcl(grants, viewer.groups ?? [], pathname, viewer.role)) {
    return { viewer: null, error: { ok: false, message: "Bu işlem için yetkiniz yok." } };
  }
  const mod = moduleForPath(pathname);
  if (mod && viewer.role !== "SUPER_ADMIN" && !hasModuleLevel(grants, viewer.groups ?? [], mod, needed, viewer.role)) {
    return { viewer: null, error: { ok: false, message: "Bu işlem için yetkiniz yok." } };
  }
  return { viewer, error: null };
}

/** Sayfa düzeyinde: kullanıcı bu modülde yazma ("İşle") yetkisine sahip mi? */
export async function canHandleModule(pathname: string, needed: ModuleLevel = "HANDLE") {
  const { viewer, grants } = await getViewerAcl();
  if (!viewer) return false;
  if (viewer.role === "SUPER_ADMIN") return true;
  const mod = moduleForPath(pathname);
  return mod ? hasModuleLevel(grants, viewer.groups ?? [], mod, needed, viewer.role) : false;
}
