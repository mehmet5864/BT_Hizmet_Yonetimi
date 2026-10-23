import { Award } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { PersonStat } from "@/lib/person-stats";
import { SCORE_MODULE_LABELS } from "@/lib/scoring-defs";

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground text-[11px]">{hint}</p> : null}
    </div>
  );
}

export function PersonPerformance({ stat }: { stat: PersonStat }) {
  const modules = [...stat.byModule].sort((a, b) => b.points - a.points);
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Award className="size-4" />
            Performans
          </p>
          <p className="text-sm">
            Toplam puan <span className="text-lg font-semibold tabular-nums">{stat.points}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Metric label="Açtığı çağrı" value={stat.opened} hint="Talep, olay, problem, SLA arıza" />
          <Metric label="Kapattığı çağrı" value={stat.closed} />
          <Metric label="Diğer süreç girişi" value={stat.otherCreated} />
          <Metric label="Diğer süreç güncelleme" value={stat.otherUpdated} />
          <Metric label="Diğer süreç tamamlama" value={stat.otherCompleted} />
        </div>
        {modules.length ? (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Süreç</th>
                  <th className="px-2 py-1.5 font-medium">Giriş</th>
                  <th className="px-2 py-1.5 font-medium">Güncelleme</th>
                  <th className="px-2 py-1.5 font-medium">Tamamlama</th>
                  <th className="px-2 py-1.5 font-medium">Puan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {modules.map((m) => (
                  <tr key={m.module}>
                    <td className="px-3 py-1.5">{SCORE_MODULE_LABELS[m.module] ?? m.module}</td>
                    <td className="px-2 py-1.5 tabular-nums">{m.created}</td>
                    <td className="px-2 py-1.5 tabular-nums">{m.updated}</td>
                    <td className="px-2 py-1.5 tabular-nums">{m.completed}</td>
                    <td className="px-2 py-1.5 font-medium tabular-nums">{m.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Henüz puanlanmış işlem yok.</p>
        )}
      </CardContent>
    </Card>
  );
}
