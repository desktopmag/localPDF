/**
 * Page-geometry helpers for stamping content (watermark, page numbers, headers/footers, signatures).
 *
 * pdf-lib draws in *user space*: origin at the MediaBox's lower-left, ignoring /CropBox and /Rotate. Viewers
 * show the CropBox, rotated by /Rotate. These helpers let tools think in the *visible* page instead: a frame
 * with its origin at the visible bottom-left, x to the right, y up, whatever the page's box and rotation.
 */
import { degrees } from 'pdf-lib';

/** @param {import('pdf-lib').PDFPage} page */
export function pageFrame(page) {
  const box = page.getCropBox();
  const rot = (((page.getRotation().angle % 360) + 360) % 360);
  const quarter = rot === 90 || rot === 270;
  return { box, rot, width: quarter ? box.height : box.width, height: quarter ? box.width : box.height };
}

/** Visible-frame point (fx from left, fy from bottom) → user-space point. */
export function toUser(frame, fx, fy) {
  const { box, rot } = frame;
  switch (rot) {
    case 90: return { x: box.x + (box.width - fy), y: box.y + fx };
    case 180: return { x: box.x + (box.width - fx), y: box.y + (box.height - fy) };
    case 270: return { x: box.x + fy, y: box.y + (box.height - fx) };
    default: return { x: box.x + fx, y: box.y + fy };
  }
}

/**
 * Draw text so it reads upright on the visible page.
 * (fx, fy) is the visible anchor: the left / centre / right end of the baseline, depending on `align`.
 * `angle` (degrees, counter-clockwise on screen) additionally rotates the text about its centre-line anchor.
 */
export function drawTextVisible(page, text, { font, size, color, opacity, fx, fy, align = 'left', angle = 0 }) {
  const frame = pageFrame(page);
  const tw = font.widthOfTextAtSize(text, size);
  const a = (angle * Math.PI) / 180;
  const dx = align === 'center' ? -tw / 2 : align === 'right' ? -tw : 0;
  // Offset from the anchor to the baseline start, rotated by `angle` (anchor = middle of the text height when
  // rotating, i.e. a watermark centred on a point).
  const lift = angle ? -(size * 0.35) : 0;
  const ox = dx * Math.cos(a) - lift * Math.sin(a);
  const oy = dx * Math.sin(a) + lift * Math.cos(a);
  const p = toUser(frame, fx + ox, fy + oy);
  page.drawText(text, { x: p.x, y: p.y, size, font, color, opacity, rotate: degrees(frame.rot + angle) });
}

/** Draw an embedded image with its visible bottom-left corner at (fx, fy). */
export function drawImageVisible(page, image, { fx, fy, width, height, opacity }) {
  const frame = pageFrame(page);
  const p = toUser(frame, fx, fy);
  page.drawImage(image, { x: p.x, y: p.y, width, height, opacity, rotate: degrees(frame.rot) });
}
