import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { convertPresentationToPdf, isCrossOriginIsolated } from '@/lib/libreOfficeClient';

const HERO_TAGS = ['Hi-Fi', 'Pixel-perfect', 'Vector fallback'];
const FEATURE_TAGS = ['Shapes', 'Gradients', 'Tables', 'Images', 'Auto-fit', 'Clipping', 'Zero upload'];

export default function PptxToPdf() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(95);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const isolated = isCrossOriginIsolated();

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase('');
  }

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const blob = await convertPresentationToPdf(file, setPhase, { quality });
      setResult({
        blob,
        name: file.name.replace(/\.(pptx|ppt|odp)$/i, '') + '.pdf',
        size: blob.size,
      });
    } catch (e) {
      setError(e?.message || 'Conversion failed. Try a smaller deck or reload after enabling isolation headers.');
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  return (
    <ToolShell
      title="PowerPoint to PDF"
      description="LibreOffice WASM export — hi-fi slides with vectors, gradients, tables, and images. Nothing uploaded."
      lib="LibreOffice WASM"
    >
      {result ? (
        <DownloadResult toolSlug="pptx-to-pdf" result={result} onReset={reset} />
      ) : !file ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {HERO_TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-primary"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {FEATURE_TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
          <FileDropzone
            onFiles={(f) => {
              setFile(f[0]);
              setError(null);
            }}
            accept=".ppt,.pptx,.odp,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation"
            label="Drop PowerPoint or ODP to convert"
            hint=".ppt · .pptx · .odp"
          />
          {!isolated && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Cross-origin isolation is off in this tab. PowerPoint to PDF will not run until COOP/COEP headers are
                set (included in <code className="text-[10px]">public/_headers</code> for Cloudflare Pages). Reload after
                deploy or use <code className="text-[10px]">npm run dev</code> locally.
              </span>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Uses headless LibreOffice in WebAssembly — the same class of engine as desktop “Export to PDF”, including
            slide masters, shapes, and embedded media. First visit downloads the WASM runtime; your deck stays on-device.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={reset}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="PDF image quality (embedded raster)">
            <div className="flex flex-wrap gap-2">
              {[90, 95, 100].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`rounded-lg border px-4 py-2 font-mono text-xs ${quality === q ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}
                >
                  {q}%
                </button>
              ))}
            </div>
          </OptionCard>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Vector content stays vector where LibreOffice can emit it; photos use the quality setting above.</span>
          </div>

          {phase && <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{phase}</p>}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={convert} busy={busy} disabled={!isolated}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Convert to PDF
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
