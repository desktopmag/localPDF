import { getPdfjs, renderPageCanvas } from '@/lib/pdfUtils';
import { getPyMuPDF } from '@/lib/pymupdfClient';

const RENDER_SCALE = 2.5;
const PT_PER_INCH = 72;

/** @typedef {'hybrid' | 'editable' | 'visual'} PptxConversionMode */

function ptToIn(pt) {
  return pt / PT_PER_INCH;
}

function intColorToHex(color) {
  if (color == null) return '000000';
  const c = color >>> 0;
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  return [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function sampleSlideBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const corners = [
    ctx.getImageData(2, 2, 1, 1).data,
    ctx.getImageData(w - 3, 2, 1, 1).data,
    ctx.getImageData(2, h - 3, 1, 1).data,
    ctx.getImageData(w - 3, h - 3, 1, 1).data,
  ];
  let best = corners[0];
  let bestLum = -1;
  for (const px of corners) {
    const lum = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2];
    if (lum > bestLum) {
      bestLum = lum;
      best = px;
    }
  }
  return intColorToHex((best[0] << 16) | (best[1] << 8) | best[2]);
}

function classifySpan(span) {
  const size = span.size || 11;
  const text = (span.text || '').trim();
  if (!text) return 'body';
  if (size >= 20 || /^(\d+\.)?\s*[A-Z][^.]{0,80}$/.test(text)) return 'title';
  if (size >= 14) return 'heading';
  return 'body';
}

/**
 * @param {import('pdfjs-dist').PDFPageProxy} page
 * @param {number} pageHeightPt viewport height at scale 1 (PDF user space)
 */
async function collectPdfJsTextItems(page, pageHeightPt) {
  const textContent = await page.getTextContent();
  const items = [];
  for (const item of textContent.items) {
    if (!item.str || !item.transform) continue;
    const [a, b, , , tx, ty] = item.transform;
    const fontSize = Math.hypot(a, b);
    const w = item.width || fontSize * item.str.length * 0.5;
    const x = tx;
    const yTop = pageHeightPt - ty - fontSize;
    items.push({
      text: item.str,
      x,
      y: yTop,
      w,
      h: fontSize * 1.2,
      fontSize,
      color: '000000',
    });
  }
  return mergeTextItems(items);
}

/** Merge adjacent text items on the same line (gap-based spacing). */
function mergeTextItems(items) {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged = [];
  let cur = null;
  for (const it of sorted) {
    if (!cur) {
      cur = { ...it, text: it.text };
      continue;
    }
    const sameLine = Math.abs(cur.y - it.y) < cur.fontSize * 0.35;
    const gap = it.x - (cur.x + cur.w);
    if (sameLine && gap >= 0 && gap < cur.fontSize * 0.8) {
      cur.text += gap > cur.fontSize * 0.15 ? ` ${it.text}` : it.text;
      cur.w = it.x + it.w - cur.x;
      cur.h = Math.max(cur.h, it.h);
      cur.fontSize = Math.max(cur.fontSize, it.fontSize);
    } else {
      merged.push(cur);
      cur = { ...it, text: it.text };
    }
  }
  if (cur) merged.push(cur);
  return merged;
}

function addTextLayer(slide, items, { invisible }) {
  for (const it of items) {
    if (!it.text?.trim()) continue;
    slide.addText(it.text, {
      x: ptToIn(it.x),
      y: ptToIn(it.y),
      w: ptToIn(Math.max(it.w, 0.25)),
      h: ptToIn(Math.max(it.h, 0.15)),
      fontSize: Math.max(6, Math.round(it.fontSize)),
      fontFace: 'Arial',
      color: invisible ? 'FFFFFF' : it.color || '000000',
      transparency: invisible ? 100 : 0,
      margin: 0,
      valign: 'top',
    });
  }
}

async function buildVisualOrHybrid(file, mode, onProgress) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.author = 'BolaPDF';
  pptx.subject = 'Converted from PDF';

  const doc = await getPdfjs(file);
  const layoutName = 'LPDF_PDF_PAGE';

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(`Rendering page ${i} of ${doc.numPages}…`);
    const page = await doc.getPage(i);
    const baseVp = page.getViewport({ scale: 1 });
    const pageWPt = baseVp.width;
    const pageHPt = baseVp.height;

    if (i === 1) {
      pptx.defineLayout({ name: layoutName, width: ptToIn(pageWPt), height: ptToIn(pageHPt) });
      pptx.layout = layoutName;
    }

    const canvas = await renderPageCanvas(doc, i, RENDER_SCALE);
    const bgHex = sampleSlideBackground(canvas);
    const dataUrl = canvas.toDataURL('image/png');

    const slide = pptx.addSlide({ bkgd: bgHex });

    slide.addImage({
      data: dataUrl,
      x: 0,
      y: 0,
      w: ptToIn(pageWPt),
      h: ptToIn(pageHPt),
    });

    if (mode === 'hybrid') {
      const textItems = await collectPdfJsTextItems(page, pageHPt);
      addTextLayer(slide, textItems, { invisible: true });
    }
  }

  await doc.destroy();
  const blob = await pptx.write({ outputType: 'blob' });
  return blob;
}

