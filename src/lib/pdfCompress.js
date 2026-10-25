/**
 * Browser-only PDF compression pipeline (everything lazy-loaded, nothing uploaded):
 *
 *  1. pdf-lib walks the object table and finds embedded JPEG (DCTDecode) images.
 *  2. mozjpeg (WASM, @jsquash/jpeg) re-encodes each one at the chosen quality, optionally downscaled;
 *     a re-encode is only kept when it is actually smaller.
 *  3. qpdf (WASM) rewrites the file: object streams, maximum Flate recompression, unreferenced
 *     resources removed.
 *
 * Modes: 'smart' (1+2+3), 'structure' (3 only, lossless), 'flatten' (render pages to mozjpeg images).
 */
import { PDFArray, PDFBool, PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import { createJpegPool } from '@/lib/jpegClient';
import { qpdfTransform } from '@/lib/qpdfClient';

export const PRESETS = {
  low: { label: 'Low quality', hint: 'Smallest file. JPEG quality 50, images capped at 1600 px.', quality: 50, maxDim: 1600, flattenScale: 1.5 },
  medium: { label: 'Medium', hint: 'Recommended. JPEG quality 70, images capped at 2400 px.', quality: 70, maxDim: 2400, flattenScale: 2 },
  high: { label: 'High quality', hint: 'Light compression. JPEG quality 85, no resizing.', quality: 85, maxDim: 0, flattenScale: 2.5 },
};

const QPDF_OPTIMISE = [
  '--object-streams=generate',
  '--recompress-flate',
  '--compression-level=9',
  '--remove-unreferenced-resources=yes',
];

const name = (n) => PDFName.of(n);
const filterNames = (dict, context) => {
  const f = context.lookup(dict.get(name('Filter')));
  if (!f) return [];
  if (f instanceof PDFName) return [f.asString()];
  if (f instanceof PDFArray) return f.asArray().map((x) => context.lookup(x)?.asString?.() ?? '');
  return [];
};

/** @returns {'gray'|'rgb'|null} null = unsupported colour space (CMYK, Indexed, Lab…) */
function colorKind(dict, context) {
  const cs = context.lookup(dict.get(name('ColorSpace')));
  if (cs instanceof PDFName) {
    const n = cs.asString();
    if (n === '/DeviceGray') return 'gray';
    if (n === '/DeviceRGB') return 'rgb';
    return null;
  }
  if (cs instanceof PDFArray && cs.size() >= 2 && context.lookup(cs.get(0))?.asString?.() === '/ICCBased') {
    const prof = context.lookup(cs.get(1));
    const n = prof?.dict?.get?.(name('N'));
    const comps = n instanceof PDFNumber ? n.asNumber() : 0;
    return comps === 1 ? 'gray' : comps === 3 ? 'rgb' : null;
  }
  return null;
}

function findJpegImages(doc) {
  const { context } = doc;
  const found = [];
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (d.get(name('Subtype')) !== name('Image')) continue;
    const filters = filterNames(d, context);
    if (filters.length !== 1 || filters[0] !== '/DCTDecode') continue;
    const bpc = d.get(name('BitsPerComponent'));
    if (bpc instanceof PDFNumber && bpc.asNumber() !== 8) continue;
    if (d.has(name('Decode'))) continue; // inverted / remapped samples
    const mask = context.lookup(d.get(name('Mask')));
    if (mask instanceof PDFArray) continue; // colour-key mask would break under lossy re-encode
    const im = context.lookup(d.get(name('ImageMask')));
    if (im instanceof PDFBool && im.asBoolean()) continue;
    const kind = colorKind(d, context);
    if (!kind) continue;
    found.push({ ref, stream: obj, kind });
  }
  return found;
}

