// Tiny entry Worker for the runstamp.gilla.fun deployment.
//
// Two jobs:
//   1. Rewrite /u/<handle> → /u/ so the public-profile SPA shell serves
//      for any handle URL, and inject a per-handle og:image meta tag
//      pointing at /u/<handle>/og.png so social previews show real stats.
//   2. Serve /u/<handle>/og.png — fetches profile JSON from the API and
//      renders an OG card via workers-og (Satori + resvg-wasm). Cached.
//
// Everything else falls through to ASSETS.fetch(req) untouched, so the
// rest of the site (/, /stamps, /privacy, /og.svg, etc.) works exactly
// the same as before.

import { ImageResponse } from "workers-og";
import { selectStripStamps, type StripStamp } from "./og/stampStrip";

interface Env {
  ASSETS: Fetcher;
}

const API_BASE = "https://runstamp-api.gilla.fun";
const SITE_BASE = "https://runstamp.gilla.fun";
const CACHE_VERSION = "5";

// Palette literals — must match the design tokens in Base.astro.
const PAPER = "#f3ede2";
const PAPER2 = "#ebe3d3";
const INK = "#14110d";
const INK3 = "#75695a";
const SOLAR = "#e85d2f";
const MOSS = "#4a6b3a";

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // /u/<handle>/og.png — dynamic OG card.
    const ogMatch = url.pathname.match(/^\/u\/([^/]+)\/og\.png$/);
    if (ogMatch) {
      return serveOgImage(ogMatch[1], ctx);
    }

    // /u/<handle> → serve the SPA shell at /u/. We rewrite to "/u/" (not
    // "/u/index.html") because Cloudflare's html_handling normalization
    // 307-redirects /u/index.html → /u/. Fetching the file directly would
    // return the redirect with an empty body. /u/ resolves to the directory
    // index without that round-trip. window.location on the client still
    // carries the original /u/<handle> path so the page script can read it.
    if (url.pathname.startsWith("/u/") && url.pathname !== "/u/") {
      const rawHandle = url.pathname.slice(3).replace(/\/$/, "");
      const handle = sanitizeHandle(rawHandle) ?? rawHandle;

      // Parallel: fetch the SPA shell + the profile JSON. We need the
      // profile to set per-handle og:title / og:description; ~50ms extra
      // worst-case, amortized by Cloudflare's HTTP cache on the API call.
      const rewritten = new URL(req.url);
      rewritten.pathname = "/u/";
      const [proxied, profile] = await Promise.all([
        env.ASSETS.fetch(new Request(rewritten, req)),
        fetchProfile(handle),
      ]);

      const headers = new Headers(proxied.headers);
      headers.delete("location");

      const meta = buildMeta(handle, profile);
      const rewriter = new HTMLRewriter()
        .on("title", new TextSetter(meta.title))
        .on('meta[name="description"]', new MetaContentSetter(meta.description))
        .on('meta[property="og:title"]', new MetaContentSetter(meta.title))
        .on('meta[property="og:description"]', new MetaContentSetter(meta.description))
        .on('meta[property="og:url"]', new MetaContentSetter(meta.canonical))
        .on('meta[property="og:image"]', new MetaContentSetter(meta.ogImage))
        .on('meta[name="twitter:title"]', new MetaContentSetter(meta.title))
        .on('meta[name="twitter:description"]', new MetaContentSetter(meta.description))
        .on('meta[name="twitter:image"]', new MetaContentSetter(meta.ogImage))
        .on('meta[name="twitter:card"]', new MetaContentSetter("summary_large_image"))
        .on('meta[property="og:image:width"]', new MetaContentSetter("1200"))
        .on('meta[property="og:image:height"]', new MetaContentSetter("630"))
        .on('link[rel="canonical"]', new HrefSetter(meta.canonical));

      return rewriter.transform(new Response(proxied.body, { status: 200, headers }));
    }

    return env.ASSETS.fetch(req);
  },
};

class MetaContentSetter {
  constructor(private value: string) {}
  element(el: Element) {
    el.setAttribute("content", this.value);
  }
}

class HrefSetter {
  constructor(private value: string) {}
  element(el: Element) {
    el.setAttribute("href", this.value);
  }
}

class TextSetter {
  constructor(private value: string) {}
  element(el: Element) {
    el.setInnerContent(this.value);
  }
}

interface MetaBundle {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
}

