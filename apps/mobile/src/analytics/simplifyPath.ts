// Ramer–Douglas–Peucker line simplification on canvas-space points.
//
// Real Strava/HealthKit GPS tracks arrive at full resolution — thousands of
// points for an hour-plus run. Drawn into a route map ≤400px wide, that detail
// is sub-pixel and invisible, but react-native-svg still has to composite every
// node on each frame (scroll, drag, the stroke-draw animation), which janks the
// whole screen. Simplifying down to what's perceptible keeps the line identical
// to the eye while cutting node count by 10–50×.

export interface XY {
  x: number;
  y: number;
}

// Above this, RDP's worst case (O(n²)) gets expensive enough to feel on a
// re-render, so uniformly stride down to a safe ceiling first. The stride is
// near-lossless at GPS densities and bounds the RDP pass.
const RDP_INPUT_CEILING = 4000;

/**
 * Returns a simplified copy of `pts` keeping only vertices that deviate more
 * than `epsilon` pixels from the simplified line. Endpoints are always kept.
 * Iterative (explicit stack) so multi-thousand-point tracks can't blow the
 * call stack.
 */
export function simplifyPath(pts: readonly XY[], epsilon: number): XY[] {
  if (pts.length <= 2 || epsilon <= 0) return pts.slice();

  const input = pts.length > RDP_INPUT_CEILING ? uniformStride(pts, RDP_INPUT_CEILING) : pts;
  const n = input.length;
  if (n <= 2) return input.slice();

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const eps2 = epsilon * epsilon;
  const stack: Array<[number, number]> = [[0, n - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last - first < 2) continue;

    const ax = input[first].x;
    const ay = input[first].y;
    const dx = input[last].x - ax;
    const dy = input[last].y - ay;
    const segLen2 = dx * dx + dy * dy;

    let maxD2 = -1;
    let idx = -1;
    for (let i = first + 1; i < last; i++) {
      const px = input[i].x - ax;
      const py = input[i].y - ay;
      // Perpendicular distance² from point to the (infinite) line a→b; falls
      // back to point distance when a and b coincide.
      const d2 =
        segLen2 === 0
          ? px * px + py * py
          : (() => {
              const t = (px * dx + py * dy) / segLen2;
              const ex = px - dx * t;
              const ey = py - dy * t;
              return ex * ex + ey * ey;
            })();
      if (d2 > maxD2) {
        maxD2 = d2;
        idx = i;
      }
    }

    if (maxD2 > eps2 && idx !== -1) {
      keep[idx] = 1;
      stack.push([first, idx]);
      stack.push([idx, last]);
    }
  }

  const out: XY[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(input[i]);
  }
  return out;
}

// Evenly samples `pts` down to at most `max` points, always keeping the last.
function uniformStride(pts: readonly XY[], max: number): XY[] {
  const step = pts.length / max;
  const out: XY[] = [];
  for (let i = 0; i < max; i++) {
    out.push(pts[Math.floor(i * step)]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
