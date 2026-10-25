import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRouteMeta } from '@/lib/routeMeta';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_TYPE,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  absoluteUrl,
} from '@/lib/site';

function upsertMeta(selector, attributes) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'content') el.setAttribute('content', value);
    else el.setAttribute(key, value);
  });
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * @param {{ title?: string, description?: string, path?: string, noindex?: boolean }} options
 */
export default function usePageSeo({ title, description, path, noindex = false } = {}) {
  const location = useLocation();
  // Known routes take their metadata from the shared route table so the
  // client-side values always match what scripts/prerender-routes.mjs bakes into the static HTML.
  const routeMeta = getRouteMeta(location.pathname);
  const canonicalPath = routeMeta?.path ?? path ?? location.pathname;
  const docTitle = routeMeta?.title || title || DEFAULT_TITLE;
  const docDescription = routeMeta?.description || description || DEFAULT_DESCRIPTION;
  const jsonLdKey = routeMeta ? JSON.stringify(routeMeta.jsonLd) : '';
  const canonical = absoluteUrl(canonicalPath);
  const ogImage = absoluteUrl(OG_IMAGE_PATH);

  useEffect(() => {
    document.title = docTitle;

    upsertMeta('meta[name="description"]', { name: 'description', content: docDescription });
    upsertLink('canonical', canonical);

    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: docTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: docDescription });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ogImage });
    upsertMeta('meta[property="og:image:type"]', { property: 'og:image:type', content: OG_IMAGE_TYPE });
    upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) });
    upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) });
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: OG_IMAGE_ALT });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: docTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: docDescription });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage });
    upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: OG_IMAGE_ALT });

    document.head.querySelectorAll('script[data-route-jsonld]').forEach((n) => n.remove());
    if (jsonLdKey) {
      JSON.parse(jsonLdKey).forEach((block) => {
        const el = document.createElement('script');
        el.type = 'application/ld+json';
        el.setAttribute('data-route-jsonld', '');
        el.textContent = JSON.stringify(block);
        document.head.appendChild(el);
      });
    }

    if (noindex) {
      upsertMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' });
    } else {
      const robots = document.head.querySelector('meta[name="robots"]');
      if (robots) robots.remove();
    }
  }, [docTitle, docDescription, canonical, ogImage, noindex, jsonLdKey]);
}
