/**
 * Thin wrapper around @kingstinct/react-native-healthkit v14.
 *
 * Runstamp is reader-only — toShare is always an empty array.
 * On Android every exported function returns a safe default so callers
 * never need to platform-gate themselves.
 *
 * Exports:
 *   requestRunstampHealthPermissions — ask for the full running read scopes
 *   getRunningWorkoutsSince          — lightweight list, newest-first
 *   getRunningWorkoutDetail          — rich detail object with streams + splits
 *   isHealthKitAvailable             — availability check (iOS-only gate)
 */

import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
  WorkoutEventType,
} from '@kingstinct/react-native-healthkit';

export interface HKRunWorkout {
  uuid: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  distanceMeters: number;
  activeEnergyBurnedKcal: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainMeters: number | null;
}

export interface NumericStream {
  tStart: number;
  dtSec: number;
  values: number[];
}

export interface HKWorkoutDetail {
  uuid: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  movingSeconds: number | null;
  distanceMeters: number;
  activeEnergyKcal: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgRunningPower: number | null;
  avgVerticalOscillation: number | null;
  avgGroundContactTime: number | null;
  avgStrideLength: number | null;
  avgRunningSpeed: number | null;
  avgCadence: number | null;
  elevationGainMeters: number | null;
  vo2maxMlKgMin: number | null;
  streams: {
    heartrate?: NumericStream;
    speed?: NumericStream;
    cadence?: NumericStream;
    power?: NumericStream;
    verticalOscillation?: NumericStream;
    groundContactTime?: NumericStream;
    strideLength?: NumericStream;
    altitude?: NumericStream;
    latlng?: Array<[number, number]>;
  };
  splits: Array<{
    index: number;
    distanceM: number;
    durationSec: number;
    avgHr?: number;
  }>;
}

const READ_TYPES = [
  'HKWorkoutTypeIdentifier',
  'HKWorkoutRouteTypeIdentifier',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBasalEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierRunningSpeed',
  'HKQuantityTypeIdentifierRunningPower',
  'HKQuantityTypeIdentifierRunningStrideLength',
  'HKQuantityTypeIdentifierRunningVerticalOscillation',
  'HKQuantityTypeIdentifierRunningGroundContactTime',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierBodyMass',
] as const;

const MAX_STREAM_POINTS = 500;

/**
 * Requests read-only HealthKit authorisation for all Runstamp running types.
 * Returns true when the user granted access; false on denial or non-iOS.
 * HealthKit never throws on denial — it returns false. We honour that contract.
 */
export async function requestRunstampHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await requestAuthorization({ toRead: READ_TYPES, toShare: [] });
  } catch {
    return false;
  }
}

/**
 * Returns running workouts recorded after `since`, newest first.
 * This is the lightweight list used for the sync dedup check — it does NOT
 * fetch per-second streams. Call getRunningWorkoutDetail for rich data.
 */
export async function getRunningWorkoutsSince(
  since: Date,
  // -1 = unbounded, matching the other quantity-sample queries below. We need
  // this for first-connect (which uses `since = new Date(0)` to pull every
  // run a user has ever logged — Apple Watch lifetime can be 10k+ workouts).
  limit = -1,
): Promise<HKRunWorkout[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const samples = await queryWorkoutSamples({
      filter: {
        workoutActivityType: WorkoutActivityType.running,
        date: { startDate: since },
      },
      limit,
      ascending: false,
    });

    return samples.map((w) => ({
      uuid: w.uuid,
      startDate: w.startDate,
      endDate: w.endDate,
      duration: w.duration.quantity,
      distanceMeters: w.totalDistance?.quantity ?? 0,
      activeEnergyBurnedKcal: w.totalEnergyBurned?.quantity ?? null,
      averageHeartRate: null,
      maxHeartRate: null,
      elevationGainMeters: null,
    } satisfies HKRunWorkout));
  } catch {
    return [];
  }
}

/**
 * Reports whether HealthKit data is available on this device.
 * Always returns false on Android.
 */
export function isHealthKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  return isHealthDataAvailable();
}

/**
 * Fetches full running detail for a single workout UUID, including
 * downsampled per-second streams, split data, and all running-specific
 * aggregates (power, cadence, vertical oscillation, etc.).
 *
 * Returns null on Android, on lookup failure, or when the workout is not
 * found. All stream fields are optional — a treadmill run without GPS will
 * simply have no latlng/altitude stream, etc.
 */
