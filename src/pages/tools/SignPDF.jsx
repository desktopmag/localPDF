import React, { useRef, useState, useEffect } from 'react';
import { Download, Loader2, PenLine, X, Eraser } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, getPdfjs, renderPageCanvas } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function SignPDF() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [pageNum, setPageNum] = useState(1);
  const [position, setPosition] = useState('bottom-right');
  const [widthMM, setWidthMM] = useState(60);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0A0A0C';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }
  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  }
  function end() { drawing.current = false; }
  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
  }

  async function onFile(f) {
    setFile(f);
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    setPageCount(doc.getPageCount());
    setPageNum(1);
    const pdfjs = await getPdfjs(f);
    const t = [];
    for (let i = 1; i <= pdfjs.numPages; i++) {
      const c = await renderPageCanvas(pdfjs, i, 0.3);
      t.push(c.toDataURL('image/jpeg', 0.7));
    }
    await pdfjs.destroy();
    setPageThumbs(t);
  }

  usePdfToolHandoff('sign', onFile);

  async function sign() {
    if (!hasInk.current) { alert('Draw your signature first.'); return; }
    setBusy(true);
    try {
      const sigDataUrl = canvasRef.current.toDataURL('image/png');
      const sigBytes = Uint8Array.from(atob(sigDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const png = await doc.embedPng(sigBytes);
      const page = doc.getPage(pageNum - 1);
      const { width, height } = page.getSize();
      const targetW = (widthMM / 25.4) * 72;
      const scale = targetW / png.width;
      const w = png.width * scale;
      const h = png.height * scale;
      const margin = 24;
      let x, y;
      if (position.startsWith('top')) y = height - margin - h;
      else y = margin;
      if (position.endsWith('left')) x = margin;
      else if (position.endsWith('right')) x = width - margin - w;
      else x = (width - w) / 2;
      page.drawImage(png, { x, y, width: w, height: h });
      const bytes = await doc.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'signed.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Sign PDF" description="Draw your signature and place it on any page of the document." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="sign" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => onFile(f[0])} accept="application/pdf" label="Drop a PDF to sign" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <PenLine className="h-5 w-5 text-accent" />
            <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{pageCount} pages · {formatBytes(file.size)}</span>
            <button onClick={() => setFile(null)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </div>

          <OptionCard label="Draw your signature">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={520}
                height={180}
                onMouseDown={start}
                onMouseMove={move}
                onMouseUp={end}
                onMouseLeave={end}
                onTouchStart={start}
                onTouchMove={move}
                onTouchEnd={end}
                className="w-full touch-none rounded-lg border border-border bg-white"
              />
              <button onClick={clear} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white hover:text-primary">
                <Eraser className="h-3 w-3" /> Clear
              </button>
            </div>
          </OptionCard>

          <div className="grid gap-4 sm:grid-cols-3">
            <OptionCard label="Place on page">
              <select value={pageNum} onChange={(e) => setPageNum(parseInt(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>Page {n}</option>
                ))}
              </select>
            </OptionCard>
            <OptionCard label="Position">
              <div className="grid grid-cols-3 gap-1">
                {['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((p) => (
                  <button key={p} onClick={() => setPosition(p)}
                    className={`rounded border px-1 py-1.5 font-mono text-[9px] uppercase ${position === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                    {p.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </OptionCard>
            <OptionCard label={`Signature width — ${widthMM} mm`}>
              <input type="range" min="30" max="120" step="5" value={widthMM} onChange={(e) => setWidthMM(parseInt(e.target.value))} className="w-full accent-primary" />
            </OptionCard>
          </div>

          {pageThumbs[pageNum - 1] && (
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Preview · page {pageNum}</p>
              <img src={pageThumbs[pageNum - 1]} alt={`Page ${pageNum}`} className="mx-auto max-h-72 rounded object-contain" />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={sign} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Sign &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}