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

function getBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
  return extra.apiBaseUrl ?? 'http://localhost:8080';
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

export async function apiDelete(
  path: string,
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {}
): Promise<void> {
  await apiFetch(path, { ...options, method: 'DELETE' });
}
