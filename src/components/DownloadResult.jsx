import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Check, Sparkles, Loader2 } from 'lucide-react';
import { toolBySlug } from '@/lib/tools';
import { formatBytes } from '@/lib/pdfUtils';
import { canHandoffPdfTo, resultToHandoffFile, resultToHandoffFileAsync, stageToolHandoff } from '@/lib/toolHandoff';

const relatedMap = {
  merge: ['split', 'organize', 'extract', 'delete'],
  split: ['merge', 'extract', 'delete', 'organize'],
  extract: ['merge', 'split', 'organize', 'delete'],
  delete: ['merge', 'split', 'organize', 'extract'],
  organize: ['merge', 'split', 'crop', 'delete'],
  compress: ['images-to-pdf', 'pdf-to-images', 'merge'],
  'pdf-to-images': ['images-to-pdf', 'compress', 'merge', 'docx-to-pdf'],
  'pdf-to-docx': ['docx-to-pdf', 'merge', 'compress', 'pdf-to-images'],
  'pdf-to-pptx': ['pdf-to-docx', 'pdf-to-images', 'merge'],
  'pdf-to-xlsx': ['excel-to-pdf', 'pdf-to-docx', 'merge'],
  'images-to-pdf': ['pdf-to-images', 'html-to-pdf', 'merge', 'compress'],
  'html-to-pdf': ['images-to-pdf', 'pdf-to-images', 'merge'],
  'docx-to-pdf': ['html-to-pdf', 'merge', 'compress'],
  'excel-to-pdf': ['merge', 'compress', 'pdf-to-images'],
  'pptx-to-pdf': ['pdf-to-pptx', 'merge', 'compress'],
  watermark: ['page-numbers', 'sign', 'metadata'],
  'page-numbers': ['watermark', 'sign', 'metadata'],
  crop: ['organize', 'merge', 'delete', 'compress'],
  metadata: ['merge', 'split', 'watermark', 'page-numbers'],
  sign: ['watermark', 'page-numbers', 'metadata'],
};

export default function DownloadResult({ toolSlug, result, onReset, note }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const handoffFile = resultToHandoffFile(result);

  async function continueToTool(slug) {
    const withHandoff = handoffFile && canHandoffPdfTo(slug);
    if (withHandoff) {
      setBusy(true);
      try {
        const file = await resultToHandoffFileAsync(result);
        if (!file) {
          navigate(`/tools/${slug}`);
          return;
        }
        stageToolHandoff(slug, file);
        navigate(`/tools/${slug}`, { state: { fromToolHandoff: slug }, replace: true });
      } finally {
        setBusy(false);
      }
      return;
    }
    navigate(`/tools/${slug}`);
  }

  function download() {
    if (!result || !result.blob) return;
    setBusy(true);
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      setBusy(false);
    }, 1500);
  }

  const related = (relatedMap[toolSlug] || [])
    .map((s) => toolBySlug(s))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Check className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold text-foreground">Your file is ready</h3>
        <p className="mt-1.5 font-mono text-xs text-muted-foreground">
          {result.name}
          {result.size != null ? ` · ${formatBytes(result.size)}` : ''}
        </p>

        {note ? <div className="mt-4">{note}</div> : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={download}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Start over
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <div>
          <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Continue with another tool
            {handoffFile ? (
              <span className="normal-case tracking-normal text-[11px] text-primary/80">
                — your processed PDF will load automatically
              </span>
            ) : null}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((t) => {
              const Icon = t.icon;
              const useHandoff = handoffFile && canHandoffPdfTo(t.slug);
              const cardClass =
                'group flex w-full flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40';

              if (useHandoff) {
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => continueToTool(t.slug)}
                    className={cardClass}
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors group-hover:border-primary/40">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="font-display text-sm font-semibold text-foreground">{t.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{t.desc}</p>
                  </button>
                );
              }

              return (
                <Link key={t.slug} to={`/tools/${t.slug}`} className={cardClass}>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors group-hover:border-primary/40">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="font-display text-sm font-semibold text-foreground">{t.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{t.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}