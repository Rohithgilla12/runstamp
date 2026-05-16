export interface MonthlyPoint { ym: string; monthlyKm: number; cumulativeKm: number }

interface Row { date: string; distance: number }

function ymOf(iso: string): string { return iso.slice(0, 7); }

function nextYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function monthlyCumulative(rows: readonly Row[], ref: Date = new Date()): MonthlyPoint[] {
  if (rows.length === 0) return [];
  const byMonth = new Map<string, number>();
  let firstYm = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  for (const r of rows) {
    const ym = ymOf(r.date);
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + r.distance);
    if (ym < firstYm) firstYm = ym;
  }
  const lastYm = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  const out: MonthlyPoint[] = [];
  let cum = 0;
  for (let ym = firstYm; ; ym = nextYm(ym)) {
    const m = byMonth.get(ym) ?? 0;
    cum += m;
    out.push({ ym, monthlyKm: m, cumulativeKm: cum });
    if (ym === lastYm) break;
  }
  return out;
}
