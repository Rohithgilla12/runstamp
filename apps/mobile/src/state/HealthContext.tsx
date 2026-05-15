/**
 * HealthContext — owns Apple HealthKit permission state and sync orchestration.
 *
 * permissionStatus lifecycle:
 *   'unknown'     → initial state, permission has never been asked
 *   'granted'     → user approved (or previously approved) read access
 *   'denied'      → user denied; surface a "Go to Settings" prompt
 *   'unavailable' → HealthKit is not available (Android, iPad without HK, etc)
 *
 * `connect()` runs requestRunstampHealthPermissions, then immediately kicks
 * off a 90-day backfill via syncRecentWorkouts.
 *
 * Wire <HealthProvider> inside App.tsx next to <AuthProvider>.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import {
  isHealthKitAvailable,
  requestRunstampHealthPermissions,
} from '../services/healthkit';
import { syncRecentWorkouts } from '../services/healthSync';

export type HealthPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

interface HealthContextValue {
  status: HealthPermissionStatus;
  syncing: boolean;
  lastSyncAt: Date | null;
  connect: () => Promise<void>;
  resync: (since?: Date) => Promise<void>;
}

const HealthCtx = createContext<HealthContextValue | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const { getIdToken } = useAuth();

  const [status, setStatus] = useState<HealthPermissionStatus>(
    Platform.OS !== 'ios' ? 'unavailable' : 'unknown',
  );
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const runSync = useCallback(
    async (since: Date) => {
      const idToken = await getIdToken();
      const sinceISO = since.toISOString();
      setSyncing(true);
      try {
        await syncRecentWorkouts(idToken, sinceISO);
        setLastSyncAt(new Date());
      } finally {
        setSyncing(false);
      }
    },
    [getIdToken],
  );

  const connect = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Health is only available on iOS');
    }

    const available = await isHealthKitAvailable();
    if (!available) {
      setStatus('unavailable');
      return;
    }

    const granted = await requestRunstampHealthPermissions();
    if (!granted) {
      setStatus('denied');
      return;
    }

    setStatus('granted');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    await runSync(ninetyDaysAgo);
  }, [runSync]);

  const resync = useCallback(
    async (since?: Date) => {
      if (status !== 'granted') return;
      const syncFrom = since ?? lastSyncAt ?? (() => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
      })();
      await runSync(syncFrom);
    },
    [status, lastSyncAt, runSync],
  );

  const value = useMemo<HealthContextValue>(
    () => ({ status, syncing, lastSyncAt, connect, resync }),
    [status, syncing, lastSyncAt, connect, resync],
  );

  return <HealthCtx.Provider value={value}>{children}</HealthCtx.Provider>;
}

export function useHealth(): HealthContextValue {
  const v = useContext(HealthCtx);
  if (!v) throw new Error('useHealth must be used inside HealthProvider');
  return v;
}
