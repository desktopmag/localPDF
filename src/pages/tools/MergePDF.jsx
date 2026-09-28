import React, { useState } from 'react';
import { ArrowUp, ArrowDown, X, FileStack, Plus, Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function MergePDF() {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function add(list) { setFiles((p) => [...p, ...list]); }

  usePdfToolHandoff('merge', (f) => add([f]));
  function remove(i) { setFiles((p) => p.filter((_, idx) => idx !== i)); }
  function move(i, dir) {
    setFiles((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const arr = [...p];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  function reset() { setFiles([]); setResult(null); }

  async function merge() {
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((pg) => out.addPage(pg));
      }
      const bytes = await out.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'merged.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Merge PDF" description="Combine multiple PDFs into one file, in the exact order you choose." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="merge" result={result} onReset={reset} />
      ) : files.length === 0 ? (
        <FileDropzone onFiles={add} accept="application/pdf" multiple label="Drop PDFs to merge" hint="select two or more — reorder them below" />
      ) : (
        <div className="space-y-3">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
              <FileStack className="h-5 w-5 shrink-0 text-accent" />
              <span className="flex-1 truncate text-sm text-foreground">{f.name}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{formatBytes(f.size)}</span>
              <div className="flex gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === files.length - 1} className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => remove(i)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}

          <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
            <Plus className="h-4 w-4" /> Add more
            <input type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => { add(Array.from(e.target.files)); e.target.value = ''; }} />
          </label>

          <div className="flex gap-3 pt-2">
            <PrimaryButton onClick={merge} disabled={files.length < 2} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Merge &amp; Download
            </PrimaryButton>
            <ResetButton onClick={reset}>Start over</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}