import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PersonWorkload, WorkItem } from "@/lib/person-workload";
import { cn } from "@/lib/utils";

function Metric({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "danger" | "warning" }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "danger" && value > 0 && "text-destructive")}>{value}</p>
      {hint ? <p className="text-muted-foreground text-[11px]">{hint}</p> : null}
    </div>
  );
}

function Block({ title, total, items, empty }: { title: string; total: number; items: WorkItem[]; empty: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        {title} <span className="text-muted-foreground font-normal tabular-nums">({total})</span>
      </p>
      {items.length ? (
        <ul className="divide-y overflow-hidden rounded-md border">
          {items.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className="hover:bg-muted/50 flex items-center gap-3 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground w-28 shrink-0 font-mono text-xs">{item.code}</span>
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <Badge
                  variant={item.tone === "danger" ? "destructive" : "secondary"}
                  className={cn("shrink-0", item.tone === "warning" && "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100")}
                >
                  {item.tone === "danger" ? `${item.statusLabel} · süre aşıldı` : item.statusLabel}
                </Badge>
              </Link>
            </li>
          ))}
          {total > items.length ? <li className="text-muted-foreground px-3 py-1.5 text-xs">+{total - items.length} kayıt daha</li> : null}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">{empty}</p>
      )}
    </div>
  );
}

function fmt(date: Date | null) {
  return date ? date.toLocaleDateString("tr-TR") : "—";
}

export function PersonWorkloadCard({ data, title = "Çalışma özeti", reportPersonId }: { data: PersonWorkload; title?: string; reportPersonId?: string }) {
  const { counts } = data;
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="size-4" />
            {title}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline">Rapor al:</span>
            {(["csv", "pdf", "docx"] as const).map((format) => (
              <a
                key={format}
                href={`/api/profilim/rapor?format=${format}${reportPersonId ? `&personId=${reportPersonId}` : ""}`}
                className="hover:bg-muted rounded-md border px-2 py-1 uppercase"
              >
                {format === "docx" ? "Word" : format}
              </a>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Bekleyen onay" value={counts.approvals} hint="Onaylamam gerekenler" tone="warning" />
          <Metric label="Üzerimdeki iş" value={counts.assigned} hint="Olay, problem, talep, SLA" />
          <Metric label="Çevik görev" value={counts.agileTasks} hint="Tamamlanmamış" />
          <Metric label="Diğer yapılacak" value={counts.todos} hint="Zafiyet, zimmet, toplantı…" />
          <Metric label="Aktif sprint" value={counts.sprints} />
          <Metric label="Açık taleplerim" value={data.myRequests} hint="Benim açtıklarım" />
        </div>
        <Block title="Onay bekleyenler" total={counts.approvals} items={data.approvals} empty="Bekleyen onay yok." />
        <Block title="Üzerindeki işler" total={counts.assigned} items={data.assigned} empty="Üzerine atanmış açık iş yok." />
        <Block title="Çevik görevler" total={counts.agileTasks} items={data.agileTasks} empty="Tamamlanmamış Çevik görev yok." />
        <Block title="Diğer yapılacaklar" total={counts.todos} items={data.todos} empty="Bekleyen başka bir iş yok." />
        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            Aktif sprintler <span className="text-muted-foreground font-normal tabular-nums">({counts.sprints})</span>
          </p>
          {data.sprints.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.sprints.map((sprint) => {
                const pct = sprint.items ? Math.round((sprint.done / sprint.items) * 100) : 0;
                return (
                  <Link key={sprint.id} href={`/cevik/sprint/${sprint.id}`} className="hover:bg-muted/50 rounded-md border px-3 py-2 text-sm">
                    <p className="truncate font-medium">{sprint.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {sprint.product} · bitiş {fmt(sprint.endDate)}
                    </p>
                    <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                      <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                      {sprint.done} / {sprint.items} iş · {sprint.donePoints} / {sprint.points} puan
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">Aktif sprintte işi yok.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
