import React from 'react';
import PageShell from '@/components/PageShell';
import { FileLock2, Cpu, WifiOff, ShieldOff, Code2, CircleCheck } from 'lucide-react';

export default function PrivacyManifesto() {
  const pillars = [
    { icon: FileLock2, title: 'File API, not network API', body: 'You open a file with the browser File API. Its bytes are read into an in-memory ArrayBuffer. There is no fetch, no XMLHttpRequest, no upload — the file is never serialized over the network.' },
    { icon: Cpu, title: 'Processing on your CPU', body: 'All PDF parsing, rendering, and editing happens in JavaScript running on your device — off the main thread in Web Workers where possible. Your processor does the work, not a server.' },
    { icon: WifiOff, title: 'No backend, by design', body: 'BolaPDF ships with zero server endpoints. There is nothing to upload to, nothing to store on a remote disk, and nothing to leak. Disconnect your network mid-task and it keeps working.' },
    { icon: ShieldOff, title: 'No accounts, no telemetry', body: 'No sign-up, no cookies, no analytics script, no tracking pixels. Nothing about you or your documents is collected because there is nowhere to collect it.' },
  ];

  return (
    <PageShell
      title="Privacy Manifesto"
      description="The technical architecture behind BolaPDF, and a plain-spoken guarantee: every byte is processed locally in your browser."
    >
      <div className="prose-invert max-w-none">
        <p className="text-base leading-relaxed text-muted-foreground">
          Most online PDF editors follow a simple model: you upload a file, a server processes
          it, and you download the result. That means a copy of your document lives on someone
          else's machine — often indefinitely. BolaPDF inverts that model entirely.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-base font-semibold text-foreground">{p.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-mono text-xs uppercase tracking-widest text-primary">What runs where</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Step</th>
                <th className="px-4 py-3">Where it happens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['Open file', 'Browser File API → memory'],
                ['Parse PDF', 'pdf.js / pdf-lib in your tab'],
                ['Render & edit', 'Web Workers on your CPU'],
                ['Save result', 'Blob → download to disk'],
                ['Network', '—  (nothing)'],
              ].map(([step, where]) => (
                <tr key={step} className="bg-background">
                  <td className="px-4 py-3 font-mono text-foreground">{step}</td>
                  <td className="px-4 py-3 text-muted-foreground">{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <CircleCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">Verify it yourself</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Code2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Open DevTools → Network. Process a file. You will see zero requests.</li>
            <li className="flex gap-2"><WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Switch your device to airplane mode and run any tool — it works unchanged.</li>
            <li className="flex gap-2"><FileLock2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> The source is plain JavaScript. Every line of processing is auditable.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}