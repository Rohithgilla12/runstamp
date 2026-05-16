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
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import {
  getRunstampReadAuthorizationStatus,
  isHealthKitAvailable,
  requestRunstampHealthPermissions,
} from '../services/healthkit';
import { syncRecentWorkouts, type SyncProgress } from '../services/healthSync';

export type HealthPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

interface HealthContextValue {
  status: HealthPermissionStatus;
  syncing: boolean;
  lastSyncAt: Date | null;
  /** Live progress while a sync is running, or null when idle. */
  progress: SyncProgress | null;
  /**
   * Run the permission prompt + full backfill. Returns a small summary
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
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const runSync = useCallback(
    async (since: Date) => {
      const idToken = await getIdToken();
      const sinceISO = since.toISOString();
      setSyncing(true);
      setProgress({ phase: 'listing', current: 0, total: 0 });
      try {
        const res = await syncRecentWorkouts(idToken, sinceISO, (p) => setProgress(p));
        setLastSyncAt(new Date());
        return res;
      } finally {
        // Always clear the spinner — even if the upload failed mid-stream,
        // the caller will surface the error via its own catch.
        setSyncing(false);
        setProgress(null);
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

  // Restore "granted" on cold launch. Apple won't tell us per-type read
  // grants, but `getRequestStatusForAuthorization` returning `unnecessary`
  // means the user has already responded to the prompt — same signal we'd
  // get from re-tapping connect. Without this the connectors UI shows
  // "Not connected" on every fresh launch even after the user has connected.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    (async () => {
      const next = await getRunstampReadAuthorizationStatus();
      if (cancelled) return;
      setStatus((current) => {
        if (current !== 'unknown') return current;
        if (next === 'unnecessary') return 'granted';
        if (next === 'unavailable') return 'unavailable';
        return current;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-resync on app foreground. iOS HKObserverQuery + background delivery
  // is the proper PRD §6.8 fix and lands in a later milestone (needs native
  // wiring). Until then, every time the user brings the app back to the
  // foreground and we haven't synced in the last 5 minutes, fire an
  // incremental resync in the background. Cheap when no new workouts exist
  // (HKAnchoredObjectQuery + dedup contract make repeat calls idempotent).
  const FOREGROUND_RESYNC_MIN_AGE_MS = 5 * 60 * 1000;
  const lastForegroundSyncRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (status !== 'granted') return;
    const onChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (!(prev.match(/inactive|background/) && next === 'active')) return;
      if (syncing) return;
      const now = Date.now();
      if (now - lastForegroundSyncRef.current < FOREGROUND_RESYNC_MIN_AGE_MS) return;
      lastForegroundSyncRef.current = now;
      // Fire and forget; errors are swallowed here because there's no UI
      // surface for a silent background sync. The next manual resync (or
      // the next foreground bounce) will retry.
      resync().catch(() => undefined);
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [status, syncing, resync]);

  const value = useMemo<HealthContextValue>(
    () => ({ status, syncing, lastSyncAt, progress, connect, resync }),
    [status, syncing, lastSyncAt, progress, connect, resync],
  );

  return <HealthCtx.Provider value={value}>{children}</HealthCtx.Provider>;
}

export function useHealth(): HealthContextValue {
  const v = useContext(HealthCtx);
  if (!v) throw new Error('useHealth must be used inside HealthProvider');
  return v;
}
