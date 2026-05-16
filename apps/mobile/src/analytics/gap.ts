// Monthly "elevation tax" — average pace difference between raw and GAP
// across all runs in the month, weighted by distance. Positive value =
// hills are slowing you down by X sec/km on average; close to zero =
// you're running flat terrain or the climbs are negligible.
//
// Cite: Minetti AE et al., J Appl Physiol 2002;93(3):1039–1046.

interface Row { date: string; pace: number; gapPace?: number; distance: number }

export interface GapTaxPoint {
  month: string;
  /** sec/km: positive = raw is slower than GAP (terrain cost). */
  meanTaxSecPerKm: number;
  totalKm: number;
  runs: number;
}

export function gapTaxSeries(rows: readonly Row[]): GapTaxPoint[] {
  const buckets = new Map<string, { totalTax: number; totalKm: number; runs: number }>();
  for (const r of rows) {
    if (!r.gapPace || r.gapPace <= 0) continue;
    if (r.pace <= 0 || r.distance <= 0) continue;
    const tax = r.pace - r.gapPace; // sec/km — positive = climbs cost you
    const month = r.date.slice(0, 7);
    const b = buckets.get(month) ?? { totalTax: 0, totalKm: 0, runs: 0 };
    b.totalTax += tax * r.distance;
    b.totalKm += r.distance;
    b.runs += 1;
    buckets.set(month, b);
  }
  const out: GapTaxPoint[] = [];
  for (const [month, b] of buckets) {
    out.push({
      month,
      meanTaxSecPerKm: b.totalTax / b.totalKm,
      totalKm: b.totalKm,
      runs: b.runs,
    });
  }
  out.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  return out;
}

export function lifetimeAvgTax(series: readonly GapTaxPoint[]): number | null {
  if (series.length === 0) return null;
  let totalTaxKm = 0;
  let totalKm = 0;
  for (const p of series) {
    totalTaxKm += p.meanTaxSecPerKm * p.totalKm;
    totalKm += p.totalKm;
  }
  return totalKm > 0 ? totalTaxKm / totalKm : null;
}
