import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainContentArea from '@/components/MainContentArea';
import { ShieldOff, Cpu, FileLock2 } from 'lucide-react';
import LocalPdfLogoMark from '@/components/LocalPdfLogoMark';
import SiteJsonLd from '@/components/SiteJsonLd';
import { SITE_ACRONYM_EXPANDED, SITE_NAME } from '@/lib/site';
import ThemeToggle from '@/components/ThemeToggle';
import AppSidebar from '@/components/AppSidebar';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

function ThemeTogglePill({ headerPillClass }) {
  return (
    <div
      className={cn(
        'pointer-events-auto relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center transition-transform duration-apple ease-apple motion-reduce:transition-none active:scale-95',
        headerPillClass,
      )}
    >
      <ThemeToggle
        className={cn(
          'relative z-[1] text-neutral-900 hover:!bg-foreground/10 hover:!text-neutral-900 dark:text-neutral-100 dark:hover:!text-neutral-100',
          themePillIconClass,
        )}
      />
    </div>
  );
}

function SidebarTogglePill({ headerPillClass }) {
  const { open, isMobile, openMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <div
      className={cn(
        'pointer-events-auto relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center transition-transform duration-apple ease-apple motion-reduce:transition-none active:scale-95',
        headerPillClass,
        !isOpen && 'scale-[0.97]',
      )}
    >
      <SidebarTrigger
        className={cn(
          'relative z-[1] h-9 w-9 transition-colors hover:!bg-foreground/10 hover:!text-neutral-900 active:scale-90 dark:hover:!text-neutral-100 [&_svg]:transition-transform [&_svg]:duration-apple [&_svg]:ease-apple',
          headerPillIconClass,
          !isOpen && '[&_svg]:-scale-x-100',
        )}
        title="Toggle sidebar"
      />
    </div>
  );
}

const headerPillClass = 'glass-apple rounded-full text-foreground';

/** Darker, clearer icons on frosted header pills */
const headerPillIconClass =
  'text-neutral-900 dark:text-neutral-100 [&_svg]:!size-5 [&_svg]:text-current [&_svg]:opacity-100 [&_svg]:stroke-[1.75]';

const themePillIconClass =
  'text-neutral-900 dark:text-neutral-100 [&_svg]:text-current [&_svg]:opacity-100';

const MainHeader = memo(function MainHeader() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
        <div className="pointer-events-none sticky top-0 z-40 h-0 w-full overflow-visible">
          <div
            className={cn(
              'pointer-events-none absolute left-1/2 top-3 grid w-[calc(100%-1.5rem)] -translate-x-1/2 grid-cols-[auto_1fr_auto] items-center gap-2 sm:top-4 sm:w-[calc(100%-2.5rem)] sm:gap-2.5',
              isHome ? 'max-w-none' : 'max-w-[66.5rem]',
            )}
          >
            <SidebarTogglePill headerPillClass={headerPillClass} />
            <header
              className={`pointer-events-auto relative z-[1] mx-auto flex h-14 w-fit max-w-full items-center gap-3 px-3 sm:gap-4 sm:px-4 ${headerPillClass}`}
            >
            <Link to="/" className="relative z-[1] flex shrink-0 items-center" aria-label={`${SITE_NAME} home`}>
              <LocalPdfLogoMark size="sm" className="rounded-full" />
            </Link>

            <Link
              to="/"
              className="relative z-[1] shrink-0 whitespace-nowrap font-display text-base font-bold tracking-tight text-foreground sm:text-lg"
            >
              Bola<span className="text-primary">PDF</span>
            </Link>

            <Link
              to="/tools"
              className="relative z-[1] inline-flex shrink-0 items-center rounded-full bg-foreground/90 px-3.5 py-2 text-xs font-medium text-background shadow-sm backdrop-blur-md transition-[opacity,transform] duration-apple ease-apple hover:bg-foreground active:scale-[0.98] sm:px-5 sm:text-sm dark:bg-white/90 dark:text-black dark:hover:bg-white"
            >
              Browse tools
            </Link>
            </header>
            <ThemeTogglePill headerPillClass={headerPillClass} />
          </div>
        </div>
  );
});

const MainChrome = memo(function MainChrome() {
  return (
      <SidebarInset className="relative isolate min-h-svh site-grid-bg [contain:layout]">
        <MainHeader />

        <MainContentArea />

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
                  {SITE_NAME} ({SITE_ACRONYM_EXPANDED}) is a privacy-first PDF editor. There is no backend. Every tool runs entirely in your browser
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
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                © {new Date().getFullYear()} {SITE_NAME}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Built with pdf-lib · pdf.js · WebWorkers
              </p>
            </div>
          </div>
        </footer>
      </SidebarInset>
  );
});

export default function Layout() {
  useKeyboardShortcuts();

  return (
    <SidebarProvider defaultOpen>
      <SiteJsonLd />
      <AppSidebar />
      <MainChrome />
    </SidebarProvider>
  );
}
