/** Promise wrapper over src/lib/jpeg.worker.js (mozjpeg WASM). Lazy: the worker and WASM load on first use. */
export function createJpegPool() {
  const worker = new Worker(new URL('./jpeg.worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  let seq = 0;
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    data.ok ? p.resolve(data) : p.reject(new Error(data.error));
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'JPEG worker failed'));
    pending.clear();
  };
  const call = (msg, transfer) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...msg, id }, transfer);
    });
  return {
    /** @param {ArrayBuffer} bytes */
    recompress: (bytes, { quality, maxDim = 0, gray = false }) => call({ type: 'recompress', bytes, quality, maxDim, gray }, [bytes]),
    /** @param {ImageData} imageData */
    encode: (imageData, quality) =>
      call({ type: 'encode', data: imageData.data.buffer, width: imageData.width, height: imageData.height, quality }, [imageData.data.buffer]),
    terminate: () => worker.terminate(),
  };
}
