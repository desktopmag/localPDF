import React, { useRef, useState } from 'react';
import { Check, Copy, Download, Loader2, ScanText, X } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { OptionCard, PrimaryButton } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

const QUALITY = [
  { id: 'fast', label: 'Fast', scale: 2, hint: 'About 144 dpi. Quick; fine for clean scans.' },
  { id: 'accurate', label: 'Accurate', scale: 3, hint: 'About 216 dpi. Slower, better on small or faint text.' },
];

export default function OcrPDF() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState('fast');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(null);

  usePdfToolHandoff('ocr', (f) => {
    setFile(f);
    setError(null);
  });

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setResult(null);
    setText('');
    setError(null);
    setProgress(null);
  }

  async function run() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setText('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // Lazy: pdf-lib/pdf.js/Tesseract only load when the user actually runs OCR.
      const { ocrPdf } = await import('@/lib/ocr');
      const out = await ocrPdf(file, {
        scale: QUALITY.find((q) => q.id === quality).scale,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setText(out.text);
      const note = (
        <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs">
          <span className="uppercase tracking-widest text-primary">OCR</span>
          <span className="text-foreground">{out.pages} page{out.pages === 1 ? '' : 's'} · {out.words} words indexed</span>
          {out.skippedRotated > 0 && (
            <span className="text-muted-foreground">{out.skippedRotated} rotated page(s) have no text layer — use the text output</span>
          )}
        </div>
      );
      setResult({
        blob: new Blob([out.pdfBytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-searchable.pdf',
        size: out.pdfBytes.byteLength,
        note,
      });
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e?.message || 'OCR failed. The PDF may be encrypted or corrupted.');
    } finally {
      setBusy(false);
      setProgress(null);
      abortRef.current = null;
    }
  }

  function downloadTxt() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/\.pdf$/i, '') + '-ocr.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pct = progress && progress.pages
    ? Math.round((((progress.page > 0 ? progress.page - 1 : 0) + (progress.page > 0 ? progress.fraction : 0)) / progress.pages) * 100)
    : 0;

  return (
    <ToolShell
      title="OCR PDF"
      description="Turn scanned PDFs into searchable, copyable text. English, 100% in your browser — the OCR engine and language data are served from bolapdf.com, not a third party."
      lib="Tesseract.js"
    >
      {!file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="application/pdf" label="Drop a scanned PDF to OCR" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview file={file} onRemove={reset} onFileChange={setFile} meta={formatBytes(file.size)} />

          {!result && (
            <>
              <OptionCard label="Quality">
                <div className="grid gap-3 sm:grid-cols-2">
                  {QUALITY.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setQuality(q.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${quality === q.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}
                    >
                      <p className="font-display text-sm font-semibold text-foreground">{q.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{q.hint}</p>
                    </button>
                  ))}
                </div>
              </OptionCard>

              {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton onClick={run} busy={busy} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />} {busy ? 'Recognising…' : 'Run OCR'}
                </PrimaryButton>
                {busy && (
                  <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-foreground">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                )}
                {busy && progress && (
                  <span role="status" aria-live="polite" className="font-mono text-xs text-muted-foreground">
                    {progress.page > 0 ? `Page ${progress.page} of ${progress.pages} · ${pct}%` : `Loading OCR engine… (first run downloads ~3 MB of language data, then it is cached)`}
                  </span>
                )}
              </div>
            </>
          )}

          {result && (
            <>
              <DownloadResult toolSlug="ocr" result={result} onReset={reset} note={result.note} />
              <div className="space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recognised text</p>
                <textarea readOnly value={text} className="min-h-[200px] w-full rounded-xl border border-border bg-muted/20 p-4 font-mono text-xs leading-relaxed text-foreground outline-none" />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={downloadTxt} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-primary/40">
                    <Download className="h-4 w-4" /> Download .txt
                  </button>
                  <button type="button" onClick={copyAll} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-primary/40">
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}
