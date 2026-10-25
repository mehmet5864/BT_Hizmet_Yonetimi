"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addTopologyNote, deleteTopologyNote, resetTopologyLayout, saveTopologyLayout, type NoteRow } from "@/lib/actions/topology-extra";
import { AUDIENCE_KINDS, AUDIENCE_KIND_COLORS, AUDIENCE_KIND_LABELS, type TopoGraph, type TopoNode } from "@/lib/topology/types";

import { SHAPE_LEGEND, ShapeIcon } from "./topology-shapes";

const COL_GAP = 210;
const ROW_GAP = 96;
const NODE_W = 150;
const MAX_PER_SUBCOL = 12;
const TOP = 56;
const LEFT = 40;

type Placed = TopoNode & { x: number; y: number; h: number; w: number };

const CRIT_COLOR: Record<string, string> = { HIGH: "#dc2626", MEDIUM: "#d97706", LOW: "#16a34a" };

function nodeHeight(node: TopoNode) {
  if (node.shape === "modules") return 34 + Math.max(1, node.lines?.length ?? 1) * 14 + 10;
  return 84;
}

function layout(graph: TopoGraph) {
  const colsUsed = [...new Set(graph.nodes.map((n) => n.col))].sort((a, b) => a - b);
  const placed: Placed[] = [];
  const colX = new Map<number, number>();
  let subIndex = 0;
  const columns: { col: number; list: TopoNode[][] }[] = colsUsed.map((col) => {
    const nodes = graph.nodes
      .filter((n) => n.col === col)
      .sort((a, b) => (a.order ?? a.label).localeCompare(b.order ?? b.label, "tr"));
    const chunks: TopoNode[][] = [];
    for (let i = 0; i < nodes.length; i += MAX_PER_SUBCOL) chunks.push(nodes.slice(i, i + MAX_PER_SUBCOL));
    return { col, list: chunks };
  });
  const heights = columns.flatMap((c) => c.list.map((chunk) => chunk.reduce((sum, n) => sum + Math.max(ROW_GAP, nodeHeight(n) + 14), 0)));
  const maxH = Math.max(ROW_GAP, ...heights);
  const titleX: { x: number; text: string }[] = [];
  columns.forEach((c) => {
    c.list.forEach((chunk, k) => {
      const x = LEFT + subIndex * COL_GAP;
      if (k === 0) colX.set(c.col, x);
      const total = chunk.reduce((sum, n) => sum + Math.max(ROW_GAP, nodeHeight(n) + 14), 0);
      let y = TOP + 30 + (maxH - total) / 2;
      chunk.forEach((n) => {
        const h = nodeHeight(n);
        const step = Math.max(ROW_GAP, h + 14);
        placed.push({ ...n, x, y: y + (step - h) / 2, h, w: n.shape === "modules" ? 176 : NODE_W });
        y += step;
      });
      if (k === 0) titleX.push({ x, text: graph.columnTitles?.[c.col] ?? "" });
      subIndex += 1;
    });
  });
  const width = LEFT * 2 + Math.max(1, subIndex) * COL_GAP;
  const height = TOP + 30 + maxH + 40;
  return { placed, width, height, titleX };
}

function clip(text: string, n: number) {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}

