// Week-of-year helpers for the Week analytics scope. ISO week semantics:
// weeks start Monday, week 1 is the week containing the first Thursday.
//
// Week label format: "W{n} · {start} – {end}" (e.g. "W20 · May 12 – 18").

const MS_PER_DAY = 86_400_000;
const MONTHS_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

export interface WeekKey {
  /** Local Date object representing the Monday-midnight start of the week. */
  start: Date;
  /** Local Date object for the Sunday-23:59 end of the week. */
  end: Date;
  isoYear: number;
  isoWeek: number;
}

/** Returns the Monday-midnight that anchors the ISO week containing `d`. */
export function startOfIsoWeek(d: Date): Date {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // getDay: Sun=0, Mon=1, ... Sat=6. We want Mon=0, ... Sun=6.
  const offset = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - offset);
  return local;
}

export function weekKeyFor(d: Date): WeekKey {
  const start = startOfIsoWeek(d);
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);
  end.setHours(23, 59, 59, 999);
  // ISO week number: Thursday in the same week determines the year.
  const thursday = new Date(start.getTime() + 3 * MS_PER_DAY);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Monday = startOfIsoWeek(jan4);
  const isoWeek = Math.round((thursday.getTime() - jan4Monday.getTime()) / MS_PER_DAY / 7) + 1;
  return { start, end, isoYear, isoWeek };
}

/** Step forward or backward by `dir` weeks. */
export function stepWeek(w: WeekKey, dir: 1 | -1): WeekKey {
  const next = new Date(w.start.getTime() + dir * 7 * MS_PER_DAY);
  return weekKeyFor(next);
}

/** Human label e.g. "W20 · May 12 – 18" (same-month) or "Apr 28 – May 4". */
export function labelWeek(w: WeekKey): string {
  const startMonth = MONTHS_3[w.start.getMonth()];
  const endMonth = MONTHS_3[w.end.getMonth()];
  if (w.start.getMonth() === w.end.getMonth()) {
    return `W${w.isoWeek} · ${startMonth} ${w.start.getDate()} – ${w.end.getDate()}`;
  }
  return `W${w.isoWeek} · ${startMonth} ${w.start.getDate()} – ${endMonth} ${w.end.getDate()}`;
}

interface Dated { date: string }

/** Returns rows whose date falls inside the given week (Mon-midnight to Sun-23:59). */
export function filterByWeek<T extends Dated>(rows: readonly T[], w: WeekKey): T[] {
  const startTs = w.start.getTime();
  const endTs = w.end.getTime();
  return rows.filter((r) => {
    const [y, m, d] = r.date.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    return t >= startTs && t <= endTs;
  });
}

/** Daily km totals for the seven days of the week (Mon first). */
export function dailyKmForWeek(rows: readonly { date: string; distance: number }[], w: WeekKey): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) {
    const [y, m, d] = r.date.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    if (t < w.start.getTime() || t > w.end.getTime()) continue;
    const dayIndex = Math.floor((t - w.start.getTime()) / MS_PER_DAY);
    if (dayIndex >= 0 && dayIndex < 7) out[dayIndex] += r.distance;
  }
  return out;
}
