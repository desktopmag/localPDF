import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, FileLock2, WifiOff, Layers } from 'lucide-react';
import { tools } from '@/lib/tools';
import ConvertToolsSection from '@/components/ConvertToolsSection';

export default function Home() {
  const categories = [...new Set(tools.map((t) => t.category))];
  const [serverOff] = useState(true);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-10 h-80 w-80 rounded-full bg-accent/20 blur-[130px]" />
          <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-primary/10 blur-[130px]" />
          {/* Refractive light beams */}
          <div className="absolute left-[58%] top-[-20%] h-[160%] w-px rotate-[16deg] bg-gradient-to-b from-transparent via-primary/40 to-transparent blur-[2px]" />
          <div className="absolute left-[64%] top-[-20%] h-[160%] w-px rotate-[16deg] bg-gradient-to-b from-transparent via-foreground/15 to-transparent blur-[3px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
              'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }} />
          
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:py-28">
          <div className="glass-refract inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1.5">
            <span className={`relative flex h-2 w-2 ${serverOff ? '' : 'opacity-30'}`}>
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Server Connection: Disconnected
            </span>
          </div>

          <h1 className="mt-7 max-w-4xl font-display text-5xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-7xl">
            PDF tools that <span className="text-primary">never leave</span> your browser.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">A privacy-first PDF editor. Every operation runs locally on your device — no uploads, no servers, no tracking. Built for Android, IOS and the modern web.

          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/tools/merge"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90">
              
              Open a tool <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#tools"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:border-primary/40">
              
              Browse the arsenal
            </a>
          </div>

          <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
            {[
            { icon: WifiOff, value: '0 bytes', label: 'Uploaded' },
            { icon: Cpu, value: '100%', label: 'On-device' },
            { icon: Layers, value: `${tools.length}`, label: 'Local tools' }].
            map((s) =>
            <div key={s.label} className="glass-refract rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-0.5">
                <s.icon className="h-5 w-5 text-accent" />
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tools arsenal */}
      <section id="tools" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">The Local Arsenal</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Every tool. Zero servers.
            </h2>
          </div>
          <FileLock2 className="hidden h-10 w-10 text-primary/40 sm:block" />
        </div>

        {categories.map((cat) =>
        <div key={cat} className="mb-12">
            <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">{cat}</h3>
            {cat === 'Convert' ? (
              <ConvertToolsSection />
            ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {tools.
            filter((t) => t.category === cat).
            map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.slug}
                  to={`/tools/${t.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors group-hover:border-primary/40">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-display text-base font-semibold text-foreground">{t.title}</h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
                      <p className="mt-4 font-mono text-[9px] uppercase tracking-widest text-accent">{t.lib}</p>
                    </Link>);

            })}
            </div>
            )}
          </div>
        )}
      </section>

      {/* Privacy Manifesto */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Privacy Manifesto</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your documents belong to you. Period.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Most online PDF editors upload your files to a server, process them remotely,
                and store copies you can't see. LocalPDF does the opposite. There is no
                backend — nothing to upload to, nothing to store, nothing to leak.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                This is a lightweight, in-browser editor optimised for everyday edits on
                phones and laptops. It is intentionally not a heavy server-side processing
                pipeline — that's the whole point.
              </p>
            </div>
            <div className="grid gap-3">
              {[
              { icon: FileLock2, title: 'Files stay on your device', body: 'Opened with the browser File API. Never transmitted over the network.' },
              { icon: Cpu, title: 'Processed on your CPU', body: 'PDF rendering and editing run in Web Workers on your own machine.' },
              { icon: WifiOff, title: 'No accounts, no tracking', body: 'No sign-up, no analytics, no cookies. Nothing leaves the tab.' }].
              map((f) =>
              <div key={f.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{f.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>);

}