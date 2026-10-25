import Link from "next/link";

import { ModuleHero } from "@/components/dashboard/module-widgets";
import { RequestGroupsForm } from "@/components/settings/request-groups-form";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { requestOfficeTree } from "@/lib/itil/request-types";
import { listAdGroups } from "@/lib/auth/ad-login";
import { parsePersonGroups } from "@/lib/auth/acl";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export default async function RequestGroupsPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "SUPER_ADMIN") {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <ModuleHero title="Talep grupları" description="Bu ayar yalnızca süper yönetici tarafından yönetilir." />
      </div>
    );
  }
  const settings = await getSystemSettings();

  // Eşleme için seçilebilecek AD grupları: AD'den canlı okunanlar + kişilerin girişte gelen grupları.
  const known = new Set<string>();
  let adNote = "AD entegrasyonu kapalı. Aşağıda kişilerin son girişlerinde gelen gruplar önerilir; grup adını elle de yazabilirsiniz.";
  if (settings.ad.enabled) {
    try {
      const live = await listAdGroups(settings.ad);
      live.groups.forEach((g) => known.add(g));
      adNote = live.ok ? `AD'den ${live.groups.length} grup okundu.` : `AD grupları okunamadı: ${live.message} Kişilerin girişte gelen grupları önerilir.`;
    } catch (error) {
      adNote = `AD grupları okunamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}. Kişilerin girişte gelen grupları önerilir.`;
    }
  }
  const people = await prisma.person.findMany({ where: { adGroups: { not: null } }, select: { adGroups: true }, take: 5000 });
  for (const p of people) parsePersonGroups(p.adGroups).forEach((g) => known.add(g.trim()));
  const adGroups = [...known].filter(Boolean).sort((a, b) => a.localeCompare(b, "tr"));
  const offices = requestOfficeTree(settings.officeNames)
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Talep grupları (AD güvenlik grubu)"
        description="Her talep kategorisi için talebi karşılayacak Active Directory güvenlik grubunu yazın (örn. Güvenlik duvarı → fw_admins, NAC → Nac_admins, AD grup ve yetki → DC_admins). Kategorideki tüm talep türleri aynı grubu kullanır. Gruba üye olanlar o talepleri görür, işler ve onaylanan talep üyelerden en az işi olana atanır. Alanı boş bırakırsanız yalnızca birim kuyruğu geçerli olur. Grup üyeliği, Active Directory ile girişte güncellenir."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar">Ayarlara dön</Link>
          </Button>
        }
      />
      <RequestGroupsForm offices={offices} adGroups={adGroups} adNote={adNote} />
    </div>
  );
}
