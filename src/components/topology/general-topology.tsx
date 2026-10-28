"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GENERAL_ANCHORS, GENERAL_BANDS, GENERAL_TOPOLOGY, GENERAL_TOPOLOGY_SIZE } from "@/lib/topology/general-topology-data";
import type { TopoEdge, TopoGraph, TopoNode } from "@/lib/topology/types";

export type GeneralZone = "dmz" | "internal" | null;

const FONT = "Segoe UI, Arial, sans-serif";

const SHAPE_FILL: Record<string, string> = {
  server: "#e7f5e1", application: "#e7f5e1", software: "#e7f5e1", os: "#e7f5e1",
  firewall: "#fde2e2", antivirus: "#fde2e2",
  network: "#dbeafe", location: "#dbeafe",
  database: "#fff1c9", storage: "#fff1c9",
};

type Box = { node: TopoNode; x: number; y: number; w: number; h: number };

/** `from` kutusunun merkezinden `to` kutusuna doğru çizilen çizginin `from` kenarındaki kesişim noktası. */
function edgePoint(from: Box, to: Box): [number, number] {
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  const dx = to.x + to.w / 2 - cx;
  const dy = to.y + to.h / 2 - cy;
  if (!dx && !dy) return [cx, cy];
  const t = Math.min(dx ? from.w / 2 / Math.abs(dx) : Infinity, dy ? from.h / 2 / Math.abs(dy) : Infinity);
  return [cx + dx * t, cy + dy * t];
}

