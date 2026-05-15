import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  listStamps,
  reevaluateStamps,
  type EarnedStampRaw,
  type StampDefinitionRaw,
  type StampTier,
} from '../services/stamps';

export interface CatalogStamp {
  id: string;
  name: string;
  description: string;
  tier: StampTier;
  category: string;
  earnedAt?: string;
  activityId?: string;
}

interface UseStampsState {
  stamps: CatalogStamp[];
  earned: CatalogStamp[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  reevaluate: () => Promise<string[]>;
}

export function useStamps(): UseStampsState {
  const { user, getIdToken } = useAuth();
  const [catalog, setCatalog] = useState<StampDefinitionRaw[]>([]);
  const [earnedRaw, setEarnedRaw] = useState<EarnedStampRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user) {
      setCatalog([]);
      setEarnedRaw([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const resp = await listStamps(idToken);
      setCatalog(resp.catalog ?? []);
      setEarnedRaw(resp.earned ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  const reevaluate = useCallback(async () => {
    const idToken = await getIdToken();
    const resp = await reevaluateStamps(idToken);
    await fetchOnce();
    return resp.awarded ?? [];
  }, [getIdToken, fetchOnce]);

  const stamps = useMemo<CatalogStamp[]>(() => {
    const earnedMap = new Map(earnedRaw.map((e) => [e.stampId, e]));
    return catalog.map((def) => {
      const earned = earnedMap.get(def.id);
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        tier: def.tier,
        category: def.category,
        earnedAt: earned?.earnedAt,
        activityId: earned?.activityId,
      };
    });
  }, [catalog, earnedRaw]);

  const earned = useMemo(() => stamps.filter((s) => !!s.earnedAt), [stamps]);

  return { stamps, earned, loading, error, refresh: fetchOnce, reevaluate };
}
