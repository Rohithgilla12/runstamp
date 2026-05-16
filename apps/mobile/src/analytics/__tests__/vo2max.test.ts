import { describe, expect, it } from 'vitest';
import { currentVo2, deltaVo2, vo2Series } from '../vo2max';

describe('vo2Series', () => {
  it('returns only rows with positive vo2max, sorted by date', () => {
    const rows = [
      { date: '2026-05-15', vo2max: 52.1 },
      { date: '2026-05-01', vo2max: 50.5 },
      { date: '2026-05-10' },             // missing
      { date: '2026-05-12', vo2max: 0 },  // zero — treated as missing
      { date: '2026-05-20', vo2max: 53.0 },
    ];
    const series = vo2Series(rows);
    expect(series.map((p) => p.date)).toEqual(['2026-05-01', '2026-05-15', '2026-05-20']);
    expect(series.map((p) => p.value)).toEqual([50.5, 52.1, 53.0]);
  });
});

describe('currentVo2', () => {
  it('returns null on empty series', () => {
    expect(currentVo2([])).toBeNull();
  });
  it('returns the most recent value', () => {
    const s = [
      { date: '2026-01-01', value: 48 },
      { date: '2026-05-01', value: 53 },
    ];
    expect(currentVo2(s)).toBe(53);
  });
});

describe('deltaVo2', () => {
  it('returns null when there is not enough data on either side', () => {
    const ref = new Date(2026, 4, 16);
    expect(deltaVo2([], ref)).toBeNull();
    expect(deltaVo2([{ date: '2026-05-10', value: 50 }], ref)).toBeNull();
  });
  it('compares recent 28 days vs prior 28-60 day window', () => {
    const ref = new Date(2026, 4, 16);
    const series = [
      // baseline window (28-60 days ago)
      { date: '2026-03-20', value: 50 },   // ~57 days
      { date: '2026-04-01', value: 51 },   // ~45 days
      // recent window (0-28 days ago)
      { date: '2026-05-01', value: 53 },   // ~15 days
      { date: '2026-05-14', value: 54 },   // ~2 days
    ];
    const d = deltaVo2(series, ref);
    // recent avg = 53.5, baseline avg = 50.5 → delta 3.0
    expect(d).toBe(3.0);
  });
});
