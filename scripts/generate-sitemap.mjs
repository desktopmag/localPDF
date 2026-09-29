import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SITE_URL = 'https://bolapdf.com';

const toolsSrc = readFileSync(path.join(root, 'src/lib/tools.js'), 'utf8');
const toolSlugs = [...toolsSrc.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]);

const staticPaths = [
  '/',
  '/tools',
  '/about',
  '/how-it-works',
  '/privacy-manifesto',
  '/faq',
  '/shortcuts',
  '/system-status',
  '/feedback',
];

const paths = [...new Set([...staticPaths, ...toolSlugs.map((s) => `/tools/${s}`)])];
const lastmod = new Date().toISOString().slice(0, 10);

const urls = paths
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}${p === '/' ? '' : p}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${p === '/' ? '1.0' : p.startsWith('/tools/') ? '0.8' : '0.6'}</priority>
  </url>`,
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(path.join(root, 'public/sitemap.xml'), xml, 'utf8');
console.log(`Wrote sitemap with ${paths.length} URLs to public/sitemap.xml`);
