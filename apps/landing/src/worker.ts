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

    // /u/<handle> → serve /u/index.html. We rewrite the request URL
    // before forwarding to the assets fetcher so window.location on the
    // client still reads the original path and our script can extract
    // the handle.
    if (url.pathname.startsWith("/u/") && url.pathname !== "/u/" && url.pathname !== "/u/index.html") {
      const rewritten = new URL(req.url);
      rewritten.pathname = "/u/index.html";
      const proxied = await env.ASSETS.fetch(new Request(rewritten, req));
      // Pass through the asset's response but with a 200 status (the
      // assets binding might return 200 already; this is defensive in
      // case of edge cases).
      return new Response(proxied.body, {
        status: 200,
        headers: proxied.headers,
      });
    }

    return env.ASSETS.fetch(req);
  },
};
