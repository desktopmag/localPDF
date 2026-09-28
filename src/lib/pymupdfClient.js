/** Lazy-loaded PyMuPDF + pdf2docx (Pyodide WASM). PDF bytes never leave the device. */

const PYMUPDF_VERSION = '0.11.16';
const CDN_BASE = `https://cdn.jsdelivr.net/npm/@bentopdf/pymupdf-wasm@${PYMUPDF_VERSION}`;

let pymupdfInstance = null;
let pymupdfLoading = null;

/**
 * @returns {Promise<import('@bentopdf/pymupdf-wasm').PyMuPDF>}
 */
export async function getPyMuPDF() {
  if (pymupdfInstance) return pymupdfInstance;
  if (!pymupdfLoading) {
    pymupdfLoading = (async () => {
      const { PyMuPDF } = await import('@bentopdf/pymupdf-wasm');
      // Omit ghostscriptUrl: @bentopdf/gs-wasm@0.1.0 only exports default, not loadGhostscriptWASM,
      // so the RGB pre-pass always fails. pdf2docx still runs with a PyMuPDF CMYK→RGB patch in WASM.
      const client = new PyMuPDF({
        assetPath: `${CDN_BASE}/assets/`,
      });
      await client.load();
      pymupdfInstance = client;
      return client;
    })();
  }
  return pymupdfLoading;
}

/** @param {File} pdf @param {number[] | undefined} pages 0-based page indices */
export async function convertPdfToDocx(pdf, pages) {
  const client = await getPyMuPDF();
  return client.pdfToDocx(pdf, pages);
}

/**
 * Border-first table extraction + optional merged cells (PyMuPDF refine).
 * @param {File} file
 * @param {(msg: string) => void} [onProgress]
 */
export async function extractPdfForExcel(file, onProgress) {
  const client = await getPyMuPDF();
  const doc = await client.open(file);
  const docVar = doc.docVar;
  const allSheets = [];

  try {
    const pageCount = doc.pageCount;
    for (let p = 0; p < pageCount; p++) {
      onProgress?.(`Page ${p + 1}/${pageCount}: tracing operators & tables…`);
      const payload = doc.runPython(`
import json

page = ${docVar}[${p}]

def norm_rows(rows):
    if not rows:
        return []
    maxc = max((len(r) for r in rows), default=0)
    out = []
    for r in rows:
        row = [(c if c is not None else "") for c in r]
        while len(row) < maxc:
            row.append("")
        out.append(row)
    return out

def merges_from_placements(placements):
    merges = []
    if not placements:
        return merges
    for r_i, row in enumerate(placements):
        c_i = 0
        for cell in row:
            if cell is None:
                c_i += 1
                continue
            cs = getattr(cell, "colspan", 1) or 1
            rs = getattr(cell, "rowspan", 1) or 1
            if cs > 1 or rs > 1:
                merges.append({"r0": r_i, "c0": c_i, "r1": r_i + rs - 1, "c1": c_i + cs - 1})
            c_i += cs
    return merges

def grid_from_placements(placements):
    rows = []
    for row in placements:
        line = []
        for cell in row:
            if cell is None:
                line.append("")
            else:
                line.append(getattr(cell, "text", "") or "")
        rows.append(line)
    return norm_rows(rows)

def extract_tables(page):
    result = []
    strategies = [("lines", "lines"), ("text", "text")]
    seen = set()
    for hs, vs in strategies:
        try:
            finder = page.find_tables(horizontal_strategy=hs, vertical_strategy=vs)
        except Exception:
            continue
        for table in finder.tables:
            bb = tuple(round(x, 1) for x in table.bbox)
            if bb in seen:
                continue
            seen.add(bb)
            rows = norm_rows(table.extract())
            merges = []
            try:
                refined = page.find_tables(horizontal_strategy=hs, vertical_strategy=vs, refine=True)
                for rt in refined.tables:
                    rbb = tuple(round(x, 1) for x in rt.bbox)
                    if rbb == bb or (abs(rbb[0] - bb[0]) < 3 and abs(rbb[1] - bb[1]) < 3):
                        placements = getattr(rt, "placements", None)
                        if placements:
                            rows = grid_from_placements(placements)
                            merges = merges_from_placements(placements)
                        break
            except Exception:
                pass
            result.append({"rows": rows, "merges": merges})
    return result

tables = extract_tables(page)
if not tables:
    text = page.get_text("text")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if lines:
        tables = [{"rows": [[ln]], "merges": []} for ln in lines]

json.dumps({"tables": tables})
`);
      const parsed = JSON.parse(payload);
      parsed.tables.forEach((tb, idx) => {
        allSheets.push({
          name: `P${p + 1} T${idx + 1}`,
          page: p + 1,
          rows: tb.rows,
          merges: tb.merges,
        });
      });
    }

    let formFields = [];
    try {
      if (doc.isFormPdf) formFields = doc.getFormFields();
    } catch {
      formFields = [];
    }

    return { sheets: allSheets, formFields };
  } finally {
    doc.close();
  }
}
