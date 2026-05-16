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
 * Progress phases reported by syncRecentWorkouts via onProgress:
 *   'listing'   — querying HK for the workout list (single fast call).
 *   'fetching'  — reading per-workout detail + streams (the slow part).
 *   'uploading' — POSTing chunked batches to the backend.
 *   'done'      — terminal; emitted once with total = uploaded + skipped.
 *
 * `current` and `total` are units of workouts in the current phase.
 */
export interface SyncProgress {
  phase: 'listing' | 'fetching' | 'uploading' | 'done';
  current: number;
  total: number;
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
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  const emit = (p: SyncProgress) => {
    if (onProgress) onProgress(p);
  };

  emit({ phase: 'listing', current: 0, total: 0 });
  const since = new Date(sinceISO);
  const workouts = await getRunningWorkoutsSince(since);

  const validWorkouts = workouts.filter((w) => w.distanceMeters > 0);
  emit({ phase: 'fetching', current: 0, total: validWorkouts.length });

  // Detail fetch hits HKHealthStore + reads route + HR samples per workout.
  // Doing all 500+ in parallel via Promise.all can OOM the device or hang
  // HealthKit. Process in small concurrent batches so we still get pipelining
  // without melting the radio.
  const DETAIL_BATCH = 8;
  const allPayloads: WorkoutPayload[] = [];
  for (let i = 0; i < validWorkouts.length; i += DETAIL_BATCH) {
    const slice = validWorkouts.slice(i, i + DETAIL_BATCH);
    const batch = await Promise.all(slice.map(async (w): Promise<WorkoutPayload> => {
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
    }));
    allPayloads.push(...batch);
    emit({ phase: 'fetching', current: allPayloads.length, total: validWorkouts.length });
  }

  if (allPayloads.length === 0) {
    emit({ phase: 'done', current: 0, total: 0 });
    return { uploaded: 0, skipped: 0 };
  }

  // Upload in chunks too — a 500-workout payload at ~5KB each is 2.5MB JSON,
  // which is fine but the upload itself can take a while on a slow network.
  // Smaller chunks keep retries cheap.
  const UPLOAD_BATCH = 50;
  let uploaded = 0;
  let skipped = 0;
  emit({ phase: 'uploading', current: 0, total: allPayloads.length });
  for (let i = 0; i < allPayloads.length; i += UPLOAD_BATCH) {
    const chunk = allPayloads.slice(i, i + UPLOAD_BATCH);
    const body: SyncRequest = { workouts: chunk };
    // Throw on failure so the caller can surface it. Earlier we
    // silently swallowed every error, which hid bad tokens and 500s.
    const result = await apiPost<SyncResponse>('/v1/health/workouts', body, { idToken });
    uploaded += result.uploaded;
    skipped += result.skipped;
    emit({ phase: 'uploading', current: Math.min(i + UPLOAD_BATCH, allPayloads.length), total: allPayloads.length });
  }
  emit({ phase: 'done', current: uploaded + skipped, total: uploaded + skipped });
  return { uploaded, skipped };
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
