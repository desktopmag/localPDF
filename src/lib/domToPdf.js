/**
 * Rasterize a DOM element to a multi-page A4 PDF using html2canvas + jsPDF.
 */
export async function domElementToPdfBytes(element, { orientation = 'portrait' } = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // Browsers cap canvas height (~32k px); shrink the scale for very long documents so they don't render blank.
  const height = Math.max(element.scrollHeight, 1);
  const scale = Math.max(0.75, Math.min(2, 30000 / height));
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: false,
    allowTaint: false,
    logging: false,
  });

  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableH = pageH - margin * 2;

  const imgW = pageW;
  const ptPerPx = imgW / canvas.width;
  const sliceH = Math.floor(usableH / ptPerPx);
  let srcY = 0;
  // JPEG slices: ~10x smaller than PNG for rendered text/photo pages, which keeps big documents downloadable.
  while (srcY < canvas.height) {
    const h = Math.min(sliceH, canvas.height - srcY);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, srcY, canvas.width, h, 0, 0, canvas.width, h);
    pdf.addImage(slice.toDataURL('image/jpeg', 0.9), 'JPEG', 0, margin, imgW, h * ptPerPx, undefined, 'FAST');
    slice.width = 0;
    srcY += h;
    if (srcY < canvas.height) pdf.addPage();
  }
  canvas.width = 0;

  return pdf.output('arraybuffer');
}

export function createOffscreenHost(widthPx = 794) {
  const host = document.createElement('div');
  host.className = 'bola-render-host';
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.background = '#ffffff';
  host.style.color = '#111111';
  host.style.width = `${widthPx}px`;
  host.style.padding = '40px';
  host.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  host.style.fontSize = '14px';
  host.style.lineHeight = '1.6';
  host.style.boxSizing = 'border-box';
  return host;
}
