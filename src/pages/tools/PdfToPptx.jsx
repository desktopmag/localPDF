import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { convertPdfToPptx, PPTX_MODE_INFO } from '@/lib/pdfToPptx';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function PdfToPptx() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('hybrid');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('pdf-to-pptx', setFile);

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
      const blob = await convertPdfToPptx(file, mode, setPhase);
      setResult({
        blob,
        name: file.name.replace(/\.pdf$/i, '') + '.pptx',
        size: blob.size,
      });
    } catch (e) {
      setError(e?.message || 'Could not build the presentation. Try Visual mode for difficult PDFs.');
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  return (
    <ToolShell
      title="PDF to PowerPoint"
      description="Three local conversion modes — hybrid, editable reconstruction, or pixel-perfect visual slides."
      lib="pdf.js + PptxGenJS + PyMuPDF"
    >
      {result ? (
        <DownloadResult toolSlug="pdf-to-pptx" result={result} onReset={reset} />
      ) : !file ? (
        <div className="space-y-6">
          <FileDropzone
            onFiles={(f) => {
              setFile(f[0]);
              setError(null);
            }}
            accept="application/pdf"
            label="Drop a PDF to convert to PowerPoint"
            hint="Slide decks and multi-page documents"
          />
        </div>
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={reset}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Conversion mode">
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(PPTX_MODE_INFO).map(([id, info]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${mode === id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
                >
                  <p className="font-display text-sm font-semibold text-foreground">{info.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{info.short}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{PPTX_MODE_INFO[mode].detail}</p>
          </OptionCard>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {mode === 'editable'
                ? 'Editable mode loads PyMuPDF WASM (~50 MB first time, cached). Your PDF stays in this tab.'
                : 'Hybrid and Visual run entirely with pdf.js + PptxGenJS — no extra engine download.'}
            </span>
          </div>

          {phase && <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{phase}</p>}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={convert} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Build PPTX
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
