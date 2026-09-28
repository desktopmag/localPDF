import React, { useState } from 'react';
import { Download, Loader2, Minimize2, X, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, getPdfjs, renderPageCanvas } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function CompressPDF() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('lossless');
  const [quality, setQuality] = useState(0.78);
  const [scale, setScale] = useState(2.0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function reset() { setFile(null); setResult(null); setError(null); }

  usePdfToolHandoff('compress', (f) => {
    setFile(f);
    setError(null);
  });

  function buildNote(originalSize, outSize) {
    const reduced = outSize < originalSize;
    const pct = reduced ? Math.round((1 - outSize / originalSize) * 100) : 0;
    return (
      <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs">
        <span className="uppercase tracking-widest text-primary">Result</span>
        <span className="text-foreground">{formatBytes(originalSize)} → {formatBytes(outSize)}</span>
        <span className={reduced ? 'text-primary' : 'text-muted-foreground'}>
          {reduced ? `−${pct}%` : 'no reduction · original returned'}
        </span>
      </div>
    );
  }

  async function compress() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let outBytes;
      if (mode === 'lossless') {
        const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        outBytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      } else {
        const doc = await PDFDocument.create();
        const pdfjs = await getPdfjs(file);
        const total = pdfjs.numPages;
        try {
          for (let i = 1; i <= total; i++) {
            const canvas = await renderPageCanvas(pdfjs, i, scale);
            const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
            const img = await doc.embedJpg(await blob.arrayBuffer());
            const page = doc.addPage([canvas.width, canvas.height]);
            page.drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height });
            // yield to the event loop so the spinner stays alive between pages
            await new Promise((r) => setTimeout(r, 0));
          }
        } finally {
          await pdfjs.destroy();
        }
        outBytes = await doc.save();
      }

      // Never return a file larger than the original — a "compress" tool should not inflate.
      const reduced = outBytes.byteLength < file.size;
      const finalBytes = reduced ? outBytes : await file.arrayBuffer();
      setResult({
        blob: new Blob([finalBytes], { type: 'application/pdf' }),
        name: 'compressed.pdf',
        size: finalBytes.byteLength,
        note: buildNote(file.size, finalBytes.byteLength),
      });
    } catch (e) {
      setError(e?.message || 'Could not compress this PDF. It may be encrypted or corrupted.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Compress PDF" description="Re-pack or rasterize pages to shrink file size, all locally." lib="pdf.js + pdf-lib">
      {result ? (
        <DownloadResult toolSlug="compress" result={result} onReset={reset} note={result.note} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="application/pdf" label="Drop a PDF to compress" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Minimize2 className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
            <button onClick={reset} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'lossless', label: 'Lossless re-pack', hint: 'Re-encodes streams. Best for text PDFs.' },
              { id: 'rasterize', label: 'Rasterize (lossy)', hint: 'Renders pages to images. Best for scanned/image PDFs.' },
            ].map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`rounded-xl border p-4 text-left transition-all ${mode === m.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}>
                <p className="font-display text-sm font-semibold text-foreground">{m.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
              </button>
            ))}
          </div>

          {mode === 'rasterize' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <OptionCard label={`Image quality — ${Math.round(quality * 100)}%`}>
                <input type="range" min="0.5" max="0.95" step="0.01" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-full accent-primary" />
              </OptionCard>
              <OptionCard label={`Render scale — ${scale.toFixed(1)}x`}>
                <input type="range" min="1.5" max="3" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full accent-primary" />
              </OptionCard>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={compress} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Compress &amp; Download
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}