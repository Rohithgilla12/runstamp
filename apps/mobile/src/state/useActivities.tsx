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
import { listActivities } from '../services/activities';
import type { Activity } from '../data/models';
import { mapApiToActivity } from '../data/mapActivity';

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
