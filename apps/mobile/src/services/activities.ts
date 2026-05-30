import { apiGet, apiPost } from './api';
import {
  ApiActivityDetailSchema,
  ListActivitiesResponseSchema,
  type ApiActivity,
  type ApiActivityDetail,
  type ApiDupeRef,
  type ListActivitiesResponse,
} from '@runstamp/shared-types';
import { parseOrWarn } from '../lib/validate';

export type { ApiActivity, ApiActivityDetail, ApiDupeRef, ListActivitiesResponse };

// Pull the full history by default — analytics, places, best-efforts all
// compute client-side off the same in-memory list, so capping it here means
// "the user thinks Runstamp only knows 50 of their 5,000 runs."
export async function listActivities(
  idToken: string | null,
  limit = 10000,
): Promise<ListActivitiesResponse> {
  const raw = await apiGet<unknown>(`/v1/activities?limit=${limit}`, { idToken });
  return __DEV__ ? parseOrWarn(ListActivitiesResponseSchema, raw, 'GET /v1/activities') : (raw as ListActivitiesResponse);
}

export async function getActivityDetail(
  id: string,
  idToken: string | null,
): Promise<ApiActivityDetail> {
  const raw = await apiGet<unknown>(`/v1/activities/${encodeURIComponent(id)}`, { idToken });
  return parseOrWarn(ApiActivityDetailSchema, raw, 'GET /v1/activities/:id');
}

// Promote a duplicate row to canonical. Returns the freshly canonicalized
// detail so callers don't need a second fetch.
export async function canonicalizeActivity(
  id: string,
  idToken: string | null,
): Promise<ApiActivityDetail> {
  const raw = await apiPost<unknown>(`/v1/activities/${encodeURIComponent(id)}/canonicalize`, undefined, { idToken });
  return parseOrWarn(ApiActivityDetailSchema, raw, 'POST /v1/activities/:id/canonicalize');
}
