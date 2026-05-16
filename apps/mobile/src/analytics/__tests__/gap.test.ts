import { describe, expect, it } from 'vitest';
import { gapTaxSeries, lifetimeAvgTax } from '../gap';

describe('gapTaxSeries', () => {
  it('returns one point per month with distance-weighted average tax', () => {
    const rows = [
      { date: '2026-05-01', pace: 320, gapPace: 305, distance: 10 }, // 15s tax × 10 km
      { date: '2026-05-15', pace: 340, gapPace: 320, distance: 5 },  // 20s tax × 5 km
      { date: '2026-04-01', pace: 300, gapPace: 295, distance: 8 },  // 5s tax × 8 km
    ];
    const series = gapTaxSeries(rows);
    expect(series.map((p) => p.month)).toEqual(['2026-04', '2026-05']);
    expect(series[0].meanTaxSecPerKm).toBe(5);
    // (15 × 10 + 20 × 5) / 15 = 250 / 15 = 16.67
    expect(series[1].meanTaxSecPerKm).toBeCloseTo(16.67, 1);
    expect(series[1].totalKm).toBe(15);
    expect(series[1].runs).toBe(2);
  });

  it('drops rows without gapPace', () => {
    const rows = [
      { date: '2026-05-01', pace: 320, distance: 10 },
      { date: '2026-05-02', pace: 320, gapPace: 0, distance: 10 },
    ];
    expect(gapTaxSeries(rows)).toHaveLength(0);
  });
});

describe('lifetimeAvgTax', () => {
  it('weighs by km across months', () => {
    const series = [
      { month: '2026-04', meanTaxSecPerKm: 10, totalKm: 20, runs: 4 },
      { month: '2026-05', meanTaxSecPerKm: 20, totalKm: 80, runs: 10 },
    ];
    // (10 × 20 + 20 × 80) / 100 = 1800 / 100 = 18
    expect(lifetimeAvgTax(series)).toBe(18);
  });
  it('returns null on empty', () => {
    expect(lifetimeAvgTax([])).toBeNull();
  });
});
