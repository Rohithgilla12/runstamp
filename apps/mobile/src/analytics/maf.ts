// MAF (Maximum Aerobic Function) — Phil Maffetone's 180-formula.
//
//   MAF_HR = 180 − age + adjustment
//
// Adjustment options:
//   −10  recovering from major illness, on medication, or training
//        inconsistently for years
//   −5   recurrent colds/allergies, returning from injury, or
//        inconsistent training (<2 yrs of regular work)
//    0   default — consistent 2+ years of training without issue
//   +5   2+ years of progress, competitive masters athlete
//
// MAF Test: run a fixed loop (a "MAF mile" or 5-mile/5K segment) every
// 4–6 weeks at sub-MAF HR. Pace at the same HR getting faster month
// over month = aerobic engine improving.
//
// This module surfaces *monthly* aggregates of pace at sub-MAF runs.
// Improvement = the line trending downward (faster).
//
// Cite: Maffetone PB, Laursen PB. *Maximum aerobic function: clinical
// relevance, physiological underpinnings, and practical application.*
// Frontiers in Physiology 2020;11:296. PMC7142223.
//
// Caveat: a 2025 meta-analysis (412 runners) shows true LT1 spans
// 69–94% HRmax — MAF HR can land above or below any individual's
// real aerobic threshold. Treat it as an approximation, not a lab
// measurement.

export type MafAdjustment = -10 | -5 | 0 | 5;

export function mafHr(birthYear: number, adjustment: MafAdjustment = 0, ref: Date = new Date()): number {
  const age = ref.getFullYear() - birthYear;
  return 180 - age + adjustment;
}

interface Row { date: string; pace: number; avgHr?: number; distance: number }

export interface MafPoint {
  /** ISO month, e.g. "2026-05". */
  month: string;
  /** Distance-weighted mean pace (sec/km) of sub-MAF runs in this month. */
  meanPaceSecPerKm: number;
  /** Total km of sub-MAF running in this month — bigger dot = more reliable. */
  totalKm: number;
  /** Number of qualifying runs in this month. */
  runs: number;
}

/**
 * Returns one point per calendar month where the user has logged at least
 * one run with avgHR ≤ MAF_HR. Pace is distance-weighted across all
 * sub-MAF runs in that month.
 *
 * Runs without avgHR are excluded (we can't tell if they were sub-MAF).
 * Runs below 1 km are excluded as noise.
 */
export function mafPaceSeries(rows: readonly Row[], mafHrThreshold: number): MafPoint[] {
  const buckets = new Map<string, { totalSec: number; totalKm: number; runs: number }>();
  for (const r of rows) {
    if (!r.avgHr || r.avgHr <= 0) continue;
    if (r.avgHr > mafHrThreshold) continue;
    if (r.distance < 1) continue;
    if (r.pace <= 0) continue;
    const month = r.date.slice(0, 7); // YYYY-MM
    const b = buckets.get(month) ?? { totalSec: 0, totalKm: 0, runs: 0 };
    b.totalSec += r.pace * r.distance; // sec/km × km = sec
    b.totalKm += r.distance;
    b.runs += 1;
    buckets.set(month, b);
  }
  const out: MafPoint[] = [];
  for (const [month, b] of buckets) {
    out.push({
      month,
      meanPaceSecPerKm: b.totalSec / b.totalKm,
      totalKm: b.totalKm,
      runs: b.runs,
    });
  }
  out.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  return out;
}

/** Most recent month's pace, or null. */
export function currentMafPace(series: readonly MafPoint[]): number | null {
  if (series.length === 0) return null;
  return series[series.length - 1].meanPaceSecPerKm;
}

/**
 * Improvement = difference between the most-recent month and the earliest
 * available baseline (first month in the series). Positive = faster
 * (pace dropped). Returns null when only one month is available.
 */
export function mafImprovementSec(series: readonly MafPoint[]): number | null {
  if (series.length < 2) return null;
  const first = series[0].meanPaceSecPerKm;
  const last = series[series.length - 1].meanPaceSecPerKm;
  return Math.round(first - last);
}
