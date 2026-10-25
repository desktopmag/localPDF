/**
 * mozjpeg (WASM, @jsquash/jpeg) in a worker.
 *
 *  { type: 'optimize', id, source, targetW, targetH, gray, cfg }   quality-searched re-encode of one PDF image
 *      source = { kind: 'jpeg', bytes } | { kind: 'flate', bytes, width, height, colors, predictor }
 *      cfg    = { ssim, qMin, qMax, fixedQuality?, photoOnly?, detectGray? }
 *      -> { skipped: 'reason' } | { bytes, width, height, quality, ssim, psnr, gray, origW, origH }
 *  { type: 'encode', id, data, width, height, quality }              encode RGBA pixels (used by "flatten to images")
 *
 * The 'optimize' search: down-scale to the requested pixel size (if any), then binary-search the LOWEST mozjpeg
 * quality whose SSIM against the (scaled) source stays above cfg.ssim. SSIM is computed on luma over 8x8 windows
 * and ignores flat windows (blank paper would otherwise hide damage to text). Replies carry an ArrayBuffer.
 */
import encode from '@jsquash/jpeg/encode';

const GRAYSCALE = 1;

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Undo PNG predictors (PDF /Predictor >= 10): rows are [filterType, ...bytes]. */
function unpredict(data, width, colors) {
  const rowLen = width * colors;
  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  const bpp = colors;
  for (let r = 0; r < rows; r += 1) {
    const s = r * (rowLen + 1);
    const ft = data[s];
    const o = r * rowLen;
    const po = o - rowLen;
    for (let x = 0; x < rowLen; x += 1) {
      const raw = data[s + 1 + x];
      const a = x >= bpp ? out[o + x - bpp] : 0;
      const b = r > 0 ? out[po + x] : 0;
      const c = r > 0 && x >= bpp ? out[po + x - bpp] : 0;
      let v;
      switch (ft) {
        case 1: v = raw + a; break;
        case 2: v = raw + b; break;
        case 3: v = raw + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: v = raw;
      }
      out[o + x] = v & 255;
    }
  }
  return out;
}

async function decodeSource(source) {
  if (source.kind === 'jpeg') {
    const bitmap = await createImageBitmap(new Blob([source.bytes], { type: 'image/jpeg' }), {
      imageOrientation: 'none', // PDF ignores EXIF orientation
      colorSpaceConversion: 'none',
    });
    return { img: bitmap, width: bitmap.width, height: bitmap.height, free: () => bitmap.close() };
  }
  const { width, height, colors, predictor } = source;
  if (width * height > 60e6) throw new Error('image too large');
  let raw = await inflate(source.bytes);
  if (predictor >= 10) raw = unpredict(raw, width, colors);
  if (raw.length < width * height * colors) throw new Error('short image data');
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (colors === 3) for (let i = 0, j = 0; i < width * height; i += 1, j += 3) { rgba[i * 4] = raw[j]; rgba[i * 4 + 1] = raw[j + 1]; rgba[i * 4 + 2] = raw[j + 2]; rgba[i * 4 + 3] = 255; }
  else for (let i = 0; i < width * height; i += 1) { const v = raw[i]; rgba[i * 4] = v; rgba[i * 4 + 1] = v; rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = 255; }
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
  return { img: canvas, width, height, free: () => {} };
}

/** High-quality down-scale: halve repeatedly (box-like), then a final smooth draw. Returns an OffscreenCanvas. */
function scaleTo(src, sw, sh, w, h) {
  let cur = src;
  let cw = sw;
  let ch = sh;
  while (cw / 2 >= w && ch / 2 >= h) {
    const nw = Math.max(w, Math.floor(cw / 2));
    const nh = Math.max(h, Math.floor(ch / 2));
    const c = new OffscreenCanvas(nw, nh);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, nw, nh);
    cur = c; cw = nw; ch = nh;
  }
  const out = new OffscreenCanvas(w, h);
  const g = out.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(cur, 0, 0, w, h);
  return out;
}

function lumaOf(rgba, n) {
  const y = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) y[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;
  return y;
}

