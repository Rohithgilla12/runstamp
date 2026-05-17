import { useCallback } from 'react';
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
 */
export function useFullRefresh({ withStamps = false }: UseFullRefreshOptions = {}) {
  const { refresh: refreshActivities } = useActivities();
  const { refresh: refreshStamps } = useStamps();
  const { status: healthStatus, resync: resyncHealth, syncing: healthSyncing } = useHealth();

  return useCallback(async () => {
    // Health resync first — uploads any new HealthKit workouts so the
    // subsequent list fetch sees them. Skip when permission isn't granted,
    // when iOS isn't the platform (status will be 'unavailable'), or when
    // a sync is already running (the in-flight one will finish the job).
    if (healthStatus === 'granted' && !healthSyncing) {
      try {
        await resyncHealth();
      } catch {
        // Silent: a failed resync shouldn't block the list refresh below.
        // The next pull / next foreground bounce will retry.
      }
    }
    const tasks: Promise<unknown>[] = [refreshActivities()];
    if (withStamps) tasks.push(refreshStamps());
    await Promise.all(tasks);
  }, [healthStatus, healthSyncing, resyncHealth, refreshActivities, refreshStamps, withStamps]);
}
