import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, ErrorNote } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFName, PDFNull, PDFRef } from 'pdf-lib';
import { loadPdfDoc, friendlyMessage, UserError } from '@/lib/pdfSafe';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function FlattenPDF() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('flatten', setFile);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(file);
      const form = doc.getForm();
      if (form.getFields().length > 0) {
        try {
          form.flatten();
        } catch (e) {
          throw new UserError(`Could not flatten this form (${friendlyMessage(e)}).`);
        }
      }
      // pdf-lib leaves dangling `null` entries in /Annots after removing widgets, which some viewers flag as
      // a damaged file. Drop them.
      for (const page of doc.getPages()) {
        const annots = page.node.Annots();
        if (!annots) continue;
        for (let i = annots.size() - 1; i >= 0; i -= 1) {
          const entry = annots.get(i);
          if (!entry || entry === PDFNull || (entry instanceof PDFRef && doc.context.lookup(entry) === undefined)) {
            annots.remove(i);
          }
        }
        if (annots.size() === 0) page.node.delete(PDFName.of('Annots'));
      }
      const bytes = await doc.save();
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-flat.pdf',
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

          {error && <ErrorNote>{error}</ErrorNote>}


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
