import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getActivityStreams, type ActivityStream, type StreamType } from '../services/streams';
import type { Point } from '../data/sample';

interface UseActivityStreamsState {
  streams: Record<StreamType, ActivityStream | undefined>;
  loading: boolean;
  error: Error | null;
  route: Point[] | null;
  refresh: () => Promise<void>;
}

export function useActivityStreams(activityId: string | null): UseActivityStreamsState {
  const { user, getIdToken } = useAuth();
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

  const route = parseLatLng(streams.latlng?.data);

  return { streams, loading, error, route, refresh: fetchOnce };
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

// Strava streams return latlng as `[[lat, lng], [lat, lng], …]`. RouteMap
// expects normalized 0..1 coordinates in its own space; we hand it raw
// (lat, lng) and let it normalize. Result type is the same Point tuple
// used by the seeded generator so the renderer signature is unchanged.
function parseLatLng(data: unknown): Point[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  // Bounds for normalization
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const pt of data) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const [lat, lng] = pt as [number, number];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (minLat === Infinity) return null;
  const dLat = maxLat - minLat || 1;
  const dLng = maxLng - minLng || 1;
  // Add a small inset so the polyline doesn't kiss the canvas edge.
  const inset = 0.05;
  const out: Point[] = [];
  for (const pt of data) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const [lat, lng] = pt as [number, number];
    const x = inset + ((lng - minLng) / dLng) * (1 - inset * 2);
    // Flip lat: north is up, but normalized coords are y-down.
    const y = inset + (1 - (lat - minLat) / dLat) * (1 - inset * 2);
    out.push([x, y]);
  }
  return out;
}
