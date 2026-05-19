// mapTiles — slippy-map tile math + URL builder + RN prefetch helper.
//
// We pull raster tiles from CartoCDN's `light_nolabels` style (Positron
// without place labels): black-ink lines on a near-white backdrop, exactly
// the paper-and-ink aesthetic the rest of the app is going for. Free for
// low-volume use, no API key required. Attribution mandatory and rendered
// inside RouteMap's corner overlay.
//
// All math is Web Mercator at the standard 256px tile size — same projection
// every slippy-map server speaks. Polyline projection in RouteMap.tsx uses
// the exact same `lngToTile` / `latToTile` so the route lines up with the
// tiles to the pixel.

import { Image } from 'react-native';

export const TILE_SIZE = 256;
export const TILE_ATTRIBUTION = '© CARTO · © OpenStreetMap';

// CartoCDN ships five raster styles that map cleanly to the brand vocabulary
// here. `light_nolabels` is the default — paper-and-ink, no place names so
// the route is the only thing the eye lands on. The labelled and dark
// variants are there for runners who want orientation or a moody look.
// Voyager has a touch of map colour without going full default-OSM
// chaotic-rainbow.
export type TileStyle =
  | 'light_nolabels'
  | 'light_all'
  | 'dark_nolabels'
  | 'dark_all'
  | 'voyager_nolabels';

export const DEFAULT_TILE_STYLE: TileStyle = 'light_nolabels';

export const TILE_STYLES: ReadonlyArray<{ key: TileStyle; label: string; sub: string }> = [
  { key: 'light_nolabels',   label: 'Paper',          sub: 'No labels · default' },
  { key: 'light_all',        label: 'Paper · labels', sub: 'With street names' },
  { key: 'voyager_nolabels', label: 'Voyager',        sub: 'Subtle colour' },
  { key: 'dark_nolabels',    label: 'Ink',            sub: 'No labels' },
  { key: 'dark_all',         label: 'Ink · labels',   sub: 'Dark with names' },
];

export interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function lngToTile(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

export function latToTile(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2
  ) * Math.pow(2, z);
}

// Picks the highest zoom where the route's bbox fits comfortably (≤ 92% of
// the canvas) on both axes. 92% leaves a touch of margin so the polyline
// markers (start dot, end dot) aren't kissing the canvas edge.
export function pickZoom(bbox: BBox, canvasW: number, canvasH: number, maxZ = 17): number {
  for (let z = maxZ; z >= 1; z--) {
    const tx0 = lngToTile(bbox.minLng, z);
    const tx1 = lngToTile(bbox.maxLng, z);
    const ty0 = latToTile(bbox.maxLat, z);
    const ty1 = latToTile(bbox.minLat, z);
    const tilesPxW = (tx1 - tx0) * TILE_SIZE;
    const tilesPxH = (ty1 - ty0) * TILE_SIZE;
    if (tilesPxW <= canvasW * 0.92 && tilesPxH <= canvasH * 0.92) {
      return z;
    }
  }
  return 1;
}

// CartoCDN has 4 fastly subdomains (a/b/c/d) for tile distribution. We pick
// deterministically off (x + y) so consecutive tiles spread across servers.
export function tileUrl(z: number, x: number, y: number, style: TileStyle = DEFAULT_TILE_STYLE): string {
  const sub = ['a', 'b', 'c', 'd'][Math.abs(x + y) % 4];
  return `https://cartodb-basemaps-${sub}.global.ssl.fastly.net/${style}/${z}/${x}/${y}.png`;
}

// Computes the canvas (px) coordinates for a raw lat/lng under a given zoom
// + center offset. Used by both the tile placement AND the polyline draw so
// they share a single source of truth.
export function projectToCanvas(
  lat: number,
  lng: number,
  z: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  return {
    x: lngToTile(lng, z) * TILE_SIZE + offsetX,
    y: latToTile(lat, z) * TILE_SIZE + offsetY,
  };
}

