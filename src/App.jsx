import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollRestoration from './components/ScrollRestoration';
import Layout from '@/components/Layout';

import Home from '@/pages/Home';
import MergePDF from '@/pages/tools/MergePDF';
import SplitPDF from '@/pages/tools/SplitPDF';
import ExtractPages from '@/pages/tools/ExtractPages';
import HtmlToPdf from '@/pages/tools/HtmlToPdf';
import DocxToPdf from '@/pages/tools/DocxToPdf';
import ExcelToPdf from '@/pages/tools/ExcelToPdf';
import PdfToDocx from '@/pages/tools/PdfToDocx';
import PdfToPptx from '@/pages/tools/PdfToPptx';
import PdfToXlsx from '@/pages/tools/PdfToXlsx';
import PptxToPdf from '@/pages/tools/PptxToPdf';
import OrganizePages from '@/pages/tools/OrganizePages';
import DeletePages from '@/pages/tools/DeletePages';
import CompressPDF from '@/pages/tools/CompressPDF';
import PDFToImages from '@/pages/tools/PDFToImages';
import ImagesToPDF from '@/pages/tools/ImagesToPDF';
import WatermarkPDF from '@/pages/tools/WatermarkPDF';
import PageNumbers from '@/pages/tools/PageNumbers';
import CropPDF from '@/pages/tools/CropPages';
import Metadata from '@/pages/tools/Metadata';
import SignPDF from '@/pages/tools/SignPDF';
import RotatePDF from '@/pages/tools/RotatePDF';
import ProtectPDF from '@/pages/tools/ProtectPDF';
import UnlockPDF from '@/pages/tools/UnlockPDF';
import FlattenPDF from '@/pages/tools/FlattenPDF';
import ExtractText from '@/pages/tools/ExtractText';
import HeadersFooters from '@/pages/tools/HeadersFooters';
import CsvToPdf from '@/pages/tools/CsvToPdf';

import PrivacyManifesto from '@/pages/PrivacyManifesto';
import FAQ from '@/pages/FAQ';
import Shortcuts from '@/pages/Shortcuts';
import About from '@/pages/About';
import HowItWorks from '@/pages/HowItWorks';
import SystemStatus from '@/pages/SystemStatus';
import ToolCatalog from '@/pages/ToolCatalog';
import Feedback from '@/pages/Feedback';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollRestoration />
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
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
