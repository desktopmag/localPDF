import React, { useState } from 'react';
import { Download, Loader2, FileCode2, X, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { createOffscreenHost, domElementToPdfBytes } from '@/lib/domToPdf';

export default function HtmlToPdf() {
  const [file, setFile] = useState(null);
  const [orientation, setOrientation] = useState('portrait');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function reset() { setFile(null); setResult(null); setError(null); }

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();

      const host = createOffscreenHost();
      const body = document.createElement('div');
      // Inline the file's HTML. External stylesheets/scripts won't load — this is a basic local renderer.
      body.innerHTML = text;
      host.appendChild(body);
      document.body.appendChild(host);

      let bytes;
      try {
        bytes = await domElementToPdfBytes(host, { orientation });
      } finally {
        host.remove();
      }
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: file.name.replace(/\.html?$/i, '') + '.pdf', size: bytes.byteLength });
    } catch (e) {
      setError(e?.message || 'Could not convert this HTML file. It may be too large or malformed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="HTML to PDF" description="Render a local HTML file to PDF in your browser. A basic renderer — external stylesheets and scripts are not loaded." lib="html2canvas + jsPDF">
      {result ? (
        <DownloadResult toolSlug="html-to-pdf" result={result} onReset={reset} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="text/html" label="Drop an .html file to convert" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <FileCode2 className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
            <button onClick={reset} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </div>

          <OptionCard label="Page orientation">
            <div className="flex gap-2">
              {[{ id: 'portrait', label: 'Portrait' }, { id: 'landscape', label: 'Landscape' }].map((o) => (
                <button key={o.id} onClick={() => setOrientation(o.id)}
                  className={`rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-widest ${orientation === o.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </OptionCard>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={convert} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Convert &amp; Download
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}