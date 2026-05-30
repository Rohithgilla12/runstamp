import type { Activity } from '../../data/models';
import type { CatalogStamp } from '../../state/useStamps';

export interface WeekStats {
  totalKm: number;
  runs: number;
  totalSec: number;
  vsLastKm: number;
}

export function computeWeekStats(activities: Activity[], _isMi: boolean): WeekStats {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);

  let thisKm = 0;
  let lastKm = 0;
  let runs = 0;
  let totalSec = 0;
  for (const a of activities) {
    const d = new Date(a.date);
    if (d >= startOfWeek) {
      thisKm += a.distance;
      runs += 1;
      totalSec += a.seconds;
    } else if (d >= startOfLastWeek) {
      lastKm += a.distance;
    }
  }
  return { totalKm: thisKm, runs, totalSec, vsLastKm: thisKm - lastKm };
}

export interface RecapFact { eyebrow: string; lead: string; italic?: string; tail?: string; detail?: string }

export function pickRecapFact(activities: Activity[], earned: CatalogStamp[], units: 'km' | 'mi'): RecapFact | null {
  const candidates: RecapFact[] = [];

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const monthRuns = activities.filter((a) => a.date.startsWith(monthPrefix));
  const monthCities = new Set(monthRuns.map((a) => a.city?.trim()).filter(Boolean));
  if (monthCities.size >= 2) {
    candidates.push({
      eyebrow: 'THIS MONTH',
      lead: 'You ran in ',
      italic: `${monthCities.size}`,
      tail: ` cities.`,
      detail: [...monthCities].slice(0, 4).join(' · '),
    });
  }

  const lifetimeKm = activities.reduce((a, r) => a + r.distance, 0);
  const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
  const nextMs = milestones.find((m) => m > lifetimeKm);
  if (nextMs && nextMs - lifetimeKm < 250) {
    candidates.push({
      eyebrow: 'NEXT MILESTONE',
      lead: 'You’re ',
      italic: `${Math.round(nextMs - lifetimeKm)}`,
      tail: ` ${units === 'mi' ? 'mi' : 'km'} from ${nextMs.toLocaleString()}.`,
      detail: `Lifetime: ${Math.round(lifetimeKm).toLocaleString()} ${units === 'mi' ? 'mi' : 'km'}.`,
    });
  }

  const lastEarned = [...earned].sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))[0];
  if (lastEarned?.earnedAt) {
    const days = daysAgo(lastEarned.earnedAt);
    if (days <= 7) {
      candidates.push({
        eyebrow: 'STAMPED',
        lead: 'Earned ',
        italic: `${lastEarned.name}`,
        tail: days === 0 ? ' today.' : days === 1 ? ' yesterday.' : ` ${days} days ago.`,
        detail: lastEarned.description,
      });
    }
  }

  const countries = new Set(activities.map((a) => a.country?.trim()).filter(Boolean));
  if (countries.size >= 2) {
    candidates.push({
      eyebrow: 'PASSPORT',
      lead: 'You’ve run in ',
      italic: `${countries.size}`,
      tail: ` countries.`,
    });
  }

  if (earned.length >= 3) {
    candidates.push({
      eyebrow: 'COLLECTION',
      lead: '',
      italic: `${earned.length}`,
      tail: ` stamps earned. Keep going.`,
    });
  }

  if (candidates.length === 0) return null;
  const idx = (now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate()) % candidates.length;
  return candidates[idx];
}

export function daysAgo(iso: string): number {
  const earned = new Date(iso);
  const today = new Date();
  const days = Math.floor((today.getTime() - earned.getTime()) / 86_400_000);
  return Math.max(0, days);
}

export function greetingForHour(h: number): string {
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatTodayEyebrow(d: Date): string {
  const dow = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${dow} · ${mon} ${d.getDate()} · ${d.getFullYear()}`;
}
