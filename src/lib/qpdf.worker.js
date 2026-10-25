/**
 * Runs one qpdf (WASM) command in isolation. The qpdf runtime is served same-origin from /qpdf/
 * (see scripts/sync-wasm-assets.mjs); Emscripten re-uses qpdf.js to spawn its own pthread workers,
 * which is why the files live in public/ and not in the Vite bundle.
 *
 * Message in : { base, args: string[], input: Uint8Array }   (input is written to /in.pdf, output read from /out.pdf)
 * Message out: { ok: true, exitCode, output: Uint8Array|null, log: string[] } | { ok: false, error }
 */
self.onmessage = async ({ data }) => {
  const { base, args, input, mode = 'transform' } = data;
  const log = [];
  // This qpdf build ignores Module.print/printErr and writes to console.log/console.error (bound at
  // init time), so capture them by swapping the worker's console before init.
  console.log = (...a) => log.push(a.join(' '));
  console.error = (...a) => log.push(a.join(' '));
  try {
    const { default: init } = await import(/* @vite-ignore */ `${base}/qpdf.js`);
    const mod = await init({
      noInitialRun: true,
      locateFile: (file) => `${base}/${file}`,
    });
    mod.FS.writeFile('/in.pdf', input);
    const exitCode = mod.callMain(args);
    let output = null;
    if (mode === 'transform') {
      try {
        output = mod.FS.readFile('/out.pdf');
      } catch {
        output = null;
      }
    }
    const transfer = output ? [output.buffer] : [];
    self.postMessage({ ok: true, exitCode, output, log }, transfer);
  } catch (e) {
    self.postMessage({ ok: false, error: e?.message || String(e), log });
  }
};
