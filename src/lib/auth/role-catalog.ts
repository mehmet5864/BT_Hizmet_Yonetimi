/**
 * Rol kataloğu: uygulamadaki tüm roller tek listede. Roller koda sabittir; Ayarlar'da yalnızca AD gruplarına ve kişilere bağlanır.
 *  - system:  sistem rolü (kişide tek)         - desk: hizmet masası (ilk karşılama)
 *  - team:    talep karşılayan ekip (talep türü → AD grubu yönlendirmesi)
 *  - process: ITIL süreç / modül yöneticisi (kişide birden çok)
 */
import { defaultModuleGrants, MODULE_LEVEL_LABELS, type ModuleLevel } from "@/lib/auth/acl";
import { MODULE_LABELS, type AppModule } from "@/lib/auth/rbac";
import { PROCESS_ROLE_AD_HINTS, PROCESS_ROLE_CATEGORIES, PROCESS_ROLE_DEFAULTS, PROCESS_ROLE_LABELS, PROCESS_ROLES } from "@/lib/itil/process-roles";

export type RoleKind = "system" | "desk" | "team" | "process";
export type RoleDef = {
  key: string;
  kind: RoleKind;
  label: string;
  category: string;
  description: string;
  adHint?: string;
  /** false: gruba / kişiye bağlanmaz (varsayılan rol ya da yerleşik hesap). */
  bindable: boolean;
};

export const DESK_KEY = "DESK";
export const TEAM_KEY = "TEAM";

const SYSTEM: RoleDef[] = [
  { key: "SUPER_ADMIN", kind: "system", label: "Süper Admin", category: "Sistem rolleri", description: "Yalnızca yerleşik BTHS_Admin hesabı. Her şeyi yönetir; iş (içerik) verisini görmez ve işlem yapmaz.", bindable: false },
  { key: "SYSTEM_ADMIN", kind: "system", label: "ServisAdmin", category: "Sistem rolleri", description: "Talep karşılayan teknik personel (hizmet masası ve ekipler). Kendi kuyruğundaki talepleri işler.", adHint: "GG_SistemYoneticileri", bindable: true },
  { key: "UNIT_MANAGER", kind: "system", label: "Manager (amir)", category: "Sistem rolleri", description: "Alt çalışanlarının tüm bilgilerini görür. AD'de amir bilgisi varsa oradan gelir, yoksa elle bağlanır.", adHint: "GG_Amirler", bindable: true },
  { key: "USER", kind: "system", label: "User", category: "Sistem rolleri", description: "Çağrı açar, süreçlerde görevlendirilebilir; yalnızca kendi bilgilerini ve dahil edildiği işleri görür. Varsayılan roldür, bağlama gerekmez.", bindable: false },
  { key: "SUPERVISOR", kind: "system", label: "Supervisor (denetmen)", category: "Sistem rolleri", description: "Her işlemi ve herkesin verisini görür, hiçbir işlem yapamaz. Denetmen ve müfettişlere verilir.", adHint: "GG_Denetmenler", bindable: true },
];

const TALEP: RoleDef[] = [
  { key: DESK_KEY, kind: "desk", label: "Hizmet masası", category: "Talep işleme", description: "İlk karşılayan ekip: gelen talepleri alır ve doğru ekibe eskale eder. ServisAdmin rolü de gerekir.", adHint: "GG_HizmetMasasi", bindable: true },
  { key: TEAM_KEY, kind: "team", label: "Talep karşılayan ekipler", category: "Talep işleme", description: "Hangi talep türünün hangi AD grubuna eskale edileceği (ör. Güvenlik duvarı → FW_Admins, NAC istisna → NAC_Admins). Eskalasyon gruba yapılır, kişiye değil.", bindable: true },
];

const PROCESS_DESCRIPTIONS: Partial<Record<(typeof PROCESS_ROLES)[number], string>> = {
  PROCESS_MGR: "Yayın, izleme, hizmet tasarımı, kullanılabilirlik, kapasite, süreklilik, test, değerlendirme, bilgi bankası ve süreç akışı süreçlerinin; ayrıca Konfigürasyon (CMDB), Hizmet kataloğu, Firma/SLA, Çevik ve Raporlar modüllerinin ortak yöneticisi.",
  SECURITY_MGR: "Bilgi güvenliği (BGYS): zafiyet modülünün yöneticisi.",
};

const PROCESS: RoleDef[] = PROCESS_ROLES.map((key) => ({
  key,
  kind: "process" as const,
  label: PROCESS_ROLE_LABELS[key],
  category: PROCESS_ROLE_CATEGORIES[key],
  description: PROCESS_DESCRIPTIONS[key] ?? "",
  adHint: PROCESS_ROLE_AD_HINTS[key],
  bindable: true,
}));

export const ROLE_CATALOG: RoleDef[] = [...SYSTEM, ...TALEP, ...PROCESS];
export const ROLE_CATEGORIES = ["Sistem rolleri", "Talep işleme", "Süreç ve modül yöneticileri"];

export const roleByKey = (key: string) => ROLE_CATALOG.find((r) => r.key === key);

/** Rolün yapabildikleri: modül ve düzey olarak, kısa metinler. */
export function roleCapabilities(def: RoleDef): string[] {
  const rows: { module: AppModule; level: ModuleLevel }[] = [];
  if (def.kind === "system") {
    for (const g of defaultModuleGrants()) if (g.group === `role:${def.key}` && g.module !== "dashboard") rows.push({ module: g.module, level: g.level });
  } else if (def.kind === "process") {
    for (const [mod, level] of Object.entries(PROCESS_ROLE_DEFAULTS[def.key as keyof typeof PROCESS_ROLE_DEFAULTS] ?? {})) rows.push({ module: mod as AppModule, level: level as ModuleLevel });
  } else if (def.kind === "desk") return ["Talep yönetimi: tüm hizmet masası taleplerini alır, eskale eder"];
  else return ["Talep yönetimi: yalnızca kendi grubuna yönlendirilen talep türleri"];
  if (def.key === "SUPER_ADMIN") return ["Ayarlar ve personel yönetimi; içerik modüllerinde yetkisiz"];
  if (def.key === "SUPERVISOR") return ["Tüm modüller: yalnızca görüntüler (Ayarlar ve API hariç)"];
  const byLevel = new Map<ModuleLevel, string[]>();
  for (const r of rows) byLevel.set(r.level, [...(byLevel.get(r.level) ?? []), MODULE_LABELS[r.module]]);
  return (["ADMIN", "HANDLE", "VIEW"] as ModuleLevel[]).filter((l) => byLevel.has(l)).map((l) => `${MODULE_LEVEL_LABELS[l]}: ${byLevel.get(l)!.join(", ")}`);
}
