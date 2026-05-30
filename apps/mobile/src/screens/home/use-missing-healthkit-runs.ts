import { useEffect, useMemo, useState } from 'react';
import type { Activity } from '../../data/models';
import { getRunningWorkoutsSince } from '../../services/healthkit';
import { useHealth } from '../../state/HealthContext';

// Counts HealthKit running workouts that aren't on the server yet — drives
// the "X runs not imported" banner. Cheap by design: only queries HK for
// workouts since the latest already-imported activity (or 30 days back if
// nothing is imported), then filters out anything already in the activities
// list by HK UUID. Skips entirely when Health permission isn't granted.
export function useMissingHealthKitRuns(activities: Activity[]): number {
  const { status } = useHealth();
  const [count, setCount] = useState(0);

  const importedAppleHkIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of activities) {
      if (a.source === 'apple_health' && a.externalId) s.add(a.externalId);
    }
    return s;
  }, [activities]);

  const latestImportedTime = useMemo(() => {
    let t = 0;
    for (const a of activities) {
      const ts = new Date(a.date).getTime();
      if (Number.isFinite(ts) && ts > t) t = ts;
    }
    return t;
  }, [activities]);

  useEffect(() => {
    if (status !== 'granted') {
      setCount(0);
      return;
    }
    // Don't probe HealthKit for a fresh-install user with no activities —
    // they should connect via the proper flow first.
    if (activities.length === 0) {
      setCount(0);
      return;
    }
    let cancelled = false;
    // 24h overlap before the latest imported timestamp so we don't miss
    // out-of-order arrivals (Apple Watch sometimes backdates workouts).
    const since = latestImportedTime > 0
      ? new Date(latestImportedTime - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    (async () => {
      try {
        const runs = await getRunningWorkoutsSince(since);
        if (cancelled) return;
        let missing = 0;
        for (const w of runs) {
          if (w.distanceMeters > 0 && !importedAppleHkIds.has(w.uuid)) missing++;
        }
        setCount(missing);
      } catch {
        // Connectors tile / pull-to-refresh already surface HK errors. We
        // just don't show the banner.
        if (!cancelled) setCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [status, activities.length, latestImportedTime, importedAppleHkIds]);

  return count;
}
