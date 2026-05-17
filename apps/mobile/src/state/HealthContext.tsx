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
  /** Last sync error message, or null if the last attempt succeeded. */
  lastError: string | null;
  /**
   * Last sync result summary (after the most recent runSync call). null
   * before the first sync of the session. Surfaced so screens can tell the
   * user "we asked HealthKit and got 0 workouts back" — i.e. the empty-
   * upload case isn't silently treated as success.
   */
  lastResult: { uploaded: number; skipped: number; workoutsFound: number } | null;
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
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<
    { uploaded: number; skipped: number; workoutsFound: number } | null
  >(null);

  const runSync = useCallback(
    async (since: Date) => {
      const idToken = await getIdToken();
      const sinceISO = since.toISOString();
      setSyncing(true);
      setLastError(null);
      setProgress({ phase: 'listing', current: 0, total: 0 });
      try {
        const res = await syncRecentWorkouts(idToken, sinceISO, (p) => setProgress(p));
        setLastSyncAt(new Date());
        setLastResult(res);
        return res;
      } catch (e) {
        // Record the message before re-throwing so the connectors UI can show
        // a persistent "last sync failed: X" line even if the caller's catch
        // block already alerted and dismissed.
        setLastError(e instanceof Error ? e.message : String(e));
        throw e;
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
      // We used to bail on `status !== 'granted'`. That hid every cold-launch
      // glitch where the auth-status restore returned `shouldRequest` or
      // `unknown` and never flipped to `granted` — pull-to-refresh would call
      // resync, resync would silently return, no POST ever fired. Now we only
      // bail when HK is definitively unavailable (Android / no HK device); in
      // every other state we try the sync and let HealthKit / the backend
      // surface the real error.
      if (status === 'unavailable') return;
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
  // grants — `getRequestStatusForAuthorization` returning `unnecessary`
  // means the user has already responded to the prompt, which is the same
  // signal we'd get from re-tapping connect.
  //
  // Subtle edge case: when we add new READ_TYPES (e.g. M4 added VO2Max,
  // power, vert osc) the API returns `shouldRequest` because the user was
  // never prompted for the new types. The OLD types are still readable
  // (Apple keeps prior grants) so pull-to-refresh would actually succeed —
  // but the gate at useFullRefresh would skip it because status was stuck
  // at 'unknown'. We now optimistically flip to 'granted' so the resync
  // path runs; if it really is denied, the user gets a loud error instead
  // of a silent no-op.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    (async () => {
      const next = await getRunstampReadAuthorizationStatus();
      if (cancelled) return;
      setStatus((current) => {
        if (current !== 'unknown') return current;
        if (next === 'unavailable') return 'unavailable';
        if (next === 'unnecessary' || next === 'shouldRequest') return 'granted';
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
      // Fire and forget — runSync already records the error into lastError
      // so the connectors UI can show "last auto-sync failed: …". We don't
      // pop an alert here (the user didn't initiate this), but we no longer
      // black-hole the error.
      resync().catch(() => undefined);
      // (runSync's own catch sets lastError before re-throwing.)
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [status, syncing, resync]);

  const value = useMemo<HealthContextValue>(
    () => ({ status, syncing, lastSyncAt, lastError, lastResult, progress, connect, resync }),
    [status, syncing, lastSyncAt, lastError, lastResult, progress, connect, resync],
  );

  return <HealthCtx.Provider value={value}>{children}</HealthCtx.Provider>;
}

export function useHealth(): HealthContextValue {
  const v = useContext(HealthCtx);
  if (!v) throw new Error('useHealth must be used inside HealthProvider');
  return v;
}
