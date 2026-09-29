import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Trash2, Download, Loader2, X } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { getPdfjs, renderPageCanvas, formatBytes } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function OrganizePages() {
  const [file, setFile] = useState(null);
  const [thumbs, setThumbs] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function load(f) {
    setFile(f);
    setLoading(true);
    try {
      const doc = await getPdfjs(f);
      const t = [];
      const p = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const canvas = await renderPageCanvas(doc, i, 0.35);
        t.push(canvas.toDataURL('image/jpeg', 0.7));
        p.push({ id: i });
      }
      await doc.destroy();
      setThumbs(t);
      setPages(p);
    } finally {
      setLoading(false);
    }
  }

  usePdfToolHandoff('organize', load);

  function onDragEnd(r) {
    if (!r.destination) return;
    setPages((prev) => {
      const arr = [...prev];
      const [m] = arr.splice(r.source.index, 1);
      arr.splice(r.destination.index, 0, m);
      return arr;
    });
  }
  function remove(id) {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }

  function reset() { setFile(null); setPages([]); setThumbs([]); setResult(null); }

  async function exportPdf() {
    setBusy(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const ordered = pages.map((p) => p.id - 1);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, ordered);
      copied.forEach((page) => out.addPage(page));
      const bytes = await out.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'organized.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Organize Pages" description="Drag to reorder and delete pages with live thumbnails." lib="pdf.js + pdf-lib">
      {result ? (
        <DownloadResult toolSlug="organize" result={result} onReset={reset} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => load(f[0])} accept="application/pdf" label="Drop a PDF to organize" />
      ) : loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Rendering page thumbnails…
        </div>
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={reset}
            onFileChange={load}
            meta={`${pages.length} pages · ${formatBytes(file.size)}`}
          />

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="pages" direction="horizontal">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-wrap gap-3">
                  {pages.map((p, index) => (
                    <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`relative w-32 shrink-0 overflow-hidden rounded-lg border bg-card p-1.5 ${
                            snap.isDragging ? 'border-primary shadow-lg' : 'border-border'
                          }`}
                        >
                          <img
                            src={thumbs[p.id - 1]}
                            alt={`Page ${p.id}`}
                            className="h-36 w-full rounded object-cover"
                          />
                          <div className="mt-1.5 flex items-center justify-between px-0.5">
                            <span className="font-mono text-[10px] text-muted-foreground">#{p.id}</span>
                            <button onClick={() => remove(p.id)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tip: drag cards to reorder · use the trash icon to delete a page.</p>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={exportPdf} disabled={pages.length === 0} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Apply &amp; Download
            </PrimaryButton>
            <ResetButton onClick={reset}>
              <X className="h-4 w-4" /> Start over
            </ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}