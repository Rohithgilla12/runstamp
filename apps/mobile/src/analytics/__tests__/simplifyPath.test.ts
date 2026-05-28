import { describe, expect, it } from 'vitest';
import { simplifyPath, type XY } from '../simplifyPath';

const len = (pts: XY[]) => pts.length;

describe('simplifyPath', () => {
  it('returns input untouched for <= 2 points', () => {
    expect(simplifyPath([], 1)).toEqual([]);
    const one = [{ x: 0, y: 0 }];
    expect(simplifyPath(one, 1)).toEqual(one);
    const two = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(simplifyPath(two, 1)).toEqual(two);
  });

  it('collapses near-collinear points to the endpoints', () => {
    const line: XY[] = Array.from({ length: 100 }, (_, i) => ({ x: i, y: 0 }));
    const out = simplifyPath(line, 0.5);
    expect(out).toEqual([{ x: 0, y: 0 }, { x: 99, y: 0 }]);
  });

  it('keeps a corner that deviates beyond epsilon', () => {
    const pts: XY[] = [
      { x: 0, y: 0 },
      { x: 5, y: 5 }, // sharp corner
      { x: 10, y: 0 },
    ];
    expect(simplifyPath(pts, 0.5)).toEqual(pts);
  });

  it('drops a corner that stays within epsilon', () => {
    const pts: XY[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 }, // barely off the line
      { x: 10, y: 0 },
    ];
    expect(simplifyPath(pts, 0.5)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  it('always preserves first and last point', () => {
    const noisy: XY[] = Array.from({ length: 500 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 5) * 0.2,
    }));
    const out = simplifyPath(noisy, 1);
    expect(out[0]).toEqual(noisy[0]);
    expect(out[out.length - 1]).toEqual(noisy[noisy.length - 1]);
  });

  it('massively reduces a dense GPS-like track while keeping shape vertices', () => {
    // A square loop densely sampled along each edge.
    const dense: XY[] = [];
    const push = (x: number, y: number) => dense.push({ x, y });
    for (let i = 0; i <= 250; i++) push(i / 250 * 100, 0);
    for (let i = 0; i <= 250; i++) push(100, i / 250 * 100);
    for (let i = 0; i <= 250; i++) push(100 - i / 250 * 100, 100);
    for (let i = 0; i <= 250; i++) push(0, 100 - i / 250 * 100);
    const out = simplifyPath(dense, 0.75);
    // Four corners + start/end ≈ a handful of points, down from ~1000.
    expect(len(out)).toBeLessThan(10);
    expect(len(out)).toBeGreaterThanOrEqual(4);
  });

  it('handles pathological sizes via the pre-stride ceiling', () => {
    const huge: XY[] = Array.from({ length: 20000 }, (_, i) => ({
      x: i,
      y: i % 2, // zig-zag so RDP can't trivially collapse it
    }));
    const out = simplifyPath(huge, 0.1);
    expect(out[0]).toEqual(huge[0]);
    expect(out[out.length - 1]).toEqual(huge[huge.length - 1]);
    expect(len(out)).toBeLessThanOrEqual(20000);
  });
});
