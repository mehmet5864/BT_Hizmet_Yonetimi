import Link from "next/link";

import { LicenseForm } from "@/components/settings/license-form";
import { ModuleHero } from "@/components/dashboard/module-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { getLicenseState, LICENSABLE_MODULES } from "@/lib/license";
import { MODULE_LABELS, type AppModule } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  valid: "Geçerli",
  expiring: "Süresi yaklaşıyor",
  grace: "Ek süre",
  expired: "Süresi doldu",
  invalid: "Geçersiz",
  trial: "Deneme",
};

export default async function LicensePage() {
  const viewer = await getViewer();
  if (viewer?.role !== "SUPER_ADMIN") {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <ModuleHero title="Lisans" description="Lisans yalnızca süper yönetici tarafından görüntülenir ve yüklenir." />
      </div>
    );
  }
  const s = await getLicenseState();
  const pct = Math.min(100, Math.round((s.used / Math.max(1, s.maxUsers)) * 100));
  const rows: [string, string][] = [
    ["Durum", STATUS_LABEL[s.status] ?? s.status],
    ["Müşteri", s.customer],
    ["Lisans no", s.licenseId],
    ["Kullanıcı sınırı", s.maxUsers.toLocaleString("tr-TR")],
    ["Kullanılan", `${s.used.toLocaleString("tr-TR")} (%${pct})`],
    ["Kalan", s.remaining.toLocaleString("tr-TR")],
    ["Bitiş", s.expires ? new Date(s.expires).toLocaleDateString("tr-TR") : "Süresiz"],
    ["Mod", s.restricted ? "Kısıtlı (çekirdek modüller)" : "Tam"],
  ];
  const open = new Set<string>(s.modules ?? LICENSABLE_MODULES);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Lisans"
        description="Kullanıcı sayısı ve süre sınırı. Lisans anahtarı çevrimdışı doğrulanır."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar">Ayarlara dön</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mevcut lisans</CardTitle>
          <CardDescription>{s.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground text-xs">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modüller</CardTitle>
          <CardDescription>
            {s.modules ? "Lisansla açılan modüller işaretlidir." : "Lisansta tüm modüller açıktır."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1 sm:grid-cols-2">
            {LICENSABLE_MODULES.map((mod) => (
              <li key={mod} className="flex items-center gap-2 text-sm">
                <span className={`size-2 rounded-full ${open.has(mod) ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden />
                <span className={open.has(mod) ? "" : "text-muted-foreground"}>{MODULE_LABELS[mod as AppModule]}</span>
                <span className="text-muted-foreground ms-auto text-xs">{open.has(mod) ? "Açık" : "Kapalı"}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <LicenseForm />
    </div>
  );
}
