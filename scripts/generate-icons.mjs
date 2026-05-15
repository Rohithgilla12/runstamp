#!/usr/bin/env node
/**
 * Render the Runstamp brand mark to the PNG files Expo's prebuild needs.
 *
 * The SunMark + Postmark vocabulary is defined in
 * apps/mobile/src/design/SunMark.tsx — this file holds a standalone SVG
 * with the same geometry so build-time PNGs match the in-app logo
 * exactly. Run via `pnpm icons` when the design changes.
 *
 * Outputs:
 *   apps/mobile/assets/icon.png            1024×1024  solar mark on cream
 *   apps/mobile/assets/adaptive-icon.png   1024×1024  solar mark, transparent (Android adaptive foreground)
 *   apps/mobile/assets/splash-icon.png      512×512   solar mark, transparent (Expo splash)
 *   apps/mobile/assets/notification-icon.png 96×96    monochrome mark for Android notifications
 *   apps/mobile/assets/favicon.png            48×48   web favicon
 *
 * Palette is locked to runstamp's brand tokens — cream paper #f3ede2,
 * solar orange #e85d2f, deep solar #c44a1e.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, '../apps/mobile/assets');
mkdirSync(assetsDir, { recursive: true });

const PAPER = '#f3ede2';
const SOLAR = '#e85d2f';
const DEEP  = '#c44a1e';
const INK   = '#14110d';

/**
 * Returns the SunMark SVG at a given canvas size + background.
 * `bg` of `'transparent'` produces a foreground-only mark for adaptive
 * and splash icons; any color string fills the whole canvas (Apple
 * requires opaque icons, so 'icon.png' uses cream).
 */
function sunMarkSVG({ size, bg, padding = 0.18, color = SOLAR }) {
  const cx = size / 2;
  const cy = size / 2;
  // Inner disc + 8 rays. Same math as src/design/SunMark.tsx,
  // rescaled to the export canvas.
  const innerR = size * (0.5 - padding) * 0.46;
  const innerRayR = size * (0.5 - padding) * 0.68;
  const outerRayR = size * (0.5 - padding) * 1.00;
  const rayWidth = size * 0.014;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 8;
    const x1 = cx + Math.cos(angle) * innerRayR;
    const y1 = cy + Math.sin(angle) * innerRayR;
    const x2 = cx + Math.cos(angle) * outerRayR;
    const y2 = cy + Math.sin(angle) * outerRayR;
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="${rayWidth.toFixed(2)}" stroke-linecap="round"/>`;
  }).join('');
  const backdrop = bg === 'transparent'
    ? ''
    : `<rect width="${size}" height="${size}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${backdrop}
  <circle cx="${cx}" cy="${cy}" r="${innerR.toFixed(2)}" fill="${color}"/>
  ${rays}
</svg>`;
}

function rasterize(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)'
  });
  return resvg.render().asPng();
}

function write(name, png) {
  const out = resolve(assetsDir, name);
  writeFileSync(out, png);
  console.log(`  ${out.replace(process.cwd() + '/', '')}  (${png.length} bytes)`);
}

console.log('Generating Runstamp app icons:');

// iOS app icon (1024×1024, opaque cream — Apple disallows alpha)
write('icon.png',
  rasterize(sunMarkSVG({ size: 1024, bg: PAPER, padding: 0.16, color: SOLAR }), 1024));

// Android adaptive icon foreground (1024×1024, transparent). Background is
// declared in app.config.ts → android.adaptiveIcon.backgroundColor.
write('adaptive-icon.png',
  rasterize(sunMarkSVG({ size: 1024, bg: 'transparent', padding: 0.24, color: SOLAR }), 1024));

// Expo splash icon (Expo composites this on top of `splash.backgroundColor`)
write('splash-icon.png',
  rasterize(sunMarkSVG({ size: 512, bg: 'transparent', padding: 0.22, color: SOLAR }), 512));

// Android notifications — monochrome required by FCM
write('notification-icon.png',
  rasterize(sunMarkSVG({ size: 96, bg: 'transparent', padding: 0.18, color: '#ffffff' }), 96));

// Web favicon
write('favicon.png',
  rasterize(sunMarkSVG({ size: 48, bg: PAPER, padding: 0.16, color: SOLAR }), 48));

console.log('\nDone. Rebuild with `pnpm dlx expo prebuild --clean`.');
