import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Is there a file size limit?',
    a: 'There is no hard limit imposed by BolaPDF — the limit is your device. Because files are processed in memory, very large PDFs can strain available RAM. For most everyday documents (a few hundred pages, tens of megabytes) a modern phone or laptop handles it fine. Scanned PDFs of hundreds of high-res pages may be slow or fail on low-memory devices.',
  },
  {
    q: 'Why is it slower than server-based tools for huge files?',
    a: 'Server tools run on dedicated hardware with optimized native libraries and GPUs. BolaPDF runs in your browser tab on your CPU. That trade-off is the whole point: privacy and zero-upload come at the cost of raw throughput. For everyday edits the difference is negligible; for batch-processing thousands of files, a server pipeline is the right tool.',
  },
  {
    q: 'Why might results differ from server-based alternatives?',
    a: 'Two reasons. First, the underlying libraries differ — BolaPDF uses pdf-lib and pdf.js, so re-compression, font handling, and image resampling follow their behaviour, not a server\'s proprietary engine. Second, server tools sometimes offer features that cannot be done safely in-browser (heavy OCR, server-grade compression). Those are intentionally out of scope here.',
  },
  {
    q: 'Does Compress always shrink my file?',
    a: 'No. Lossless re-pack can only remove structural bloat; if a PDF is already optimised, it may come back the same size — and BolaPDF will never return a file larger than your original. Rasterize mode re-renders pages as images, which can actually increase size for text-heavy PDFs. Use compress on scanned or image-heavy documents for the best results.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Once the page has loaded, no network connection is required for any tool. You can disconnect entirely and every operation continues to work. The app does not phone home for anything.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Any modern browser with Web Workers, the File API, and WebAssembly — Chrome, Edge, Firefox, Safari, and their mobile equivalents. Very old browsers or strict privacy modes that disable Workers may degrade or fail. See System Status for a live check of your current browser.',
  },
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. This is the core guarantee. Files are opened with the browser File API and exist only in your tab\'s memory. There is no upload endpoint and no server to receive one. You can confirm this in your browser\'s Network tab while using any tool.',
  },
  {
    q: 'Can I use it on mobile?',
    a: 'Yes — the interface is mobile-first and the processing runs on your phone\'s CPU. Performance depends on the device; older phones may struggle with large files. For repeated heavy work, a desktop with more RAM will be smoother.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function FAQ() {
  const [open, setOpen] = useState(null);

  return (
    <PageShell title="FAQ" description="Honest answers about what BolaPDF can and can't do, and why a browser-only tool behaves differently from a server.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="bg-card">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-display text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}