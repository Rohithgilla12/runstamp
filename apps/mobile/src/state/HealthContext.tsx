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
  /**
   * Run the permission prompt + 90-day backfill. Returns a small summary
   * the caller can show. Throws on any error — callers should surface it.
   */
  connect: () => Promise<{ uploaded: number; skipped: number } | null>;
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
        const res = await syncRecentWorkouts(idToken, sinceISO);
        setLastSyncAt(new Date());
        return res;
      } finally {
        // Always clear the spinner — even if the upload failed mid-stream,
        // the caller will surface the error via its own catch.
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
      return null;
    }

    const granted = await requestRunstampHealthPermissions();
    if (!granted) {
      setStatus('denied');
      return null;
    }

    setStatus('granted');

    // First connect — full backfill. HKAnchoredObjectQuery + the dedup
    // contract in activities.Service ensure re-syncs don't double-write.
    // Apple Watch records can go back many years; we want everything so
    // lifetime stats + place stamps + cumulative-distance stamps work
    // from day one. The detail fetch batches at concurrency 8 + uploads
    // in chunks of 50 so even ~10k workouts are tractable.
    const allTime = new Date(0);
    const res = await runSync(allTime);
    return res ?? null;
  }, [runSync]);

  const resync = useCallback(
    async (since?: Date) => {
      if (status !== 'granted') return;
      // Manual re-sync: incremental from lastSyncAt with a 7-day overlap to
      // catch any workouts that landed slightly out of order. Fall back to
      // all-time when we have no anchor (first launch after granted).
      const syncFrom =
        since ??
        (() => {
          if (lastSyncAt) {
            const overlap = new Date(lastSyncAt);
            overlap.setDate(overlap.getDate() - 7);
            return overlap;
          }
          return new Date(0);
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
