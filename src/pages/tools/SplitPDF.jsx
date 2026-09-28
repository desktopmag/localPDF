import React, { useState } from 'react';
import { Download, Loader2, Scissors, X } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function SplitPDF() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState('each');
  const [ranges, setRanges] = useState('1-1');
  const [every, setEvery] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function onFile(f) {
    setFile(f);
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    setPageCount(doc.getPageCount());
    setRanges(`1-${doc.getPageCount()}`);
  }

  usePdfToolHandoff('split', onFile);

  function parseRanges(str, max) {
    const out = [];
    for (const part of str.split(',')) {
      const t = part.trim();
      if (!t) continue;
      if (t.includes('-')) {
        const [a, b] = t.split('-').map((n) => parseInt(n.trim(), 10));
        if (isNaN(a) || isNaN(b) || a < 1 || b > max || a > b) throw new Error(`Invalid range: ${t}`);
        out.push([a, b]);
      } else {
        const n = parseInt(t, 10);
        if (isNaN(n) || n < 1 || n > max) throw new Error(`Invalid page: ${t}`);
        out.push([n, n]);
      }
    }
    if (!out.length) throw new Error('Enter at least one page or range.');
    return out;
  }

  async function split() {
    setBusy(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const total = src.getPageCount();
      let groups = [];
      if (mode === 'each') {
        for (let i = 1; i <= total; i++) groups.push([i, i]);
      } else if (mode === 'ranges') {
        groups = parseRanges(ranges, total);
      } else {
        const n = Math.max(1, parseInt(every, 10) || 1);
        for (let i = 1; i <= total; i += n) groups.push([i, Math.min(i + n - 1, total)]);
      }

      const outputs = [];
      for (const [a, b] of groups) {
        const out = await PDFDocument.create();
        const idx = [];
        for (let p = a; p <= b; p++) idx.push(p - 1);
        const pages = await out.copyPages(src, idx);
        pages.forEach((pg) => out.addPage(pg));
        outputs.push({ name: a === b ? `page_${a}.pdf` : `pages_${a}-${b}.pdf`, bytes: await out.save() });
      }

      if (outputs.length === 1) {
        setResult({ blob: new Blob([outputs[0].bytes], { type: 'application/pdf' }), name: outputs[0].name, size: outputs[0].bytes.byteLength });
      } else {
        const zip = new JSZip();
        outputs.forEach((o) => zip.file(o.name, o.bytes));
        const blob = await zip.generateAsync({ type: 'blob' });
        setResult({ blob, name: 'split_pages.zip', size: blob.size });
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Split PDF" description="Extract pages or split a PDF into separate files by ranges." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="split" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => onFile(f[0])} accept="application/pdf" label="Drop a PDF to split" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Scissors className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{pageCount} pages · {formatBytes(file.size)}</span>
            <button onClick={() => setFile(null)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: 'each', label: 'Every page', hint: 'one file per page' },
              { id: 'ranges', label: 'By ranges', hint: 'e.g. 1-3, 5, 7-9' },
              { id: 'every', label: 'Every N pages', hint: 'split into chunks' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  mode === m.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <p className="font-display text-sm font-semibold text-foreground">{m.label}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.hint}</p>
              </button>
            ))}
          </div>

          {mode === 'ranges' && (
            <OptionCard label="Ranges (comma separated, 1-based)">
              <input value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5, 7-9"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
            </OptionCard>
          )}
          {mode === 'every' && (
            <OptionCard label="Pages per file">
              <input type="number" min="1" value={every} onChange={(e) => setEvery(e.target.value)}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
            </OptionCard>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={split} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Split &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}