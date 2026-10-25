/**
 * Single source of truth for per-route SEO metadata.
 *
 * Pure ESM with relative imports only, so it is used both by the browser
 * (usePageSeo) and by the Node build script (scripts/prerender-routes.mjs),
 * which writes one static HTML file per route.
 */
import { tools } from './tools.js';
import { COMPRESS_DESCRIPTION, compressJsonLd, compressPrerenderSections } from './compressContent.js';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  OG_IMAGE_PATH,
  SITE_ACRONYM_EXPANDED,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
} from './site.js';

/** Legacy / alias URLs. Served as 301s by public/_redirects and as <Navigate> in App.jsx. */
export const REDIRECTS = {
  '/tools/powerpoint-to-pdf': '/tools/pptx-to-pdf',
  '/tools/jpg-to-pdf': '/tools/images-to-pdf',
  '/tools/pdf-to-jpg': '/tools/pdf-to-images',
  '/tools/pdf-to-excel': '/tools/pdf-to-xlsx',
  '/tools/pdf-to-powerpoint': '/tools/pdf-to-pptx',
  '/tools/pdf-to-word': '/tools/pdf-to-docx',
};

const PAGE_SUFFIX = 'BOLA: Browser-Only Local Access — 100% in your browser, no uploads.';

const STATIC_PAGES = {
  '/tools': {
    title: 'Tool Catalog',
    description: 'Every tool in BolaPDF, organized by what it does. All local, all the time.',
  },
  '/about': {
    title: 'About BolaPDF',
    description:
      'A privacy-first PDF toolkit built on a simple conviction: your documents should never have to leave your device.',
  },
  '/how-it-works': {
    title: 'How It Works',
    description: 'Every tool in BolaPDF follows the same four-step path — and the network is never part of it.',
  },
  '/privacy-manifesto': {
    title: 'Privacy Manifesto',
    description:
      'The technical architecture behind BolaPDF, and a plain-spoken guarantee: every byte is processed locally in your browser.',
  },
  '/faq': {
    title: 'FAQ',
    description:
      "Honest answers about what BolaPDF can and can't do, and why a browser-only tool behaves differently from a server.",
  },
  '/shortcuts': {
    title: 'Keyboard Shortcuts',
    description:
      'Move through BolaPDF without reaching for the mouse. These work on every page, except while typing in a field.',
  },
  '/system-status': {
    title: 'System Status',
    description:
      'A live diagnostic of the browser capabilities BolaPDF relies on. Everything here is read on your device — nothing is reported anywhere.',
  },
  '/feedback': {
    title: 'Feedback',
    description: 'Report a bug or suggest a tool — entirely without a server connection.',
  },
};

export const STATIC_PATHS = ['/', ...Object.keys(STATIC_PAGES)];

const webSite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: `${SITE_NAME}: ${SITE_TAGLINE}`,
  url: SITE_URL,
  description: `${SITE_ACRONYM_EXPANDED} — privacy-first PDF tools that run entirely in your browser.`,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/tools?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

const softwareApplication = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: SITE_URL,
  description: `${SITE_NAME}: ${SITE_TAGLINE}`,
  featureList: tools.map((t) => t.title).join(', '),
  screenshot: absoluteUrl(OG_IMAGE_PATH),
};

function breadcrumb(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

function toolMeta(tool) {
  const path = `/tools/${tool.slug}`;
  const isCompress = tool.slug === 'compress';
  const description = isCompress
    ? COMPRESS_DESCRIPTION
    : `${tool.desc} Free, private, and local — runs in your browser on BolaPDF.com with zero uploads.`;
  return {
    path,
    kind: 'tool',
    title: `${tool.title} Online Free, No Upload · ${SITE_NAME}`,
    description,
    heading: tool.title,
    sections: isCompress ? compressPrerenderSections() : undefined,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: `${tool.title} — ${SITE_NAME}`,
        url: absoluteUrl(path),
        description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any (modern web browser)',
        browserRequirements: 'Requires JavaScript and a modern browser',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
      breadcrumb([
        ['Home', '/'],
        ['Tools', '/tools'],
        [tool.title, path],
      ]),
      ...(isCompress ? compressJsonLd(absoluteUrl) : []),
    ],
  };
}

/** @returns {{path:string,kind:string,title:string,description:string,heading:string,jsonLd:object[]}|null} */
export function getRouteMeta(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') {
    return {
      path,
      kind: 'home',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      heading: 'PDF tools that never leave your browser.',
      jsonLd: [webSite, softwareApplication],
    };
  }
  if (path.startsWith('/tools/')) {
    const tool = tools.find((t) => `/tools/${t.slug}` === path);
    return tool ? toolMeta(tool) : null;
  }
  const page = STATIC_PAGES[path];
  if (!page) return null;
  return {
    path,
    kind: 'page',
    title: `${page.title} · ${SITE_NAME}`,
    description: `${page.description} ${SITE_NAME} (${PAGE_SUFFIX})`,
    heading: page.title,
    jsonLd: [
      breadcrumb([
        ['Home', '/'],
        [page.title, path],
      ]),
    ],
  };
}

/** Every indexable path (static pages + one per tool). */
export function getAllRoutePaths() {
  return [...STATIC_PATHS, ...tools.map((t) => `/tools/${t.slug}`)];
}
