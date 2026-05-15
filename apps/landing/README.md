# @runstamp/landing

Marketing landing page for [runstamp.gilla.fun](https://runstamp.gilla.fun). Built with Astro 5 + vanilla CSS, zero client-side JS, static output for Cloudflare Pages.

## Local development

```bash
pnpm install         # from the monorepo root
pnpm -F @runstamp/landing dev
```

## Build

```bash
pnpm -F @runstamp/landing build
# Output: apps/landing/dist/
```

## Deploy to Cloudflare Pages

1. Create a Pages project pointing at this repository.
2. Set **Build command** to `pnpm -F @runstamp/landing build`.
3. Set **Build output directory** to `apps/landing/dist`.
4. In your DNS provider, add a CNAME record: `runstamp.gilla.fun → <your-pages-project>.pages.dev`.

The `astro.config.mjs` already uses `@astrojs/cloudflare` with `output: "static"`, so the full site is prerendered at build time — no Workers runtime required.
