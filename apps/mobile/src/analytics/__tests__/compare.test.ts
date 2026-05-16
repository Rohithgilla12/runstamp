import { describe, expect, it } from 'vitest';
import { filterByPeriod, delta, type Period } from '../compare';

const rows = [
  { date: '2025-05-10', distance: 5 },
  { date: '2026-01-15', distance: 10 },
  { date: '2026-05-10', distance: 20 },
  { date: '2026-05-20', distance: 7 },
];

describe('filterByPeriod', () => {
  it('returns runs in the year', () => {
    const p: Period = { kind: 'year', year: 2026 };
    expect(filterByPeriod(rows, p).length).toBe(3);
  });

  it('returns runs in the month', () => {
    const p: Period = { kind: 'month', year: 2026, month: 5 };
    expect(filterByPeriod(rows, p).length).toBe(2);
  });

  it('empty array for empty period', () => {
    const p: Period = { kind: 'year', year: 2023 };
    expect(filterByPeriod(rows, p)).toEqual([]);
  });
});

describe('delta', () => {
  it('signed pct + abs', () => {
    expect(delta(120, 100)).toEqual({ abs: 20, pct: 20 });
    expect(delta(80, 100)).toEqual({ abs: -20, pct: -20 });
  });

  it('handles zero baseline by returning null pct', () => {
    expect(delta(5, 0)).toEqual({ abs: 5, pct: null });
  });

  it('zero / zero', () => {
    expect(delta(0, 0)).toEqual({ abs: 0, pct: null });
  });
});
