/**
 * Orchestrates the Apple Health → Runstamp backend sync flow.
 *
 * `syncRecentWorkouts` pulls workouts from HealthKit, attaches GPS routes
 * where available, then POSTs them to POST /v1/health/workouts in a single
 * request.  Individual upload failures are counted as skipped, not thrown.
 */

import { apiPost } from './api';
import {
  getRunningWorkoutsSince,
  getWorkoutRoute,
  type RoutePoint,
} from './healthkit';

interface WorkoutPayload {
  uuid: string;
  startedAt: string;
  elapsedSeconds: number;
  movingSeconds?: number;
  distanceMeters: number;
  activeEnergyKcal?: number;
  elevationGainMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  startLatitude?: number;
  startLongitude?: number;
  route?: RoutePoint[];
}

interface SyncRequest {
  workouts: WorkoutPayload[];
}

interface SyncResponse {
  uploaded: number;
  duplicates: number;
  skipped: number;
}

export interface SyncResult {
  uploaded: number;
  skipped: number;
}

/**
 * Pulls running workouts from HealthKit since `sinceISO`, attaches routes,
 * and uploads them to the backend.
 *
 * - Workouts with zero distance are discarded before sending (backend skips
 *   them too, but we save the bandwidth).
 * - Individual route fetch failures are silently ignored — the workout still
 *   uploads, just without GPS.
 * - A batch-level upload failure surfaces as `skipped` count equal to the
 *   full batch; the function never throws.
 */
export async function syncRecentWorkouts(
  idToken: string | null,
  sinceISO: string,
): Promise<SyncResult> {
  const since = new Date(sinceISO);
  const workouts = await getRunningWorkoutsSince(since);

  const validWorkouts = workouts.filter((w) => w.distanceMeters > 0);

  const payloads: WorkoutPayload[] = await Promise.all(
    validWorkouts.map(async (w) => {
      const route = await getWorkoutRoute(w.uuid).catch(() => null);

      const elapsedSeconds = Math.round(w.duration);

      const payload: WorkoutPayload = {
        uuid: w.uuid,
        startedAt: w.startDate.toISOString(),
        elapsedSeconds,
        distanceMeters: w.distanceMeters,
      };

      if (w.activeEnergyBurnedKcal != null) {
        payload.activeEnergyKcal = Math.round(w.activeEnergyBurnedKcal);
      }
      if (w.elevationGainMeters != null) {
        payload.elevationGainMeters = w.elevationGainMeters;
      }
      if (w.averageHeartRate != null) {
        payload.avgHeartRate = Math.round(w.averageHeartRate);
      }
      if (w.maxHeartRate != null) {
        payload.maxHeartRate = Math.round(w.maxHeartRate);
      }
      if (route && route.length > 0) {
        payload.startLatitude = route[0].lat;
        payload.startLongitude = route[0].lon;
        payload.route = route;
      }

      return payload;
    }),
  );

  if (payloads.length === 0) {
    return { uploaded: 0, skipped: 0 };
  }

  try {
    const body: SyncRequest = { workouts: payloads };
    const result = await apiPost<SyncResponse>(
      '/v1/health/workouts',
      body,
      { idToken },
    );
    return {
      uploaded: result.uploaded,
      skipped: result.skipped,
    };
  } catch {
    return { uploaded: 0, skipped: payloads.length };
  }
}
