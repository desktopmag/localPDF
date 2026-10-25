/**
 * Shared safety helpers for the pdf-lib based tools.
 *
 * pdf-lib cannot decrypt a PDF. Loading one with `ignoreEncryption: true` and re-saving it silently produces
 * a file whose (still encrypted) streams are unreadable, so every editing tool goes through `loadPdfDoc`,
 * which refuses encrypted input with a clear "Unlock it first" message instead of writing a broken file.
 */
import { PDFDocument } from 'pdf-lib';

/** An error whose message is safe and useful to show to the user as-is. */
export class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserError';
  }
}

export const ENCRYPTED_MESSAGE =
  'This PDF is password-protected. Remove the password first with the Unlock PDF tool, then come back.';

/**
 * @param {File|Blob|ArrayBuffer|Uint8Array} src
 * @param {{ allowEncrypted?: boolean }} [opts]
 * @returns {Promise<import('pdf-lib').PDFDocument>}
 */
export async function loadPdfDoc(src, { allowEncrypted = false } = {}) {
  const bytes = src instanceof ArrayBuffer || ArrayBuffer.isView(src) ? src : await src.arrayBuffer();
  let doc;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });
  } catch (e) {
    throw new UserError(friendlyMessage(e));
  }
  if (doc.isEncrypted && !allowEncrypted) throw new UserError(ENCRYPTED_MESSAGE);
  return doc;
}

/** Turn a low-level library error into something a person can act on. */
export function friendlyMessage(e, fallback = 'Something went wrong while processing this file.') {
  if (e instanceof UserError) return e.message;
  const msg = String(e?.message || e || '');
  if (/No PDF header|Failed to parse PDF|Invalid object ref|PDFInvalidObject|Expected instance of PDFDict/i.test(msg)) {
    return "This file doesn't look like a valid PDF, or it is damaged.";
  }
  if (/encrypted|password/i.test(msg)) return ENCRYPTED_MESSAGE;
  if (/WinAnsi|cannot encode|can't encode|Unsupported character/i.test(msg)) {
    return "The text contains characters the built-in PDF font can't draw (for example Hindi, Chinese, Arabic or emoji). Use Latin characters for now.";
  }
  if (/out of memory|Array buffer allocation failed|Invalid array length/i.test(msg)) {
    return 'This file is too large for your browser to handle. Try a smaller file.';
  }
  return msg && msg.length < 200 ? msg : fallback;
}

/** Throws a UserError if the standard font cannot encode `text`. */
export function assertEncodable(font, text) {
  const allowed = new Set(font.getCharacterSet());
  for (const ch of String(text)) {
    if (!allowed.has(ch.codePointAt(0)) && ch !== '\n') {
      throw new UserError(friendlyMessage(new Error('WinAnsi')));
    }
  }
}
