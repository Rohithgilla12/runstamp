# Stamp illustrations

One SVG per stamp ID, 200×200 viewBox, single ink weight (`stroke-width="2.4"`), named layer groups so the tier wrapper can recolour without re-authoring.

## Layer convention

| Group `id` | Used by | Recolour role |
|---|---|---|
| `ink` | every tier | primary line work (the subject) |
| `accent` | Rare + Mythic | solar overlay layer, 2px offset to suggest a Riso misregistration |
| `shadow` | Mythic only | deep amber shadow plate, offset behind `ink` to suggest a 3-pass print |
| `foil` | Mythic only | sparse solar highlight ticks (a horn tip, a flame, a flag) |

The tier wrapper component sets each group's `stroke` / `fill` via context. SVGs use `stroke="currentColor"` and DO NOT hardcode hex colours.

## Format rules

- viewBox `0 0 200 200`. No fixed `width`/`height`.
- `stroke-width="2.4"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- `fill="none"` except for halftone dot stippling (then `fill="currentColor"` with no stroke).
- No `<filter>`, no `<feGaussianBlur>`, no SVG animations — `react-native-svg` doesn't render them reliably.
- Round coordinates to 0.5 precision.

## Status

| Stamp | File | Status |
|---|---|---|
| `tata_mumbai_marathon` | `tata_mumbai_marathon.svg` | v0 placeholder by /impeccable |
| `hyderabad_marathon` | `hyderabad_marathon.svg` | v0 placeholder by /impeccable |
| `bengaluru_marathon` | `bengaluru_marathon.svg` | v0 placeholder by /impeccable |
| `ladakh_marathon` | `ladakh_marathon.svg` | v0 placeholder by /impeccable (Mythic 3-layer) |
| `vedanta_delhi_half` | `vedanta_delhi_half.svg` | v0 placeholder by /impeccable |
| `monsoon_run` | `monsoon_run.svg` | v0 placeholder by /impeccable |
| `indian_metros_3` | — | needs designer (frieze composition; depends on the four landmark SVGs above) |

Plus the reusable cancellation glyph:

| Asset | File | Status |
|---|---|---|
| Postmark cancellation | `../stamp-postmark.svg` | v0 placeholder by /impeccable |

The v0 placeholders are competent geometric line drawings — proportions are right, format is compliant, the right landmark is recognisable. They are **not** finished engraving art. Designer agent's job is to refine line-weight character, add stippled stonework hatching, and replace any of these wholesale when a better rendering exists.
