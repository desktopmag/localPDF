import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { convertPdfToXlsx } from '@/lib/pdfToXlsx';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

const FEATURES = [
  'No rasterization — vector-first table detection',
  'Border-first grids with text-strategy fallback',
  'Merged cells via PyMuPDF refine → XLSX !merges',
  'Per-cell type inference (number, currency, %, date, boolean)',
  'Freeze row + auto-filter on data sheets',
  'AcroForm widgets on a Form Fields sheet',
];

export default function PdfToXlsx() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('pdf-to-xlsx', setFile);

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase('');
  }

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const blob = await convertPdfToXlsx(file, setPhase);
      setResult({
        blob,
        name: file.name.replace(/\.pdf$/i, '') + '.xlsx',
        size: blob.size,
      });
    } catch (e) {
      setError(e?.message || 'Could not extract tables from this PDF. Try a digital PDF with visible grid lines.');
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  return (
    <ToolShell
      title="PDF to Excel"
      description="Vector table extraction to .xlsx — borders, merges, typed cells, and form fields. No screenshots."
      lib="PyMuPDF + SheetJS"
    >
      {result ? (
        <DownloadResult toolSlug="pdf-to-xlsx" result={result} onReset={reset} />
      ) : !file ? (
        <div className="space-y-6">
          <FileDropzone
            onFiles={(f) => {
              setFile(f[0]);
              setError(null);
            }}
            accept="application/pdf"
            label="Drop a PDF to extract tables"
            hint="Works best on digital PDFs with tables or forms"
          />
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <span
                key={f}
                className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={reset}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              First run downloads the PyMuPDF WASM stack (~50 MB, cached). Your PDF is processed locally — not uploaded.
            </span>
          </div>

          {phase && <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{phase}</p>}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={convert} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export XLSX
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
