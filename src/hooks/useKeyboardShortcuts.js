import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tools } from '@/lib/tools';

// Real, global keyboard shortcuts. Ignored while typing in a field.
export default function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    let gPressed = false;
    let gTimer = null;

    function isTyping() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    function onPress(e) {
      if (isTyping()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === 'g') {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 800);
        return;
      }

      if (gPressed) {
        const map = { h: '/', t: '/tools', a: '/about', f: '/faq', p: '/privacy-manifesto', s: '/shortcuts', w: '/how-it-works', d: '/system-status', b: '/feedback' };
        if (map[key]) { e.preventDefault(); navigate(map[key]); }
        gPressed = false;
        return;
      }

      if (key === '?') { e.preventDefault(); navigate('/shortcuts'); return; }
      if (key === 'escape') { navigate('/'); return; }

      if (key >= '1' && key <= '9') {
        const idx = parseInt(key, 10) - 1;
        if (tools[idx]) { e.preventDefault(); navigate(`/tools/${tools[idx].slug}`); }
        return;
      }

      if (key === 'u') {
        const input = document.querySelector('input[type=file]');
        if (input) { e.preventDefault(); input.click(); }
        return;
      }

      if (key === 'd') {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => /download/i.test(b.textContent) && !b.disabled
        );
        if (btn) { e.preventDefault(); btn.click(); }
        return;
      }
    }

    window.addEventListener('keydown', onPress);
    return () => window.removeEventListener('keydown', onPress);
  }, [navigate]);
}