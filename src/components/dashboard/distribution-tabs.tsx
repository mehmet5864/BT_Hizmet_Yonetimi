"use client";

import Link from "next/link";
import { useState } from "react";

import { BarChartXY, DonutChart, chartColor, type ChartItem } from "@/components/dashboard/charts";
import { cn } from "@/lib/utils";

type View = "pasta" | "cubuk" | "liste";
const VIEWS: { key: View; label: string }[] = [
  { key: "pasta", label: "Pasta" },
  { key: "cubuk", label: "Grafik" },
  { key: "liste", label: "Liste" },
];

/** Dağılım kartı içeriği: pasta (yüzde göstergeli), koordinat düzleminde çubuk ve çubuklu liste görünümü. */
export function DistributionTabs({ items }: { items: ChartItem[] }) {
  const [view, setView] = useState<View>("pasta");
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!items.length) return <p className="text-muted-foreground text-sm">Henüz dağılım oluşmadı.</p>;
  return (
    <div className="space-y-3">
      <div className="bg-muted inline-flex rounded-md p-0.5 text-xs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={cn("rounded px-2.5 py-1 font-medium transition-colors", view === v.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "pasta" ? (
        <div className="flex flex-wrap items-center gap-4">
          <DonutChart items={items} />
          <ul className="min-w-[160px] flex-1 space-y-1.5 text-sm">
            {items.map((item, i) => {
              const pct = total ? Math.round((item.value / total) * 100) : 0;
              const row = (
                <>
                  <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: item.color ?? chartColor(i) }} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="tabular-nums">{item.value}</span>
                  <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">%{pct}</span>
                </>
              );
              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link href={item.href} className="flex items-center gap-2 hover:opacity-80">
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {view === "cubuk" ? <BarChartXY items={items} /> : null}

      {view === "liste" ? (
        <div className="space-y-3">
          {items.map((item, i) => {
            const ratio = total ? Math.round((item.value / total) * 100) : 0;
            const inner = (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="tabular-nums">
                    {item.value} <span className="text-muted-foreground text-xs">%{ratio}</span>
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${ratio}%`, background: item.color ?? chartColor(i) }} />
                </div>
              </>
            );
            return item.href ? (
              <Link key={item.label} href={item.href} className="block space-y-1.5 hover:opacity-90">
                {inner}
              </Link>
            ) : (
              <div key={item.label} className="space-y-1.5">
                {inner}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
