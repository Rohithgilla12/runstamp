# Stamp Visual System — Design Spec

**Status:** Spec for designer-agent asset production
**Author:** /impeccable, 2026-05-16
**Owns:** every visible stamp share artifact in Runstamp

---

## The brief

Every stamp earned in Runstamp is a **collectible postage stamp** — a single designed artifact that should make the runner want to screenshot and post it. The current implementation (`apps/mobile/src/design/StampShareCard.tsx`) renders a flat tier-coloured rectangle with faint concentric rings and a small "EARNED" badge in the middle. That reads as a placeholder, not a stamp.

This doc replaces it. We commit to **real philately** — perforated edges, an illustration, a denomination, country marks, a postmark cancellation — and ship per-stamp illustrated SVGs.

Reference triangle this lane already lives in (per `.impeccable.md`):

- **Vintage US/UK postage** — National Park commemoratives, Penny Black, the look of a stamp on an envelope from 1972.
- **Field Notes covers** — letterpress restraint, ink-heavy, weighty wordmark, type carries the load.
- **Risograph print** — limited palette, slight registration shift, halftone dots, character over precision.

Anti-references (do not look like these):

- Duolingo achievement badge (cartoon, gamified, gloss)
- Nike Run Club achievement (cinematic black, all-caps slogans, swooshes)
- Strava trophy (gold gradient cup on flat background — generic, forgettable)
- Generic NFT card (centered avatar, gradient ring, faux-3D depth)

---

## The composition (every share card)

The output is **a 9:16 portrait image** (1080×1920 px target) framed like a single oversized postage stamp pinned to a desk surface.

```
┌─────────────────────────────────────────────────┐  ← outer canvas (tier palette)
│   ╭─────────────────────────────────────────╮   │
│  •│  RUNSTAMP · IN · 2026                   │•  │  ← top plate: country wordmark
│   │  ─────────────────────────────          │   │     (always RUNSTAMP + ISO + year)
│  •│                                         │•  │
│   │                                         │   │
│  •│         ╭───────────╮                   │•  │
│   │         │           │      100          │   │  ← illustration (left) +
│  •│         │   ICON    │      KM           │•  │     denomination (right)
│   │         │   SVG     │   ─────           │   │
│  •│         │           │   LIFETIME        │•  │
│   │         ╰───────────╯                   │   │
│  •│                                         │•  │
│   │  ─────────────────────────────          │   │
│  •│  ╭─────╮   100 km lifetime              │•  │  ← bottom plate: postmark + name
│   │  │ ⊙  │   16 MAY 2026 · KARIMNAGAR      │   │
│  •│  ╰─────╯   STAMP · LIFETIME_100KM       │•  │
│   ╰─────────────────────────────────────────╯   │
│        • • • • • • • • • • • • • • •            │  ← perforation row (canvas-coloured
└─────────────────────────────────────────────────┘     punch holes)
```

### Anatomy

1. **Outer canvas** — tier base colour, full bleed. This is the "desk surface" the stamp sits on. Sometimes gets a subtle halftone wash (see Tiers below).
2. **Stamp paper** — the actual stamp rectangle, inset ~64px from canvas edges, with **perforated edges** (scalloped notches every ~32px around the entire perimeter, punched in canvas colour). Cream paper colour, slight ink-bleed character at the corners.
3. **Top plate**
   - `RUNSTAMP · <ISO country code> · <year>` in JetBrains Mono, letter-spacing 2.4, ~14px
   - Below: a 1px hairline divider (paper2 colour, 60% opacity)
   - Country code comes from `location_country` of the linked activity if present, else `RUNSTAMP · WORLDWIDE · <year>`.
4. **Illustration zone** — left half, 380×380 (in 1080-wide canvas). Hosts the per-stamp SVG illustration. Single-color or duotone depending on tier (see Tiers).
5. **Denomination block** — right half, vertical-centred to illustration.
   - Big number/value in **Instrument Serif italic**, ~120px, tight letter-spacing (-2px). Examples: `100`, `42.2`, `sub-3:45`, `5`.
   - Unit/qualifier below in JetBrains Mono caps, ~18px, letter-spacing 2.4. Examples: `KM`, `KM`, `MARATHON`, `CITIES`.
   - Optional secondary line in serif italic, ~16px, opacity 0.7: `LIFETIME`, `PERSONAL BEST`, etc.
