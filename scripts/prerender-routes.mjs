/**
 * Post-build SEO step (runs after `vite build`).
 *
 * For every known route this writes dist/<route>.html: the built SPA shell
 * with route-specific <title>, description, canonical, Open Graph / Twitter tags,
 * JSON-LD, and a small crawlable HTML fallback inside #root (React replaces it on boot).
 * It also writes dist/404.html (noindex), dist/sitemap.xml, and verifies that every
 * <Route path> declared in src/App.jsx is covered.
 *
 * Because every valid URL is a real file, public/_redirects has no SPA catch-all, so
 * Cloudflare Pages answers unknown URLs with a real HTTP 404 (serving 404.html).
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REDIRECTS, getAllRoutePaths, getRouteMeta } from '../src/lib/routeMeta.js';
import { OG_IMAGE_PATH, SITE_NAME, SITE_URL, absoluteUrl } from '../src/lib/site.js';
import { tools } from '../src/lib/tools.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const shell = readFileSync(path.join(dist, 'index.html'), 'utf8');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON inside <script>: neutralise "</script" and "<!--"
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

function stripManagedTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:(title|description|url|type|image)"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:(title|description|image|card)"[^>]*>\s*/gi, '');
}

function headBlock({ title, description, canonical, robots, jsonLd = [] }) {
  const image = absoluteUrl(OG_IMAGE_PATH);
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : '',
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}" />` : '',
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    ...jsonLd.map((b) => `<script type="application/ld+json" data-route-jsonld>${jsonForScript(b)}</script>`),
  ]
    .filter(Boolean)
    .map((l) => `    ${l}`)
    .join('\n');
}

function fallbackBody(meta) {
  const links = tools.map((t) => `<li><a href="/tools/${t.slug}">${esc(t.title)}</a></li>`).join('');
  return `<main data-prerender style="max-width:56rem;margin:0 auto;padding:2rem 1.25rem;font-family:Inter,system-ui,sans-serif;line-height:1.6">
<h1>${esc(meta.heading)}</h1>
<p>${esc(meta.description)}</p>
<nav aria-label="PDF tools"><ul>${links}</ul></nav>
<p><a href="/">${SITE_NAME} home</a> · <a href="/tools">All tools</a> · <a href="/faq">FAQ</a> · <a href="/privacy-manifesto">Privacy</a></p>
</main>`;
}

function render(meta, { robots = 'index, follow, max-image-preview:large', canonical, body = true }) {
  let html = stripManagedTags(shell).replace('</head>', `${headBlock({ ...meta, robots, canonical })}\n  </head>`);
  if (body) {
    html = html.replace('<div id="root"></div>', `<div id="root">${fallbackBody(meta)}</div>`);
  }
  return html;
}

function write(file, content) {
  const target = path.join(dist, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

// 1. Per-route HTML
const paths = getAllRoutePaths();
for (const p of paths) {
  const meta = getRouteMeta(p);
  const canonical = absoluteUrl(p);
  const html = render(meta, { canonical });
  // "/" -> index.html (overwrites the generic shell); "/x/y" -> x/y.html (Cloudflare Pages serves it at the slash-less URL /x/y)
  write(p === '/' ? 'index.html' : `${p.slice(1)}.html`, html);
}

// 2. 404 page: noindex, boots the SPA so <PageNotFound/> renders
write(
  '404.html',
  render(
    {
      title: `Page not found · ${SITE_NAME}`,
      description: `The page you requested could not be found on ${SITE_NAME}.`,
      heading: 'Page not found',
      jsonLd: [],
    },
    { robots: 'noindex, nofollow', canonical: null, body: false },
  ),
);

// 3. sitemap.xml
let lastmod = new Date().toISOString().slice(0, 10);
try {
  lastmod = execSync('git log -1 --format=%cs', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim() || lastmod;
} catch {
  /* not a git checkout (e.g. some CI builds): use today */
}
const urls = paths
  .map((p) => {
    const priority = p === '/' ? '1.0' : p.startsWith('/tools/') ? '0.8' : p === '/tools' ? '0.9' : '0.5';
    return `  <url>
    <loc>${SITE_URL}${p === '/' ? '/' : p}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n');
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

// 4. Guard: every <Route path> in App.jsx must be prerendered or a known redirect
const app = readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const declared = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*');
const covered = new Set([...paths, ...Object.keys(REDIRECTS)]);
const missing = declared.filter((p) => !covered.has(p));
if (missing.length) {
  console.error(`prerender-routes: routes in App.jsx not covered by src/lib/routeMeta.js: ${missing.join(', ')}`);
  process.exit(1);
}
// Redirect table must match public/_redirects
const redirectsFile = readFileSync(path.join(dist, '_redirects'), 'utf8');
for (const [from, to] of Object.entries(REDIRECTS)) {
  if (!redirectsFile.includes(`${from} ${to} 301`)) {
    console.error(`prerender-routes: public/_redirects is missing "${from} ${to} 301"`);
    process.exit(1);
  }
}

console.log(`prerender-routes: wrote ${paths.length} route pages, 404.html, sitemap.xml (lastmod ${lastmod})`);
