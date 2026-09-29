import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { PDFDocument } from 'pdf-lib';

export default function ImagesToPDF() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('fit');
  const [orientation, setOrientation] = useState('portrait');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function add(list) {
    const mapped = list.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setImages((p) => [...p, ...mapped]);
  }
  function remove(i) {
    URL.revokeObjectURL(images[i].url);
    setImages((p) => p.filter((_, idx) => idx !== i));
  }
  function move(i, dir) {
    setImages((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const arr = [...p];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  function replaceImage(i, newFile) {
    setImages((p) => {
      const arr = [...p];
      URL.revokeObjectURL(arr[i].url);
      arr[i] = { file: newFile, url: URL.createObjectURL(newFile) };
      return arr;
    });
  }

  function reset() {
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setResult(null);
  }

  async function build() {
    setBusy(true);
    try {
      const doc = await PDFDocument.create();
      for (const img of images) {
        const bytes = await img.file.arrayBuffer();
        let embedded;
        if (img.file.type === 'image/png' || img.file.name.toLowerCase().endsWith('.png')) {
          embedded = await doc.embedPng(bytes);
        } else {
          embedded = await doc.embedJpg(bytes);
        }
        const { width, height } = embedded.size();
        let pw, ph;
        if (pageSize === 'fit') {
          pw = width; ph = height;
        } else {
          const a4w = 595.28, a4h = 841.89;
          pw = orientation === 'landscape' ? a4h : a4w;
          ph = orientation === 'landscape' ? a4w : a4h;
        }
        const page = doc.addPage([pw, ph]);
        if (pageSize === 'fit') {
          page.drawImage(embedded, { x: 0, y: 0, width, height });
        } else {
          const ratio = Math.min(pw / width, ph / height);
          const w = width * ratio, h = height * ratio;
          page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
        }
      }
      const out = await doc.save();
      setResult({ blob: new Blob([out], { type: 'application/pdf' }), name: 'images.pdf', size: out.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="JPG to PDF" description="Turn JPG and PNG images into a single PDF, in the order you choose." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="images-to-pdf" result={result} onReset={reset} />
      ) : images.length === 0 ? (
        <FileDropzone onFiles={add} accept="image/png,image/jpeg" multiple label="Drop images to convert" hint="JPG or PNG — reorder them below" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-4">
            {images.map((img, i) => (
              <div key={`${img.file.name}-${i}`} className="flex flex-col items-center gap-1.5">
                <SelectedFilePreview
                  file={img.file}
                  onRemove={() => remove(i)}
                  onFileChange={(nf) => replaceImage(i, nf)}
                />
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move earlier">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move later">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
            <Plus className="h-4 w-4" /> Add more
            <input type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={(e) => { add(Array.from(e.target.files)); e.target.value = ''; }} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <OptionCard label="Page size">
              <div className="flex gap-2">
                {[{ id: 'fit', label: 'Fit to image' }, { id: 'a4', label: 'A4' }].map((m) => (
                  <button key={m.id} onClick={() => setPageSize(m.id)}
                    className={`rounded-lg border px-3 py-2 font-mono text-xs ${pageSize === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </OptionCard>
            {pageSize === 'a4' && (
              <OptionCard label="Orientation">
                <div className="flex gap-2">
                  {['portrait', 'landscape'].map((o) => (
                    <button key={o} onClick={() => setOrientation(o)}
                      className={`rounded-lg border px-3 py-2 font-mono text-xs capitalize ${orientation === o ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </OptionCard>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={build} disabled={!images.length} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Build &amp; Download
            </PrimaryButton>
            <ResetButton onClick={reset}>Start over</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}