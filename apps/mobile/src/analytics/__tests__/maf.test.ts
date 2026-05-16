import { describe, expect, it } from 'vitest';
import { currentMafPace, mafHr, mafImprovementSec, mafPaceSeries } from '../maf';

describe('mafHr', () => {
  it('returns 180 − age + adjustment', () => {
    const ref = new Date(2026, 4, 16);
    expect(mafHr(1990, 0, ref)).toBe(180 - 36);   // 144
    expect(mafHr(1990, -5, ref)).toBe(180 - 36 - 5); // 139
    expect(mafHr(1990, 5, ref)).toBe(180 - 36 + 5); // 149
    expect(mafHr(1990, -10, ref)).toBe(180 - 36 - 10); // 134
  });
});

describe('mafPaceSeries', () => {
  it('buckets sub-MAF runs by month with distance-weighted pace', () => {
    const rows = [
      { date: '2026-05-01', pace: 360, avgHr: 140, distance: 10 }, // sub-MAF
      { date: '2026-05-10', pace: 340, avgHr: 140, distance: 5 },  // sub-MAF
      { date: '2026-05-15', pace: 280, avgHr: 170, distance: 8 },  // above MAF
      { date: '2026-04-01', pace: 380, avgHr: 138, distance: 6 },  // sub-MAF, April
    ];
    const series = mafPaceSeries(rows, 144);
    expect(series).toHaveLength(2);
    expect(series[0].month).toBe('2026-04');
    expect(series[0].meanPaceSecPerKm).toBe(380);
    expect(series[1].month).toBe('2026-05');
    // weighted: (360 × 10 + 340 × 5) / 15 = (3600 + 1700) / 15 = 353.33
    expect(series[1].meanPaceSecPerKm).toBeCloseTo(353.33, 1);
    expect(series[1].totalKm).toBe(15);
    expect(series[1].runs).toBe(2);
  });

  it('excludes runs without avgHR or below 1 km', () => {
    const rows = [
      { date: '2026-05-01', pace: 360, distance: 10 },                  // no HR
      { date: '2026-05-02', pace: 360, avgHr: 140, distance: 0.5 },     // too short
      { date: '2026-05-03', pace: 360, avgHr: 140, distance: 5 },       // OK
    ];
    const series = mafPaceSeries(rows, 144);
    expect(series).toHaveLength(1);
    expect(series[0].runs).toBe(1);
  });
});

describe('currentMafPace + mafImprovementSec', () => {
  const series = [
    { month: '2026-02', meanPaceSecPerKm: 380, totalKm: 20, runs: 4 },
    { month: '2026-03', meanPaceSecPerKm: 370, totalKm: 22, runs: 5 },
    { month: '2026-05', meanPaceSecPerKm: 350, totalKm: 28, runs: 6 },
  ];
  it('returns most recent month pace', () => {
    expect(currentMafPace(series)).toBe(350);
  });
  it('returns improvement = first − last, positive when faster', () => {
    expect(mafImprovementSec(series)).toBe(30);
  });
  it('improvement null with only one month', () => {
    expect(mafImprovementSec([series[0]])).toBeNull();
  });
});
