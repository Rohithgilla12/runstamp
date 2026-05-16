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

type DistRow = { date: string; distance: number };

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

// Sun-to-Sat grid covering the calendar `year`; days after `today` are inFuture.
export function buildHeatmap<T extends DistRow>(
  rows: readonly T[],
  year: number,
  today: Date = new Date(),
): HeatmapGrid {
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startWeek = startOfWeekSunday(new Date(year, 0, 1));
  const yearEnd = new Date(year, 11, 31);
  const endSat = new Date(yearEnd.getFullYear(), yearEnd.getMonth(), yearEnd.getDate());
  endSat.setDate(endSat.getDate() + (6 - endSat.getDay()));
  const totalDays = Math.round((endSat.getTime() - startWeek.getTime()) / MS_PER_DAY) + 1;
  const numWeeks = totalDays / 7;

  const byDate = new Map<string, number>();
  for (const r of rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.distance);
  }

  const weeks: HeatmapDay[][] = [];
  for (let w = 0; w < numWeeks; w++) {
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
  return { weeks, start: isoDate(startWeek), end: isoDate(endSat) };
}
