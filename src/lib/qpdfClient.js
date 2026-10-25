/**
 * Thin promise API over src/lib/qpdf.worker.js. One short-lived worker per job: terminating it also
 * tears down qpdf's pthreads and frees all WASM memory.
 *
 * qpdf exit codes: 0 = ok, 3 = ok with warnings (output is still written), 2 = error.
 */
const BASE = new URL(`${import.meta.env.BASE_URL}qpdf`.replace(/\/{2,}/g, '/'), globalThis.location?.href ?? 'http://localhost/').href;

export class QpdfError extends Error {
  constructor(message, { exitCode, log } = {}) {
    super(message);
    this.name = 'QpdfError';
    this.exitCode = exitCode;
    this.log = log;
  }
}

function run(args, input, { mode = 'transform', signal } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof SharedArrayBuffer === 'undefined' || !globalThis.crossOriginIsolated) {
      reject(new QpdfError('This tool needs a cross-origin-isolated page (COOP/COEP headers). Reload the site; if it persists your browser or host is blocking SharedArrayBuffer.'));
      return;
    }
    const worker = new Worker(new URL('./qpdf.worker.js', import.meta.url), { type: 'module' });
    const done = (fn, v) => {
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
      fn(v);
    };
    const onAbort = () => done(reject, new DOMException('Cancelled', 'AbortError'));
    signal?.addEventListener('abort', onAbort);
    worker.onmessage = ({ data }) => (data.ok ? done(resolve, data) : done(reject, new QpdfError(data.error, { log: data.log })));
    worker.onerror = (e) => done(reject, new QpdfError(e.message || 'qpdf worker failed to start'));
    const copy = input instanceof Uint8Array ? input.slice() : new Uint8Array(input);
    worker.postMessage({ base: BASE, args, input: copy, mode }, [copy.buffer]);
  });
}

/** Transform a PDF with qpdf. `args` must NOT include the input/output paths; they are appended. */
export async function qpdfTransform(input, args, opts) {
  // Options go first, then input and output. For --encrypt the "--" terminator is part of `args`.
  const { exitCode, output, log } = await run([...args, '/in.pdf', '/out.pdf'], input, opts);
  if ((exitCode !== 0 && exitCode !== 3) || !output) {
    throw new QpdfError(lastError(log) || `qpdf failed (exit ${exitCode})`, { exitCode, log });
  }
  return { bytes: output, warnings: exitCode === 3 ? log.filter((l) => /warning/i.test(l)) : [] };
}

/** Run a query flag (e.g. --is-encrypted) and return the exit code. */
export async function qpdfQuery(input, args, opts) {
  const { exitCode, log } = await run([...args, '/in.pdf'], input, { ...opts, mode: 'query' });
  return { exitCode, log };
}

function lastError(log = []) {
  const line = [...log].reverse().find((l) => /error|invalid password|not a pdf|unable|can't|cannot/i.test(l)) || log[log.length - 1];
  return line ? line.replace(/^(qpdf|this\.program): /, '').replace(/^\/in\.pdf: /, '') : '';
}

export const isIsolated = () => typeof SharedArrayBuffer !== 'undefined' && !!globalThis.crossOriginIsolated;
