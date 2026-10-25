/**
 * Promise API for the compressor. 'smart' and 'structure' run entirely inside compress.worker.js;
 * 'flatten' needs canvas rendering and runs on the main thread (its heavy lifting is still in workers).
 * Pass an AbortSignal to cancel: the worker is terminated immediately.
 */
function runInWorker(file, opts, { onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./compress.worker.js', import.meta.url), { type: 'module' });
    const cleanup = () => { worker.terminate(); signal?.removeEventListener('abort', onAbort); };
    const onAbort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener('abort', onAbort);
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') onProgress?.(data);
      else if (data.type === 'done') { cleanup(); resolve(data.result); }
      else {
        cleanup();
        if (data.aborted) reject(new DOMException('Cancelled', 'AbortError'));
        else { const e = new Error(data.message); e.code = data.code; reject(e); }
      }
    };
    worker.onerror = (e) => { cleanup(); reject(new Error(e.message || 'The compression worker failed to start.')); };
    file.arrayBuffer().then((buf) => {
      const input = new Uint8Array(buf);
      worker.postMessage({ input, opts }, [input.buffer]);
    }, (err) => { cleanup(); reject(err); });
  });
}

/**
 * @param {File} file
 * @param {{ mode?: 'smart'|'structure'|'flatten', level?: string, targetBytes?: number, options?: object }} opts
 * @param {{ onProgress?: Function, signal?: AbortSignal }} [hooks]
 */
export async function compressPdfFile(file, opts = {}, { onProgress, signal } = {}) {
  if (opts.mode === 'flatten') {
    const { flattenPdf } = await import('@/lib/pdfFlatten');
    return flattenPdf(file, { level: opts.level, onProgress, signal });
  }
  return runInWorker(file, opts, { onProgress, signal });
}