export async function getRunningWorkoutDetail(
  uuid: string,
): Promise<HKWorkoutDetail | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    const proxies = await queryWorkoutSamples({
      filter: { uuid },
      limit: 1,
    });
    if (proxies.length === 0) return null;
    const workout = proxies[0];

    const startDate = workout.startDate;
    const endDate = workout.endDate;
    const dateWindow = { startDate, endDate };
    const workoutDurationSeconds = workout.duration.quantity;

    const [
      hrSamples,
      speedSamples,
      powerSamples,
      vertOscSamples,
      groundContactSamples,
      strideSamples,
      stepSamples,
    ] = await Promise.all([
      fetchQuantitySamples(
        'HKQuantityTypeIdentifierHeartRate',
        'count/min',
        dateWindow,
      ),
      fetchQuantitySamples(
        'HKQuantityTypeIdentifierRunningSpeed',
        'm/s',
        dateWindow,
      ),
      fetchQuantitySamples(
        'HKQuantityTypeIdentifierRunningPower',
        'W',
        dateWindow,
      ),
      fetchQuantitySamples(
        'HKQuantityTypeIdentifierRunningVerticalOscillation',
        'cm',
        dateWindow,
      ),
      fetchQuantitySamples(
        'HKQuantityTypeIdentifierRunningGroundContactTime',
        'ms',
        dateWindow,
      ),
      fetchQuantitySamples(
        'HKQuantityTypeIdentifierRunningStrideLength',
        'm',
        dateWindow,
      ),
      fetchQuantitySamples(
        'HKQuantityTypeIdentifierStepCount',
        'count',
        dateWindow,
      ),
    ]);

    const vo2maxSamples = await fetchVO2Max(startDate, endDate);

    let routeLocations: ReadonlyArray<{
      latitude: number;
      longitude: number;
      altitude: number;
      date: Date;
    }> = [];
    try {
      const routes = await workout.getWorkoutRoutes();
      for (const route of routes) {
        routeLocations = [...routeLocations, ...route.locations];
      }
      routeLocations = [...routeLocations].sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      );
    } catch {
      routeLocations = [];
    }

    const movingSeconds = computeMovingSeconds(
      workout.events ?? [],
      workoutDurationSeconds,
    );

    const avgHeartRate = average(hrSamples.map((s) => s.quantity));
    const maxHeartRate =
      hrSamples.length > 0
        ? Math.max(...hrSamples.map((s) => s.quantity))
        : null;
    const avgRunningPower = average(powerSamples.map((s) => s.quantity));
    const avgVerticalOscillation = average(
      vertOscSamples.map((s) => s.quantity),
    );
    const avgGroundContactTime = average(
      groundContactSamples.map((s) => s.quantity),
    );
    const avgStrideLength = average(strideSamples.map((s) => s.quantity));
    const avgRunningSpeed = average(speedSamples.map((s) => s.quantity));

    const avgCadence = deriveCadence(
      speedSamples,
      strideSamples,
      stepSamples,
      startDate,
      endDate,
    );

    const elevationGainMeters =
      routeLocations.length > 0
        ? computeElevationGain(routeLocations.map((l) => l.altitude))
        : null;

    const vo2maxMlKgMin =
      vo2maxSamples.length > 0
        ? vo2maxSamples[vo2maxSamples.length - 1].quantity
        : null;

    const streams = buildStreams(
      hrSamples,
      speedSamples,
      powerSamples,
      vertOscSamples,
      groundContactSamples,
      strideSamples,
      avgCadence,
      speedSamples,
      strideSamples,
      stepSamples,
      startDate,
      endDate,
      routeLocations,
    );

    const splits = await buildSplits(
      workout.events ?? [],
      startDate,
      endDate,
      routeLocations,
    );

    return {
      uuid: workout.uuid,
      startDate,
      endDate,
      duration: workoutDurationSeconds,
      movingSeconds,
      distanceMeters: workout.totalDistance?.quantity ?? 0,
      activeEnergyKcal: workout.totalEnergyBurned?.quantity ?? null,
      avgHeartRate: avgHeartRate != null ? Math.round(avgHeartRate) : null,
      maxHeartRate: maxHeartRate != null ? Math.round(maxHeartRate) : null,
      avgRunningPower,
      avgVerticalOscillation,
      avgGroundContactTime,
      avgStrideLength,
      avgRunningSpeed,
      avgCadence,
      elevationGainMeters,
      vo2maxMlKgMin,
      streams,
      splits,
    };
  } catch {
    return null;
  }
}

