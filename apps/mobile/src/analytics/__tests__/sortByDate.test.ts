import { describe, expect, it } from 'vitest';
import { sortByDateAsc } from '../sortByDate';

interface Dated { id: string; date: string }

describe('sortByDateAsc', () => {
  it('returns ascending by ISO date', () => {
    const input: Dated[] = [
      { id: 'c', date: '2026-03-01' },
      { id: 'a', date: '2026-01-01' },
      { id: 'b', date: '2026-02-01' },
    ];
    const out = sortByDateAsc(input);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate input', () => {
    const input: Dated[] = [
      { id: 'b', date: '2026-02-01' },
      { id: 'a', date: '2026-01-01' },
    ];
    const copy = [...input];
    sortByDateAsc(input);
    expect(input).toEqual(copy);
  });

  it('handles empty array', () => {
    expect(sortByDateAsc<Dated>([])).toEqual([]);
  });
});
