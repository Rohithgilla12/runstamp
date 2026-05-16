const MS_PER_DAY = 86_400_000;
const TAU_ATL = 7;
const TAU_CTL = 42;

export interface LoadActivity {
  date: string;
  distance: number;
  seconds: number;
  avgHr?: number;
}

export interface LoadPoint {
  date: string;
  load: number;
  atl: number;
  ctl: number;
  tsb: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function pad(n: number): string { return n < 10 ? '0' + n : String(n); }

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function computeTRIMP(a: LoadActivity, hrMax: number, hrResting: number): number {
  if (a.avgHr && a.avgHr > 0) {
    const reserve = Math.max(1, hrMax - hrResting);
    const HRr = clamp((a.avgHr - hrResting) / reserve, 0, 1);
    const durMin = a.seconds / 60;
    return durMin * HRr * 0.64 * Math.exp(1.92 * HRr);
  }
  return a.distance * 6;
}

export function hasAnyHr(rows: readonly { avgHr?: number }[]): boolean {
  for (const r of rows) if (r.avgHr && r.avgHr > 0) return true;
  return false;
}

export function buildLoadSeries(
  rows: readonly LoadActivity[],
  ref: Date = new Date(),
  hrMax: number = 190,
  hrResting: number = 60,
): LoadPoint[] {
  const byDay = new Map<string, number>();
  let minTs = Number.POSITIVE_INFINITY;
  let maxTs = Number.NEGATIVE_INFINITY;
  for (const r of rows) {
    const t = computeTRIMP(r, hrMax, hrResting);
    byDay.set(r.date, (byDay.get(r.date) ?? 0) + t);
    const ts = toMidnight(r.date);
    if (ts < minTs) minTs = ts;
    if (ts > maxTs) maxTs = ts;
  }

  const todayLocal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const todayTs = todayLocal.getTime();
  if (!isFinite(minTs)) minTs = todayTs;
  if (!isFinite(maxTs)) maxTs = todayTs;

  const out: LoadPoint[] = [];
  let atl = 0;
  let ctl = 0;
  const endTs = Math.min(maxTs, todayTs);
  for (let ts = minTs; ts <= endTs; ts += MS_PER_DAY) {
    const date = isoLocal(new Date(ts));
    const load = byDay.get(date) ?? 0;
    atl += (load - atl) / TAU_ATL;
    ctl += (load - ctl) / TAU_CTL;
    out.push({ date, load, atl, ctl, tsb: ctl - atl });
  }
  if (out.length === 0 || out[out.length - 1].date !== isoLocal(todayLocal)) {
    out.push({ date: isoLocal(todayLocal), load: 0, atl, ctl, tsb: ctl - atl });
  }
  return out;
}
