import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard, ErrorNote } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { StandardFonts, rgb } from 'pdf-lib';
import { loadPdfDoc, friendlyMessage } from '@/lib/pdfSafe';
import { pageFrame, drawTextVisible } from '@/lib/pdfPlace';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function PageNumbers() {
  const [file, setFile] = useState(null);
  const [position, setPosition] = useState('bottom-center');
  const [start, setStart] = useState(1);
  const [size, setSize] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('page-numbers', setFile);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(file);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      pages.forEach((page, i) => {
        const { width, height } = pageFrame(page);
        const txt = String(start + i);
        const margin = 24;
        const fy = position.startsWith('top') ? height - margin : margin;
        let fx = width / 2;
        let align = 'center';
        if (position.endsWith('left')) { fx = margin; align = 'left'; }
        else if (position.endsWith('right')) { fx = width - margin; align = 'right'; }
        drawTextVisible(page, txt, { font, size, color: rgb(0.2, 0.2, 0.2), fx, fy, align });
      });
      const bytes = await doc.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'numbered.pdf', size: bytes.byteLength });
    } catch (e) {
      setError(friendlyMessage(e));
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
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

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

          {error && <ErrorNote>{error}</ErrorNote>}


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