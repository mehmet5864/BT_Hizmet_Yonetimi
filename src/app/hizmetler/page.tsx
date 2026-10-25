import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ITIL_PRACTICE_MAP } from "@/lib/itil/processes";
import { getAccessChecker, getViewer } from "@/lib/auth/viewer";
import { getTranslator } from "@/lib/i18n";
import { LiveFlow, type FlowStage } from "@/components/itil/live-flow";
import { LiveRefresh } from "@/components/live-refresh";
import { Button } from "@/components/ui/button";
import { getScopedDb } from "@/lib/auth/data-scope";

export const dynamic = "force-dynamic";

export default async function HizmetlerPage() {
  const db = await getScopedDb();
  const [viewer, i18n] = await Promise.all([getViewer(), getTranslator()]);
  const { t } = i18n;
  const role = String(viewer?.role ?? "");
  const accessOk = await getAccessChecker();
  const items = ITIL_PRACTICE_MAP.filter((item) => !role || accessOk(item.href));

  const closedInc = { notIn: ["RESOLVED", "CLOSED"] };
  const closedChg = { notIn: ["COMPLETED", "CLOSED", "REJECTED", "CANCELLED", "IMPLEMENTED"] };
  const [inc, incAll, prb, prbAll, chg, chgAll, pat, patAll, vul, vulAll, prc, prcAll, agi, agiAll] = await Promise.all([
    db.incident.count({ where: { status: closedInc } }),
    db.incident.count(),
    db.problem.count({ where: { status: closedInc } }),
    db.problem.count(),
    db.changeRecord.count({ where: { status: closedChg } }),
    db.changeRecord.count(),
    db.patchRecord.count({ where: { status: { notIn: ["COMPLETED", "CLOSED", "REJECTED", "DEPLOYED"] } } }),
    db.patchRecord.count(),
    db.vulnerability.count({ where: { status: "OPEN" } }),
    db.vulnerability.count(),
    db.itilProcessRecord.count({ where: { status: { notIn: ["CLOSED", "DONE", "COMPLETED"] } } }),
    db.itilProcessRecord.count(),
    db.agileItem.count({ where: { status: { not: "DONE" } } }),
    db.agileItem.count(),
  ]);
  const stages: FlowStage[] = [
    { key: "inc", label: "Olay", href: "/olay", open: inc, total: incAll },
    { key: "prb", label: "Problem", href: "/problem", open: prb, total: prbAll },
    { key: "chg", label: "Değişiklik", href: "/degisiklik", open: chg, total: chgAll },
    { key: "pat", label: "Yama", href: "/yama", open: pat, total: patAll },
    { key: "vul", label: "Zafiyet", href: "/zafiyet", open: vul, total: vulAll },
    { key: "prc", label: "Süreç kayıtları", href: "/surec", open: prc, total: prcAll },
    { key: "agi", label: "Çevik işler", href: "/cevik", open: agi, total: agiAll },
  ].filter((x) => !role || accessOk(x.href));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("hizmetler.title")} description={t("hizmetler.description")} />
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Canlı süreç akışı</CardTitle>
          <div className="flex items-center gap-3">
            <LiveRefresh />
            <Button asChild size="sm" variant="outline">
              <Link href="/hizmetler/harita">İlişki haritası</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/hizmetler/bilgi">Bilgi bankası</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/hizmetler/akis">Süreç akışları</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LiveFlow stages={stages} />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link key={`${item.english}-${item.href}`} href={item.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t(`itil.${item.id}.label`)}</CardTitle>
                  {item.existing ? <Badge variant="outline">1.3.0</Badge> : <Badge>2.0</Badge>}
                </div>
                <CardDescription>{item.english}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-2">
                <p className="text-muted-foreground text-sm">{t(`itil.${item.id}.description`)}</p>
                <ArrowRight className="text-muted-foreground size-4 shrink-0 rtl:rotate-180" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
