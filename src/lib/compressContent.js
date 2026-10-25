/**
 * Page copy for /tools/compress. Plain data (no React) so the same text feeds the page,
 * the FAQPage/HowTo JSON-LD in routeMeta.js and the prerendered crawlable HTML.
 */

export const COMPRESS_DESCRIPTION =
  'Compress PDF files in your browser: choose Extreme, Recommended or Less compression, or a target size like 1 MB. Batch + ZIP, links and forms kept, nothing uploaded.';

export const COMPRESS_STEPS = [
  { name: 'Add your PDFs', text: 'Drop one or more PDF files onto the page, or press “Select PDF files”.' },
  { name: 'Choose how small', text: 'Pick Extreme, Recommended or Less compression, or switch on “Compress to a target size” and enter a limit such as 1 MB.' },
  { name: 'Press Compress PDF', text: 'Each file is processed on your device with a progress bar. You can cancel at any time.' },
  { name: 'Download', text: 'Save the compressed PDF, or one ZIP when you compressed several files. See the exact size before and after.' },
];

export const COMPRESS_LEVEL_GUIDE = [
  {
    id: 'extreme',
    name: 'Extreme compression',
    summary: 'Smallest file, visible loss on photos.',
    text: 'Images are scaled to about 72 dpi and re-encoded at the lowest quality that still looks acceptable. Good for sending a quick draft or fitting a strict upload limit. Fine print in scanned pages can get soft.',
  },
  {
    id: 'recommended',
    name: 'Recommended compression',
    summary: 'Best balance for most documents.',
    text: 'Images are scaled to about 110 dpi, which is sharp on screens and fine for most office printing. This is the right choice for email attachments and web forms.',
  },
  {
    id: 'less',
    name: 'Less compression',
    summary: 'Highest quality, modest savings.',
    text: 'Images are kept near 150 dpi with a strict similarity check, so pages look the same as the original. Use it for portfolios, contracts with signatures, or anything you plan to print.',
  },
];

export const COMPRESS_FAQ = [
  {
    q: 'How do I compress a PDF for email?',
    a: 'Choose Recommended compression and press Compress PDF. Most email services accept attachments up to about 20 to 25 MB, and a typical photo-heavy PDF falls well below that. If the result is still too big, run it again with Extreme compression or set a target size.',
  },
  {
    q: 'How do I get a PDF under 1 MB?',
    a: 'Turn on “Compress to a target size”, enter 1 and choose MB. The compressor tries several quality settings and keeps the best-looking result that fits. If a file cannot reach the target with images alone, it tells you and suggests flattening pages to images under Advanced options.',
  },
  {
    q: 'Does compressing a PDF reduce its quality?',
    a: 'Only the images are changed, and only as much as the level you pick allows. Text and vector graphics stay sharp and selectable. Each image is compared with its original during compression, and an image is left alone when re-encoding it would not make it smaller.',
  },
  {
    q: 'Why did my PDF barely shrink, or come back unchanged?',
    a: 'Text-only documents and PDFs that were already optimised have little left to remove. When no smaller version can be produced, you get your original file back instead of a bigger one, and the result card says so.',
  },
  {
    q: 'My PDF is password-protected. Can I still compress it?',
    a: 'Not directly. Encrypted files cannot be rewritten safely, so open the Unlock PDF tool first, remove the password (you need to know it), then compress the unlocked copy. You can protect it again afterwards with the Protect PDF tool.',
  },
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. Compression runs in your browser using WebAssembly, so your documents never leave your device. There is no account, no queue and no daily limit.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'There is no fixed limit, because nothing is uploaded. The real limit is your device’s memory. Files up to roughly 100 MB work on most computers, and larger ones may be slow or fail on phones and low-memory machines. Files are processed one after another to keep memory use down.',
  },
  {
    q: 'Are links, forms and bookmarks kept?',
    a: 'Yes. Compression rewrites images and the file structure but keeps pages, hyperlinks, form fields, annotations and bookmarks. The “Flatten to images” method under Advanced options is the exception, because it turns every page into a picture.',
  },
  {
    q: 'What is removed from my file?',
    a: 'Page thumbnails, unused resources and duplicate copies of identical images are always dropped. With “Remove metadata” on, hidden document info such as author, producer and editing history is cleared too, while the document title is kept.',
  },
  {
    q: 'Can I compress several PDFs at once?',
    a: 'Yes. Add as many files as you like, press Compress PDF once, and download them together as a single ZIP.',
  },
];

/** JSON-LD blocks for the compress route (consumed by routeMeta.js). */
export function compressJsonLd(absoluteUrl) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: COMPRESS_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to compress a PDF online without uploading it',
      step: COMPRESS_STEPS.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text, url: `${absoluteUrl('/tools/compress')}#how-to` })),
    },
  ];
}

/** Crawlable plain-text sections for the prerendered HTML fallback. */
export const compressPrerenderSections = () => [
  { heading: 'How to compress a PDF', items: COMPRESS_STEPS.map((s) => `${s.name}: ${s.text}`) },
  { heading: 'Which compression level?', items: COMPRESS_LEVEL_GUIDE.map((l) => `${l.name}: ${l.text}`) },
  { heading: 'Compress PDF FAQ', items: COMPRESS_FAQ.map((f) => `${f.q} ${f.a}`) },
];
