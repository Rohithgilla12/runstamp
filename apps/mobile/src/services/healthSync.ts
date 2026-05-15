/**
 * Orchestrates the Apple Health → Runstamp backend sync flow.
 *
 * `syncRecentWorkouts` pulls the lightweight workout list from HealthKit,
 * then fetches full rich detail (streams, splits, running-specific aggregates)
 * for each and POSTs them to POST /v1/health/workouts in a single batch.
 * Individual detail-fetch failures are silently degraded — the workout still
 * uploads with whatever data was successfully gathered.
 */

import { apiPost } from './api';
import {
  getRunningWorkoutsSince,
  getRunningWorkoutDetail,
  type HKWorkoutDetail,
} from './healthkit';

interface NumericStreamPayload {
  tStart: number;
  dtSec: number;
  values: number[];
}

interface WorkoutStreamsPayload {
  heartrate?: NumericStreamPayload;
  speed?: NumericStreamPayload;
  cadence?: NumericStreamPayload;
  power?: NumericStreamPayload;
  verticalOscillation?: NumericStreamPayload;
  groundContactTime?: NumericStreamPayload;
  strideLength?: NumericStreamPayload;
  altitude?: NumericStreamPayload;
  latlng?: Array<[number, number]>;
}

interface SplitPayload {
  index: number;
  distanceM: number;
  durationSec: number;
  avgHr?: number;
}

interface WorkoutPayload {
  uuid: string;
  startedAt: string;
  elapsedSeconds: number;
  movingSeconds?: number;
  distanceMeters: number;
  elevationGainMeters?: number;
  activeEnergyKcal?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgRunningPower?: number;
  avgVerticalOscillation?: number;
  avgGroundContactTime?: number;
  avgStrideLength?: number;
  avgRunningSpeed?: number;
  avgCadence?: number;
  vo2maxMlKgMin?: number;
  startLatitude?: number;
  startLongitude?: number;
  streams?: WorkoutStreamsPayload;
  splits?: SplitPayload[];
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
 * Pulls running workouts from HealthKit since `sinceISO`, fetches full detail
 * for each (streams, splits, running power, etc.), and uploads them to the
 * backend.
 *
 * - Workouts with zero distance are discarded before sending.
 * - If detail fetch fails we fall back gracefully — the workout still uploads
 *   with summary-only data.
 * - A batch-level upload failure surfaces as `skipped` equal to the full batch.
 */
export async function syncRecentWorkouts(
  idToken: string | null,
  sinceISO: string,
): Promise<SyncResult> {
  const since = new Date(sinceISO);
  const workouts = await getRunningWorkoutsSince(since);

  const validWorkouts = workouts.filter((w) => w.distanceMeters > 0);

  const payloads: WorkoutPayload[] = await Promise.all(
    validWorkouts.map(async (w): Promise<WorkoutPayload> => {
      const detail = await getRunningWorkoutDetail(w.uuid).catch(() => null);

      const payload: WorkoutPayload = {
        uuid: w.uuid,
        startedAt: w.startDate.toISOString(),
        elapsedSeconds: Math.round(detail?.duration ?? w.duration),
        distanceMeters: detail?.distanceMeters ?? w.distanceMeters,
      };

      if (detail != null) {
        if (detail.movingSeconds != null) {
          payload.movingSeconds = detail.movingSeconds;
        }
        if (detail.elevationGainMeters != null) {
          payload.elevationGainMeters = detail.elevationGainMeters;
        }
        if (detail.activeEnergyKcal != null) {
          payload.activeEnergyKcal = Math.round(detail.activeEnergyKcal);
        }
        if (detail.avgHeartRate != null) {
          payload.avgHeartRate = Math.round(detail.avgHeartRate);
        }
        if (detail.maxHeartRate != null) {
          payload.maxHeartRate = Math.round(detail.maxHeartRate);
        }
        if (detail.avgRunningPower != null) {
          payload.avgRunningPower = detail.avgRunningPower;
        }
        if (detail.avgVerticalOscillation != null) {
          payload.avgVerticalOscillation = detail.avgVerticalOscillation;
        }
        if (detail.avgGroundContactTime != null) {
          payload.avgGroundContactTime = detail.avgGroundContactTime;
        }
        if (detail.avgStrideLength != null) {
          payload.avgStrideLength = detail.avgStrideLength;
        }
        if (detail.avgRunningSpeed != null) {
          payload.avgRunningSpeed = detail.avgRunningSpeed;
        }
        if (detail.avgCadence != null) {
          payload.avgCadence = detail.avgCadence;
        }
        if (detail.vo2maxMlKgMin != null) {
          payload.vo2maxMlKgMin = detail.vo2maxMlKgMin;
        }

        const latlng = detail.streams.latlng;
        if (latlng != null && latlng.length > 0) {
          payload.startLatitude = latlng[0][0];
          payload.startLongitude = latlng[0][1];
        }

        const streams = buildStreamsPayload(detail.streams);
        if (streams != null) payload.streams = streams;

        if (detail.splits.length > 0) {
          payload.splits = detail.splits;
        }
      } else {
        if (w.activeEnergyBurnedKcal != null) {
          payload.activeEnergyKcal = Math.round(w.activeEnergyBurnedKcal);
        }
        if (w.averageHeartRate != null) {
          payload.avgHeartRate = Math.round(w.averageHeartRate);
        }
        if (w.maxHeartRate != null) {
          payload.maxHeartRate = Math.round(w.maxHeartRate);
        }
        if (w.elevationGainMeters != null) {
          payload.elevationGainMeters = w.elevationGainMeters;
        }
      }

      return payload;
    }),
  );

  if (payloads.length === 0) {
    return { uploaded: 0, skipped: 0 };
  }

  try {
    const body: SyncRequest = { workouts: payloads };
    const result = await apiPost<SyncResponse>('/v1/health/workouts', body, {
      idToken,
    });
    return {
      uploaded: result.uploaded,
      skipped: result.skipped,
    };
  } catch {
    return { uploaded: 0, skipped: payloads.length };
  }
}

function buildStreamsPayload(
  streams: HKWorkoutDetail['streams'],
): WorkoutStreamsPayload | null {
  const result: WorkoutStreamsPayload = {};
  let hasAny = false;

  if (streams.heartrate) {
    result.heartrate = streams.heartrate;
    hasAny = true;
  }
  if (streams.speed) {
    result.speed = streams.speed;
    hasAny = true;
  }
  if (streams.cadence) {
    result.cadence = streams.cadence;
    hasAny = true;
  }
  if (streams.power) {
    result.power = streams.power;
    hasAny = true;
  }
  if (streams.verticalOscillation) {
    result.verticalOscillation = streams.verticalOscillation;
    hasAny = true;
  }
  if (streams.groundContactTime) {
    result.groundContactTime = streams.groundContactTime;
    hasAny = true;
  }
  if (streams.strideLength) {
    result.strideLength = streams.strideLength;
    hasAny = true;
  }
  if (streams.altitude) {
    result.altitude = streams.altitude;
    hasAny = true;
  }
  if (streams.latlng != null && streams.latlng.length > 0) {
    result.latlng = streams.latlng;
    hasAny = true;
  }

  return hasAny ? result : null;
}
