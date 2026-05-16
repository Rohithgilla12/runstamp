import { useCallback, useEffect, useState } from 'react';
import { getMe, patchMe, type MeResponse, type ProfilePatch } from '../services/account';
import { useAuth } from './AuthContext';

interface UseAccountState {
  me: MeResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  save: (patch: ProfilePatch) => Promise<void>;
}

export function useAccount(): UseAccountState {
  const { user, getIdToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setMe(null); return; }
    setLoading(true); setError(null);
    try {
      const token = await getIdToken();
      setMe(await getMe(token));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  const save = useCallback(async (patch: ProfilePatch) => {
    const token = await getIdToken();
    const updated = await patchMe(token, patch);
    setMe(updated);
  }, [getIdToken]);

  useEffect(() => { refresh(); }, [refresh]);

  return { me, loading, error, refresh, save };
}
