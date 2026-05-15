import { describe, expect, it } from 'vitest';

import { STAMPS, type StampTier } from '../sample';

const VALID_TIERS: readonly StampTier[] = ['common', 'rare', 'mythic'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe('STAMPS catalogue invariants', () => {
  it('has at least one stamp', () => {
    expect(STAMPS.length).toBeGreaterThan(0);
  });

  it('has unique ids across every stamp', () => {
    const ids = STAMPS.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('only uses tiers: common | rare | mythic', () => {
    for (const s of STAMPS) {
      expect(VALID_TIERS).toContain(s.tier);
    }
  });

  it('has at least one stamp at each tier', () => {
    for (const tier of VALID_TIERS) {
      const matches = STAMPS.filter((s) => s.tier === tier);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  describe('earned stamps', () => {
    const earned = STAMPS.filter((s): s is typeof s & { earnedAt: string } =>
      typeof s.earnedAt === 'string',
    );

    it('every earned stamp has earnedAt in YYYY-MM-DD format', () => {
      for (const s of earned) {
        expect(s.earnedAt).toMatch(DATE_RE);
      }
    });

    it('every earnedAt parses to a valid Date', () => {
      for (const s of earned) {
        const d = new Date(s.earnedAt);
        expect(Number.isNaN(d.getTime())).toBe(false);
        // Round-trip the ISO date portion to ensure it represents the same day.
        expect(d.toISOString().slice(0, 10)).toBe(s.earnedAt);
      }
    });
  });

  describe('unearned stamps', () => {
    const unearned = STAMPS.filter((s) => s.earnedAt === undefined);

    it('has at least one unearned stamp (sanity)', () => {
      expect(unearned.length).toBeGreaterThan(0);
    });

    it('every unearned stamp has earnedAt strictly === undefined', () => {
      for (const s of unearned) {
        expect(s.earnedAt).toBeUndefined();
      }
    });
  });
});
