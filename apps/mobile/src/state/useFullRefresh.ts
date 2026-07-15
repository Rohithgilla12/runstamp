import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useActivities } from './useActivities';
import { useStamps } from './useStamps';
import { useHealth } from './HealthContext';

interface UseFullRefreshOptions {
  /** Pull stamps too (Home, Stamps screens). Defaults to false. */
  withStamps?: boolean;
}

/**
 * Single pull-to-refresh handler used across Home / Analytics / Activities /
 * Places / Stamps. Apple Health workouts only reach the backend via mobile
 * push — when the user pulls to refresh on a list, we have to resync HealthKit
 * BEFORE re-listing, otherwise today's run is still sitting in HealthKit
 * waiting to be uploaded and the list comes back unchanged.
 *
 * Strava activities arrive server-side via webhook so they don't need a push
 * step here — the list refresh will pick them up automatically.
 *
 * Error policy: pull-to-refresh is a user-initiated gesture, so any failure
 * gets surfaced in an Alert. Silently swallowing turns "today's run never
 * showed up" into a debugging nightmare. The list refresh still runs after
 * a Health failure so the user at least sees whatever IS on the server.
 */
export function useFullRefresh({ withStamps = false }: UseFullRefreshOptions = {}) {
  const { activities, refresh: refreshActivities } = useActivities();
  const { refresh: refreshStamps } = useStamps();
  const health = useHealth();
  const { status: healthStatus, resync: resyncHealth, syncing: healthSyncing } = health;

  // Keep a live ref to the health context so we can read `lastResult` after
  // resync settles — without it the closure would see the stale value from
  // when the callback was last memoised.
  const healthRef = useRef(health);
  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  return useCallback(async () => {
    let healthError: string | null = null;
    let healthSkippedReason: string | null = null;

    if (healthStatus === 'unavailable') {
      // Not iOS, or HK not present — quietly skip. Not an error.
    } else if (healthSyncing) {
      // Another sync already running — its result lands via its own caller's
      // alert. Don't double-pop.
    } else if (healthStatus === 'denied') {
      healthSkippedReason =
        'Apple Health permission is denied. Open Settings → Privacy → Health → Runstamp and turn the read toggles on.';
    } else {
      // 'granted' OR 'unknown' (cold launch before status restore landed).
      // We try the resync either way; if HK really rejects us, the error
      // tells the truth instead of a silent skip.
      try {
        // Anchor the sync window to the latest imported activity (with a
        // 24h overlap for backdated Apple Watch arrivals) — the same window
        // the missing-runs banner counts against, so a tap-import always
        // reaches everything the banner shows. Without an anchor, resync
        // falls back to its own bounded default.
        await resyncHealth(latestImportedSince(activities));
      } catch (e) {
        healthError = e instanceof Error ? e.message : String(e);
      }
    }

    // List refresh runs regardless — user pulled, user gets fresh data.
    const tasks: Promise<unknown>[] = [refreshActivities()];
    if (withStamps) tasks.push(refreshStamps());
    const listResults = await Promise.allSettled(tasks);
    const listError = listResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
      .join('\n');

    const messages: string[] = [];
    if (healthSkippedReason) messages.push(healthSkippedReason);
    if (healthError) messages.push(`Apple Health sync failed: ${healthError}`);
    if (listError) messages.push(`Couldn't refresh activities: ${listError}`);

    // "0 found" is a quieter signal — the user pulled expecting their latest
    // run and HealthKit gave us nothing. Tell them so they don't think the
    // app is broken when it's actually a HK permission glitch or a delayed
    // Apple Watch sync. Read from the ref so we see the value runSync wrote
    // *during* this call, not the stale memoised closure value.
    const summary = healthRef.current.lastResult;
    if (
      !healthError &&
      !healthSkippedReason &&
      healthStatus !== 'unavailable' &&
      summary != null &&
      summary.workoutsFound === 0
    ) {
      messages.push(
        "Apple Health returned 0 workouts. Open the Apple Health app to confirm today's run is in there, then pull to refresh again.",
      );
    }

    if (messages.length > 0) {
      Alert.alert('Sync issue', messages.join('\n\n'));
    }
  }, [healthStatus, healthSyncing, resyncHealth, refreshActivities, refreshStamps, withStamps, activities]);
}

// Latest imported activity date minus 24h, or undefined when nothing is
// imported yet (resync then uses its own fallback window).
function latestImportedSince(activities: { date: string }[]): Date | undefined {
  let latest = 0;
  for (const a of activities) {
    const t = new Date(a.date).getTime();
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  if (latest === 0) return undefined;
  return new Date(latest - 24 * 60 * 60 * 1000);
}
