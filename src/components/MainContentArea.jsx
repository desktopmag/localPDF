import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Subtle GPU-only motion on sidebar toggle (Apple-like depth) without animating layout width.
 */
export default function MainContentArea() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const { state } = useSidebar();
  const mounted = useRef(false);
  const [settled, setSettled] = useState(true);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    setSettled(false);
    const id = window.setTimeout(() => setSettled(true), 40);
    return () => window.clearTimeout(id);
  }, [state]);

  return (
    <div
      className={cn(
        'flex-1 gpu-smooth transition-[transform,opacity] duration-apple ease-apple motion-reduce:transition-none will-change-[transform,opacity]',
        !isHome && 'pt-14 sm:pt-16',
        settled ? 'scale-100 opacity-100' : 'scale-[0.996] opacity-[0.98]',
      )}
    >
      <Outlet />
    </div>
  );
}
