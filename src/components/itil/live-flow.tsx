import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type FlowStage = { key: string; label: string; href: string; open: number; total: number };

/** Süreç zinciri: her aşamada açık/toplam sayı, aralarda hareketli bağlantı. */
export function LiveFlow({ stages }: { stages: FlowStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.open));
  return (
    <div className="flex flex-wrap items-stretch gap-y-3">
      {stages.map((s, i) => {
        const hot = s.open > 0;
        return (
          <div key={s.key} className="flex items-center">
            <Link
              href={s.href}
              className="bg-card hover:border-primary/50 relative flex min-w-[8.5rem] flex-col gap-1 overflow-hidden rounded-lg border p-3 transition-colors"
            >
              <span className="text-muted-foreground text-xs">{s.label}</span>
              <span className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">{s.open}</span>
                <span className="text-muted-foreground text-xs">açık / {s.total}</span>
              </span>
              <span className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
                <span
                  className="bar-grow bg-primary block h-full rounded-full"
                  style={{ width: `${Math.round((s.open / max) * 100)}%` }}
                />
              </span>
              {hot ? <span className="pulse-ring absolute right-2 top-2 size-2 rounded-full bg-amber-500" /> : null}
            </Link>
            {i < stages.length - 1 ? (
              <span className="relative mx-1 hidden h-0.5 w-8 overflow-hidden rounded bg-border sm:block">
                <span className="flow-dot absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
              </span>
            ) : (
              <ArrowRight className="hidden" />
            )}
          </div>
        );
      })}
    </div>
  );
}
