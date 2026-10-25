import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard, ErrorNote } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, StandardFonts, rgb } from '@/lib/pdfUtils';
import { loadPdfDoc, friendlyMessage, assertEncodable } from '@/lib/pdfSafe';
import { pageFrame, drawTextVisible } from '@/lib/pdfPlace';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function HeadersFooters() {
  const [file, setFile] = useState(null);
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [size, setSize] = useState(9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('headers-footers', setFile);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(file);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const margin = 28;
      assertEncodable(font, `${header}${footer}`);
      doc.getPages().forEach((page, i) => {
        const { width, height } = pageFrame(page);
        const color = rgb(0.35, 0.35, 0.35);
        if (header.trim()) {
          drawTextVisible(page, header, { font, size, color, fx: width / 2, fy: height - margin, align: 'center' });
        }
        let footerLine = footer.trim();
        if (showPageNumbers) {
          const num = `Page ${i + 1}`;
          footerLine = footerLine ? `${footerLine}  ·  ${num}` : num;
        }
        if (footerLine) {
          drawTextVisible(page, footerLine, { font, size, color, fx: width / 2, fy: margin, align: 'center' });
        }
      });
      const bytes = await doc.save();
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-headers.pdf',
        size: bytes.byteLength,
      });
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="Headers & Footers"
      description="Stamp centered header and footer lines on every page, with optional page numbers."
      lib="pdf-lib.js"
    >
      {result ? (
        <DownloadResult toolSlug="headers-footers" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => setFile(f[0])} accept="application/pdf" label="Drop a PDF" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Header (centered)">
            <input
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="e.g. Confidential — Acme Corp"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </OptionCard>

          <OptionCard label="Footer (centered)">
            <input
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="e.g. © 2026 Your Name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={showPageNumbers} onChange={(e) => setShowPageNumbers(e.target.checked)} className="accent-primary" />
              Append page numbers
            </label>
          </OptionCard>

          <OptionCard label={`Font size — ${size}px`}>
            <input type="range" min="7" max="14" value={size} onChange={(e) => setSize(parseInt(e.target.value, 10))} className="w-full accent-primary" />
          </OptionCard>

          {error && <ErrorNote>{error}</ErrorNote>}


          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} busy={busy} disabled={busy || (!header.trim() && !footer.trim() && !showPageNumbers)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Apply &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
