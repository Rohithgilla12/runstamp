// Pure geometry + camera choreography for the route flythrough film.
//
// Kept React-Native-free on purpose: the vitest suite runs in node and must
// not import react-native. mapTiles.ts carries an `import { Image } from
// 'react-native'`, so we inline the (trivial) Web Mercator projection here
// instead of importing it. Projecting into tile-pixel space — rather than the
// normalized [0..1] fallback — means the camera rig already lives in the same
// coordinate system map tiles use, so Phase 2 (map flyby) is a drop-in.

import { simplifyPath, type XY } from './simplifyPath';

// A 2D point; identical shape to simplifyPath's XY (re-aliased to avoid two
// names for one shape in the same package).
export type Pt = XY;

export interface Transform {
  center: Pt;
  // Camera zoom as a pixel-scale multiplier (canvas px per tile-pixel) —
  // NOT an integer Web-Mercator zoom level like map SDKs use.
  zoom: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const TILE_SIZE = 256;
const DEFAULT_REF_ZOOM = 14;
const DEFAULT_EPSILON = 0.75;

function lngToTile(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToTile(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
}

/** Projects masked [lat, lng] pairs into tile-pixel space and simplifies. */
export function projectRoute(
  rawLatLng: ReadonlyArray<readonly [number, number]>,
  refZoom: number = DEFAULT_REF_ZOOM,
  epsilon: number = DEFAULT_EPSILON,
): Pt[] {
  if (rawLatLng.length === 0) return [];
  const projected: Pt[] = rawLatLng.map(([lat, lng]) => ({
    x: lngToTile(lng, refZoom) * TILE_SIZE,
    y: latToTile(lat, refZoom) * TILE_SIZE,
  }));
  return simplifyPath(projected, epsilon);
}

/** Per-vertex cumulative arc length, starting at 0. Empty in → empty out. */
export function cumulativeLengths(points: readonly Pt[]): number[] {
  if (points.length === 0) return [];
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return cum;
}

/** Point at fraction f (0..1) of total arc length, via binary search + lerp. */
export function pointAtFrac(points: readonly Pt[], cum: readonly number[], f: number): Pt {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { x: points[0].x, y: points[0].y };
  const total = cum[n - 1];
  const target = Math.max(0, Math.min(1, f)) * total;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const segLen = cum[i] - cum[i - 1] || 1;
  const t = (target - cum[i - 1]) / segLen;
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
  };
}

/** Axis-aligned bounding box of the points. */
export function bboxOf(points: readonly Pt[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Zoom + center that frames the whole bbox inside width×height with padding. */
export function fitTransform(bbox: BBox, width: number, height: number, pad: number = 1.12): Transform {
  const w = Math.max(bbox.maxX - bbox.minX, 1e-6);
  const h = Math.max(bbox.maxY - bbox.minY, 1e-6);
  const zoom = Math.min(width / (w * pad), height / (h * pad));
  return {
    center: { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 },
    zoom,
  };
}
