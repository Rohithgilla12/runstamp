export interface HeatmapDay {
  date: string;
  km: number;
  bucket: 0 | 1 | 2 | 3 | 4;
  inFuture: boolean;
}

export interface HeatmapGrid {
  weeks: HeatmapDay[][];
  start: string;
  end: string;
}

interface DistRow { date: string; distance: number }

const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay());
  return out;
}

export function kmBucket(km: number): 0 | 1 | 2 | 3 | 4 {
  if (km <= 0) return 0;
  if (km < 5) return 1;
  if (km < 10) return 2;
  if (km < 20) return 3;
  return 4;
}

export function buildHeatmap(rows: readonly DistRow[], ref: Date = new Date()): HeatmapGrid {
  const todayLocal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const endWeek = startOfWeekSunday(todayLocal);
  const startWeek = new Date(endWeek.getTime() - 52 * 7 * MS_PER_DAY);

  const byDate = new Map<string, number>();
  for (const r of rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.distance);
  }

  const weeks: HeatmapDay[][] = [];
  for (let w = 0; w < 53; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(startWeek.getTime() + (w * 7 + d) * MS_PER_DAY);
      const date = isoDate(cell);
      const km = byDate.get(date) ?? 0;
      week.push({
        date,
        km,
        bucket: kmBucket(km),
        inFuture: cell.getTime() > todayLocal.getTime(),
      });
    }
    weeks.push(week);
  }
  return { weeks, start: isoDate(startWeek), end: isoDate(new Date(endWeek.getTime() + 6 * MS_PER_DAY)) };
}
