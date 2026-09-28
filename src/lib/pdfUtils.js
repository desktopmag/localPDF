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
  return pdfjsLib.getDocument({ data: bytes }).promise;
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