# Third-party licence notes

Not legal advice. This file records licence facts found while auditing dependencies so the owner can make an informed decision.

## ⚠️ Open decision: `@bentopdf/pymupdf-wasm` is AGPL-3.0-only

BolaPDF loads `@bentopdf/pymupdf-wasm` (a WASM build of PyMuPDF/MuPDF) for **PDF → Word** (`pdf2docx`) and **PDF → Excel**
(`src/lib/pymupdfClient.js`). The package declares **AGPL-3.0-only** (MuPDF is AGPL / commercial dual-licensed by Artifex).

Why it matters: the AGPL is a strong copyleft licence. Distributing AGPL code to users' browsers (even client-side WASM)
is generally treated as distribution/"conveying", which can require offering the *corresponding source of the combined work*
under AGPL terms to every user. Whether BolaPDF's own source then has to be AGPL-licensed, or whether a commercial MuPDF
licence from Artifex is needed, is a **decision for the owner (ideally with a lawyer)**. This branch deliberately does **not**
change that code path.

Options to consider (none implemented here):
1. Keep it and publish BolaPDF's complete source under AGPL-3.0 (add a LICENSE file and a visible "Source" link; the repo is already public but has no LICENSE file).
2. Buy a commercial MuPDF/PyMuPDF licence from Artifex.
3. Replace the two tools with permissive alternatives (e.g. pdf.js text extraction + `docx`/SheetJS, as the "fast text-only" PDF→Word mode already does) and drop the dependency.

Also note: the repository has **no LICENSE file** at all, so by default nobody else has a licence to reuse it either.

## Licences of runtime dependencies that matter

| Package | Licence | Used for |
|---|---|---|
| `@bentopdf/pymupdf-wasm` | **AGPL-3.0-only** | PDF→Word, PDF→Excel (see above) |
| `@matbee/libreoffice-converter` (LibreOffice WASM) | MPL-2.0 | PPTX→PDF |
| `pdf-lib` | MIT | most tools |
| `pdfjs-dist` | Apache-2.0 | rendering / text extraction / OCR page rasterising |
| `jspdf`, `html2canvas`, `pptxgenjs` | MIT | conversions |
| `mammoth` | BSD-2-Clause | DOCX→PDF |
| `xlsx` (SheetJS 0.18.5 from npm) | Apache-2.0 | Excel/CSV (the npm 0.18.5 build is old and has known advisories; SheetJS ships fixes only via their CDN) |
| `jszip` | MIT OR GPL-3.0-or-later (choose MIT) | zip output |
| `dompurify` (transitive) | MPL-2.0 OR Apache-2.0 | HTML sanitising |
| **`tesseract.js`** (added) | Apache-2.0 | OCR tool |
| **`tesseract.js-core`** (added) | Apache-2.0 | OCR WASM engine (self-hosted) |
| **`@tesseract.js-data/eng`** (added) | MIT wrapper around Tesseract `tessdata_best` (Apache-2.0) | English language data (self-hosted) |

The OCR additions are all permissive (Apache-2.0 / MIT) and are compatible with any outcome of the AGPL decision.
When shipping, keep the Apache-2.0 notice / attribution for Tesseract and pdf.js (e.g. in an "Open-source licences" page).

## Not copied from other sites

Nothing in this repository was copied or de-minified from ihatepdf.cv or any other site; the OCR, SEO and code-splitting work uses open-source libraries and original code only.
