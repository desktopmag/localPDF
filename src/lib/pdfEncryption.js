/**
 * Real PDF encryption in the browser: AES-256 (PDF 2.0 / revision 6) via qpdf compiled to WASM.
 * (pdf-lib has no encryption support: its `userPassword` save option is silently ignored.)
 */
import { qpdfQuery, qpdfTransform, QpdfError } from '@/lib/qpdfClient';

export function randomPassword(length = 24) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const limit = 256 - (256 % alphabet.length); // rejection sampling: no modulo bias
  let out = '';
  while (out.length < length) {
    const buf = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of buf) {
      if (b < limit && out.length < length) out += alphabet[b % alphabet.length];
    }
  }
  return out;
}

/**
 * @param {Uint8Array|ArrayBuffer} input
 * @param {{ userPassword: string, ownerPassword?: string, print?: string, modify?: string, extract?: boolean }} o
 * @returns {Promise<{ bytes: Uint8Array, ownerPassword: string, ownerGenerated: boolean }>}
 */
export async function encryptPdf(input, { userPassword, ownerPassword = '', print = 'full', modify = 'all', extract = true, signal } = {}) {
  if (!userPassword) throw new Error('Enter a password.');
  const restricted = print !== 'full' || modify !== 'all' || !extract;
  // If the owner password equals the user password, whoever opens the file has owner rights and the
  // restrictions mean nothing. When restrictions are requested without an owner password, generate one.
  const ownerGenerated = !ownerPassword && restricted;
  const owner = ownerPassword || (restricted ? randomPassword() : userPassword);
  const args = [
    '--encrypt', userPassword, owner, '256',
    `--print=${print}`, `--modify=${modify}`, `--extract=${extract ? 'y' : 'n'}`,
    '--',
  ];
  const { bytes } = await qpdfTransform(input, args, { signal });
  return { bytes, ownerPassword: owner, ownerGenerated };
}

/**
 * @returns {Promise<'plain'|'needs-password'|'ok'>} 'ok' = encrypted and the supplied password (possibly empty) opens it.
 * Uses `--is-encrypted --password=...`: exit 0 = encrypted and opened, 2 + "invalid password" = wrong/missing password,
 * 2 otherwise = not encrypted.
 */
export async function checkPassword(input, password = '', { signal } = {}) {
  const { exitCode, log } = await qpdfQuery(input, ['--is-encrypted', `--password=${password}`], { signal });
  if (exitCode === 0) return 'ok';
  if (log.some((l) => /invalid password/i.test(l))) return 'needs-password';
  const fatal = log.find((l) => /not a pdf|unable to find|damaged|can't find|cannot/i.test(l));
  if (fatal) throw new Error(`Could not read this PDF: ${fatal.replace(/^this\.program: (\/in\.pdf: )?/, '')}`);
  return 'plain';
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password.');
    this.name = 'WrongPasswordError';
  }
}

/** Remove encryption. Works with the user or owner password; empty password works for owner-restricted-only files. */
export async function decryptPdf(input, password = '', { signal } = {}) {
  const state = await checkPassword(input, password, { signal });
  if (state === 'plain') throw new Error('This PDF is not password-protected.');
  if (state === 'needs-password') throw new WrongPasswordError();
  try {
    const { bytes } = await qpdfTransform(input, [`--password=${password}`, '--decrypt'], { signal });
    return bytes;
  } catch (e) {
    if (e instanceof QpdfError && /invalid password/i.test(e.message)) throw new WrongPasswordError();
    throw e;
  }
}
