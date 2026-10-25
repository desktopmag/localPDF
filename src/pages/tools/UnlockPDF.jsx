import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function UnlockPDF() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('unlock', setFile);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const { decryptPdf, WrongPasswordError } = await import('@/lib/pdfEncryption'); // lazy: loads qpdf WASM only now
      let bytes;
      try {
        bytes = await decryptPdf(new Uint8Array(await file.arrayBuffer()), password);
      } catch (e) {
        if (e instanceof WrongPasswordError) throw new Error('Wrong password. Check it and try again.');
        throw e;
      }
      setResult({
        blob: new Blob([bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-unlocked.pdf',
        size: bytes.byteLength,
      });
    } catch (e) {
      setError(e?.message || 'Could not unlock this PDF.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell
      title="Unlock PDF"
      description="Remove the password from a PDF (AES-256, AES-128, RC4) and save an unprotected copy. The password never leaves your device."
      lib="qpdf (WASM) · AES-256"
    >
      {result ? (
        <DownloadResult toolSlug="unlock" result={result} onReset={() => { setFile(null); setResult(null); setPassword(''); }} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="application/pdf" label="Drop a locked PDF" hint="You need the current password (user or owner)" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => setFile(null)}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          <OptionCard label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="PDF password (leave empty if it only has restrictions)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </OptionCard>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton onClick={apply} busy={busy} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Remove lock &amp; Download
            </PrimaryButton>
            <ResetButton onClick={() => setFile(null)}>Choose another</ResetButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
