import { describe, expect, it } from 'vitest';
import {
  dailyKmForWeek,
  filterByWeek,
  labelWeek,
  startOfIsoWeek,
  stepWeek,
  weekKeyFor,
} from '../week';

describe('startOfIsoWeek', () => {
  it('returns Monday for any day of the same week', () => {
    // 2026-05-16 is a Saturday → Monday is 2026-05-11
    const sat = new Date(2026, 4, 16);
    const mon = startOfIsoWeek(sat);
    expect(mon.getFullYear()).toBe(2026);
    expect(mon.getMonth()).toBe(4);
    expect(mon.getDate()).toBe(11);
  });
  it('returns Monday for Sunday', () => {
    // 2026-05-17 is a Sunday → Monday of the same week is 2026-05-11
    const sun = new Date(2026, 4, 17);
    const mon = startOfIsoWeek(sun);
    expect(mon.getDate()).toBe(11);
  });
});

describe('weekKeyFor', () => {
  it('produces ISO week number consistently with thursday-in-week rule', () => {
    // 2026-01-01 is a Thursday → ISO week 1 of 2026
    const k = weekKeyFor(new Date(2026, 0, 1));
    expect(k.isoYear).toBe(2026);
    expect(k.isoWeek).toBe(1);
  });
  it('week 20 of 2026 starts Mon May 11', () => {
    const k = weekKeyFor(new Date(2026, 4, 13));
    expect(k.isoWeek).toBe(20);
    expect(k.start.getDate()).toBe(11);
    expect(k.end.getDate()).toBe(17);
  });
});

describe('stepWeek', () => {
  it('forward by one week', () => {
    const k = weekKeyFor(new Date(2026, 4, 13));
    const next = stepWeek(k, 1);
    expect(next.start.getDate()).toBe(18);
    expect(next.isoWeek).toBe(21);
  });
  it('backward across a year boundary', () => {
    const firstWeek = weekKeyFor(new Date(2026, 0, 5));   // W2 of 2026
    const prev = stepWeek(firstWeek, -1);                  // W1 of 2026
    expect(prev.isoWeek).toBe(1);
  });
});

describe('labelWeek', () => {
  it('same-month range stays compact', () => {
    const k = weekKeyFor(new Date(2026, 4, 13));
    expect(labelWeek(k)).toBe('W20 · May 11 – 17');
  });
  it('cross-month range includes both months', () => {
    // 2026-04-27 (Mon) - 2026-05-03 (Sun)
    const k = weekKeyFor(new Date(2026, 3, 30));
    expect(labelWeek(k)).toBe('W18 · Apr 27 – May 3');
  });
});

describe('filterByWeek', () => {
  it('includes the week boundary days', () => {
    const k = weekKeyFor(new Date(2026, 4, 13));
    const out = filterByWeek(
      [
        { date: '2026-05-10' },     // before
        { date: '2026-05-11' },     // Mon — first day
        { date: '2026-05-17' },     // Sun — last day
        { date: '2026-05-18' },     // after
      ],
      k,
    );
    expect(out.map((r) => r.date)).toEqual(['2026-05-11', '2026-05-17']);
  });
});

describe('dailyKmForWeek', () => {
  it('buckets distance by weekday', () => {
    const k = weekKeyFor(new Date(2026, 4, 13));   // W20: 2026-05-11..17
    const km = dailyKmForWeek(
      [
        { date: '2026-05-11', distance: 5 },    // Mon
        { date: '2026-05-12', distance: 0 },    // Tue
        { date: '2026-05-12', distance: 3 },    // Tue
        { date: '2026-05-17', distance: 21 },   // Sun
        { date: '2026-05-18', distance: 99 },   // next Mon — excluded
      ],
      k,
    );
    expect(km).toEqual([5, 3, 0, 0, 0, 0, 21]);
  });
});
