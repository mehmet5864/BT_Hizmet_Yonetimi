export type BurndownPoint = { label: string; ideal: number; remaining: number | null };

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Sprint günlük kalan puan serisi. Bitiş tarihi geçmişse tüm aralık, aksi halde bugüne kadar dolu. */
export function buildBurndown(
  sprint: { startDate: Date | null; endDate: Date | null; createdAt: Date; closedAt: Date | null },
  items: { points: number | null; completedAt: Date | null; status: string }[],
  now = new Date(),
): BurndownPoint[] {
  const start = startOfDay(sprint.startDate ?? sprint.createdAt);
  const end = startOfDay(sprint.endDate ?? new Date(start.getTime() + 14 * DAY));
  const total = items.reduce((s, i) => s + (i.points ?? 0), 0);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY));
  const lastActual = startOfDay(sprint.closedAt ?? now);
  const out: BurndownPoint[] = [];
  for (let i = 0; i <= days; i++) {
    const day = new Date(start.getTime() + i * DAY);
    const dayEnd = day.getTime() + DAY - 1;
    const done = items.reduce(
      (s, it) => (it.status === "DONE" && it.completedAt && it.completedAt.getTime() <= dayEnd ? s + (it.points ?? 0) : s),
      0,
    );
    out.push({
      label: `${String(day.getDate()).padStart(2, "0")}.${String(day.getMonth() + 1).padStart(2, "0")}`,
      ideal: Math.round((total - (total * i) / days) * 10) / 10,
      remaining: day.getTime() <= lastActual.getTime() ? total - done : null,
    });
  }
  return out;
}

export function sumPoints(items: { points: number | null }[]) {
  return items.reduce((s, i) => s + (i.points ?? 0), 0);
}
