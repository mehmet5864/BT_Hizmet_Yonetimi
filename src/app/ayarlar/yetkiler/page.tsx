import Link from "next/link";

import { ModuleHero } from "@/components/dashboard/module-widgets";
import { RoleCatalog, type CatalogRole, type RoleBinding } from "@/components/settings/role-catalog";
import { DefaultRoleForm } from "@/components/settings/default-role-form";
import { OfficersForm, UnitsForms } from "@/components/settings/org-forms";
import { Button } from "@/components/ui/button";
import { parsePersonGroups } from "@/lib/auth/acl";
import { listAdGroups } from "@/lib/auth/ad-login";
import { getViewer } from "@/lib/auth/viewer";
import { ROLE_CATALOG, ROLE_CATEGORIES, roleCapabilities, DESK_KEY } from "@/lib/auth/role-catalog";
import { SERVICE_DESK_OFFICE } from "@/lib/auth/office-map";
import { isProcessRole, parseProcessRoles } from "@/lib/itil/process-roles";
import { mergeRequestGroups } from "@/lib/itil/request-groups";
import { REQUEST_TYPE_LIST } from "@/lib/itil/request-types";
import { prisma } from "@/lib/prisma";
import { publicSettings } from "@/lib/settings";
import { getSystemSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "SUPER_ADMIN") {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <ModuleHero title="Yetki ve roller" description="Bu ayar yalnızca süper yönetici tarafından yönetilir." />
      </div>
    );
  }
  const settings = await getSystemSettings();

  // Seçilebilecek AD grupları: AD'den canlı okunanlar + kişilerin girişte gelen grupları.
  const known = new Set<string>();
  let adNote = "AD entegrasyonu kapalı; kişilerin son girişlerinde gelen gruplar önerilir, grup adını elle de yazabilirsiniz.";
  if (settings.ad.enabled) {
    try {
      const live = await listAdGroups(settings.ad);
      live.groups.forEach((g) => known.add(g));
      adNote = live.ok ? `AD'den ${live.groups.length} grup okundu.` : `AD grupları okunamadı: ${live.message} Kişilerin girişte gelen grupları önerilir.`;
    } catch (error) {
      adNote = `AD grupları okunamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}. Kişilerin girişte gelen grupları önerilir.`;
    }
  }
  const [withGroups, people, units] = await Promise.all([
    prisma.person.findMany({ where: { adGroups: { not: null } }, select: { adGroups: true }, take: 5000 }),
    prisma.person.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, role: true, requestOffice: true, processRoles: true, isBuiltin: true, department: { select: { name: true } } } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, unitType: true, parentId: true, managerId: true } }),
  ]);
  for (const p of withGroups) parsePersonGroups(p.adGroups).forEach((g) => known.add(g.trim()));
  const adGroups = [...known].filter(Boolean).sort((a, b) => a.localeCompare(b, "tr"));

  const peopleItems = people.map((p) => ({ id: p.id, label: p.fullName, meta: p.department?.name }));
  const roles: CatalogRole[] = ROLE_CATALOG.map((r) => ({ ...r, description: r.description, adHint: r.adHint, capabilities: roleCapabilities(r) }));

  const bindings: Record<string, RoleBinding> = {};
  for (const r of ROLE_CATALOG) {
    if (!r.bindable || r.kind === "team") continue;
    let groups: string[] = [];
    let ids: string[] = [];
    if (r.kind === "system") {
      groups = settings.ad.roleMaps.filter((m) => m.role === r.key).map((m) => m.group);
      ids = people.filter((p) => p.role === r.key && !p.isBuiltin).map((p) => p.id);
    } else if (r.key === DESK_KEY) {
      groups = settings.ad.officeMaps.filter((m) => m.office === SERVICE_DESK_OFFICE).map((m) => m.group);
      ids = people.filter((p) => p.requestOffice === SERVICE_DESK_OFFICE).map((p) => p.id);
    } else if (isProcessRole(r.key)) {
      groups = settings.ad.processRoleMaps.filter((m) => m.role === r.key).map((m) => m.group);
      ids = people.filter((p) => parseProcessRoles(p.processRoles).includes(r.key as never)).map((p) => p.id);
    }
    bindings[r.key] = { groups, people: ids };
  }
  const catalogPeople = people.map((p) => ({ id: p.id, label: p.fullName, locked: p.isBuiltin || p.role === "SUPER_ADMIN" }));
  const routing = mergeRequestGroups(settings.requestGroups);
  const types = REQUEST_TYPE_LIST.map((t) => ({ key: t.key as string, label: t.label, group: t.group }));

  // Tutarlılık uyarıları
  const issues: string[] = [];
  if (settings.ad.roleMaps.some((m) => m.role === "SUPER_ADMIN"))
    issues.push("Bir AD grubu Süper Admin rolüne eşlenmiş; bu eşleme etkisizdir (Süper Admin yalnızca yerleşik BTHS_Admin hesabıdır).");
  if (!Object.values(settings.requestGroups).some(Boolean))
    issues.push("Hiçbir talep türü bir AD grubuna bağlı değil; “Talep karşılayan ekipler” bölümünden yönlendirin.");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Yetki ve roller"
        description="Roller uygulamada sabittir. Soldan rolü seçin, sağda hangi AD gruplarına ve kişilere bağlı olduğunu belirleyin."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar">Ayarlara dön</Link>
          </Button>
        }
      />
      <RoleCatalog roles={roles} categories={ROLE_CATEGORIES} bindings={bindings} people={catalogPeople} adGroups={adGroups} adNote={adNote} routing={routing} types={types} issues={issues} />

      <details>
        <summary className="bg-card hover:bg-accent cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium">
          Varsayılan rol <span className="text-muted-foreground font-normal">(hiçbir kayda uymayan AD kullanıcısı)</span>
        </summary>
        <div className="mt-3"><DefaultRoleForm value={settings.ad.defaultRole} /></div>
      </details>
      <details>
        <summary className="bg-card hover:bg-accent cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium">
          Varsayılan yöneticiler ve birim onaycıları <span className="text-muted-foreground font-normal">(şube yöneticileri dahil: yeni kayıtlarda yönetici alanı ve onaylar)</span>
        </summary>
        <div className="mt-3"><OfficersForm settings={publicSettings(settings)} people={peopleItems} /></div>
      </details>
      <details>
        <summary className="bg-card hover:bg-accent cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium">
          Kurum yapısı <span className="text-muted-foreground font-normal">(birimler, amirler, ofis adları)</span>
        </summary>
        <div className="mt-3"><UnitsForms settings={publicSettings(settings)} people={peopleItems} units={units} /></div>
      </details>
    </div>
  );
}
