import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
const PageNotFound = lazy(() => import('./lib/PageNotFound'));
import ScrollRestoration from './components/ScrollRestoration';
import Layout from '@/components/Layout';

import Home from '@/pages/Home';
const MergePDF = lazy(() => import('@/pages/tools/MergePDF'));
const SplitPDF = lazy(() => import('@/pages/tools/SplitPDF'));
const ExtractPages = lazy(() => import('@/pages/tools/ExtractPages'));
const HtmlToPdf = lazy(() => import('@/pages/tools/HtmlToPdf'));
const DocxToPdf = lazy(() => import('@/pages/tools/DocxToPdf'));
const ExcelToPdf = lazy(() => import('@/pages/tools/ExcelToPdf'));
const PdfToDocx = lazy(() => import('@/pages/tools/PdfToDocx'));
const PdfToPptx = lazy(() => import('@/pages/tools/PdfToPptx'));
const PdfToXlsx = lazy(() => import('@/pages/tools/PdfToXlsx'));
const PptxToPdf = lazy(() => import('@/pages/tools/PptxToPdf'));
const OrganizePages = lazy(() => import('@/pages/tools/OrganizePages'));
const DeletePages = lazy(() => import('@/pages/tools/DeletePages'));
const CompressPDF = lazy(() => import('@/pages/tools/CompressPDF'));
const PDFToImages = lazy(() => import('@/pages/tools/PDFToImages'));
const ImagesToPDF = lazy(() => import('@/pages/tools/ImagesToPDF'));
const WatermarkPDF = lazy(() => import('@/pages/tools/WatermarkPDF'));
const PageNumbers = lazy(() => import('@/pages/tools/PageNumbers'));
const CropPDF = lazy(() => import('@/pages/tools/CropPages'));
const Metadata = lazy(() => import('@/pages/tools/Metadata'));
const SignPDF = lazy(() => import('@/pages/tools/SignPDF'));
const RotatePDF = lazy(() => import('@/pages/tools/RotatePDF'));
const ProtectPDF = lazy(() => import('@/pages/tools/ProtectPDF'));
const UnlockPDF = lazy(() => import('@/pages/tools/UnlockPDF'));
const FlattenPDF = lazy(() => import('@/pages/tools/FlattenPDF'));
const ExtractText = lazy(() => import('@/pages/tools/ExtractText'));
const OcrPDF = lazy(() => import('@/pages/tools/OcrPDF'));
const HeadersFooters = lazy(() => import('@/pages/tools/HeadersFooters'));
const CsvToPdf = lazy(() => import('@/pages/tools/CsvToPdf'));

const PrivacyManifesto = lazy(() => import('@/pages/PrivacyManifesto'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Shortcuts = lazy(() => import('@/pages/Shortcuts'));
const About = lazy(() => import('@/pages/About'));
const HowItWorks = lazy(() => import('@/pages/HowItWorks'));
const SystemStatus = lazy(() => import('@/pages/SystemStatus'));
const ToolCatalog = lazy(() => import('@/pages/ToolCatalog'));
const Feedback = lazy(() => import('@/pages/Feedback'));

/** Shown while a route's code chunk loads (pages are code-split per route). */
function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</span>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollRestoration />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/tools/merge" element={<MergePDF />} />
            <Route path="/tools/split" element={<SplitPDF />} />
            <Route path="/tools/extract" element={<ExtractPages />} />
            <Route path="/tools/html-to-pdf" element={<HtmlToPdf />} />
            <Route path="/tools/docx-to-pdf" element={<DocxToPdf />} />
            <Route path="/tools/excel-to-pdf" element={<ExcelToPdf />} />
            <Route path="/tools/pptx-to-pdf" element={<PptxToPdf />} />
            <Route path="/tools/powerpoint-to-pdf" element={<Navigate to="/tools/pptx-to-pdf" replace />} />
            <Route path="/tools/jpg-to-pdf" element={<Navigate to="/tools/images-to-pdf" replace />} />
            <Route path="/tools/pdf-to-jpg" element={<Navigate to="/tools/pdf-to-images" replace />} />
            <Route path="/tools/organize" element={<OrganizePages />} />
            <Route path="/tools/delete" element={<DeletePages />} />
            <Route path="/tools/compress" element={<CompressPDF />} />
            <Route path="/tools/pdf-to-images" element={<PDFToImages />} />
            <Route path="/tools/pdf-to-docx" element={<PdfToDocx />} />
            <Route path="/tools/pdf-to-pptx" element={<PdfToPptx />} />
            <Route path="/tools/pdf-to-xlsx" element={<PdfToXlsx />} />
            <Route path="/tools/pdf-to-excel" element={<Navigate to="/tools/pdf-to-xlsx" replace />} />
            <Route path="/tools/pdf-to-powerpoint" element={<Navigate to="/tools/pdf-to-pptx" replace />} />
            <Route path="/tools/pdf-to-word" element={<Navigate to="/tools/pdf-to-docx" replace />} />
            <Route path="/tools/images-to-pdf" element={<ImagesToPDF />} />
            <Route path="/tools/watermark" element={<WatermarkPDF />} />
            <Route path="/tools/page-numbers" element={<PageNumbers />} />
            <Route path="/tools/crop" element={<CropPDF />} />
            <Route path="/tools/metadata" element={<Metadata />} />
            <Route path="/tools/sign" element={<SignPDF />} />
            <Route path="/tools/rotate" element={<RotatePDF />} />
            <Route path="/tools/protect" element={<ProtectPDF />} />
            <Route path="/tools/unlock" element={<UnlockPDF />} />
            <Route path="/tools/flatten" element={<FlattenPDF />} />
            <Route path="/tools/extract-text" element={<ExtractText />} />
            <Route path="/tools/ocr" element={<OcrPDF />} />
            <Route path="/tools/headers-footers" element={<HeadersFooters />} />
            <Route path="/tools/csv-to-pdf" element={<CsvToPdf />} />

            <Route path="/privacy-manifesto" element={<PrivacyManifesto />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/shortcuts" element={<Shortcuts />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/system-status" element={<SystemStatus />} />
            <Route path="/tools" element={<ToolCatalog />} />
            <Route path="/feedback" element={<Feedback />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        </Suspense>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
