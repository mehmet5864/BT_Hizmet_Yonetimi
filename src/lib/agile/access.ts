import { getViewerAcl } from "@/lib/auth/viewer";
import { canAccessWithAcl } from "@/lib/auth/acl";

/** Kayıt detayında "Çevik iş aç" düğmesi: yalnızca Çevik çalışma modülüne erişimi olana gösterilir. */
export async function agileTypeFor(type: string) {
  const { viewer, grants } = await getViewerAcl();
  if (!viewer) return undefined;
  return canAccessWithAcl(grants, viewer.groups ?? [], "/cevik", viewer.role) ? type : undefined;
}
