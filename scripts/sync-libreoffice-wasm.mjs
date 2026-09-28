/**
 * Optional: copy LibreOffice WASM assets into public/ for same-origin hosting on Cloudflare Pages.
 * Run once: npm run sync:libreoffice-wasm
 * Then set VITE_LIBREOFFICE_WASM_BASE=/libreoffice-wasm/ and copy worker to public.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pkgWasm = path.join(root, 'node_modules', '@matbee', 'libreoffice-converter', 'wasm');
const outDir = path.join(root, 'public', 'libreoffice-wasm');

const UNPKG = 'https://unpkg.com/@matbee/libreoffice-converter@2.7.2/wasm';
const FILES = ['soffice.js', 'soffice.wasm', 'soffice.data', 'soffice.worker.js'];

async function download(name) {
  const url = `${UNPKG}/${name}`;
  console.log('Downloading', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(path.join(outDir, name), buf);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  for (const name of FILES) {
    const dest = path.join(outDir, name);
    try {
      await fs.access(dest);
      console.log('Skip (exists):', name);
    } catch {
      try {
        await fs.copyFile(path.join(pkgWasm, name), dest);
        console.log('Copied from node_modules:', name);
      } catch {
        await download(name);
      }
    }
  }
  const workerSrc = path.join(root, 'node_modules', '@matbee', 'libreoffice-converter', 'dist', 'browser.worker.global.js');
  const workerDest = path.join(outDir, 'browser.worker.global.js');
  await fs.copyFile(workerSrc, workerDest);
  console.log('Done. Set VITE_LIBREOFFICE_WASM_BASE=/libreoffice-wasm/ and VITE_LIBREOFFICE_WORKER_JS=/libreoffice-wasm/browser.worker.global.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
