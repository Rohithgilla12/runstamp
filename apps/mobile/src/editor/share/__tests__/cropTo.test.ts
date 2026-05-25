import { describe, expect, it } from 'vitest';
import { centerCrop } from '../cropTo';

describe('centerCrop', () => {
  it('for 9:16 -> 1:1, crops to a square with the shorter dimension', () => {
    const out = centerCrop({ width: 720, height: 1280 }, 1);
    expect(out).toEqual({ originX: 0, originY: 280, width: 720, height: 720 });
  });

  it('for 16:9 -> 1:1, crops the central square', () => {
    const out = centerCrop({ width: 1920, height: 1080 }, 1);
    expect(out).toEqual({ originX: 420, originY: 0, width: 1080, height: 1080 });
  });

  it('for 1:1 -> 1:1, identity', () => {
    const out = centerCrop({ width: 500, height: 500 }, 1);
    expect(out).toEqual({ originX: 0, originY: 0, width: 500, height: 500 });
  });

  it('for 9:16 -> 4:5, crops to taller portrait centered', () => {
    const out = centerCrop({ width: 900, height: 1600 }, 4 / 5);
    expect(out.width).toBe(900);
    expect(out.height).toBe(Math.round(900 * 5 / 4));
    expect(out.originX).toBe(0);
    expect(out.originY).toBe(Math.round((1600 - out.height) / 2));
  });
});
