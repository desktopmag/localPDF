import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  OG_IMAGE_PATH,
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
  const canonicalPath = path ?? location.pathname;
  const docTitle = title || DEFAULT_TITLE;
  const docDescription = description || DEFAULT_DESCRIPTION;
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

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: docTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: docDescription });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage });

    if (noindex) {
      upsertMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' });
    } else {
      const robots = document.head.querySelector('meta[name="robots"]');
      if (robots) robots.remove();
    }
  }, [docTitle, docDescription, canonical, ogImage, noindex]);
}
