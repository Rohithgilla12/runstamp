import { describe, expect, it } from 'vitest';
import {
  projectRoute,
  cumulativeLengths,
  pointAtFrac,
  bboxOf,
  fitTransform,
  choreograph,
  type Pt,
  type Transform,
} from '../routeFilmCamera';

// A simple right-angle path in tile-pixel space for geometry tests.
const square: Pt[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
];

describe('cumulativeLengths', () => {
  it('accumulates segment distances from zero', () => {
    expect(cumulativeLengths(square)).toEqual([0, 10, 20]);
  });
});

describe('pointAtFrac', () => {
  it('returns the start at f=0 and the end at f=1', () => {
    expect(pointAtFrac(square, cumulativeLengths(square), 0)).toEqual({ x: 0, y: 0 });
    expect(pointAtFrac(square, cumulativeLengths(square), 1)).toEqual({ x: 10, y: 10 });
  });

  it('interpolates to the midpoint at f=0.5', () => {
    expect(pointAtFrac(square, cumulativeLengths(square), 0.5)).toEqual({ x: 10, y: 0 });
  });

  it('clamps out-of-range fractions', () => {
    const cum = cumulativeLengths(square);
    expect(pointAtFrac(square, cum, -1)).toEqual({ x: 0, y: 0 });
    expect(pointAtFrac(square, cum, 2)).toEqual({ x: 10, y: 10 });
  });

  it('returns origin for an empty route', () => {
    expect(pointAtFrac([], [], 0.5)).toEqual({ x: 0, y: 0 });
  });

  it('returns the only point for a single-point route', () => {
    expect(pointAtFrac([{ x: 3, y: 7 }], [0], 0.5)).toEqual({ x: 3, y: 7 });
  });
});

describe('bboxOf', () => {
  it('returns min/max extents', () => {
    expect(bboxOf(square)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
  });
});

describe('fitTransform', () => {
  it('centers on the bbox and zooms to fit within padding', () => {
    const t = fitTransform({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, 100, 100, 1.0);
    expect(t.center).toEqual({ x: 5, y: 5 });
    expect(t.zoom).toBeCloseTo(10);
  });
});

describe('projectRoute', () => {
  it('projects lat/lng to tile-pixel space and keeps endpoints', () => {
    const pts = projectRoute([[19.0, 72.8], [19.0, 72.81], [19.01, 72.81]]);
    expect(pts.length).toBeGreaterThanOrEqual(2);
    // ~85 tile-px deviation keeps the midpoint through RDP simplification.
    expect(pts[1].x).toBeGreaterThan(pts[0].x);
  });

  it('returns an empty array for empty input', () => {
    expect(projectRoute([])).toEqual([]);
  });

  it('keeps a single coordinate as a one-element array', () => {
    expect(projectRoute([[19.0, 72.8]]).length).toBe(1);
  });
});

describe('choreograph', () => {
  const points: Pt[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];
  const cum = cumulativeLengths(points);
  const fit: Transform = fitTransform(bboxOf(points), 1080, 1920);

  it('establishes wide with no trail at progress 0', () => {
    const s = choreograph(0, fit, points, cum);
    expect(s.phase).toBe('establish');
    expect(s.zoom).toBeCloseTo(fit.zoom);
    expect(s.center).toEqual(fit.center);
    expect(s.trailFrac).toBe(0);
    expect(s.playheadVisible).toBe(false);
  });

  it('reveals the full route fit at progress 1', () => {
    const s = choreograph(1, fit, points, cum);
    expect(s.phase).toBe('reveal');
    expect(s.zoom).toBeCloseTo(fit.zoom);
    expect(s.trailFrac).toBe(1);
  });

  it('follows zoomed-in mid-run', () => {
    const s = choreograph(0.5, fit, points, cum);
    expect(s.phase).toBe('follow');
    expect(s.zoom).toBeGreaterThan(fit.zoom);
    expect(s.playheadVisible).toBe(true);
  });

  it('keeps trailFrac monotonically non-decreasing across the timeline', () => {
    let prev = -1;
    for (let p = 0; p <= 1.0001; p += 0.02) {
      const s = choreograph(p, fit, points, cum);
      expect(s.trailFrac).toBeGreaterThanOrEqual(prev);
      prev = s.trailFrac;
    }
  });

  it('has no zoom discontinuity at phase boundaries', () => {
    const eps = 1e-4;
    for (const b of [0.12, 0.22, 0.82]) {
      const before = choreograph(b - eps, fit, points, cum).zoom;
      const after = choreograph(b + eps, fit, points, cum).zoom;
      expect(Math.abs(after - before)).toBeLessThan(fit.zoom * 0.05);
    }
  });
});
