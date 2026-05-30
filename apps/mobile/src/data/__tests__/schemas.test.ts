import { describe, expect, it } from 'vitest';
import {
  ApiActivitySchema,
  ApiActivityDetailSchema,
  ListActivitiesResponseSchema,
  StreamsResponseSchema,
  ListStampsResponseSchema,
} from '@runstamp/shared-types';

const validActivity = {
  id: 'a1',
  source: 'strava',
  externalId: '123',
  sport: 'Run',
  startedAt: '2026-05-14T05:42:00Z',
  title: 'Cubbon Park long run',
  city: 'Bangalore',
  country: 'India',
  distanceM: 24020,
  elapsedSec: 7920,
  elevationM: 86,
  avgHr: 152,
  maxHr: 168,
  avgPaceSPerKm: 330,
  calories: 1684,
  cadenceSpm: 174,
  startLat: 12.97,
  startLon: 77.59,
};

describe('ApiActivitySchema', () => {
  it('parses a representative /v1/activities row', () => {
    const r = ApiActivitySchema.safeParse(validActivity);
    expect(r.success).toBe(true);
  });

  it('accepts a minimal row with only required fields', () => {
    const r = ApiActivitySchema.safeParse({
      id: 'a2', source: 'apple_health', externalId: 'uuid', sport: 'Run',
      startedAt: '2026-05-12T06:10:00Z', title: '', distanceM: 8120, elapsedSec: 2400,
    });
    expect(r.success).toBe(true);
  });

  it('rejects a drifted row (distanceM as string)', () => {
    const r = ApiActivitySchema.safeParse({ ...validActivity, distanceM: '24020' });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown source enum value', () => {
    const r = ApiActivitySchema.safeParse({ ...validActivity, source: 'garmin' });
    expect(r.success).toBe(false);
  });
});

describe('list / stream / stamp envelopes', () => {
  it('parses a list response', () => {
    const r = ListActivitiesResponseSchema.safeParse({ activities: [validActivity], total: 1 });
    expect(r.success).toBe(true);
  });

  it('parses a streams response with null streams', () => {
    const r = StreamsResponseSchema.safeParse({ activityId: 'a1', streams: null });
    expect(r.success).toBe(true);
  });

  it('parses a stamps response', () => {
    const r = ListStampsResponseSchema.safeParse({
      catalog: [{ id: 'first_5k', name: 'First 5K', description: 'x', tier: 'common', category: 'distance', criteria: {}, sortOrder: 1 }],
      earned: [{ stampId: 'first_5k', earnedAt: '2026-05-10T00:00:00Z' }],
    });
    expect(r.success).toBe(true);
  });
});

describe('ApiActivityDetailSchema', () => {
  it('accepts legacy {k,sec,hr} splits', () => {
    const r = ApiActivityDetailSchema.safeParse({
      ...validActivity,
      splits: [{ k: 1, sec: 300, hr: 150 }],
      notes: 'felt strong',
    });
    expect(r.success).toBe(true);
  });

  it('accepts HealthKit {index,distanceM,durationSec,avgHr} splits', () => {
    const r = ApiActivityDetailSchema.safeParse({
      ...validActivity,
      splits: [{ index: 0, distanceM: 1000, durationSec: 300, avgHr: 150 }],
    });
    expect(r.success).toBe(true);
  });

  it('still rejects a drifted base field', () => {
    const r = ApiActivityDetailSchema.safeParse({ ...validActivity, distanceM: 'x', splits: [] });
    expect(r.success).toBe(false);
  });
});

describe('StreamsResponseSchema (populated)', () => {
  it('parses a response with one or more streams', () => {
    const r = StreamsResponseSchema.safeParse({
      activityId: 'a1',
      streams: [{ type: 'heartrate', data: [140, 150, 160] }, { type: 'latlng', data: [[12.97, 77.59]] }],
    });
    expect(r.success).toBe(true);
  });
});
