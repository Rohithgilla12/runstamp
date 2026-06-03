import type { Activity } from '../data/models';
import type { CatalogStamp } from '../state/useStamps';
import { countContinents } from '../design/worldGeometry';

export interface YearStats {
  totalKm: number;
  totalRuns: number;
  totalSec: number;
  newCities: number;
  countries: number;
  continents: number;
  longestRunKm: number;
  longestRunDate: string | null;
}

export function computeYearStats(activities: Activity[], _earned: CatalogStamp[], year: number): YearStats {
  const yearPrefix = `${year}-`;
  const yearRuns = activities.filter((a) => a.date.startsWith(yearPrefix));
  let totalKm = 0;
  let totalSec = 0;
  let longestRunKm = 0;
  let longestRunDate: string | null = null;
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const r of yearRuns) {
    totalKm += r.distance;
    totalSec += r.seconds;
    if (r.distance > longestRunKm) {
      longestRunKm = r.distance;
      longestRunDate = r.date;
    }
    if (r.city?.trim()) cities.add(r.city.trim());
    if (r.country?.trim()) countries.add(r.country.trim());
  }
  return {
    totalKm,
    totalRuns: yearRuns.length,
    totalSec,
    newCities: cities.size,
    countries: countries.size,
    continents: countContinents([...countries]),
    longestRunKm,
    longestRunDate,
  };
}

export function filterEarnedInYear(earned: CatalogStamp[], year: number): CatalogStamp[] {
  const prefix = `${year}-`;
  return earned.filter((s) => s.earnedAt?.startsWith(prefix));
}

// Canonical recap distance format — hero numerals: 1 decimal under 100,
// integer at/above. Shared by the on-screen recap and the exported card so
// the same year reads identically on both.
export function fmtRecapDist(km: number, units: 'km' | 'mi'): string {
  const v = units === 'mi' ? km / 1.609 : km;
  if (!Number.isFinite(v)) return '0';
  if (v >= 100) return v.toFixed(0);
  return v.toFixed(1).replace(/\.0$/, '');
}
