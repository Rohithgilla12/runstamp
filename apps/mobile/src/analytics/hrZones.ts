export const DEFAULT_HR_MAX = 190;
export const DEFAULT_HR_RESTING = 60;

const RESERVE_PCTS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

export interface Zone { zone: 1 | 2 | 3 | 4 | 5; low: number; high: number }

export function zoneBounds(hrMax: number = DEFAULT_HR_MAX, hrResting: number = DEFAULT_HR_RESTING): Zone[] {
  const reserve = Math.max(1, hrMax - hrResting);
  const bpm = (pct: number) => Math.round(hrResting + pct * reserve);
  return [1, 2, 3, 4, 5].map((z, i) => ({
    zone: z as Zone['zone'],
    low: bpm(RESERVE_PCTS[i]),
    high: bpm(RESERVE_PCTS[i + 1]),
  }));
}

export function classifyAvgHr(
  avgHr: number | undefined,
  hrMax: number = DEFAULT_HR_MAX,
  hrResting: number = DEFAULT_HR_RESTING,
): 1 | 2 | 3 | 4 | 5 | null {
  if (!avgHr || avgHr <= 0) return null;
  const bounds = zoneBounds(hrMax, hrResting);
  if (avgHr < bounds[0].high) return 1;
  if (avgHr < bounds[1].high) return 2;
  if (avgHr < bounds[2].high) return 3;
  if (avgHr < bounds[3].high) return 4;
  return 5;
}
