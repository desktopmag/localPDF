import React from 'react';
import { FileText, Loader2, RotateCw, X } from 'lucide-react';

/**
 * iLovePDF-style file card: thumbnail, filename, rotate + remove in the corner.
 */
export default function FilePreviewCard({
  fileName,
  previewSrc,
  previewAlt = 'Preview',
  loading = false,
  onRotate,
  onRemove,
  showRotate = true,
  meta,
  className = '',
}) {
  return (
    <div
      className={`relative w-[148px] shrink-0 rounded-2xl border border-border bg-card px-3 pb-3 pt-9 shadow-sm ${className}`}
    >
      <div className="absolute right-2 top-2 flex gap-1">
        {showRotate && onRotate && (
          <button
            type="button"
            onClick={onRotate}
            title="Rotate 90°"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove file"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex min-h-[112px] items-center justify-center">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : previewSrc ? (
          <img
            src={previewSrc}
            alt={previewAlt}
            className="max-h-[104px] max-w-full rounded-sm object-contain shadow-md ring-1 ring-border/60"
          />
        ) : (
          <div className="flex h-[88px] w-[64px] items-center justify-center rounded-sm bg-muted/40 shadow-md ring-1 ring-border/60">
            <FileText className="h-8 w-8 text-muted-foreground/70" />
          </div>
        )}
      </div>

      <p className="mt-2.5 truncate text-center text-xs text-foreground" title={fileName}>
        {fileName}
      </p>
      {meta && (
        <p className="mt-0.5 truncate text-center font-mono text-[10px] text-muted-foreground" title={meta}>
          {meta}
        </p>
      )}
    </div>
  );
}
