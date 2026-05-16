// VO₂ max trend computation. Apple Health (HKQuantityTypeIdentifierVo2Max)
// + Strava both surface a VO₂ max estimate per activity. We plot the trend
// over time + show the current value as a fitness biomarker hero.
//
// The series is *one point per activity-with-vo2max*, sorted by date. We
// don't aggregate to daily/weekly buckets — VO₂ max is already
// model-derived per workout, so smoothing further would obscure real swings.

interface Row { date: string; vo2max?: number }

export interface Vo2Point { date: string; value: number }

/** Returns only the rows with a recorded VO₂ max, sorted by date ascending. */
export function vo2Series(rows: readonly Row[]): Vo2Point[] {
  const points: Vo2Point[] = [];
  for (const r of rows) {
    if (typeof r.vo2max === 'number' && r.vo2max > 0) {
      points.push({ date: r.date, value: r.vo2max });
    }
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return points;
}

/** Current VO₂ max = the most recent measurement. Null when no data. */
export function currentVo2(series: readonly Vo2Point[]): number | null {
  if (series.length === 0) return null;
  return series[series.length - 1].value;
}

/**
 * 28-day delta: difference between the latest VO₂ max and the average of
 * measurements 28-60 days ago. Returns null when there's not enough data
 * on either side to make the comparison meaningful.
 */
export function deltaVo2(series: readonly Vo2Point[], ref: Date = new Date()): number | null {
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
  return Number((recentAvg - baselineAvg).toFixed(1));
}
