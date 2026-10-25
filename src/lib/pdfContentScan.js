/**
 * Finds how large each image XObject is actually painted on the page (in PDF points), by walking the
 * content streams and tracking the CTM (q / Q / cm / Do, recursing into Form XObjects).
 * That gives the *effective DPI* of every image, which drives down-sampling in the compressor.
 * Worker-safe (no DOM). Only used for sizing: any parsing failure just means "unknown" for that image.
 */
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream } from 'pdf-lib';

const isWs = (c) => c === 0 || c === 9 || c === 10 || c === 12 || c === 13 || c === 32;
const isDelim = (c) => c === 0x28 || c === 0x29 || c === 0x3c || c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x2f || c === 0x25;
const NUM = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/** Minimal content-stream tokenizer: calls handler(op, operands) for every operator. */
export function scanContent(bytes, handler) {
  const n = bytes.length;
  let i = 0;
  let operands = [];
  while (i < n) {
    const c = bytes[i];
    if (isWs(c)) { i += 1; continue; }
    if (c === 0x25) { while (i < n && bytes[i] !== 10 && bytes[i] !== 13) i += 1; continue; }
    if (c === 0x28) { // ( string )
      let depth = 1;
      i += 1;
      while (i < n && depth > 0) {
        const d = bytes[i];
        if (d === 0x5c) i += 2;
        else { if (d === 0x28) depth += 1; else if (d === 0x29) depth -= 1; i += 1; }
      }
      operands.push('s');
      continue;
    }
    if (c === 0x3c) {
      if (bytes[i + 1] === 0x3c) { // << dict >>
        let depth = 1;
        i += 2;
        while (i < n && depth > 0) {
          if (bytes[i] === 0x3c && bytes[i + 1] === 0x3c) { depth += 1; i += 2; }
          else if (bytes[i] === 0x3e && bytes[i + 1] === 0x3e) { depth -= 1; i += 2; }
          else i += 1;
        }
      } else { // <hex>
        while (i < n && bytes[i] !== 0x3e) i += 1;
        i += 1;
      }
      operands.push('d');
      continue;
    }
    if (c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x29 || c === 0x3e) { i += 1; continue; }
    if (c === 0x2f) { // /Name
      let j = i + 1;
      while (j < n && !isWs(bytes[j]) && !isDelim(bytes[j])) j += 1;
      let nm = '';
      for (let k = i + 1; k < j; k += 1) nm += String.fromCharCode(bytes[k]);
      operands.push({ name: nm.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) });
      i = j;
      continue;
    }
    let j = i;
    while (j < n && !isWs(bytes[j]) && !isDelim(bytes[j])) j += 1;
    let t = '';
    for (let k = i; k < j; k += 1) t += String.fromCharCode(bytes[k]);
    i = j;
    if (NUM.test(t)) { operands.push(parseFloat(t)); continue; }
    if (t === 'BI') { // inline image: skip dict and binary data up to EI
      let p = i;
      while (p < n - 2 && !(isWs(bytes[p]) && bytes[p + 1] === 0x49 && bytes[p + 2] === 0x44 && (p + 3 >= n || isWs(bytes[p + 3])))) p += 1;
      p += 4;
      while (p < n - 1 && !(isWs(bytes[p - 1]) && bytes[p] === 0x45 && bytes[p + 1] === 0x49 && (p + 2 >= n || isWs(bytes[p + 2])))) p += 1;
      i = p + 2;
      operands = [];
      continue;
    }
    handler(t, operands);
    operands = [];
  }
}

const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];

function streamBytes(stream) {
  try {
    if (stream instanceof PDFRawStream) return decodePDFRawStream(stream).decode();
    return stream.getContents?.() ?? new Uint8Array();
  } catch {
    return new Uint8Array();
  }
}

function pageBytes(contents, context) {
  if (!contents) return new Uint8Array();
  if (contents instanceof PDFStream) return streamBytes(contents);
  if (contents instanceof PDFArray) {
    const parts = contents.asArray().map((r) => context.lookup(r)).filter((s) => s instanceof PDFStream).map(streamBytes);
    const total = parts.reduce((a, p) => a + p.length + 1, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; out[o] = 10; o += 1; }
    return out;
  }
  return new Uint8Array();
}

/** @returns {Map<string, { w: number, h: number, uses: number }>} keyed by the image's PDFRef tag; w/h = largest painted size in points */
export function collectImageUsage(doc) {
  const { context } = doc;
  const usage = new Map();
  const formCache = new Map();
  const XOBJ = PDFName.of('XObject');
  const SUBTYPE = PDFName.of('Subtype');

  const record = (tag, m) => {
    const w = Math.hypot(m[0], m[1]);
    const h = Math.hypot(m[2], m[3]);
    const cur = usage.get(tag);
    if (!cur) usage.set(tag, { w, h, uses: 1 });
    else { cur.w = Math.max(cur.w, w); cur.h = Math.max(cur.h, h); cur.uses += 1; }
  };

  const walk = (bytes, resources, ctm0, depth) => {
    const stack = [];
    let ctm = ctm0;
    scanContent(bytes, (op, args) => {
      if (op === 'q') stack.push(ctm);
      else if (op === 'Q') { if (stack.length) ctm = stack.pop(); }
      else if (op === 'cm') {
        const m = args.slice(-6);
        if (m.length === 6 && m.every((x) => typeof x === 'number')) ctm = mul(m, ctm);
      } else if (op === 'Do') {
        const nm = args[args.length - 1]?.name;
        if (!nm || !resources) return;
        const xobjects = resources.lookupMaybe(XOBJ, PDFDict);
        const raw = xobjects?.get(PDFName.of(nm));
        const obj = raw && context.lookup(raw);
        if (!(obj instanceof PDFStream)) return;
        const sub = obj.dict.get(SUBTYPE);
        if (sub === PDFName.of('Image') && raw instanceof PDFRef) record(raw.tag, ctm);
        else if (sub === PDFName.of('Form') && depth < 6 && raw instanceof PDFRef) {
          let fm = [1, 0, 0, 1, 0, 0];
          const marr = obj.dict.lookupMaybe(PDFName.of('Matrix'), PDFArray);
          if (marr && marr.size() === 6) {
            const nums = marr.asArray().map((x) => (context.lookup(x) instanceof PDFNumber ? context.lookup(x).asNumber() : NaN));
            if (nums.every(Number.isFinite)) fm = nums;
          }
          if (!formCache.has(raw.tag)) formCache.set(raw.tag, streamBytes(obj));
          walk(formCache.get(raw.tag), obj.dict.lookupMaybe(PDFName.of('Resources'), PDFDict) ?? resources, mul(fm, ctm), depth + 1);
        }
      }
    });
  };

  for (const page of doc.getPages()) {
    try {
      walk(pageBytes(page.node.Contents(), context), page.node.Resources(), [1, 0, 0, 1, 0, 0], 0);
    } catch {
      /* unreadable page content: its images keep "unknown size" and use the fallback pixel cap */
    }
  }
  return usage;
}
