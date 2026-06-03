import { describe, expect, it } from 'vitest';
import { DECK_LAYOUT_IDS, developOrder, seedSatisfaction } from '../develop';
import type { Activity } from '../../../data/models';
import type { LiveStreams } from '../../layouts/types';

const NO_STREAMS: LiveStreams = { hr: null, pace: null, route: null, splits: null, rawLatLng: null };

function makeRun(over: Partial<Activity> = {}): Activity {
  return {
    id: 'r1', date: '2025-10-12', day: 'Sun', time: '08:00',
    title: 'Long run', place: 'Lisbon', city: 'Lisbon', country: 'PT',
    distance: 18.2, seconds: 4594, elev: 120, pace: 252, avgHr: 152, maxHr: 171, cal: 1100,
    ...over,
  } as Activity;
}

describe('DECK_LAYOUT_IDS', () => {
  it('excludes the freeform "none" layout', () => {
    expect(DECK_LAYOUT_IDS).not.toContain('none');
  });
  it('has 12 composed layouts, all unique', () => {
    expect(DECK_LAYOUT_IDS).toHaveLength(12);
    expect(new Set(DECK_LAYOUT_IDS).size).toBe(12);
  });
});

describe('seedSatisfaction', () => {
  it('is 1 when every seeded slot has real data (minimal: distance/pace/time)', () => {
    expect(seedSatisfaction('minimal', makeRun(), NO_STREAMS)).toBe(1);
  });
  it('drops below 1 when a seeded slot has no data (postmark needs a place)', () => {
    const noPlace = makeRun({ city: '—' });
    expect(seedSatisfaction('postmark', noPlace, NO_STREAMS)).toBeLessThan(1);
  });
});

describe('developOrder', () => {
  it('returns every deck layout, best-first', () => {
    const order = developOrder(makeRun(), NO_STREAMS);
    expect(order).toHaveLength(12);
    expect(new Set(order).size).toBe(12);
    expect(seedSatisfaction(order[0], makeRun(), NO_STREAMS)).toBe(1);
  });

  it('ranks a fully-satisfiable card ahead of one missing data', () => {
    // No place → postmark (needs place) loses a slot; minimal stays full.
    const noPlace = makeRun({ city: '—' });
    const order = developOrder(noPlace, NO_STREAMS);
    expect(order.indexOf('minimal')).toBeLessThan(order.indexOf('postmark'));
  });

  it('is deterministic — registry order breaks score ties', () => {
    expect(developOrder(makeRun(), NO_STREAMS)).toEqual(developOrder(makeRun(), NO_STREAMS));
  });
});