type QuantitySample = { startDate: Date; endDate: Date; quantity: number };

async function fetchQuantitySamples(
  identifier: string,
  unit: string,
  dateWindow: { startDate: Date; endDate: Date },
): Promise<QuantitySample[]> {
  try {
    const results = await queryQuantitySamples(
      identifier as Parameters<typeof queryQuantitySamples>[0],
      {
        limit: -1,
        ascending: true,
        filter: { date: dateWindow },
        unit,
      },
    );
    return (results as unknown) as QuantitySample[];
  } catch {
    return [];
  }
}

async function fetchVO2Max(
  workoutStart: Date,
  workoutEnd: Date,
): Promise<QuantitySample[]> {
  const windowStart = new Date(workoutStart.getTime() - 24 * 60 * 60 * 1000);
  try {
    const results = await queryQuantitySamples(
      'HKQuantityTypeIdentifierVO2Max',
      {
        limit: -1,
        ascending: true,
        filter: { date: { startDate: windowStart, endDate: workoutEnd } },
        unit: 'ml/(kg*min)',
      },
    );
    return (results as unknown) as QuantitySample[];
  } catch {
    return [];
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeMovingSeconds(
  events: ReadonlyArray<{ type: WorkoutEventType; startDate: Date; endDate: Date }>,
  totalDurationSeconds: number,
): number | null {
  const pauseResumePairs = events.filter(
    (e) => e.type === WorkoutEventType.pause || e.type === WorkoutEventType.resume,
  );
  if (pauseResumePairs.length === 0) return totalDurationSeconds;

  let pausedMs = 0;
  let pauseStart: number | null = null;

  for (const event of pauseResumePairs) {
    if (event.type === WorkoutEventType.pause) {
      pauseStart = event.startDate.getTime();
    } else if (event.type === WorkoutEventType.resume && pauseStart != null) {
      pausedMs += event.startDate.getTime() - pauseStart;
      pauseStart = null;
    }
  }

  const movingMs = totalDurationSeconds * 1000 - pausedMs;
  return Math.max(0, Math.round(movingMs / 1000));
}

function computeElevationGain(altitudes: number[]): number {
  let gain = 0;
  for (let i = 1; i < altitudes.length; i++) {
    const delta = altitudes[i] - altitudes[i - 1];
    if (delta > 0) gain += delta;
  }
  return gain;
}

/**
 * Derives cadence (steps per minute) from HealthKit samples.
 *
 * Strategy A (preferred): cadence = (speed / strideLength) * 60.
 *   Uses per-sample values aligned by time — gives a clean continuous signal.
 * Strategy B (fallback): bucket step count samples into 30-second windows
 *   and multiply by 2 to get spm.
 */
function deriveCadence(
  speedSamples: QuantitySample[],
  strideSamples: QuantitySample[],
  stepSamples: QuantitySample[],
  _workoutStart: Date,
  _workoutEnd: Date,
): number | null {
  if (speedSamples.length > 0 && strideSamples.length > 0) {
    const cadenceValues: number[] = [];
    for (const speedSample of speedSamples) {
      const stride = findClosestSample(strideSamples, speedSample.startDate);
      if (stride != null && stride.quantity > 0) {
        cadenceValues.push((speedSample.quantity / stride.quantity) * 60);
      }
    }
    const avg = average(cadenceValues);
    if (avg != null) return avg;
  }

  if (stepSamples.length > 0) {
    const bucketMs = 30_000;
    const buckets = new Map<number, number>();
    for (const sample of stepSamples) {
      const key =
        Math.floor(sample.startDate.getTime() / bucketMs) * bucketMs;
      buckets.set(key, (buckets.get(key) ?? 0) + sample.quantity);
    }
    const spmValues = Array.from(buckets.values()).map((count) => count * 2);
    return average(spmValues);
  }

  return null;
}

function findClosestSample(
  samples: QuantitySample[],
  target: Date,
): QuantitySample | null {
  if (samples.length === 0) return null;
  let closest = samples[0];
  let minDiff = Math.abs(
    samples[0].startDate.getTime() - target.getTime(),
  );
  for (const sample of samples) {
    const diff = Math.abs(sample.startDate.getTime() - target.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = sample;
    }
  }
  return closest;
}

/**
 * Downsamples an array of samples to ≤ MAX_STREAM_POINTS using bucket
 * averaging. Returns a NumericStream with tStart (epoch ms of first sample)
 * and dtSec (uniform interval after downsampling).
 */
function downsampleToStream(samples: QuantitySample[]): NumericStream | null {
  if (samples.length === 0) return null;

  const bucketSize = Math.ceil(samples.length / MAX_STREAM_POINTS);
  const values: number[] = [];

  for (let i = 0; i < samples.length; i += bucketSize) {
    const bucket = samples.slice(i, i + bucketSize);
    const avg = bucket.reduce((sum, s) => sum + s.quantity, 0) / bucket.length;
    values.push(avg);
  }

  const tStart = samples[0].startDate.getTime();
  const tEnd = samples[samples.length - 1].startDate.getTime();
  const dtSec =
    values.length > 1
      ? (tEnd - tStart) / 1000 / (values.length - 1)
      : 0;

  return { tStart, dtSec, values };
}

/**
 * Builds cadence stream from raw samples using the same derivation as
 * deriveCadence but preserving per-sample time information for stream output.
 */
function buildCadenceStream(
  speedSamples: QuantitySample[],
  strideSamples: QuantitySample[],
  stepSamples: QuantitySample[],
  _workoutStart: Date,
  _workoutEnd: Date,
): NumericStream | null {
  if (speedSamples.length > 0 && strideSamples.length > 0) {
    const cadenceSamples: QuantitySample[] = [];
    for (const speedSample of speedSamples) {
      const stride = findClosestSample(strideSamples, speedSample.startDate);
      if (stride != null && stride.quantity > 0) {
        cadenceSamples.push({
          startDate: speedSample.startDate,
          endDate: speedSample.endDate,
          quantity: (speedSample.quantity / stride.quantity) * 60,
        });
      }
    }
    if (cadenceSamples.length > 0) {
      return downsampleToStream(cadenceSamples);
    }
  }

  if (stepSamples.length > 0) {
    const bucketMs = 30_000;
    const buckets = new Map<number, { sum: number; key: number }>();
    for (const sample of stepSamples) {
      const key =
        Math.floor(sample.startDate.getTime() / bucketMs) * bucketMs;
      const existing = buckets.get(key);
      if (existing != null) {
        existing.sum += sample.quantity;
      } else {
        buckets.set(key, { sum: sample.quantity, key });
      }
    }
    const sorted = Array.from(buckets.values()).sort((a, b) => a.key - b.key);
    const cadenceSamples: QuantitySample[] = sorted.map((b) => ({
      startDate: new Date(b.key),
      endDate: new Date(b.key + bucketMs),
      quantity: b.sum * 2,
    }));
    return downsampleToStream(cadenceSamples);
  }

  return null;
}

function buildStreams(
  hrSamples: QuantitySample[],
  speedSamples: QuantitySample[],
  powerSamples: QuantitySample[],
  vertOscSamples: QuantitySample[],
  groundContactSamples: QuantitySample[],
  strideSamples: QuantitySample[],
  _avgCadence: number | null,
  _speedForCadence: QuantitySample[],
  _strideForCadence: QuantitySample[],
  stepSamples: QuantitySample[],
  workoutStart: Date,
  workoutEnd: Date,
  routeLocations: ReadonlyArray<{
    latitude: number;
    longitude: number;
    altitude: number;
    date: Date;
  }>,
): HKWorkoutDetail['streams'] {
  const streams: HKWorkoutDetail['streams'] = {};

  const hrStream = downsampleToStream(hrSamples);
  if (hrStream) streams.heartrate = hrStream;

  const speedStream = downsampleToStream(speedSamples);
  if (speedStream) streams.speed = speedStream;

  const powerStream = downsampleToStream(powerSamples);
  if (powerStream) streams.power = powerStream;

  const vertOscStream = downsampleToStream(vertOscSamples);
  if (vertOscStream) streams.verticalOscillation = vertOscStream;

  const groundContactStream = downsampleToStream(groundContactSamples);
  if (groundContactStream) streams.groundContactTime = groundContactStream;

  const strideStream = downsampleToStream(strideSamples);
  if (strideStream) streams.strideLength = strideStream;

  const cadenceStream = buildCadenceStream(
    speedSamples,
    strideSamples,
    stepSamples,
    workoutStart,
    workoutEnd,
  );
  if (cadenceStream) streams.cadence = cadenceStream;

  if (routeLocations.length > 0) {
    const altSamples: QuantitySample[] = routeLocations.map((loc) => ({
      startDate: loc.date,
      endDate: loc.date,
      quantity: loc.altitude,
    }));
    const altStream = downsampleToStream(altSamples);
    if (altStream) streams.altitude = altStream;

    const step = Math.ceil(routeLocations.length / MAX_STREAM_POINTS);
    const latlng: Array<[number, number]> = [];
    for (let i = 0; i < routeLocations.length; i += step) {
      const loc = routeLocations[i];
      latlng.push([loc.latitude, loc.longitude]);
    }
    if (latlng.length > 0) streams.latlng = latlng;
  }

  return streams;
}

type WorkoutEvent = {
  type: WorkoutEventType;
  startDate: Date;
  endDate: Date;
};

async function buildSplits(
  events: ReadonlyArray<WorkoutEvent>,
  workoutStart: Date,
  workoutEnd: Date,
  routeLocations: ReadonlyArray<{
    latitude: number;
    longitude: number;
    altitude: number;
    date: Date;
  }>,
): Promise<HKWorkoutDetail['splits']> {
  const lapEvents = events.filter((e) => e.type === WorkoutEventType.lap);

  if (lapEvents.length > 0) {
    return buildLapEventSplits(lapEvents, workoutStart, workoutEnd);
  }

  if (routeLocations.length > 0) {
    return buildRouteDerivedSplits(routeLocations, workoutStart, workoutEnd);
  }

  return [];
}

async function buildLapEventSplits(
  lapEvents: ReadonlyArray<WorkoutEvent>,
  workoutStart: Date,
  workoutEnd: Date,
): Promise<HKWorkoutDetail['splits']> {
  const splits: HKWorkoutDetail['splits'] = [];

  for (let i = 0; i < lapEvents.length; i++) {
    const lap = lapEvents[i];
    const lapStart = i === 0 ? workoutStart : lapEvents[i - 1].endDate;
    const lapEnd = lap.endDate;
    const durationSec = Math.max(
      0,
      Math.round((lapEnd.getTime() - lapStart.getTime()) / 1000),
    );

    let distanceM = 0;
    let avgHr: number | undefined;

    try {
      const distResult = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        ['cumulativeSum'],
        { filter: { date: { startDate: lapStart, endDate: lapEnd } }, unit: 'm' },
      );
      const sum = (distResult as { sumQuantity?: { quantity: number } })
        ?.sumQuantity?.quantity;
      if (sum != null) distanceM = sum;
    } catch {
      distanceM = 0;
    }

    try {
      const hrSamples = await fetchQuantitySamples(
        'HKQuantityTypeIdentifierHeartRate',
        'count/min',
        { startDate: lapStart, endDate: lapEnd },
      );
      const avg = average(hrSamples.map((s) => s.quantity));
      if (avg != null) avgHr = Math.round(avg);
    } catch {
      avgHr = undefined;
    }

    const split: HKWorkoutDetail['splits'][number] = {
      index: i + 1,
      distanceM,
      durationSec,
    };
    if (avgHr != null) split.avgHr = avgHr;
    splits.push(split);
  }

  return splits;
}

function buildRouteDerivedSplits(
  routeLocations: ReadonlyArray<{
    latitude: number;
    longitude: number;
    altitude: number;
    date: Date;
  }>,
  workoutStart: Date,
  _workoutEnd: Date,
): HKWorkoutDetail['splits'] {
  const KM = 1000;
  const splits: HKWorkoutDetail['splits'] = [];
  let splitIndex = 1;
  let cumulative = 0;
  let splitStartDate = workoutStart;
  let splitStartCumulative = 0;

  for (let i = 1; i < routeLocations.length; i++) {
    const prev = routeLocations[i - 1];
    const curr = routeLocations[i];
    const segmentM = haversineMeters(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );
    cumulative += segmentM;

    const crossedKm = Math.floor(cumulative / KM);
    const prevKm = Math.floor((cumulative - segmentM) / KM);

    if (crossedKm > prevKm) {
      const splitEndDate = curr.date;
      const durationSec = Math.max(
        0,
        Math.round(
          (splitEndDate.getTime() - splitStartDate.getTime()) / 1000,
        ),
      );
      const distanceM = cumulative - splitStartCumulative;

      splits.push({
        index: splitIndex,
        distanceM,
        durationSec,
      });
      splitIndex++;
      splitStartDate = curr.date;
      splitStartCumulative = cumulative;
    }
  }

  return splits;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
