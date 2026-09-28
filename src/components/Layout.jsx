import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldOff, Cpu, FileLock2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AppSidebar from '@/components/AppSidebar';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function Layout() {
  useKeyboardShortcuts();

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-5">
          <SidebarTrigger className="-ml-1" />
          <Link to="/" className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileLock2 className="h-4 w-4" />
            </span>
            <span className="truncate font-display text-base font-bold tracking-tight">
              Local<span className="text-primary">PDF</span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {[
              ['/tools', 'Tools'],
              ['/how-it-works', 'How it works'],
              ['/privacy-manifesto', 'Privacy'],
              ['/about', 'About'],
              ['/faq', 'FAQ'],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-card hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>

        <footer className="border-t border-border bg-background">
          <div className="mx-auto max-w-7xl px-5 py-14">
            <div className="grid gap-10 md:grid-cols-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ShieldOff className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-display text-base font-bold text-foreground">Privacy Manifesto</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  LocalPDF is a privacy-first PDF editor. There is no backend. Every tool runs entirely in your browser
                  using the File API and Web Workers — your documents are read from memory, processed on your CPU, and
                  written back to disk. Not a single byte is uploaded to any server.
                </p>
              </div>
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">How it stays local</h3>
                <ul className="mt-4 space-y-3 text-sm text-foreground">
                  <li className="flex gap-2">
                    <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Files are opened with the browser File API —
                    never sent over the network.
                  </li>
                  <li className="flex gap-2">
                    <FileLock2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Processing happens in Web Workers on
                    your device&apos;s CPU.
                  </li>
                  <li className="flex gap-2">
                    <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> No accounts, no analytics, no tracking,
                    no cookies.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Good to know</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  This is a lightweight, in-browser PDF editor — not a heavy server-side processing pipeline. It is
                  built for everyday edits on phones and laptops. Very large files or server-grade OCR are out of scope
                  by design.
                </p>
              </div>
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Navigate</h3>
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {[
                    ['/tools', 'Tool catalog'],
                    ['/how-it-works', 'How it works'],
                    ['/privacy-manifesto', 'Privacy manifesto'],
                    ['/about', 'About'],
                    ['/faq', 'FAQ'],
                    ['/shortcuts', 'Shortcuts'],
                    ['/system-status', 'System status'],
                    ['/feedback', 'Feedback'],
                  ].map(([to, label]) => (
                    <li key={to}>
                      <Link to={to} className="text-muted-foreground transition-colors hover:text-primary">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                © {new Date().getFullYear()} LocalPDF · 100% client-side · No backend
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Built with pdf-lib · pdf.js · WebWorkers
              </p>
            </div>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
