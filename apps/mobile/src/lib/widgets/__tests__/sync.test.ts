import { describe, expect, it } from 'vitest';

import type { Activity } from '../../../data/models';
import { buildSnapshot, buildWeekDots, startOfWeek } from '../build';

function run(partial: Partial<Activity> & Pick<Activity, 'id' | 'date' | 'distance' | 'seconds'>): Activity {
  return {
    title: 'Morning run',
    place: 'Park',
    city: 'Austin',
    country: 'US',
    day: '',
    time: '',
    elev: 0,
    pace: 300,
    avgHr: 0,
    maxHr: 0,
    cal: 0,
    weather: { t: 20, w: 'Clear', icon: 'sun' },
    kind: 'easy',
    ...partial,
  };
}

// Wednesday 2026-05-13 local noon — week starts Sun May 10.
const ref = new Date(2026, 4, 13, 12, 0, 0);

describe('startOfWeek', () => {
  it('anchors on Sunday', () => {
    const start = startOfWeek(ref);
    expect(start.getDay()).toBe(0);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
  });
});

describe('buildWeekDots', () => {
  it('marks past run days and future as future', () => {
    const dots = buildWeekDots(
      [
        run({ id: '1', date: '2026-05-11T08:00:00', distance: 5, seconds: 1500 }), // Mon
        run({ id: '2', date: '2026-05-13T08:00:00', distance: 8, seconds: 2400 }), // Wed (today)
      ],
      ref,
    );
    expect(dots.map((d) => d.weekday)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    expect(dots.map((d) => d.state)).toEqual([
      'past-quiet', // Sun
      'past-run', // Mon
      'past-quiet', // Tue
      'today', // Wed
      'future',
      'future',
      'future',
    ]);
  });
});

describe('buildSnapshot', () => {
  it('aggregates this week vs last and formats units', () => {
    const snapshot = buildSnapshot({
      activities: [
        run({ id: 'a', date: '2026-05-12T07:00:00', distance: 10, seconds: 3000, pace: 300, title: 'Tempo' }),
        run({ id: 'b', date: '2026-05-05T07:00:00', distance: 6, seconds: 1800, pace: 310 }), // last week
        run({ id: 'c', date: '2026-05-01T07:00:00', distance: 20, seconds: 6000, pace: 320 }), // older
      ],
      stampCount: 4,
      lastStampName: 'First 10K',
      units: 'km',
      reference: ref,
    });

    expect(snapshot.weekRuns).toBe(1);
    expect(snapshot.weekDistanceLabel).toBe('10.00');
    expect(snapshot.weekSeconds).toBe(3000);
    expect(snapshot.vsLastDistanceLabel).toBe('+4.00');
    expect(snapshot.stampCount).toBe(4);
    expect(snapshot.lastStampName).toBe('First 10K');
    expect(snapshot.latestRun?.id).toBe('a');
    expect(snapshot.latestRun?.title).toBe('Tempo');
    expect(snapshot.latestRun?.distanceLabel).toBe('10.00');
    expect(snapshot.latestRun?.units).toBe('km');
    expect(snapshot.units).toBe('km');
  });

  it('converts distances when units are miles', () => {
    const snapshot = buildSnapshot({
      activities: [
        run({ id: 'a', date: '2026-05-12T07:00:00', distance: 16.09, seconds: 3600, pace: 300 }),
      ],
      stampCount: 0,
      lastStampName: null,
      units: 'mi',
      reference: ref,
    });
    expect(snapshot.weekDistanceLabel).toBe('10.00');
    expect(snapshot.latestRun?.units).toBe('mi');
    expect(snapshot.vsLastDistanceLabel).toBe('+10.00');
  });

  it('handles empty activity list', () => {
    const snapshot = buildSnapshot({
      activities: [],
      stampCount: 0,
      lastStampName: null,
      units: 'km',
      reference: ref,
    });
    expect(snapshot.weekRuns).toBe(0);
    expect(snapshot.weekDistanceLabel).toBe('0.00');
    expect(snapshot.latestRun).toBeNull();
    expect(snapshot.vsLastDistanceLabel).toBe('0.00');
  });
});
