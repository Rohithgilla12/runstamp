import type { Surface } from '../layouts/types';

export interface DeckGeometry {
  cardW: number;
  cardH: number;
  itemWidth: number;
  sidePad: number;
}

export function surfaceRatio(surface: Surface): number {
  return surface === '9:16' ? 16 / 9 : surface === '1:1' ? 1 : 5 / 4;
}

// Card + slot sizing for the deck. itemWidth < cardW so slots overlap (the
// Wallet peek); sidePad centres the first/last card so index 0 rests centred.
export function deckGeometry(screenW: number, surface: Surface): DeckGeometry {
  const cardW = Math.min(Math.round(screenW * 0.66), 268);
  const cardH = Math.round(cardW * surfaceRatio(surface));
  const itemWidth = Math.round(cardW * 0.8);
  const sidePad = (screenW - itemWidth) / 2;
  return { cardW, cardH, itemWidth, sidePad };
}

// Which card is centred once a scroll settles at offsetX. Clamped to the deck
// so end-of-list overscroll and rounding at the half-boundary stay in range.
export function snapIndexFor(offsetX: number, itemWidth: number, count: number): number {
  if (itemWidth <= 0 || count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offsetX / itemWidth)));
}
