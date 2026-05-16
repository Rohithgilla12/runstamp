export type Period =
  | { kind: 'year'; year: number }
  | { kind: 'month'; year: number; month: number };

interface Dated { date: string }

export function filterByPeriod<T extends Dated>(rows: readonly T[], p: Period): T[] {
  if (p.kind === 'year') {
    const prefix = String(p.year) + '-';
    return rows.filter((r) => r.date.startsWith(prefix));
  }
  const prefix = `${p.year}-${String(p.month).padStart(2, '0')}-`;
  return rows.filter((r) => r.date.startsWith(prefix));
}

export interface Delta { abs: number; pct: number | null }

export function delta(current: number, baseline: number): Delta {
  const abs = current - baseline;
  if (baseline === 0) return { abs, pct: null };
  return { abs, pct: Math.round((abs / baseline) * 100) };
}