6. **Bottom plate**
   - Hairline divider matching top
   - **Postmark cancellation circle** (left, 88×88) — circular SVG with curved text around the rim (`<EARN DATE> · <CITY>`), the runstamp star/sun glyph in the centre, slight ink-bleed/imperfection. Always rendered in tier ink colour.
   - To the right of the postmark, a 3-line block:
     - Stamp display name (Instrument Serif italic, 22px, paper colour)
     - Earn date + city (JetBrains Mono, 11px, 60% opacity, all caps)
     - `STAMP · <id>` footer (JetBrains Mono, 9px, 40% opacity, all caps)
7. **Perforation row** — single line of perforation dots at the bottom of the outer canvas (outside the stamp paper), suggesting the stamp was torn from a sheet.

### Layout rules

- All measurements scale from the 1080×1920 base. Don't hardcode pixels in the SVG; use viewBox `0 0 1080 1920` and rely on intrinsic ratios.
- **Asymmetric balance**: illustration left, denomination right. Never centre-on-axis. Real stamps are rarely centered — they have a portrait left and the value right.
- The postmark **overlaps** the bottom-left corner of the stamp paper by ~20%, like a real cancellation that didn't quite land cleanly. This is the most important "ink character" moment in the design.

---

## Tiers

Three tier visual treatments. Each is a complete palette + texture rule. The illustration SVG stays the same across tiers — the tier wrapper handles colour, texture, and embellishment.

### Common (silver-grade)

The everyday stamp. Like a definitive issue — a stamp you'd see on a postcard.

- **Outer canvas:** `#4a6b3a` (moss, full bleed)
- **Stamp paper:** `#ebe3d3` (paper2)
- **Illustration ink:** `#14110d` (ink, single-colour)
- **Postmark ink:** `#14110d` at 85% opacity, slight ink-bleed
- **Type colour:** `#14110d` for headings, `rgba(20,17,13,0.65)` for secondary
- **Texture:** very subtle halftone dot pattern (8% opacity) over the stamp paper, mimicking newsprint
- **Perforations:** clean, even, no overprint
- **Wordmark variant:** `RUNSTAMP · IN · 2026` (standard)

Other Common base hues that designer can swap in (cycle by category for visual variety across an album):

| Category | Common base hue |
|---|---|
| distance | moss `#4a6b3a` |
| pace | sky `#3c6e8c` |
| place | warm clay `#b85c2f` (deeper than solar accent) |
| streak | warn `#c0833a` |
| milestone | ink `#14110d` (still treated as a Common — full bleed dark with cream paper) |

### Rare (gold-grade)

A commemorative issue. Earned for meaningful milestones. The visual upgrade: **duotone print, embossed border, halftone overlay.**

- **Outer canvas:** `#14110d` (ink — same as light-mode hero polarity-flip)
- **Stamp paper:** `#f3ede2` (paper)
- **Illustration ink:** `#14110d` PRIMARY + `#e85d2f` (solar accent) overlay layer, offset by 2px to suggest a 2-pass print misregistration. Designer should produce illustrations with two named groups: `<g id="ink">` and `<g id="accent">`.
- **Postmark ink:** `#e85d2f` (solar) at 90% opacity — the postmark "stamped in red ink"
- **Type colour:** `#14110d`
- **Texture:** Halftone dot pattern at 14% opacity over the stamp paper, denser around the illustration.
- **Border embellishment:** A second hairline rectangle inset 8px inside the stamp paper border, like a Penny Black inner frame
- **Perforations:** Slightly larger scalloping, suggests thicker paper stock
- **Wordmark variant:** `RUNSTAMP · COMMEMORATIVE · IN · 2026`

