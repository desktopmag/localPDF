import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, PDFDocument } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function FlattenPDF() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('flatten', setFile);

  async function apply() {
    setBusy(true);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      try {
        doc.getForm().flatten();
      } catch {
        /* no AcroForm */
      }
      const bytes = await doc.save();
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-flat.pdf',
        size: bytes.byteLength,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="Flatten PDF"
      description="Bake interactive form fields into static content so values cannot be edited in a viewer."
      lib="pdf-lib.js"
    >
      {result ? (
        <DownloadResult toolSlug="flatten" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => setFile(f[0])} accept="application/pdf" label="Drop a PDF with form fields" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <p className="text-sm text-muted-foreground">
            Flattening merges fillable fields into the page. Annotations and scripts may still remain — use for typical forms and surveys.
          </p>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} busy={busy} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Flatten &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
