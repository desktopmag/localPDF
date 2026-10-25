/**
 * Embed any browser-decodable image into a pdf-lib document.
 *
 * pdf-lib only understands baseline/progressive JPEG and PNG. We sniff the real format from the bytes (file
 * names and MIME types lie), pass PNG and plain JPEG through untouched, and re-encode everything else
 * (WebP, GIF, BMP, AVIF, JPEG with an EXIF rotation, mislabelled files) through a canvas.
 */
import { UserError } from '@/lib/pdfSafe';

function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  return 'other';
}

/** EXIF orientation (1–8) of a JPEG, or 1 when absent. */
export function exifOrientation(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let off = 2;
  while (off + 4 < b.length) {
    if (b[off] !== 0xff) return 1;
    const marker = b[off + 1];
    const len = view.getUint16(off + 2);
    if (marker === 0xe1 && view.getUint32(off + 4) === 0x45786966) {
      const tiff = off + 10;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      const n = view.getUint16(ifd, little);
      for (let i = 0; i < n; i += 1) {
        const e = ifd + 2 + i * 12;
        if (view.getUint16(e, little) === 0x0112) return view.getUint16(e + 8, little) || 1;
      }
      return 1;
    }
    if (marker === 0xda) return 1; // start of scan: no EXIF before pixel data
    off += 2 + len;
  }
  return 1;
}

async function viaCanvas(bytes, mime, asJpeg) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: mime || 'application/octet-stream' }), { imageOrientation: 'from-image' });
  } catch {
    throw new UserError("This image format can't be read by your browser. Convert it to JPG or PNG first.");
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (asJpeg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, asJpeg ? 'image/jpeg' : 'image/png', 0.92));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new UserError('This image is too large to convert in your browser.');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * @param {import('pdf-lib').PDFDocument} doc
 * @param {File} file
 */
export async function embedImageFile(doc, file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  try {
    if (kind === 'png') return await doc.embedPng(bytes);
    if (kind === 'jpeg') {
      if (exifOrientation(bytes) <= 1) return await doc.embedJpg(bytes);
      return await doc.embedJpg(await viaCanvas(bytes, 'image/jpeg', true));
    }
    return await doc.embedPng(await viaCanvas(bytes, file.type, false));
  } catch (e) {
    if (e instanceof UserError) throw new UserError(`${file.name}: ${e.message}`);
    throw new UserError(`${file.name}: this image couldn't be read. Try re-saving it as JPG or PNG.`);
  }
}
