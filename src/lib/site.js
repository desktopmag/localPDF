/** Public site URL (no trailing slash). */
export const SITE_URL = 'https://bolapdf.com';

export const SITE_NAME = 'BolaPDF';
export const SITE_ACRONYM = 'BOLA';
export const SITE_ACRONYM_EXPANDED = 'Browser-Only Local Access';
/** Short tagline (after the product name). */
export const SITE_TAGLINE = 'privacy-first PDF tools that run 100% in your browser.';
/** Browser tab title on the home page and default site title. */
export const DEFAULT_TITLE = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const DEFAULT_DESCRIPTION =
  'BolaPDF: privacy-first PDF tools that run 100% in your browser. Merge, split, rotate, compress, convert, watermark, and sign PDFs with zero uploads, no servers, and no tracking. BOLA = Browser-Only Local Access.';

export const OG_IMAGE_PATH = '/og-image.png';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_TYPE = 'image/png';
export const OG_IMAGE_ALT = 'BolaPDF: privacy-first PDF tools that run 100% in your browser.';

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function pageTitle(pageTitle) {
  if (!pageTitle) return DEFAULT_TITLE;
  return `${pageTitle} · ${SITE_NAME}`;
}
