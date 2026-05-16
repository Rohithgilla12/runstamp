/**
 * Lightweight typed HTTP client for the Runstamp backend.
 *
 * Reads the base URL from `Constants.expoConfig?.extra.apiBaseUrl`.
 * Every request that carries an `idToken` will include an
 * `Authorization: Bearer <token>` header so the backend can verify the
 * caller's Firebase identity.
 *
 * Callers pass the token explicitly — this keeps coupling to AuthContext
 * zero and makes the helpers trivially unit-testable.
 *
 * On HTTP 401, `apiFetch` throws `UnauthorizedError`; other non-OK
 * responses throw a plain `Error` with the status and response body.
 */

import Constants from 'expo-constants';

interface ExtraConfig {
  apiBaseUrl?: string;
}

// Track whether we've already warned about the localhost fallback. We don't
// throw — that'd brick the dev workflow — but we make damn sure it's loud in
// the JS console any time a real-device install ends up here. Production
// OTAs MUST be published with `eas update --environment production` so the
// extra.apiBaseUrl field gets populated from EXPO_PUBLIC_API_BASE_URL.
let warnedLocalhostFallback = false;
function getBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
  const url = extra.apiBaseUrl;
  if (!url || url.startsWith('http://localhost')) {
    if (!warnedLocalhostFallback) {
      warnedLocalhostFallback = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[runstamp] apiBaseUrl falling back to localhost — your OTA bundle is missing EXPO_PUBLIC_API_BASE_URL. ' +
          'Re-run `eas update --environment production` (or rebuild).',
      );
    }
    return url ?? 'http://localhost:8080';
  }
  return url;
}

export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor(message = 'Unauthorized — token missing or expired') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export interface ApiFetchOptions extends RequestInit {
  idToken?: string | null;
}

export async function apiFetch(
  path: string,
  { idToken, headers: callerHeaders, ...init }: ApiFetchOptions = {}
): Promise<Response> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  const headers = new Headers(callerHeaders as HeadersInit | undefined);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`);
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  return response;
}

export async function apiGet<T>(
  path: string,
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  const response = await apiFetch(path, { ...options, method: 'GET' });
  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body)
  });
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body)
  });
  return response.json() as Promise<T>;
}

export async function apiDelete(
  path: string,
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {}
): Promise<void> {
  await apiFetch(path, { ...options, method: 'DELETE' });
}
