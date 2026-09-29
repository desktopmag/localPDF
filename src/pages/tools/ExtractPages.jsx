import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function ExtractPages() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function onFile(f) {
    setFile(f);
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    setPageCount(doc.getPageCount());
    setSelected([]);
  }

  usePdfToolHandoff('extract', onFile);

  function toggle(n) {
    setSelected((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].sort((a, b) => a - b)));
  }

  function selectAll() {
    setSelected(Array.from({ length: pageCount }, (_, i) => i + 1));
  }

  function clearAll() {
    setSelected([]);
  }

  async function extract() {
    setBusy(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const indices = selected.map((n) => n - 1);
      const copied = await out.copyPages(src, indices);
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'extracted.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Extract Pages" description="Pull specific pages out of a PDF into a new file — keep only what you pick." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="extract" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => onFile(f[0])} accept="application/pdf" label="Drop a PDF to extract pages from" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={onFile}
            meta={`${pageCount} pages · ${formatBytes(file.size)}`}
          />

          <OptionCard label={`Select pages to extract · ${selected.length} chosen`}>
            <div className="mb-3 flex gap-2">
              <button onClick={selectAll} className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground hover:border-primary/40">All</button>
              <button onClick={clearAll} className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground hover:border-primary/40">None</button>
            </div>
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => toggle(n)}
                  className={`aspect-square rounded-lg border font-mono text-xs transition-all ${selected.includes(n) ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {n}
                </button>
              ))}
            </div>
          </OptionCard>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={extract} disabled={!selected.length} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Extract &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}