### Mythic (holographic-grade)

A limited issue. Earned for serious territory. Visual upgrade: **foil ticks around the rim, holographic shimmer band, three-colour print, optional notched perforations (a "Treskilling Yellow" misprint hint).**

- **Outer canvas:** `#1a1612` (deep ink, slightly warmer than canonical ink, suggests aged paper)
- **Stamp paper:** `#f3e0a8` (warm cream — "aged museum" tone, NOT the standard cream)
- **Illustration ink:** Three layers in named groups:
  - `<g id="shadow">` — `#7a5530` (deep amber), offset 3px to suggest a Riso shadow plate
  - `<g id="ink">` — `#14110d`
  - `<g id="foil">` — `#e85d2f`, used sparingly for highlights (a single point of solar pop per illustration)
- **Postmark ink:** `#14110d` heavy, with deliberate over-inking on rim (3px stroke instead of 1.5px, splotchy character)
- **Foil ticks:** 24 short radial dashes around the outer perimeter of the stamp paper, between the perforations and the border. Solar `#e85d2f` at 85% opacity. Looks like a foil-stamped border on a certificate.
- **Holographic shimmer:** A diagonal band across the illustration zone, ~30° angle, ~12% opacity, gradient from `#e85d2f` → `#f3e0a8` → `#3c6e8c`. Static (no animation) but suggestive of foil reflection.
- **Type colour:** `#14110d` for headings, `#7a5530` (deep amber) for secondary
- **Border embellishment:** Double-frame like Rare, plus the foil tick ring
- **Perforations:** Slight asymmetry — one or two perfs on the right edge are notched/half-punched, the deliberate "misprint" character flaw that makes collector stamps valuable
- **Wordmark variant:** `RUNSTAMP · LIMITED · IN · 2026`

---

## Per-stamp illustrations

The designer agent ships **one SVG per stamp ID** in `apps/mobile/assets/stamp-illustrations/<stamp_id>.svg`, viewBox `0 0 200 200`, with named groups so the tier wrapper can recolor without re-authoring.

All 16 illustrations follow these rules:

- **Style:** woodcut / engraved-line aesthetic. Single weight strokes (~2.4 units) on a 200×200 grid. No fills except via hatching/cross-hatching.
- **Subject matter:** literal but never cute. Always the *thing* the stamp represents, depicted as if engraved on a postage plate. No anthropomorphism (no smiling runners, no thumbs-up). The vibe is "Audubon plate", not "kids book."
- **Composition:** centered subject, slight asymmetry, no perfect symmetry.
- **Negative space:** ~25-35% — illustrations should breathe within their 200×200 box. They look bigger when they aren't crowded.
- **Forbidden:** gradients (use hatching), drop shadows, rounded "modern flat" cartoon style, photoreal, emoji or pictographic shorthand.

### Illustration directory

