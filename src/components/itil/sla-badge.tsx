import { Badge } from "@/components/ui/badge";
import { formatRemaining, slaState, SLA_STATE_LABELS, type SlaState } from "@/lib/itil/sla";
import { cn } from "@/lib/utils";

const STYLE: Record<SlaState, string> = {
  NONE: "",
  OK: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  WARN: "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  BREACH: "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300",
  MET: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  LATE: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
};

/** SLA hedefine göre durum rozeti. due boşsa hiçbir şey çizmez. */
export function SlaBadge({
  start,
  due,
  doneAt,
  label,
}: {
  start: Date;
  due: Date | null | undefined;
  doneAt?: Date | null;
  label?: string;
}) {
  if (!due) return <span className="text-muted-foreground">—</span>;
  const state = slaState({ start, due, doneAt: doneAt ?? null });
  const detail = doneAt ? "" : ` · ${formatRemaining(due)}`;
  return (
    <Badge variant="outline" className={cn("font-normal", STYLE[state])}>
      {label ? `${label}: ` : ""}
      {SLA_STATE_LABELS[state]}
      {detail}
    </Badge>
  );
}
