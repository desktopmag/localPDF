/** LibreOffice WASM — lazy WorkerBrowserConverter for Office → PDF (PPTX, PPT, ODP). */

const LO_PKG_VERSION = '2.7.2';
const UNPKG = `https://unpkg.com/@matbee/libreoffice-converter@${LO_PKG_VERSION}`;

export function isCrossOriginIsolated() {
  return typeof globalThis.crossOriginIsolated === 'boolean' && globalThis.crossOriginIsolated;
}

function wasmBaseUrl() {
  const custom = import.meta.env.VITE_LIBREOFFICE_WASM_BASE;
  if (custom && String(custom).trim()) {
    const b = String(custom).trim();
    return b.endsWith('/') ? b : `${b}/`;
  }
  return `${UNPKG}/wasm/`;
}

function browserWorkerUrl() {
  const custom = import.meta.env.VITE_LIBREOFFICE_WORKER_JS;
  if (custom && String(custom).trim()) return String(custom).trim();
  return `${UNPKG}/dist/browser.worker.global.js`;
}

let converter = null;
let initPromise = null;
let lastProgressCb = null;

/**
 * @param {File} file
 * @param {(msg: string) => void} [onProgress]
 * @param {{ quality?: number }} [pdf]
 */
export async function convertPresentationToPdf(file, onProgress, pdf = {}) {
  if (!isCrossOriginIsolated()) {
    throw new Error(
      'PowerPoint to PDF needs cross-origin isolation (SharedArrayBuffer). Deploy with COOP/COEP headers — see README Cloudflare Pages section.',
    );
  }

  lastProgressCb = onProgress;
  const { WorkerBrowserConverter, createWasmPaths } = await import('@matbee/libreoffice-converter/browser');

  if (!initPromise) {
    converter = new WorkerBrowserConverter({
      ...createWasmPaths(wasmBaseUrl()),
      browserWorkerJs: browserWorkerUrl(),
      onProgress: (info) => {
        const msg = info.message || `${Math.round(info.percent)}%`;
        lastProgressCb?.(msg);
      },
    });
    initPromise = converter.initialize().catch((err) => {
      initPromise = null;
      converter = null;
      throw err;
    });
  }

  onProgress?.('Loading LibreOffice engine (first use downloads ~200 MB, then cached)…');
  await initPromise;

  onProgress?.('Converting slides to PDF…');
  const result = await converter.convertFile(file, {
    outputFormat: 'pdf',
    pdf: { quality: pdf.quality ?? 95 },
  });

  const mime = result.mimeType || 'application/pdf';
  return new Blob([result.data], { type: mime });
}