| Stamp ID | Tier | Category | Subject |
|---|---|---|---|
| `first_5k` | Common | distance | A finish-line banner (`5K FINISH`) drawn as if from a vintage road-race poster — two posts with bunting between them, the banner faintly fluttering. |
| `first_10k` | Common | distance | A clock-faced milestone marker stamped `10 KM` — like a roadside cast-iron marker, viewed from a slight angle. |
| `first_half` | Common | distance | A road stretching into vanishing-point distance with a small `21.1` painted on the asphalt — perspective is hand-drawn, slightly imperfect. |
| `first_marathon` | Rare | distance | An olive wreath circling the numerals `42.2`. The wreath is the subject; the number is centered inside. The classical reference is intentional but not heavy-handed. |
| `lifetime_100km` | Common | distance | A topographic contour map fragment forming a circle — like a small island of contour lines. Suggests "ground covered." |
| `lifetime_500km` | Common | distance | A globe section showing latitude lines — a quarter-globe in line art, looking like it could be from a 1920s atlas. |
| `lifetime_1000km` | Rare | distance | A compass rose, deeply engraved, with all 16 points marked. The accent overlay highlights the N–S axis. |
| `sub_50_10k` | Rare | pace | A stopwatch face, single second hand frozen at 49:something. Crown and pusher buttons visible. |
| `sub_2h_half` | Rare | pace | A hand-drawn chronograph, dual-dial layout (one big dial for hours, one small for seconds). Slightly cracked glass detail at the edge for character. |
| `sub_4_marathon` | Rare | pace | A finish-line tape being broken — viewed from the runner's perspective, the tape stretched across the frame. |
| `sub_345_marathon` | Rare | pace | A laurel sprig (just one branch, not a wreath) with the numerals `3:45` hand-stamped below. The branch is more lyrical than the wreath in `first_marathon`. |
| `sub_3h_marathon` | Mythic | pace | A pair of laurel branches forming an arch, with a sun cresting between them. The foil accent goes on the sun. Triple-print Riso effect makes this the most "ornate" of the line. |
| `boston_q` | Mythic | pace | A unicorn rampant (the Boston Marathon emblem reference) drawn as a heraldic seal — but pared back: just the outline, single colour, no shield. The unicorn is the giveaway; runners will recognise it. Foil accent on the horn tip only. |
| `ultra_50k` | Mythic | distance | A mountain ridge silhouette with three peaks, the middle one taller. Below the ridge: a single bobbing lantern (suggesting night running). Foil accent on the lantern's flame. |
| `cities_5` | Common | place | Five small skyline silhouettes arranged in a horizontal frieze across the bottom third. Each ~25 units wide, all in line-only style. No specific cities; suggest variety (gable, dome, tower, ziggurat, modern). |
| `countries_3` | Rare | place | A passport open to a page, with three small postmark circles overlaid at varied angles — like a well-stamped passport spread. Accent overlay tints the postmark rings. |

### Future stamps (catalog expansion — not v0 deliverable but design ahead)

Reserve illustration concepts for stamps PRD §6.6 implies but aren't shipped yet:

- `first_night_run` (Common · milestone): A crescent moon over a road, single ink.
- `first_subzero` (Common · milestone): A snowflake formed of six radiating road segments.
- `streak_30` (Common · streak): A vertical tally of 30 strokes grouped in 5s, the last group of strokes finished with a cross.
- `streak_100` (Rare · streak): A calendar grid showing a 100-day block, every square crossed.
- `streak_365` (Mythic · streak): A spiral of dates ringing outward, with the centre marked "ONE YEAR."
- `5000km_year` (Mythic · distance): An equator-ringed globe with the runner's path traced as a Riso double-line.
- `every_continent` (Mythic · place): Seven small continent silhouettes around the rim, each with a tick over it.

Designer can produce these speculatively if bandwidth allows.

---

## Postmark cancellation (88×88 component)

The postmark is its own reusable SVG. Designer produces ONE of these — it's the same on every stamp, just with text substituted.

- 88×88 viewBox
- Three concentric circles (outer 2px stroke, middle 1px, inner 1.5px), all in tier ink colour
- Curved text along the outer ring: `<EARN DATE>` on the top arc (12 o'clock to 3 o'clock), `<CITY>` on the bottom arc
- Centre: a small sun glyph (5-point radiating star, the existing `SunMark`)
- **Ink bleed**: 4-6 randomly-placed small ink splotches (1-3px) just outside the outer ring, suggesting the stamp didn't land flat
- **Slight rotation**: the entire SVG should be authored with a -8° rotation (random-looking, fixed for reproducibility)
- Single-colour — recolor via `currentColor`

---

## Wordmark and country code

- **Wordmark:** "RUNSTAMP" in JetBrains Mono Bold, letter-spacing 2.4. Treat the word itself as the country name on the stamp.
- **Country code:** ISO 3166-1 alpha-2 derived from `location_country` of the linked activity (`India → IN`, `United Kingdom → GB`, etc.). If unknown, use `WORLDWIDE`.
- **Year:** stamp earn year.

Designer doesn't need to produce a wordmark asset — it ships as type.

---

## Asset deliverables

To produce, per stamp:

