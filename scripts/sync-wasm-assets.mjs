/**
 * Copies self-hosted WASM runtimes out of node_modules into public/ so tools make NO third-party
 * requests (tesseract.js would otherwise fetch worker, WASM core and language data from jsDelivr).
 *
 * public/ocr/   OCR tool
 * public/qpdf/  Compress / Protect / Unlock tools (qpdf compiled to WASM; Emscripten spawns its own
 *               pthread workers from qpdf.js, so the JS file must be served as a real URL)
 *
 *   tesseract.js        (Apache-2.0)  -> worker.min.js
 *   tesseract.js-core   (Apache-2.0)  -> tesseract-core*-lstm.wasm.js  (WASM embedded; browser loads one)
 *   @tesseract.js-data/eng (MIT; Tesseract "best" traineddata, Apache-2.0) -> eng.traineddata.gz
 *
 *   qpdf-wasm           (Apache-2.0)  -> qpdf.js, qpdf.wasm  (qpdf 12.x, Apache-2.0)
 *
 * Runs automatically via the npm "predev" / "prebuild" hooks. Output is git-ignored.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = (...p) => path.join(root, 'node_modules', ...p);
const ocrOut = path.join(root, 'public', 'ocr');
const qpdfOut = path.join(root, 'public', 'qpdf');
mkdirSync(ocrOut, { recursive: true });
mkdirSync(qpdfOut, { recursive: true });

const files = [
  [nm('tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js', ocrOut],
  [nm('tesseract.js-core', 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js', ocrOut],
  [nm('tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js', ocrOut],
  [nm('tesseract.js-core', 'tesseract-core-relaxedsimd-lstm.wasm.js'), 'tesseract-core-relaxedsimd-lstm.wasm.js', ocrOut],
  [nm('@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz', ocrOut],
  [nm('qpdf-wasm', 'qpdf.js'), 'qpdf.js', qpdfOut],
  [nm('qpdf-wasm', 'qpdf.wasm'), 'qpdf.wasm', qpdfOut],
];

for (const [src, name, out] of files) {
  if (!existsSync(src)) {
    console.error(`sync-wasm-assets: missing ${src} — run "npm install" first.`);
    process.exit(1);
  }
  copyFileSync(src, path.join(out, name));
}
console.log(`sync-wasm-assets: copied ${files.length} files to public/ocr and public/qpdf`);
