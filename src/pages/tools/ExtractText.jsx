import React, { useState } from 'react';
import { Download, Loader2, FileText, Copy, Check } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import SelectedFilePreview from '@/components/SelectedFilePreview';
import ToolShell, { PrimaryButton, ErrorNote } from '@/components/ToolShell';
import { friendlyMessage } from '@/lib/pdfSafe';
import { formatBytes, getPdfjs } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';

export default function ExtractText() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  usePdfToolHandoff('extract-text', setFile);

  async function extract() {
    setBusy(true);
    setError(null);
    try {
      const doc = await getPdfjs(file);
      const parts = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        // pdf.js marks the end of each visual line with hasEOL: keep those as newlines so paragraphs, lists and
        // tables don't collapse into one long line.
        let pageText = '';
        for (const item of content.items) {
          if (!('str' in item)) continue;
          pageText += item.str;
          if (item.hasEOL) pageText += '\n';
          else if (item.str && !/\s$/.test(item.str)) pageText += ' ';
        }
        pageText = pageText
          .replace(/[ \t]+\n/g, '\n')
          .replace(/[ \t]{2,}/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        parts.push(pageText ? `--- Page ${i} ---\n${pageText}` : `--- Page ${i} ---\n(no text layer)`);
      }
      await doc.destroy();
      setText(parts.join('\n\n'));
    } catch (e) {
      setError(friendlyMessage(e, 'Could not read the text of this PDF.'));
    } finally {
      setBusy(false);
    }
  }

  function downloadTxt() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/\.pdf$/i, '') + '.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ToolShell
      title="Extract Text"
      description="Copy plain text from PDFs that already have a text layer. Scanned image-only pages need the OCR PDF tool."
      lib="pdf.js"
    >
      {!file ? (
        <FileDropzone onFiles={(f) => { setFile(f[0]); setText(''); }} accept="application/pdf" label="Drop a PDF to extract text" />
      ) : (
        <div className="space-y-5">
          <SelectedFilePreview
            file={file}
            onRemove={() => { setFile(null); setText(''); }}
            onFileChange={setFile}
            meta={formatBytes(file.size)}
          />

          {error && <ErrorNote>{error}</ErrorNote>}

          {!text ? (
            <PrimaryButton onClick={extract} busy={busy} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Extract text
            </PrimaryButton>
          ) : (
            <>
              <textarea
                readOnly
                value={text}
                className="min-h-[240px] w-full rounded-xl border border-border bg-muted/20 p-4 font-mono text-xs leading-relaxed text-foreground outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <PrimaryButton onClick={downloadTxt} busy={false} disabled={false}>
                  <Download className="h-4 w-4" /> Download .txt
                </PrimaryButton>
                <button
                  type="button"
                  onClick={copyAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-primary/40"
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}
