import { describe, expect, it } from 'vitest';
import { scaleFromCornerDrag } from '../resizeMath';

describe('scaleFromCornerDrag', () => {
  it('grows when dragging SE outward', () => {
    expect(scaleFromCornerDrag(1, 40, 40, 'se', 100)).toBeCloseTo(1.4);
  });

  it('shrinks when dragging SE inward', () => {
    expect(scaleFromCornerDrag(1, -30, -30, 'se', 100)).toBeCloseTo(0.7);
  });

  it('grows when dragging NW outward (negative axes)', () => {
    expect(scaleFromCornerDrag(1, -40, -40, 'nw', 100)).toBeCloseTo(1.4);
  });

  it('grows when dragging NE with +x −y', () => {
    expect(scaleFromCornerDrag(1, 40, -40, 'ne', 100)).toBeCloseTo(1.4);
  });

  it('grows when dragging SW with −x +y', () => {
    expect(scaleFromCornerDrag(1, -40, 40, 'sw', 100)).toBeCloseTo(1.4);
  });

  it('clamps to min and max', () => {
    expect(scaleFromCornerDrag(1, -500, -500, 'se', 100)).toBe(0.5);
    expect(scaleFromCornerDrag(1, 500, 500, 'se', 100)).toBe(2.2);
  });

  it('ignores opposite-axis noise on a single corner axis average', () => {
    // SE: only +x contributes if y is 0 → half of x/base
    expect(scaleFromCornerDrag(1, 40, 0, 'se', 100)).toBeCloseTo(1.2);
  });
});
