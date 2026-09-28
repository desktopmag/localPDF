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

export function consumeToolHandoff(toolSlug) {
  const pending = getPending();
  if (!pending || pending.targetSlug !== toolSlug) return null;
  setPending(null);
  return pending.file;
}
