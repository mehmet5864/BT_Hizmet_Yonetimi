"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, GripVertical } from "lucide-react";

import { PersonDot, PRIORITY_STRIPE, PriorityBadge, ProgressBar, STATUS_ACCENT, TypeBadge } from "@/components/agile/agile-bits";
import { moveAgileItem } from "@/lib/actions/agile";
import { AGILE_STATUS_LABELS } from "@/lib/agile/constants";
import { cn } from "@/lib/utils";

export type BoardItem = {
  id: string;
  itemNo: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  points: number | null;
  assignee?: { fullName: string } | null;
  blockedReason?: string | null;
  labels?: string | null;
};

export function KanbanBoard({ columns, items, wipLimit }: { columns: readonly string[]; items: BoardItem[]; wipLimit?: number | null }) {
  const router = useRouter();
  const [local, setLocal] = useState(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setLocal(items), [items]);

  function move(id: string, status: string) {
    const current = local.find((item) => item.id === id);
    if (!current || current.status === status) return;
    const previous = local;
    setError(null);
    setLocal((rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)));
    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("id", id);
        form.set("status", status);
        const result = await moveAgileItem(form);
        if (!result.ok) {
          setLocal(previous);
          setError(result.message ?? "Taşınamadı.");
          return;
        }
        router.refresh();
      } catch {
        setLocal(previous);
      }
    });
  }

  const totalPts = local.reduce((s, i) => s + (i.points ?? 0), 0);

  return (
    <>
    {error ? (
      <p role="alert" className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
        {error}
      </p>
    ) : null}
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))` }}>
      {columns.map((col, index) => {
        const colItems = local.filter((item) => item.status === col);
        const pts = colItems.reduce((s, i) => s + (i.points ?? 0), 0);
        return (
          <section
            key={col}
            onDragOver={(event) => {
              if (!dragId) return;
              event.preventDefault();
              setOverCol(col);
            }}
            onDragLeave={() => setOverCol((current) => (current === col ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              if (dragId) move(dragId, col);
              setDragId(null);
              setOverCol(null);
            }}
            className={cn("bg-muted/30 flex min-h-48 flex-col gap-2 rounded-xl border border-t-[3px] p-2.5 transition-colors", STATUS_ACCENT[col]?.top, overCol === col && "bg-primary/10 border-primary ring-primary/30 ring-2")}
          >
            <header className="flex items-center justify-between px-1 text-xs font-semibold tracking-wide uppercase">
              <span className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", STATUS_ACCENT[col]?.dot)} aria-hidden />
                {AGILE_STATUS_LABELS[col]}
                <span className="bg-background text-muted-foreground rounded-full border px-1.5 text-[10px] font-medium normal-case tabular-nums">{colItems.length}</span>
              </span>
              <span
                className={cn(
                  "text-muted-foreground font-normal normal-case",
                  col === "IN_PROGRESS" && wipLimit && colItems.length >= wipLimit && "font-semibold text-red-600 dark:text-red-400",
                )}
              >
                {col === "IN_PROGRESS" && wipLimit ? `limit ${wipLimit} · ` : ""}
                {pts} puan
              </span>
            </header>
            <ProgressBar value={totalPts ? (pts / totalPts) * 100 : 0} className="mx-1 w-auto" barClassName={STATUS_ACCENT[col]?.bar} />
            {colItems.map((item) => (
              <article
                key={item.id}
                draggable
                onDragStart={(event) => {
                  setDragId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverCol(null);
                }}
                className={cn("agile-card bg-card relative cursor-grab space-y-2 overflow-hidden rounded-lg border p-2.5 ps-3.5 shadow-xs active:cursor-grabbing", dragId === item.id && "opacity-50", item.blockedReason && "border-red-500/40")}
              >
                <span className={cn("absolute inset-y-0 start-0 w-1", PRIORITY_STRIPE[item.priority] ?? "bg-muted")} aria-hidden />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-1">
                    <GripVertical className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <Link href={`/cevik/is/${item.id}`} className="text-sm leading-snug font-medium hover:underline">
                      {item.title}
                    </Link>
                  </div>
                  {item.points != null ? (
                    <span className="bg-primary/10 text-primary rounded-full px-2 text-xs font-semibold tabular-nums" title="Hikâye puanı">
                      {item.points}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground font-mono text-[11px]">{item.itemNo}</span>
                  <TypeBadge value={item.type} />
                  <PriorityBadge value={item.priority} />
                  {item.blockedReason ? (
                    <span className="rounded bg-red-500/15 px-1 text-[11px] text-red-700 dark:text-red-300" title={item.blockedReason}>
                      Engelli
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                    <PersonDot name={item.assignee?.fullName} />
                    <span className="truncate">{item.assignee?.fullName ?? "Atanmamış"}</span>
                  </span>
                  <div className="flex">
                    {index > 0 ? (
                      <button type="button" onClick={() => move(item.id, columns[index - 1])} title={`${AGILE_STATUS_LABELS[columns[index - 1]]} sütununa taşı`} aria-label={`${AGILE_STATUS_LABELS[columns[index - 1]]} sütununa taşı`} className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1">
                        <ArrowLeft className="size-3.5" />
                      </button>
                    ) : null}
                    {index < columns.length - 1 ? (
                      <button type="button" onClick={() => move(item.id, columns[index + 1])} title={`${AGILE_STATUS_LABELS[columns[index + 1]]} sütununa taşı`} aria-label={`${AGILE_STATUS_LABELS[columns[index + 1]]} sütununa taşı`} className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1">
                        <ArrowRight className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            {!colItems.length ? <p className="text-muted-foreground rounded-lg border border-dashed px-1 py-6 text-center text-xs">Boş — buraya sürükleyin</p> : null}
          </section>
        );
      })}
    </div>
    </>
  );
}
