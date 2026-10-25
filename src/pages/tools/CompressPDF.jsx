import React, { useRef, useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

const MODES = [
  { id: 'smart', label: 'Smart (recommended)', hint: 'Re-encodes embedded JPEG photos with mozjpeg, then repacks the file with qpdf. Text stays selectable.' },
  { id: 'structure', label: 'Structure only (lossless)', hint: 'qpdf repack: object streams + maximum Flate compression. Pixel-identical, smaller gains.' },
  { id: 'flatten', label: 'Flatten to images (lossy)', hint: 'Renders each page to a mozjpeg image. Smallest for scans, but text is no longer selectable.' },
];

const PRESET_IDS = ['low', 'medium', 'high'];
const PRESET_COPY = {
  low: { label: 'Low quality', hint: 'Smallest file · JPEG q50, images ≤ 1600 px' },
  medium: { label: 'Medium', hint: 'Balanced · JPEG q70, images ≤ 2400 px' },
  high: { label: 'High quality', hint: 'Light · JPEG q85, no resizing' },
};

const PHASE_LABEL = { images: 'Recompressing images', pages: 'Rendering pages', optimise: 'Optimising structure' };

export default function CompressPDF() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('smart');
  const [preset, setPreset] = useState('medium');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setResult(null);
    setError(null);
  }

  usePdfToolHandoff('compress', (f) => {
    setFile(f);
    setError(null);
  });

  function buildNote(originalSize, outSize, images, usedOriginal) {
    const pct = outSize < originalSize ? Math.round((1 - outSize / originalSize) * 100) : 0;
    return (
      <div className="inline-flex flex-col items-center gap-1">
        <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs">
          <span className="uppercase tracking-widest text-primary">Result</span>
          <span className="text-foreground">{formatBytes(originalSize)} → {formatBytes(outSize)}</span>
          <span className={pct ? 'text-primary' : 'text-muted-foreground'}>{pct ? `−${pct}%` : usedOriginal ? 'already optimal · original returned' : 'no reduction'}</span>
        </div>
        {images && images.found > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {images.recompressed}/{images.found} JPEG images recompressed ({formatBytes(images.before)} → {formatBytes(images.after)})
          </span>
        )}
      </div>
    );
  }

  async function compress() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress('Loading compression engine…');
    abortRef.current = new AbortController();
    try {
      const { compressPdf } = await import('@/lib/pdfCompress'); // lazy: pulls in qpdf + mozjpeg workers only now
      const out = await compressPdf(file, {
        mode,
        preset,
        signal: abortRef.current.signal,
        onProgress: ({ phase, done, total }) => setProgress(`${PHASE_LABEL[phase] ?? phase}${total > 1 ? ` (${done}/${total})` : '…'}`),
      });
      setResult({
        blob: new Blob([out.bytes], { type: 'application/pdf' }),
        name: 'compressed.pdf',
        size: out.bytes.byteLength,
        note: buildNote(out.originalSize, out.bytes.byteLength, out.images, out.usedOriginal),
      });
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Could not compress this PDF. It may be encrypted or corrupted.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <ToolShell title="Compress PDF" description="Shrink PDFs with mozjpeg and qpdf, running entirely in your browser." lib="qpdf + mozjpeg (WASM)">
      {result ? (
        <DownloadResult toolSlug="compress" result={result} onReset={reset} note={result.note} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="application/pdf" label="Drop a PDF to compress" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview file={file} onRemove={reset} onFileChange={setFile} meta={formatBytes(file.size)} />

          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} disabled={busy}
                className={`rounded-xl border p-4 text-left transition-all ${mode === m.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}>
                <p className="font-display text-sm font-semibold text-foreground">{m.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
              </button>
            ))}
          </div>

          {mode !== 'structure' && (
            <div role="radiogroup" aria-label="Quality preset" className="grid gap-3 sm:grid-cols-3">
              {PRESET_IDS.map((id) => (
                <button key={id} role="radio" aria-checked={preset === id} onClick={() => setPreset(id)} disabled={busy}
                  className={`rounded-xl border p-3 text-left transition-all ${preset === id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}>
                  <p className="font-display text-sm font-semibold text-foreground">{PRESET_COPY[id].label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{PRESET_COPY[id].hint}</p>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PrimaryButton onClick={compress} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Compress &amp; Download
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
            {busy && <span className="font-mono text-xs text-muted-foreground" aria-live="polite">{progress}</span>}
          </div>
        </div>
      )}
    </ToolShell>
  );
}