async function recompressImages(doc, preset, { onProgress, signal }) {
  const images = findJpegImages(doc);
  const stats = { found: images.length, recompressed: 0, before: 0, after: 0 };
  if (!images.length) return stats;
  const pool = createJpegPool();
  try {
    let i = 0;
    for (const { ref, stream, kind } of images) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      i += 1;
      onProgress?.({ phase: 'images', done: i - 1, total: images.length });
      const original = stream.contents;
      stats.before += original.length;
      let res;
      try {
        res = await pool.recompress(original.slice().buffer, { quality: preset.quality, maxDim: preset.maxDim, gray: kind === 'gray' });
      } catch {
        stats.after += original.length; // undecodable (e.g. unusual JPEG): leave untouched
        continue;
      }
      if (res.bytes.byteLength < original.length * 0.98) {
        const dict = stream.dict.clone(doc.context);
        dict.set(name('Width'), PDFNumber.of(res.width));
        dict.set(name('Height'), PDFNumber.of(res.height));
        dict.set(name('Length'), PDFNumber.of(res.bytes.byteLength));
        doc.context.assign(ref, PDFRawStream.of(dict, new Uint8Array(res.bytes)));
        stats.recompressed += 1;
        stats.after += res.bytes.byteLength;
      } else {
        stats.after += original.length;
      }
    }
    onProgress?.({ phase: 'images', done: images.length, total: images.length });
  } finally {
    pool.terminate();
  }
  return stats;
}

async function flattenToImages(file, preset, { onProgress, signal }) {
  const { getPdfjs, renderPageCanvas } = await import('@/lib/pdfUtils');
  const src = await getPdfjs(file);
  const out = await PDFDocument.create();
  const pool = createJpegPool();
  try {
    for (let p = 1; p <= src.numPages; p += 1) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      onProgress?.({ phase: 'pages', done: p - 1, total: src.numPages });
      const canvas = await renderPageCanvas(src, p, preset.flattenScale);
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const { width, height } = canvas;
      const res = await pool.encode(imageData, preset.quality);
      const jpg = await out.embedJpg(new Uint8Array(res.bytes));
      // keep the original page size in points; the image just carries more or fewer pixels
      const pw = width / preset.flattenScale;
      const ph = height / preset.flattenScale;
      out.addPage([pw, ph]).drawImage(jpg, { x: 0, y: 0, width: pw, height: ph });
    }
    onProgress?.({ phase: 'pages', done: src.numPages, total: src.numPages });
  } finally {
    pool.terminate();
    await src.destroy();
  }
  return out.save({ useObjectStreams: false });
}

/**
 * @param {File} file
 * @param {{ mode?: 'smart'|'structure'|'flatten', preset?: keyof typeof PRESETS, onProgress?: Function, signal?: AbortSignal }} opts
 * @returns {Promise<{ bytes: Uint8Array, usedOriginal: boolean, images: object|null, originalSize: number }>}
 */
export async function compressPdf(file, { mode = 'smart', preset = 'medium', onProgress, signal } = {}) {
  const cfg = PRESETS[preset] ?? PRESETS.medium;
  const original = new Uint8Array(await file.arrayBuffer());
  let working = original;
  let images = null;

  if (mode === 'flatten') {
    working = await flattenToImages(file, cfg, { onProgress, signal });
  } else if (mode === 'smart') {
    let doc;
    try {
      doc = await PDFDocument.load(original, { updateMetadata: false });
    } catch (e) {
      if (/encrypt/i.test(e?.message || '')) throw new Error('This PDF is password-protected. Unlock it first, then compress.');
      doc = null; // pdf-lib could not parse it: fall back to qpdf-only optimisation
    }
    if (doc) {
      images = await recompressImages(doc, cfg, { onProgress, signal });
      if (images.recompressed > 0) working = await doc.save({ useObjectStreams: false });
    }
  }

  onProgress?.({ phase: 'optimise', done: 0, total: 1 });
  const { bytes } = await qpdfTransform(working, QPDF_OPTIMISE, { signal });
  onProgress?.({ phase: 'optimise', done: 1, total: 1 });

  // A compressor must never inflate the file.
  if (bytes.byteLength >= original.byteLength) {
    return { bytes: original, usedOriginal: true, images, originalSize: original.byteLength };
  }
  return { bytes, usedOriginal: false, images, originalSize: original.byteLength };
}


