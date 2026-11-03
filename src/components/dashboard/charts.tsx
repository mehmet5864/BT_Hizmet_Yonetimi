/**
 * Saf SVG grafikler (ek paket gerektirmez, sunucu ve istemci bileşenlerinde kullanılabilir):
 * pasta/halka, yüzde halkası, koordinat düzleminde çubuk ve çizgi grafik.
 */

export const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d", "#ea580c", "#475569"];

export type ChartItem = { label: string; value: number; href?: string; color?: string };

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, rOuter, start);
  const [x2, y2] = polar(cx, cy, rOuter, end);
  const [x3, y3] = polar(cx, cy, rInner, end);
  const [x4, y4] = polar(cx, cy, rInner, start);
  return `M${x1} ${y1} A${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

/** Halka (pasta) grafik; ortada toplam. */
export function DonutChart({ items, size = 168, centerLabel = "Toplam" }: { items: ChartItem[]; size?: number; centerLabel?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const c = size / 2;
  const rO = c - 4;
  const rI = rO * 0.62;
  let angle = 0;
  const live = items.filter((i) => i.value > 0);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Dağılım grafiği" className="shrink-0">
      {total === 0 ? (
        <circle cx={c} cy={c} r={(rO + rI) / 2} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={rO - rI} />
      ) : live.length === 1 ? (
        <circle cx={c} cy={c} r={(rO + rI) / 2} fill="none" stroke={live[0].color ?? chartColor(items.indexOf(live[0]))} strokeWidth={rO - rI} />
      ) : (
        live.map((item) => {
          const sweep = (item.value / total) * 360;
          const d = arcPath(c, c, rO, rI, angle, angle + sweep - 0.6);
          angle += sweep;
          return (
            <path key={item.label} d={d} fill={item.color ?? chartColor(items.indexOf(item))}>
              <title>{`${item.label}: ${item.value} (%${Math.round((item.value / total) * 100)})`}</title>
            </path>
          );
        })
      )}
      <text x={c} y={c - 2} textAnchor="middle" fontSize={size * 0.16} fontWeight={700} fill="currentColor">
        {total}
      </text>
      <text x={c} y={c + size * 0.1} textAnchor="middle" fontSize={size * 0.07} fill="currentColor" fillOpacity={0.6}>
        {centerLabel}
      </text>
    </svg>
  );
}

/** Tek bir yüzdeyi gösteren halka (gösterge). */
export function RingGauge({ value, size = 56, color = "#2563eb" }: { value: number; size?: number; color?: string }) {
  const v = Math.min(100, Math.max(0, value));
  const stroke = size * 0.14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`%${v}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(v / 100) * circ} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + size * 0.07} textAnchor="middle" fontSize={size * 0.24} fontWeight={700} fill="currentColor">
        {`%${Math.round(v)}`}
      </text>
    </svg>
  );
}

function niceMax(max: number) {
  if (max <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function clip(text: string, n: number) {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}

const W = 520;
const H = 240;
const M = { l: 36, r: 12, t: 14, b: 44 };

function Axes({ max, ticks = 4 }: { max: number; ticks?: number }) {
  const innerH = H - M.t - M.b;
  return (
    <g>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i;
        const y = M.t + innerH - (v / max) * innerH;
        return (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="currentColor" strokeOpacity={i === 0 ? 0.5 : 0.12} />
            <text x={M.l - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.65}>
              {Math.round(v * 10) / 10}
            </text>
          </g>
        );
      })}
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="currentColor" strokeOpacity={0.5} />
    </g>
  );
}

/** Koordinat düzleminde (x: kategori, y: adet) çubuk grafik. */
export function BarChartXY({ items }: { items: ChartItem[] }) {
  const data = items.slice(0, 10);
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;
  const slot = innerW / Math.max(1, data.length);
  const bw = Math.min(46, slot * 0.62);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Çubuk grafik">
      <Axes max={max} />
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = M.l + slot * i + (slot - bw) / 2;
        return (
          <g key={d.label}>
            <rect x={x} y={M.t + innerH - h} width={bw} height={Math.max(0, h)} rx={3} fill={d.color ?? chartColor(i)}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text x={x + bw / 2} y={M.t + innerH - h - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="currentColor">
              {d.value}
            </text>
            <text x={x + bw / 2} y={H - M.b + 14} textAnchor="middle" fontSize={9.5} fill="currentColor" fillOpacity={0.75}>
              {clip(d.label, Math.max(6, Math.floor(slot / 6)))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export type Series = { name: string; values: number[]; color?: string };

/** Koordinat düzleminde (x: zaman, y: adet) çok serili çizgi grafik. */
export function LineChartXY({ labels, series }: { labels: string[]; series: Series[] }) {
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;
  const n = Math.max(1, labels.length);
  const x = (i: number) => M.l + (n === 1 ? innerW / 2 : (innerW / (n - 1)) * i);
  const y = (v: number) => M.t + innerH - (v / max) * innerH;
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-3xl" role="img" aria-label="Çizgi grafik">
        <Axes max={max} />
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={H - M.b + 14} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.75}>
            {l}
          </text>
        ))}
        {series.map((s, si) => {
          const color = s.color ?? chartColor(si);
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          const area = `${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}`;
          return (
            <g key={s.name}>
              {si === 0 ? <polygon points={area} fill={color} fillOpacity={0.1} /> : null}
              <polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={3.2} fill={color}>
                  <title>{`${s.name} · ${labels[i]}: ${v}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((s, si) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: s.color ?? chartColor(si) }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