async function buildEditable(file, onProgress) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.author = 'BolaPDF';
  pptx.subject = 'Editable reconstruction from PDF';

  onProgress?.('Loading layout engine (PyMuPDF WASM)…');
  const client = await getPyMuPDF();
  const mupdfDoc = await client.open(file);
  const layoutName = 'LPDF_EDIT_PAGE';

  const pdfjsDoc = await getPdfjs(file);

  try {
    for (let i = 0; i < mupdfDoc.pageCount; i++) {
      onProgress?.(`Reconstructing slide ${i + 1} of ${mupdfDoc.pageCount}…`);
      const page = mupdfDoc.getPage(i);
      const wPt = page.width;
      const hPt = page.height;

      if (i === 0) {
        pptx.defineLayout({ name: layoutName, width: ptToIn(wPt), height: ptToIn(hPt) });
        pptx.layout = layoutName;
      }

      const thumbCanvas = await renderPageCanvas(pdfjsDoc, i + 1, 0.5);
      const bgHex = sampleSlideBackground(thumbCanvas);

      const slide = pptx.addSlide({ bkgd: bgHex });
      const dict = page.getText('dict');
      const blocks = dict?.blocks || [];

      for (const block of blocks) {
        if (block.type === 0 && block.lines) {
          for (const line of block.lines) {
            for (const span of line.spans) {
              const text = span.text || '';
              if (!text.trim()) continue;
              const [x0, y0, x1, y1] = span.bbox || line.bbox || block.bbox;
              const kind = classifySpan(span);
              const bold = (span.flags & 2) !== 0;
              const italic = (span.flags & 1) !== 0;
              slide.addText(text, {
                x: ptToIn(x0),
                y: ptToIn(y0),
                w: ptToIn(Math.max(x1 - x0, 0.2)),
                h: ptToIn(Math.max(y1 - y0, 0.12)),
                fontSize: Math.max(6, Math.round(span.size || 11)),
                fontFace: 'Arial',
                color: intColorToHex(span.color),
                bold,
                italic,
                margin: 0,
                valign: 'top',
                ...(kind === 'title' ? { fontSize: Math.max(18, Math.round(span.size || 18)), bold: true } : {}),
              });
            }
          }
        } else if (block.type === 1 && block.bbox) {
          const xref = block.number ?? block.xref;
          let bytes = null;
          let ext = block.ext || 'png';
          if (xref != null) {
            const extracted = page.extractImage(xref);
            if (extracted?.data) {
              bytes = extracted.data;
              ext = extracted.ext || ext;
            }
          }
          if (!bytes && block.image) {
            bytes = block.image instanceof Uint8Array ? block.image : Uint8Array.from(block.image);
          }
          if (!bytes) continue;
          const [x0, y0, x1, y1] = block.bbox;
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
          slide.addImage({
            data: `data:${mime};base64,${uint8ToBase64(bytes)}`,
            x: ptToIn(x0),
            y: ptToIn(y0),
            w: ptToIn(Math.max(x1 - x0, 0.1)),
            h: ptToIn(Math.max(y1 - y0, 0.1)),
          });
        }
      }
    }
  } finally {
    mupdfDoc.close();
    await pdfjsDoc.destroy();
  }

  return pptx.write({ outputType: 'blob' });
}

function uint8ToBase64(bytes) {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * @param {File} file
 * @param {PptxConversionMode} mode
 * @param {(msg: string) => void} [onProgress]
 */
export async function convertPdfToPptx(file, mode, onProgress) {
  if (mode === 'editable') {
    return buildEditable(file, onProgress);
  }
  return buildVisualOrHybrid(file, mode, onProgress);
}

export const PPTX_MODE_INFO = {
  hybrid: {
    label: 'Hybrid',
    short: 'Pixel background + invisible searchable text',
    detail: 'Each slide uses a 2.5× render as the background, with transparent text overlays for search and copy.',
  },
  editable: {
    label: 'Editable',
    short: 'Native text boxes and extracted images',
    detail: 'Rebuilds spans and image XObjects from PDF structure via PyMuPDF. Complex vectors may be omitted.',
  },
  visual: {
    label: 'Visual',
    short: 'Guaranteed pixel accuracy',
    detail: 'One high-resolution image per slide — identical to the PDF, not re-typeset.',
  },
};
