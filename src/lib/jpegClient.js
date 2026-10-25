/**
 * Pool of mozjpeg workers (src/lib/jpeg.worker.js). Lazy: workers and WASM load on first use.
 * Each worker runs ONE job at a time (images can be tens of MB decoded), the rest wait in a queue.
 * Works from the main thread and from inside another worker (nested workers).
 */
export function createJpegPool(size = 1) {
  const workers = Array.from({ length: Math.max(1, size) }, () => {
    const w = new Worker(new URL('./jpeg.worker.js', import.meta.url), { type: 'module' });
    return { w, job: null };
  });
  const queue = [];
  let seq = 0;
  let dead = false;

  const pump = () => {
    for (const slot of workers) {
      if (slot.job || !queue.length) continue;
      const job = queue.shift();
      slot.job = job;
      slot.w.postMessage({ ...job.msg, id: job.id }, job.transfer);
    }
  };
  for (const slot of workers) {
    slot.w.onmessage = ({ data }) => {
      const job = slot.job;
      if (!job || job.id !== data.id) return;
      slot.job = null;
      data.ok ? job.resolve(data) : job.reject(new Error(data.error));
      pump();
    };
    slot.w.onerror = (e) => {
      const job = slot.job;
      slot.job = null;
      job?.reject(new Error(e.message || 'JPEG worker failed'));
      pump();
    };
  }
  const call = (msg, transfer = []) =>
    new Promise((resolve, reject) => {
      if (dead) { reject(new DOMException('Cancelled', 'AbortError')); return; }
      queue.push({ id: ++seq, msg, transfer, resolve, reject });
      pump();
    });

  return {
    size: workers.length,
    /** Quality-searched re-encode of one PDF image. See jpeg.worker.js for the message shapes. */
    optimize: (job, transfer) => call({ type: 'optimize', ...job }, transfer),
    /** @param {ImageData} imageData */
    encode: (imageData, quality) =>
      call({ type: 'encode', data: imageData.data.buffer, width: imageData.width, height: imageData.height, quality }, [imageData.data.buffer]),
    terminate: () => {
      dead = true;
      for (const s of workers) { s.w.terminate(); s.job?.reject(new DOMException('Cancelled', 'AbortError')); s.job = null; }
      for (const j of queue.splice(0)) j.reject(new DOMException('Cancelled', 'AbortError'));
    },
  };
}
