/**
 * Strava OAuth wiring for Runstamp.
 *
 * How to plug in real credentials (do this before shipping):
 *
 *   1. Open `apps/mobile/app.json`.
 *   2. Inside the `"expo"` block, add an `"extra"` field:
 *
 *        "extra": {
 *          "stravaClientId": "<your-strava-client-id>",
 *          "stravaClientSecret": "<your-strava-client-secret>"
 *        }
 *
 *   3. `Constants.expoConfig?.extra` will then expose those values at runtime.
 *
 * The client secret should NOT ship in a production mobile build — the token
 * exchange belongs server-side (see PRD §6.8). For local development against
 * Strava's web/test client it's tolerable; revisit in M1.
 */

import { useMemo } from 'react';
import {
  AuthRequest,
  ResponseType,
  makeRedirectUri,
  useAuthRequest,
  type AuthRequestPromptOptions,
  type AuthSessionResult,
  type DiscoveryDocument,
} from 'expo-auth-session';
import Constants from 'expo-constants';

export const STRAVA_SCOPES = [
  'activity:read',
  'activity:read_all',
  'profile:read_all',
];

const STRAVA_DISCOVERY: DiscoveryDocument = {
  authorizationEndpoint: 'https://www.strava.com/oauth/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
};

// TODO(creds): add stravaClientId / stravaClientSecret to app.json's "expo.extra" before shipping.
interface StravaExtra {
  stravaClientId?: string;
  stravaClientSecret?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as StravaExtra;

export const STRAVA_CLIENT_ID: string =
  extra.stravaClientId ?? 'YOUR_STRAVA_CLIENT_ID';
export const STRAVA_CLIENT_SECRET: string =
  extra.stravaClientSecret ?? 'YOUR_STRAVA_CLIENT_SECRET';

export interface UseStravaAuth {
  request: AuthRequest | null;
  response: AuthSessionResult | null;
  promptAsync: (options?: AuthRequestPromptOptions) => Promise<AuthSessionResult>;
}

/**
 * Wraps `useAuthRequest` for Strava's authorization-code + PKCE flow.
 * The redirect URI is built from the app's custom scheme (`runstamp`).
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
      usePKCE: true,
    },
    STRAVA_DISCOVERY
  );

  return { request, response, promptAsync };
}

export interface StravaTokenResponse {
  token_type?: string;
  expires_at?: number;
  expires_in?: number;
  refresh_token?: string;
  access_token?: string;
  athlete?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Exchange an authorization code (plus PKCE verifier) for tokens.
 *
 * TODO(M1): persist tokens via secure storage and move the exchange behind
 * the Runstamp backend so the client secret never ships in the binary.
 */
export async function exchangeStravaCode(
  code: string,
  codeVerifier: string
): Promise<StravaTokenResponse> {
  const body = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
  });

  const res = await fetch(STRAVA_DISCOVERY.tokenEndpoint as string, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed (${res.status}): ${text}`);
  }

  return (await res.json()) as StravaTokenResponse;
}
