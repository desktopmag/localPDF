import { extractPdfForExcel } from '@/lib/pymupdfClient';

const DATE_PATTERNS = [
  /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
  /^(\d{1,2})[-.](\d{1,2})[-.](\d{2,4})$/,
  /^(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})$/i,
];

const CURRENCY_RE = /^([₹$€£¥]|USD|EUR|GBP|INR)\s*(-?[\d,]+(?:\.\d+)?)$/i;
const NUM_RE = /^-?[\d,]+(?:\.\d+)?$/;
const PCT_RE = /^-?[\d,]+(?:\.\d+)?%$/;

/** @param {string} raw */
export function inferCellType(raw) {
  if (raw == null) return { kind: 'empty', value: '' };
  const s = String(raw).trim();
  if (!s) return { kind: 'empty', value: '' };

  if (/^(true|false|yes|no)$/i.test(s)) {
    return { kind: 'boolean', value: /^(true|yes)$/i.test(s) };
  }

  if (PCT_RE.test(s)) {
    return { kind: 'percent', value: parseFloat(s.replace('%', '').replace(/,/g, '')) / 100 };
  }

  const cur = s.match(CURRENCY_RE);
  if (cur) {
    return { kind: 'currency', value: parseFloat(cur[2].replace(/,/g, '')), symbol: cur[1] };
  }

  if (NUM_RE.test(s.replace(/,/g, ''))) {
    return { kind: 'number', value: parseFloat(s.replace(/,/g, '')) };
  }

  for (const re of DATE_PATTERNS) {
    if (re.test(s)) return { kind: 'date', value: s };
  }

  return { kind: 'string', value: s };
}

function sanitizeSheetName(name) {
  return name.replace(/[\\/*?:[\]]/g, '_').slice(0, 31);
}

function applyCellValue(cell, inferred) {
  switch (inferred.kind) {
    case 'boolean':
      cell.t = 'b';
      cell.v = inferred.value;
      break;
    case 'number':
    case 'percent':
    case 'currency':
      cell.t = 'n';
      cell.v = inferred.value;
      if (inferred.kind === 'percent') cell.z = '0.00%';
      if (inferred.kind === 'currency') cell.z = '#,##0.00';
      break;
    case 'date':
      cell.t = 's';
      cell.v = inferred.value;
      break;
    default:
      cell.t = 's';
      cell.v = inferred.value;
  }
}

function buildWorksheet(XLSX, rows, merges) {
  const ws = XLSX.utils.aoa_to_sheet(rows);

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      const inferred = inferCellType(rows[r][c]);
      applyCellValue(cell, inferred);
    }
  }

  if (merges?.length) {
    ws['!merges'] = merges.map((m) => ({
      s: { r: m.r0, c: m.c0 },
      e: { r: m.r1, c: m.c1 },
    }));
  }

  if (rows.length > 1 && rows[0]?.length) {
    const ref = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length - 1, c: rows[0].length - 1 },
    });
    ws['!autofilter'] = { ref };
    ws['!views'] = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];
  }

  return ws;
}

function buildFormFieldsSheet(XLSX, fields) {
  const header = ['Field name', 'Type', 'Value', 'Read-only'];
  const rows = [header, ...fields.map((f) => [
    f.name || '',
    f.type || '',
    f.value == null ? '' : String(f.value),
    f.readonly ? 'yes' : 'no',
  ])];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 3 } }),
  };
  return ws;
}

/**
 * @param {File} file
 * @param {(msg: string) => void} [onProgress]
 */
export async function convertPdfToXlsx(file, onProgress) {
  onProgress?.('Loading PyMuPDF engine…');
  const { sheets, formFields } = await extractPdfForExcel(file, onProgress);

  if (!sheets.length && !formFields.length) {
    throw new Error('No tables or form fields were detected in this PDF.');
  }

  onProgress?.('Building workbook…');
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();

  for (const sh of sheets) {
    let base = sanitizeSheetName(sh.name || 'Sheet');
    let name = base;
    let n = 2;
    while (usedNames.has(name)) {
      name = sanitizeSheetName(`${base.slice(0, 28)}_${n}`);
      n += 1;
    }
    usedNames.add(name);
    XLSX.utils.book_append_sheet(wb, buildWorksheet(XLSX, sh.rows, sh.merges), name);
  }

  if (formFields.length) {
    XLSX.utils.book_append_sheet(wb, buildFormFieldsSheet(XLSX, formFields), sanitizeSheetName('Form Fields'));
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export const XLSX_PIPELINE = [
  { step: '01', title: 'Operator list parsing', body: 'PyMuPDF traces vector paths and text draws to find ruled grids — no page rasterization.' },
  { step: '02', title: 'Border-first detection', body: 'Line strategies cluster horizontal and vertical rules into a table grid.' },
  { step: '03', title: 'Merged cell detection', body: 'Optional refine pass resolves colspan/rowspan into XLSX !merges.' },
  { step: '04', title: 'Cell background colours', body: 'Fill mapping from PDF rectangles is not exported yet; cell values and merges are.' },
  { step: '05', title: 'Coordinate fallback', body: 'Borderless tables use text alignment strategies; plain text becomes single-column rows.' },
  { step: '06', title: 'Data type inference', body: 'Booleans, numbers, currency, percent, dates, and strings are assigned per cell.' },
  { step: '07', title: 'Form field extraction', body: 'AcroForm widgets export to a Form Fields sheet with filter + freeze.' },
];
