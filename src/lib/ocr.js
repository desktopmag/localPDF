/**
 * In-browser OCR (Tesseract.js, Apache-2.0). Everything is self-hosted from /ocr/ (see
 * scripts/sync-wasm-assets.mjs) and runs in a Web Worker: nothing is uploaded and no CDN is contacted.
 * tesseract.js itself is imported lazily so it never touches the main bundle.
 */
import { StandardFonts } from 'pdf-lib';
import { getPdfjs, renderPageCanvas } from '@/lib/pdfUtils';
import { loadPdfDoc } from '@/lib/pdfSafe';
import { pageFrame, drawTextVisible } from '@/lib/pdfPlace';

const OCR_BASE = `${import.meta.env.BASE_URL}ocr`.replace(/\/{2,}/g, '/');

/**
 * @param {{
 *   onProgress?: (p: {page: number, pages: number, fraction: number, status: string}) => void,
 *   signal?: AbortSignal,
 * }} hooks
 */
async function createOcrWorker(hooks, state) {
  const { createWorker } = await import('tesseract.js');
  return createWorker('eng', 1, {
    workerPath: `${OCR_BASE}/worker.min.js`,
    corePath: OCR_BASE,
    langPath: OCR_BASE,
    gzip: true,
    logger: (m) => {
      if (!hooks.onProgress) return;
      const frac = typeof m.progress === 'number' ? m.progress : 0;
      hooks.onProgress({ page: state.page, pages: state.pages, fraction: frac, status: m.status });
    },
  });
}

/** Characters pdf-lib's built-in Helvetica (WinAnsi) can encode. */
function makeSanitizer(font) {
  const allowed = new Set(font.getCharacterSet());
  return (s) =>
    [...s]
      .map((ch) => (allowed.has(ch.codePointAt(0)) ? ch : ''))
      .join('');
}

/**
 * Run OCR over a PDF and return recognised text plus a copy of the PDF with an invisible
 * (selectable / searchable) text layer laid over the original page content.
 *
 * @param {File} file
 * @param {{ scale?: number, makePdf?: boolean, onProgress?: Function, signal?: AbortSignal }} opts
 * @returns {Promise<{ text: string, pdfBytes: Uint8Array|null, pages: number, words: number, skippedRotated: number }>}
 */
export async function ocrPdf(file, { scale = 2.5, makePdf = true, onProgress, signal } = {}) {
  const state = { page: 0, pages: 0 };
  const pdfjsDoc = await getPdfjs(file);
  state.pages = pdfjsDoc.numPages;

  let worker;
  const abort = () => worker?.terminate();
  signal?.addEventListener('abort', abort);

  try {
    onProgress?.({ page: 0, pages: state.pages, fraction: 0, status: 'loading OCR engine' });
    worker = await createOcrWorker({ onProgress }, state);

    const outDoc = makePdf ? await loadPdfDoc(file) : null;
    const font = outDoc ? await outDoc.embedFont(StandardFonts.Helvetica) : null;
    const sanitize = font ? makeSanitizer(font) : null;

    const parts = [];
    let words = 0;
    let skippedRotated = 0;

    for (let i = 1; i <= state.pages; i += 1) {
      if (signal?.aborted) throw new DOMException('OCR cancelled', 'AbortError');
      state.page = i;
      const canvas = await renderPageCanvas(pdfjsDoc, i, scale);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      const pageText = (data.text || '').trim();
      parts.push(`--- Page ${i} ---\n${pageText || '(no text found)'}`);

      if (outDoc) {
        const page = outDoc.getPage(i - 1);
        {
          // The canvas shows the page as a viewer would (CropBox + /Rotate applied), so map through the
          // visible frame; rotated pages therefore get a correctly placed text layer too.
          const frame = pageFrame(page);
          const kx = frame.width / canvas.width;
          const ky = frame.height / canvas.height;
          for (const block of data.blocks || []) {
            for (const para of block.paragraphs || []) {
              for (const line of para.lines || []) {
                for (const w of line.words || []) {
                  const t = sanitize(w.text || '');
                  if (!t.trim()) continue;
                  const wPts = (w.bbox.x1 - w.bbox.x0) * kx;
                  const hPts = (w.bbox.y1 - w.bbox.y0) * ky;
                  const natural = font.widthOfTextAtSize(t, 1);
                  if (!natural || wPts <= 0 || hPts <= 0) continue;
                  // Fit the word's width, but keep the glyph height plausible.
                  const size = Math.min(Math.max(wPts / natural, hPts * 0.5), hPts * 1.5);
                  drawTextVisible(page, t, {
                    font,
                    size,
                    opacity: 0,
                    fx: w.bbox.x0 * kx,
                    fy: frame.height - w.bbox.y1 * ky + hPts * 0.2,
                  });
                  words += 1;
                }
              }
            }
          }
        }
      }
      canvas.width = 0; // release bitmap memory
      canvas.height = 0;
      await new Promise((r) => setTimeout(r, 0));
    }

    const pdfBytes = outDoc ? await outDoc.save() : null;
    return { text: parts.join('\n\n'), pdfBytes, pages: state.pages, words, skippedRotated };
  } finally {
    signal?.removeEventListener('abort', abort);
    await worker?.terminate();
    await pdfjsDoc.destroy();
  }
}
