import type { Activity } from '../../data/models';
import type { LayoutId, LiveStreams } from '../layouts/types';
import { LAYOUT_META } from '../layouts/registry.data';
import { stickerHasValue } from '../stickers/stickerHasValue';

// The deck shows composed cards only — the freeform 'none' layout is not a card.
export const DECK_LAYOUT_IDS: LayoutId[] = LAYOUT_META
  .filter((m) => m.id !== 'none')
  .map((m) => m.id);

// Fraction of a layout's seeded slots this run can fill honestly. 1 = every
// slot has real data; lower = the card would hide slots and read sparse.
export function seedSatisfaction(id: LayoutId, run: Activity, live: LiveStreams): number {
  const seed = LAYOUT_META.find((m) => m.id === id)?.seed ?? [];
  if (seed.length === 0) return 0;
  const ok = seed.filter((s) =>
    stickerHasValue(s.key, run, live.hr, live.pace, live.route, live.splits),
  ).length;
  return ok / seed.length;
}

// "Develop" order: open the deck on the card that best fits this run's real
// data — fullest-first, registry order as the stable tiebreak. The editor
// scrolls to index 0 at rest, so index 0 is the developed card.
export function developOrder(run: Activity, live: LiveStreams): LayoutId[] {
  return DECK_LAYOUT_IDS
    .map((id, index) => ({ id, index, score: seedSatisfaction(id, run, live) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((e) => e.id);
}
