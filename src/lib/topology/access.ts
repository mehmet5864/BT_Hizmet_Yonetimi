/** Topoloji ve erişim izni ekranlarını görebilen / düzenleyebilen roller. */
export const TOPOLOGY_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "INFOSEC_MANAGER"] as const;

export function canUseTopology(role: string | null | undefined) {
  return !!role && (TOPOLOGY_ROLES as readonly string[]).includes(role);
}
