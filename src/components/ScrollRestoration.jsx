import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

function getScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function scrollTo(y) {
  window.scrollTo({ top: y, left: 0, behavior: 'auto' });
}

function scrollToHash(hash, smooth) {
  const id = getHashId(hash);
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    return true;
  }
  return false;
}

function isInAppHref(href) {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }
  return true;
}

export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map());
  const prevLocationRef = useRef(location);
  const leaveScrollSnapshotRef = useRef(null);

  useEffect(() => {
    if (!('scrollRestoration' in history)) return undefined;
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      const anchor = event.target.closest('a[href]');
      if (!anchor) return;
      if (!isInAppHref(anchor.getAttribute('href'))) return;
      leaveScrollSnapshotRef.current = getScrollY();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  // Track scroll while on this history entry.
  useEffect(() => {
    const { key } = location;
    const onScroll = () => {
      scrollPositions.current.set(key, getScrollY());
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.key]);

  useLayoutEffect(() => {
    const prevLocation = prevLocationRef.current;
    if (prevLocation.key !== location.key) {
      const y = leaveScrollSnapshotRef.current ?? getScrollY();
      scrollPositions.current.set(prevLocation.key, y);
      leaveScrollSnapshotRef.current = null;
    }
    prevLocationRef.current = location;

    const { hash, key } = location;

    const persistScroll = () => {
      scrollPositions.current.set(key, getScrollY());
    };

    if (navigationType === 'POP') {
      const saved = scrollPositions.current.get(key);
      if (saved != null) {
        const restore = () => scrollTo(saved);
        restore();
        requestAnimationFrame(restore);
        return persistScroll;
      }
    }

    if (hash) {
      if (scrollToHash(hash, navigationType !== 'POP')) {
        return persistScroll;
      }

      const timer = window.setTimeout(() => {
        scrollToHash(hash, navigationType !== 'POP');
      }, 50);
      return () => {
        window.clearTimeout(timer);
        persistScroll();
      };
    }

    if (navigationType !== 'POP') {
      scrollTo(0);
    }

    return persistScroll;
  }, [location.pathname, location.search, location.hash, location.key, navigationType]);

  return null;
}
