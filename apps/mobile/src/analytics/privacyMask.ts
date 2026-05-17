// Render-time privacy mask.
//
// Filters a [lat, lng] sequence by dropping any point that falls within a
// user's privacy zones. The polyline picks up at the next non-masked
// sample, so a run that starts inside a "Home" zone visually starts at the
// zone boundary — exactly the shape we want.
//
// We use a fast equirectangular approximation in meters (good to <0.1% at
// any human-runnable distance) instead of full haversine; zones are local
// circles, not great-circle problems.

import type { PrivacyZone } from '../services/privacyZones';

interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;

export function isInsideZone(point: LatLng, zone: { lat: number; lng: number; radiusM: number }): boolean {
  const dLat = ((point.lat - zone.lat) * Math.PI) / 180;
  const meanLat = ((point.lat + zone.lat) / 2) * (Math.PI / 180);
  const dLng = ((point.lng - zone.lng) * Math.PI) / 180 * Math.cos(meanLat);
  const dx = dLng * EARTH_RADIUS_M;
  const dy = dLat * EARTH_RADIUS_M;
  return dx * dx + dy * dy <= zone.radiusM * zone.radiusM;
}

export function pointInAnyZone(point: LatLng, zones: PrivacyZone[]): boolean {
  for (const z of zones) {
    if (isInsideZone(point, z)) return true;
  }
  return false;
}

/**
 * Removes points inside any zone from a raw `[[lat, lng], …]` array.
 * Non-tuple entries pass through unchanged so callers (parseLatLng) keep
 * their existing defensive parsing.
 */
export function maskRouteRaw(
  data: ReadonlyArray<readonly [number, number]>,
  zones: PrivacyZone[],
): Array<readonly [number, number]> {
  if (zones.length === 0) return data.slice();
  const out: Array<readonly [number, number]> = [];
  for (const pt of data) {
    if (!pointInAnyZone({ lat: pt[0], lng: pt[1] }, zones)) {
      out.push(pt);
    }
  }
  return out;
}
