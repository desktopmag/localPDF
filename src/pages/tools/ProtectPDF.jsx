import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes, PDFDocument } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function ProtectPDF() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('protect', setFile);

  async function apply() {
    if (!password || password !== confirm) {
      setError('Passwords must match and cannot be empty.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const bytes = await doc.save({
        userPassword: password,
        ownerPassword: password,
      });
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-protected.pdf',
        size: bytes.byteLength,
      });
    } catch (e) {
      setError(e?.message || 'Could not encrypt this PDF.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="Protect PDF"
      description="Add a password so the file opens only for people who know it. Encryption runs entirely in your browser."
      lib="pdf-lib.js"
    >
      {result ? (
        <DownloadResult toolSlug="protect" result={result} onReset={() => { setFile(null); setResult(null); setPassword(''); setConfirm(''); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="application/pdf" label="Drop a PDF to protect" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Document password">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Store this password safely — BolaPDF cannot recover it.</p>
          </OptionCard>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} busy={busy} disabled={busy || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Encrypt &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
