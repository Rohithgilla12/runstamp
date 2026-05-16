// Brand tokens lifted from `.impeccable.md` + `apps/mobile/src/design/theme.ts`.
// Stay locked to these. Solar is the only saturated colour on any surface.

export const colors = {
  paper:   "#f3ede2",
  paper2:  "#ebe3d3",
  paper3:  "#e2d8c4",
  ink:     "#14110d",
  ink2:    "#3a342b",
  ink3:    "#75695a",
  accent:  "#e85d2f", // solar — the one warm pop
  moss:    "#4a6b3a",
  navy:    "#1f2a44",
  line:    "rgba(20,17,13,0.12)",
} as const;

// Re-exported from loadFonts so callers don't have to import both modules.
// These are the *hashed* family names Remotion injects via @remotion/google-fonts;
// using the canonical Google name falls back to a system serif at render time.
export { fontFamilies as fonts } from "./loadFonts";

export const VIDEO_FPS = 30;
export const VIDEO_DURATION_FRAMES = 30 * 30; // 30 seconds at 30fps

// Scene boundaries — keep in one place so 9:16 and 16:9 versions stay in sync.
export const SCENES = {
  title:     { start:   0, length:  90 }, // 0-3s   — "Collect a stamp for every run"
  editor:    { start:  90, length: 180 }, // 3-9s   — share-card editor demo
  analytics: { start: 270, length: 180 }, // 9-15s  — heatmap + numbers tick up
  passport:  { start: 450, length: 180 }, // 15-21s — world map pins drop
  stamps:    { start: 630, length: 180 }, // 21-27s — three stamps land
  outro:     { start: 810, length:  90 }, // 27-30s — "free · open source · iOS + Android"
} as const;