/** Mean SSIM over non-flat 8x8 windows of the reference, plus PSNR, both on luma. */
function compare(a, b, w, h) {
  const stride = w * h > 3e6 ? 8 : 4;
  const C1 = 6.5025;
  const C2 = 58.5225;
  let sum = 0;
  let count = 0;
  for (let y = 0; y + 8 <= h; y += stride) {
    for (let x = 0; x + 8 <= w; x += stride) {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let j = 0; j < 8; j += 1) {
        const o = (y + j) * w + x;
        for (let i = 0; i < 8; i += 1) {
          const va = a[o + i];
          const vb = b[o + i];
          sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb;
        }
      }
      const ma = sa / 64, mb = sb / 64;
      const va = saa / 64 - ma * ma, vb = sbb / 64 - mb * mb, cov = sab / 64 - ma * mb;
      if (va < 2) continue; // flat reference window (blank paper, solid fill): carries no information
      sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      count += 1;
    }
  }
  let se = 0;
  for (let i = 0; i < a.length; i += 1) { const d = a[i] - b[i]; se += d * d; }
  const mse = se / a.length;
  return { ssim: count ? sum / count : 1, psnr: mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse) };
}

function looksLikePhoto(rgba, n) {
  const seen = new Set();
  const step = Math.max(1, Math.floor(n / 40000));
  for (let i = 0; i < n; i += step) seen.add(((rgba[i * 4] >> 3) << 10) | ((rgba[i * 4 + 1] >> 3) << 5) | (rgba[i * 4 + 2] >> 3));
  return seen.size > 600;
}

function isGrayish(rgba, n) {
  for (let i = 0; i < n; i += 1) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    if (Math.abs(r - g) > 3 || Math.abs(g - b) > 3) return false;
  }
  return true;
}

async function optimize({ source, targetW, targetH, gray: srcGray, cfg }) {
  const dec = await decodeSource(source);
  const origW = dec.width;
  const origH = dec.height;
  const w = targetW && targetW < origW ? Math.max(8, targetW) : origW;
  const h = targetH && targetH < origH ? Math.max(8, targetH) : origH;
  const canvas = scaleTo(dec.img, origW, origH, w, h);
  dec.free();
  const ref = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
  const n = w * h;

  if (source.kind === 'flate' && cfg.photoOnly && !looksLikePhoto(ref.data, n)) return { skipped: 'not-photographic' };
  const gray = srcGray || (cfg.detectGray !== false && isGrayish(ref.data, n));
  const lumaRef = lumaOf(ref.data, n);
  const opts = (q) => ({ quality: q, ...(gray ? { color_space: GRAYSCALE } : {}) });

  const probe = new OffscreenCanvas(w, h);
  const pg = probe.getContext('2d', { willReadFrequently: true });
  const tried = new Map();
  const tryQ = async (q) => {
    if (tried.has(q)) return tried.get(q);
    const out = await encode(ref, opts(q));
    const bmp = await createImageBitmap(new Blob([out], { type: 'image/jpeg' }), { imageOrientation: 'none', colorSpaceConversion: 'none' });
    pg.clearRect(0, 0, w, h);
    pg.drawImage(bmp, 0, 0);
    bmp.close();
    const back = pg.getImageData(0, 0, w, h).data;
    const r = { q, out, ...compare(lumaRef, lumaOf(back, n), w, h) };
    tried.set(q, r);
    return r;
  };

  let best;
  if (cfg.fixedQuality) {
    best = await tryQ(cfg.fixedQuality);
  } else {
    let lo = cfg.qMin;
    let hi = cfg.qMax;
    best = await tryQ(hi);
    if (best.ssim >= cfg.ssim) {
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        const r = await tryQ(mid);
        if (r.ssim >= cfg.ssim) { best = r; hi = mid; } else lo = mid;
      }
      if (lo === cfg.qMin && !tried.has(lo)) {
        const r = await tryQ(lo);
        if (r.ssim >= cfg.ssim) best = r;
      }
    }
  }
  return { bytes: best.out, width: w, height: h, quality: best.q, ssim: best.ssim, psnr: best.psnr, gray, origW, origH };
}

async function encodePixels({ data, width, height, quality }) {
  const out = await encode({ data: new Uint8ClampedArray(data), width, height }, { quality });
  return { bytes: out, width, height };
}

self.onmessage = async ({ data }) => {
  try {
    const r = data.type === 'encode' ? await encodePixels(data) : await optimize(data);
    self.postMessage({ id: data.id, ok: true, ...r }, r.bytes ? [r.bytes] : []);
  } catch (e) {
    self.postMessage({ id: data.id, ok: false, error: e?.message || String(e) });
  }
};
