export const PROFILE_BASE = 'https://runstamp.gilla.fun';

// profileUrl is the canonical public album link printed on share cards.
export function profileUrl(handle: string): string {
  return `${PROFILE_BASE}/u/${encodeURIComponent(handle)}`;
}

// shouldShowProfileStamp gates the QR: only public profiles with a handle.
export function shouldShowProfileStamp(
  me: { profilePublic?: boolean; handle?: string } | undefined,
): boolean {
  return !!(me?.profilePublic && me?.handle);
}
