import { Badge } from "@/components/ui/badge";
import {
  CRITICALITY_STYLES,
  type Criticality,
  type LifecycleStatus,
} from "@/lib/inventory/constants";
import {
  criticalityLabel,
  expiryState,
  formatDate,
  lifecycleLabel,
} from "@/lib/inventory/format";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CriticalityBadge({ value, label }: { value: string | null | undefined; label?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", CRITICALITY_STYLES[value as Criticality])}>
      {label ?? criticalityLabel(value)}
    </Badge>
  );
}

const LIFECYCLE_STYLES: Record<LifecycleStatus, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  IN_STOCK: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  MAINTENANCE: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  RETIRED: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export function LifecycleBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", LIFECYCLE_STYLES[value as LifecycleStatus])}>
      {lifecycleLabel(value)}
    </Badge>
  );
}

const VULN_SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const VULN_SEVERITY_SHORT: Record<(typeof VULN_SEVERITY_ORDER)[number], string> = {
  CRITICAL: "Kritik",
  HIGH: "Yüksek",
  MEDIUM: "Orta",
  LOW: "Düşük",
};
const VULN_BADGE_STYLES: Record<(typeof VULN_SEVERITY_ORDER)[number] | "CLEAN", string> = {
  CRITICAL: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  HIGH: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  LOW: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  CLEAN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function AssetVulnBadge({
  vulnerabilities,
}: {
  vulnerabilities?: { severity: string }[] | null;
}) {
  const open = vulnerabilities ?? [];
  if (!open.length) {
    return (
      <Badge variant="outline" className={cn("font-medium", VULN_BADGE_STYLES.CLEAN)}>
        Zafiyet yok
      </Badge>
    );
  }
  const worst =
    VULN_SEVERITY_ORDER.find((level) => open.some((item) => item.severity === level)) ?? "LOW";
  const critical = open.filter((item) => item.severity === "CRITICAL").length;
  const high = open.filter((item) => item.severity === "HIGH").length;
  const label = critical
    ? `${open.length} açık · ${critical} kritik`
    : high
      ? `${open.length} açık · ${high} yüksek`
      : `${open.length} açık · ${VULN_SEVERITY_SHORT[worst]}`;
  return (
    <Badge variant="outline" className={cn("font-medium", VULN_BADGE_STYLES[worst])}>
      {label}
    </Badge>
  );
}

export function SupportEndCell({ value }: { value: Date | string | null | undefined }) {
  const state = expiryState(value);
  if (state === "none") return <span className="text-muted-foreground">—</span>;

  return (
    <span
      className={cn(
        "text-sm",
        state === "expired" && "font-medium text-red-600 dark:text-red-400",
        state === "soon" && "font-medium text-amber-600 dark:text-amber-400",
      )}
    >
      {formatDate(value)}
      {state === "expired" ? " · süresi doldu" : state === "soon" ? " · yaklaşıyor" : ""}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {action}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}
