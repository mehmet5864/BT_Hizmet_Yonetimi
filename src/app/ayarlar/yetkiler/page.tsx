import Link from "next/link";

import { ModuleHero } from "@/components/dashboard/module-widgets";
import { AccessCenter } from "@/components/settings/access-center";
import { Button } from "@/components/ui/button";
import { parsePersonGroups } from "@/lib/auth/acl";
import { listAdGroups } from "@/lib/auth/ad-login";
import { getViewer } from "@/lib/auth/viewer";
import { requestOfficeTree } from "@/lib/itil/request-types";
import { prisma } from "@/lib/prisma";
import { publicSettings } from "@/lib/settings";
import { getSystemSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: PageProps<"/ayarlar/yetkiler">) {
  const params = await searchParams;
  const sekme = Array.isArray(params.sekme) ? params.sekme[0] : params.sekme;
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
    prisma.person.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, department: { select: { name: true } } } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, unitType: true, parentId: true, managerId: true } }),
  ]);
  for (const p of withGroups) parsePersonGroups(p.adGroups).forEach((g) => known.add(g.trim()));
  const adGroups = [...known].filter(Boolean).sort((a, b) => a.localeCompare(b, "tr"));

  const requestOffices = requestOfficeTree(settings.officeNames)
    .map((node) => ({
      office: node.office,
      label: node.label,
      rows: node.groups.map((g) => ({
        name: `cat_${node.office}__${g.slug}`,
        label: g.label,
        types: g.types.map((t) => t.label),
        value: settings.requestGroups[g.types[0].key] ?? "",
      })),
    }))
    .filter((o) => o.rows.length);

  const grants = settings.acl.grants;
  // Tutarlılık uyarıları
  const issues: string[] = [];
  const seen = new Map<string, number>();
  for (const g of grants) {
    const key = `${g.module}|${g.group.trim().toLocaleLowerCase("tr-TR")}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dup = [...seen.entries()].filter(([, n]) => n > 1).length;
  if (dup) issues.push(`${dup} modül yetkisi satırı mükerrer; kaydedince en yüksek düzey korunur.`);
  if (!settings.ad.roleMaps.some((m) => m.role === "SUPER_ADMIN") && settings.ad.enabled)
    issues.push("AD açık ama hiçbir AD grubu Süper yönetici rolüne eşlenmemiş; yönetici girişi yalnızca elle atanmış hesaplarla yapılabilir.");
  const mapped = new Set(Object.values(settings.requestGroups).filter(Boolean));
  if (!mapped.size) issues.push("Talep kategorilerine AD grubu eşlenmemiş; talepler yalnızca birim kuyruğuna göre görünür.");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Yetki ve roller"
        description="Rol, AD güvenlik grubu, modül yetkisi ve talep grupları tek yerde. Yetki matrisinde hücrelere tıklayarak rol yetkilerini değiştirin; AD gruplarını sürükleyip bırakarak rollere ve talep kategorilerine eşleyin. Süreç yöneticileri 1. sekmede, talep birimleri 3. sekmededir."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar">Ayarlara dön</Link>
          </Button>
        }
      />
      <AccessCenter
        initialTab={sekme ?? "matris"}
        roleMaps={settings.ad.roleMaps}
        defaultRole={settings.ad.defaultRole}
        grants={grants}
        adGroups={adGroups}
        adNote={adNote}
        requestOffices={requestOffices}
        issues={issues}
        settings={publicSettings(settings)}
        people={people.map((p: { id: string; fullName: string; department?: { name: string } | null }) => ({ id: p.id, label: p.fullName, meta: p.department?.name }))}
        units={units}
      />
    </div>
  );
}
