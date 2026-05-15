/**
 * Thin wrapper around @kingstinct/react-native-healthkit.
 *
 * Runstamp is reader-only (PRD §4) — toWrite is always an empty array.
 * On Android every exported function returns a safe default (false / null / [])
 * so callers never have to platform-gate themselves.
 *
 * Exports:
 *   requestRunstampHealthPermissions — ask for the read scopes we need
 *   getRunningWorkoutsSince          — running workouts after a date
 *   getWorkoutRoute                  — GPS samples for one workout
 *   isHealthKitAvailable             — availability check (iOS-only gate)
 */

import { Platform } from 'react-native';

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

export interface RoutePoint {
  lat: number;
  lon: number;
  t: number;
  alt?: number;
}

const READ_TYPES = [
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKWorkoutRouteTypeIdentifier',
  'HKQuantityTypeIdentifierStepCount',
] as const;

/**
 * Requests read-only HealthKit authorisation for the Runstamp data types.
 * Returns true when the user granted access, false when they denied or when
 * HealthKit is not available (e.g. iPad, Android).
 *
 * HealthKit never throws on denial — it returns false. We honour that contract
 * here and never throw either.
 */
export async function requestRunstampHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const HK = await import('@kingstinct/react-native-healthkit');
    const granted = await HK.default.requestAuthorization({
      toRead: READ_TYPES,
      toShare: [],
    });
    return granted;
  } catch {
    return false;
  }
}

/**
 * Returns running workouts recorded after `since`, newest first.
 * `limit` defaults to 200 which is generous for a 90-day window.
 * Filters to `WorkoutActivityType.running` (enum value 37).
 */
export async function getRunningWorkoutsSince(
  since: Date,
  limit = 200,
): Promise<HKRunWorkout[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const HK = await import('@kingstinct/react-native-healthkit');
    const { WorkoutActivityType } = await import(
      '@kingstinct/react-native-healthkit'
    );

    const samples = await HK.default.queryWorkoutSamples({
      filter: {
        workoutActivityType: WorkoutActivityType.running,
        date: { startDate: since },
      },
      limit,
      ascending: false,
    });

    return samples.map((w) => {
      const distanceQuantity = w.totalDistance;
      const distanceMeters =
        distanceQuantity != null ? distanceQuantity.quantity : 0;

      const energyQuantity = w.totalEnergyBurned;
      const activeEnergyBurnedKcal =
        energyQuantity != null ? energyQuantity.quantity : null;

      return {
        uuid: w.uuid,
        startDate: w.startDate,
        endDate: w.endDate,
        duration: w.duration.quantity,
        distanceMeters,
        activeEnergyBurnedKcal,
        averageHeartRate: null,
        maxHeartRate: null,
        elevationGainMeters: null,
      } satisfies HKRunWorkout;
    });
  } catch {
    return [];
  }
}

/**
 * Fetches the GPS route for a single workout.
 * Returns null when no route is attached (treadmill, no GPS, etc).
 * Route points carry epoch-ms timestamps (`t`) for stream alignment.
 */
export async function getWorkoutRoute(
  workoutUuid: string,
): Promise<RoutePoint[] | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    const HK = await import('@kingstinct/react-native-healthkit');

    const samples = await HK.default.queryWorkoutSamples({
      filter: { uuid: workoutUuid },
      limit: 1,
    });

    if (samples.length === 0) return null;

    const workout = samples[0];
    const routes = await workout.getWorkoutRoutes();
    if (routes.length === 0) return null;

    const route = routes[0];
    if (!route.locations || route.locations.length === 0) return null;

    return route.locations.map((loc) => ({
      lat: loc.latitude,
      lon: loc.longitude,
      t: loc.date.getTime(),
      alt: loc.altitude,
    }));
  } catch {
    return null;
  }
}

/**
 * Reports whether HealthKit data is available on this device.
 * Always returns false on Android.
 */
export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const HK = await import('@kingstinct/react-native-healthkit');
    return HK.default.isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}
