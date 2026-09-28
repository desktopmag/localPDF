import * as pdfjsLib from 'pdfjs-dist';

// Vite-friendly worker URL resolution (avoids the `?url` default-export quirk)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

export default pdfjsLib;