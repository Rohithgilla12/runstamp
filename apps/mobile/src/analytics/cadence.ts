// Cadence trend computation. Strava + Apple Health surface an average
// cadence (steps per minute) per run. We plot the trend as one point per
// activity-with-cadence, sorted by date. No bucketing — cadence is already
// run-averaged, so further smoothing would mask real form changes.

interface Row { date: string; cadence?: number }

export interface CadencePoint { date: string; value: number }

// Plausible running cadence range. World records max around 230 spm; a
// brisk walk floors near 100. HealthKit's speed÷stride derivation has
// produced runaway numbers (3000+) when stride samples were near zero —
// the analytics view filters those out so the trend stays readable.
export const CADENCE_MIN_SPM = 100;
export const CADENCE_MAX_SPM = 240;

/** Returns only the rows with a recorded cadence, sorted by date ascending. */
export function cadenceSeries(rows: readonly Row[]): CadencePoint[] {
  const points: CadencePoint[] = [];
  for (const r of rows) {
    if (
      typeof r.cadence === 'number'
      && r.cadence >= CADENCE_MIN_SPM
      && r.cadence <= CADENCE_MAX_SPM
    ) {
      points.push({ date: r.date, value: r.cadence });
    }
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return points;
}

/** Current cadence = the most recent measurement. Null when no data. */
export function currentCadence(series: readonly CadencePoint[]): number | null {
  if (series.length === 0) return null;
  return series[series.length - 1].value;
}

/**
 * 28-day delta: difference between the average cadence over the last 28
 * days and the average 28-60 days ago. Returns null when there's not
 * enough data on either side to make the comparison meaningful.
 */
export function deltaCadence(series: readonly CadencePoint[], ref: Date = new Date()): number | null {
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
