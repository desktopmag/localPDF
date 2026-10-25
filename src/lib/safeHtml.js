/**
 * Make untrusted HTML safe to drop into the live DOM for html2canvas rendering.
 *
 * A local file the user picks is still untrusted: it can carry <script>, onerror= handlers, or <style> rules that
 * would restyle the whole app, and external images/fonts would make network requests that break the
 * "nothing leaves your device" promise. We strip scripts/handlers (DOMPurify), drop every remote URL, and scope the
 * file's own <style> rules to the render host so they can't leak onto the page.
 */
import DOMPurify from 'dompurify';

export const RENDER_HOST_CLASS = 'bola-render-host';

const purify = DOMPurify(window);
const REMOTE = /^\s*(?:https?:)?\/\//i;
const CSS_URL = /url\(\s*(['"]?)(?!data:)[^)]*\1\s*\)/gi;

purify.addHook('uponSanitizeAttribute', (_node, data) => {
  if ((data.attrName === 'src' || data.attrName === 'srcset' || data.attrName === 'background' || data.attrName === 'poster') && REMOTE.test(data.attrValue)) {
    data.keepAttr = false;
  }
  if (data.attrName === 'style') data.attrValue = data.attrValue.replace(CSS_URL, 'none');
});

function scopeCss(css, scope) {
  let sheet;
  try {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
  } catch {
    return ''; // can't parse safely: drop the author CSS rather than risk leaking it
  }
  const out = [];
  const walk = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        const sel = r.selectorText
          .split(',')
          .map((s) => s.trim())
          .map((s) => (/^(html|body|:root)$/i.test(s) ? scope : `${scope} ${s.replace(/^(html|body)\s+/i, '')}`))
          .join(',');
        out.push(`${sel}{${r.style.cssText.replace(CSS_URL, 'none')}}`);
      } else if (r instanceof CSSMediaRule) {
        out.push(`@media ${r.conditionText}{`);
        walk(r.cssRules);
        out.push('}');
      }
    }
  };
  walk(sheet.cssRules);
  return out.join('\n');
}

/** @returns {string} sanitised HTML safe for `element.innerHTML`. */
export function sanitizeForRender(html) {
  const clean = purify.sanitize(String(html), {
    FORCE_BODY: true,
    ADD_TAGS: ['style'],
    FORBID_TAGS: ['link', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'script', 'svg', 'math'],
  });
  const tpl = document.createElement('template');
  tpl.innerHTML = clean;
  tpl.content.querySelectorAll('style').forEach((el) => {
    const scoped = scopeCss(el.textContent || '', `.${RENDER_HOST_CLASS}`);
    if (scoped) el.textContent = scoped;
    else el.remove();
  });
  return tpl.innerHTML;
}
