import { apiGet, apiPost } from './api';
import {
  ListStampsResponseSchema,
  ReevaluateResponseSchema,
  type EarnedStampRaw,
  type ListStampsResponse,
  type ReevaluateResponse,
  type StampDefinitionRaw,
  type StampTier,
} from '@runstamp/shared-types';
import { parseOrWarn } from '../lib/validate';

export type { EarnedStampRaw, ListStampsResponse, ReevaluateResponse, StampDefinitionRaw, StampTier };

export async function listStamps(idToken: string | null): Promise<ListStampsResponse> {
  const raw = await apiGet<unknown>('/v1/stamps', { idToken });
  return parseOrWarn(ListStampsResponseSchema, raw, 'GET /v1/stamps');
}

export async function reevaluateStamps(idToken: string | null): Promise<ReevaluateResponse> {
  const raw = await apiPost<unknown>('/v1/stamps/reevaluate', {}, { idToken });
  return parseOrWarn(ReevaluateResponseSchema, raw, 'POST /v1/stamps/reevaluate');
}
