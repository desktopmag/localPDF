import React, { useState } from 'react';
import { Download, Loader2, ImageDown, X } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, getPdfjs, renderPageCanvas } from '@/lib/pdfUtils';
import JSZip from 'jszip';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function PDFToImages() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('jpg');
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('pdf-to-images', setFile);

  function dataUrlToBytes(dataUrl) {
    const b = atob(dataUrl.split(',')[1]);
    const arr = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
    return arr;
  }

  async function convert() {
    setBusy(true);
    try {
      const doc = await getPdfjs(file);
      const items = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const canvas = await renderPageCanvas(doc, i, scale);
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mime, format === 'jpg' ? 0.85 : undefined);
        items.push({ name: `page_${String(i).padStart(3, '0')}.${format === 'jpg' ? 'jpg' : 'png'}`, dataUrl, bytes: dataUrlToBytes(dataUrl) });
      }
      await doc.destroy();

      let blob, name;
      if (items.length === 1) {
        const it = items[0];
        blob = new Blob([it.bytes], { type: it.dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png' });
        name = it.name;
      } else {
        const zip = new JSZip();
        items.forEach((it) => zip.file(it.name, it.bytes));
        blob = await zip.generateAsync({ type: 'blob' });
        name = 'pdf_images.zip';
      }

      const thumbs = (
        <div className="flex flex-wrap justify-center gap-2">
          {items.map((p, i) => (
            <img key={i} src={p.dataUrl} alt={p.name} className="h-20 w-16 rounded border border-border object-contain" />
          ))}
        </div>
      );

      setResult({ blob, name, size: blob.size, note: thumbs });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="PDF to JPG" description="Export each page of a PDF as JPG or PNG images." lib="pdf.js">
      {result ? (
        <DownloadResult toolSlug="pdf-to-images" result={result} onReset={() => { setFile(null); setResult(null); }} note={result.note} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => setFile(f[0])} accept="application/pdf" label="Drop a PDF to convert" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <ImageDown className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
            <button onClick={() => setFile(null)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <OptionCard label="Format">
              <div className="flex gap-2">
                {['png', 'jpg'].map((f) => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={`rounded-lg border px-4 py-2 font-mono text-sm uppercase ${format === f ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </OptionCard>
            <OptionCard label={`Resolution — ${scale.toFixed(1)}x`}>
              <input type="range" min="1" max="3" step="0.5" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full accent-primary" />
            </OptionCard>
          </div>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={convert} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Convert &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}