import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { usePrivacyZones } from './usePrivacyZones';
import { getActivityStreams } from '../services/streams';
import { maskRouteRaw } from '../analytics/privacyMask';
import { coverCells, coverageStats, type CoverageStats, type GridSpec } from '../lib/gridCoverage';
import type { Activity } from '../data/models';

const CELL_METERS = 100;
const MAX_RUNS = 80;
const CONCURRENCY = 6;
const MAX_CACHE_ENTRIES = 200;

const rawRouteCache = new Map<string, Array<readonly [number, number]>>();

export interface CityBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface CityCoverage {
  cells: Set<string>;
  bbox: CityBBox | null;
  stats: CoverageStats;
  loading: boolean;
  progress: number;
  capped: boolean;
}

const EMPTY_STATS: CoverageStats = { cellCount: 0, areaKm2: 0 };

function emptyState(): CityCoverage {
  return {
    cells: new Set(),
    bbox: null,
    stats: EMPTY_STATS,
    loading: false,
    progress: 0,
    capped: false,
  };
}

export function useCityCoverage(cityRuns: Activity[] | null, refLat: number): CityCoverage {
  const { getIdToken } = useAuth();
  const { zones } = usePrivacyZones();
  const [state, setState] = useState<CityCoverage>(emptyState);
  const cancelledRef = useRef(false);

  const runKey = cityRuns == null || cityRuns.length === 0
    ? ''
    : cityRuns.map((r) => r.id).sort().join(',');

  const zonesKey = zones.map((z) => `${z.id}:${z.lat}:${z.lng}:${z.radiusM}`).sort().join(',');

  useEffect(() => {
    if (!runKey) {
      setState(emptyState());
      return;
    }

    cancelledRef.current = false;

    if (!cityRuns) return;
    const sorted = [...cityRuns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const capped = sorted.length > MAX_RUNS;
    const selected = sorted.slice(0, MAX_RUNS);

    setState((prev) => ({ ...prev, loading: true, progress: 0, capped }));

    let completed = 0;
    const total = selected.length;

    async function fetchRaw(activity: Activity, idToken: string | null): Promise<void> {
      if (rawRouteCache.has(activity.id)) return;
      try {
        const resp = await getActivityStreams(activity.id, idToken);
        const latlngStream = (resp.streams ?? []).find((s) => s.type === 'latlng');
        const raw = latlngStream?.data;
        if (!Array.isArray(raw) || raw.length === 0) return;
        const tuples: Array<readonly [number, number]> = [];
        for (const pt of raw) {
          if (!Array.isArray(pt) || pt.length < 2) continue;
          tuples.push([pt[0] as number, pt[1] as number] as const);
        }
        if (tuples.length > 0) {
          rawRouteCache.set(activity.id, tuples);
          if (rawRouteCache.size > MAX_CACHE_ENTRIES) {
            const oldest = rawRouteCache.keys().next().value;
            if (oldest !== undefined) rawRouteCache.delete(oldest);
          }
        }
      } catch {
        // tolerate per-activity failures — skip this run
      }
    }

    async function run(): Promise<void> {
      const idToken = await getIdToken();

      // Fetch uncached runs with concurrency cap
      const uncached = selected.filter((a) => !rawRouteCache.has(a.id));
      for (let i = 0; i < uncached.length; i += CONCURRENCY) {
        if (cancelledRef.current) return;
        const slice = uncached.slice(i, i + CONCURRENCY);
        await Promise.all(slice.map((a) => fetchRaw(a, idToken)));
        if (cancelledRef.current) return;
        completed = Math.min(i + CONCURRENCY, uncached.length);
        // already-cached runs count toward total progress
        const cachedCount = total - uncached.length;
        setState((prev) => ({
          ...prev,
          progress: (cachedCount + completed) / total,
        }));
      }

      if (cancelledRef.current) return;

      const spec: GridSpec = { cellMeters: CELL_METERS, refLat };
      const routes = selected
        .map((a) => rawRouteCache.get(a.id))
        .filter((r): r is Array<readonly [number, number]> => r != null && r.length > 0)
        .map((r) => maskRouteRaw(r, zones));

      const cells = coverCells(routes, spec);

      let bbox: CityBBox | null = null;
      if (routes.length > 0) {
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        for (const route of routes) {
          for (const [lat, lng] of route) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          }
        }
        if (minLat !== Infinity) {
          bbox = { minLat, maxLat, minLng, maxLng };
        }
      }

      const stats = coverageStats(cells, spec);

      setState({
        cells,
        bbox,
        stats,
        loading: false,
        progress: 1,
        capped,
      });
    }

    run();

    return () => {
      cancelledRef.current = true;
    };
  }, [runKey, refLat, zonesKey]);

  return state;
}
