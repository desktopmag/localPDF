import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

export default function FileDropzone({
  onFiles,
  accept = 'application/pdf',
  multiple = false,
  label = 'Drop file here',
  hint = 'or click to browse — files never leave your device',
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(list) {
    if (!list || !list.length) return;
    const allowed = accept.split(',').map((t) => t.trim());
    const arr = Array.from(list).filter((f) =>
      allowed.some((t) => {
        if (t === 'application/pdf') return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        if (t.startsWith('image/')) return f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name);
        return f.type === t;
      })
    );
    if (arr.length) onFiles(multiple ? arr : [arr[0]]);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all sm:p-14 ${
        dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-card'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card transition-transform group-hover:scale-105">
        <UploadCloud className="h-7 w-7 text-primary" />
      </div>
      <p className="font-mono text-sm uppercase tracking-widest text-foreground">{label}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}