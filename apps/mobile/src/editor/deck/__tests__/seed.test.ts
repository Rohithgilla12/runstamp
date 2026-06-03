import { describe, expect, it } from 'vitest';
import { seedToStickers } from '../seed';
import type { Layout } from '../../layouts/types';

function layoutWith(seed: Layout['seed']): Layout {
  return {
    id: 'postage',
    name: 'Postage',
    Scaffolding: (() => null) as unknown as Layout['Scaffolding'],
    theme: {},
    seed,
  };
}

describe('seedToStickers', () => {
  it('maps each seed slot to a sticker, preserving key/x/y', () => {
    const layout = layoutWith([{ key: 'distance', x: 0.5, y: 0.4 }, { key: 'pace', x: 0.3, y: 0.6 }]);
    const out = seedToStickers(layout, 'deck');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ key: 'distance', x: 0.5, y: 0.4 });
    expect(out[1]).toMatchObject({ key: 'pace', x: 0.3, y: 0.6 });
  });

  it('defaults scale to 1 when a seed omits it', () => {
    const out = seedToStickers(layoutWith([{ key: 'distance', x: 0.5, y: 0.4 }]), 'deck');
    expect(out[0].scale).toBe(1);
  });

  it('honours an explicit scale', () => {
    const out = seedToStickers(layoutWith([{ key: 'distance', x: 0.5, y: 0.4, scale: 1.3 }]), 'deck');
    expect(out[0].scale).toBe(1.3);
  });

  it('namespaces ids by prefix + layout id (deck vs franking stay distinct)', () => {
    const layout = layoutWith([{ key: 'distance', x: 0.5, y: 0.4 }]);
    expect(seedToStickers(layout, 'deck')[0].id).toBe('deck-postage-0');
    expect(seedToStickers(layout, 'frank')[0].id).toBe('frank-postage-0');
  });

  it('returns nothing for a layout with no seed', () => {
    expect(seedToStickers(layoutWith(undefined), 'deck')).toEqual([]);
  });
});
