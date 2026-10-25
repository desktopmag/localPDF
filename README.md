# BolaPDF

**BOLA PDF** — Browser-Only Local Access PDF Editor · [bolapdf.com](https://bolapdf.com)

Privacy-first PDF tools that run entirely in your browser. Merge, split, rotate, compress, convert, watermark, sign, and more — no uploads, no backend, no accounts.

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

Production output is in `dist/`.

## Checks

```bash
npm run lint
npm run typecheck
```

## How it works

All PDF processing uses client-side libraries (`pdf-lib`, `pdfjs-dist`, etc.) and Web Workers where needed. Files stay on your device; nothing is sent to a server.

## SEO: per-route pre-rendering

`npm run build` runs `vite build` and then `scripts/prerender-routes.mjs`, which writes `dist/<route>.html` for every route
with its own `<title>`, description, canonical, Open Graph/Twitter tags and JSON-LD (WebApplication + BreadcrumbList per tool),
plus `dist/404.html` (noindex) and `dist/sitemap.xml`. Route metadata lives in `src/lib/routeMeta.js` (shared with the client).

**When you add a page or tool:** add it to `src/lib/tools.js` (tools) or `STATIC_PAGES` in `src/lib/routeMeta.js` (other pages)
*and* add the `<Route>` in `src/App.jsx` — the build fails if a route in `App.jsx` has no pre-rendered page. Alias URLs go in
both `REDIRECTS` (routeMeta) and `public/_redirects`.

## OCR tool

`/tools/ocr` uses Tesseract.js, lazy-loaded. The worker, WASM core and English language data are self-hosted: `npm run dev`/`build`
copy them from `node_modules` into `public/ocr/` (git-ignored) via `scripts/sync-wasm-assets.mjs`. Licence notes: `LICENSES/NOTES.md`.

## Deploy (static hosting)

This app is a single-page application (React Router). Host the `dist/` folder on any static provider (Cloudflare Pages, Netlify, Vercel, GitHub Pages, etc.).

| Setting | Value |
|--------|--------|
| Build command | `npm run build` |
| Output directory | `dist` |
| SPA fallback | **Not needed on Cloudflare Pages.** `npm run build` pre-renders one HTML file per route (see below). On other static hosts, serve `dist/404.html` with a 404 status for unknown paths. |

No environment variables or backend are required for most tools.

### Cloudflare Pages

`public/_headers` is included so **PowerPoint → PDF** (LibreOffice WASM) can use `SharedArrayBuffer`:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

| Setting | Value |
|--------|--------|
| Build command | `npm run build` |
| Output directory | `dist` |

By default the LibreOffice runtime loads from jsDelivr/unpkg CDN (~200 MB, browser-cached). For same-origin WASM (recommended if CDN CORP blocks COEP), run once locally:

```bash
npm run sync:libreoffice-wasm
```

Then build with:

```bash
VITE_LIBREOFFICE_WASM_BASE=/libreoffice-wasm/ VITE_LIBREOFFICE_WORKER_JS=/libreoffice-wasm/browser.worker.global.js npm run build
```

Large `soffice.wasm` / `soffice.data` files live under `public/libreoffice-wasm/` and are copied into `dist/` on build.

## Project layout

- `src/pages/` — marketing and tool pages
- `src/components/` — shared UI and layout
- `public/` — favicon and web manifest
