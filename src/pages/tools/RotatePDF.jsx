import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, PDFDocument, degrees } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

const ANGLES = [
  { value: 90, label: '90° clockwise' },
  { value: 180, label: '180°' },
  { value: 270, label: '90° counter-clockwise' },
];

export default function RotatePDF() {
  const [file, setFile] = useState(null);
  const [angle, setAngle] = useState(90);
  const [scope, setScope] = useState('all');
  const [pageNum, setPageNum] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('rotate', setFile);

  async function apply() {
    setBusy(true);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const pages = doc.getPages();
      if (scope === 'all') {
        pages.forEach((page) => {
          const current = page.getRotation().angle;
          page.setRotation(degrees((current + angle) % 360));
        });
      } else {
        const idx = Math.min(Math.max(pageNum, 1), pages.length) - 1;
        const page = pages[idx];
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + angle) % 360));
      }
      const bytes = await doc.save();
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-rotated.pdf',
        size: bytes.byteLength,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="Rotate PDF"
      description="Turn pages 90°, 180°, or 270° — every page or one page at a time. Handy for sideways scans."
      lib="pdf-lib.js"
    >
      {result ? (
        <DownloadResult toolSlug="rotate" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => setFile(f[0])} accept="application/pdf" label="Drop a PDF to rotate" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Rotation">
            <div className="grid gap-2 sm:grid-cols-3">
              {ANGLES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAngle(a.value)}
                  className={`rounded-lg border px-3 py-2 text-sm ${angle === a.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </OptionCard>

          <OptionCard label="Apply to">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${scope === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
              >
                All pages
              </button>
              <button
                type="button"
                onClick={() => setScope('one')}
                className={`rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${scope === 'one' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
              >
                Single page
              </button>
            </div>
            {scope === 'one' && (
              <input
                type="number"
                min={1}
                value={pageNum}
                onChange={(e) => setPageNum(parseInt(e.target.value, 10) || 1)}
                className="mt-3 w-24 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
              />
            )}
          </OptionCard>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} busy={busy} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Rotate &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
