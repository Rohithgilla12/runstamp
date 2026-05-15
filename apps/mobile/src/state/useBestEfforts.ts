import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { listBestEfforts, type BestEffort } from '../services/bestEfforts';

interface UseBestEffortsState {
  efforts: BestEffort[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useBestEfforts(): UseBestEffortsState {
  const { user, getIdToken } = useAuth();
  const [efforts, setEfforts] = useState<BestEffort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user) {
      setEfforts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const resp = await listBestEfforts(idToken);
      setEfforts(resp.efforts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  return { efforts, loading, error, refresh: fetchOnce };
}
