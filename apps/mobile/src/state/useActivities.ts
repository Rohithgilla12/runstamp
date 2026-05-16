import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { listActivities, type ApiActivity } from '../services/activities';
import { route, type Activity, type ActivityKind } from '../data/sample';

interface UseActivitiesState {
  activities: Activity[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useActivities(): UseActivitiesState {
  const { user, getIdToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user) {
      setActivities([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      // No explicit limit — services/activities.ts already defaults to 10k.
      const resp = await listActivities(idToken);
      setActivities(resp.activities.map(mapApiToActivity));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  return { activities, loading, error, refresh: fetchOnce };
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
    date,
    day,
    time,
    title: a.title || 'Untitled run',
    place: [a.city, a.country].filter(Boolean).join(', ') || '—',
    city: a.city ?? '',
    country: a.country ?? '',
    distance: Number(distanceKm.toFixed(2)),
    seconds: a.elapsedSec,
    elev: Math.round(a.elevationM ?? 0),
    pace: Math.round(pace),
    avgHr: a.avgHr ?? 0,
    maxHr: a.maxHr ?? 0,
    cal: a.calories ?? 0,
    cadence: a.cadenceSpm ? Math.round(a.cadenceSpm) : undefined,
    shoe: '',
    route: route(hashId(a.id), inferRouteKind(distanceKm, a)),
    weather: { t: 22, w: '—', icon: 'clear' },
    kind: inferKind(a, distanceKm),
  };
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
