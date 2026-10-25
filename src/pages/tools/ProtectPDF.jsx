import React, { useState } from 'react';
import { Download, Loader2, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ResetButton, OptionCard } from '@/components/ToolShell';
import DownloadResult from '@/components/DownloadResult';
import { formatBytes } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

const PRINT_OPTIONS = [
  { id: 'full', label: 'Allowed' },
  { id: 'low', label: 'Low resolution only' },
  { id: 'none', label: 'Not allowed' },
];
const MODIFY_OPTIONS = [
  { id: 'all', label: 'Allowed' },
  { id: 'annotate', label: 'Comments & form filling only' },
  { id: 'form', label: 'Form filling only' },
  { id: 'assembly', label: 'Page assembly only' },
  { id: 'none', label: 'Not allowed' },
];

const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export default function ProtectPDF() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [show, setShow] = useState(false);
  const [print, setPrint] = useState('full');
  const [modify, setModify] = useState('all');
  const [extract, setExtract] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  usePdfToolHandoff('protect', setFile);

  function reset() {
    setFile(null);
    setResult(null);
    setPassword('');
    setConfirm('');
    setOwnerPassword('');
    setError(null);
  }

  async function apply() {
    if (!file || busy) return;
    if (!password || password !== confirm) {
      setError('Passwords must match and cannot be empty.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { encryptPdf } = await import('@/lib/pdfEncryption'); // lazy: loads qpdf WASM only now
      const input = new Uint8Array(await file.arrayBuffer());
      const out = await encryptPdf(input, { userPassword: password, ownerPassword, print, modify, extract });
      setResult({
        blob: new Blob([out.bytes], { type: 'application/pdf' }),
        name: file.name.replace(/\.pdf$/i, '') + '-protected.pdf',
        size: out.bytes.byteLength,
        note: (
          <div className="inline-flex flex-col items-center gap-1 text-center">
            <span className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> AES-256 encrypted · opens only with the password
            </span>
            {out.ownerGenerated && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Owner password (needed to change restrictions later; not stored anywhere): <strong className="select-all text-foreground">{out.ownerPassword}</strong>
              </span>
            )}
          </div>
        ),
      });
    } catch (e) {
      setError(/invalid password/i.test(e?.message || '') ? 'This PDF already has a password. Unlock it first, then protect it with a new one.' : e?.message || 'Could not encrypt this PDF.');
    } finally {
      setBusy(false);
    }
  }

  const select = (value, set, options, label) => (
    <label className="block text-xs text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => set(e.target.value)} className={`${inputCls} mt-1 w-full`}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <ToolShell
      title="Protect PDF"
      description="Encrypt a PDF with AES-256 so it opens only with your password. Everything runs in your browser."
      lib="qpdf (WASM) · AES-256"
    >
      {result ? (
        <DownloadResult toolSlug="protect" result={result} onReset={reset} note={result.note} />
      ) : !file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setError(null); }} accept="application/pdf" label="Drop a PDF to protect" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview file={file} onRemove={() => setFile(null)} onFileChange={setFile} meta={formatBytes(file.size)} />

          <OptionCard label="Password to open the PDF">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input type={show ? 'text' : 'password'} autoComplete="new-password" aria-label="Password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} className={inputCls} />
              <input type={show ? 'text' : 'password'} autoComplete="new-password" aria-label="Confirm password" placeholder="Confirm password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide passwords' : 'Show passwords'}
                className="inline-flex items-center justify-center rounded-lg border border-border px-3 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Store this password safely — BolaPDF cannot recover it.</p>
          </OptionCard>

          <OptionCard label="Permissions (optional)">
            <div className="grid gap-3 sm:grid-cols-3">
              {select(print, setPrint, PRINT_OPTIONS, 'Printing')}
              {select(modify, setModify, MODIFY_OPTIONS, 'Editing')}
              <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
                <input type="checkbox" checked={extract} onChange={(e) => setExtract(e.target.checked)} className="accent-primary" />
                Allow copying text &amp; images
              </label>
            </div>
            <input type={show ? 'text' : 'password'} autoComplete="new-password" aria-label="Owner password" placeholder="Owner password (optional, to lift restrictions later)"
              value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} className={`${inputCls} mt-3 w-full max-w-md`} />
            <p className="mt-2 text-xs text-muted-foreground">
              Permissions are enforced by PDF readers that honour them; the password is what actually protects the content. If you set restrictions and leave this blank, a random owner password is generated and shown once.
            </p>
          </OptionCard>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
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
