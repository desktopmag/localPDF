import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function CropPDF() {
  const [file, setFile] = useState(null);
  const [marginMM, setMarginMM] = useState(15);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('crop', setFile);

  async function apply() {
    setBusy(true);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const m = (marginMM / 25.4) * 72;
      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const x = m;
        const y = m;
        const w = Math.max(1, width - 2 * m);
        const h = Math.max(1, height - 2 * m);
        page.setCropBox(x, y, w, h);
      });
      const bytes = await doc.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'cropped.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell title="Crop PDF" description="Trim an even margin from every page of the document." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="crop" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => setFile(f[0])} accept="application/pdf" label="Drop a PDF to crop" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label={`Margin - ${marginMM} mm (applied to all sides)`}>
            <input type="range" min="0" max="80" step="1" value={marginMM} onChange={(e) => setMarginMM(parseInt(e.target.value))} className="w-full accent-primary" />
          </OptionCard>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Crop &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}