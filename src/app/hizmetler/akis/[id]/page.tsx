import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveRefresh } from "@/components/live-refresh";
import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteProcessFlow, linkFlowStep, unlinkFlowStep } from "@/lib/actions/process-flow";
import { prisma } from "@/lib/prisma";
import { FLOW_KIND_HREF, FLOW_KIND_LABELS, FLOW_KIND_NEW, isDoneStatus, recordStatuses, type FlowKind } from "@/lib/process-flow";

export const dynamic = "force-dynamic";

export default async function AkisDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  const [{ id }, { hata }] = await Promise.all([params, searchParams]);
  const flow = await prisma.processFlow.findUnique({ where: { id }, include: { steps: { orderBy: { position: "asc" } } } });
  if (!flow) notFound();
  const statuses = await recordStatuses(flow.steps);
  const done = flow.steps.filter((s) => s.recordId && isDoneStatus(statuses.get(s.recordId))).length;
  const pct = Math.round((done / flow.steps.length) * 100);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={`${flow.flowNo} — ${flow.name}`}
        description={flow.note ?? undefined}
        actions={
          <>
            <LiveRefresh seconds={20} />
            <form action={deleteProcessFlow}>
              <input type="hidden" name="id" value={flow.id} />
              <Button type="submit" size="sm" variant="outline">Akışı sil</Button>
            </form>
          </>
        }
      />
      {hata ? <p className="text-destructive rounded-md border border-destructive/30 px-3 py-2 text-sm">{hata}</p> : null}
      <div className="space-y-1">
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>İlerleme</span>
          <span>{done}/{flow.steps.length} tamamlandı</span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div className="bar-grow bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {flow.steps.map((s) => {
          const kind = s.kind as FlowKind;
          const status = s.recordId ? statuses.get(s.recordId) : undefined;
          const finished = isDoneStatus(status);
          return (
            <li key={s.id}>
              <Card className={finished ? "border-emerald-500/40" : undefined}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-medium">{s.position}</span>
                      <span className="font-medium">{s.title}</span>
                      <Badge variant="outline">{FLOW_KIND_LABELS[kind] ?? s.kind}</Badge>
                    </div>
                    {s.recordId ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Link href={`${FLOW_KIND_HREF[kind]}/${s.recordId}`} className="font-mono text-xs hover:underline">{s.recordNo}</Link>
                        <Badge variant={finished ? "default" : "secondary"}>{status ?? "?"}</Badge>
                        <form action={unlinkFlowStep}>
                          <input type="hidden" name="stepId" value={s.id} />
                          <input type="hidden" name="flowId" value={flow.id} />
                          <Button type="submit" size="sm" variant="ghost">Bağı kaldır</Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                  {s.recordId ? null : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={FLOW_KIND_NEW[kind]}>Yeni kayıt aç</Link>
                      </Button>
                      <form action={linkFlowStep} className="flex flex-1 flex-wrap gap-2">
                        <input type="hidden" name="flowId" value={flow.id} />
                        <input type="hidden" name="stepId" value={s.id} />
                        <Input name="recordNo" placeholder="Kayıt no ile bağla (ör. OLY-2026-0001)" className="min-w-48 flex-1" />
                        <Button type="submit" size="sm">Bağla</Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
