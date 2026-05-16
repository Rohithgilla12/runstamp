import { describe, expect, it } from 'vitest';
import { buildHeatmap, kmBucket, type HeatmapDay } from '../heatmap';

const today = new Date(2026, 4, 16, 12, 0, 0);

describe('buildHeatmap', () => {
  it('covers the requested calendar year Sun-to-Sat', () => {
    const grid = buildHeatmap([], 2026, today);
    expect(grid.weeks.length).toBe(53);
    for (const w of grid.weeks) expect(w.length).toBe(7);
    // Jan 1 2026 is a Thursday; the grid starts on the prior Sunday, Dec 28 2025.
    expect(grid.start).toBe('2025-12-28');
    // Dec 31 2026 is a Thursday; the grid ends on the following Saturday, Jan 2 2027.
    expect(grid.end).toBe('2027-01-02');
  });

  it('grows to 54 weeks when the year forces a longer Sun→Sat span', () => {
    // 2000: leap year, Jan 1 is Sat → grid starts Dec 26 1999 and ends Jan 6 2001.
    const grid = buildHeatmap([], 2000, new Date(2026, 4, 16));
    expect(grid.weeks.length).toBe(54);
    expect(grid.start).toBe('1999-12-26');
    expect(grid.end).toBe('2001-01-06');
  });

  it('sums multiple runs on the same day', () => {
    const grid = buildHeatmap(
      [
        { id: '1', date: '2026-05-15', distance: 5 },
        { id: '2', date: '2026-05-15', distance: 3.5 },
      ],
      2026,
      today,
    );
    expect(findDay(grid.weeks, '2026-05-15')?.km).toBeCloseTo(8.5, 5);
  });

  it('ignores runs outside the selected year', () => {
    const grid = buildHeatmap(
      [
        { id: '1', date: '2025-06-01', distance: 10 },
        { id: '2', date: '2027-02-01', distance: 8 },
      ],
      2026,
      today,
    );
    // Cells before Jan 1 2026 (in the leading Sun-padding) and after Dec 31 2026
    // exist in the grid but should be empty since the rows fall outside.
    expect(findDay(grid.weeks, '2025-06-01')).toBeUndefined();
    expect(findDay(grid.weeks, '2027-02-01')).toBeUndefined();
    const totalKm = grid.weeks.flat().reduce((a, d) => a + d.km, 0);
    expect(totalKm).toBe(0);
  });

  it('marks days after today as inFuture; past days are not', () => {
    const grid = buildHeatmap([], 2026, today);
    expect(findDay(grid.weeks, '2026-05-15')?.inFuture).toBe(false);
    expect(findDay(grid.weeks, '2026-05-16')?.inFuture).toBe(false);
    expect(findDay(grid.weeks, '2026-05-17')?.inFuture).toBe(true);
    expect(findDay(grid.weeks, '2026-12-31')?.inFuture).toBe(true);
  });

  it('treats every day of a past year as not-in-future', () => {
    const grid = buildHeatmap([], 2025, today);
    expect(findDay(grid.weeks, '2025-01-01')?.inFuture).toBe(false);
    expect(findDay(grid.weeks, '2025-12-31')?.inFuture).toBe(false);
  });

  it('handles leap day Feb 29', () => {
    const grid = buildHeatmap(
      [{ id: '1', date: '2024-02-29', distance: 5 }],
      2024,
      new Date(2024, 2, 15),
    );
    expect(findDay(grid.weeks, '2024-02-29')?.km).toBe(5);
  });
});

describe('kmBucket', () => {
  it('buckets by the documented thresholds', () => {
    expect(kmBucket(0)).toBe(0);
    expect(kmBucket(2.9)).toBe(1);
    expect(kmBucket(5)).toBe(2);
    expect(kmBucket(7.5)).toBe(2);
    expect(kmBucket(10)).toBe(3);
    expect(kmBucket(19.9)).toBe(3);
    expect(kmBucket(20)).toBe(4);
    expect(kmBucket(42.2)).toBe(4);
  });
});

function findDay(weeks: HeatmapDay[][], date: string): HeatmapDay | undefined {
  for (const w of weeks) for (const d of w) if (d.date === date) return d;
  return undefined;
}
