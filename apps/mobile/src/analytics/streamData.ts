// Activity time-series streams arrive in two shapes from the API depending
// on the source:
//   Strava       → number[]                              (raw downsampled array)
//   Apple Health → { tStart, dtSec, values: number[] }   (anchor + cadence + values)
//
// All on-device chart components only need the value array, so we normalise
// here. Non-finite samples are dropped so a stray NaN can't crash the chart;
// returns null when there's nothing usable so callers can render an empty
// state instead of an empty chart.

export function parseValueStream(data: unknown): number[] | null {
  const raw = extractValues(data);
  if (raw == null || raw.length === 0) return null;
  const out: number[] = [];
  for (const v of raw) {
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out.length > 1 ? out : null;
}

function extractValues(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === 'object' && 'values' in data) {
    const v = (data as { values: unknown }).values;
    if (Array.isArray(v)) return v;
  }
  return null;
}
