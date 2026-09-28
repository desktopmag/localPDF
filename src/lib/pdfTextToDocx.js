import JSZip from 'jszip';

import { getPdfjs } from '@/lib/pdfUtils';

/** @typedef {'fast' | 'layout'} PdfToDocxMode */

export const PDF_TO_DOCX_MODE_INFO = {
  fast: {
    label: 'Fast (text only)',
    detail:
      'Extracts readable text with pdf.js and packs it into a .docx. Usually seconds, not minutes. No tables, images, or exact layout.',
    lib: 'pdf.js + JSZip',
  },
  layout: {
    label: 'Layout (slow)',
    detail:
      'Rebuilds structure with pdf2docx in WebAssembly — tables, fonts, and positioning when possible. Can take many minutes per page.',
    lib: 'PyMuPDF + pdf2docx (WASM)',
  },
};

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraphXml(text) {
  const safe = escapeXml(text);
  return `<w:p><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
}

function pageBreakXml() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

/**
 * @param {string[]} blocks Paragraph text or empty string for a page break between pages.
 */
async function buildDocxBlob(blocks) {
  const bodyParts = [];
  for (const block of blocks) {
    if (block === '\f') {
      bodyParts.push(pageBreakXml());
    } else if (block.length > 0) {
      bodyParts.push(paragraphXml(block));
    } else {
      bodyParts.push('<w:p/>');
    }
  }
  bodyParts.push(
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>',
  );

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyParts.join('')}</w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder('word')?.file('document.xml', documentXml);
  zip.folder('word')?.folder('_rels')?.file(
    'document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );

  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/**
 * @param {File} file
 * @param {(msg: string) => void} [onProgress]
 */
export async function convertPdfToDocxFast(file, onProgress) {
  const pdf = await getPdfjs(file);
  const blocks = [];
  let charCount = 0;

  try {
    const total = pdf.numPages;
    for (let i = 1; i <= total; i++) {
      onProgress?.(`Reading page ${i}/${total}…`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      let line = '';
      let pageHadText = false;

      for (const item of textContent.items) {
        if (!item.str) continue;
        line += item.str;
        charCount += item.str.length;
        if (item.hasEOL) {
          blocks.push(line);
          pageHadText = true;
          line = '';
        }
      }
      if (line.length > 0) {
        blocks.push(line);
        pageHadText = true;
      }
      if (!pageHadText) {
        blocks.push('');
      }
      if (i < total) {
        blocks.push('\f');
      }
    }
  } finally {
    await pdf.destroy();
  }

  if (charCount < 1) {
    throw new Error(
      'No extractable text found. This PDF may be scanned or image-only — use Layout mode for structure recovery, or OCR elsewhere first.',
    );
  }

  onProgress?.('Building .docx…');
  return buildDocxBlob(blocks);
}
