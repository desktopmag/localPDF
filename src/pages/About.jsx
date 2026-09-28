import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { FileLock2, Cpu, WifiOff, ShieldOff, ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <PageShell title="About LocalPDF" description="A privacy-first PDF toolkit built on a simple conviction: your documents should never have to leave your device.">
      <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
        <p>
          LocalPDF exists because the default way of editing PDFs online asks you to hand your
          file to a stranger's server. Contracts, IDs, medical records, financial statements —
          people upload deeply personal documents to websites they've never audited, then hope
          those copies are deleted. That model is convenient. It is also unnecessary.
        </p>
        <p>
          A modern browser is a capable runtime. It can parse, render, and re-author PDFs
          entirely on your own CPU, using open libraries like pdf-lib and pdf.js. LocalPDF wires
          those libraries into a clean toolkit and removes the server from the equation
          completely. There is no upload. There is no storage. There is no account. The only
          machine that ever holds your file is the one in front of you.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          { icon: FileLock2, title: 'Sensitive by nature', body: 'PDFs carry the documents people care about most. Treating them as upload fodder normalizes a real privacy risk.' },
          { icon: Cpu, title: 'Your CPU is enough', body: 'For everyday edits, browser processing is fast and entirely sufficient — without shipping bytes to a data center.' },
          { icon: ShieldOff, title: 'No data to breach', body: 'A service that stores nothing has nothing to leak. The safest server is the one that doesn\'t exist.' },
          { icon: WifiOff, title: 'Works offline', body: 'No network, no problem. Disconnect and every tool keeps running — because none of them ever needed a connection.' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-base font-semibold text-foreground">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Scope, honestly</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          LocalPDF is a lightweight editor for everyday tasks — merge, split, compress,
          sign, watermark. It is intentionally not a heavy server-side pipeline. Very large files,
          server-grade OCR, and batch processing at scale are out of scope by design, and we say
          so plainly rather than pretending otherwise.
        </p>
        <Link to="/how-it-works" className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary hover:underline">
          See how it works <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </PageShell>
  );
}