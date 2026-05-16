// Aerobic Decoupling (Pa:HR) — TrainingPeaks / Joe Friel.
//
// Split a steady run into first half and second half by km. For each half:
//   EF (efficiency factor) = mean_speed / mean_HR
// Decoupling % = (EF_first − EF_second) / EF_first × 100
//
// Positive value = HR drifted up while pace stayed flat → aerobic
// inefficiency / fatigue / heat / underfueling.
//   < 5%   aerobically fit
//   5–10%  okay
//   > 10%  needs more aerobic base
//
// Valid only on steady runs ≥ ~6 km of splits (TrainingPeaks recommends
// ≥ 60 min). Interval workouts will read garbage — gate on a low pace
// CV to filter those out.
//
// Cite: Friel J, *The Triathlete's Training Bible*; TrainingPeaks
// coach-blog "Aerobic Endurance and Decoupling".

export interface DecouplingSplit { sec: number; hr: number }

export interface DecouplingPoint {
  date: string;
  decouplingPct: number;
  splitCount: number;
}

const MIN_SPLITS = 6;
const MAX_PACE_CV = 0.20; // 20% — anything noisier is likely intervals

/** Decoupling % for one run, or null when input doesn't qualify. */
export function computeDecoupling(splits: readonly DecouplingSplit[]): number | null {
  const usable = splits.filter((s) => s.sec > 0 && s.hr > 0);
  if (usable.length < MIN_SPLITS) return null;
  if (paceCv(usable) > MAX_PACE_CV) return null;

  const mid = Math.floor(usable.length / 2);
  const ef1 = efOf(usable.slice(0, mid));
  const ef2 = efOf(usable.slice(mid));
  if (ef1 <= 0) return null;
  return ((ef1 - ef2) / ef1) * 100;
}

function efOf(splits: readonly DecouplingSplit[]): number {
  // Each split = ~1 km. Speed = N / total_sec (km/s). EF = speed / mean_HR.
  const totalSec = splits.reduce((s, x) => s + x.sec, 0);
  const meanHr = splits.reduce((s, x) => s + x.hr, 0) / splits.length;
  if (totalSec <= 0 || meanHr <= 0) return 0;
  return (splits.length / totalSec) / meanHr;
}

function paceCv(splits: readonly DecouplingSplit[]): number {
  const mean = splits.reduce((s, x) => s + x.sec, 0) / splits.length;
  if (mean <= 0) return Infinity;
  const variance = splits.reduce((s, x) => s + (x.sec - mean) ** 2, 0) / splits.length;
  return Math.sqrt(variance) / mean;
}

interface RowWithSplits { date: string; splits?: readonly DecouplingSplit[] }

/** Decoupling series — sorted ascending by date, runs that don't qualify dropped. */
export function decouplingSeries(rows: readonly RowWithSplits[]): DecouplingPoint[] {
  const out: DecouplingPoint[] = [];
  for (const r of rows) {
    if (!r.splits) continue;
    const pct = computeDecoupling(r.splits);
    if (pct === null) continue;
    out.push({ date: r.date, decouplingPct: pct, splitCount: r.splits.length });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

/** Average of the most recent N points, or null. */
export function recentAvg(series: readonly DecouplingPoint[], n = 4): number | null {
  if (series.length === 0) return null;
  const tail = series.slice(-n);
  return tail.reduce((s, p) => s + p.decouplingPct, 0) / tail.length;
}