export function TopologyDiagram({
  graph,
  name,
  serviceId,
  initialPositions,
  initialNotes,
}: {
  graph: TopoGraph;
  name: string;
  serviceId?: string;
  initialPositions?: Record<string, { x: number; y: number }>;
  initialNotes?: NoteRow[];
}) {
  const { placed: basePlaced, width, height, titleX } = useMemo(() => layout(graph), [graph]);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(initialPositions ?? {});
  const posRef = useRef(pos);
  posRef.current = pos;
  const placed = useMemo(() => basePlaced.map((n) => (pos[n.id] ? { ...n, x: pos[n.id].x, y: pos[n.id].y } : n)), [basePlaced, pos]);
  const byId = useMemo(() => new Map(placed.map((n) => [n.id, n])), [placed]);
  const nodeDrag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes ?? []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const noteCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.nodeKey, (m.get(n.nodeKey) ?? 0) + 1);
    return m;
  }, [notes]);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: width, h: height });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const fit = useCallback(() => setView({ x: 0, y: 0, w: width, h: height }), [width, height]);
  const zoom = useCallback((factor: number, cx?: number, cy?: number) => {
    setView((v) => {
      const nw = Math.min(width * 4, Math.max(200, v.w * factor));
      const nh = (nw / v.w) * v.h;
      const px = cx ?? v.x + v.w / 2;
      const py = cy ?? v.y + v.h / 2;
      return { x: px - ((px - v.x) / v.w) * nw, y: py - ((py - v.y) / v.h) * nh, w: nw, h: nh };
    });
  }, [width]);

  const viewRef = useRef(view);
  viewRef.current = view;
  const hasNodes = graph.nodes.length > 0;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const rect = el.getBoundingClientRect();
      const px = v.x + ((e.clientX - rect.left) / rect.width) * v.w;
      const py = v.y + ((e.clientY - rect.top) / rect.height) * v.h;
      zoom(e.deltaY > 0 ? 1.15 : 0.87, px, py);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, hasNodes]);

  const edgeCounter = new Map<string, number>();
  const connected = useMemo(() => {
    if (!selected) return null;
    const set = new Set<string>([selected]);
    for (const e of graph.edges) {
      if (e.from === selected) set.add(e.to);
      if (e.to === selected) set.add(e.from);
    }
    return set;
  }, [graph.edges, selected]);

  const active = selected ? byId.get(selected) : undefined;

  function download() {
    const el = svgRef.current;
    if (!el) return;
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    const text = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "topoloji"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!graph.nodes.length) {
    return <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">{graph.note ?? "Gösterilecek kayıt yok."}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => zoom(0.8)} aria-label="Yakınlaştır">
          <ZoomIn className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => zoom(1.25)} aria-label="Uzaklaştır">
          <ZoomOut className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={fit}>
          <Maximize2 className="size-4" />
          Sığdır
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={download}>
          <Download className="size-4" />
          SVG indir
        </Button>
        {serviceId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setPos({});
              void resetTopologyLayout(serviceId).then((r) => setStatus(r.ok ? "Düzen sıfırlandı." : (r.message ?? "Sıfırlanamadı.")));
            }}
          >
            <RotateCcw className="size-4" />
            Düzeni sıfırla
          </Button>
        ) : null}
        {status ? <span className="text-xs text-emerald-700">{status}</span> : null}
        <span className="text-muted-foreground text-xs">{graph.nodes.length} nesne · {graph.edges.length} bağlantı · nesneyi sürükleyip yerleştirin (otomatik kaydedilir), boşluğu sürükleyerek kaydırın, tekerlekle yakınlaştırın</span>
      </div>
      {graph.note ? <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">{graph.note}</p> : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="overflow-hidden rounded-lg border bg-white">
          <svg
            ref={svgRef}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            className="h-[560px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
            role="img"
            aria-label="Topoloji diyagramı"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              const el = svgRef.current;
              if (!d || !el) return;
              const rect = el.getBoundingClientRect();
              setView((v) => ({ ...v, x: d.vx - ((e.clientX - d.x) / rect.width) * v.w, y: d.vy - ((e.clientY - d.y) / rect.height) * v.h }));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
          >
            <defs>
              <marker id="topo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 10 5 0 10z" fill="#475569" />
              </marker>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
            {titleX.map((t, i) =>
              t.text ? (
                <text key={`t${i}`} x={t.x + NODE_W / 2} y={TOP} textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748b" fontFamily="Segoe UI, Arial, sans-serif">
                  {t.text}
                </text>
              ) : null,
            )}

            {graph.edges.map((edge) => {
              const a = byId.get(edge.from);
              const b = byId.get(edge.to);
              if (!a || !b) return null;
              const key = `${edge.from}|${edge.to}`;
              const k = edgeCounter.get(key) ?? 0;
              edgeCounter.set(key, k + 1);
              const dimmed = connected ? !(connected.has(edge.from) && connected.has(edge.to)) : false;
              const aCy = a.y + (a.shape === "modules" ? a.h / 2 : 26);
              const bCy = b.y + (b.shape === "modules" ? b.h / 2 : 26);
              let x1: number;
              let x2: number;
              if (b.x > a.x) {
                x1 = a.x + a.w / 2 + (a.shape === "modules" ? a.w / 2 : 34);
                x2 = b.x + b.w / 2 - (b.shape === "modules" ? b.w / 2 : 34);
              } else if (b.x < a.x) {
                x1 = a.x + a.w / 2 - (a.shape === "modules" ? a.w / 2 : 34);
                x2 = b.x + b.w / 2 + (b.shape === "modules" ? b.w / 2 : 34);
              } else {
                x1 = a.x + a.w / 2 + 34;
                x2 = b.x + b.w / 2 + 34;
              }
              const off = k * 14;
              const y1 = aCy + off;
              const y2 = bCy + off;
              const dx = b.x === a.x ? 70 : Math.max(40, Math.abs(x2 - x1) / 2) * Math.sign(x2 - x1);
              const path = `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
              const mx = (x1 + x2) / 2 + (b.x === a.x ? 70 : 0);
              const my = (y1 + y2) / 2;
              const color = edge.color ?? "#64748b";
              return (
                <g key={edge.id} opacity={dimmed ? 0.12 : 1}>
                  <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeDasharray={edge.dashed ? "6 4" : undefined} markerEnd="url(#topo-arrow)" />
                  {edge.label ? (
                    <g>
                      <rect x={mx - (edge.label.length * 3.1 + 5)} y={my - 8} width={edge.label.length * 6.2 + 10} height="15" rx="4" fill="#ffffff" stroke={color} strokeWidth="0.8" />
                      <text x={mx} y={my + 3} textAnchor="middle" fontSize="10" fill={color} fontFamily="Segoe UI, Arial, sans-serif">
                        {edge.label}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}

            {placed.map((n) => {
              const dimmed = connected ? !connected.has(n.id) : false;
              const isSel = selected === n.id;
              const cx = n.x + n.w / 2;
              return (
                <g
                  key={n.id}
                  opacity={dimmed ? 0.25 : n.dimmed ? 0.6 : 1}
                  className="cursor-move"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (!serviceId) return;
                    nodeDrag.current = { id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const d = nodeDrag.current;
                    const el = svgRef.current;
                    if (!d || d.id !== n.id || !el) return;
                    const dx = e.clientX - d.sx;
                    const dy = e.clientY - d.sy;
                    if (!d.moved && Math.hypot(dx, dy) < 4) return;
                    d.moved = true;
                    const rect = el.getBoundingClientRect();
                    const v = viewRef.current;
                    const k = Math.max(v.w / rect.width, v.h / rect.height);
                    setPos((p) => ({ ...p, [n.id]: { x: Math.max(0, Math.round(d.ox + dx * k)), y: Math.max(0, Math.round(d.oy + dy * k)) } }));
                  }}
                  onPointerUp={() => {
                    const d = nodeDrag.current;
                    nodeDrag.current = null;
                    if (d?.moved && serviceId) {
                      justDragged.current = true;
                      const p = posRef.current[d.id];
                      if (p) {
                        void saveTopologyLayout(serviceId, [{ key: d.id, x: p.x, y: p.y }]).then((r) => setStatus(r.ok ? "Konum kaydedildi." : (r.message ?? "Kaydedilemedi.")));
                      }
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (justDragged.current) {
                      justDragged.current = false;
                      return;
                    }
                    setSelected(isSel ? null : n.id);
                  }}
                >
                  <title>{`${n.label}${n.sub ? ` — ${n.sub}` : ""}`}</title>
                  {n.shape === "modules" ? (
                    <g>
                      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="8" fill="#f8fafc" stroke="#334155" strokeWidth="1.6" />
                      <text x={n.x + 10} y={n.y + 20} fontSize="12" fontWeight="700" fill="#0f172a" fontFamily="Segoe UI, Arial, sans-serif">
                        {n.label}
                      </text>
                      {(n.lines?.length ? n.lines : ["Yetkili modül yok"]).map((line, i) => (
                        <text key={i} x={n.x + 10} y={n.y + 38 + i * 14} fontSize="9.5" fill="#334155" fontFamily="Segoe UI, Arial, sans-serif">
                          {clip(line, 32)}
                        </text>
                      ))}
                    </g>
                  ) : (
                    <>
                      {n.focus || isSel ? <rect x={cx - 42} y={n.y - 6} width="84" height="64" rx="10" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" /> : null}
                      {n.criticality ? <rect x={cx - 38} y={n.y - 2} width="76" height="56" rx="8" fill="none" stroke={CRIT_COLOR[n.criticality] ?? "#94a3b8"} strokeWidth="1.5" strokeDasharray="3 3" /> : null}
                      <g transform={`translate(${cx - 32} ${n.y})`}>
                        <ShapeIcon shape={n.shape} />
                      </g>
                      {noteCount.get(n.id) ? (
                        <g>
                          <circle cx={cx - 36} cy={n.y} r="9" fill="#f59e0b" />
                          <text x={cx - 36} y={n.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff" fontFamily="Segoe UI, Arial, sans-serif">
                            {noteCount.get(n.id)}
                          </text>
                        </g>
                      ) : null}
                      {n.vulnCount ? (
                        <g>
                          <circle cx={cx + 36} cy={n.y} r="9" fill="#dc2626" />
                          <text x={cx + 36} y={n.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff" fontFamily="Segoe UI, Arial, sans-serif">
                            {n.vulnCount > 99 ? "99+" : n.vulnCount}
                          </text>
                        </g>
                      ) : null}
                      <text x={cx} y={n.y + 68} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a" fontFamily="Segoe UI, Arial, sans-serif">
                        {clip(n.label, 22)}
                      </text>
                      {n.sub ? (
                        <text x={cx} y={n.y + 81} textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily="Segoe UI, Arial, sans-serif">
                          {clip(n.sub, 26)}
                        </text>
                      ) : null}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="space-y-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Seçili nesne</p>
            {active ? (
              <div className="space-y-2">
                <p className="font-semibold">{active.label}</p>
                <dl className="space-y-1 text-xs">
                  {(active.meta ?? []).map(([k, v]) => (
                    <div key={`${k}-${v}`} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                {active.vulnCount ? <p className="text-xs text-red-600">{active.vulnCount} açık zafiyet</p> : null}
                {serviceId ? (
                  <div className="space-y-2 border-t pt-2">
                    <p className="text-muted-foreground text-xs font-semibold uppercase">Notlar / ek bilgi</p>
                    {notes.filter((x) => x.nodeKey === active.id).map((x) => (
                      <div key={x.id} className="rounded border bg-amber-50 p-2 text-xs dark:bg-amber-950/30">
                        <p className="whitespace-pre-wrap">{x.text}</p>
                        <div className="text-muted-foreground mt-1 flex items-center justify-between gap-2">
                          <span>{x.author ?? ""} {new Date(x.createdAt).toLocaleDateString("tr-TR")}</span>
                          <button
                            type="button"
                            className="text-red-600 hover:underline"
                            onClick={() => {
                              void deleteTopologyNote(x.id).then((r) => {
                                if (r.ok) setNotes((list) => list.filter((y) => y.id !== x.id));
                                else setStatus(r.message ?? "Silinemedi.");
                              });
                            }}
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    ))}
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Bu nesneye bilgi ekleyin (IP, sorumlu, kural no, açıklama…)"
                      className="border-input bg-background w-full rounded-md border px-2 py-1 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !draft.trim()}
                      onClick={() => {
                        setBusy(true);
                        void addTopologyNote(serviceId, active.id, active.label, draft).then((r) => {
                          setBusy(false);
                          if (r.ok && r.data) {
                            setNotes((list) => [...list, r.data as NoteRow]);
                            setDraft("");
                          } else setStatus(r.message ?? "Kaydedilemedi.");
                        });
                      }}
                    >
                      Not ekle
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {active.href ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={active.href}>Kaydı aç</Link>
                    </Button>
                  ) : null}
                  {active.editHref ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={active.editHref}>Bağlantıları düzenle</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Bir şekle tıklayın; bağlantıları vurgulanır, ayrıntısı burada görünür.</p>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">Erişim renkleri</p>
            <ul className="space-y-1 text-xs">
              {AUDIENCE_KINDS.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-4 rounded" style={{ background: AUDIENCE_KIND_COLORS[t] }} />
                  {AUDIENCE_KIND_LABELS[t]}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">Okların üzerindeki yazı port ve protokoldür. Kesikli yeşil çizgi: hizmetin çalıştığı sunucu. Mor çizgi: hizmetin eriştiği sistem. Kırmızı rozet: açık zafiyet. Kesikli çerçeve rengi: kritiklik.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">Şekiller</p>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
              {SHAPE_LEGEND.map((s) => (
                <li key={s.shape} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 64 52" className="h-5 w-6 shrink-0 rounded bg-white" aria-hidden>
                    <ShapeIcon shape={s.shape} />
                  </svg>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
