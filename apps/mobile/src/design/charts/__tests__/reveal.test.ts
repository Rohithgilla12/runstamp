import { describe, expect, it } from 'vitest';
import { easeInOut, pathDrawOffset, staggeredT } from '../reveal';

describe('staggeredT', () => {
  it('returns 0 at progress=0', () => {
    expect(staggeredT(0, 0, 10)).toBe(0);
    expect(staggeredT(0, 5, 10)).toBe(0);
  });

  it('first element reaches 1 partway through, last element finishes exactly at progress=1', () => {
    expect(staggeredT(0.15, 0, 10)).toBe(1);
    expect(staggeredT(1, 9, 10)).toBe(1);
  });

  it('clamps below 0 and above 1', () => {
    expect(staggeredT(-1, 5, 10)).toBe(0);
    expect(staggeredT(2, 5, 10)).toBe(1);
  });

  it('handles a single element with direct ramp', () => {
    expect(staggeredT(0, 0, 1)).toBe(0);
    expect(staggeredT(0.075, 0, 1)).toBeCloseTo(0.5, 2);
    expect(staggeredT(0.15, 0, 1)).toBe(1);
  });

  it('returns 0 for count <= 0', () => {
    expect(staggeredT(0.5, 0, 0)).toBe(0);
  });

  it('progress sweeps elements in order', () => {
    const N = 5;
    // Bar 0 is fully visible before bar 4 starts.
    expect(staggeredT(0.2, 0, N)).toBeGreaterThan(staggeredT(0.2, 4, N));
    expect(staggeredT(0.9, 4, N)).toBeGreaterThan(staggeredT(0.5, 4, N));
  });
});

describe('pathDrawOffset', () => {
  it('returns full length at progress=0 (nothing drawn)', () => {
    expect(pathDrawOffset(100, 0)).toBe(100);
  });

  it('returns 0 at progress=1 (fully drawn)', () => {
    expect(pathDrawOffset(100, 1)).toBe(0);
  });

  it('clamps progress', () => {
    expect(pathDrawOffset(100, -0.5)).toBe(100);
    expect(pathDrawOffset(100, 1.5)).toBe(0);
  });
});

describe('easeInOut', () => {
  it('passes through endpoints', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });

  it('passes through midpoint', () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5);
  });

  it('is monotone', () => {
    let prev = -1;
    for (let i = 0; i <= 10; i++) {
      const v = easeInOut(i / 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