function clip(t: string, n: number) {
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

type AnchorKey = keyof typeof GENERAL_ANCHORS;
type GenAnchorRect = { x: number; y: number; w: number; h: number; label: string };
const CLIENT_SHAPES = new Set(["group", "computer", "printer", "tablet", "phone", "ipphone", "peripheral"]);
/** Trafiğin hizmete doğru aktığı kutular (kullanıcı, yönetici, dış erişim, güvenlik duvarı, anahtar); veritabanı ve depolamaya hizmet bağlanır. */
const OUTBOUND = new Set<AnchorKey>(["database", "storage"]);

function anchorFor(n: TopoNode, zone: "dmz" | "internal"): AnchorKey | null {
  if (n.shape === "firewall") return zone === "dmz" ? "disNgfw" : "icNgfw";
  if (n.shape === "network") return zone === "dmz" ? "dmzSwitch" : "coreSwitch";
  if (n.shape === "database") return "database";
  if (n.shape === "storage") return "storage";
  if (n.shape === "vendor") return "disNgfw";
  if (n.shape === "role") return "admin";
  if (CLIENT_SHAPES.has(n.shape)) return "clients";
  return null;
}

/**
 * Hizmeti ve üzerinde çalıştığı sunucuları alana yerleştirir; güvenlik duvarı, anahtar, veritabanı, depolama
 * ve kullanıcılar şemada zaten bulunduğu için ayrıca çizilmez, mevcut kutulara bağlantı olarak gösterilir.
 */
function placeService(graph: TopoGraph, zone: "dmz" | "internal", band: { x: number; y: number; w: number; h: number; horizontal: boolean }) {
  const focus = graph.nodes.find((n) => n.focus) ?? graph.nodes[0];
  const byNode = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgesOf = new Map<string, TopoEdge[]>();
  for (const e of graph.edges) {
    for (const id of [e.from, e.to]) edgesOf.set(id, [...(edgesOf.get(id) ?? []), e]);
  }
  // Alanda: hizmet + sunucular (en çok 6 / DMZ'de 5)
  const max = band.horizontal ? 6 : 5;
  const inBand = [focus, ...graph.nodes.filter((n) => n.id !== focus.id && n.shape === "server")].slice(0, max);
  const bandIds = new Set(inBand.map((n) => n.id));
  const cols = [...new Set(inBand.map((n) => n.col))].sort((a, b) => a - b);
  const pad = 6;
  const boxes: Box[] = [];
  cols.forEach((c, ci) => {
    const list = inBand.filter((n) => n.col === c);
    list.forEach((n, ri) => {
      if (band.horizontal) {
        const cw = (band.w - pad) / cols.length;
        const bw = Math.min(150, cw - 18);
        const ch = (band.h - pad) / list.length;
        const bh = Math.min(38, ch - 4);
        boxes.push({ node: n, w: bw, h: bh, x: band.x + pad / 2 + ci * cw + (cw - bw) / 2, y: band.y + pad / 2 + ri * ch + (ch - bh) / 2 });
      } else {
        const rh = (band.h - pad) / cols.length;
        const bh = Math.min(40, rh - 14);
        const cw = (band.w - pad) / list.length;
        const bw = cw - 8;
        boxes.push({ node: n, w: bw, h: bh, x: band.x + pad / 2 + ri * cw + (cw - bw) / 2, y: band.y + pad / 2 + ci * rh + (rh - bh) / 2 });
      }
    });
  });
  const boxById = new Map(boxes.map((b) => [b.node.id, b]));
  const inner: { e: TopoEdge; a: Box; b: Box }[] = [];
  for (const e of graph.edges) {
    const a = boxById.get(e.from);
    const b = boxById.get(e.to);
    if (a && b) inner.push({ e, a, b });
  }
  // Şemadaki mevcut kutulara bağlantılar
  const groups = new Map<AnchorKey, { names: string[]; labels: string[]; dashed: boolean; from: Box }>();
  let unplaced = 0;
  for (const n of graph.nodes) {
    if (bandIds.has(n.id)) continue;
    const key = anchorFor(n, zone);
    if (!key) {
      if (n.shape !== "person" && n.shape !== "department") unplaced += 1; // hizmet sahibi ağ bağlantısı değildir
      continue;
    }
    // Hangi alan kutusuna bağlandığını bul: önce doğrudan komşu, yoksa hizmet kutusu
    const neighbour = (edgesOf.get(n.id) ?? []).map((e) => (e.from === n.id ? e.to : e.from)).find((id) => boxById.has(id));
    const from = boxById.get(neighbour ?? focus.id) ?? boxById.get(focus.id);
    if (!from) continue;
    const g = groups.get(key) ?? { names: [], labels: [], dashed: true, from };
    g.names.push(n.label);
    for (const e of edgesOf.get(n.id) ?? []) {
      if (e.label && !g.labels.includes(e.label)) g.labels.push(e.label);
      if (!e.dashed) g.dashed = false;
    }
    groups.set(key, g);
  }
  const links = [...groups.entries()].map(([key, g]) => ({ key, ...g, anchor: GENERAL_ANCHORS[key] as GenAnchorRect, inbound: !OUTBOUND.has(key) }));
  void byNode;
  return { boxes, inner, links, unplaced, total: graph.nodes.length, focusId: focus.id };
}

export function GeneralTopology({ serviceName, zone, graph }: { serviceName?: string; zone?: GeneralZone; graph?: TopoGraph }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { w, h } = GENERAL_TOPOLOGY_SIZE;
  const target = zone ? GENERAL_TOPOLOGY.find((p) => p.k === "z" && p.id === zone) : undefined;
  const band = zone ? GENERAL_BANDS[zone] : undefined;
  const placed = band && zone && graph && graph.nodes.length ? placeService(graph, zone, band) : null;
  const hideGroup = placed && band ? band.id : null;
  const [full, setFull] = useState(false);
  // Varsayılan: yalnızca hizmetin ve ilişkili olduğu bileşenlerin gösterildiği görünüm
  const focusMode = !!placed && !full;
  const keep = placed && band ? [{ x: band.x, y: band.y, w: band.w, h: band.h }, ...placed.links.map((l) => l.anchor)] : [];
  const inKeep = (px: number, py: number) => keep.some((r) => px >= r.x - 4 && px <= r.x + r.w + 4 && py >= r.y - 4 && py <= r.y + r.h + 4);
  const minX = Math.min(...keep.map((r) => r.x)) - 30;
  const minY = Math.min(...keep.map((r) => r.y)) - 56;
  const maxX = Math.max(...keep.map((r) => r.x + r.w)) + 30;
  const maxY = Math.max(...keep.map((r) => r.y + r.h)) + 30;
  const viewBox = focusMode ? `${minX} ${minY} ${Math.max(420, maxX - minX)} ${maxY - minY}` : `0 0 ${w} ${h}`;

  function download() {
    const el = svgRef.current;
    if (!el) return;
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const vb = (clone.getAttribute("viewBox") ?? `0 0 ${w} ${h}`).split(" ").map(Number);
    clone.setAttribute("width", String(vb[2]));
    clone.setAttribute("height", String(vb[3]));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "genel-topoloji.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={download}>
          <Download className="size-4" />
          SVG indir
        </Button>
        {placed ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setFull((v) => !v)}>
            {full ? "Yalnız ilişkili bileşenleri göster" : "Tüm şemayı göster"}
          </Button>
        ) : null}
        {serviceName && target ? (
          <span className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs">
            “{serviceName}” hizmeti {zone === "dmz" ? "DMZ" : "İç sunucu bölgesi"} içinde işaretlendi.{placed ? ` Güvenlik duvarı, anahtar, veritabanı, depolama ve kullanıcı bağlantıları şemadaki mevcut kutulara çizildi (${placed.links.length} bağlantı).` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">Bir hizmet seçip “Topolojiyi çiz” derseniz hizmet bu şemada bulunduğu bölgede işaretlenir.</span>
        )}
      </div>
      <div className="overflow-auto rounded-lg border bg-white">
        <svg ref={svgRef} viewBox={viewBox} className="h-auto w-full min-w-[900px]" role="img" aria-label="Genel topoloji" fontFamily={FONT}>
          <defs>
            <marker id="gen-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="#223" />
            </marker>
          </defs>
          <rect x={focusMode ? minX : 0} y={focusMode ? minY : 0} width={focusMode ? Math.max(420, maxX - minX) : w} height={focusMode ? maxY - minY : h} fill="#fff" />
          {GENERAL_TOPOLOGY.map((p, i) => {
            if ("g" in p && p.g && p.g === hideGroup) return null;
            if (focusMode) {
              if (p.k === "r" && !inKeep(p.x + p.w / 2, p.y + p.h / 2)) return null;
              if (p.k === "t" && !inKeep(p.a === "start" ? p.x + 6 : p.x, p.y - 4)) return null;
              if (p.k === "z" || p.k === "l" || p.k === "e") return null;
            }
            switch (p.k) {
              case "z":
                return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={10} fill={p.f} stroke={p.s} strokeWidth={2} strokeDasharray="7 4" />;
              case "r":
                return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} fill={p.f} stroke={p.s} strokeWidth={p.sw} />;
              case "e":
                return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="#dbeafe" stroke="#1d4ed8" strokeWidth={1.5} />;
              case "l":
                return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.c} strokeWidth={p.w} strokeDasharray={p.d ?? undefined} markerEnd={p.ar ? "url(#gen-arrow)" : undefined} />;
              default:
                return (
                  <text key={i} x={p.x} y={p.y} textAnchor={p.a} fontSize={p.fs} fill={p.c} fontWeight={p.b ? 700 : 400}>
                    {p.t}
                  </text>
                );
            }
          })}
          {placed ? (
            <g>
              <rect x={band!.x} y={band!.y} width={band!.w} height={band!.h} rx={8} fill="#fffbeb" stroke="#f59e0b" strokeWidth={1.5} />
              {placed.links.map((l) => {
                const anchorBox: Box = { node: l.from.node, x: l.anchor.x, y: l.anchor.y, w: l.anchor.w, h: l.anchor.h };
                // Trafik yönü: kullanıcı/yönetici/güvenlik duvarı → hizmet; hizmet → veritabanı/depolama
                const [fx, fy] = edgePoint(l.from, anchorBox);
                const [ax, ay] = edgePoint(anchorBox, l.from);
                const [sx, sy, ex, ey] = l.inbound ? [ax, ay, fx, fy] : [fx, fy, ax, ay];
                const text = `${l.names.slice(0, 2).join(", ")}${l.names.length > 2 ? ` +${l.names.length - 2}` : ""}${l.labels.length ? ` · ${l.labels.slice(0, 3).join(", ")}` : ""}`;
                return (
                  <g key={l.key}>
                    <rect x={l.anchor.x - 2} y={l.anchor.y - 2} width={l.anchor.w + 4} height={l.anchor.h + 4} rx={8} fill="none" stroke="#f59e0b" strokeWidth={3} />
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#d97706" strokeWidth={2.2} strokeDasharray={l.dashed ? "6 4" : undefined} markerEnd="url(#gen-arrow)" />
                    <text x={(sx + ex) / 2} y={(sy + ey) / 2 - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#78350f" stroke="#fff" strokeWidth={4} paintOrder="stroke">
                      {clip(text, 64)}
                    </text>
                  </g>
                );
              })}
              {placed.inner.map(({ e, a, b }) => {
                const [sx, sy] = edgePoint(a, b);
                const [ex, ey] = edgePoint(b, a);
                return (
                  <g key={e.id}>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={e.color ?? "#475569"} strokeWidth={1.6} strokeDasharray={e.dashed ? "4 3" : undefined} markerEnd="url(#gen-arrow)" />
                    {e.label ? (
                      <text x={(sx + ex) / 2} y={(sy + ey) / 2 - 3} textAnchor="middle" fontSize={8.5} fill="#334" stroke="#fffbeb" strokeWidth={3} paintOrder="stroke">
                        {clip(e.label, 22)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {placed.boxes.map((b) => (
                <g key={b.node.id}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5} fill={b.node.id === placed.focusId ? "#fde68a" : (SHAPE_FILL[b.node.shape] ?? "#f1f5f9")} stroke={b.node.id === placed.focusId ? "#b45309" : "#334"} strokeWidth={b.node.id === placed.focusId ? 2 : 1} />
                  <text x={b.x + b.w / 2} y={b.y + (b.node.sub ? b.h / 2 - 2 : b.h / 2 + 3)} textAnchor="middle" fontSize={10} fontWeight={700} fill="#111">
                    {clip(b.node.label, Math.max(8, Math.floor(b.w / 6)))}
                  </text>
                  {b.node.sub ? (
                    <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 10} textAnchor="middle" fontSize={8.5} fill="#445">
                      {clip(b.node.sub, Math.max(8, Math.floor(b.w / 5)))}
                    </text>
                  ) : null}
                </g>
              ))}
              {placed.unplaced > 0 ? (
                <text x={band!.x + band!.w - 6} y={band!.y + band!.h - 5} textAnchor="end" fontSize={9} fill="#92400e">{`${placed.unplaced} nesne şemada karşılığı olmadığı için çizilmedi`}</text>
              ) : null}
            </g>
          ) : null}
          {focusMode && band ? (
            <g>
              <rect x={Math.min(...keep.map((r) => r.x))} y={band.y - 40} width={Math.min(520, Math.max(300, (serviceName ?? "").length * 8 + 190))} height={26} rx={13} fill="#f59e0b" />
              <text x={Math.min(...keep.map((r) => r.x)) + 12} y={band.y - 22} fontSize={13} fontWeight={700} fill="#1f2937">
                {`Seçili hizmet: ${(serviceName ?? "").slice(0, 40)} · ${zone === "dmz" ? "DMZ" : "İç sunucu bölgesi"}`}
              </text>
            </g>
          ) : null}
          {!focusMode && target && target.k === "z" ? (
            <g>
              <rect x={target.x - 3} y={target.y - 3} width={target.w + 6} height={target.h + 6} rx={12} fill="none" stroke="#f59e0b" strokeWidth={5} />
              <rect x={target.x + target.w - 330} y={target.y + 4} width={320} height={24} rx={12} fill="#f59e0b" />
              <text x={target.x + target.w - 170} y={target.y + 21} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1f2937">
                {`Seçili hizmet: ${(serviceName ?? "").slice(0, 38)}`}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Yol: İnternet → ISP DDoS (Arbor) → ISP IDS/IPS (Fortinet) → L7 DDoS (HARPP) → Dış NGFW (Palo Alto) → ikiye ayrılır: (1) Citrix WAF → DMZ, (2) İç NGFW (Palo Alto) → IDS/IPS (Trend Micro TippingPoint) → Citrix WAF → İç sunucu bölgesi (core servisler); İç NGFW → İstemci bölgesi.
      </p>
    </div>
  );
}
