/**
 * Renders scripts/assets/og-image.svg to public/og-image.png (1200x630) with resvg (dev dependency).
 *
 *   npm run og:image
 *
 * The PNG is committed so builds do not depend on fonts being installed. The SVG uses Be Vietnam Pro (SIL OFL)
 * and Space Mono (SIL OFL). Point OG_FONT_DIRS at folders that contain them (path-delimited), or place
 * the .ttf files in scripts/assets/fonts/. Without them resvg falls back to a system sans, which changes the look.
 */
import { Resvg } from '@resvg/resvg-js';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(path.join(root, 'scripts', 'assets', 'og-image.svg'), 'utf8');

const dirs = [
  path.join(root, 'scripts', 'assets', 'fonts'),
  ...(process.env.OG_FONT_DIRS ? process.env.OG_FONT_DIRS.split(path.delimiter) : []),
  '/usr/share/fonts/truetype/sand-box/google/Be Vietnam Pro',
  '/usr/share/fonts/truetype/sand-box/google/Space Mono',
].filter((d) => existsSync(d));
const fontFiles = dirs.flatMap((d) => readdirSync(d).filter((f) => /\.(ttf|otf)$/i.test(f)).map((f) => path.join(d, f)));
if (!fontFiles.length) console.warn('generate-og-image: no font files found; text will use resvg fallback fonts.');

const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Be Vietnam Pro' },
}).render();

const out = path.join(root, 'public', 'og-image.png');
writeFileSync(out, png.asPng());
console.log(`generate-og-image: wrote ${path.relative(root, out)} (${png.width}x${png.height})`);
