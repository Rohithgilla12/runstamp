import { describe, expect, it } from 'vitest';
import { cellIndex, cellKey, cellBounds, coverCells, coverageStats, type GridSpec } from '../gridCoverage';

const spec: GridSpec = { cellMeters: 100, refLat: 19.0 };

describe('cellIndex', () => {
  it('buckets nearby points into the same cell and far points into different cells', () => {
    const a = cellIndex(19.0000, 72.8000, spec);
    const b = cellIndex(19.00005, 72.80005, spec); // ~7m away
    expect(cellKey(a.ix, a.iy)).toBe(cellKey(b.ix, b.iy));
    const c = cellIndex(19.0100, 72.8100, spec);   // ~1.1km away
    expect(cellKey(c.ix, c.iy)).not.toBe(cellKey(a.ix, a.iy));
  });
});

describe('cellBounds', () => {
  it('contains the point that produced the cell', () => {
    const { ix, iy } = cellIndex(19.0, 72.8, spec);
    const b = cellBounds(ix, iy, spec);
    expect(19.0).toBeGreaterThanOrEqual(b.minLat);
    expect(19.0).toBeLessThanOrEqual(b.maxLat);
    expect(72.8).toBeGreaterThanOrEqual(b.minLng);
    expect(72.8).toBeLessThanOrEqual(b.maxLng);
  });
});

describe('coverCells', () => {
  it('returns an empty set for no routes', () => {
    expect(coverCells([], spec).size).toBe(0);
  });
  it('densifies a sparse segment so coverage is contiguous (no skipped cells)', () => {
    const route: Array<[number, number]> = [
      [19.0000, 72.8],
      [19.0027, 72.8], // ~300m north
    ];
    const cells = coverCells([route], spec);
    expect(cells.size).toBeGreaterThanOrEqual(3);
  });
  it('densifies a purely E-W segment (lng-dominant)', () => {
    const route: Array<[number, number]> = [
      [19.0, 72.8000],
      [19.0, 72.8032], // ~300m east (lng only, no lat change)
    ];
    const cells = coverCells([route], spec);
    expect(cells.size).toBeGreaterThanOrEqual(3);
  });
  it('dedupes overlapping routes into the same cells', () => {
    const r: Array<[number, number]> = [[19.0, 72.8], [19.00005, 72.8]];
    const one = coverCells([r], spec);
    const two = coverCells([r, r], spec);
    expect(two.size).toBe(one.size);
  });
});

describe('coverageStats', () => {
  it('computes area from cell count and cell size', () => {
    const cells = new Set(['0:0', '1:0', '0:1']);
    expect(coverageStats(cells, spec)).toEqual({ cellCount: 3, areaKm2: 0.03 });
  });
});
