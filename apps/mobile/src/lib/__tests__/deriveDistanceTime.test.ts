import { describe, expect, it } from 'vitest';
import { deriveDistanceTime } from '../deriveDistanceTime';

const pt = (lat: number, lng: number, sec: number) => ({
  latitude: lat,
  longitude: lng,
  date: new Date(sec * 1000),
});

describe('deriveDistanceTime', () => {
  it('returns null for fewer than 2 points', () => {
    expect(deriveDistanceTime([])).toBeNull();
    expect(deriveDistanceTime([pt(0, 0, 0)])).toBeNull();
  });

  it('returns null when all points are identical (zero distance)', () => {
    expect(deriveDistanceTime([pt(12.97, 77.59, 0), pt(12.97, 77.59, 10)])).toBeNull();
  });

  it('builds aligned, monotonic distance + elapsed-time arrays', () => {
    // ~1 minute apart, moving east along the equator.
    const r = deriveDistanceTime([pt(0, 0, 0), pt(0, 0.001, 60), pt(0, 0.002, 120)]);
    expect(r).not.toBeNull();
    expect(r!.distanceM.length).toBe(3);
    expect(r!.timeSec).toEqual([0, 60, 120]);
    // 0.001 deg lng at the equator ≈ 111.32 m; cumulative ≈ 222.6 m.
    expect(r!.distanceM[0]).toBe(0);
    expect(r!.distanceM[1]).toBeGreaterThan(100);
    expect(r!.distanceM[1]).toBeLessThan(120);
    expect(r!.distanceM[2]).toBeGreaterThan(r!.distanceM[1]); // monotonic
  });

  it('downsamples to <= maxPoints and preserves the final point', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => pt(0, i * 0.0001, i));
    const r = deriveDistanceTime(pts, 100)!;
    expect(r.distanceM.length).toBeLessThanOrEqual(101);
    expect(r.timeSec[r.timeSec.length - 1]).toBe(999); // last sample kept
  });
});
