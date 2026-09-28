import React, { useState } from 'react';
import { Download, Loader2, Presentation, X, AlertTriangle, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { convertPdfToPptx, PPTX_MODE_INFO } from '@/lib/pdfToPptx';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

const ENGINES = [
  {
    title: 'Smart hybrid engine',
    body: 'Renders each page at up to 2.5× for a sharp background, then overlays invisible text — searchable and copyable in PowerPoint.',
  },
  {
    title: 'XObject image extraction',
    body: 'In Editable mode, embedded PDF images are pulled via PyMuPDF (not screenshots) and placed using their bounding boxes.',
  },
  {
    title: 'Intelligent text layout',
    body: 'Line merging, gap-based spaces, bold/italic flags, and simple title/heading/body classification in Editable mode.',
  },
  {
    title: 'Color fidelity',
    body: 'Slide backgrounds sampled from page corners; text colours taken from PDF spans with sensible fallbacks.',
  },
];

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
          <details className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer font-display text-sm font-semibold text-foreground">
              Conversion engines (local)
            </summary>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
              {ENGINES.map((e) => (
                <li key={e.title}>
                  <span className="font-medium text-foreground">{e.title}</span> — {e.body}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Full vector shape reconstruction (lines/rectangles as PPTX shapes) is not included yet — Editable mode focuses
              on text and embedded images. Hybrid and Visual modes work without the large WASM download.
            </p>
          </details>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Presentation className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
            <button onClick={reset} className="rounded p-1.5 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>

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
