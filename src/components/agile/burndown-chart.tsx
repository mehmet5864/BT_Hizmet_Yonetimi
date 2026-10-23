import type { BurndownPoint } from "@/lib/agile/metrics";

export function BurndownChart({ data }: { data: BurndownPoint[] }) {
  const W = 640;
  const H = 220;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const max = Math.max(1, ...data.map((d) => Math.max(d.ideal, d.remaining ?? 0)));
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ideal = data.map((d, i) => `${x(i)},${y(d.ideal)}`).join(" ");
  const actualPts = data.flatMap((d, i) => (d.remaining == null ? [] : [`${x(i)},${y(d.remaining)}`]));
  const step = Math.max(1, Math.ceil(data.length / 8));
  const lastIdx = data.reduce((acc, d, i) => (d.remaining == null ? acc : i), -1);
  const last = lastIdx >= 0 ? data[lastIdx] : null;
  const area = actualPts.length ? `${x(0)},${y(0)} ${actualPts.join(" ")} ${x(lastIdx)},${y(0)}` : "";
  return (
    <div className="space-y-2">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Burndown grafiği" className="h-auto w-full">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" opacity={0.12} />
          <text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      <polyline points={ideal} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeDasharray="5 4" strokeWidth={1.5} />
      {area ? <polygon points={area} fill="var(--primary, #16a34a)" fillOpacity={0.12} /> : null}
      {actualPts.length ? <polyline points={actualPts.join(" ")} fill="none" stroke="var(--primary, #16a34a)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {last && last.remaining != null ? (
        <g>
          <circle cx={x(lastIdx)} cy={y(last.remaining)} r={5} fill="var(--primary, #16a34a)" stroke="var(--card, #fff)" strokeWidth={2} />
          <text x={Math.min(x(lastIdx) + 8, W - pad.r - 14)} y={y(last.remaining) - 8} fontSize="11" fontWeight={600} fill="currentColor">
            {last.remaining}
          </text>
        </g>
      ) : null}
      {data.map((d, i) =>
        i % step === 0 ? (
          <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity={0.6}>
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
    <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-5 rounded bg-current opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor 0 5px, transparent 5px 9px)", backgroundColor: "transparent" }} />
        İdeal gidişat
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-primary h-1 w-5 rounded" />
        Kalan puan
      </span>
    </div>
    </div>
  );
}
