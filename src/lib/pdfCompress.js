/**
 * Browser-only PDF compression engine (nothing is uploaded; runs inside a Web Worker, see compress.worker.js).
 *
 * Pipeline ("smart" mode):
 *  1. pdf-lib parses the file; every image XObject is found (JPEG/DCT and lossless Flate RGB/Gray photos).
 *  2. pdfContentScan measures how large each image is actually painted -> its effective DPI.
 *  3. Identical images are de-duplicated (one copy kept, every reference re-pointed to it).
 *  4. Each unique image goes to a mozjpeg worker (pool): down-sample to the level's target DPI, grayscale
 *     detection, lossless-PNG-photo -> JPEG, then a binary search for the lowest JPEG quality whose SSIM
 *     stays above the level's threshold. A result is only kept when it is really smaller.
 *  5. Page thumbnails (and optionally XMP/Info metadata) are dropped.
 *  6. qpdf (WASM) rewrites the file: object streams, max-level Flate recompression, unreferenced resources removed.
 *
 * "Target size" mode runs the pipeline on a quality ladder and bisects it to find the best quality that fits.
 * Modes 'structure' (qpdf only, lossless) and 'flatten' (pdfFlatten.js, main thread) share the finishing step.
 * This module must stay DOM-free so it can run in a worker.
 */
import { PDFArray, PDFDict, PDFBool, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef } from 'pdf-lib';
import { createJpegPool } from '@/lib/jpegClient';
import { qpdfTransform } from '@/lib/qpdfClient';
import { collectImageUsage } from '@/lib/pdfContentScan';

/** Levels shown in the UI. dpi = target resolution of images; ssim/qMin/qMax drive the per-image quality search. */
export const LEVELS = {
  extreme: { label: 'Extreme compression', hint: 'Less quality, high compression', dpi: 72, ssim: 0.88, qMin: 25, qMax: 78, fallbackMax: 1400, flattenScale: 1.5, flattenQuality: 50 },
  recommended: { label: 'Recommended compression', hint: 'Good quality, good compression', dpi: 110, ssim: 0.94, qMin: 40, qMax: 88, fallbackMax: 2000, flattenScale: 2, flattenQuality: 70 },
  less: { label: 'Less compression', hint: 'High quality, less compression', dpi: 150, ssim: 0.97, qMin: 55, qMax: 92, fallbackMax: 3000, flattenScale: 2.5, flattenQuality: 85 },
};

/** Target-size ladder: best quality first. The engine bisects it (≈4-5 trial runs) for the first rung that fits. */
const LADDER = [
  { dpi: 200, ssim: 0.97, qMin: 55, qMax: 92, fallbackMax: 3500 },
  { dpi: 150, ssim: 0.95, qMin: 50, qMax: 90, fallbackMax: 3000 },
  { dpi: 130, ssim: 0.93, qMin: 45, qMax: 88, fallbackMax: 2400 },
  { dpi: 110, ssim: 0.91, qMin: 40, qMax: 85, fallbackMax: 2000 },
  { dpi: 96, ssim: 0.89, qMin: 35, qMax: 82, fallbackMax: 1700 },
  { dpi: 84, ssim: 0.87, qMin: 30, qMax: 80, fallbackMax: 1500 },
  { dpi: 72, ssim: 0.85, qMin: 25, qMax: 78, fallbackMax: 1300 },
  { dpi: 60, ssim: 0.82, qMin: 20, qMax: 75, fallbackMax: 1100 },
  { dpi: 48, ssim: 0.78, qMin: 15, qMax: 70, fallbackMax: 900 },
  { dpi: 36, ssim: 0.74, qMin: 10, qMax: 65, fallbackMax: 700 },
];

const QPDF_OPTIMISE = [
  '--object-streams=generate',
  '--recompress-flate',
  '--compression-level=9',
  '--remove-unreferenced-resources=yes',
];

export class CompressError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CompressError';
    this.code = code;
  }
}
const ENCRYPTED_MSG = 'This PDF is password-protected or restricted. Open it with the Unlock PDF tool first, then compress it.';
const aborted = (signal) => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };

const name = (n) => PDFName.of(n);
const filterNames = (dict, context) => {
  const f = context.lookup(dict.get(name('Filter')));
  if (!f) return [];
  if (f instanceof PDFName) return [f.asString()];
  if (f instanceof PDFArray) return f.asArray().map((x) => context.lookup(x)?.asString?.() ?? '');
  return [];
};
const num = (v, context) => {
  const x = context.lookup(v);
  return x instanceof PDFNumber ? x.asNumber() : undefined;
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
    const comps = num(prof?.dict?.get?.(name('N')), context) ?? 0;
    return comps === 1 ? 'gray' : comps === 3 ? 'rgb' : null;
  }
  return null;
}

