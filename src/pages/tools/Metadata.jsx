import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { PDFDocument } from 'pdf-lib';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function Metadata() {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({ title: '', author: '', subject: '', keywords: '', creator: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function onFile(f) {
    setFile(f);
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    setMeta({
      title: doc.getTitle() || '',
      author: doc.getAuthor() || '',
      subject: doc.getSubject() || '',
      keywords: (doc.getKeywords() || '').toString(),
      creator: doc.getCreator() || '',
    });
  }

  usePdfToolHandoff('metadata', onFile);

  async function save() {
    setBusy(true);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      doc.setTitle(meta.title);
      doc.setAuthor(meta.author);
      doc.setSubject(meta.subject);
      doc.setKeywords(meta.keywords.split(',').map((k) => k.trim()).filter(Boolean));
      doc.setCreator(meta.creator || 'BolaPDF');
      doc.setProducer('BolaPDF · client-side');
      doc.setModificationDate(new Date());
      const bytes = await doc.save();
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: 'metadata-updated.pdf', size: bytes.byteLength });
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'subject', label: 'Subject' },
    { key: 'keywords', label: 'Keywords (comma separated)' },
    { key: 'creator', label: 'Creator' },
  ];

  return (
    <ToolShell title="Edit Metadata" description="Change the title, author, subject and keywords embedded in the file." lib="pdf-lib.js">
      {result ? (
        <DownloadResult toolSlug="metadata" result={result} onReset={() => { setFile(null); setResult(null); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => onFile(f[0])} accept="application/pdf" label="Drop a PDF to edit" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <OptionCard key={f.key} label={f.label}>
                <input
                  value={meta[f.key]}
                  onChange={(e) => setMeta((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </OptionCard>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={save} busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Save &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}