/**
 * Runs the compression engine off the main thread. The client terminates this worker to cancel
 * (which also tears down the nested mozjpeg / qpdf workers).
 *
 * in : { input: Uint8Array, opts: { mode, level, targetBytes, options } }
 * out: { type: 'progress', ...progress } | { type: 'done', result } | { type: 'error', message, code, aborted }
 */
import { compressPdf } from '@/lib/pdfCompress';

self.onmessage = async ({ data }) => {
  const { input, opts } = data;
  try {
    const result = await compressPdf(input, { ...opts, onProgress: (p) => self.postMessage({ type: 'progress', ...p }) });
    self.postMessage({ type: 'done', result }, [result.bytes.buffer]);
  } catch (e) {
    self.postMessage({ type: 'error', message: e?.message || String(e), code: e?.code, aborted: e?.name === 'AbortError' });
  }
};