function buildMeta(handle: string, p: PublicProfile | null): MetaBundle {
  const canonical = `${SITE_BASE}/u/${handle}`;
  const ogImage = `${SITE_BASE}/u/${encodeURIComponent(handle)}/og.png`;
  const displayName = p?.displayName?.trim() || `@${handle}`;
  const t = p?.totals;
  const ytd = p?.yearToDate;
  const stampsCount = p?.stamps?.length ?? 0;

  // Title aims for ~50–60 chars — long enough for unfurlers to render
  // confidently, short enough to not get truncated. Append the headline
  // stat when we have it; otherwise fall back to a neutral framing.
  let title: string;
  if (t && t.runs > 0) {
    const km = Math.round(t.distanceKm).toLocaleString();
    title = `${displayName} — ${km} km, ${t.runs} runs, ${stampsCount} stamps · Runstamp`;
  } else {
    title = `${displayName}'s runner album on Runstamp — collect a stamp for every run`;
  }

  // Description aims for ~110–160 chars. YTD if available, then lifetime
  // context, then the brand line so unfurlers always get something rich.
  let description: string;
  if (ytd && ytd.distanceKm > 0 && t) {
    const ytdKm = Math.round(ytd.distanceKm).toLocaleString();
    const lifeKm = Math.round(t.distanceKm).toLocaleString();
    description = `${ytdKm} km in ${ytd.year} so far. Lifetime: ${lifeKm} km across ${t.runs} runs in ${t.cities} cities, ${t.countries} countries, with ${stampsCount} stamps earned. Read the album on Runstamp.`;
  } else if (t && t.runs > 0) {
    const km = Math.round(t.distanceKm).toLocaleString();
    description = `A public stamp album: ${km} km across ${t.runs} runs in ${t.cities} cities, ${t.countries} countries. ${stampsCount} stamps earned. Read the full album on Runstamp.`;
  } else {
    description = "A public stamp album on Runstamp — every city, every PB, every run. Collect a stamp for every run; share the album when you want to flaunt.";
  }

  return { title, description, canonical, ogImage };
}

