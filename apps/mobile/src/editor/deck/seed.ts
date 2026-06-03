import type { Layout, StickerInstance } from '../layouts/types';

// Map a layout's seed slots to sticker instances. Shared by the deck preview
// and the franking capture so what you flip past is exactly what exports —
// the two must seed identically or the preview and saved PNG would diverge.
export function seedToStickers(layout: Layout, idPrefix: string): StickerInstance[] {
  return (layout.seed ?? []).map((s, i) => ({
    id: `${idPrefix}-${layout.id}-${i}`,
    key: s.key,
    x: s.x,
    y: s.y,
    scale: s.scale ?? 1,
  }));
}
