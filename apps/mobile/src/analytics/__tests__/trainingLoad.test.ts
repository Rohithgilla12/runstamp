import { describe, expect, it } from 'vitest';
import { computeTRIMP, buildLoadSeries, hasAnyHr } from '../trainingLoad';

const ref = new Date('2026-05-16T12:00:00Z');

describe('computeTRIMP', () => {
  it('returns distance fallback when avg_hr is missing', () => {
    const t = computeTRIMP({ date: '2026-05-15', distance: 10, seconds: 3600, avgHr: 0 }, 190, 60);
    expect(t).toBeCloseTo(60, 1);
  });

  it('returns Banister TRIMP when avg_hr is present', () => {
    const t = computeTRIMP({ date: '2026-05-15', distance: 10, seconds: 3600, avgHr: 150 }, 190, 60);
    expect(t).toBeGreaterThan(95);
    expect(t).toBeLessThan(110);
  });

  it('clamps HRr to [0, 1]', () => {
    const low = computeTRIMP({ date: 'x', distance: 5, seconds: 1800, avgHr: 50 }, 190, 60);
    expect(low).toBe(0);
    const high = computeTRIMP({ date: 'x', distance: 5, seconds: 1800, avgHr: 220 }, 190, 60);
    const cap = computeTRIMP({ date: 'x', distance: 5, seconds: 1800, avgHr: 190 }, 190, 60);
    expect(high).toBeCloseTo(cap, 5);
  });
});

describe('buildLoadSeries', () => {
  it('returns a series ending on the ref day', () => {
    const out = buildLoadSeries([], ref);
    expect(out[out.length - 1].date).toBe('2026-05-16');
  });

  it('converges to load on steady-state input', () => {
    const rows = [];
    for (let i = 0; i < 180; i++) {
      const d = new Date(ref.getTime() - (180 - i) * 86_400_000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      rows.push({ date: iso, distance: 10, seconds: 3600, avgHr: 0 });
    }
    const out = buildLoadSeries(rows, ref);
    const last = out[out.length - 1];
    expect(last.atl).toBeGreaterThan(55);
    expect(last.atl).toBeLessThan(65);
    expect(last.ctl).toBeGreaterThan(55);
    expect(last.ctl).toBeLessThan(65);
    expect(Math.abs(last.tsb)).toBeLessThan(2);
  });

  it('produces ATL > CTL after a hard week from rest', () => {
    const rows = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ref.getTime() - i * 86_400_000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      rows.push({ date: iso, distance: 15, seconds: 5400, avgHr: 0 });
    }
    const out = buildLoadSeries(rows, ref);
    const last = out[out.length - 1];
    expect(last.atl).toBeGreaterThan(last.ctl);
    expect(last.tsb).toBeLessThan(0);
  });
});

describe('hasAnyHr', () => {
  it('false for empty', () => {
    expect(hasAnyHr([])).toBe(false);
  });
  it('false when all avgHr missing or 0', () => {
    expect(hasAnyHr([{ avgHr: 0 }, { avgHr: undefined }])).toBe(false);
  });
  it('true when any avgHr > 0', () => {
    expect(hasAnyHr([{ avgHr: 0 }, { avgHr: 145 }])).toBe(true);
  });
});
