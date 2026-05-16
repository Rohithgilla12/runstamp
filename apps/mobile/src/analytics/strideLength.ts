// Stride length per run, derived from average speed + cadence.
//
//   speed_m_per_s = (distance_km × 1000) / seconds
//   steps_per_sec = cadence_spm / 60
//   stride_m     = speed_m_per_s / steps_per_sec
//
// Both Strava and Apple report cadence as steps/min (each foot strike =
// one count), so this is meters per *step*. Multiply by 2 for the academic
// "stride" (same-foot to same-foot).
//
// Cite: Heiderscheit BC et al. *Effects of step rate manipulation on
// joint mechanics during running.* Med Sci Sports Exerc 2011;43(2):296–302.

interface Row { date: string; distance: number; seconds: number; cadence?: number }

export interface StridePoint { date: string; value: number }

export function strideSeries(rows: readonly Row[]): StridePoint[] {
  const points: StridePoint[] = [];
  for (const r of rows) {
    if (!r.cadence || r.cadence <= 0) continue;
    if (r.distance <= 0 || r.seconds <= 0) continue;
    const speed = (r.distance * 1000) / r.seconds;
    const sl = speed / (r.cadence / 60);
    // Sanity: a meter-per-step over 3 m is biomechanically impossible
    // for a normal runner; under 0.4 m is walking-territory or a data glitch.
    if (sl < 0.4 || sl > 3) continue;
    points.push({ date: r.date, value: sl });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return points;
}

export function currentStride(series: readonly StridePoint[]): number | null {
  if (series.length === 0) return null;
  return series[series.length - 1].value;
}

/** 28-day delta vs the 28-60d window. Returns null without enough data. */
export function deltaStride(series: readonly StridePoint[], ref: Date = new Date()): number | null {
  if (series.length < 2) return null;
  const refTs = ref.getTime();
  const MS_PER_DAY = 86_400_000;
  const recent: number[] = [];
  const baseline: number[] = [];
  for (const p of series) {
    const [y, m, d] = p.date.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    const days = Math.floor((refTs - t) / MS_PER_DAY);
    if (days >= 0 && days <= 28) recent.push(p.value);
    else if (days > 28 && days <= 60) baseline.push(p.value);
  }
  if (recent.length === 0 || baseline.length === 0) return null;
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  return Number((recentAvg - baselineAvg).toFixed(2));
}
