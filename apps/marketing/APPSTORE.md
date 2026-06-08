# App Store assets

Everything App Store Connect needs for the iOS listing. iPhone-only
(`supportsTablet: false`), so we target Apple's single required slot:
the **6.9" iPhone** set, which auto-scales down to every smaller iPhone.

## Generate everything

```bash
pnpm -F @runstamp/marketing render:appstore
```

Outputs to `apps/marketing/out/appstore/`:

| File | What | Spec |
|---|---|---|
| `01-hero.png` … `06-year.png` | 6 framed screenshots | 1320×2868 PNG |
| `app-icon-1024.png` | Store icon, flattened opaque | 1024×1024 PNG, no alpha |

## Screenshots

Built in Remotion as stills (`src/appstore/`), locked to the brand tokens
in `src/theme.ts`. Each shot = an Instrument-Serif headline + a phone-framed
screen. The set renders out of the box with **designed** screens.

**Real captures (full-bleed):** when a shot has a `capture` set in
`src/appstore/shots.tsx`, the headline renders on paper with that real iOS
screen below it, full-bleed (no device frame) — the most honest input and the
safest under Apple guideline 2.3.3. Drop captures into `public/captures/` with
the fixed filenames and re-render; nothing to edit in code. See
[`public/captures/README.md`](./public/captures/README.md) for the screen list
and `xcrun simctl io booted screenshot` commands. Remove a shot's `capture:`
line to fall back to its designed phone-framed screen.

Copy/headlines live in `src/appstore/shots.tsx`. Order, eyebrow, headline
(one solar accent word), and subhead are all there. Add or reorder shots by
editing `SHOT_LIST` and the `SHOTS` array in `scripts/render-appstore.mjs`.

## App icon

Source of truth is the app's launch icon: **`apps/mobile/assets/icon.png`**
(1024×1024, opaque, square, no pre-rounded corners — iOS masks the rounding).
`render:appstore` scales + flattens it onto paper to guarantee an opaque
1024² store icon. App Store Connect ultimately uses the icon embedded in the
uploaded build, so keep `icon.png` and the store icon in sync (they are, by
construction). Edge-to-edge artwork (e.g. the stamp's perforated border) is
fine — Apple's squircle mask trims the outer corners as intended.

## App preview video (manual — read this)

Apple **app previews are not marketing videos**. They must be captured from
the device screen and must NOT:

- wrap the content in a device frame / bezel,
- reference other platforms ("Android", "iOS + Android"),
- show pricing ("free") or store badges.

So `out/launch-story.mp4` (our Remotion launch film) is **not** App-Store
compliant as a preview — it uses a phone frame and an "iOS + Android / free"
outro. Keep it for Instagram / X. For the actual App Store preview, record
the real app:

```bash
# 6.9" iPhone simulator, app running:
xcrun simctl status_bar booted override --time "9:41" --batteryLevel 100 --cellularBars 4
xcrun simctl io booted recordVideo --codec=h264 --force preview-raw.mov
#  …drive the app through editor → analytics → places → stamps…  Ctrl-C to stop.
```

**6.9" preview spec:** portrait **1320×2868** (or **886×1920**), H.264/HEVC,
**30 fps**, **15–30 s** (hard cap 30.0 s), ≤ 500 MB, stereo AAC. Trim to spec:

```bash
ffmpeg -i preview-raw.mov -t 29.9 -r 30 -vf "scale=886:1920" \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac preview-6.9.mp4
```

A compliant-length social cut of the launch film (still device-framed — for
IG/X, not the store) is available via:

```bash
pnpm -F @runstamp/marketing render:social-cut   # → out/appstore/social-cut-1080x1920.mp4
```

## Upload

In App Store Connect → your app → version → Media: drop the six PNGs into the
**6.9" iPhone** screenshot slot (drag to order them), add the preview video to
the same slot if you have one. The 6.9" set covers all smaller iPhones.
