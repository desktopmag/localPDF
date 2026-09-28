/**
 * Rasterize a DOM element to a multi-page A4 PDF using html2canvas + jsPDF.
 */
export async function domElementToPdfBytes(element, { orientation = 'portrait' } = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: false,
    logging: false,
  });

  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  let remaining = canvas.height;
  let srcY = 0;
  const srcSliceH = Math.floor((pageH * canvas.width) / imgW);

  if (imgH <= pageH) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
  } else {
    while (remaining > 0) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(srcSliceH, remaining);
      slice.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, imgW, (slice.height * imgW) / canvas.width);
      srcY += slice.height;
      remaining -= slice.height;
      if (remaining > 0) pdf.addPage();
    }
  }

  return pdf.output('arraybuffer');
}

export function createOffscreenHost(widthPx = 794) {
  const host = document.createElement('div');
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
