import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runThemeTransition, setThemeMetaColor } from '@/lib/themeTransition';

const ICON = { size: 20, strokeWidth: 1.75 };

export default function ThemeToggle({ className }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;

    runThemeTransition(() => {
      setDark(next);
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem('bolapdf-theme', next ? 'dark' : 'light');
      } catch (e) {
        /* ignore */
      }
      setThemeMetaColor(next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-current shadow-none transition-transform duration-200 ease-apple active:scale-95 motion-reduce:transition-none',
        className,
      )}
    >
      {dark ? (
        <Sun size={ICON.size} strokeWidth={ICON.strokeWidth} aria-hidden className="block shrink-0" />
      ) : (
        <Moon size={ICON.size} strokeWidth={ICON.strokeWidth} aria-hidden className="block shrink-0" />
      )}
    </button>
  );
}
