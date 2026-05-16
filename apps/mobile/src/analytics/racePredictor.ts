// Race-time predictions triangulated from three sources:
//
//   1. Riegel power law (1981) — T2 = T1 × (D2/D1)^k
//      Default k = 1.06. For marathon prediction from short PRs at low
//      training volume, k = 1.08 (Riegel himself noted the exponent rises
//      for amateurs running long).
//
//   2. Jack Daniels VDOT (Daniels & Gilbert, "Oxygen Power" 1979) — the
//      gold-standard equivalent-performance model. Two nested equations:
//        VO2(v)  = -4.60 + 0.182258·v + 0.000104·v²    (v in m/min)
//        %VO2max = 0.8 + 0.1894393·e^(-0.012778·t)
//                      + 0.2989558·e^(-0.1932605·t)    (t in min)
//        VDOT    = VO2(v_race) / %VO2max(t_race)
//      To predict another distance we invert numerically (bisection on t).
//
//   3. Tanda (2011) marathon predictor — Pm = 17.1 + 140·e^(-0.0053·K)
//      + 0.55·P  (sec/km), where K = mean weekly km over last 8 wks,
//      P = mean training pace (sec/km). Uniquely useful: it predicts
//      marathon time from your training log, no race PR required.
//      Valid only for K ≥ 20 km/wk and 240 ≤ P ≤ 510 sec/km.

export interface RacePr {
  distanceM: number;
  timeSeconds: number;
}

const STANDARD = [
  { distanceM: 1609.34, label: '1 mile' },
  { distanceM: 5000, label: '5K' },
  { distanceM: 10000, label: '10K' },
  { distanceM: 21097.5, label: 'Half' },
  { distanceM: 42195, label: 'Marathon' },
] as const;

export type StandardDistance = (typeof STANDARD)[number];
export const STANDARD_DISTANCES: readonly StandardDistance[] = STANDARD;

/** Riegel — T2 = T1 × (D2/D1)^k. */
export function riegelPredictSec(anchor: RacePr, targetDistanceM: number, weeklyKm?: number): number {
  const k = targetDistanceM >= 30000 && (weeklyKm === undefined || weeklyKm < 60) ? 1.08 : 1.06;
  return anchor.timeSeconds * Math.pow(targetDistanceM / anchor.distanceM, k);
}

/** Daniels VDOT from a race performance. */
export function vdotFromRace(pr: RacePr): number {
  const tMin = pr.timeSeconds / 60;
  if (tMin <= 0) return 0;
  const vMpm = pr.distanceM / tMin;
  const pct = pctVo2max(tMin);
  const vo2 = vo2AtVelocity(vMpm);
  return vo2 / pct;
}

/** Predict time (seconds) at target distance for a given VDOT, by bisection. */
export function vdotPredictSec(vdot: number, distanceM: number): number {
  let lo = 30;        // 30s
  let hi = 36000;     // 10 hr
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const tMin = mid / 60;
    const vMpm = distanceM / tMin;
    const guess = vo2AtVelocity(vMpm) / pctVo2max(tMin);
    if (guess > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function vo2AtVelocity(vMpm: number): number {
  return -4.60 + 0.182258 * vMpm + 0.000104 * vMpm * vMpm;
}

function pctVo2max(tMin: number): number {
  return 0.8
    + 0.1894393 * Math.exp(-0.012778 * tMin)
    + 0.2989558 * Math.exp(-0.1932605 * tMin);
}

/** Tanda marathon time in seconds, or null when training inputs out of range. */
export function tandaMarathonSec(weeklyKm: number, meanPaceSecPerKm: number): number | null {
  if (weeklyKm < 20) return null;
  if (meanPaceSecPerKm < 240 || meanPaceSecPerKm > 510) return null;
  const pmSecPerKm = 17.1 + 140 * Math.exp(-0.0053 * weeklyKm) + 0.55 * meanPaceSecPerKm;
  return pmSecPerKm * 42.195;
}

export interface TrainingActivity { date: string; distance: number; seconds: number }

export interface TrainingSummary {
  weeklyKm: number;
  meanPaceSecPerKm: number;
  totalKm: number;
  runs: number;
}

/** Rolling 8-week training summary anchored at `ref`. Returns null if no runs. */
export function trainingSummary8wk(rows: readonly TrainingActivity[], ref: Date = new Date()): TrainingSummary | null {
  const MS_PER_DAY = 86_400_000;
  const refTs = ref.getTime();
  let totalKm = 0;
  let totalSec = 0;
  let runs = 0;
  for (const r of rows) {
    const [y, m, d] = r.date.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    const days = Math.floor((refTs - t) / MS_PER_DAY);
    if (days < 0 || days > 56) continue;
    totalKm += r.distance;
    totalSec += r.seconds;
    runs += 1;
  }
  if (totalKm < 1) return null;
  return {
    weeklyKm: totalKm / 8,
    meanPaceSecPerKm: totalSec / totalKm,
    totalKm,
    runs,
  };
}

/** Pick the highest-VDOT PR from the list. Distances < 1500m too noisy. */
export function pickAnchor(prs: readonly RacePr[]): RacePr | null {
  let best: RacePr | null = null;
  let bestVdot = -Infinity;
  for (const pr of prs) {
    if (pr.distanceM < 1500) continue;
    if (pr.timeSeconds <= 0) continue;
    const v = vdotFromRace(pr);
    if (v > bestVdot) { best = pr; bestVdot = v; }
  }
  return best;
}

export interface PredictionRow {
  distanceM: number;
  label: string;
  vdotSec: number;
  riegelSec: number;
  isAnchor: boolean;
}

export interface RacePredictorResult {
  anchor: RacePr;
  anchorAchievedAt?: string;
  vdot: number;
  rows: PredictionRow[];
  tandaMarathonSec: number | null;
  weeklyKm: number | null;
  meanPaceSecPerKm: number | null;
}

/** Build the full predictor result table given a list of PRs + training rows. */
export function buildRacePredictor(
  prs: readonly (RacePr & { achievedAt?: string })[],
  trainingRows: readonly TrainingActivity[],
  ref: Date = new Date(),
): RacePredictorResult | null {
  const anchor = pickAnchor(prs);
  if (!anchor) return null;
  const anchorMeta = prs.find((p) => p.distanceM === anchor.distanceM && p.timeSeconds === anchor.timeSeconds);
  const vdot = vdotFromRace(anchor);

  const summary = trainingSummary8wk(trainingRows, ref);
  const weeklyKm = summary?.weeklyKm ?? undefined;
  const tanda = summary ? tandaMarathonSec(summary.weeklyKm, summary.meanPaceSecPerKm) : null;

  const rows: PredictionRow[] = STANDARD.map((d) => {
    const isAnchor = Math.abs(d.distanceM - anchor.distanceM) / anchor.distanceM < 0.02;
    return {
      distanceM: d.distanceM,
      label: d.label,
      vdotSec: isAnchor ? anchor.timeSeconds : vdotPredictSec(vdot, d.distanceM),
      riegelSec: isAnchor ? anchor.timeSeconds : riegelPredictSec(anchor, d.distanceM, weeklyKm),
      isAnchor,
    };
  });

  return {
    anchor,
    anchorAchievedAt: anchorMeta?.achievedAt,
    vdot,
    rows,
    tandaMarathonSec: tanda,
    weeklyKm: summary?.weeklyKm ?? null,
    meanPaceSecPerKm: summary?.meanPaceSecPerKm ?? null,
  };
}
