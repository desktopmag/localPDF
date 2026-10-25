import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Check, ChevronDown, Download, FileText, Loader2, Plus, RotateCcw, ShieldCheck, X, AlertTriangle, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ToolShell, { PrimaryButton, ResetButton } from '@/components/ToolShell';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatBytes } from '@/lib/pdfUtils';
import { usePdfToolHandoff } from '@/hooks/usePdfToolHandoff';
import { stageToolHandoff } from '@/lib/toolHandoff';
import { COMPRESS_FAQ, COMPRESS_LEVEL_GUIDE, COMPRESS_STEPS } from '@/lib/compressContent';

const MB = 1024 * 1024;
const WARN_BYTES = 100 * MB;
const HEAVY_BYTES = 150 * MB;
const friendly = (e) => {
  const m = e?.message || '';
  if (e instanceof RangeError || /memory|allocation|out of bounds|Aborted\(|Cannot enlarge/i.test(m)) {
    return 'This device ran out of memory while compressing this file. Close other tabs and try again, use “Structure only” under Advanced options, or try a smaller file.';
  }
  return m || 'Could not compress this PDF. It may be corrupted.';
};

const LEVELS = [
  { id: 'extreme', label: 'Extreme compression', hint: 'Less quality, high compression', detail: 'Images at ~72 dpi' },
  { id: 'recommended', label: 'Recommended compression', hint: 'Good quality, good compression', detail: 'Images at ~110 dpi' },
  { id: 'less', label: 'Less compression', hint: 'High quality, less compression', detail: 'Images at ~150 dpi' },
];
const MODES = [
  { id: 'smart', label: 'Smart', hint: 'Re-encodes images, removes duplicates and bloat, keeps text selectable.' },
  { id: 'structure', label: 'Structure only (lossless)', hint: 'Repacks the file without touching any pixel. Smaller gains.' },
  { id: 'flatten', label: 'Flatten to images', hint: 'Renders every page to an image. Smallest for scans; text is no longer selectable.' },
];
const LEVEL_KEY = 'bolapdf-compress-level';
const PHASE_LABEL = { analyze: 'Analysing images', images: 'Optimising images', optimise: 'Repacking PDF', pages: 'Rendering pages' };

const isPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
let nextId = 1;

function loadLevel() {
  try {
    const v = localStorage.getItem(LEVEL_KEY);
    return LEVELS.some((l) => l.id === v) ? v : 'recommended';
  } catch { return 'recommended'; }
}

function progressInfo(p) {
  if (!p) return { pct: 2, label: 'Starting…' };
  const frac = p.total ? p.done / p.total : 0;
  let pct = 4;
  if (p.phase === 'analyze') pct = 5;
  else if (p.phase === 'images') pct = 8 + frac * 72;
  else if (p.phase === 'pages') pct = 5 + frac * 85;
  else if (p.phase === 'optimise') pct = 82 + frac * 16;
  if (p.trial) pct = ((p.trial.n - 1 + pct / 100) / p.trial.of) * 100;
  const count = p.total > 1 && p.phase !== 'analyze' ? ` (${p.done}/${p.total})` : '…';
  const trial = p.trial ? `Trial ${p.trial.n}/${p.trial.of} · ` : '';
  return { pct: Math.min(99, Math.max(2, Math.round(pct))), label: `${trial}${PHASE_LABEL[p.phase] ?? p.phase}${count}` };
}

const outName = (n) => `${n.replace(/\.pdf$/i, '')}_compressed.pdf`;

function describeImages(im) {
  if (!im || !im.found) return null;
  const bits = [`${im.recompressed}/${im.found} images optimised`];
  if (im.downscaled) bits.push(`${im.downscaled} down-sampled`);
  if (im.converted) bits.push(`${im.converted} lossless → JPEG`);
  if (im.grayed) bits.push(`${im.grayed} to grayscale`);
  if (im.deduped) bits.push(`${im.deduped} duplicate${im.deduped > 1 ? 's' : ''} merged`);
  return bits.join(' · ');
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function CompressPDF() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [level, setLevel] = useState(loadLevel);
  const [mode, setMode] = useState('smart');
  const [opts, setOpts] = useState({ images: true, structure: true, stripMeta: true });
  const [targetOn, setTargetOn] = useState(false);
  const [targetVal, setTargetVal] = useState('500');
  const [targetUnit, setTargetUnit] = useState('KB');
  const [advOpen, setAdvOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [announce, setAnnounce] = useState('');
  const abortRef = useRef(null);
  const addRef = useRef(null);
  const doneHeadingRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(LEVEL_KEY, level); } catch { /* private mode */ }
  }, [level]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = (id, p) => setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...p } : it)));

  function addFiles(list) {
    const pdfs = Array.from(list).filter(isPdf);
    if (!pdfs.length) return;
    setItems((cur) => [...cur.filter((i) => i.status !== 'done' && i.status !== 'error'), ...pdfs.map((file) => ({ id: nextId++, file, status: 'queued' }))]);
  }
  usePdfToolHandoff('compress', (f) => addFiles([f]));

  const finished = items.length > 0 && !running && items.every((i) => i.status === 'done' || i.status === 'error');
  const doneItems = items.filter((i) => i.status === 'done');
  const targetBytes = targetOn && mode === 'smart' ? Math.round(parseFloat(targetVal) * (targetUnit === 'MB' ? 1024 * 1024 : 1024)) || 0 : 0;
  const targetInvalid = targetOn && mode === 'smart' && targetBytes < 10 * 1024;

  async function run() {
    if (running || !items.some((i) => i.status === 'queued') || targetInvalid) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    const queue = items.filter((i) => i.status === 'queued');
    const { compressPdfFile } = await import('@/lib/compressClient'); // lazy: engine, pdf-lib and WASM only load now
    for (let n = 0; n < queue.length; n += 1) {
      const it = queue[n];
      if (ac.signal.aborted) break;
      patch(it.id, { status: 'working', progress: null, error: null });
      setAnnounce(`Compressing ${it.file.name}, file ${n + 1} of ${queue.length}`);
      try {
        const out = await compressPdfFile(it.file, { mode, level, targetBytes, options: opts }, {
          signal: ac.signal,
          onProgress: (p) => patch(it.id, { progress: p }),
        });
        const blob = new Blob([out.bytes], { type: 'application/pdf' });
        patch(it.id, {
          status: 'done',
          result: { blob, size: blob.size, original: out.originalSize, usedOriginal: out.usedOriginal, images: out.images, target: out.target },
        });
      } catch (e) {
        if (e?.name === 'AbortError') break;
        patch(it.id, { status: 'error', error: friendly(e) });
      }
    }
    // cancelled: put anything unfinished back in the queue so the user can adjust and retry
    setItems((cur) => cur.map((i) => (i.status === 'working' ? { ...i, status: 'queued', progress: null } : i)));
    abortRef.current = null;
    setRunning(false);
    setAnnounce(ac.signal.aborted ? 'Compression cancelled.' : 'Compression finished.');
  }

  function cancel() { abortRef.current?.abort(); }

  function reset() {
    abortRef.current?.abort();
    setItems([]);
    setRunning(false);
    setAnnounce('');
  }

  useEffect(() => { if (finished) doneHeadingRef.current?.focus(); }, [finished]);

  async function downloadZip() {
    setZipBusy(true);
    try {
      const { default: JSZip } = await import('jszip'); // lazy
      const zip = new JSZip();
      const used = new Set();
      for (const it of doneItems) {
        let n = outName(it.file.name);
        for (let k = 2; used.has(n); k += 1) n = outName(it.file.name).replace(/\.pdf$/, `_${k}.pdf`);
        used.add(n);
        zip.file(n, it.result.blob, { compression: 'STORE' }); // PDFs are already compressed
      }
      download(await zip.generateAsync({ type: 'blob' }), 'bolapdf_compressed.zip');
    } finally {
      setZipBusy(false);
    }
  }

  async function continueTo(slug, it) {
    const file = new File([await it.result.blob.arrayBuffer()], outName(it.file.name), { type: 'application/pdf' });
    stageToolHandoff(slug, file);
    navigate(`/tools/${slug}`, { state: { fromToolHandoff: slug }, replace: true });
  }

  const totalBefore = doneItems.reduce((a, i) => a + i.result.original, 0);
  const totalAfter = doneItems.reduce((a, i) => a + i.result.size, 0);
  const totalPct = totalBefore ? Math.max(0, Math.floor((1 - totalAfter / totalBefore) * 100)) : 0;
  const queuedCount = items.filter((i) => i.status === 'queued').length;

  return (
    <ToolShell title="Compress PDF" description="Reduce PDF file size while keeping the best quality. Pick a level or a target size; everything runs in your browser." lib="qpdf + mozjpeg (WASM)">
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      {items.length === 0 && (
        <div className="space-y-4">
          <FileDropzone onFiles={addFiles} multiple accept="application/pdf" label="Drop PDF files here" cta="Select PDF files" hint="or drag & drop · several files at once · nothing is uploaded, files never leave your device" />
        </div>
      )}

      {items.length > 0 && !finished && (
        <div className="space-y-6">
          <ul className="space-y-2" aria-label="Files to compress">
            {items.map((it) => {
              const { pct, label } = progressInfo(it.progress);
              return (
                <li key={it.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground" title={it.file.name}>{it.file.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{formatBytes(it.file.size)}{it.status === 'queued' && running ? ' · waiting' : ''}</p>
                    </div>
                    {it.status === 'working' ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                    ) : (
                      <button type="button" onClick={() => setItems((c) => c.filter((x) => x.id !== it.id))} disabled={running}
                        aria-label={`Remove ${it.file.name}`}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-40">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {it.status === 'working' && (
                    <div className="mt-3">
                      <div role="progressbar" aria-label={`Compressing ${it.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">{label}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {items.some((i) => i.status === 'queued' && i.file.size > WARN_BYTES) && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              <span>
                {items.some((i) => i.status === 'queued' && i.file.size > HEAVY_BYTES) ? 'Very large file. ' : 'Large file. '}
                Compressing needs several times the file size in free memory, so it can be slow and may fail on phones or low-memory computers. Close other tabs first; files are processed one at a time.
              </span>
            </p>
          )}

          {!running && (
            <>
              <div>
                <input ref={addRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                <button type="button" onClick={() => addRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <Plus className="h-4 w-4" aria-hidden /> Add more PDFs
                </button>
              </div>

              <fieldset className={mode !== 'structure' && !(targetOn && mode === 'smart') ? '' : 'opacity-50'} disabled={mode === 'structure' || (targetOn && mode === 'smart')}>
                <legend className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Compression level</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LEVELS.map((l) => (
                    <label key={l.id} className="relative cursor-pointer">
                      <input type="radio" name="compress-level" value={l.id} checked={level === l.id} onChange={() => setLevel(l.id)} className="peer sr-only" />
                      <div className="h-full rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-sm font-semibold text-foreground">{l.label}</p>
                          {level === l.id && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{l.hint}</p>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">{l.detail}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {mode === 'structure' && <p className="mt-2 text-xs text-muted-foreground">Structure-only mode is lossless, so the level does not apply.</p>}
                {targetOn && mode === 'smart' && <p className="mt-2 text-xs text-muted-foreground">A target size is set, so quality is chosen automatically.</p>}
              </fieldset>

              <div className="rounded-xl border border-border bg-card p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={targetOn && mode === 'smart'} disabled={mode !== 'smart'} onChange={(e) => setTargetOn(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm font-medium text-foreground">Compress to a target size</span>
                </label>
                {targetOn && mode === 'smart' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                    <span className="text-sm text-muted-foreground">Make each file smaller than</span>
                    <input type="number" inputMode="decimal" min="0" step="any" value={targetVal} onChange={(e) => setTargetVal(e.target.value)} aria-label="Target size" aria-invalid={targetInvalid}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
                    <select value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} aria-label="Target size unit"
                      className="rounded-lg border border-border bg-background px-2 py-2 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                      <option>KB</option>
                      <option>MB</option>
                    </select>
                    {targetInvalid && <span role="alert" className="text-xs text-destructive">Enter at least 10 KB.</span>}
                    <p className="basis-full text-xs text-muted-foreground">We keep the highest image quality that still fits, trying a few settings automatically.</p>
                  </div>
                )}
              </div>

              <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 rounded-md font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <ChevronDown className={`h-4 w-4 transition-transform ${advOpen ? 'rotate-180' : ''}`} aria-hidden /> Advanced options
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4 rounded-xl border border-border bg-card p-4">
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-foreground">Method</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {MODES.map((m) => (
                        <label key={m.id} className="relative cursor-pointer">
                          <input type="radio" name="compress-mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="peer sr-only" />
                          <div className="h-full rounded-lg border border-border p-3 transition-all hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60">
                            <p className="text-sm font-semibold text-foreground">{m.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{m.hint}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {mode === 'smart' && (
                    <fieldset className="space-y-2">
                      <legend className="mb-1 text-sm font-medium text-foreground">What to optimise</legend>
                      {[
                        ['images', 'Images', 'Down-sample, convert and re-encode with a quality search'],
                        ['structure', 'File structure', 'Repack with qpdf: object streams, maximum Flate, unused resources'],
                        ['stripMeta', 'Remove metadata', 'Drop XMP and document info (title, author, producer)'],
                      ].map(([k, t, d]) => (
                        <label key={k} className="flex cursor-pointer items-start gap-3">
                          <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-primary" />
                          <span className="text-sm text-foreground">{t}<span className="block text-xs text-muted-foreground">{d}</span></span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {running ? (
              <ResetButton onClick={cancel}><X className="h-4 w-4" aria-hidden /> Cancel</ResetButton>
            ) : (
              <>
                <PrimaryButton onClick={run} disabled={queuedCount === 0 || targetInvalid} className="w-full sm:w-auto">
                  <Archive className="h-4 w-4" aria-hidden /> Compress PDF{queuedCount > 1 ? `s (${queuedCount})` : ''}
                </PrimaryButton>
                <ResetButton onClick={reset}>Clear</ResetButton>
              </>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden /> Processed on your device. Nothing is uploaded.</span>
          </div>
        </div>
      )}

      {finished && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="h-6 w-6" aria-hidden /></div>
            <h2 ref={doneHeadingRef} tabIndex={-1} className="mt-3 font-display text-2xl font-bold text-foreground outline-none">
              {doneItems.length ? (doneItems.length > 1 ? `${doneItems.length} PDFs compressed` : 'Your PDF is compressed') : 'Nothing was compressed'}
            </h2>
            {doneItems.length > 0 && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatBytes(totalBefore)} → {formatBytes(totalAfter)} · {totalPct > 0 ? `you saved ${totalPct}%` : 'no reduction'}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {doneItems.length === 1 && (
                <PrimaryButton onClick={() => download(doneItems[0].result.blob, outName(doneItems[0].file.name))}>
                  <Download className="h-4 w-4" aria-hidden /> Download compressed PDF
                </PrimaryButton>
              )}
              {doneItems.length > 1 && (
                <PrimaryButton onClick={downloadZip} busy={zipBusy}>
                  {zipBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />} Download all as ZIP
                </PrimaryButton>
              )}
              <ResetButton onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden /> Compress more</ResetButton>
            </div>
          </div>

          <ul className="space-y-3" aria-label="Results">
            {items.map((it) => {
              if (it.status === 'error') {
                return (
                  <li key={it.id} role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span><strong className="font-medium">{it.file.name}</strong>: {it.error}</span>
                  </li>
                );
              }
              const r = it.result;
              const pct = r.size < r.original ? Math.floor((1 - r.size / r.original) * 100) : 0;
              const already = (r.usedOriginal || pct < 2) && !r.target?.alreadyUnder;
              const t = r.target;
              return (
                <li key={it.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-medium text-foreground" title={it.file.name}>{it.file.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{formatBytes(r.original)} → <span className="text-foreground">{formatBytes(r.size)}</span></p>
                    </div>
                    <span className={`rounded-full px-3 py-1 font-mono text-xs font-semibold ${pct >= 2 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{pct >= 2 ? `−${pct}%` : '0%'}</span>
                    {doneItems.length > 1 && (
                      <button type="button" onClick={() => download(r.blob, outName(it.file.name))} aria-label={`Download ${outName(it.file.name)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                        <Download className="h-3.5 w-3.5" aria-hidden /> PDF
                      </button>
                    )}
                  </div>
                  {already && (
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>This file is already well optimised{r.usedOriginal ? ': we could not make it smaller, so you get the original back' : ' (under 2% smaller)'}.{mode === 'smart' && level !== 'extreme' && !t ? ' Try “Extreme compression” or a target size for more.' : ''}</span>
                    </p>
                  )}
                  {t && (
                    <p className={`mt-3 text-xs ${t.met ? 'text-primary' : 'text-destructive'}`}>
                      {t.alreadyUnder ? `Already under ${formatBytes(t.bytes)}, returned unchanged.`
                        : t.met ? `Target ${formatBytes(t.bytes)} met${t.dpi ? ` at ~${t.dpi} dpi` : ''} (${t.trials} trial${t.trials > 1 ? 's' : ''}).`
                        : `Could not reach ${formatBytes(t.bytes)}: this is the smallest we can make it${t.noImages ? ' (no compressible images)' : ''}. Try Flatten to images under Advanced options.`}
                    </p>
                  )}
                  {describeImages(r.images) && <p className="mt-2 font-mono text-[11px] text-muted-foreground">{describeImages(r.images)} ({formatBytes(r.images.before)} → {formatBytes(r.images.after)})</p>}
                  {doneItems.length === 1 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      Continue with:
                      {[['split', 'Split'], ['merge', 'Merge'], ['ocr', 'OCR']].map(([slug, lab]) => (
                        <button key={slug} type="button" onClick={() => continueTo(slug, it)} className="rounded-md border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">{lab}</button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="mt-16 space-y-12 border-t border-border pt-10">
        <section aria-labelledby="levels-h">
          <h2 id="levels-h" className="font-display text-xl font-bold text-foreground">Which compression level should I use?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {COMPRESS_LEVEL_GUIDE.map((l) => (
              <div key={l.id} className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-display text-sm font-semibold text-foreground">{l.name}</h3>
                <p className="mt-0.5 text-xs font-medium text-primary">{l.summary}</p>
                <p className="mt-2 text-sm text-muted-foreground">{l.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Savings depend on what is inside the file: photo-heavy PDFs shrink a lot, text-only PDFs very little. You always see the exact before and after size.</p>
        </section>

        <section id="how-to" aria-labelledby="how-h">
          <h2 id="how-h" className="font-display text-xl font-bold text-foreground">How to compress a PDF</h2>
          <ol className="mt-4 space-y-3">
            {COMPRESS_STEPS.map((s, i) => (
              <li key={s.name} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary" aria-hidden>{i + 1}</span>
                <p className="text-sm text-muted-foreground"><strong className="font-medium text-foreground">{s.name}.</strong> {s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-xl font-bold text-foreground">Compress PDF: questions</h2>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
            {COMPRESS_FAQ.map((f) => (
              <details key={f.q} className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </ToolShell>
  );
}
