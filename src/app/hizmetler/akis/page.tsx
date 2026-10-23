import Link from "next/link";

import { CheckCircle2, GitBranch, Layers, PlayCircle } from "lucide-react";

import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteProcessTemplate, startProcessFlow } from "@/lib/actions/process-flow";
import { prisma } from "@/lib/prisma";
import { BUILTIN_TEMPLATES, FLOW_KIND_LABELS, parseSteps, type TemplateStep } from "@/lib/process-flow";

export const dynamic = "force-dynamic";

function Chain({ steps }: { steps: TemplateStep[] }) {
  return (
    <p className="text-muted-foreground text-xs">
      {steps.map((s) => FLOW_KIND_LABELS[s.kind]).join(" → ")}
    </p>
  );
}

export default async function AkisPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;
  const [custom, flows] = await Promise.all([
    prisma.processTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.processFlow.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { steps: true } }),
  ]);
  const templates = [
    ...BUILTIN_TEMPLATES.map((t) => ({ key: t.key, name: t.name, description: t.description, steps: t.steps, id: null as string | null })),
    ...custom.map((t) => ({ key: t.id, name: t.name, description: t.description ?? "", steps: parseSteps(t.steps), id: t.id as string | null })),
  ];

  const doneFlows = flows.filter((flow) => flow.steps.length > 0 && flow.steps.every((step) => step.recordId)).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Süreç akışları"
        description="Şablondan akış başlatın; her adıma bir kayıt bağlayın, ilerlemeyi canlı izleyin."
        actions={
          <Button asChild variant="outline">
            <Link href="/hizmetler/akis/sablon/yeni">Yeni şablon</Link>
          </Button>
        }
      />
      <WidgetRow>
        <StatWidget icon={<Layers className="size-4" />} label="Şablon" value={templates.length} hint={`${BUILTIN_TEMPLATES.length} hazır · ${custom.length} özel`} href="/hizmetler/akis" tone="info" />
        <StatWidget icon={<GitBranch className="size-4" />} label="Akış" value={flows.length} hint="Başlatılmış akışlar" href="/hizmetler/akis" />
        <StatWidget icon={<PlayCircle className="size-4" />} label="Süren akış" value={flows.length - doneFlows} hint="Bağlanmamış adımı olan" href="/hizmetler/akis" tone={flows.length - doneFlows > 0 ? "warning" : "ok"} />
        <StatWidget icon={<CheckCircle2 className="size-4" />} label="Tamamlanan" value={doneFlows} hint="Tüm adımlara kayıt bağlı" href="/hizmetler/akis" tone="ok" bar={flows.length ? Math.round((doneFlows / flows.length) * 100) : 0} />
      </WidgetRow>
      {hata ? <p className="text-destructive rounded-md border border-destructive/30 px-3 py-2 text-sm">{hata}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.key}>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                {t.name}
                {t.id ? null : <Badge variant="outline">Hazır</Badge>}
              </CardTitle>
              <p className="text-muted-foreground text-sm">{t.description}</p>
              <Chain steps={t.steps} />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <form action={startProcessFlow} className="flex flex-1 flex-wrap gap-2">
                <input type="hidden" name="template" value={t.key} />
                <Input name="name" placeholder="Akış adı (isteğe bağlı)" className="min-w-40 flex-1" />
                <Button type="submit" size="sm">Başlat</Button>
              </form>
              {t.id ? (
                <form action={deleteProcessTemplate}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" size="sm" variant="ghost">Sil</Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Başlatılmış akışlar</CardTitle></CardHeader>
        <CardContent>
          {flows.length ? (
            <ul className="divide-y">
              {flows.map((f) => {
                const linked = f.steps.filter((s) => s.recordId).length;
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/hizmetler/akis/${f.id}`} className="hover:underline">
                      <span className="font-mono text-xs">{f.flowNo}</span> {f.name}
                    </Link>
                    <span className="text-muted-foreground text-xs">{linked}/{f.steps.length} adım bağlı</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Henüz akış başlatılmadı.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
