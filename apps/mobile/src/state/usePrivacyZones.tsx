// Privacy zones — global cache provider.
//
// Zones drive route masking on every render path that consumes lat/lng
// streams (ActivityScreen hero, HomeScreen post-run card, EditorScreen,
// every share-card template, the route-map sticker). Loading them per
// screen would mean 5+ duplicate GETs on a normal session, so we lift to
// a context + Provider — fetch once on auth-resolve, expose to consumers.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  createPrivacyZone,
  deletePrivacyZone,
  listPrivacyZones,
  type PrivacyZone,
} from '../services/privacyZones';

interface PrivacyZonesContextValue {
  zones: PrivacyZone[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  add: (input: { name?: string; lat: number; lng: number; radiusM: number }) => Promise<PrivacyZone>;
  remove: (id: string) => Promise<void>;
}

const PrivacyZonesContext = createContext<PrivacyZonesContextValue | null>(null);

export function PrivacyZonesProvider({ children }: { children: React.ReactNode }) {
  const { user, getIdToken } = useAuth();
  const [zones, setZones] = useState<PrivacyZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user) {
      setZones([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const next = await listPrivacyZones(idToken);
      setZones(next);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  const add = useCallback(
    async (input: { name?: string; lat: number; lng: number; radiusM: number }) => {
      const idToken = await getIdToken();
      const created = await createPrivacyZone(idToken, input);
      setZones((prev) => [...prev, created]);
      return created;
    },
    [getIdToken],
  );

  const remove = useCallback(
    async (id: string) => {
      const idToken = await getIdToken();
      await deletePrivacyZone(idToken, id);
      setZones((prev) => prev.filter((z) => z.id !== id));
    },
    [getIdToken],
  );

  return (
    <PrivacyZonesContext.Provider value={{ zones, loading, error, refresh: fetchOnce, add, remove }}>
      {children}
    </PrivacyZonesContext.Provider>
  );
}

export function usePrivacyZones(): PrivacyZonesContextValue {
  const ctx = useContext(PrivacyZonesContext);
  if (!ctx) throw new Error('usePrivacyZones must be used within <PrivacyZonesProvider>');
  return ctx;
}
