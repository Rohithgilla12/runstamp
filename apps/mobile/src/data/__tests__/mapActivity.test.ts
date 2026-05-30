import { describe, expect, it } from 'vitest';
import type { ApiActivity } from '@runstamp/shared-types';
import { mapApiToActivity } from '../mapActivity';

const base: ApiActivity = {
  id: 'a1', source: 'strava', externalId: '1', sport: 'Run',
  startedAt: '2026-05-14T05:42:00', title: 'Cubbon Park long run',
  city: 'Bangalore', country: 'India', distanceM: 24020, elapsedSec: 7920,
  elevationM: 86, avgHr: 152, maxHr: 168, avgPaceSPerKm: 330,
};

describe('mapApiToActivity', () => {
  it('converts metres to km with two-decimal precision', () => {
    expect(mapApiToActivity(base).distance).toBe(24.02);
  });

  it('classifies a >=20km run as long', () => {
    expect(mapApiToActivity(base).kind).toBe('long');
  });

  it('synthesizes a title for an untitled morning Apple Health run', () => {
    const a = mapApiToActivity({ ...base, title: '', distanceM: 8000, startedAt: '2026-05-14T06:10:00', city: 'Bangalore' });
    expect(a.title).toBe('Morning run in Bangalore');
  });

  it('keeps a provided title', () => {
    expect(mapApiToActivity(base).title).toBe('Cubbon Park long run');
  });

  it('never fabricates a route — routeless runs carry no synthetic polyline', () => {
    const a = mapApiToActivity(base) as unknown as Record<string, unknown>;
    expect('route' in a).toBe(false);
  });
});
