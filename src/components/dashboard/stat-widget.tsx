import Link from "next/link";

import { RingGauge } from "@/components/dashboard/charts";
import { CountUp } from "@/components/dashboard/count-up";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatWidget({
  icon,
  label,
  value,
  hint,
  href,
  tone = "default",
  bar,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  href: string;
  tone?: "default" | "warning" | "danger" | "ok" | "info";
  bar?: number;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className={cn(
          "widget-card h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg",
          tone === "danger" && "widget-danger",
          tone === "warning" && "widget-warning",
          tone === "ok" && "widget-ok",
          tone === "info" && "widget-info",
        )}
      >
        <CardContent className="flex items-center gap-4">
          <div className="widget-icon shrink-0">{icon}</div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {typeof value === "number" ? <CountUp value={value} /> : value}
            </p>
            <p className="text-sm font-medium">{label}</p>
            {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
          </div>
          {typeof bar === "number" ? (
            <RingGauge value={bar} color={tone === "danger" ? "#dc2626" : tone === "warning" ? "#f59e0b" : tone === "ok" ? "#16a34a" : "#2563eb"} />
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="widget-panel space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
