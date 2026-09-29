/**
 * Light theme switch — short crossfade only (no full-page clip-path; stays smooth on heavy pages).
 */
export function runThemeTransition(applyTheme) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced || typeof document.startViewTransition !== 'function') {
    applyTheme();
    return;
  }

  document.startViewTransition(applyTheme);
}

export function setThemeMetaColor(isDark) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', isDark ? '#0A0A0C' : '#ffffff');
  }
}
