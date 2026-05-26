import type { Activity } from '../../data/sample';
import type { Period } from '../../analytics/compare';
import { filterByWeek, type WeekKey } from '../../analytics/week';

export type Scope = 'week' | 'month' | 'year' | 'all';

export interface Aggregate {
  totalKm: number;
  runs: number;
  totalSec: number;
  elevM: number;
}

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

export function aggregate(rows: Activity[]): Aggregate {
  let totalKm = 0, runs = 0, totalSec = 0, elevM = 0;
  for (const a of rows) {
    totalKm += a.distance;
    runs += 1;
    totalSec += a.seconds;
    elevM += a.elev;
  }
  return { totalKm, runs, totalSec, elevM };
}

export function filterByScope(rows: Activity[], scope: Scope, year: number, month: number, week: WeekKey): Activity[] {
  if (scope === 'all') return rows;
  if (scope === 'year') {
    return rows.filter((a) => new Date(a.date).getFullYear() === year);
  }
  if (scope === 'month') {
    return rows.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  }
  return filterByWeek(rows, week);
}

// "Wed · 14 May" — readable, runner-coded, same shape across the page.
// Single source of truth so Row and BestEffortRow can't drift again.
export function formatRowDate(d: Date, opts: { withYear: boolean } = { withYear: false }): string {
  if (Number.isNaN(d.getTime())) return '—';
  const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
  const day = d.getDate();
  const mon = d.toLocaleDateString(undefined, { month: 'short' });
  const base = `${dow} · ${day} ${mon}`;
  return opts.withYear ? `${base} ${d.getFullYear()}` : base;
}

export function defaultComparePeriod(scope: Scope, year: number, month: number): Period {
  if (scope === 'year') return { kind: 'year', year: year - 1 };
  let m = month - 1;
  let y = year;
  if (m < 1) { m = 12; y -= 1; }
  return { kind: 'month', year: y, month: m };
}

export function stepComparePeriod(p: Period, dir: 1 | -1): Period {
  if (p.kind === 'year') return { kind: 'year', year: p.year + dir };
  let m = p.month + dir;
  let y = p.year;
  if (m < 1) { m = 12; y -= 1; }
  else if (m > 12) { m = 1; y += 1; }
  return { kind: 'month', year: y, month: m };
}

export function labelPeriod(p: Period): string {
  if (p.kind === 'year') return String(p.year);
  return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
}
