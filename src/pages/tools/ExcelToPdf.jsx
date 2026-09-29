import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';

export default function ExcelToPdf() {
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
    setResult(null);
    try {
      const [{ read, utils }, { jsPDF }] = await Promise.all([import('xlsx'), import('jspdf')]);
      await import('jspdf-autotable');

      const wb = read(await file.arrayBuffer(), { type: 'array' });
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
      const sheetNames = wb.SheetNames;

      if (!sheetNames.length) {
        throw new Error('This workbook has no sheets.');
      }

      sheetNames.forEach((name, index) => {
        if (index > 0) pdf.addPage();
        const rows = utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
        if (!rows.length) {
          pdf.setFontSize(12);
          pdf.text(`Sheet: ${name} (empty)`, 40, 50);
          return;
        }

        const head = rows[0].map((c) => String(c ?? ''));
        const body = rows.slice(1).map((row) => row.map((c) => String(c ?? '')));

        pdf.autoTable({
          head: [head],
          body,
          startY: 40,
          margin: { left: 24, right: 24 },
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [41, 98, 255] },
          didDrawPage: () => {
            pdf.setFontSize(9);
            pdf.setTextColor(100);
            pdf.text(name, 24, 24);
          },
        });
      });

      const bytes = pdf.output('arraybuffer');
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.(xlsx|xls|csv)$/i, '') + '.pdf',
        size: bytes.byteLength,
      });
    } catch (e) {
      setError(e?.message || 'Could not convert this spreadsheet. Try .xlsx or .csv.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="Excel to PDF"
      description="Turn a local spreadsheet into a PDF table export. Best for simple grids — charts, macros, and legacy .xls may not convert cleanly."
      lib="SheetJS + jsPDF"
    >
      {result ? (
        <DownloadResult toolSlug="excel-to-pdf" result={result} onReset={reset} />
      ) : !file ? (
        <FileDropzone
          onFiles={(f) => {
            setFile(f[0]);
            setError(null);
          }}
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          label="Drop an Excel or CSV file to convert"
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
              {[{ id: 'portrait', label: 'Portrait' }, { id: 'landscape', label: 'Landscape' }].map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOrientation(o.id)}
                  className={`rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-widest ${orientation === o.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}
                >
                  {o.label}
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
            <PrimaryButton onClick={convert} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Convert &amp; Download
            </PrimaryButton>
            <ResetButton onClick={reset}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
