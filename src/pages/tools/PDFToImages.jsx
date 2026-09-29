import React, { useState } from 'react';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, getPdfjs, renderPageCanvas } from '@/lib/pdfUtils';
import JSZip from 'jszip';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';
import { clearToolHandoff } from '@/lib/toolHandoff';

export default function PDFToImages() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('jpg');
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function clearFile() {
    clearToolHandoff();
    setFile(null);
    setError(null);
  }

  usePdfToolHandoff('pdf-to-images', (f) => {
    setFile(f);
    setError(null);
  });

  function dataUrlToBytes(dataUrl) {
    const b = atob(dataUrl.split(',')[1]);
    const arr = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
    return arr;
  }

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
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
    } catch (e) {
      const msg = e?.message || '';
      if (/canvas|memory|size/i.test(msg)) {
        setError('This PDF is too large at the current resolution. Try lowering the resolution slider and run again.');
      } else {
        setError(msg || 'Could not convert this PDF. Try re-uploading the file or use a different PDF.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="PDF to JPG" description="Export each page of a PDF as JPG or PNG images." lib="pdf.js">
      {result ? (
        <DownloadResult toolSlug="pdf-to-images" result={result} onReset={() => { clearFile(); setResult(null); }} note={result.note} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="application/pdf" label="Drop a PDF to convert" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={clearFile}
            onFileChange={(f) => { setFile(f); setError(null); }}
            meta={formatBytes(file.size)}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
            <ResetButton onClick={clearFile}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}