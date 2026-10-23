import { Bug, CheckSquare, Layers, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AGILE_PRIORITY_LABELS, AGILE_TYPE_LABELS } from "@/lib/agile/constants";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "border-muted-foreground/30 bg-muted text-muted-foreground",
  MEDIUM: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  HIGH: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CRITICAL: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
/** Kartın sol şeridi: önceliği tek bakışta gösterir. */
export const PRIORITY_STRIPE: Record<string, string> = {
  LOW: "bg-slate-300 dark:bg-slate-600",
  MEDIUM: "bg-sky-500",
  HIGH: "bg-amber-500",
  CRITICAL: "bg-red-500",
};
const TYPE_STYLE: Record<string, string> = {
  EPIC: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  STORY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  TASK: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  BUG: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
const TYPE_ICON = { EPIC: Layers, STORY: BookOpen, TASK: CheckSquare, BUG: Bug } as const;

/** Pano sütunlarının vurgu renkleri (üst çizgi, nokta, ilerleme çubuğu). */
export const STATUS_ACCENT: Record<string, { dot: string; bar: string; top: string }> = {
  BACKLOG: { dot: "bg-slate-400", bar: "bg-slate-400", top: "border-t-slate-400" },
  TODO: { dot: "bg-slate-500", bar: "bg-slate-500", top: "border-t-slate-500" },
  IN_PROGRESS: { dot: "bg-sky-500", bar: "bg-sky-500", top: "border-t-sky-500" },
  REVIEW: { dot: "bg-amber-500", bar: "bg-amber-500", top: "border-t-amber-500" },
  DONE: { dot: "bg-emerald-500", bar: "bg-emerald-500", top: "border-t-emerald-500" },
};

export function PriorityBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLE[value]}>
      {AGILE_PRIORITY_LABELS[value] ?? value}
    </Badge>
  );
}

export function TypeBadge({ value }: { value: string }) {
  const Icon = TYPE_ICON[value as keyof typeof TYPE_ICON];
  return (
    <Badge variant="outline" className={TYPE_STYLE[value]}>
      {Icon ? <Icon className="size-3" /> : null}
      {AGILE_TYPE_LABELS[value] ?? value}
    </Badge>
  );
}

/** Kişiyi baş harfleriyle gösteren küçük yuvarlak. Rengi addan türetilir. */
const AVATAR_TONES = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
];

export function PersonDot({ name, className }: { name?: string | null; className?: string }) {
  if (!name) {
    return (
      <span className={cn("bg-muted text-muted-foreground inline-flex size-6 items-center justify-center rounded-full border border-dashed text-[10px]", className)} aria-hidden>
        ?
      </span>
    );
  }
  const parts = name.trim().split(/\s+/);
  const letters = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  const tone = AVATAR_TONES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", tone, className)} title={name} aria-hidden>
      {letters}
    </span>
  );
}

/** İlerleme çubuğu (0–100). */
export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("bg-muted h-1.5 w-full overflow-hidden rounded-full", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", barClassName ?? "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}
