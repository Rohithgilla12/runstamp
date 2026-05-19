import type { Split } from '../data/sample';
import { apiGet, apiPost } from './api';

export type ActivitySource = 'strava' | 'apple_health' | 'manual';

export interface ApiActivity {
  id: string;
  source: ActivitySource;
  /** Source-native id — Strava activity id, or the HealthKit workout UUID. */
  externalId: string;
  sport: string;
  startedAt: string;
  title: string;
  city?: string;
  country?: string;
  distanceM: number;
  elapsedSec: number;
  movingSec?: number;
  elevationM?: number;
  avgHr?: number;
  maxHr?: number;
  avgPaceSPerKm?: number;
  calories?: number;
  cadenceSpm?: number;
  runningPowerW?: number;
  vo2maxMlKgMin?: number;
  gapSecPerKm?: number;
  startLat?: number;
  startLon?: number;
}

export interface ListActivitiesResponse {
  activities: ApiActivity[];
  total: number;
}

// Pull the full history by default — analytics, places, best-efforts all
// compute client-side off the same in-memory list, so capping it here means
// "the user thinks Runstamp only knows 50 of their 5,000 runs."
export function listActivities(
  idToken: string | null,
  limit = 10000,
): Promise<ListActivitiesResponse> {
  return apiGet<ListActivitiesResponse>(`/v1/activities?limit=${limit}`, { idToken });
}

// One activity's full detail — fields the list endpoint deliberately omits
// (splits + notes). Fetched on demand when the user opens an Activity or
// the Editor, so the list payload stays small. Embeds the same fields as
// ApiActivity since the server flattens the response.
export interface ApiActivityDetail extends ApiActivity {
  splits?: Split[];
  notes?: string;
  relatedDupes?: ApiDupeRef[];
}

// Sibling row marked as a dupe of this canonical activity. PRD §6.8 manual
// canonical override — mobile uses this to offer "Switch source."
export interface ApiDupeRef {
  id: string;
  source: string;
  startedAt: string;
  distanceMeters: number;
  elapsedSeconds: number;
}

export function getActivityDetail(
  id: string,
  idToken: string | null,
): Promise<ApiActivityDetail> {
  return apiGet<ApiActivityDetail>(`/v1/activities/${encodeURIComponent(id)}`, { idToken });
}

// Promote a duplicate row to canonical. Returns the freshly canonicalized
// detail so callers don't need a second fetch.
export function canonicalizeActivity(
  id: string,
  idToken: string | null,
): Promise<ApiActivityDetail> {
  return apiPost<ApiActivityDetail>(`/v1/activities/${encodeURIComponent(id)}/canonicalize`, undefined, { idToken });
}
