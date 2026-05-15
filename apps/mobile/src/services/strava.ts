/**
 * Strava integration — cadence-style server-driven OAuth.
 *
 *   ┌─────────────┐  POST /v1/strava/connect   ┌──────────────────┐
 *   │  RN app     │───────────────────────────►│  Runstamp API    │
 *   │             │◄─── { authorizeUrl } ──────│  (binds state→uid)│
 *   │             │                            └──────────────────┘
 *   │             │   open in WebBrowser                │
 *   │             │                                     │ user consents
 *   │             │                                     ▼
 *   │             │              ┌──────────────────────────────────┐
 *   │             │              │  runstamp-api.gilla.fun/.../callback │
 *   │             │              │   exchanges w/ secret + state →    │
 *   │             │              │   redirects to runstamp://...     │
 *   │             │              └──────────────────────────────────┘
 *   │             │◄── deep link `runstamp://strava/connected`  ─────┘
 *   └─────────────┘
 *
 * The mobile app never sees the Strava client secret, the auth code, or any
 * tokens. State is bound to the authenticated user on the server, so an
 * attacker can't swap an auth code into our callback and link a foreign
 * Strava account to a victim's runstamp account.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiDelete, apiGet, apiPost } from './api';

WebBrowser.maybeCompleteAuthSession();

export interface StravaStatusDisconnected {
  connected: false;
}

export interface StravaStatusConnected {
  connected: true;
  athleteId: number;
  scope: string;
  connectedAt: string;
  athleteName?: string;
  athleteAvatarUrl?: string;
}

export type StravaStatus = StravaStatusConnected | StravaStatusDisconnected;

export type StravaConnectResult =
  | { type: 'connected' }
  | { type: 'cancelled' }
  | { type: 'error'; reason: string };

const SUCCESS_PATH = 'strava/connected';
const ERROR_PATH = 'strava/error';

/**
 * Drive the entire Strava OAuth flow. Resolves once the in-app browser
 * dismisses, either via the runstamp:// deep link the backend redirects to
 * or because the user closed the sheet.
 *
 * Requires the caller to be signed in to Firebase (idToken comes from
 * useAuth().getIdToken()).
 */
export async function connectStrava(idToken: string | null): Promise<StravaConnectResult> {
  if (!idToken) {
    return { type: 'error', reason: 'not_signed_in' };
  }

  const { authorizeUrl } = await apiPost<{ authorizeUrl: string }>(
    '/v1/strava/connect',
    {},
    { idToken }
  );

  const returnUrl = Linking.createURL(SUCCESS_PATH);
  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, returnUrl, {
    showInRecents: false
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { type: 'cancelled' };
  }
  if (result.type !== 'success') {
    return { type: 'error', reason: result.type };
  }

  const parsed = Linking.parse(result.url);
  if (parsed.path && parsed.path.startsWith(ERROR_PATH)) {
    const reason = typeof parsed.queryParams?.reason === 'string'
      ? parsed.queryParams.reason
      : 'unknown';
    return { type: 'error', reason };
  }
  return { type: 'connected' };
}

export function getStravaStatus(idToken: string | null): Promise<StravaStatus> {
  return apiGet<StravaStatus>('/v1/strava/status', { idToken });
}

export function disconnectStrava(idToken: string | null): Promise<void> {
  return apiDelete('/v1/strava/connection', { idToken });
}

// ─── Deep import (backfill of historical activities) ─────────────────────

export type ImportStatusValue =
  | 'pending'      // row created, waiting for the worker to pick it up
  | 'listing'      // pulling summary pages
  | 'enriching'    // pulling detail + streams per activity
  | 'paused'       // operator paused, or rate-limit sleep
  | 'complete'     // all activities have has_detail=true
  | 'error';

export interface ImportStatus {
  status: ImportStatusValue;
  summaryCount: number;     // pages-of-200 listing count
  detailFetched: number;
  detailTotal: number;
  etaMinutes: number;
  lastError?: string;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  rateWindowUntil?: string; // ISO of next sleep-end, if importer is rate-limit-throttled
}

/** Idempotent — if an import is already running or complete, returns the current status. */
export function startStravaImport(idToken: string | null): Promise<ImportStatus> {
  return apiPost<ImportStatus>('/v1/strava/import/start', {}, { idToken });
}

export function getStravaImportStatus(idToken: string | null): Promise<ImportStatus> {
  return apiGet<ImportStatus>('/v1/strava/import/status', { idToken });
}
