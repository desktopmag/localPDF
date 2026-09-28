import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { tools } from '@/lib/tools';
import ConvertToolsSection from '@/components/ConvertToolsSection';
import { ArrowRight } from 'lucide-react';

export default function ToolCatalog() {
  const categories = [...new Set(tools.map((t) => t.category))];

  return (
    <PageShell title="Tool Catalog" description="Every tool in LocalPDF, organized by what it does. All local, all the time.">
      <div className="space-y-10">
        {categories.map((cat) => (
          <div key={cat}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">{cat}</h2>
            {cat === 'Convert' ? (
              <ConvertToolsSection compact />
            ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tools
                .filter((t) => t.category === cat)
                .map((t) => {
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.slug}
                      to={`/tools/${t.slug}`}
                      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors group-hover:border-primary/40">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-sm font-semibold text-foreground">{t.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-accent">{t.lib}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </Link>
                  );
                })}
            </div>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}