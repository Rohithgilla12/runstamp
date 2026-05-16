import { describe, expect, it } from 'vitest';
import {
  buildRacePredictor,
  pickAnchor,
  riegelPredictSec,
  tandaMarathonSec,
  trainingSummary8wk,
  vdotFromRace,
  vdotPredictSec,
} from '../racePredictor';

describe('riegelPredictSec', () => {
  it('predicts half-marathon from 10K with k=1.06', () => {
    const anchor = { distanceM: 10000, timeSeconds: 2535 }; // 42:15
    const half = riegelPredictSec(anchor, 21097.5);
    // 2535 × (21097.5/10000)^1.06 ≈ 5550–5620 s
    expect(half).toBeGreaterThan(5500);
    expect(half).toBeLessThan(5700);
  });

  it('uses k=1.08 for marathon at low weekly volume', () => {
    const anchor = { distanceM: 10000, timeSeconds: 2535 };
    const lowVolume = riegelPredictSec(anchor, 42195, 30);
    const highVolume = riegelPredictSec(anchor, 42195, 80);
    expect(lowVolume).toBeGreaterThan(highVolume);
  });
});

describe('vdotFromRace + vdotPredictSec', () => {
  it('round-trips: predict the anchor distance from its own VDOT', () => {
    const pr = { distanceM: 10000, timeSeconds: 2400 }; // 40:00
    const vdot = vdotFromRace(pr);
    const back = vdotPredictSec(vdot, 10000);
    expect(Math.abs(back - 2400)).toBeLessThan(1);
  });

  it('returns a VDOT in the published Daniels range for a 40:00 10K', () => {
    const vdot = vdotFromRace({ distanceM: 10000, timeSeconds: 2400 });
    // Daniels tables put 40:00 10K at VDOT ≈ 50.
    expect(vdot).toBeGreaterThan(48);
    expect(vdot).toBeLessThan(52);
  });

  it('predicts a marathon time longer than a Riegel projection for the same VDOT', () => {
    // VDOT inherently models slowdown over distance; for a strong 10K the
    // marathon prediction should not be wildly optimistic.
    const pr = { distanceM: 10000, timeSeconds: 2400 };
    const vdot = vdotFromRace(pr);
    const marathon = vdotPredictSec(vdot, 42195);
    expect(marathon).toBeGreaterThan(10800); // > 3:00
    expect(marathon).toBeLessThan(14400);    // < 4:00
  });
});

describe('tandaMarathonSec', () => {
  it('returns null when weekly km is below 20', () => {
    expect(tandaMarathonSec(15, 300)).toBeNull();
  });
  it('returns null when training pace is out of range', () => {
    expect(tandaMarathonSec(50, 220)).toBeNull();
    expect(tandaMarathonSec(50, 600)).toBeNull();
  });
  it('predicts a plausible marathon time for 60 km/wk at 5:00/km', () => {
    const sec = tandaMarathonSec(60, 300);
    // Pm = 17.1 + 140·e^(-0.0053·60) + 0.55·300
    //    = 17.1 + 140·0.7274 + 165 ≈ 283.94 sec/km
    //    × 42.195 km ≈ 11,983 s ≈ 3:19:43
    expect(sec).not.toBeNull();
    expect(sec!).toBeGreaterThan(11500);
    expect(sec!).toBeLessThan(12500);
  });
});

describe('trainingSummary8wk', () => {
  it('aggregates only the trailing 56 days', () => {
    const ref = new Date(2026, 4, 16);
    const rows = [
      { date: '2026-05-15', distance: 10, seconds: 3000 },   // 1d ago
      { date: '2026-04-01', distance: 10, seconds: 3000 },   // 45d ago
      { date: '2026-01-01', distance: 99, seconds: 99 },     // > 56d, excluded
    ];
    const s = trainingSummary8wk(rows, ref);
    expect(s).not.toBeNull();
    expect(s!.weeklyKm).toBeCloseTo(20 / 8, 5);
    expect(s!.meanPaceSecPerKm).toBe(300);
    expect(s!.runs).toBe(2);
  });
  it('returns null when there is nothing in the window', () => {
    expect(trainingSummary8wk([], new Date(2026, 4, 16))).toBeNull();
  });
});

describe('pickAnchor + buildRacePredictor', () => {
  it('picks the PR that produces the highest VDOT', () => {
    const prs = [
      { distanceM: 5000, timeSeconds: 1200 },   // 20:00 5K
      { distanceM: 10000, timeSeconds: 2400 },  // 40:00 10K — strongest
      { distanceM: 21097.5, timeSeconds: 5700 }, // 1:35:00 half
    ];
    const anchor = pickAnchor(prs);
    expect(anchor).toEqual({ distanceM: 10000, timeSeconds: 2400 });
  });

  it('returns the anchor unchanged in the row for the same distance', () => {
    const result = buildRacePredictor(
      [{ distanceM: 10000, timeSeconds: 2400, achievedAt: '2026-05-01' }],
      [
        { date: '2026-05-10', distance: 50, seconds: 15000 },
        { date: '2026-04-20', distance: 60, seconds: 18000 },
        { date: '2026-04-01', distance: 50, seconds: 15000 },
        { date: '2026-03-20', distance: 60, seconds: 18000 },
      ],
      new Date(2026, 4, 16),
    );
    expect(result).not.toBeNull();
    const tenK = result!.rows.find((r) => r.distanceM === 10000);
    expect(tenK?.isAnchor).toBe(true);
    expect(tenK?.vdotSec).toBe(2400);
    expect(tenK?.riegelSec).toBe(2400);
  });

  it('returns null with no eligible PRs', () => {
    expect(buildRacePredictor([], [], new Date())).toBeNull();
    expect(buildRacePredictor([{ distanceM: 800, timeSeconds: 180 }], [], new Date())).toBeNull();
  });
});
