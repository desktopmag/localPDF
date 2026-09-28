import React, { useEffect, useState } from 'react';
import { Download, Loader2, FileText, X, AlertTriangle, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { convertPdfToDocx, getPyMuPDF } from '@/lib/pymupdfClient';
import { convertPdfToDocxFast, PDF_TO_DOCX_MODE_INFO } from '@/lib/pdfTextToDocx';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

const HOW_IT_WORKS = [
  'Glyphs are read from the PDF content stream — position, size, colour, spacing, and scaling — not just plain text.',
  'Pages are segmented into words, lines, columns, and reading order (including multi-column layouts).',
  'Structure is recovered where possible: tables, lists, headings, links, headers, and footers.',
  'Fonts are rebuilt and embedded into the DOCX when licensing allows.',
  'Output is real WordprocessingML (.docx) for Word, Google Docs, LibreOffice, and Pages.',
];

export default function PdfToDocx() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('fast');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [engineReady, setEngineReady] = useState(false);

  usePdfToolHandoff('pdf-to-docx', setFile);

  useEffect(() => {
    if (mode !== 'layout') return undefined;
    let cancelled = false;
    getPyMuPDF()
      .then(() => {
        if (!cancelled) setEngineReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode]);

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
      let blob;
      if (mode === 'fast') {
        blob = await convertPdfToDocxFast(file, setPhase);
      } else {
        if (!engineReady) {
          setPhase('Loading conversion engine (first visit downloads ~50 MB; cached afterward)…');
        }
        if (!engineReady) await getPyMuPDF();
        setPhase(
          'Rebuilding layout in WebAssembly (often several minutes per page for image-heavy PDFs)…',
        );
        blob = await convertPdfToDocx(file);
      }
      setResult({
        blob,
        name: file.name.replace(/\.pdf$/i, '') + '.docx',
        size: blob.size,
      });
    } catch (e) {
      setError(
        e?.message ||
          'Conversion failed. Scanned/image-only PDFs need OCR and are not supported. Password-protected files must be unlocked first.',
      );
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  const modeInfo = PDF_TO_DOCX_MODE_INFO[mode];

  return (
    <ToolShell
      title="PDF to Word"
      description="Convert to .docx in your browser — fast text extraction or slow layout rebuild."
      lib={modeInfo.lib}
    >
      {result ? (
        <DownloadResult toolSlug="pdf-to-docx" result={result} onReset={reset} />
      ) : !file ? (
        <div className="space-y-6">
          <FileDropzone
            onFiles={(f) => {
              setFile(f[0]);
              setError(null);
            }}
            accept="application/pdf"
            label="Drop a PDF to convert to Word"
            hint="Text-based PDFs work best — not scanned documents"
          />
          <details className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer font-display text-sm font-semibold text-foreground">
              How layout mode works
            </summary>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-relaxed text-muted-foreground">
              {HOW_IT_WORKS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Layout mode uses Artifex pdf2docx inside Pyodide. Fast mode only copies text lines and skips the WASM engine.
            </p>
          </details>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <FileText className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
            <button onClick={reset} className="rounded p-1.5 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>

          <OptionCard label="Conversion mode">
            <div className="grid gap-2 sm:grid-cols-2">
              {['fast', 'layout'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${mode === id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
                >
                  <span className="block text-sm font-medium text-foreground">
                    {PDF_TO_DOCX_MODE_INFO[id].label}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{modeInfo.detail}</p>
          </OptionCard>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {mode === 'fast'
                ? 'Fast mode uses pdf.js only. Your file stays on this device and is not uploaded.'
                : 'Layout mode runs Python pdf2docx in WebAssembly — much slower than desktop Word for image-heavy pages. The engine loads from jsDelivr on first use.'}
            </span>
          </div>

          {phase && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{phase}</p>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={convert} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Convert to DOCX
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
