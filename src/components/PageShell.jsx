import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Seo from '@/components/Seo';
import { pageTitle } from '@/lib/site';

export default function PageShell({ title, description, children }) {
  const seoDescription = description
    ? `${description} BolaPDF (BOLA: Browser-Only Local Access) — 100% in your browser, no uploads.`
    : undefined;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <Seo title={pageTitle(title)} description={seoDescription} />
      <Link
        to="/tools"
        className="relative z-10 mb-7 inline-flex items-center gap-2 rounded-md font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All tools
      </Link>
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Local · No server</span>
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}