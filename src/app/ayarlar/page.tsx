import { redirect } from "next/navigation";
import { ArchiveRestore, BadgeCheck, KeyRound, Lock, Mail, Palette, Radar, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { Button } from "@/components/ui/button";
import { SettingsForms } from "@/components/settings/settings-forms";
import { getActivityDashboard } from "@/lib/module-stats";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/auth/viewer";
import { getLicenseState } from "@/lib/license";
import { defaultScorePoints, SCORE_ACTIONS, SCORE_MODULES, SCORE_SEVERITIES } from "@/lib/scoring-defs";
import { CORE_OFFICER_KEYS, OFFICER_DEFS, officerCount, publicSettings } from "@/lib/settings";
import { ensureSystemSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: PageProps<"/ayarlar">) {
  const params = await searchParams;
  const sekme = Array.isArray(params.sekme) ? params.sekme[0] : params.sekme;
  if (sekme === "api") redirect("/api-arayuzu");
  const [viewer, scoreRows] = await Promise.all([getViewer(), prisma.scoreRule.findMany()]);
  const isSuper = viewer?.role === "SUPER_ADMIN";
  const license = isSuper ? await getLicenseState() : null;
  const scorePoints: Record<string, number> = {};
  for (const mod of SCORE_MODULES)
    for (const act of SCORE_ACTIONS)
      for (const sev of SCORE_SEVERITIES) scorePoints[`${mod.key}|${act}|${sev}`] = defaultScorePoints(mod.key, act, sev);
  for (const row of scoreRows) scorePoints[`${row.module}|${row.action}|${row.severity}`] = row.points;
  const [settings, logs, dash, people, units] = await Promise.all([
    ensureSystemSettings().then(publicSettings),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { asset: { select: { id: true, name: true, stockNo: true, assetType: true } } },
    }),
    getActivityDashboard(),
    prisma.person.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, department: { select: { name: true } } },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, unitType: true, parentId: true, managerId: true } }),
  ]);
  const approvalsOn = [settings.approval.unitManager, settings.approval.seniorManager, settings.approval.infosec].filter(Boolean).length;
  const officersOn = officerCount(settings.officers);
  const coreOn = CORE_OFFICER_KEYS.filter((key) => settings.officers[key]).length;
  const officerNames = new Map(people.map((person) => [person.id, person.fullName]));
  const officerHint = OFFICER_DEFS.map((def) => officerNames.get(settings.officers[def.key]))
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 4)
    .join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Ayarlar"
        description="Süreç yöneticileri, Active Directory, SIEM, zafiyet tarama, yönetici onayları, grup bazlı modül yetkileri, e-posta, tema, ayar yedeği (export / import config) ve audit log. API anahtarları API arayüzü sayfasındadır."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/ayarlar/lisans">Lisans</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/ayarlar/is-akislari">İş akışları</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/ayarlar/guvenlik">Güvenlik</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/api-arayuzu#anahtarlar">API anahtarlarına git</Link>
            </Button>
          </div>
        }
      />
      <WidgetRow>
        <StatWidget
          icon={<Users className="size-4" />}
          label="Temel süreç yöneticileri"
          value={`${coreOn}/${CORE_OFFICER_KEYS.length}`}
          hint={coreOn ? `Toplam ${officersOn}/${OFFICER_DEFS.length} · ${officerHint}` : "Önce şube ve onay yöneticilerini seçin"}
          href="/ayarlar?sekme=tanimlar"
          tone={coreOn === CORE_OFFICER_KEYS.length ? "ok" : coreOn > 0 ? "info" : "warning"}
          bar={Math.round((coreOn / CORE_OFFICER_KEYS.length) * 100)}
        />
        <StatWidget
          icon={<Palette className="size-4" />}
          label="Aktif onay"
          value={approvalsOn}
          hint="Birim / üst amir / bilgi güvenliği"
          href="/ayarlar?sekme=approval"
          tone={approvalsOn > 0 ? "info" : "default"}
        />
        {license ? (
          <StatWidget
            icon={<BadgeCheck className="size-4" />}
            label="Lisans"
            value={`${license.used.toLocaleString("tr-TR")}/${license.maxUsers.toLocaleString("tr-TR")}`}
            hint={license.message}
            href="/ayarlar/lisans"
            tone={license.status === "valid" ? "ok" : license.status === "expiring" || license.status === "trial" ? "warning" : "danger"}
            bar={Math.min(100, Math.round((license.used / Math.max(1, license.maxUsers)) * 100))}
          />
        ) : null}
        {isSuper ? (
          <StatWidget
            icon={<Lock className="size-4" />}
            label="Güvenlik"
            value="Parola · Oturum"
            hint="Parola kuralı, hesap kilidi, oturum süresi"
            href="/ayarlar/guvenlik"
            tone="info"
          />
        ) : null}
        <StatWidget
          icon={<ArchiveRestore className="size-4" />}
          label="Ayar yedeği"
          value="Export / Import"
          hint="Konfigürasyonu JSON olarak al veya yükle"
          href="/ayarlar?sekme=yedek"
          tone="info"
        />
      </WidgetRow>
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-xl border p-3">
        <span className="text-muted-foreground me-1 text-xs font-semibold tracking-wide uppercase">Bağlantılar</span>
        {[
          { icon: KeyRound, label: "Active Directory", on: settings.ad.enabled, tab: "ad", hint: settings.ad.host },
          { icon: ShieldCheck, label: "SIEM", on: settings.siem.enabled, tab: "siem", hint: settings.siem.host },
          { icon: Radar, label: "Zafiyet tarama", on: settings.scanner.enabled || settings.scanner.useDemoFeed, tab: "scanner", hint: settings.scanner.useDemoFeed ? "örnek kaynak" : settings.scanner.host },
          { icon: Mail, label: "SMTP e-posta", on: settings.mail.enabled, tab: "mail", hint: settings.mail.host },
        ].map(({ icon: Icon, label, on, tab, hint }) => (
          <Link
            key={tab}
            href={`/ayarlar?sekme=${tab}`}
            className="hover:bg-accent flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors"
          >
            <span className={`size-2 rounded-full ${on ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden />
            <Icon className="text-muted-foreground size-3.5" />
            <span className="font-medium">{label}</span>
            <span className="text-muted-foreground">{on ? hint || "Açık" : "Kapalı"}</span>
          </Link>
        ))}
      </div>
      <SettingsForms
        settings={settings}
        people={people.map((person) => ({
          id: person.id,
          label: person.fullName,
          meta: person.department?.name,
        }))}
        initialTab={sekme}
        scorePoints={scorePoints}
        canEditScore={isSuper}
        units={units}
        audit={{
          totals: {
            total: dash.total,
            created: dash.created,
            updated: dash.updated,
            deleted: dash.deleted,
          },
          logs: logs.map((log) => ({
            id: log.id,
            action: log.action,
            note: log.note,
            actor: log.actor,
            createdAt: log.createdAt.toISOString(),
            changes: log.changes,
            entityType: log.entityType,
            asset: log.asset,
          })),
        }}
      />
    </div>
  );
}
