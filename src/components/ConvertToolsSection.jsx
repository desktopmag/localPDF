import React from 'react';
import { Link } from 'react-router-dom';
import { tools } from '@/lib/tools';

function ToolCard({ tool, compact }) {
  const Icon = tool.icon;
  const cardClass = compact
    ? 'group flex w-full flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40'
    : 'group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40';

  return (
    <Link key={tool.slug} to={`/tools/${tool.slug}`} className={cardClass}>
      <div
        className={`flex items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors group-hover:border-primary/40 ${compact ? 'mb-3 h-9 w-9' : 'mb-4 h-11 w-11'}`}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
      <h4 className={`font-display font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}>{tool.title}</h4>
      <p className={`mt-1 line-clamp-2 leading-relaxed text-muted-foreground ${compact ? 'text-[11px]' : 'text-xs'}`}>{tool.desc}</p>
      <p className={`mt-3 font-mono uppercase tracking-widest text-accent ${compact ? 'mt-2 text-[9px]' : 'text-[9px]'}`}>{tool.lib}</p>
    </Link>
  );
}

export default function ConvertToolsSection({ compact = false }) {
  const toPdf = tools.filter((t) => t.category === 'Convert' && t.convertGroup === 'to-pdf');
  const fromPdf = tools.filter((t) => t.category === 'Convert' && t.convertGroup === 'from-pdf');
  const gridClass = compact ? 'grid gap-3 sm:grid-cols-2' : 'grid grid-cols-2 gap-3 sm:grid-cols-2';

  return (
    <div className="space-y-8">
      <div className={`grid gap-8 ${compact ? '' : 'lg:grid-cols-2'}`}>
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">Convert to PDF</p>
          <div className={gridClass}>
            {toPdf.map((t) => <ToolCard key={t.slug} tool={t} compact={compact} />)}
          </div>
        </div>
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">Convert from PDF</p>
          <div className={gridClass}>
            {fromPdf.map((t) => <ToolCard key={t.slug} tool={t} compact={compact} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
