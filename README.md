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

## Deploy (static hosting)

This app is a single-page application (React Router). Host the `dist/` folder on any static provider (Cloudflare Pages, Netlify, Vercel, GitHub Pages, etc.).

| Setting | Value |
|--------|--------|
| Build command | `npm run build` |
| Output directory | `dist` |
| SPA fallback | Serve `index.html` for unknown paths (required for `/tools/*` routes) |

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
