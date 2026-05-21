// Tiny entry Worker for the runstamp.gilla.fun deployment.
//
// Sole purpose: rewrite /u/<handle> → /u/index.html so the public profile
// SPA shell serves for any handle URL. Without this, Cloudflare Workers
// Static Assets returns 404 for /u/anything since only /u/index.html is
// a real file on disk. (Cloudflare Pages handles this via _redirects, but
// this project is Workers Static Assets — different product, no _redirects
// support — so the rewrite has to live in code.)
//
// Everything else falls through to ASSETS.fetch(req) untouched, so the
// rest of the site (/, /stamps, /privacy, /og.svg, etc.) works exactly
// the same as before.

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // /u/<handle> → serve the SPA shell at /u/. We rewrite to "/u/" (not
    // "/u/index.html") because Cloudflare's html_handling normalization
    // 307-redirects /u/index.html → /u/ — fetching the file directly
    // would return the redirect response with an empty body and a stale
    // Location header. /u/ resolves to the directory index without that
    // round-trip. window.location on the client still carries the
    // original /u/<handle> path so the page script can read the handle.
    if (url.pathname.startsWith("/u/") && url.pathname !== "/u/") {
      const rewritten = new URL(req.url);
      rewritten.pathname = "/u/";
      const proxied = await env.ASSETS.fetch(new Request(rewritten, req));
      // Strip the Location header in case it leaked through; force 200.
      const headers = new Headers(proxied.headers);
      headers.delete("location");
      return new Response(proxied.body, {
        status: 200,
        headers,
      });
    }

    return env.ASSETS.fetch(req);
  },
};
