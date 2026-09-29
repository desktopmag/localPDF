import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import pdfjsLib from './pdfjs';

export { PDFDocument, degrees, rgb, StandardFonts, pdfjsLib };

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function downloadBlob(bytes, filename, type = 'application/pdf') {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function loadPdfLib(file) {
  const bytes = await file.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export async function getPdfjs(file) {
  const bytes = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
}

/** Rotate a JPEG/PNG data-URL preview by 90° steps (for card thumbnails). */
export async function rotateDataUrlPreview(src, deltaDegrees = 90) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const quarterTurn = Math.abs(deltaDegrees % 180) === 90;
      const canvas = document.createElement('canvas');
      canvas.width = quarterTurn ? img.height : img.width;
      canvas.height = quarterTurn ? img.width : img.height;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((deltaDegrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderPageCanvas(pdfjsDoc, pageNum, scale = 1) {
  const page = await pdfjsDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise;
  return canvas;
}

export async function renderPageThumb(file, pageNum, scale = 0.4) {
  const doc = await getPdfjs(file);
  const canvas = await renderPageCanvas(doc, pageNum, scale);
  const url = canvas.toDataURL('image/jpeg', 0.7);
  await doc.destroy();
  return url;
}

export function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
}

export async function rotatePdfFile(file, deltaDegrees = 90) {
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  doc.getPages().forEach((page) => {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + deltaDegrees) % 360));
  });
  const bytes = await doc.save();
  return new File([bytes], file.name, { type: 'application/pdf', lastModified: Date.now() });
}

export async function rotateImageFile(file, deltaDegrees = 90) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const quarterTurn = Math.abs(deltaDegrees % 180) === 90;
    const canvas = document.createElement('canvas');
    canvas.width = quarterTurn ? img.height : img.width;
    canvas.height = quarterTurn ? img.width : img.height;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deltaDegrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    const mime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
    return new File([blob], file.name, { type: mime, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}