import { describe, expect, it } from 'vitest';
import { cadenceSeries, currentCadence, deltaCadence } from '../cadence';

describe('cadenceSeries', () => {
  it('returns only rows with plausible cadence, sorted by date', () => {
    const rows = [
      { date: '2026-05-15', cadence: 178 },
      { date: '2026-05-01', cadence: 172 },
      { date: '2026-05-10' },
      { date: '2026-05-12', cadence: 0 },
      { date: '2026-05-20', cadence: 180 },
    ];
    const series = cadenceSeries(rows);
    expect(series.map((p) => p.date)).toEqual(['2026-05-01', '2026-05-15', '2026-05-20']);
    expect(series.map((p) => p.value)).toEqual([172, 178, 180]);
  });

  it('drops impossibly-low and runaway cadence values', () => {
    const rows = [
      { date: '2026-04-01', cadence: 80 },       // too low (under 100)
      { date: '2026-04-02', cadence: 99.9 },     // just under floor
      { date: '2026-04-03', cadence: 100 },      // at floor — kept
      { date: '2026-04-04', cadence: 170 },      // typical run
      { date: '2026-04-05', cadence: 240 },      // at ceiling — kept
      { date: '2026-04-06', cadence: 240.1 },    // just over ceiling
      { date: '2026-04-07', cadence: 608 },      // bogus avg
      { date: '2026-04-08', cadence: 3117 },     // HealthKit runaway
    ];
    const series = cadenceSeries(rows);
    expect(series.map((p) => p.value)).toEqual([100, 170, 240]);
  });
});

describe('currentCadence', () => {
  it('returns null on empty series', () => {
    expect(currentCadence([])).toBeNull();
  });
  it('returns the most recent value', () => {
    const s = [
      { date: '2026-01-01', value: 170 },
      { date: '2026-05-01', value: 182 },
    ];
    expect(currentCadence(s)).toBe(182);
  });
});

describe('deltaCadence', () => {
  it('returns null when there is not enough data on either side', () => {
    const ref = new Date(2026, 4, 16);
    expect(deltaCadence([], ref)).toBeNull();
    expect(deltaCadence([{ date: '2026-05-10', value: 175 }], ref)).toBeNull();
  });
  it('compares recent 28 days vs prior 28-60 day window', () => {
    const ref = new Date(2026, 4, 16);
    const series = [
      { date: '2026-03-20', value: 170 },
      { date: '2026-04-01', value: 172 },
      { date: '2026-05-01', value: 178 },
      { date: '2026-05-14', value: 180 },
    ];
    const d = deltaCadence(series, ref);
    // recent avg = 179, baseline avg = 171 → delta 8.0
    expect(d).toBe(8.0);
  });
});
