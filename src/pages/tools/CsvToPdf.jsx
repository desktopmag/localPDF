import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';

export default function CsvToPdf() {
  const [file, setFile] = useState(null);
  const [orientation, setOrientation] = useState('landscape');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const [{ read, utils }, { jsPDF }] = await Promise.all([import('xlsx'), import('jspdf')]);
      await import('jspdf-autotable');

      const wb = read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows.length) throw new Error('This CSV file is empty.');

      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
      const head = rows[0].map((c) => String(c ?? ''));
      const body = rows.slice(1).map((row) => row.map((c) => String(c ?? '')));

      pdf.autoTable({
        head: [head],
        body: body.length ? body : undefined,
        startY: 40,
        margin: { left: 24, right: 24 },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [76, 175, 80] },
      });

      const bytes = pdf.output('arraybuffer');
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.csv$/i, '') + '.pdf',
        size: bytes.byteLength,
      });
    } catch (e) {
      setError(e?.message || 'Could not convert this CSV.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="CSV to PDF"
      description="Turn a comma-separated file into a printable PDF table. Headers come from the first row."
      lib="SheetJS + jsPDF"
    >
      {result ? (
        <DownloadResult toolSlug="csv-to-pdf" result={result} onReset={reset} />
      ) : !file ? (
        <FileDropzone
          onFiles={(f) => { setFile(f[0]); setError(null); }}
          accept=".csv,text/csv"
          label="Drop a .csv file"
        />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={reset}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Page orientation">
            <div className="flex gap-2">
              {['portrait', 'landscape'].map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrientation(o)}
                  className={`rounded-lg border px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${orientation === o ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </OptionCard>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={convert} busy={busy} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Convert to PDF
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
