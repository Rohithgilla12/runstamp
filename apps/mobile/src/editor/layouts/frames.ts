import type { FrameSpec, LayoutId } from './types';

// Card composition per layout. The backdrop colour is chosen to match what the
// layout's sticker theme expects (ink-text themes need a light backdrop with a
// faint map; paper-text themes need a dark one). mapOpacity is the main lever:
// stamp/photo-forward layouts let the map lead; paper-forward layouts fade it
// so the type and decoration carry the card. 'none' is intentionally absent —
// it keeps the legacy full-bleed map for freeform editing.

const PAPER = '#f3ede2';
const PAPER_WARM = '#f5eedf';
const INK = '#14110d';
const PRUSSIAN = '#0d2b45';
const SCRIM_SOFT = 'rgba(14,13,11,0.32)';

export const FRAMES: Partial<Record<LayoutId, FrameSpec>> = {
  // Signature: full-bleed photo with a signature route drawn over an ink field.
  signature:         { backdrop: INK,   inset: 0,  radius: 0, mapStyle: 'dark',  mapOpacity: 1, scrim: SCRIM_SOFT },
  // Passport window: inset photo "window" on paper, faint map behind.
  'passport-window': { backdrop: PAPER, inset: 14, radius: 3, mapStyle: 'light', mapOpacity: 1, scrim: 'transparent' },
  // Split field: photo band over a map/route band, seam at the boundary.
  'split-field':     { backdrop: INK,   inset: 0,  radius: 0, mapStyle: 'light', mapOpacity: 1, scrim: 'transparent' },
  // Stamp body: dark map fills the inset, paper perforations bite the edge.
  postage:   { backdrop: PAPER,      inset: 14, radius: 2,  mapStyle: 'dark',  mapOpacity: 1,    scrim: SCRIM_SOFT },
  // Postmark cancellation: faint dark map under a big ring + cream serif stats.
  postmark:  { backdrop: INK,        inset: 0,  radius: 0,  mapStyle: 'dark',  mapOpacity: 0.5,  scrim: 'rgba(14,13,11,0.35)' },
  // Boarding pass: warm-paper card, light map panel, dark stat chips.
  boarding:  { backdrop: '#ebe3d3',  inset: 12, radius: 4,  mapStyle: 'light', mapOpacity: 0.95, scrim: 'transparent' },
  // Passport page: ecru, hairline rules, faint map so ink serif type leads.
  passport:  { backdrop: PAPER_WARM, inset: 16, radius: 2,  mapStyle: 'light', mapOpacity: 0.32, scrim: 'transparent' },
  // Customs form: ecru ledger, double border, faint map.
  customs:   { backdrop: PAPER_WARM, inset: 14, radius: 0,  mapStyle: 'light', mapOpacity: 0.30, scrim: 'transparent' },
  // Engraved: monochrome paper, very faint map under concentric rules.
  engraved:  { backdrop: PAPER,      inset: 14, radius: 2,  mapStyle: 'light', mapOpacity: 0.22, scrim: 'transparent' },
  // Wax seal: dark field, mid map, cream serif + a solar wax disc.
  wax:       { backdrop: INK,        inset: 0,  radius: 0,  mapStyle: 'dark',  mapOpacity: 0.6,  scrim: 'rgba(14,13,11,0.40)' },
  // Minimal: clean paper, a quiet light map, one hairline.
  minimal:   { backdrop: PAPER,      inset: 18, radius: 6,  mapStyle: 'light', mapOpacity: 0.40, scrim: 'transparent' },
  // Date stamp: paper, faint map under a big rotated date cancel.
  datestamp: { backdrop: PAPER,      inset: 14, radius: 2,  mapStyle: 'light', mapOpacity: 0.30, scrim: 'transparent' },
  // Halftone: dark map with a dot field over it, paper chips.
  halftone:  { backdrop: INK,        inset: 10, radius: 0,  mapStyle: 'dark',  mapOpacity: 1,    scrim: 'rgba(14,13,11,0.25)' },
  // Cyanotype: Prussian-blue print, mid map, pale-blue serif.
  cyanotype: { backdrop: PRUSSIAN,   inset: 12, radius: 2,  mapStyle: 'dark',  mapOpacity: 0.5,  scrim: 'rgba(13,43,69,0.45)' },
  // Riso: paper with overprint grain, light-ish map.
  riso:      { backdrop: PAPER,      inset: 12, radius: 4,  mapStyle: 'light', mapOpacity: 0.7,  scrim: 'transparent' },
};
