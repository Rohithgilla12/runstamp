import type { Units } from '../design/theme';

export function fmtPace(secPerKm: number, units: Units = 'km'): string {
  const sec = Math.round(units === 'mi' ? secPerKm * 1.609 : secPerKm);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtTime(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDist(km: number, units: Units = 'km'): string {
  if (units === 'mi') return (km / 1.609).toFixed(2);
  return km.toFixed(2);
}

export function distUnit(units: Units = 'km'): string {
  return units === 'mi' ? 'mi' : 'km';
}

export function paceUnit(units: Units = 'km'): string {
  return units === 'mi' ? '/mi' : '/km';
}
