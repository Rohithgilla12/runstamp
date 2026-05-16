import { describe, expect, it } from 'vitest';
import { distanceHistogram, HISTOGRAM_BINS } from '../histogram';

describe('distanceHistogram', () => {
  it('exposes the documented 6 bins', () => {
    expect(HISTOGRAM_BINS.length).toBe(6);
    expect(HISTOGRAM_BINS[0]).toEqual({ label: '0–3', min: 0, max: 3 });
    expect(HISTOGRAM_BINS[5]).toEqual({ label: '30+', min: 30, max: Infinity });
  });

  it('returns zero counts for empty input', () => {
    const out = distanceHistogram([]);
    expect(out.map((b) => b.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('places runs into the correct bin (lower-inclusive, upper-exclusive)', () => {
    const out = distanceHistogram([
      { distance: 2.9 },
      { distance: 3 },
      { distance: 5 },
      { distance: 7 },
      { distance: 12 },
      { distance: 18 },
      { distance: 30 },
      { distance: 50 },
    ]);
    expect(out.map((b) => b.count)).toEqual([1, 2, 1, 1, 1, 2]);
  });

  it('ignores zero / negative distances', () => {
    const out = distanceHistogram([{ distance: 0 }, { distance: -5 }]);
    expect(out.map((b) => b.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
