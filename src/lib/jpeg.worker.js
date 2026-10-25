/**
 * mozjpeg (WASM, @jsquash/jpeg) in a worker.
 *
 *  { type: 'recompress', id, bytes, quality, maxDim, gray }   re-encode an embedded JPEG (optionally downscaled)
 *  { type: 'encode',     id, data, width, height, quality }   encode RGBA pixels (used for "flatten to images")
 *
 * Replies { id, ok, bytes, width, height } (bytes is an ArrayBuffer) or { id, ok: false, error }.
 */
import encode from '@jsquash/jpeg/encode';

const GRAYSCALE = 1;

async function recompress({ bytes, quality, maxDim, gray }) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }), {
    imageOrientation: 'none', // PDF ignores EXIF orientation
    colorSpaceConversion: 'none',
  });
  let { width, height } = bitmap;
  const origW = width;
  const origH = height;
  const longest = Math.max(width, height);
  if (maxDim && longest > maxDim) {
    const k = maxDim / longest;
    width = Math.max(1, Math.round(width * k));
    height = Math.max(1, Math.round(height * k));
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, width, height);
  const out = await encode(image, {
    quality,
    ...(gray ? { color_space: GRAYSCALE } : {}),
  });
  return { bytes: out, width, height, origW, origH };
}

async function encodePixels({ data, width, height, quality }) {
  const out = await encode({ data: new Uint8ClampedArray(data), width, height }, { quality });
  return { bytes: out, width, height };
}

self.onmessage = async ({ data }) => {
  try {
    const r = data.type === 'encode' ? await encodePixels(data) : await recompress(data);
    self.postMessage({ id: data.id, ok: true, ...r }, [r.bytes]);
  } catch (e) {
    self.postMessage({ id: data.id, ok: false, error: e?.message || String(e) });
  }
};
