import { applyPatch, isScript, type PatchContext } from '../core/patch.js';
import type { Area, Option } from '../core/schema.js';

/**
 * Thumbnails of a live page. The stage agent sends the page as markup; here it is made inert and
 * each option's patch is applied to a copy of it. The app itself is never touched for a
 * thumbnail, and nothing from it can run: the result is only ever shown in a script-less sandbox.
 */

const REMOVED = 'script,iframe,frame,frameset,object,embed,applet,base,link,meta,noscript,portal,template,title';
const DROPPED = new Set(['srcdoc', 'action', 'formaction', 'ping', 'target', 'manifest', 'data', 'srcset', 'background', 'nonce', 'integrity', 'href', 'xlink:href', 'autofocus']);
const DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp|avif|svg\+xml)[;,]/i;

/** In the page miniature every part sits where it is in the document, also the ones that travel with the screen. */
const FLAT = '[data-pe-pos="sticky"]{position:relative!important;inset:auto!important}[data-pe-pos="fixed"]{display:none!important}';

export interface SnapshotDoc {
  doc: Document;
  /** Origins the copy may load images and fonts from: the app itself. */
  origins: string[];
}

/** Parse a snapshot and take out every element that could run or load something. */
export function parseSnapshot(html: string, origins: string[]): SnapshotDoc {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of Array.from(doc.querySelectorAll(REMOVED))) el.remove();
  return { doc, origins };
}

/**
 * Make a copy inert and turn it into markup. Attributes are cleaned here, after an option's patch
 * was applied, because the selectors of a patch may name them (a[href="#signup"]).
 */
function finish(doc: Document, origins: string[]): string {
  const own = (ref: string): string | null => {
    const value = ref.trim();
    if (DATA_IMAGE.test(value)) return value;
    try {
      const url = new URL(value);
      return origins.includes(url.origin) ? url.href : null;
    } catch {
      return null; // the agent makes every address absolute; anything else is not from it
    }
  };
  const css = (text: string) =>
    text.replace(/@import[^;]*;?/gi, '').replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (_, a?: string, b?: string, c?: string) => {
      const ref = (a ?? b ?? c ?? '').trim();
      return ref.startsWith('#') ? `url("${ref}")` : `url("${own(ref) ?? 'data:,'}")`;
    });

  for (const el of Array.from(doc.querySelectorAll(REMOVED))) el.remove();
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || DROPPED.has(name)) el.removeAttribute(attr.name);
      else if (name === 'src' || name === 'poster') {
        const url = own(attr.value);
        if (url) el.setAttribute(attr.name, url);
        else el.removeAttribute(attr.name);
      } else if (name === 'style') el.setAttribute('style', css(attr.value));
    }
    if (el.localName === 'style') el.textContent = css(el.textContent ?? '');
  }
  const meta = (attrs: Record<string, string>) => {
    const el = doc.createElement('meta');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  const from = origins.join(' ');
  doc.head.prepend(
    meta({ charset: 'utf-8' }),
    meta({ 'http-equiv': 'Content-Security-Policy', content: `default-src 'none'; style-src 'unsafe-inline'; img-src data: ${from}; font-src data: ${from}` }),
  );
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

/** The page as it is. */
export function snapshotHtml(snap: SnapshotDoc): string {
  return finish(snap.doc.cloneNode(true) as Document, snap.origins);
}

/** The page with one option of an area applied. Operations whose elements are missing are left out. */
export function withOption(snap: SnapshotDoc, area: Area, option: Option): string {
  const doc = snap.doc.cloneNode(true) as Document;
  if (!option.patch) return finish(doc, snap.origins);
  let anchor: Element | null = null;
  try {
    anchor = area.anchor ? doc.querySelector(area.anchor) : null;
  } catch {
    anchor = null;
  }
  const ctx: PatchContext = {
    doc,
    anchor: anchor ?? doc.documentElement,
    page: Boolean(option.page) || !anchor,
    addCss: (text) => {
      const style = doc.createElement('style');
      style.textContent = text;
      doc.head.append(style);
      return () => style.remove();
    },
  };
  // One operation at a time: a thumbnail should show as much of the option as the copy allows.
  for (const op of option.patch) {
    if (isScript(op)) continue;
    try {
      applyPatch([op], ctx);
    } catch {
      /* this part cannot be shown in a thumbnail */
    }
  }
  return finish(doc, snap.origins);
}

/** The page for the miniature in the sheet: every part at its place in the document. */
export function flattened(snap: SnapshotDoc): string {
  const doc = snap.doc.cloneNode(true) as Document;
  const style = doc.createElement('style');
  style.textContent = FLAT;
  doc.head.append(style);
  return finish(doc, snap.origins);
}
