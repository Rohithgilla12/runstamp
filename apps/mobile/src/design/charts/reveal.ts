// Reveal-animation math, shared across video-exportable charts.
//
// The model: a single `progress` value (0..1) drives an entire chart's
// reveal. Within that, each element (bar, cell, sticker) gets a staggered
// start so the chart paints in waves instead of all-at-once. Element i of
// N starts at progress = i/N, ends at progress = i/N + revealWidth.
//
// Pure functions only — no React, no RN. Drives both the per-frame video
// export AND any optional in-app reveal animations down the line.

/**
 * Returns 0..1 for element `index` of `count` at the given global
 * `progress`. Each element ramps from 0 to 1 across a window of
 * `revealWidth`, with starts staggered evenly so the last element
 * finishes exactly at progress = 1.
 */
export function staggeredT(
  progress: number,
  index: number,
  count: number,
  revealWidth = 0.15,
): number {
  if (count <= 0) return 0;
  if (count === 1) {
    // Single element: just ramp directly with progress over revealWidth.
    return clamp01(progress / Math.max(revealWidth, 0.0001));
  }
  const startProgress = (index / (count - 1)) * (1 - revealWidth);
  const localT = (progress - startProgress) / revealWidth;
  return clamp01(localT);
}

/**
 * For an SVG path of total length `pathLength`, returns the
 * `strokeDashoffset` value that draws the first `progress` fraction.
 * Pair with `strokeDasharray={[pathLength, pathLength]}`.
 */
export function pathDrawOffset(pathLength: number, progress: number): number {
  return pathLength * (1 - clamp01(progress));
}

/**
 * Eases progress with a gentle cubic so the reveal feels less mechanical.
 * Same curve in/out so the start and end pulses feel symmetric.
 */
export function easeInOut(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
