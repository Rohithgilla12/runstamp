export interface StripStamp {
  stampId: string;
  name?: string;
  tier?: string;
}

// Lower rank = rarer = shown first.
const TIER_RANK: Record<string, number> = { mythic: 0, rare: 1, common: 2 };

// selectStripStamps sorts rarest-first (stable within a tier) and caps the
// visible set, reporting how many were left off.
export function selectStripStamps(
  stamps: StripStamp[],
  max = 5,
): { shown: StripStamp[]; extra: number } {
  const sorted = [...stamps].sort(
    (a, b) => (TIER_RANK[a.tier ?? 'common'] ?? 3) - (TIER_RANK[b.tier ?? 'common'] ?? 3),
  );
  const shown = sorted.slice(0, max);
  return { shown, extra: Math.max(0, stamps.length - shown.length) };
}
