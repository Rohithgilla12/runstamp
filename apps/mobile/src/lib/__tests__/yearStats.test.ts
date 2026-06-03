import { describe, expect, it } from 'vitest';
import { computeYearStats, filterEarnedInYear, fmtRecapDist } from '../yearStats';
import type { Activity } from '../../data/models';
import type { CatalogStamp } from '../../state/useStamps';

function run(date: string, distance: number, opts: Partial<Activity> = {}): Activity {
  return {
    id: date + distance, date, day: 'Mon', time: '06:00', title: 't',
    place: '', city: opts.city ?? '', country: opts.country ?? '',
    distance, seconds: opts.seconds ?? distance * 300, elev: 0,
    pace: 300, avgHr: 0, maxHr: 0, cal: 0, weather: { t: 0, w: '', icon: 'clear' },
    kind: 'easy', ...opts,
  } as Activity;
}

const stamp = (earnedAt?: string): CatalogStamp => ({
  id: 'x' + (earnedAt ?? 'none'), name: 'n', description: 'd', tier: 'common', category: 'distance', earnedAt,
});

describe('computeYearStats', () => {
  it('sums only the target year and never returns NaN/Infinity', () => {
    const acts = [run('2026-01-10', 10, { city: 'A', country: 'X' }), run('2026-02-10', 21.1, { city: 'B', country: 'X' }), run('2025-12-31', 99)];
    const s = computeYearStats(acts, [], 2026);
    expect(s.totalRuns).toBe(2);
    expect(s.totalKm).toBeCloseTo(31.1, 3);
    expect(s.newCities).toBe(2);
    expect(s.countries).toBe(1);
    expect(s.longestRunKm).toBe(21.1);
    expect(s.longestRunDate).toBe('2026-02-10');
    expect(Number.isFinite(s.totalKm)).toBe(true);
  });

  it('handles an empty / zero-run year without NaN', () => {
    const s = computeYearStats([], [], 2026);
    expect(s).toMatchObject({ totalKm: 0, totalRuns: 0, totalSec: 0, newCities: 0, countries: 0, longestRunKm: 0, longestRunDate: null });
  });

  it('handles a partial (mid) year — only counts runs that exist', () => {
    const s = computeYearStats([run('2026-05-30', 12)], [], 2026);
    expect(s.totalRuns).toBe(1);
    expect(s.longestRunDate).toBe('2026-05-30');
  });
});

describe('fmtRecapDist', () => {
  it('uses hero style: 1 decimal under 100, integer at/above', () => {
    expect(fmtRecapDist(47.89, 'km')).toBe('47.9');
    expect(fmtRecapDist(8, 'km')).toBe('8');
    expect(fmtRecapDist(100, 'km')).toBe('100');
    expect(fmtRecapDist(312.4, 'km')).toBe('312');
    expect(fmtRecapDist(1234.5, 'km')).toBe('1235');
  });
  it('converts to miles', () => {
    expect(fmtRecapDist(16.09, 'mi')).toBe('10');
  });
});

describe('filterEarnedInYear', () => {
  it('keeps only stamps earned in the year', () => {
    const earned = [stamp('2026-03-01T00:00:00Z'), stamp('2025-03-01T00:00:00Z'), stamp(undefined)];
    expect(filterEarnedInYear(earned, 2026)).toHaveLength(1);
  });
});
