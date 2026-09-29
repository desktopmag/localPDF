import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Seo from '@/components/Seo';
import { pageTitle } from '@/lib/site';

export default function ToolShell({ title, description, lib, children }) {
  const seoDescription = `${description} Free, private, and local — runs in your browser on BolaPDF.com with zero uploads.`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <Seo title={pageTitle(title)} description={seoDescription} />
      <Link
        to="/tools"
        className="relative z-10 mb-7 inline-flex items-center gap-2 rounded-md font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All tools
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Local · {lib}</span>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, busy, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function ResetButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function OptionCard({ label, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}