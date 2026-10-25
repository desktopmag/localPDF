import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, ErrorNote } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { loadPdfDoc, friendlyMessage } from '@/lib/pdfSafe';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function DeletePages() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function onFile(f) {
    setError(null);
    try {
      const doc = await loadPdfDoc(f);
      setFile(f);
      setPageCount(doc.getPageCount());
      setSelected([]);
    } catch (e) {
      setFile(null);
      setError(friendlyMessage(e));
    }
  }

  usePdfToolHandoff('delete', onFile);

  function toggle(n) {
    setSelected((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  }

  async function del() {
    setBusy(true);
    setError(null);
    try {
      const src = await loadPdfDoc(file);
      const keep = [];
      for (let i = 1; i <= pageCount; i++) if (!selected.includes(i)) keep.push(i - 1);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, keep);
      pages.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'pages_removed.pdf', size: bytes.byteLength });
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Delete Pages" description="Remove unwanted pages and keep the rest of the document." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="delete" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <div className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <FileDropzone onFiles={(f) => onFile(f[0])} accept="application/pdf" label="Drop a PDF to edit" />
        </div>
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={onFile}
            meta={`${pageCount} pages · ${formatBytes(file.size)}`}
          />

          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tap pages to mark for deletion ({selected.length} selected)</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => toggle(n)}
                className={`h-10 w-10 rounded-lg border font-mono text-sm transition-all ${selected.includes(n) ? 'border-destructive bg-destructive/15 text-destructive line-through' : 'border-border text-foreground hover:border-primary/40'}`}>
                {n}
              </button>
            ))}
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={del} disabled={!selected.length || selected.length >= pageCount} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Delete &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}