// Acute:Chronic Workload Ratio — an injury-risk load-management heuristic
// (Gabbett 2016). Acute = the 7-day EWMA of daily TRIMP (LoadPoint.atl);
// chronic = a 28-day EWMA of the same daily load, using the app's 1/τ
// smoothing so it stays consistent with the Form chart's atl/ctl. Pure +
// react-native-free so the vitest (node) suite can cover it.

import type { LoadPoint } from './trainingLoad';

const TAU_CHRONIC = 28; // days
const WARMUP_DAYS = 28; // ACWR is unstable until ~one chronic window of history
const MIN_CHRONIC = 1; // below this, the ratio is divide-by-noise → undefined

export type RiskLevel = 'rampdown' | 'optimal' | 'caution' | 'high';

export interface AcwrPoint {
  date: string;
  acwr: number;
  acute: number;
  chronic: number;
}

/** Acute/chronic ratio, or null when chronic load is below the noise floor. */
export function computeACWR(acute: number, chronic: number): number | null {
  if (chronic < MIN_CHRONIC) return null;
  return acute / chronic;
}

/** Walks the daily load series, building a 28-day EWMA chronic load and the ACWR. */
export function acwrSeries(load: readonly LoadPoint[]): AcwrPoint[] {
  if (load.length === 0) return [];
  const out: AcwrPoint[] = [];
  // Seed chronic to the first day's load to avoid cold-start bias in the EWMA.
  let chronic = load[0].load;
  for (let i = 0; i < load.length; i++) {
    const p = load[i];
    chronic += (p.load - chronic) / TAU_CHRONIC;
    if (i < WARMUP_DAYS) continue;
    const acwr = computeACWR(p.atl, chronic);
    if (acwr === null) continue;
    out.push({ date: p.date, acwr, acute: p.atl, chronic });
  }
  return out;
}

export function currentACWR(series: readonly AcwrPoint[]): number | null {
  return series.length === 0 ? null : series[series.length - 1].acwr;
}

/** Gabbett zones: <0.8 ramp-down, 0.8–1.3 sweet spot, 1.3–1.5 caution, >1.5 high. */
export function acwrRisk(acwr: number | null): RiskLevel | null {
  if (acwr === null) return null;
  if (acwr < 0.8) return 'rampdown';
  if (acwr <= 1.3) return 'optimal';
  if (acwr <= 1.5) return 'caution';
  return 'high';
}
