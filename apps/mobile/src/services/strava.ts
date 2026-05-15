/**
 * Strava OAuth wiring for Runstamp.
 *
 * Architecture (per PRD §6.8 — "we are a reader, not a writer"):
 *
 *   ┌─────────────┐  PKCE auth   ┌────────────────┐
 *   │  RN app     │─────────────►│  Strava OAuth  │
 *   │             │◄─────────────│  (browser)     │
 *   └──────┬──────┘   code       └────────────────┘
 *          │ POST { code, verifier }
 *          ▼
 *   ┌─────────────────────┐ exchange w/ secret  ┌────────┐
 *   │  Runstamp API       │────────────────────►│ Strava │
 *   │  /v1/auth/strava/   │◄────────────────────│ /token │
 *   │  exchange           │   tokens            └────────┘
 *   └─────────────────────┘
 *
 * The mobile app never sees the Strava client SECRET. It only knows the public
 * client ID and our backend's base URL — both come in via EXPO_PUBLIC_* env
 * vars wired up in `app.config.ts`. The server holds the secret, runs the
 * exchange, persists tokens, and hands back a session.
 *
 * Local dev: copy `apps/mobile/.env.example` to `.env`, set
 * EXPO_PUBLIC_STRAVA_CLIENT_ID and EXPO_PUBLIC_API_BASE_URL.
 */

import { useMemo } from 'react';
import {
  AuthRequest,
  ResponseType,
  makeRedirectUri,
  useAuthRequest,
  type AuthRequestPromptOptions,
  type AuthSessionResult,
  type DiscoveryDocument
} from 'expo-auth-session';
import Constants from 'expo-constants';

export const STRAVA_SCOPES = [
  'activity:read',
  'activity:read_all',
  'profile:read_all'
];

const STRAVA_DISCOVERY: DiscoveryDocument = {
  authorizationEndpoint: 'https://www.strava.com/oauth/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token'
};

interface RuntimeConfig {
  stravaClientId?: string;
  apiBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as RuntimeConfig;

export const STRAVA_CLIENT_ID: string = extra.stravaClientId ?? '';
export const API_BASE_URL: string = extra.apiBaseUrl ?? 'http://localhost:8080';

export interface UseStravaAuth {
  request: AuthRequest | null;
  response: AuthSessionResult | null;
  promptAsync: (options?: AuthRequestPromptOptions) => Promise<AuthSessionResult>;
  redirectUri: string;
}

/**
 * Wraps `useAuthRequest` for Strava's authorization-code + PKCE flow.
 * Redirect URI is built from the app's custom scheme (`runstamp`).
 */
export function useStravaAuth(): UseStravaAuth {
  const redirectUri = useMemo(
    () => makeRedirectUri({ scheme: 'runstamp', path: 'strava-callback' }),
    []
  );

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: STRAVA_SCOPES,
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true
    },
    STRAVA_DISCOVERY
  );

  return { request, response, promptAsync, redirectUri };
}

export interface StravaAthleteSummary {
  id: number;
  firstname?: string;
  lastname?: string;
  username?: string;
  profile?: string;
}

export interface StravaExchangeResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athlete: StravaAthleteSummary;
}

/**
 * Hand the authorization code to OUR backend; the backend completes the
 * client-secret-bearing token exchange with Strava and returns a normalised
 * result. We never ship the Strava client secret in the binary.
 */
export async function exchangeStravaCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<StravaExchangeResult> {
  const res = await fetch(`${API_BASE_URL}/v1/auth/strava/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as StravaExchangeResult;
}
