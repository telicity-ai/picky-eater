import { stateCuts } from '../core/graph.js';
import type { Board, Placements } from '../core/schema.js';
import kitCss from '../kit/kit.css';
import mockCss from '../kit/mock.css';

/** A published revision as the server sends it. */
export interface Pack {
  revision: number;
  digest: string;
  board: Board;
  placements: Placements;
  files: Record<string, string>;
  assets: Record<string, string>;
  /** Per area: who put the mark, what was left out, and which options move. */
  notes?: Record<string, { by: 'agent' | 'taste' | null; rejected: Array<{ pattern: string; name: string; why: string }>; moving: string[] }>;
}

/** What the page should show: the choices, an option being tried out, and the page state. */
export interface Look {
  choices: Record<string, string>;
  preview?: { area: string; option: string } | null;
  /** Id of a cut with its own page state. */
  state: string;
}

const REMOVED = new Set(['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'base', 'link', 'meta', 'noscript', 'portal', 'title', 'template']);
const DROPPED_ATTRS = new Set(['srcdoc', 'action', 'formaction', 'ping', 'target', 'manifest', 'data', 'srcset', 'background', 'nonce', 'integrity']);
const DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i;
const MAX_DEPTH = 8;

/** Mockups load nothing from anywhere: every image is inlined and everything else is refused. */
const MOCK_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

function assetFor(pack: Pack, file: string, ref: string): string | null {
  const value = ref.trim();
  if (DATA_IMAGE.test(value)) return value;
  const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
  return pack.assets[value] ?? pack.assets[dir + value] ?? null;
}

/** Point every url() at an inlined image, or at nothing. */
export function inlineCssUrls(pack: Pack, file: string, css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, '')
    .replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (_, a?: string, b?: string, c?: string) => {
      const ref = a ?? b ?? c ?? '';
      if (ref.trim().startsWith('#')) return `url("${ref.trim()}")`;
      return `url("${assetFor(pack, file, ref) ?? 'data:,'}")`;
    });
}

/**
 * Make a parsed piece of mockup inert. "validate" already refuses all of this; the page is
 * sanitized again here because the browser's parser, not ours, decides what the markup means.
 */
export function sanitize(root: ParentNode, pack: Pack, file: string): void {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const name = el.localName.toLowerCase();
    if (REMOVED.has(name)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const key = attr.name.toLowerCase();
      if (key.startsWith('on') || DROPPED_ATTRS.has(key)) {
        el.removeAttribute(attr.name);
      } else if (key === 'href' || key === 'xlink:href') {
        // Links only work inside the page. A bare "#" would jump to the top, so it becomes inert.
        const value = attr.value.trim();
        if (!value.startsWith('#') || value === '#') {
          el.removeAttribute(attr.name);
          if (name === 'a') {
            el.setAttribute('data-pe-link', '');
            el.setAttribute('role', 'link');
            el.setAttribute('tabindex', '0');
          }
        }
      } else if (key === 'src' || key === 'poster') {
        const data = assetFor(pack, file, attr.value);
        if (data) el.setAttribute(attr.name, data);
        else el.removeAttribute(attr.name);
      } else if (key === 'style') {
        el.setAttribute('style', inlineCssUrls(pack, file, attr.value));
      }
    }
    if (name === 'style') el.textContent = inlineCssUrls(pack, file, el.textContent ?? '');
  }
}

function cutRules(board: Board): string {
  return stateCuts(board)
    .map(
      (id) =>
        `html[data-pe-cut="${id}"] [data-pe-in]:not([data-pe-in~="${id}"]),html[data-pe-cut="${id}"] [data-pe-not~="${id}"]{display:none!important}`,
    )
    .join('\n');
}

function defaultSketch(doc: Document, label: string): DocumentFragment {
  const tpl = doc.createElement('template');
  tpl.innerHTML = '<div class="pe-col"><p class="pe-text"></p><div class="pe-line"></div><div class="pe-line pe-short"></div></div>';
  tpl.content.querySelector('p')!.textContent = label;
  return tpl.content;
}

