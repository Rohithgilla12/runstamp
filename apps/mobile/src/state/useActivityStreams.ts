import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getActivityStreams, type ActivityStream, type StreamType } from '../services/streams';
import { usePrivacyZones } from './usePrivacyZones';
import { maskRouteRaw } from '../analytics/privacyMask';
import type { PrivacyZone } from '../services/privacyZones';
import type { Point } from '../data/sample';

interface UseActivityStreamsState {
  streams: Record<StreamType, ActivityStream | undefined>;
  loading: boolean;
  error: Error | null;
  /** Normalized [0..1] polyline. Used by RouteMap's bare fallback path. */
  route: Point[] | null;
  /**
   * Privacy-masked raw [lat, lng] sequence. RouteMap uses this for the
   * slippy projection so the polyline aligns pixel-exact with raster map
   * tiles. null when the user has no GPS streams (treadmill / Apple Health
   * indoor) or when every point landed inside a privacy zone.
   */
  rawLatLng: Array<readonly [number, number]> | null;
  refresh: () => Promise<void>;
}

export function useActivityStreams(activityId: string | null): UseActivityStreamsState {
  const { user, getIdToken } = useAuth();
  const { zones } = usePrivacyZones();
  const [streams, setStreams] = useState<Record<StreamType, ActivityStream | undefined>>(emptyStreams());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user || !activityId) {
      setStreams(emptyStreams());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const resp = await getActivityStreams(activityId, idToken);
      const next = emptyStreams();
      for (const s of resp.streams ?? []) {
        next[s.type] = s;
      }
      setStreams(next);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken, activityId]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  // Privacy mask + projection. Recomputed when streams OR zones change so
  // adding a zone in Settings updates every open route map without a refetch.
  // parseLatLng returns both shapes — normalized for the bare RouteMap path
  // and raw lat/lng for the slippy-tile path.
  const parsed = useMemo(
    () => parseLatLng(streams.latlng?.data, zones),
    [streams.latlng, zones],
  );
  const route = parsed?.points ?? null;
  const rawLatLng = parsed?.rawLatLng ?? null;

  return { streams, loading, error, route, rawLatLng, refresh: fetchOnce };
}

function emptyStreams(): Record<StreamType, ActivityStream | undefined> {
  return {
    latlng: undefined,
    heartrate: undefined,
    altitude: undefined,
    velocity: undefined,
    cadence: undefined,
    power: undefined,
    vertical_oscillation: undefined,
    ground_contact_time: undefined,
    stride_length: undefined,
    speed: undefined,
  };
}

// Strava / HealthKit streams return latlng as `[[lat, lng], [lat, lng], …]`.
// RouteMap expects normalized 0..1 coordinates in its own space.
//
// The old version normalized lat and lng to [0..1] independently, which
// throws away aspect ratio: 1° of longitude is shorter than 1° of latitude
// (by `cos(latitude)`) once you leave the equator, so a 10 km wide × 1 km
// tall east-west loop would render as a square squiggle instead of a long
// thin one. We now apply a local equirectangular projection — scale lng by
// cos(mean latitude) to convert to meter-equivalent units — then fit the
// resulting meter-space bounding box to [0..1] with the SAME divisor on
// both axes, so the rendered route preserves its real-world shape.
interface ParsedRoute {
  points: Point[];
  rawLatLng: Array<readonly [number, number]>;
}

function parseLatLng(data: unknown, zones: PrivacyZone[]): ParsedRoute | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  // Coerce to a uniform tuple shape first so the mask + projection don't
  // re-validate per point.
  const tuples: Array<readonly [number, number]> = [];
  for (const pt of data) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    tuples.push([pt[0] as number, pt[1] as number] as const);
  }
  // Strip points inside any privacy zone. Render-time mask; raw lat/lng stays
  // on the server. When zones.length === 0 this is a one-pass copy.
  const masked = maskRouteRaw(tuples, zones);
  if (masked.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const pt of masked) {
    const [lat, lng] = pt;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (minLat === Infinity) return null;

  const meanLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((meanLat * Math.PI) / 180);
  // Meter-equivalent ranges (using the rough 1°≈111 km figure cancels out
  // in the ratio, so we just use degrees with the cos correction on lng).
  const lngMeters = (maxLng - minLng) * cosLat;
  const latMeters = maxLat - minLat;
  const span = Math.max(lngMeters, latMeters) || 1;
  // Center the smaller axis in [0..1] so square canvases don't squash the route.
  const xCenter = (span - lngMeters) / 2;
  const yCenter = (span - latMeters) / 2;
  // Inset so the polyline doesn't kiss the canvas edge.
  const inset = 0.05;
  const scale = 1 - inset * 2;
  const out: Point[] = [];
  for (const pt of masked) {
    const [lat, lng] = pt;
    const xMeters = (lng - minLng) * cosLat;
    // Flip lat: north is up, but normalized coords are y-down.
    const yMeters = maxLat - lat;
    const x = inset + ((xCenter + xMeters) / span) * scale;
    const y = inset + ((yCenter + yMeters) / span) * scale;
    out.push([x, y]);
  }
  return { points: out, rawLatLng: masked };
}
