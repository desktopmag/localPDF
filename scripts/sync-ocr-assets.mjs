/**
 * Copies the self-hosted OCR runtime into public/ocr/ so the OCR tool makes NO third-party
 * requests (tesseract.js would otherwise fetch worker, WASM core and language data from jsDelivr).
 *
 *   tesseract.js        (Apache-2.0)  -> worker.min.js
 *   tesseract.js-core   (Apache-2.0)  -> tesseract-core*-lstm.wasm.js  (WASM embedded; browser loads one)
 *   @tesseract.js-data/eng (MIT; Tesseract "best" traineddata, Apache-2.0) -> eng.traineddata.gz
 *
 * Runs automatically via the npm "predev" / "prebuild" hooks. Output is git-ignored.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = (...p) => path.join(root, 'node_modules', ...p);
const out = path.join(root, 'public', 'ocr');
mkdirSync(out, { recursive: true });

const files = [
  [nm('tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js'],
  [nm('tesseract.js-core', 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [nm('tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [nm('tesseract.js-core', 'tesseract-core-relaxedsimd-lstm.wasm.js'), 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  [nm('@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];

for (const [src, name] of files) {
  if (!existsSync(src)) {
    console.error(`sync-ocr-assets: missing ${src} — run "npm install" first.`);
    process.exit(1);
  }
  copyFileSync(src, path.join(out, name));
}
console.log(`sync-ocr-assets: copied ${files.length} files to public/ocr/`);
