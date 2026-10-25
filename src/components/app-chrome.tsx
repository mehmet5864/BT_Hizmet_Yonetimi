import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ensureLocalPasswords } from "@/lib/actions/auth";
import { ACL_MODULES, canAccessWithAcl, hasModuleLevel } from "@/lib/auth/acl";
import { isPersonnelRole } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { getViewerAcl } from "@/lib/auth/viewer";
import { isRequestOffice, scopedRequestOffices } from "@/lib/itil/request-scope";
import { getInbox } from "@/lib/inbox";
import { getLicensedModules } from "@/lib/license";
import { moduleForPath } from "@/lib/auth/rbac";
import { getOfficeNames, getSystemSettings } from "@/lib/settings-store";

export async function AppChrome({ children }: { children: React.ReactNode }) {
  try {
    await ensureLocalPasswords();
  } catch {
    // Veritabanı hazır değilse (ör. derleme anı) kabuk yine de çizilir.
  }
  const user = await getSession();
  if (!user) return <AppShell user={null}>{children}</AppShell>;

  const { viewer, grants } = await getViewerAcl();
  if (viewer) {
    if (viewer.role && isPersonnelRole(viewer.role)) user.role = viewer.role;
    if (isRequestOffice(viewer.requestOffice)) user.requestOffice = viewer.requestOffice;
  }

  const pathname = (await headers()).get("x-pathname") ?? "/";
  if (
    pathname !== "/yetkisiz" &&
    !canAccessWithAcl(grants, viewer?.groups ?? [], pathname, viewer?.role ?? user.role)
  ) {
    redirect("/yetkisiz");
  }

  const licensed = await getLicensedModules();
  const pathMod = moduleForPath(pathname);
  if (licensed && pathMod && !licensed.has(pathMod) && pathname !== "/yetkisiz") {
    redirect("/yetkisiz?neden=lisans");
  }

  const groups = viewer?.groups ?? [];
  const role = viewer?.role ?? user.role;
  const allowedModules = ACL_MODULES.filter(
    (mod) => (!licensed || licensed.has(mod)) && hasModuleLevel(grants, groups, mod, "VIEW", role),
  );
  if (isPersonnelRole(role) && (!licensed || licensed.has("hareketler")) && !allowedModules.includes("hareketler")) allowedModules.push("hareketler");
  const inventoryAdmin = hasModuleLevel(grants, groups, "envanter", "ADMIN", role);

  const [inbox, requestOffices, officeNames, settings] = await Promise.all([
    getInbox(),
    Promise.resolve(scopedRequestOffices({ role: user.role, requestOffice: user.requestOffice, requestScopes: viewer?.requestScopes })),
    getOfficeNames(),
    getSystemSettings(),
  ]);

  return (
    <AppShell
      user={user}
      requestOffices={requestOffices}
      allowedModules={allowedModules}
      inventoryAdmin={inventoryAdmin}
      inbox={inbox}
      officeNames={officeNames}
      itilV2={settings.layout.itilV2}
    >
      {children}
    </AppShell>
  );
}
