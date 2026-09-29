import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { createOffscreenHost, domElementToPdfBytes } from '@/lib/domToPdf';

export default function DocxToPdf() {
  const [file, setFile] = useState(null);
  const [orientation, setOrientation] = useState('portrait');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { default: mammoth } = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

      const host = createOffscreenHost();
      const body = document.createElement('div');
      body.innerHTML = html;
      host.appendChild(body);
      document.body.appendChild(host);

      let bytes;
      try {
        bytes = await domElementToPdfBytes(host, { orientation });
      } finally {
        host.remove();
      }

      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.docx$/i, '') + '.pdf',
        size: bytes.byteLength,
      });
    } catch (e) {
      setError(e?.message || 'Could not convert this document. Only .docx is supported in-browser.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="Word to PDF"
      description="Convert a local .docx file to PDF in your browser. Layout is approximate — complex formatting, fonts, and legacy .doc files are not supported."
      lib="mammoth + html2canvas + jsPDF"
    >
      {result ? (
        <DownloadResult toolSlug="docx-to-pdf" result={result} onReset={reset} />
      ) : !file ? (
        <FileDropzone
          onFiles={(f) => {
            setFile(f[0]);
            setError(null);
          }}
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          label="Drop a .docx file to convert"
          hint="Microsoft Word 2007+ format only — not .doc"
        />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={reset}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Page orientation">
            <div className="flex gap-2">
              {[{ id: 'portrait', label: 'Portrait' }, { id: 'landscape', label: 'Landscape' }].map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOrientation(o.id)}
                  className={`rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-widest ${orientation === o.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}
                >
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
