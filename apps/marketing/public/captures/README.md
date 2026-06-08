# Real simulator captures → full-bleed App Store screenshots

The shots render each headline on paper with a **real iOS screen capture**
below it (full-bleed, no device frame). Drop your captures here with the exact
filenames below and re-render — there's nothing to edit in code.

| Shot | Filename | Screen to capture |
|---|---|---|
| 1 | `rs-1-home.png` | Home — latest post-run share card |
| 2 | `rs-2-editor.png` | Editor — a card open, template strip visible |
| 3 | `rs-3-analytics.png` | Analytics — VO₂ / MAF / TSB charts |
| 4 | `rs-4-places.png` | Places — passport map + city list |
| 5 | `rs-5-stamps.png` | Stamps — the catalogue grid |
| 6 | `rs-6-year.png` | Year in Stamps — the recap |

(The current files are placeholders — overwrite them.)

## Capture

Boot the **iPhone 16 Pro Max** simulator (the 6.9" device → native
**1320×2868**), then clean the status bar and grab each screen:

```bash
xcrun simctl status_bar booted override --time "9:41" --batteryLevel 100 --batteryState charged --cellularBars 4 --wifiBars 3

# navigate the app to each screen, then:
xcrun simctl io booted screenshot apps/marketing/public/captures/rs-1-home.png
xcrun simctl io booted screenshot apps/marketing/public/captures/rs-2-editor.png
# …and so on for rs-3 … rs-6
```

## Re-render

```bash
pnpm -F @runstamp/marketing render:appstore
```

Outputs `01-hero.png … 06-year.png` (1320×2868) to `out/appstore/`.

> To go back to a designed screen for any shot, delete its `capture:` line in
> `src/appstore/shots.tsx` — it falls back to the phone-framed designed screen.
