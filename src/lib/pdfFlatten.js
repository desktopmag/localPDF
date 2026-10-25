/**
 * "Flatten to images" compression: render each page with pdf.js and re-embed it as a mozjpeg image.
 * Needs a DOM canvas, so it runs on the main thread (the JPEG/qpdf work still happens in workers).
 * Smallest result for scanned documents; text is no longer selectable.
 */
import { PDFDocument } from 'pdf-lib';
import { createJpegPool } from '@/lib/jpegClient';
import { LEVELS, CompressError, qpdfOptimise, finishResult } from '@/lib/pdfCompress';

export async function flattenPdf(file, { level = 'recommended', onProgress, signal } = {}) {
  const cfg = LEVELS[level] ?? LEVELS.recommended;
  const original = new Uint8Array(await file.arrayBuffer());
  const { getPdfjs, renderPageCanvas } = await import('@/lib/pdfUtils');
  let src;
  try {
    src = await getPdfjs(file);
  } catch (e) {
    if (e?.name === 'PasswordException' || /password|encrypt/i.test(e?.message || '')) {
      throw new CompressError('This PDF is password-protected or restricted. Open it with the Unlock PDF tool first, then compress it.', 'encrypted');
    }
    throw e;
  }
  const out = await PDFDocument.create();
  const pool = createJpegPool(1);
  try {
    for (let p = 1; p <= src.numPages; p += 1) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      onProgress?.({ phase: 'pages', done: p - 1, total: src.numPages });
      const canvas = await renderPageCanvas(src, p, cfg.flattenScale);
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const { width, height } = canvas;
      const res = await pool.encode(imageData, cfg.flattenQuality);
      const jpg = await out.embedJpg(new Uint8Array(res.bytes));
      const pw = width / cfg.flattenScale; // keep the original page size in points
      const ph = height / cfg.flattenScale;
      out.addPage([pw, ph]).drawImage(jpg, { x: 0, y: 0, width: pw, height: ph });
    }
    onProgress?.({ phase: 'pages', done: src.numPages, total: src.numPages });
  } finally {
    pool.terminate();
    await src.destroy();
  }
  const saved = await out.save({ useObjectStreams: false });
  const bytes = await qpdfOptimise(saved, { onProgress, signal });
  return finishResult(original, bytes, { images: null, level });
}
