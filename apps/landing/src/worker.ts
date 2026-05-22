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

interface Env {
  ASSETS: Fetcher;
}

const API_BASE = "https://runstamp-api.gilla.fun";
const SITE_BASE = "https://runstamp.gilla.fun";

// Palette literals — must match the design tokens in Base.astro.
const PAPER = "#f3ede2";
const PAPER2 = "#ebe3d3";
const INK = "#14110d";
const INK3 = "#75695a";
const SOLAR = "#e85d2f";

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
      const handle = url.pathname.slice(3).replace(/\/$/, "");
      const rewritten = new URL(req.url);
      rewritten.pathname = "/u/";
      const proxied = await env.ASSETS.fetch(new Request(rewritten, req));

      const headers = new Headers(proxied.headers);
      headers.delete("location");

      // Rewrite the og:image / twitter:image meta tags so social previews
      // point at the per-handle PNG instead of the static /og.svg fallback.
      const ogUrl = `${SITE_BASE}/u/${encodeURIComponent(handle)}/og.png`;
      const rewriter = new HTMLRewriter()
        .on('meta[property="og:image"]', new MetaContentSetter(ogUrl))
        .on('meta[name="twitter:image"]', new MetaContentSetter(ogUrl))
        .on('meta[property="og:image:width"]', new MetaContentSetter("1200"))
        .on('meta[property="og:image:height"]', new MetaContentSetter("630"))
        .on('meta[name="twitter:card"]', new MetaContentSetter("summary_large_image"));

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

async function serveOgImage(rawHandle: string, ctx: ExecutionContext): Promise<Response> {
  const handle = sanitizeHandle(rawHandle);
  if (!handle) {
    return new Response("bad handle", { status: 400 });
  }

  // Cache the rendered PNG. Stale-while-revalidate keeps shares snappy
  // even when profile stats just changed.
  const cacheKey = new Request(`${SITE_BASE}/u/${handle}/og.png`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const profile = await fetchProfile(handle);
  const html = ogCardHtml(handle, profile);

  const png = new ImageResponse(html, {
    width: 1200,
    height: 630,
    format: "png",
  });

  const headers = new Headers(png.headers);
  headers.set("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
  headers.set("Content-Type", "image/png");
  const final = new Response(png.body, { status: png.status, headers });

  ctx.waitUntil(cache.put(cacheKey, final.clone()));
  return final;
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
  stamps?: Array<{ stampId: string }>;
  cities?: Array<{ city: string; country?: string; runs: number }>;
  yearToDate?: { year: number; runs: number; distanceKm: number };
}

async function fetchProfile(handle: string): Promise<PublicProfile | null> {
  try {
    const r = await fetch(`${API_BASE}/v1/profiles/${encodeURIComponent(handle)}`, {
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (!r.ok) return null;
    return (await r.json()) as PublicProfile;
  } catch {
    return null;
  }
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
  const stampsCount = p?.stamps ? String(p.stamps.length) : "—";
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
<div style="display:flex; flex-direction:column; width:100%; height:100%; background:${PAPER};">
  <!-- Ink hero panel — postcard. -->
  <div style="display:flex; width:100%; height:380px; background:${INK}; padding:54px 72px; align-items:center; justify-content:space-between;">
    <div style="display:flex; flex-direction:column; max-width:760px;">
      <div style="display:flex; font-family:monospace; font-size:18px; color:${SOLAR}; letter-spacing:6px;">@${esc(handle)}</div>
      <div style="display:flex; margin-top:14px;">
        <span style="font-size:96px; line-height:1; color:${PAPER}; letter-spacing:-2px; font-weight:400;">${head ? esc(head) + " " : ""}<span style="color:${SOLAR}; font-style:italic;">${esc(tail)}.</span></span>
      </div>
      <div style="display:flex; margin-top:20px; font-family:monospace; font-size:22px; color:rgba(243,237,226,0.68);">${esc(tagline)}</div>
    </div>
    ${postmarkSvg(homeCity)}
  </div>

  <!-- Paper strip — four big stats. -->
  <div style="display:flex; flex:1; padding:40px 72px; justify-content:space-between; align-items:flex-start;">
    ${statBlock("STAMPS", stampsCount, "")}
    ${statBlock("DISTANCE", lifetimeKm, " km")}
    ${statBlock("RUNS", lifetimeRuns, "")}
    ${statBlock(yearLabel, yearKm, " km")}
  </div>

  <!-- Cancellation rule along the bottom. -->
  <div style="display:flex; width:100%; height:8px; background:${SOLAR}; opacity:0.85;"></div>
</div>`;
}

function statBlock(label: string, value: string, unit: string): string {
  return `
<div style="display:flex; flex-direction:column;">
  <div style="display:flex; font-family:monospace; font-size:18px; color:${INK3}; letter-spacing:4px;">${esc(label)}</div>
  <div style="display:flex; margin-top:14px; font-family:monospace; font-size:84px; color:${INK}; letter-spacing:-3px; font-weight:500;">${esc(value)}<span style="font-size:32px; color:${INK3}; margin-left:6px; align-self:flex-end; padding-bottom:14px;">${esc(unit)}</span></div>
</div>`;
}

function postmarkSvg(city: { city: string; country?: string } | null): string {
  const cityText = city?.city ? city.city.slice(0, 14).toUpperCase() : handleWordmark();
  return `
<div style="display:flex; width:240px; height:240px;">
  <svg width="240" height="240" viewBox="0 0 240 240" style="transform: rotate(-6deg);">
    <circle cx="120" cy="120" r="110" fill="none" stroke="${SOLAR}" stroke-width="2.4" stroke-dasharray="4 4" opacity="0.9"/>
    <circle cx="120" cy="120" r="96" fill="none" stroke="${SOLAR}" stroke-width="1.6" opacity="0.7"/>
    <line x1="22" y1="116" x2="218" y2="116" stroke="${SOLAR}" stroke-width="1.4" opacity="0.55"/>
    <line x1="22" y1="124" x2="218" y2="124" stroke="${SOLAR}" stroke-width="1.4" opacity="0.55"/>
    <text x="120" y="102" text-anchor="middle" font-family="serif" font-style="italic" font-size="26" fill="${PAPER}">${esc(cityText)}</text>
    <text x="120" y="156" text-anchor="middle" font-family="monospace" font-size="12" letter-spacing="3" fill="rgba(243,237,226,0.6)">RUNSTAMP</text>
  </svg>
</div>`;
}

function handleWordmark(): string {
  return "RUNSTAMP";
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
