import { apiGet } from './api';

export type ActivitySource = 'strava' | 'apple_health' | 'manual';

export interface ApiActivity {
  id: string;
  source: ActivitySource;
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
  startLat?: number;
  startLon?: number;
}

export interface ListActivitiesResponse {
  activities: ApiActivity[];
  total: number;
}

export function listActivities(
  idToken: string | null,
  limit = 50,
): Promise<ListActivitiesResponse> {
  return apiGet<ListActivitiesResponse>(`/v1/activities?limit=${limit}`, { idToken });
}
