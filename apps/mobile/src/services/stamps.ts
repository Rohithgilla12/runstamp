import { apiGet, apiPost } from './api';
import type {
  EarnedStampRaw,
  ListStampsResponse,
  ReevaluateResponse,
  StampDefinitionRaw,
  StampTier,
} from '@runstamp/shared-types';

export type { EarnedStampRaw, ListStampsResponse, ReevaluateResponse, StampDefinitionRaw, StampTier };

export function listStamps(idToken: string | null): Promise<ListStampsResponse> {
  return apiGet<ListStampsResponse>('/v1/stamps', { idToken });
}

export function reevaluateStamps(idToken: string | null): Promise<ReevaluateResponse> {
  return apiPost<ReevaluateResponse>('/v1/stamps/reevaluate', {}, { idToken });
}
