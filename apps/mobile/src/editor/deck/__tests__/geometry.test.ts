import { describe, expect, it } from 'vitest';
import { deckGeometry, snapIndexFor, surfaceRatio } from '../geometry';

describe('surfaceRatio', () => {
  it('maps each surface to its aspect ratio', () => {
    expect(surfaceRatio('9:16')).toBeCloseTo(16 / 9);
    expect(surfaceRatio('1:1')).toBe(1);
    expect(surfaceRatio('4:5')).toBe(5 / 4);
  });
});

describe('deckGeometry', () => {
  it('caps card width and overlaps slots (itemWidth < cardW)', () => {
    const g = deckGeometry(390, '9:16');
    expect(g.cardW).toBe(257); // round(390 * 0.66)
    expect(g.itemWidth).toBeLessThan(g.cardW);
    expect(g.cardH).toBe(Math.round(g.cardW * (16 / 9)));
  });

  it('centres the resting card: sidePad = (screenW - itemWidth) / 2', () => {
    const g = deckGeometry(390, '1:1');
    expect(g.sidePad).toBeCloseTo((390 - g.itemWidth) / 2);
  });

  it('clamps card width on very wide screens', () => {
    expect(deckGeometry(1200, '9:16').cardW).toBe(268);
  });
});

describe('snapIndexFor', () => {
  const W = 200;
  it('maps offset 0 to the first card', () => {
    expect(snapIndexFor(0, W, 12)).toBe(0);
  });
  it('clamps negative overscroll to 0', () => {
    expect(snapIndexFor(-80, W, 12)).toBe(0);
  });
  it('clamps past-the-end overscroll to the last index', () => {
    expect(snapIndexFor(W * 50, W, 12)).toBe(11);
  });
  it('rounds at the half-boundary (lands on the nearer card)', () => {
    expect(snapIndexFor(W * 0.5, W, 12)).toBe(1);
    expect(snapIndexFor(W * 0.49, W, 12)).toBe(0);
  });
  it('is safe for degenerate inputs', () => {
    expect(snapIndexFor(100, 0, 12)).toBe(0);
    expect(snapIndexFor(100, W, 0)).toBe(0);
  });
});
