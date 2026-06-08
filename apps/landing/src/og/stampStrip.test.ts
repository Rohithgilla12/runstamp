import { describe, expect, it } from 'vitest';
import { selectStripStamps, type StampTier, type StripStamp } from './stampStrip';

const s = (stampId: string, tier?: StampTier): StripStamp => ({ stampId, tier });

describe('selectStripStamps', () => {
  it('orders rarest-first (mythic > rare > common)', () => {
    const out = selectStripStamps([s('a', 'common'), s('b', 'mythic'), s('c', 'rare')]);
    expect(out.shown.map((x) => x.stampId)).toEqual(['b', 'c', 'a']);
    expect(out.extra).toBe(0);
  });

  it('caps at 5 and reports the remainder', () => {
    const many = Array.from({ length: 8 }, (_, i) => s(`x${i}`, 'common'));
    const out = selectStripStamps(many);
    expect(out.shown).toHaveLength(5);
    expect(out.extra).toBe(3);
  });

  it('is stable within a tier (preserves input order)', () => {
    const out = selectStripStamps([s('a', 'rare'), s('b', 'rare')]);
    expect(out.shown.map((x) => x.stampId)).toEqual(['a', 'b']);
  });

  it('treats missing tier as common', () => {
    const out = selectStripStamps([s('a'), s('b', 'mythic')]);
    expect(out.shown.map((x) => x.stampId)).toEqual(['b', 'a']);
  });

  it('handles empty input', () => {
    expect(selectStripStamps([])).toEqual({ shown: [], extra: 0 });
  });

  it('sorts a present-but-unknown tier after known tiers', () => {
    const out = selectStripStamps([s('a', 'common'), { stampId: 'b', tier: 'legendary' as StampTier }]);
    expect(out.shown.map((x) => x.stampId)).toEqual(['a', 'b']);
  });

  it('defaults the cap to 5 when max is omitted', () => {
    const six = Array.from({ length: 6 }, (_, i) => s(`x${i}`, 'common'));
    expect(selectStripStamps(six).shown).toHaveLength(5);
  });
});
