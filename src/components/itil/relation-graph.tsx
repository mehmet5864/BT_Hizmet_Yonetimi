"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type GNode = { id: string; kind: string; label: string; href?: string; sub?: string };
export type GLink = { a: string; b: string };

export const KIND_META: Record<string, { label: string; color: string }> = {
  asset: { label: "Varlık", color: "#64748b" },
  incident: { label: "Olay", color: "#ef4444" },
  problem: { label: "Problem", color: "#f59e0b" },
  vuln: { label: "Zafiyet", color: "#a855f7" },
  change: { label: "Değişiklik", color: "#f97316" },
  patch: { label: "Yama", color: "#14b8a6" },
  service: { label: "Hizmet", color: "#3b82f6" },
  process: { label: "Süreç", color: "#6366f1" },
  agile: { label: "Çevik iş", color: "#22c55e" },
};

type P = { x: number; y: number; vx: number; vy: number; fixed?: boolean };
const W = 960;
const H = 560;

export function RelationGraph({ nodes, links }: { nodes: GNode[]; links: GLink[] }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const pos = useRef<Map<string, P>>(new Map());
  const drag = useRef<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const vis = useMemo(() => nodes.filter((n) => !hidden.has(n.kind)), [nodes, hidden]);
  const visIds = useMemo(() => new Set(vis.map((n) => n.id)), [vis]);
  const vlinks = useMemo(() => links.filter((l) => visIds.has(l.a) && visIds.has(l.b)), [links, visIds]);
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of vlinks) {
      (m.get(l.a) ?? m.set(l.a, new Set()).get(l.a)!).add(l.b);
      (m.get(l.b) ?? m.set(l.b, new Set()).get(l.b)!).add(l.a);
    }
    return m;
  }, [vlinks]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const n of vis) {
      if (!pos.current.has(n.id)) {
        const a = Math.random() * Math.PI * 2;
        pos.current.set(n.id, { x: W / 2 + Math.cos(a) * 200 * Math.random(), y: H / 2 + Math.sin(a) * 150 * Math.random(), vx: 0, vy: 0 });
      }
    }
    let frame = 0;
    let raf = 0;
    const step = () => {
      const ps = vis.map((n) => pos.current.get(n.id)!);
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x || 0.01;
          const dy = ps[i].y - ps[j].y || 0.01;
          const d2 = dx * dx + dy * dy + 40;
          const f = 1800 / d2;
          const d = Math.sqrt(d2);
          ps[i].vx += (dx / d) * f; ps[i].vy += (dy / d) * f;
          ps[j].vx -= (dx / d) * f; ps[j].vy -= (dy / d) * f;
        }
      }
      for (const l of vlinks) {
        const a = pos.current.get(l.a)!; const b = pos.current.get(l.b)!;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 70) * 0.02;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      for (const p of ps) {
        p.vx += (W / 2 - p.x) * 0.002; p.vy += (H / 2 - p.y) * 0.002;
        if (!p.fixed) {
          p.x = Math.min(W - 12, Math.max(12, p.x + (p.vx *= 0.82)));
          p.y = Math.min(H - 12, Math.max(12, p.y + (p.vy *= 0.82)));
        } else { p.vx = 0; p.vy = 0; }
      }
      setTick((t) => t + 1);
      frame++;
      if (!reduce || frame < 120) {
        if (frame < 400 || drag.current) raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [vis, vlinks]);

  function toLocal(e: React.PointerEvent) {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  const kinds = Object.keys(KIND_META);
  const focus = hover ? new Set([hover, ...(adj.get(hover) ?? [])]) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => {
          const off = hidden.has(k);
          const count = nodes.filter((n) => n.kind === k).length;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setHidden((s) => { const c = new Set(s); if (c.has(k)) c.delete(k); else c.add(k); return c; })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity ${off ? "opacity-40" : ""}`}
            >
              <span className="size-2.5 rounded-full" style={{ background: KIND_META[k].color }} />
              {KIND_META[k].label} ({count})
            </button>
          );
        })}
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="bg-card h-[70vh] w-full touch-none rounded-lg border"
        onPointerMove={(e) => {
          if (!drag.current) return;
          const p = pos.current.get(drag.current);
          if (p) { const l = toLocal(e); p.x = l.x; p.y = l.y; }
        }}
        onPointerUp={() => { const p = drag.current ? pos.current.get(drag.current) : null; if (p) p.fixed = false; drag.current = null; }}
      >
        {vlinks.map((l, i) => {
          const a = pos.current.get(l.a); const b = pos.current.get(l.b);
          if (!a || !b) return null;
          const on = !focus || (focus.has(l.a) && focus.has(l.b));
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity={on ? 0.35 : 0.06} />;
        })}
        {vis.map((n) => {
          const p = pos.current.get(n.id);
          if (!p) return null;
          const on = !focus || focus.has(n.id);
          const r = n.kind === "asset" ? 9 : 7;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x},${p.y})`}
              opacity={on ? 1 : 0.15}
              className="cursor-pointer"
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover(null)}
              onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = n.id; p.fixed = true; }}
              onDoubleClick={() => n.href && router.push(n.href)}
            >
              <circle r={r} fill={KIND_META[n.kind]?.color ?? "#888"} stroke="white" strokeWidth={1.5} />
              {(hover === n.id || n.kind === "asset") && (
                <text y={-r - 4} textAnchor="middle" fontSize="10" fill="currentColor">{n.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-muted-foreground text-xs">
        Sürükleyerek taşıyın, üzerine gelince bağlantılar öne çıkar, çift tıklayınca kayıt açılır.
        {hover ? ` — ${nodes.find((n) => n.id === hover)?.label}${nodes.find((n) => n.id === hover)?.sub ? " · " + nodes.find((n) => n.id === hover)?.sub : ""}` : ""}
      </p>
    </div>
  );
}
