import Link from "next/link";

import { ModuleHero } from "@/components/dashboard/module-widgets";
import { ApproveRejectForm } from "@/components/itil/approve-reject-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { listPendingFor } from "@/lib/workflow/engine";
import { ENTITY_LABELS } from "@/lib/workflow/graph";

export const dynamic = "force-dynamic";

const HREF = { request: "/talepler", change: "/degisiklik", patch: "/yama" } as const;

export default async function MyWorkflowApprovalsPage() {
  const viewer = await getViewer();
  const items = viewer ? await listPendingFor(viewer.id, viewer.role === "SUPER_ADMIN") : [];
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="İş akışı onaylarım"
        description="Onay zincirinde sırası size gelen talep, değişiklik ve yamalar."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bekleyen adımlar ({items.length})</CardTitle>
          <CardDescription>Onayladığınızda zincir bir sonraki adıma geçer; son adım onaylanınca kayıt onaylanır.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? <p className="text-muted-foreground text-sm">Sizi bekleyen adım yok.</p> : null}
          {items.map((item) => (
            <div key={item.instanceId} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`${HREF[item.entity]}/${item.entityId}`} className="text-sm font-semibold hover:underline">
                    {item.recordNo}
                  </Link>
                  <span className="text-muted-foreground ms-2 text-xs">{item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ENTITY_LABELS[item.entity]}</Badge>
                  <Badge>{item.stepLabel}</Badge>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">Akış: {item.workflowName}</p>
              <ApproveRejectForm id={item.entityId} kind={item.entity} approveLabel="Onayla" rejectLabel="Reddet" onDone={undefined} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
