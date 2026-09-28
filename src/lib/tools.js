import {
  FileStack, Scissors, LayoutGrid, Trash2, Minimize2,
  ImageDown, FileImage, Droplet, Hash, Crop, FileCog, PenLine, FileSearch, FileCode2,
  FileText, Sheet, Presentation,
} from 'lucide-react';

export const tools = [
  { slug: 'merge', title: 'Merge PDF', desc: 'Combine multiple PDFs into one, in the order you choose.', icon: FileStack, category: 'Organize', lib: 'pdf-lib.js' },
  { slug: 'split', title: 'Split PDF', desc: 'Split a PDF into separate files by ranges or page count.', icon: Scissors, category: 'Organize', lib: 'pdf-lib.js' },
  { slug: 'extract', title: 'Extract Pages', desc: 'Pull specific pages out into a new PDF — keep only what you pick.', icon: FileSearch, category: 'Organize', lib: 'pdf-lib.js' },
  { slug: 'organize', title: 'Organize Pages', desc: 'Drag to reorder and delete pages with live thumbnails.', icon: LayoutGrid, category: 'Organize', lib: 'pdf.js + pdf-lib' },
  { slug: 'delete', title: 'Delete Pages', desc: 'Remove unwanted pages and keep the rest.', icon: Trash2, category: 'Organize', lib: 'pdf-lib.js' },
  { slug: 'compress', title: 'Compress PDF', desc: 'Re-pack or rasterize pages to shrink file size, locally.', icon: Minimize2, category: 'Optimize', lib: 'pdf.js + pdf-lib' },
  { slug: 'images-to-pdf', title: 'JPG to PDF', desc: 'Turn JPG and PNG images into a single PDF.', icon: FileImage, category: 'Convert', convertGroup: 'to-pdf', lib: 'pdf-lib.js' },
  { slug: 'docx-to-pdf', title: 'Word to PDF', desc: 'Convert .docx to PDF locally — basic layout, not a full Word print engine.', icon: FileText, category: 'Convert', convertGroup: 'to-pdf', lib: 'mammoth + html2canvas + jsPDF' },
  { slug: 'excel-to-pdf', title: 'Excel to PDF', desc: 'Export spreadsheet sheets as PDF tables (.xlsx, .csv).', icon: Sheet, category: 'Convert', convertGroup: 'to-pdf', lib: 'SheetJS + jsPDF' },
  { slug: 'html-to-pdf', title: 'HTML to PDF', desc: 'Render a local HTML file to PDF — a basic in-browser converter.', icon: FileCode2, category: 'Convert', convertGroup: 'to-pdf', lib: 'html2canvas + jsPDF' },
  { slug: 'pptx-to-pdf', title: 'PowerPoint to PDF', desc: 'Hi-fi slide export via LibreOffice WASM — shapes, gradients, tables, zero upload.', icon: Presentation, category: 'Convert', convertGroup: 'to-pdf', lib: 'LibreOffice WASM' },
  { slug: 'pdf-to-images', title: 'PDF to JPG', desc: 'Export each page as JPG or PNG images.', icon: ImageDown, category: 'Convert', convertGroup: 'from-pdf', lib: 'pdf.js' },
  { slug: 'pdf-to-docx', title: 'PDF to Word', desc: 'Fast text-only .docx or slow layout rebuild with pdf2docx (WASM).', icon: FileText, category: 'Convert', convertGroup: 'from-pdf', lib: 'pdf.js or PyMuPDF + pdf2docx' },
  { slug: 'pdf-to-pptx', title: 'PDF to PowerPoint', desc: 'Hybrid, editable, or visual PPTX — searchable overlays or native text/images.', icon: Presentation, category: 'Convert', convertGroup: 'from-pdf', lib: 'pdf.js + PptxGenJS' },
  { slug: 'pdf-to-xlsx', title: 'PDF to Excel', desc: 'Vector table extraction — borders, merges, typed cells, form fields.', icon: Sheet, category: 'Convert', convertGroup: 'from-pdf', lib: 'PyMuPDF + SheetJS' },
  { slug: 'watermark', title: 'Watermark PDF', desc: 'Stamp a text watermark across all pages with opacity & angle.', icon: Droplet, category: 'Edit', lib: 'pdf-lib.js' },
  { slug: 'page-numbers', title: 'Page Numbers', desc: 'Add page numbers with position, size and start number.', icon: Hash, category: 'Edit', lib: 'pdf-lib.js' },
  { slug: 'crop', title: 'Crop PDF', desc: 'Trim margins from every page by a set amount.', icon: Crop, category: 'Edit', lib: 'pdf-lib.js' },
  { slug: 'metadata', title: 'Edit Metadata', desc: 'Change title, author, subject and keywords embedded in the file.', icon: FileCog, category: 'Edit', lib: 'pdf-lib.js' },
  { slug: 'sign', title: 'Sign PDF', desc: 'Draw your signature and place it on any page.', icon: PenLine, category: 'Edit', lib: 'pdf-lib.js' },
];

export const toolBySlug = (slug) => tools.find((t) => t.slug === slug);