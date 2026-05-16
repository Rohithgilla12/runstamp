import { describe, expect, it } from 'vitest';
import { computeDecoupling, decouplingSeries, recentAvg } from '../decoupling';

describe('computeDecoupling', () => {
  it('returns null when fewer than 6 splits', () => {
    const splits = Array.from({ length: 5 }, () => ({ sec: 300, hr: 150 }));
    expect(computeDecoupling(splits)).toBeNull();
  });

  it('returns ~0 for a perfectly even run', () => {
    const splits = Array.from({ length: 10 }, () => ({ sec: 300, hr: 150 }));
    expect(computeDecoupling(splits)).toBeCloseTo(0, 5);
  });

  it('returns positive % when HR drifts up in the second half', () => {
    const splits = [
      ...Array.from({ length: 5 }, () => ({ sec: 300, hr: 145 })),
      ...Array.from({ length: 5 }, () => ({ sec: 300, hr: 160 })),
    ];
    const d = computeDecoupling(splits);
    expect(d).not.toBeNull();
    // EF1 = (5/1500)/145 ≈ 2.299e-5
    // EF2 = (5/1500)/160 ≈ 2.083e-5
    // decoupling = (1 - 145/160) × 100 = 9.375%
    expect(d!).toBeGreaterThan(9);
    expect(d!).toBeLessThan(10);
  });

  it('returns negative % when pace improves more than HR rises', () => {
    const splits = [
      ...Array.from({ length: 5 }, () => ({ sec: 320, hr: 150 })),
      ...Array.from({ length: 5 }, () => ({ sec: 290, hr: 152 })),
    ];
    expect(computeDecoupling(splits)!).toBeLessThan(0);
  });

  it('rejects interval-style runs (pace CV too high)', () => {
    const splits = [
      { sec: 240, hr: 165 },
      { sec: 400, hr: 130 },
      { sec: 240, hr: 165 },
      { sec: 400, hr: 130 },
      { sec: 240, hr: 165 },
      { sec: 400, hr: 130 },
      { sec: 240, hr: 165 },
      { sec: 400, hr: 130 },
    ];
    expect(computeDecoupling(splits)).toBeNull();
  });
});

describe('decouplingSeries', () => {
  it('drops rows without splits, sorts ascending', () => {
    const rows = [
      { date: '2026-05-15', splits: Array.from({ length: 8 }, () => ({ sec: 300, hr: 150 })) },
      { date: '2026-05-01', splits: Array.from({ length: 8 }, () => ({ sec: 300, hr: 150 })) },
      { date: '2026-05-10' }, // no splits
    ];
    const series = decouplingSeries(rows);
    expect(series.map((p) => p.date)).toEqual(['2026-05-01', '2026-05-15']);
  });
});

describe('recentAvg', () => {
  it('averages last n points', () => {
    const series = [
      { date: 'a', decouplingPct: 12, splitCount: 8 },
      { date: 'b', decouplingPct: 10, splitCount: 8 },
      { date: 'c', decouplingPct: 6, splitCount: 8 },
      { date: 'd', decouplingPct: 4, splitCount: 8 },
    ];
    expect(recentAvg(series, 2)).toBe(5);
  });
  it('returns null on empty', () => {
    expect(recentAvg([])).toBeNull();
  });
});
