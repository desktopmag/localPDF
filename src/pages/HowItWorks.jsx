import React from 'react';
import PageShell from '@/components/PageShell';
import { FileUp, MemoryStick, Cpu, Download, WifiOff } from 'lucide-react';

const steps = [
  { icon: FileUp, title: '1 · You open a file', body: 'The browser File API reads your PDF into an in-memory ArrayBuffer. No upload occurs — the file never touches the network.' },
  { icon: MemoryStick, title: '2 · Bytes stay in memory', body: 'Your document exists only as an ArrayBuffer in your tab. It is not written to disk, not cached, not persisted anywhere.' },
  { icon: Cpu, title: '3 · Processing on your CPU', body: 'pdf-lib and pdf.js parse, render, and re-author the PDF in JavaScript — off the main thread in Web Workers where possible, so the UI stays responsive.' },
  { icon: Download, title: '4 · Result returns to you', body: 'The edited PDF is wrapped in a Blob and handed straight to your browser\'s download. The file goes from your disk, through your CPU, back to your disk.' },
];

export default function HowItWorks() {
  return (
    <PageShell title="How It Works" description="Every tool in BolaPDF follows the same four-step path — and the network is never part of it.">
      <div className="grid gap-4">
        {steps.map((s) => (
          <div key={s.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-primary">The technologies</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><span className="font-mono text-foreground">File API</span> — opens files without a network round-trip.</li>
            <li><span className="font-mono text-foreground">Web Workers</span> — run heavy parsing off the main thread.</li>
            <li><span className="font-mono text-foreground">pdf.js</span> — renders PDF pages to canvas.</li>
            <li><span className="font-mono text-foreground">pdf-lib</span> — edits and re-assembles PDF structure.</li>
            <li><span className="font-mono text-foreground">Blob + download</span> — returns the result to disk.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">No call to the server</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Because every step is local, there is no server endpoint to call and no API key to
            protect. Open DevTools → Network during any operation and you'll see silence. That
            silence is the feature.
          </p>
        </div>
      </div>
    </PageShell>
  );
}