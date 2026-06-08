---
name: run-web
description: Launch and drive the Runstamp web app (apps/landing — the Astro + Cloudflare Worker profile site at runstamp.gilla.fun). Use when running, serving, screenshotting, or driving the landing site / public profile pages (/u/<handle>) or the dynamic OG images (/u/<handle>/og.png) locally.
---

# Run the Runstamp web app (apps/landing)

`apps/landing` is an **Astro static site + a Cloudflare Worker** (`src/worker.ts`,
wired by `wrangler.jsonc`). The marketing pages are static, but the public
**profile page `/u/<handle>`** and the **dynamic OG image `/u/<handle>/og.png`**
are served by the Worker (it rewrites `/u/*` to the SPA shell and renders the OG
PNG via `workers-og`). So `astro dev` alone does NOT serve a profile URL — you
must run the Worker with `wrangler dev` over a built `dist/`.

## Launch

```bash
cd apps/landing
pnpm build                                   # produces dist/ — the Worker's ASSETS binding serves it
pnpm dlx wrangler@4 dev --port 8788 --ip 127.0.0.1   # wrangler is NOT a dep; dlx fetches it
```

- `wrangler dev` bundles `src/worker.ts` live and **hot-reloads on save** — edit
  the worker and re-fetch, no restart.
- Wait for "Ready on http://127.0.0.1:8788". Poll instead of guessing:
  `curl -s --retry 40 --retry-connrefused --retry-delay 1 -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8788/u/rohithgilla`

## Drive it

The Worker fetches profile JSON from the **production API**
(`https://runstamp-api.gilla.fun`), so use a **real, public** handle. A known
good one: **`rohithgilla`**.

**Profile page** (hydrates client-side — fetch is async, so it shows "Loading…"
for a beat before rendering):
```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:8788/u/rohithgilla   # 200 text/html
```
Then drive it in a browser to confirm it actually renders (not stuck on
"Loading…"). With the Playwright MCP tools:
- `browser_navigate` → `http://127.0.0.1:8788/u/rohithgilla`
- `browser_snapshot` → confirm the accessibility tree shows the header
  (`@rohithgilla`, name, "N cities · N countries · N km"), the LIFETIME /
  EARNED / PASSPORT sections, stamp names, and PB cards. A tree that still says
  only "Loading…" means the API fetch hasn't resolved — snapshot again.

**OG image** (pure Worker, no hydration):
```bash
curl -s -o /tmp/og.png -w "%{http_code} %{size_download}\n" http://127.0.0.1:8788/u/rohithgilla/og.png
file -b /tmp/og.png    # PNG image data, 1200 x 630
```

## Gotchas (the stuff that cost time)

- **`astro dev` won't serve `/u/<handle>`** — the `/u/*` rewrite is
  `run_worker_first` in `wrangler.jsonc`; only `wrangler dev` runs the Worker.
- **Local API changes aren't reflected** — the Worker hits the prod API. To test
  against unreleased API data you'd have to point `API_BASE` at a local API.
- **OG cache is sticky across hot-reloads.** `serveOgImage` caches in
  `caches.default` keyed on `CACHE_VERSION`. After editing OG layout, the old
  PNG is re-served until you **bump `CACHE_VERSION`** in `src/worker.ts` (or the
  byte size won't change between renders — that's the tell it served cache).
- **`.wrangler/` is gitignored** (local dev state) — don't commit it.
- A `favicon.ico` 404 in the browser console is **benign**.
- **Playwright MCP screenshots may not land on the local filesystem** (the
  browser is sandboxed) — `browser_snapshot` (accessibility tree) is the
  reliable way to verify rendered content here.

## Stop

```bash
pkill -f wrangler; pkill -f workerd
```
(and `browser_close` if you used the Playwright MCP browser).
