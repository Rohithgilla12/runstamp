import { describe, expect, it } from 'vitest';
import { LAYOUT_META } from '../registry.data';

describe('LAYOUT_META', () => {
  it('contains 13 layouts', () => {
    expect(LAYOUT_META).toHaveLength(13);
  });

  it('has unique ids', () => {
    const ids = LAYOUT_META.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every layout has a non-empty name', () => {
    for (const l of LAYOUT_META) expect(l.name.length).toBeGreaterThan(0);
  });

  it('every seeded sticker has x and y in 0..1', () => {
    for (const l of LAYOUT_META) {
      for (const s of l.seed ?? []) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(1);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(1);
      }
    }
  });
});
