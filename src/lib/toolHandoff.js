/** In-memory handoff of a processed file between tools (same tab session). */

function getPending() {
  if (!globalThis.__localPdfToolHandoffPending) {
    globalThis.__localPdfToolHandoffPending = null;
  }
  return globalThis.__localPdfToolHandoffPending;
}

function setPending(value) {
  globalThis.__localPdfToolHandoffPending = value;
}

/** Tools that accept a PDF upload as their primary input. */
export const PDF_INPUT_TOOL_SLUGS = new Set([
  'merge',
  'split',
  'extract',
  'organize',
  'delete',
  'compress',
  'pdf-to-images',
  'pdf-to-docx',
  'pdf-to-pptx',
  'pdf-to-xlsx',
  'watermark',
  'page-numbers',
  'crop',
  'metadata',
  'sign',
]);

export function canHandoffPdfTo(toolSlug) {
  return PDF_INPUT_TOOL_SLUGS.has(toolSlug);
}

export function resultToHandoffFile(result) {
  if (!result?.blob) return null;
  const name = result.name || 'document.pdf';
  const isPdf =
    result.blob.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return null;
  return new File([result.blob], name, { type: 'application/pdf' });
}

export function stageToolHandoff(targetSlug, file) {
  setPending({ targetSlug, file });
}

/** Read staged file without clearing (safe for React Strict Mode remounts). */
export function getToolHandoffFile(toolSlug) {
  const pending = getPending();
  if (!pending || pending.targetSlug !== toolSlug) return null;
  return pending.file;
}

export function clearToolHandoff() {
  setPending(null);
}

/** @deprecated Prefer getToolHandoffFile — clearing on read breaks Strict Mode remounts. */
export function consumeToolHandoff(toolSlug) {
  const file = getToolHandoffFile(toolSlug);
  if (file) clearToolHandoff();
  return file;
}

/** Clone result bytes into a standalone File for the next tool. */
export async function resultToHandoffFileAsync(result) {
  if (!result?.blob) return null;
  const name = result.name || 'document.pdf';
  const isPdf =
    result.blob.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return null;
  const bytes = await result.blob.arrayBuffer();
  return new File([bytes], name, { type: 'application/pdf' });
}