async function serveOgImage(rawHandle: string, ctx: ExecutionContext): Promise<Response> {
  const handle = sanitizeHandle(rawHandle);
  if (!handle) {
    return new Response("bad handle", { status: 400 });
  }

  // Bump CACHE_VERSION to invalidate stale renders after a layout change.
  // Cache lives at Cloudflare's edge with up to 1h s-maxage, so without
  // this, old PNGs survive deploys until TTL expiry.
  const cacheKey = new Request(`${SITE_BASE}/u/${handle}/og.png?v=${CACHE_VERSION}`);
  // caches.default is a Cloudflare Workers global absent from the DOM CacheStorage lib type.
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchProfileResult(handle);
    const profile = res.kind === "ok" ? res.profile : null;
    const html = ogCardHtml(handle, profile);

    // workers-og returns a streaming body. Returning the body directly
    // works, but consuming it twice (once for cache.put, once for the
    // response) leaves one side empty. Buffer to ArrayBuffer once.
    const png = new ImageResponse(html, { width: 1200, height: 630, format: "png" });
    const buf = await png.arrayBuffer();

    if (res.kind === "error") {
      // Transient upstream failure — serve the degraded card but don't freeze
      // it into the cache, so it recovers as soon as the API is back.
      return new Response(buf, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
      });
    }

    const headers = new Headers({
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    });
    ctx.waitUntil(cache.put(cacheKey, new Response(buf, { status: 200, headers })));
    return new Response(buf, { status: 200, headers });
  } catch (err) {
    // Surface the failure rather than letting Cloudflare wrap it in a
    // generic 1101. Useful for live debugging; the static /og.svg keeps
    // unfurlers happy because Base.astro's default points to it.
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return new Response(`og render failed: ${msg}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

function sanitizeHandle(s: string): string | null {
  // Handles are lowercase alphanumeric + underscore (mirrors users repo).
  if (!/^[a-z0-9_]{1,32}$/i.test(s)) return null;
  return s.toLowerCase();
}

interface PublicProfile {
  handle: string;
  displayName?: string;
  totals?: { runs: number; distanceKm: number; countries: number; cities: number };
  stamps?: StripStamp[];
  cities?: Array<{ city: string; country?: string; runs: number }>;
  yearToDate?: { year: number; runs: number; distanceKm: number };
}

type ProfileFetch =
  | { kind: "ok"; profile: PublicProfile }
  | { kind: "missing" }
  | { kind: "error" };

// fetchProfileResult distinguishes a real 404 (missing/private handle —
// cacheable) from a transient failure (5xx/429/network/parse — must not be
// cached, or an outage freezes into the OG image). Logs failures so blank
// cards are debuggable via `wrangler tail`.
async function fetchProfileResult(handle: string): Promise<ProfileFetch> {
  try {
    const r = await fetch(`${API_BASE}/v1/profiles/${encodeURIComponent(handle)}`, {
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (r.status === 404) return { kind: "missing" };
    if (!r.ok) {
      console.warn("fetchProfile non-ok", { handle, status: r.status });
      return { kind: "error" };
    }
    return { kind: "ok", profile: (await r.json()) as PublicProfile };
  } catch (err) {
    console.error("fetchProfile failed", { handle, err: err instanceof Error ? err.message : String(err) });
    return { kind: "error" };
  }
}

// fetchProfile keeps the graceful-null contract for the SPA meta path, where
// a missing/failed profile just downgrades og:title/description.
async function fetchProfile(handle: string): Promise<PublicProfile | null> {
  const res = await fetchProfileResult(handle);
  return res.kind === "ok" ? res.profile : null;
}

// ogCardHtml builds the OG card markup that Satori renders. Flexbox-only
// (Satori doesn't support grid). The design borrows from the page hero:
// ink panel up top with the runner's name in italic serif and a postmark
// circle, paper strip below with key stats.
function ogCardHtml(handle: string, p: PublicProfile | null): string {
  const name = p?.displayName?.trim() || handle;
  const totals = p?.totals;
  const ytd = p?.yearToDate;
  const homeCity = pickHomeCity(p);

  const lifetimeKm = totals ? Math.round(totals.distanceKm).toLocaleString() : "—";
  const lifetimeRuns = totals ? String(totals.runs) : "—";
  const yearKm = ytd ? Math.round(ytd.distanceKm).toLocaleString() : "—";
  const yearLabel = ytd ? String(ytd.year) : "THIS YEAR";

  // Last name italicised — same trick the page hero does.
  const parts = name.split(" ");
  const head = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const tail = parts.length > 1 ? parts[parts.length - 1] : name;

  const tagline =
    totals
      ? `${totals.cities} ${totals.cities === 1 ? "city" : "cities"} · ${totals.countries} ${totals.countries === 1 ? "country" : "countries"} · ${lifetimeKm} km`
      : `a runner's album on Runstamp`;

  return `
<div style="display:flex; flex-direction:column; width:1200px; height:630px; background:${PAPER};">
  <!-- Ink hero panel — postcard. -->
  <div style="display:flex; width:1200px; height:300px; background:${INK}; padding:44px 72px; align-items:center; justify-content:space-between;">
    <div style="display:flex; flex-direction:column; max-width:760px;">
      <div style="display:flex; font-family:monospace; font-size:18px; color:${SOLAR}; letter-spacing:6px;">@${esc(handle)}</div>
      <div style="display:flex; margin-top:14px;">
        <span style="font-size:96px; line-height:1; color:${PAPER}; letter-spacing:-2px; font-weight:400;">${head ? esc(head) + " " : ""}<span style="color:${SOLAR}; font-style:italic;">${esc(tail)}.</span></span>
      </div>
      <div style="display:flex; margin-top:20px; font-family:monospace; font-size:22px; color:rgba(243,237,226,0.68);">${esc(tagline)}</div>
    </div>
    ${postmarkSvg(homeCity)}
  </div>

  <!-- Stamp strip — rarest-first earned stamps. -->
  ${stampStripBlock(p)}

  <!-- Paper strip — three big stats. -->
  <div style="display:flex; width:1200px; flex:1; padding:18px 72px 12px 72px; justify-content:space-between; align-items:flex-start;">
    ${statBlock("DISTANCE", lifetimeKm, " km")}
    ${statBlock("RUNS", lifetimeRuns, "")}
    ${statBlock(yearLabel, yearKm, " km")}
  </div>

  <!-- CTA strip — postal address line + action. -->
  <div style="display:flex; width:1200px; padding:0 72px 18px 72px; justify-content:space-between; align-items:center;">
    <div style="display:flex; font-family:monospace; font-size:18px; color:${INK3}; letter-spacing:3px;">RUNSTAMP.GILLA.FUN / U / ${esc(handle.toUpperCase())}</div>
    <div style="display:flex; font-family:monospace; font-size:18px; color:${SOLAR}; letter-spacing:3px;">READ THE ALBUM →</div>
  </div>

  <!-- Cancellation rule along the bottom. -->
  <div style="display:flex; width:1200px; height:8px; background:${SOLAR}; opacity:0.85;"></div>
</div>`;
}

function statBlock(label: string, value: string, unit: string): string {
  return `
<div style="display:flex; flex-direction:column;">
  <div style="display:flex; font-family:monospace; font-size:18px; color:${INK3}; letter-spacing:4px;">${esc(label)}</div>
  <div style="display:flex; margin-top:10px; font-family:monospace; font-size:54px; color:${INK}; letter-spacing:-2px; font-weight:500;">${esc(value)}<span style="font-size:22px; color:${INK3}; margin-left:6px; align-self:flex-end; padding-bottom:8px;">${esc(unit)}</span></div>
</div>`;
}

function tierColor(tier?: string): string {
  return tier === "mythic" ? SOLAR : tier === "rare" ? MOSS : INK3;
}

// stampTile — a single perforated postage-style tile: tier dot + truncated name.
function stampTile(s: { name?: string; tier?: string }): string {
  const label = (s.name ?? "STAMP").slice(0, 14);
  return `
<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:170px; height:76px; background:${PAPER2}; border:2px dashed ${INK3}; border-radius:10px; padding:8px;">
  <div style="display:flex; width:11px; height:11px; border-radius:9999px; background:${tierColor(s.tier)};"></div>
  <div style="display:flex; margin-top:6px; font-family:monospace; font-size:13px; color:${INK}; text-align:center; line-height:1.1;">${esc(label)}</div>
</div>`;
}

// stampStripBlock — the "STAMPS EARNED" row: rarest-first tiles + "+N".
function stampStripBlock(p: PublicProfile | null): string {
  const all = p?.stamps ?? [];
  const inner =
    all.length === 0
      ? `<div style="display:flex; width:170px; height:76px; align-items:center; justify-content:center; background:${PAPER2}; border:2px dashed ${INK3}; border-radius:10px; font-family:monospace; font-size:14px; color:${INK3};">no stamps yet</div>`
      : (() => {
          const { shown, extra } = selectStripStamps(all, 5);
          const tiles = shown.map(stampTile).join("");
          const more =
            extra > 0
              ? `<div style="display:flex; align-items:center; font-family:monospace; font-size:30px; color:${INK3};">+${extra}</div>`
              : "";
          return tiles + more;
        })();

  return `
<div style="display:flex; flex-direction:column; width:1200px; padding:16px 72px 0 72px;">
  <div style="display:flex; font-family:monospace; font-size:18px; color:${INK3}; letter-spacing:4px;">STAMPS EARNED</div>
  <div style="display:flex; margin-top:12px; gap:14px; align-items:center;">${inner}</div>
</div>`;
}

function postmarkSvg(city: { city: string; country?: string } | null): string {
  // Satori doesn't support SVG <text> nodes — build the postmark as
  // nested HTML divs with border-radius:50% acting as concentric rings,
  // and put the city name as a positioned div in the middle.
  const cityText = city?.city ? city.city.slice(0, 14).toUpperCase() : "RUNSTAMP";
  return `
<div style="display:flex; width:240px; height:240px; align-items:center; justify-content:center; position:relative;">
  <div style="display:flex; width:220px; height:220px; border-radius:9999px; border:2px dashed ${SOLAR}; opacity:0.9; position:absolute;"></div>
  <div style="display:flex; width:192px; height:192px; border-radius:9999px; border:1px solid ${SOLAR}; opacity:0.7; position:absolute;"></div>
  <div style="display:flex; width:192px; height:1px; background:${SOLAR}; opacity:0.55; position:absolute; transform:translateY(-4px);"></div>
  <div style="display:flex; width:192px; height:1px; background:${SOLAR}; opacity:0.55; position:absolute; transform:translateY(4px);"></div>
  <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;">
    <div style="display:flex; font-family:serif; font-style:italic; font-size:26px; color:${PAPER};">${esc(cityText)}</div>
    <div style="display:flex; margin-top:14px; font-family:monospace; font-size:12px; letter-spacing:3px; color:rgba(243,237,226,0.6);">RUNSTAMP</div>
  </div>
</div>`;
}

type CityEntry = NonNullable<PublicProfile["cities"]>[number];

function pickHomeCity(p: PublicProfile | null): CityEntry | null {
  if (!p?.cities || p.cities.length === 0) return null;
  return p.cities.reduce<CityEntry | null>(
    (best, c) => (!best || c.runs > best.runs ? c : best),
    null,
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