1. **`stamp-illustrations/<id>.svg`** — 200×200 viewBox, named groups (`#shadow`, `#ink`, `#accent`/`#foil` as applicable for the highest tier the stamp is used at — currently Rare needs `ink`+`accent`, Mythic needs `shadow`+`ink`+`foil`). Each illustration should be authored at its highest-tier complexity; the tier wrapper hides layers it doesn't need for lower tiers.

2. **`stamp-postmark.svg`** — 88×88 viewBox, single-color, the rotating ring + sun + ink-bleed.

3. **`stamp-paper-texture.svg`** — 1080×1920 viewBox, a tileable subtle paper-grain texture at 6% opacity, tile-able horizontally and vertically. Used as an overlay on the stamp paper area for all tiers.

4. **`stamp-halftone-overlay.svg`** — 600×600 viewBox, a halftone dot pattern (8px dot pitch), single-colour, used as overlay on Common and Rare tiers.

5. **`stamp-foil-shimmer.svg`** — 600×400 viewBox, the diagonal holographic band gradient used on Mythic. Single SVG with a linearGradient definition; the implementation will mask it to the illustration area.

6. **`runstamp-wordmark.svg`** *(low priority)* — only if the designer wants to ship a more refined letterform than the JetBrains Mono setting. Optional.

**Format requirements**

- All SVGs must use `currentColor` for the recolour-able layer (or named groups for multi-layer). No hard-coded hex values inside SVG `<path>` `fill`/`stroke` — those go in the wrapper component.
- No filter effects (`<filter>`, `<feGaussianBlur>`, etc.) — RN's `react-native-svg` doesn't render them reliably. Achieve grain/blur with stippled dots or multiple thin strokes instead.
- viewBox-only, no fixed `width`/`height` attributes.
- Strokes use `vector-effect="non-scaling-stroke"` only when intentional; default to scaling strokes so they look right at any size.
- Round all coordinates to 0.1 precision (cleans up exporter cruft).

---

## Implementation handoff

Once the designer agent has shipped the SVGs, I'll wire them in:

1. Add an `<id>.tsx` re-export per illustration (auto-generated from the SVG folder using `svgr` or manual `<SvgXml>` wrappers from `react-native-svg`).
2. Replace `StampShareCard.tsx` with the new composition: outer canvas → perforation mask → stamp paper → top plate → illustration (left) + denomination (right) → bottom plate (postmark + name + footer).
3. Build a `<StampIllustration id={stamp.id} tier={stamp.tier} />` component that picks the right SVG and applies the tier's layer treatment.
4. Per-stamp denomination/unit strings live in a map keyed by stamp ID — designer doesn't author these; they're text content. Example: `first_marathon → { big: '42.2', unit: 'KM', secondary: 'MARATHON' }`.

A "fallback" Common-tier composition (current behavior with the SunMark) stays as a graceful degrade for any stamp that doesn't have an SVG yet — so we can ship per-stamp art incrementally without breaking the build.

---

## What's intentionally NOT in this doc

- **Animation on Mythic stamps** — the holographic shimmer is static for now. A future Lottie / Reanimated treatment can layer in. Don't design assets that *require* animation to read.
- **Stamp tear-edge corners** — keep perforations as the only edge treatment. No frayed paper or torn-corner motifs. The stamp metaphor is enough.
- **Personalisation** (avatar, runner name on the stamp) — this is a brand artifact, not a "you" artifact. The runner's name only appears via the share modal, not on the stamp itself.
- **Localised wordmarks** — RUNSTAMP stays in latin script worldwide. Localisation lives elsewhere.

---

## Open questions for the runner-author

- Confirm the `RUNSTAMP · IN · 2026` country-code line works (vs. omitting it for cleaner type).
- Confirm the postmark overlap (bottom-left, intentional offset) reads as "designed", not "broken layout."
- Confirm the per-category Common hue palette (moss / sky / clay / warn / ink) feels right vs. all-Common-uses-moss.

If any of those land "no", the spec adjusts cleanly — they're modular choices, not architectural ones.
