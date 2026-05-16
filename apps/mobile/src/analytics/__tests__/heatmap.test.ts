import { describe, expect, it } from 'vitest';
import { buildHeatmap, kmBucket, type HeatmapDay } from '../heatmap';

const ref = new Date('2026-05-16T12:00:00Z');

describe('buildHeatmap', () => {
  it('produces 53 weeks × 7 days = 371 cells', () => {
    const grid = buildHeatmap([], ref);
    expect(grid.weeks.length).toBe(53);
    for (const w of grid.weeks) expect(w.length).toBe(7);
  });

  it('sums multiple runs on the same day', () => {
    const grid = buildHeatmap(
      [
        { id: '1', date: '2026-05-15', distance: 5 },
        { id: '2', date: '2026-05-15', distance: 3.5 },
      ],
      ref,
    );
    const day = findDay(grid.weeks, '2026-05-15');
    expect(day?.km).toBeCloseTo(8.5, 5);
  });

  it('ignores runs before the trailing window', () => {
    const grid = buildHeatmap(
      [{ id: '1', date: '2025-01-01', distance: 10 }],
      ref,
    );
    const totalKm = grid.weeks.flat().reduce((a, d) => a + d.km, 0);
    expect(totalKm).toBe(0);
  });

  it('handles leap day Feb 29', () => {
    const leapRef = new Date('2024-03-15T12:00:00Z');
    const grid = buildHeatmap(
      [{ id: '1', date: '2024-02-29', distance: 5 }],
      leapRef,
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
