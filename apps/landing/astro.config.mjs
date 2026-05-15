import { defineConfig } from "astro/config";

// Cloudflare Pages deploys Astro static output natively without an adapter.
// The build output (apps/landing/dist/) is uploaded directly to Pages.
// Set Build command: pnpm -F @runstamp/landing build
// Set Build output directory: apps/landing/dist
export default defineConfig({
  output: "static",
  site: "https://runstamp.gilla.fun",
});
