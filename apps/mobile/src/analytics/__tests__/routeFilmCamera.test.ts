import { describe, expect, it } from 'vitest';
import {
  projectRoute,
  cumulativeLengths,
  pointAtFrac,
  bboxOf,
  fitTransform,
  type Pt,
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
    expect(pts[1].x).toBeGreaterThan(pts[0].x);
  });

  it('returns an empty array for empty input', () => {
    expect(projectRoute([])).toEqual([]);
  });
});
