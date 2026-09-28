import React, { useState } from 'react';
import { Download, Loader2, Hash, X } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function PageNumbers() {
  const [file, setFile] = useState(null);
  const [position, setPosition] = useState('bottom-center');
  const [start, setStart] = useState(1);
  const [size, setSize] = useState(12);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('page-numbers', setFile);

  async function apply() {
    setBusy(true);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      pages.forEach((page, i) => {
        const { width, height } = page.getSize();
        const num = start + i;
        const txt = String(num);
        const tw = font.widthOfTextAtSize(txt, size);
        const margin = 24;
        let x, y;
        if (position.startsWith('top')) y = height - margin;
        else y = margin;
        if (position.endsWith('left')) x = margin;
        else if (position.endsWith('right')) x = width - margin - tw;
        else x = (width - tw) / 2;
        page.drawText(txt, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
      });
      const bytes = await doc.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'numbered.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Page Numbers" description="Add page numbers with position, size and a custom start number." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="page-numbers" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => setFile(f[0])} accept="application/pdf" label="Drop a PDF to number" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Hash className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
            <button onClick={() => setFile(null)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </div>

          <OptionCard label="Position">
            <div className="grid grid-cols-3 gap-2">
              {['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((p) => (
                <button key={p} onClick={() => setPosition(p)}
                  className={`rounded-lg border px-2 py-2 font-mono text-[10px] uppercase tracking-widest ${position === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                  {p.replace('-', ' ')}
                </button>
              ))}
            </div>
          </OptionCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <OptionCard label="Start number">
              <input type="number" min="0" value={start} onChange={(e) => setStart(parseInt(e.target.value) || 0)}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
            </OptionCard>
            <OptionCard label={`Font size — ${size}px`}>
              <input type="range" min="8" max="24" step="1" value={size} onChange={(e) => setSize(parseInt(e.target.value))} className="w-full accent-primary" />
            </OptionCard>
          </div>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Add &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}