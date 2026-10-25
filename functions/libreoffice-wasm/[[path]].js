/**
 * Same-origin proxy for the LibreOffice WASM runtime (PowerPoint → PDF).
 *
 * Why this exists: the runtime is ~250 MB (soffice.wasm + soffice.data), far above Cloudflare Pages' 25 MiB-per-file
 * static limit, so it can't be shipped in `dist/`. Loading it straight from a CDN fails in the browser, because the
 * emscripten build spawns pthread workers from the script URL and browsers refuse cross-origin Workers. Serving the
 * same bytes from our own origin fixes that. Only the public, versioned runtime files are proxied (an allow-list, so
 * this can't be used as an open proxy) and no user data ever passes through here — documents stay in the browser.
 */
const VERSION = '2.7.2';
const UPSTREAM = `https://unpkg.com/@matbee/libreoffice-converter@${VERSION}/wasm/`;
// soffice.wasm is deliberately octet-stream: the emscripten loader then takes its ArrayBuffer path, which compiles the
// 147 MB module reliably (streaming compile of it hung in testing).
const ALLOWED = {
  'soffice.js': 'text/javascript',
  'soffice.wasm': 'application/octet-stream',
  'soffice.data': 'application/octet-stream',
  'soffice.worker.js': 'text/javascript',
};

export async function onRequestGet({ params, request, env }) {
  const name = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!Object.prototype.hasOwnProperty.call(ALLOWED, name)) {
    // Not a proxied runtime file (for example the small worker script in public/): serve the static asset.
    return env.ASSETS.fetch(request);
  }
  const upstream = await fetch(UPSTREAM + name, {
    headers: request.headers.get('range') ? { range: request.headers.get('range') } : {},
    cf: { cacheEverything: true, cacheTtl: 31536000 },
  });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Upstream error', { status: 502 });
  }
  const headers = new Headers({
    'content-type': ALLOWED[name],
    'cache-control': 'public, max-age=31536000, immutable',
    'cross-origin-resource-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
    'cross-origin-opener-policy': 'same-origin',
    'x-content-type-options': 'nosniff',
  });
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
