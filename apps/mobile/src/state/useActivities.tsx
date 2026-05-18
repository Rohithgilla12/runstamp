// ActivitiesProvider — single fetch, shared state, in-flight dedup.
//
// Before this, useActivities was a plain hook. 13 call sites across the app
// (HomeScreen + AnalyticsScreen + PlacesScreen + … + every modal that
// touches the run list) each fired its own /v1/activities GET on mount.
// The bottom tabs keep Home + Stats + Places + Profile mounted in parallel,
// so opening the app fired 4 concurrent fetches before the user did
// anything. Each fetch is 238 KB of JSON; that's ~1 MB of redundant wire
// traffic on cold open and ~2 MB on a Stats-page mount once child screens
// (Editor / ActivityScreen) layered on.
//
// Lifting to a Provider gives every consumer the same in-memory list and
// the same refresh() function. inFlightRef collapses parallel refresh
// triggers into a single network call.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { listActivities, type ApiActivity } from '../services/activities';
import { route, type Activity, type ActivityKind } from '../data/sample';

interface ActivitiesContextValue {
  activities: Activity[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const { user, getIdToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // In-flight promise — multiple components calling refresh() during the
  // same render tick share the same network call instead of racing each
  // other. Cleared in finally so the next refresh is a fresh fetch.
  const inFlightRef = useRef<Promise<void> | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user) {
      setActivities([]);
      return;
    }
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    setLoading(true);
    setError(null);
    const p = (async () => {
      try {
        const idToken = await getIdToken();
        // No explicit limit — services/activities.ts already defaults to 10k.
        const resp = await listActivities(idToken);
        setActivities(resp.activities.map(mapApiToActivity));
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = p;
    return p;
  }, [user, getIdToken]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  return (
    <ActivitiesContext.Provider value={{ activities, loading, error, refresh: fetchOnce }}>
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities(): ActivitiesContextValue {
  const ctx = useContext(ActivitiesContext);
  if (!ctx) throw new Error('useActivities must be used inside <ActivitiesProvider>');
  return ctx;
}

function mapApiToActivity(a: ApiActivity): Activity {
  const started = new Date(a.startedAt);
  const yyyy = started.getFullYear();
  const mm = String(started.getMonth() + 1).padStart(2, '0');
  const dd = String(started.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;
  const day = started.toLocaleDateString(undefined, { weekday: 'short' });
  const hh = String(started.getHours()).padStart(2, '0');
  const mi = String(started.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mi}`;

  const distanceKm = a.distanceM / 1000;
  const pace = a.avgPaceSPerKm ?? (distanceKm > 0 ? a.elapsedSec / distanceKm : 0);

  return {
    id: a.id,
    source: a.source,
    externalId: a.externalId,
    date,
    day,
    time,
    title: a.title?.trim() || synthesizeTitle(started, distanceKm, a.city),
    place: [a.city, a.country].filter(Boolean).join(', ') || '—',
    city: a.city ?? '',
    country: a.country ?? '',
    distance: Number(distanceKm.toFixed(2)),
    seconds: a.elapsedSec,
    elev: Math.round(a.elevationM ?? 0),
    pace: Math.round(pace),
    gapPace: a.gapSecPerKm && a.gapSecPerKm > 0 ? Math.round(a.gapSecPerKm) : undefined,
    avgHr: a.avgHr ?? 0,
    maxHr: a.maxHr ?? 0,
    cal: a.calories ?? 0,
    cadence: a.cadenceSpm ? Math.round(a.cadenceSpm) : undefined,
    vo2max: a.vo2maxMlKgMin && a.vo2maxMlKgMin > 0 ? Number(a.vo2maxMlKgMin.toFixed(1)) : undefined,
    power: a.runningPowerW && a.runningPowerW > 0 ? Math.round(a.runningPowerW) : undefined,
    startLat: typeof a.startLat === 'number' ? a.startLat : undefined,
    startLon: typeof a.startLon === 'number' ? a.startLon : undefined,
    shoe: '',
    route: route(hashId(a.id), inferRouteKind(distanceKm, a)),
    weather: { t: 22, w: '—', icon: 'clear' },
    kind: inferKind(a, distanceKm),
  };
}

// Apple Health workouts arrive with no title. "Untitled run" looked grim, so
// synthesize one Strava-style: "Morning run" / "Afternoon run" / "Evening run"
// / "Night run", with the city suffixed when we've geocoded it. Long runs get
// a "Long" prefix so a 24 km Sunday looks meaningfully different in the list.
// The user can still long-press the title on Activity to override.
function synthesizeTitle(when: Date, distanceKm: number, city: string | undefined): string {
  const hour = when.getHours();
  const slot =
    hour >= 4 && hour < 12 ? 'Morning' :
    hour >= 12 && hour < 17 ? 'Afternoon' :
    hour >= 17 && hour < 21 ? 'Evening' :
    'Night';
  const noun =
    distanceKm >= 42 ? 'marathon' :
    distanceKm >= 21 ? 'half marathon' :
    distanceKm >= 18 ? 'long run' :
    'run';
  const base = `${slot} ${noun}`;
  const trimmedCity = city?.trim();
  return trimmedCity ? `${base} in ${trimmedCity}` : base;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 100;
}

function inferRouteKind(distanceKm: number, a: ApiActivity): 'loop' | 'lake' | 'out' | 'trail' | 'urban' {
  if (a.elevationM && a.elevationM > 150) return 'trail';
  if (distanceKm > 20) return 'loop';
  if (a.city) return 'urban';
  return 'loop';
}

function inferKind(a: ApiActivity, distanceKm: number): ActivityKind {
  if (distanceKm >= 20) return 'long';
  if (a.maxHr && a.avgHr && a.maxHr - a.avgHr > 20) return 'workout';
  if (a.avgHr && a.avgHr < 140) return 'easy';
  return 'easy';
}
