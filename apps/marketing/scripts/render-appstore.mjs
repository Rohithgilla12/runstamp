// Render the App Store asset set:
//   • 6 framed screenshots (1320×2868) via `remotion still`
//   • the 1024×1024 app icon, flattened opaque (App Store rejects alpha)
// Run from the package: `pnpm -F @runstamp/marketing render:appstore`.

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

// Order mirrors SHOT_LIST in src/appstore/shots.tsx — keep in sync.
const SHOTS = ["hero", "editor", "analytics", "places", "stamps", "year"];

const OUT = "out/appstore";
mkdirSync(OUT, { recursive: true });

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

console.log(`\n▸ Rendering ${SHOTS.length} App Store screenshots → ${OUT}/`);
// `remotion` is on PATH because pnpm injects node_modules/.bin when running
// the package script; child processes inherit it. (Avoids npx flakiness.)
SHOTS.forEach((id, i) => {
  const n = String(i + 1).padStart(2, "0");
  run(`remotion still AppStore-${id} ${OUT}/${n}-${id}.png`);
});

console.log(`\n▸ Flattening app icon → ${OUT}/app-icon-1024.png`);
// Scale the source icon to 1024² and composite it over solid paper, so any
// size or transparency lands as an opaque 1024×1024 store icon.
run(
  `ffmpeg -y -f lavfi -i color=c=0xF3EDE2:s=1024x1024 -i ../mobile/assets/icon.png ` +
    `-filter_complex "[1]scale=1024:1024[ic];[0][ic]overlay,format=rgb24" -frames:v 1 ${OUT}/app-icon-1024.png`
);

console.log(`\n✓ Done. App Store assets in apps/marketing/${OUT}/`);
console.log("  → screenshots: upload to the 6.9\" iPhone slot in App Store Connect.");
console.log("  → app-icon-1024.png: the store icon (1024×1024, opaque, no rounding).");
console.log("  → app preview VIDEO is a separate, screen-recorded asset — see APPSTORE.md.\n");
