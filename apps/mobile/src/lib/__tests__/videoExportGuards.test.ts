import { describe, expect, it } from 'vitest';
import { normalizeEvenDims, clampTotalFrames } from '../encodeGuards';

describe('normalizeEvenDims', () => {
  it('floors odd dimensions to even (H.264/YUV420 needs even)', () => {
    expect(normalizeEvenDims(1081, 1921)).toEqual({ width: 1080, height: 1920 });
    expect(normalizeEvenDims(1080, 1920)).toEqual({ width: 1080, height: 1920 });
  });
  it('never floors below 2', () => {
    expect(normalizeEvenDims(1, 1)).toEqual({ width: 2, height: 2 });
  });
});

describe('clampTotalFrames', () => {
  it('guarantees at least 2 frames (avoids the degenerate single-frame encode)', () => {
    expect(clampTotalFrames(1)).toBe(2);
    expect(clampTotalFrames(0)).toBe(2);
    expect(clampTotalFrames(105)).toBe(105);
  });
});