/** Fill every area slot under `root`: the chosen or previewed option, or the area's sketch. */
function fillSlots(doc: Document, root: ParentNode, pack: Pack, look: Look, depth: number): void {
  for (const slot of Array.from(root.querySelectorAll('[data-pe-area]'))) {
    if (slot.hasAttribute('data-pe-state')) continue; // filled as part of an enclosing option
    const id = slot.getAttribute('data-pe-area')!;
    const area = pack.board.areas.find((a) => a.id === id);
    if (!area || depth > MAX_DEPTH) {
      slot.removeAttribute('data-pe-area');
      continue;
    }
    const previewing = look.preview?.area === id;
    const picked = previewing ? look.preview!.option : look.choices[id];
    const option = area.options.find((o) => o.id === picked);
    slot.replaceChildren();
    if (option?.html && pack.files[option.html] !== undefined) {
      const tpl = doc.createElement('template');
      tpl.innerHTML = pack.files[option.html]!;
      sanitize(tpl.content, pack, option.html);
      slot.setAttribute('data-pe-state', previewing ? 'preview' : 'chosen');
      slot.setAttribute('data-pe-option', option.id);
      slot.append(tpl.content);
      fillSlots(doc, slot, pack, look, depth + 1);
    } else {
      slot.setAttribute('data-pe-state', 'sketch');
      slot.removeAttribute('data-pe-option');
      if (area.sketch && pack.files[area.sketch] !== undefined) {
        const tpl = doc.createElement('template');
        tpl.innerHTML = pack.files[area.sketch]!;
        sanitize(tpl.content, pack, area.sketch);
        for (const nested of Array.from(tpl.content.querySelectorAll('[data-pe-area]'))) nested.removeAttribute('data-pe-area');
        slot.append(tpl.content);
      } else {
        slot.append(defaultSketch(doc, area.label));
      }
    }
  }
}

/** Build the page for a look, as an inert document that is not attached to anything. */
export function compose(pack: Pack, look: Look): Document {
  const base = pack.board.base;
  const frame = base.kind === 'sketch' ? (pack.files[base.frame] ?? '') : '';
  const doc = new DOMParser().parseFromString(frame, 'text/html');
  sanitize(doc, pack, base.kind === 'sketch' ? base.frame : '');

  const meta = (attrs: Record<string, string>) => {
    const el = doc.createElement('meta');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  const style = (name: string, css: string) => {
    const el = doc.createElement('style');
    el.setAttribute('data-pe', name);
    el.textContent = css;
    return el;
  };
  doc.head.prepend(meta({ charset: 'utf-8' }), meta({ 'http-equiv': 'Content-Security-Policy', content: MOCK_CSP }), style('kit', `${mockCss}\n${kitCss}`));
  if (base.kind === 'sketch') {
    for (const path of base.styles ?? []) doc.head.append(style('page', inlineCssUrls(pack, path, pack.files[path] ?? '')));
  }
  doc.head.append(style('cuts', cutRules(pack.board)));

  const root = doc.documentElement;
  root.setAttribute('data-pe-cut', look.state);
  root.setAttribute('data-pe-scroll', 'top');
  fillSlots(doc, doc, pack, look, 0);
  return doc;
}

export function serialize(doc: Document): string {
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

/** Two slots show the same thing if they hold the same option, or both hold the sketch. */
const sameContent = (a: Element, b: Element) =>
  (a.getAttribute('data-pe-option') ?? '') === (b.getAttribute('data-pe-option') ?? '') &&
  (a.getAttribute('data-pe-state') === 'sketch') === (b.getAttribute('data-pe-state') === 'sketch');

/** Slots that are directly inside `root`, not inside another slot. */
function directSlots(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll('[data-pe-area]')).filter((slot) => {
    const outer = slot.parentElement?.closest('[data-pe-area]') ?? null;
    return outer === null || outer === root || !(root as Node).contains(outer);
  });
}

/**
 * Bring a live page in line with a newly composed one by replacing only the areas that differ.
 * Everything else stays as it is, including what the person typed and how far they scrolled.
 * Returns false when the two pages do not line up and the live page must be reloaded.
 */
export function syncSlots(live: ParentNode, next: ParentNode, liveDoc: Document): boolean {
  const a = directSlots(live);
  const b = directSlots(next);
  if (a.length !== b.length || a.some((slot, i) => slot.getAttribute('data-pe-area') !== b[i]!.getAttribute('data-pe-area'))) return false;
  for (let i = 0; i < a.length; i++) {
    const from = a[i]!;
    const to = b[i]!;
    const same = sameContent(from, to);
    for (const name of ['data-pe-state', 'data-pe-option']) {
      const value = to.getAttribute(name);
      if (from.getAttribute(name) === value) continue;
      if (value === null) from.removeAttribute(name);
      else from.setAttribute(name, value);
    }
    if (same) {
      if (!syncSlots(from, to, liveDoc)) return false;
      continue;
    }
    from.replaceChildren(...Array.from(to.childNodes).map((node) => liveDoc.importNode(node, true)));
  }
  return true;
}