/** Image XObjects we know how to re-encode: 8-bit JPEG (DCT) gray/RGB, and 8-bit lossless Flate gray/RGB without alpha. */
function findImages(doc) {
  const { context } = doc;
  const found = [];
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (d.get(name('Subtype')) !== name('Image')) continue;
    const filters = filterNames(d, context);
    if (filters.length !== 1 || (filters[0] !== '/DCTDecode' && filters[0] !== '/FlateDecode')) continue;
    const isJpeg = filters[0] === '/DCTDecode';
    const bpc = num(d.get(name('BitsPerComponent')), context);
    if (bpc !== undefined && bpc !== 8) continue;
    if (!isJpeg && bpc !== 8) continue;
    if (d.has(name('Decode'))) continue; // inverted / remapped samples
    const mask = context.lookup(d.get(name('Mask')));
    if (mask instanceof PDFArray) continue; // colour-key mask would break under lossy re-encode
    const im = context.lookup(d.get(name('ImageMask')));
    if (im instanceof PDFBool && im.asBoolean()) continue;
    const kind = colorKind(d, context);
    if (!kind) continue;
    const width = num(d.get(name('Width')), context);
    const height = num(d.get(name('Height')), context);
    if (!width || !height) continue;
    let predictor = 1;
    if (!isJpeg) {
      if (d.has(name('SMask'))) continue; // alpha: leave lossless
      const parms = context.lookup(d.get(name('DecodeParms')));
      if (parms instanceof PDFDict) {
        predictor = num(parms.get(name('Predictor')), context) ?? 1;
        const cols = num(parms.get(name('Columns')), context) ?? width;
        const colors = num(parms.get(name('Colors')), context) ?? (kind === 'gray' ? 1 : 3);
        if (cols !== width || colors !== (kind === 'gray' ? 1 : 3) || (predictor !== 1 && predictor < 10)) continue;
      } else if (parms) continue;
    }
    found.push({ ref, stream: obj, kind, isJpeg, width, height, predictor, smask: d.get(name('SMask'))?.toString?.() ?? '' });
  }
  return found;
}

async function sha1(bytes) {
  const buf = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function mapLimit(items, limit, fn) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      await fn(items[i], i);
    }
  });
  await Promise.all(runners);
}

/** Re-point every reference to a duplicate image at its canonical copy, then drop the duplicate objects. */
function redirectRefs(context, map) {
  const fix = (container) => {
    if (container instanceof PDFDict) {
      for (const [k, v] of container.entries()) {
        if (v instanceof PDFRef) { const t = map.get(v.tag); if (t) container.set(k, t); } else if (v instanceof PDFDict || v instanceof PDFArray) fix(v);
      }
    } else if (container instanceof PDFArray) {
      for (let i = 0; i < container.size(); i += 1) {
        const v = container.get(i);
        if (v instanceof PDFRef) { const t = map.get(v.tag); if (t) container.set(i, t); } else if (v instanceof PDFDict || v instanceof PDFArray) fix(v);
      }
    }
  };
  for (const [, obj] of context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict || obj instanceof PDFArray) fix(obj);
    else if (obj?.dict instanceof PDFDict) fix(obj.dict);
  }
  for (const tag of map.keys()) {
    const [n, g] = tag.split(' ');
    context.delete(PDFRef.of(Number(n), Number(g)));
  }
}

/**
 * @returns stats { found, recompressed, converted, grayed, downscaled, deduped, before, after }
 * `cfg` is a LEVELS entry (or ladder rung).
 */
