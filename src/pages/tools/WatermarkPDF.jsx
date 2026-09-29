import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function WatermarkPDF() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.2);
  const [size, setSize] = useState(60);
  const [rotation, setRotation] = useState(45);
  const [color, setColor] = useState('#888888');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('watermark', setFile);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }

  async function apply() {
    setBusy(true);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      const col = hexToRgb(color);
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        const tw = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
          x: (width - tw) / 2,
          y: height / 2,
          size,
          font,
          color: col,
          opacity,
          rotate: degrees(rotation),
          xoyo: { x: width / 2, y: height / 2 },
        });
      });
      const bytes = await doc.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'watermarked.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Watermark PDF" description="Stamp a text watermark across all pages with opacity and angle." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="watermark" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => setFile(f[0])} accept="application/pdf" label="Drop a PDF to watermark" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Watermark text">
            <input value={text} onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
          </OptionCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <OptionCard label={`Opacity — ${Math.round(opacity * 100)}%`}>
              <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-primary" />
            </OptionCard>
            <OptionCard label={`Font size — ${size}px`}>
              <input type="range" min="20" max="120" step="5" value={size} onChange={(e) => setSize(parseInt(e.target.value))} className="w-full accent-primary" />
            </OptionCard>
            <OptionCard label={`Rotation — ${rotation}°`}>
              <input type="range" min="0" max="90" step="5" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="w-full accent-primary" />
            </OptionCard>
            <OptionCard label="Color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded border border-border bg-transparent" />
            </OptionCard>
          </div>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} disabled={!text} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Apply &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}