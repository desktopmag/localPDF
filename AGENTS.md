# AGENTS.md

## Project context

BolaPDF is a standalone Vite + React SPA. PDF tools run in the browser only; there is no server API or auth layer.

Start with [README.md](README.md) for install, dev, build, and deploy.

## Key files

- `src/` — application source
- `vite.config.js` — Vite configuration
- `public/` — static assets (favicon, manifest)
- `index.html` — HTML entry

## Working notes

- Use `npm run dev` for local development.
- Use `npm run build` before deploying static `dist/` output.
- Prefer existing patterns in `src/components` and tool pages under `src/pages/tools/`.
- Run `npm run lint` (and `npm run typecheck` when touching typed paths) before finishing substantive changes.