// Computes the offsetX/offsetY that centers the bbox inside the canvas at a
// given zoom. The route projection + tile rendering both add these so the
// content sits centered.
export function centerOffsets(
  bbox: BBox,
  z: number,
  canvasW: number,
  canvasH: number,
): { offsetX: number; offsetY: number } {
  const tx0 = lngToTile(bbox.minLng, z);
  const tx1 = lngToTile(bbox.maxLng, z);
  const ty0 = latToTile(bbox.maxLat, z);
  const ty1 = latToTile(bbox.minLat, z);
  const tilesPxW = (tx1 - tx0) * TILE_SIZE;
  const tilesPxH = (ty1 - ty0) * TILE_SIZE;
  const offsetX = (canvasW - tilesPxW) / 2 - tx0 * TILE_SIZE;
  const offsetY = (canvasH - tilesPxH) / 2 - ty0 * TILE_SIZE;
  return { offsetX, offsetY };
}

// Returns the tile-grid bounds (inclusive) that cover a bbox at a given zoom.
// Used by prefetch; for the on-screen tile layer use tilesForCanvas (below).
export function tilesForBbox(
  bbox: BBox,
  z: number,
): { x0: number; x1: number; y0: number; y1: number } {
  return {
    x0: Math.floor(lngToTile(bbox.minLng, z)),
    x1: Math.ceil(lngToTile(bbox.maxLng, z)),
    y0: Math.floor(latToTile(bbox.maxLat, z)),
    y1: Math.ceil(latToTile(bbox.minLat, z)),
  };
}

// Returns every tile coordinate whose screen rectangle overlaps the canvas
// viewport, given the projection's pixel offsets. This is the right function
// for the on-screen layer: tilesForBbox only covers the route's bounding box,
// which leaves the canvas blank when the route is a thin line (e.g. an
// out-and-back on a single road) since the bbox is much narrower than the
// canvas at the fitted zoom.
//
// Clamped to maxTilesPerAxis (default 16) so a pathological combination of
// zoom + offsets never asks for an unbounded number of tiles. At reasonable
// canvas sizes a single screen needs ~4-8 tiles per axis.
export function tilesForCanvas(
  offsetX: number,
  offsetY: number,
  canvasW: number,
  canvasH: number,
  maxTilesPerAxis = 16,
): { x0: number; x1: number; y0: number; y1: number } {
  const rawX0 = Math.floor(-offsetX / TILE_SIZE);
  const rawX1 = Math.ceil((canvasW - offsetX) / TILE_SIZE) - 1;
  const rawY0 = Math.floor(-offsetY / TILE_SIZE);
  const rawY1 = Math.ceil((canvasH - offsetY) / TILE_SIZE) - 1;
  // Clamp the axis span so we never blow past a reasonable tile budget.
  const x1 = Math.min(rawX1, rawX0 + maxTilesPerAxis - 1);
  const y1 = Math.min(rawY1, rawY0 + maxTilesPerAxis - 1);
  return { x0: rawX0, x1, y0: rawY0, y1 };
}

// Prefetches every tile in a bbox so that the next render finds them in the
// React Native image cache. Used by the editor's share flow before
// captureRef, so the exported PNG isn't half-blank on first share.
//
// Resolves once every tile has fetched (or failed — we don't fail the whole
// share for a single missing tile). Bounded concurrency = 6, plenty for a
// share-card-sized 4-6 tile grid without slamming the CDN.
export async function prefetchTiles(bbox: BBox, canvasW: number, canvasH: number, style: TileStyle = DEFAULT_TILE_STYLE): Promise<void> {
  const z = pickZoom(bbox, canvasW, canvasH);
  const { offsetX, offsetY } = centerOffsets(bbox, z, canvasW, canvasH);
  // Match the on-screen layer's tile set so the share-card capture finds
  // every tile in cache. Using tilesForBbox here meant the captured PNG
  // had blank side bars whenever the route was a thin line.
  const { x0, x1, y0, y1 } = tilesForCanvas(offsetX, offsetY, canvasW, canvasH);
  const urls: string[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      urls.push(tileUrl(z, x, y, style));
    }
  }
  const CONCURRENCY = 6;
  let cursor = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push((async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        await Image.prefetch(url).catch(() => undefined);
      }
    })());
  }
  await Promise.all(workers);
}
