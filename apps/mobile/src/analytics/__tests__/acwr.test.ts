import { describe, expect, it } from 'vitest';
import { computeACWR, acwrSeries, currentACWR, acwrRisk } from '../acwr';

function day(i: number, load: number, atl: number) {
  const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
  return { date: d, load, atl, ctl: 0, tsb: 0 };
}

describe('computeACWR', () => {
  it('divides acute by chronic', () => {
    expect(computeACWR(120, 100)).toBeCloseTo(1.2);
  });
  it('returns null when chronic is below the noise floor', () => {
    expect(computeACWR(5, 0.5)).toBeNull();
    expect(computeACWR(5, 0)).toBeNull();
  });
});

describe('acwrRisk', () => {
  it('classifies each zone at its boundaries', () => {
    expect(acwrRisk(0.79)).toBe('rampdown');
    expect(acwrRisk(0.8)).toBe('optimal');
    expect(acwrRisk(1.3)).toBe('optimal');
    expect(acwrRisk(1.31)).toBe('caution');
    expect(acwrRisk(1.5)).toBe('caution');
    expect(acwrRisk(1.51)).toBe('high');
  });
  it('returns null for null input', () => {
    expect(acwrRisk(null)).toBeNull();
  });
});

describe('acwrSeries', () => {
  it('emits nothing before the 28-day warm-up', () => {
    const load = Array.from({ length: 20 }, (_, i) => day(i, 50, 50));
    expect(acwrSeries(load)).toEqual([]);
  });
  it('converges to ~1.0 for a constant load after warm-up', () => {
    const load = Array.from({ length: 60 }, (_, i) => day(i, 50, 50));
    const s = acwrSeries(load);
    expect(s.length).toBeGreaterThan(0);
    expect(s[s.length - 1].acwr).toBeCloseTo(1.0, 1);
    for (let i = 1; i < s.length; i++) expect(s[i].date > s[i - 1].date).toBe(true);
  });
  it('returns [] for empty input', () => {
    expect(acwrSeries([])).toEqual([]);
  });

  it('emits nothing at exactly the warm-up boundary (28 days)', () => {
    const load = Array.from({ length: 28 }, (_, i) => day(i, 50, 50));
    expect(acwrSeries(load)).toEqual([]);
  });

  it('emits nothing when chronic load never clears the noise floor', () => {
    const load = Array.from({ length: 60 }, (_, i) => day(i, 0, 0));
    expect(acwrSeries(load)).toEqual([]);
  });
});

describe('currentACWR', () => {
  it('returns the last point value or null', () => {
    const load = Array.from({ length: 60 }, (_, i) => day(i, 50, 50));
    expect(currentACWR(acwrSeries(load))).toBeCloseTo(1.0, 1);
    expect(currentACWR([])).toBeNull();
  });
});