async function optimiseImages(doc, cfg, { onProgress, signal }) {
  const { context } = doc;
  const images = findImages(doc);
  const stats = { found: images.length, recompressed: 0, converted: 0, grayed: 0, downscaled: 0, deduped: 0, before: 0, after: 0, dedupedBytes: 0 };
  if (!images.length) return stats;
  onProgress?.({ phase: 'analyze', done: 0, total: 1 });
  const usage = collectImageUsage(doc);

  // 1. de-duplicate identical images
  const canon = new Map();
  const dupMap = new Map();
  const unique = [];
  for (const img of images) {
    const key = `${await sha1(img.stream.contents)}:${img.width}x${img.height}:${img.kind}:${img.isJpeg}:${img.smask}`;
    const hit = canon.get(key);
    if (hit) {
      dupMap.set(img.ref.tag, hit.ref);
      hit.uses.push(img);
      stats.before += img.stream.contents.length;
      stats.deduped += 1;
      stats.dedupedBytes += img.stream.contents.length;
      continue;
    }
    const entry = { ...img, uses: [img] };
    canon.set(key, entry);
    unique.push(entry);
  }

  // 2. which images are worth touching, and at what pixel size
  const jobs = [];
  for (const img of unique) {
    const size = img.stream.contents.length;
    stats.before += size;
    stats.after += size; // replaced below if the new encoding wins
    if (img.width * img.height < 4096 || size < 3000) continue; // icons / tiny images
    let k = 1;
    const u = usage.get(img.ref.tag);
    if (u && u.w > 1 && u.h > 1) {
      const kw = (u.w / 72 * cfg.dpi) / img.width;
      const kh = (u.h / 72 * cfg.dpi) / img.height;
      k = Math.min(1, Math.max(kw, kh));
    } else if (cfg.fallbackMax && Math.max(img.width, img.height) > cfg.fallbackMax) {
      k = cfg.fallbackMax / Math.max(img.width, img.height);
    }
    if (k > 0.9) k = 1; // not worth a resample for <10 % fewer pixels
    const tw = k < 1 ? Math.max(16, Math.round(img.width * k)) : 0;
    const th = k < 1 ? Math.max(16, Math.round(img.height * k)) : 0;
    jobs.push({ img, tw, th, size });
  }
  if (jobs.length) {
    const maxPx = Math.max(...jobs.map((j) => j.img.width * j.img.height));
    const hw = (globalThis.navigator?.hardwareConcurrency ?? 4) - 1;
    const poolSize = maxPx > 16e6 ? 1 : maxPx > 8e6 ? 2 : Math.max(1, Math.min(3, hw));
    const pool = createJpegPool(poolSize);
    let done = 0;
    try {
      onProgress?.({ phase: 'images', done: 0, total: jobs.length });
      await mapLimit(jobs, poolSize, async ({ img, tw, th, size }) => {
        aborted(signal);
        const source = img.isJpeg
          ? { kind: 'jpeg', bytes: img.stream.contents.slice().buffer }
          : { kind: 'flate', bytes: img.stream.contents.slice().buffer, width: img.width, height: img.height, colors: img.kind === 'gray' ? 1 : 3, predictor: img.predictor };
        let res;
        try {
          res = await pool.optimize(
            { source, targetW: tw, targetH: th, gray: img.kind === 'gray', cfg: { ssim: cfg.ssim, qMin: cfg.qMin, qMax: cfg.qMax, photoOnly: !img.isJpeg } },
            [source.bytes],
          );
        } catch (e) {
          if (e?.name === 'AbortError') throw e;
          res = { skipped: 'error' }; // undecodable (unusual JPEG etc.): leave untouched
        }
        done += 1;
        onProgress?.({ phase: 'images', done, total: jobs.length });
        if (res.skipped) return;
        // Lossless -> JPEG must win clearly; JPEG -> JPEG needs 5 % to be worth the generation loss.
        const bar = img.isJpeg ? 0.95 : 0.75;
        if (res.bytes.byteLength >= size * bar) return;
        const dict = img.stream.dict.clone(context);
        dict.set(name('Width'), PDFNumber.of(res.width));
        dict.set(name('Height'), PDFNumber.of(res.height));
        dict.set(name('Length'), PDFNumber.of(res.bytes.byteLength));
        if (!img.isJpeg) {
          dict.set(name('Filter'), name('DCTDecode'));
          dict.delete(name('DecodeParms'));
          dict.set(name('BitsPerComponent'), PDFNumber.of(8));
          stats.converted += 1;
        }
        if (res.gray && img.kind !== 'gray') { dict.set(name('ColorSpace'), name('DeviceGray')); stats.grayed += 1; }
        if (res.width < img.width) stats.downscaled += 1;
        context.assign(img.ref, PDFRawStream.of(dict, new Uint8Array(res.bytes)));
        stats.recompressed += 1;
        stats.after += res.bytes.byteLength - size;
      });
    } finally {
      pool.terminate();
    }
  }
  if (dupMap.size) redirectRefs(context, dupMap);
  return stats;
}

function stripThumbnails(doc) {
  let n = 0;
  for (const page of doc.getPages()) if (page.node.delete(name('Thumb'))) n += 1;
  return n;
}

function stripMetadata(doc) {
  const { context } = doc;
  const root = context.lookup(context.trailerInfo.Root);
  if (root instanceof PDFDict) { root.delete(name('Metadata')); root.delete(name('PieceInfo')); }
  // Keep the document title (shown in browser tabs and readers); drop author, producer, dates, custom keys.
  const info = context.trailerInfo.Info ? context.lookup(context.trailerInfo.Info) : null;
  const title = info instanceof PDFDict ? info.get(name('Title')) : null;
  delete context.trailerInfo.Info;
  if (title) context.trailerInfo.Info = context.register(context.obj({ Title: title }));
}

