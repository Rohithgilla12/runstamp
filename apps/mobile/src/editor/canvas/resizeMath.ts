export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

/** Map a corner-handle drag into a clamped uniform scale. */
export function scaleFromCornerDrag(
  startScale: number,
  translationX: number,
  translationY: number,
  corner: ResizeCorner,
  baseSize: number,
  min = 0.5,
  max = 2.2,
): number {
  'worklet';
  const signX = corner === 'ne' || corner === 'se' ? 1 : -1;
  const signY = corner === 'sw' || corner === 'se' ? 1 : -1;
  const delta = (signX * translationX + signY * translationY) / 2;
  const next = startScale + delta / Math.max(baseSize, 1);
  return Math.max(min, Math.min(max, next));
}
