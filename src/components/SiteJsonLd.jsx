import { SITE_ACRONYM_EXPANDED, SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from '@/lib/site';

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: `${SITE_NAME}: ${SITE_TAGLINE}`,
  url: SITE_URL,
  description: `${SITE_ACRONYM_EXPANDED} — privacy-first PDF tools that run entirely in your browser.`,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/tools?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const software = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  url: SITE_URL,
  description: `${SITE_NAME}: ${SITE_TAGLINE}`,
  featureList: 'Merge, split, compress, convert, sign, watermark, and edit PDF files locally in the browser.',
  screenshot: absoluteUrl('/og-image.svg'),
};

export default function SiteJsonLd() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }} />
    </>
  );
}