async function qpdfOptimise(bytes, { onProgress, signal }) {
  onProgress?.({ phase: 'optimise', done: 0, total: 1 });
  const { bytes: out } = await qpdfTransform(bytes, QPDF_OPTIMISE, { signal }).catch((e) => {
    if (/password|encrypt/i.test(e?.message || '')) throw new CompressError(ENCRYPTED_MSG, 'encrypted');
    throw e;
  });
  onProgress?.({ phase: 'optimise', done: 1, total: 1 });
  return out;
}

/** One full pass of the pipeline at one configuration. Returns the candidate bytes and image statistics. */
async function runOnce(original, mode, cfg, o, { onProgress, signal }) {
  let working = original;
  let images = null;
  if (mode === 'smart') {
    let doc;
    try {
      doc = await PDFDocument.load(original, { updateMetadata: false });
    } catch (e) {
      if (/encrypt/i.test(e?.message || '')) throw new CompressError(ENCRYPTED_MSG, 'encrypted');
      doc = null; // pdf-lib could not parse it: fall back to qpdf-only optimisation
    }
    if (doc) {
      if (o.images) images = await optimiseImages(doc, cfg, { onProgress, signal });
      const thumbs = stripThumbnails(doc);
      if (o.stripMeta) stripMetadata(doc);
      if (images?.recompressed || images?.deduped || thumbs || o.stripMeta) working = await doc.save({ useObjectStreams: false });
    }
  }
  aborted(signal);
  if (o.structure || mode === 'structure') working = await qpdfOptimise(working, { onProgress, signal });
  return { bytes: working, images };
}

function finish(original, bytes, extra) {
  // A compressor must never inflate the file.
  const usedOriginal = bytes.byteLength >= original.byteLength;
  return { bytes: usedOriginal ? original : bytes, usedOriginal, originalSize: original.byteLength, ...extra };
}

/** Shared by the flatten mode (pdfFlatten.js). */
export { qpdfOptimise, finish as finishResult };

async function compressToTarget(original, o, target, ctx) {
  const { onProgress, signal } = ctx;
  if (original.byteLength <= target) return finish(original, original, { images: null, target: { bytes: target, met: true, alreadyUnder: true, trials: 0 }, level: 'target' });
  const cache = new Map();
  let trials = 0;
  const total = Math.ceil(Math.log2(LADDER.length)) + 1;
  const trial = async (idx) => {
    if (cache.has(idx)) return cache.get(idx);
    trials += 1;
    const r = await runOnce(original, 'smart', LADDER[idx], { ...o, images: true }, {
      signal,
      onProgress: (p) => onProgress?.({ ...p, trial: { n: trials, of: total } }),
    });
    const entry = { idx, ...r };
    cache.set(idx, entry);
    return entry;
  };
  let lo = 0;
  let hi = LADDER.length - 1;
  let best = await trial(hi);
  if (!best.images?.found) return finish(original, best.bytes, { images: best.images, target: { bytes: target, met: best.bytes.byteLength <= target, trials, noImages: true }, level: 'target' });
  if (best.bytes.byteLength <= target) {
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const r = await trial(mid);
      if (r.bytes.byteLength <= target) { best = r; hi = mid; } else lo = mid + 1;
    }
    if (best.idx !== lo) best = await trial(lo);
  }
  return finish(original, best.bytes, { images: best.images, target: { bytes: target, met: best.bytes.byteLength <= target, trials, dpi: LADDER[best.idx].dpi }, level: 'target' });
}

/**
 * @param {Uint8Array|File|Blob} input
 * @param {{ mode?: 'smart'|'structure', level?: keyof typeof LEVELS, targetBytes?: number,
 *           options?: { images?: boolean, structure?: boolean, stripMeta?: boolean }, onProgress?: Function, signal?: AbortSignal }} opts
 */
export async function compressPdf(input, { mode = 'smart', level = 'recommended', targetBytes = 0, options = {}, onProgress, signal } = {}) {
  const original = input instanceof Uint8Array ? input : new Uint8Array(await input.arrayBuffer());
  const o = { images: true, structure: true, stripMeta: true, ...options };
  const ctx = { onProgress, signal };
  if (targetBytes > 0 && mode === 'smart') return compressToTarget(original, o, targetBytes, ctx);
  const cfg = LEVELS[level] ?? LEVELS.recommended;
  const r = await runOnce(original, mode, cfg, o, ctx);
  return finish(original, r.bytes, { images: r.images, level });
}
