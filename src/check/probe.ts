import { measureArea, measureMotion, type AreaMeasure, type MotionSign } from '../core/measure.js';
import { isScript, missingTargets } from '../core/patch.js';
import type { PatchOp } from '../core/schema.js';
import { boxOf, play, query, reveal, signinWall } from '../stage/dom.js';
import { createReadiness, frameworksOf, ownerOf, type Owner } from '../stage/framework.js';
import { createKeeper, type Keeper } from '../stage/keeper.js';
import { profilePage } from './profile.js';
import type { Step } from '../stage/protocol.js';

/**
 * The probe: evaluated by the headless browser inside a page that is being measured, the approved
 * mockup or the built page alike. It only reads the page and performs the steps of a cut; with
 * "apply" it lays the approved patches over a page that is not built yet.
 */

export interface ProbeArea {
  id: string;
  /** Tried in order; the first one that has a box on the page is the area. */
  selectors: string[];
}

export interface ProbePatch {
  area: string;
  anchor: string;
  patch: PatchOp[];
  page: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const locate = (area: ProbeArea): Element | null => {
  for (const selector of area.selectors) {
    let all: Element[] = [];
    try {
      all = Array.from(document.querySelectorAll(selector));
    } catch {
      continue;
    }
    const el = all.find((e) => boxOf(e));
    if (el) return el;
  }
  return null;
};

// --- finding one's way on a page ------------------------------------------------------------------

/** Ids and classes that a build tool or a library makes up anew: no good for finding an element again. */
const madeUp = (name: string) =>
  /^(:r|_r_|_R_|radix-|headlessui-|react-aria|mui-|base-ui-|floating-ui-|\d)/.test(name) || /(^|[-_])[rR]_[a-z0-9]{1,5}_?$/.test(name) || /:[rR][a-z0-9]{1,5}:/.test(name) || /\d{4,}/.test(name) || /^(css|sc|jsx|svelte|astro|emotion|chakra|tw)-[a-z0-9]{4,}$/i.test(name) || /^[a-z]{1,3}-[a-f0-9]{6,}$/i.test(name);

/** A class from a CSS module ("Hero_title__x7Kp2", "_title_1k2j3_7"): the part before the hash stays the same. */
const moduleStem = (name: string): string | null => /^([A-Za-z][\w-]*?_[A-Za-z][\w-]*?__)[\w-]{4,}$/.exec(name)?.[1] ?? /^(_[A-Za-z][\w-]*?_)[a-z0-9]{4,}_\d+$/.exec(name)?.[1] ?? null;

const esc = (value: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/[^\w-]/g, '\\$&'));
const only = (selector: string, el: Element): boolean => {
  try {
    const found = document.querySelectorAll(selector);
    return found.length === 1 && found[0] === el;
  } catch {
    return false;
  }
};

/** A class that says how the element looks ("flex", "mt-4", "md:w-1/2"), not what it is: utility styling. */
const utility = (name: string): boolean =>
  /[:[\]/@!()]/.test(name) ||
  /^(flex|grid|block|inline|inline-flex|inline-block|inline-grid|hidden|contents|relative|absolute|fixed|sticky|static|group|peer|container|truncate|sr-only|isolate|italic|underline|uppercase|lowercase|capitalize|antialiased|grow|shrink|visible|invisible|border|rounded|shadow|transition|outline|ring|prose|table|clearfix|row|col)$/.test(name) ||
  /^-?(m|p|w|h|mx|my|px|py|mt|mr|mb|ml|ms|me|pt|pr|pb|pl|ps|pe|min|max|gap|space|text|bg|border|rounded|font|leading|tracking|flex|grid|col|row|items|justify|content|self|place|order|overflow|overscroll|z|top|right|bottom|left|inset|start|end|opacity|shadow|ring|outline|transition|duration|ease|delay|animate|cursor|select|pointer|size|aspect|object|basis|grow|shrink|list|whitespace|break|line|align|fill|stroke|scale|rotate|translate|origin|divide|from|via|to|backdrop|blur|touch|scroll|snap|will|float|clear|box|decoration|indent|not|d|g|fs|fw|lh|bg|btn)-[\w.%-]+$/.test(name);

/** Attributes that say what state an element is in, or that a library puts there for itself: they come and go. */
const passing = (name: string): boolean =>
  /^data-(state|active|open|closed|pressed|disabled|selected|checked|highlighted|focus|focused|focus-visible|hover|hovered|dragging|loading|busy|expanded|collapsed|visible|hidden|invalid|valid|dirty|touched|placeholder|orientation|side|align|size|variant|density|theme|mode|index|key|id|value|status|popup-open|starting-style|ending-style|instant|nested|swiping)$/.test(name) ||
  /^data-(pe|radix|base-ui|headlessui|reach|rac|floating-ui|state|astro|inspector|sentry|v|react|reactid|n|sveltekit|svelte|hk|testid|test|cy|qa|slot|sidebar|component|part|section)(-|$)/.test(name) ||
  /-(state|open|active|index|order|count|maximized|collapsed|expanded|animations?|motion|away)$/.test(name);

const quoted = (value: string) => value.replace(/["\\]/g, '\\$&');

/** What the element is called, if its authors gave it a name: a test id, a slot, a data attribute of its own, a label. */
function nameOf(el: Element): string[] {
  const tag = el.localName;
  const out: string[] = [];
  const valued = (name: string) => {
    const value = el.getAttribute(name);
    if (value && value.length < 60 && !madeUp(value)) out.push(`${tag}[${name}="${quoted(value)}"]`, `[${name}="${quoted(value)}"]`);
  };
  for (const name of ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name']) valued(name);
  // A data attribute that the authors gave only to this kind of element: [data-chat-header].
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-') || passing(attr.name)) continue;
    if (attr.value === '' || attr.value === 'true') out.push(`[${attr.name}]`);
    else if (attr.value.length < 40 && !madeUp(attr.value) && !/^(false|\d+(\.\d+)?)$/.test(attr.value)) out.push(`[${attr.name}="${quoted(attr.value)}"]`);
  }
  for (const name of ['data-slot', 'data-sidebar', 'data-component', 'data-part', 'data-section', 'aria-label', 'role']) valued(name);
  return out;
}

/** Classes that name the element, as selector parts: ".card", or the stable stem of a CSS-module class. */
const classParts = (el: Element): string[] => {
  const classes = Array.from(el.classList).filter((c) => !utility(c));
  if (classes.length === 0 || classes.length > 4) return [];
  return classes.flatMap((c) => {
    const stem = moduleStem(c);
    if (stem) return [`[class*="${stem}"]`];
    return madeUp(c) ? [] : [`.${esc(c)}`];
  });
};

/** A selector of the element's own that finds only it on the whole page, or null. */
function ownSelector(el: Element): string | null {
  const tag = el.localName;
  if (el === document.body || el === document.documentElement) return tag;
  if (el.id && !madeUp(el.id) && only(`#${esc(el.id)}`, el)) return `#${esc(el.id)}`;
  for (const name of nameOf(el)) if (only(name, el)) return name;
  const parts = classParts(el);
  for (const part of parts) if (only(part, el)) return part;
  if (parts.length > 1 && only(parts.join(''), el)) return parts.join('');
  for (const part of parts) if (only(`${tag}${part}`, el)) return `${tag}${part}`;
  return only(tag, el) ? tag : null;
}

/** A short selector that finds exactly this element, built from what is least likely to change. */
function selectorFor(el: Element): string {
  const own = ownSelector(el);
  if (own) return own;
  // From the nearest part of the page that has a selector of its own.
  const chain: Element[] = [el];
  let base = 'body';
  for (let up = el.parentElement; up; up = up.parentElement) {
    const found = ownSelector(up);
    if (found) {
      base = found;
      break;
    }
    chain.unshift(up);
  }
  const tag = el.localName;
  // Something of the element that is the only one inside that part, however deep it sits.
  for (const part of [...nameOf(el), ...classParts(el).map((c) => `${tag}${c}`), tag]) if (only(`${base} ${part}`, el)) return `${base} ${part}`;
  const step = (node: Element): string => {
    const parent = node.parentElement!;
    const alone = (part: string) => {
      try {
        return parent.querySelectorAll(`:scope > ${part}`).length === 1;
      } catch {
        return false;
      }
    };
    const t = node.localName;
    const named = [...nameOf(node), ...classParts(node).map((c) => `${t}${c}`)].find(alone);
    if (named) return named;
    const same = Array.from(parent.children).filter((c) => c.localName === t);
    return same.length === 1 ? t : `${t}:nth-of-type(${same.indexOf(node) + 1})`;
  };
  // The shortest tail of the path that still finds only this element.
  const steps = chain.map(step);
  for (let from = steps.length - 1; from >= 0; from--) {
    const tail = steps.slice(from).join(' > ');
    const selector = from === 0 ? `${base} > ${tail}` : `${base} ${tail}`;
    if (only(selector, el)) return selector;
  }
  return `${base} > ${steps.join(' > ')}`;
}

const say = (el: Element, max = 60): string => {
  const label = el.getAttribute('aria-label');
  const heading = /^h[1-6]$/.test(el.localName) ? el : el.querySelector('h1,h2,h3,h4,legend,caption');
  const text = (label || heading?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export interface Seen {
  selector: string;
  /** How many elements the selector that was asked for matches. */
  count: number;
  tag: string;
  text: string;
  /** In page pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  owner: Owner | null;
}

const see = (el: Element, selector: string, count: number, depth: number): Seen => {
  const box = boxOf(el);
  return {
    selector,
    count,
    tag: el.localName,
    text: say(el),
    x: Math.round((box?.x ?? 0) + window.scrollX),
    y: Math.round((box?.y ?? 0) + window.scrollY),
    w: Math.round(box?.w ?? 0),
    h: Math.round(box?.h ?? 0),
    depth,
    owner: ownerOf(el),
  };
};

/**
 * Astro writes the source of every element into the markup it serves, and its development toolbar
 * takes that out of the page again as soon as it has loaded. The markup as it was served still
 * has it: the same selector is looked up there.
 */
let servedCopy: Promise<Document | null> | null = null;
const served = (): Promise<Document | null> =>
  (servedCopy ??= (async () => {
    const astro = '__astro_dev_toolbar__' in window || document.querySelector('astro-island, astro-dev-toolbar, meta[name="generator"][content^="Astro"]') !== null;
    if (!astro) return null;
    try {
      const res = await fetch(location.href, { credentials: 'same-origin' });
      return res.ok ? new DOMParser().parseFromString(await res.text(), 'text/html') : null;
    } catch {
      return null;
    }
  })());

/** Fill in the owners the live page could not name from the markup as it was served. */
async function fromServed<T extends { selector: string; count: number; owner?: Owner | null }>(list: T[]): Promise<T[]> {
  if (!list.some((item) => item.count > 0 && !item.owner)) return list;
  const copy = await served();
  if (!copy) return list;
  for (const item of list) {
    if (item.count === 0 || item.owner) continue;
    try {
      const el = copy.querySelector(item.selector);
      if (el) item.owner = ownerOf(el);
    } catch {
      /* the selector does not apply to the served markup */
    }
  }
  return list;
}

const CONTROLS = 'button,a[href],input:not([type="hidden"]),select,textarea,[role="button"],[role="tab"],[role="menuitem"],[role="switch"],[role="checkbox"],[role="radio"],[role="combobox"],[contenteditable="true"]';
const LAYERS = 'dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"],[role="menu"],[role="listbox"],[popover]:popover-open';
const PARTS = 'header,nav,main,section,article,aside,footer,form,dialog,table,fieldset,[role="dialog"],[role="region"],[role="banner"],[role="navigation"],[role="main"],[role="contentinfo"],[role="tablist"],[role="tabpanel"],h1';

let keeper: Keeper | null = null;
/** Scripts of level-4 patches that the caller has been handed already. */
const handed = new Set<string>();
const keep = (): Keeper =>
  (keeper ??= createKeeper({
    doc: document,
    ready: createReadiness(document),
    addCss: (css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      return () => (document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet));
    },
  }));

/** The style sheet of "still", so that it can be set aside while what moves is read. */
let stillSheet: { disabled: boolean } | null = null;

const probe = {
  /** Stop every transition and animation, so that a measurement never catches one halfway. */
  still(): void {
    const css = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important;caret-color:transparent!important}';
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      stillSheet = sheet;
    } catch {
      const style = document.createElement('style');
      style.textContent = css;
      document.documentElement.append(style);
      stillSheet = style;
    }
  },

  /**
   * What is declared to move in each area. Read with the page's own styles in force for a moment;
   * nothing is waited for, so nothing gets to move.
   */
  motion(areas: ProbeArea[]): Record<string, MotionSign[]> {
    const out: Record<string, MotionSign[]> = {};
    if (stillSheet) stillSheet.disabled = true;
    try {
      for (const area of areas) {
        const el = locate(area);
        if (el) out[area.id] = measureMotion(el);
      }
    } finally {
      if (stillSheet) stillSheet.disabled = false;
    }
    return out;
  },

  /** Wait until fonts are in and the page has had time to react (observers, late renders). */
  async settle(ms = 150): Promise<void> {
    try {
      await document.fonts.ready;
    } catch {
      /* no font loading API */
    }
    await frame();
    await frame();
    await sleep(ms);
  },

  /** Wait until the page has stopped changing by itself: data that arrives after it opens, a late render. */
  async quiet(ms = 500, max = 4000): Promise<void> {
    let last = Date.now();
    const observer = new MutationObserver(() => (last = Date.now()));
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    const until = Date.now() + max;
    while (Date.now() < until && Date.now() - last < ms) await sleep(50);
    observer.disconnect();
  },

  /** Mockups: form values of a cut, set without events. */
  fill(values: Record<string, string | boolean>): void {
    for (const [selector, value] of Object.entries(values)) {
      let found: Element[] = [];
      try {
        found = Array.from(document.querySelectorAll(selector));
      } catch {
        continue;
      }
      for (const el of found) {
        if (typeof value === 'boolean') (el as HTMLInputElement).checked = value;
        else (el as HTMLInputElement).value = value;
      }
    }
  },

  play: (steps: Step[]) => play(document, steps),

  /** Does the page look like a sign-in screen rather than the page that was asked for? */
  signinWall: () => signinWall(document),

  /** Go to the scroll position of a cut. Mockups also get the attribute their styles read. */
  show(at: string | null, mockup: boolean): void {
    const target = at ? query(document, at) : null;
    if (target) reveal(target);
    else window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    if (mockup) document.documentElement.setAttribute('data-pe-scroll', window.scrollY > 4 ? 'scrolled' : 'top');
  },

  /**
   * Lay patches over the page and keep them there while the page redraws itself, as the stage
   * agent does. Returns the scripts of level-4 patches for the caller to run, once each, and the
   * areas whose patch could not be laid.
   */
  async apply(list: ProbePatch[]): Promise<{ scripts: Array<{ area: string; anchor: string; code: string }>; pending: string[] }> {
    const k = keep();
    await k.want(list.map((item) => ({ key: item.area, option: '', anchor: item.anchor, patch: item.patch, page: item.page })));
    await k.settled(6000);
    const pending = k.problems().map((p) => p.key);
    const scripts: Array<{ area: string; anchor: string; code: string }> = [];
    for (const item of list) {
      if (pending.includes(item.area) || handed.has(item.area)) continue;
      handed.add(item.area);
      for (const op of item.patch) if (isScript(op)) scripts.push({ area: item.area, anchor: item.anchor, code: op.script });
    }
    return { scripts, pending };
  },

  /** Wait until a page that a server rendered has been taken over by its framework: patches before that would be thrown away. */
  async ready(ms = 6000): Promise<void> {
    const isReady = createReadiness(document);
    const until = Date.now() + ms;
    while (Date.now() < until && !isReady(document.body ?? document.documentElement)) await sleep(60);
  },

  frameworks: () => frameworksOf(document),

  /** What kind of page this is, what moves on it today, and the moments where something changes. */
  profile: () => profilePage(document, { selectorFor, say }),

  /** What each selector finds: how many elements, and the first one that has a size. */
  describe(selectors: string[]): Promise<Array<Seen | { selector: string; count: 0; error?: string }>> {
    return fromServed(selectors.map((selector) => {
      let found: Element[];
      try {
        found = Array.from(document.querySelectorAll(selector));
      } catch {
        return { selector, count: 0 as const, error: 'not a valid selector' };
      }
      const el = found.find((e) => boxOf(e)) ?? found[0];
      return el ? see(el, selector, found.length, 0) : { selector, count: 0 as const };
    }));
  },

  /** The components that draw what is inside an element: an area may be a list whose rows are the component to change. */
  drawnInside(selector: string, limit = 400): string[] {
    const root = query(document, selector);
    const names = new Set<string>();
    if (!root) return [];
    for (const el of Array.from(root.querySelectorAll('*')).slice(0, limit)) for (const name of ownerOf(el)?.components.slice(0, 3) ?? []) names.add(name);
    return [...names];
  },

  /**
   * A map of the page: its larger parts and the parts its authors named, each with a selector that
   * finds it and the component that draws it. With `within`, a closer map of that part alone, down
   * to its controls.
   */
  async outline(max = 60, within: string | null = null): Promise<Seen[]> {
    if (!within) {
      // What lies over the page (a dialog, a menu, a popover) is what a person looks at: it comes first, in detail.
      const layers = Array.from(document.querySelectorAll(LAYERS)).filter((el) => boxOf(el) && !el.closest('pe-overlay'));
      const top = layers.filter((el) => !layers.some((other) => other !== el && other.contains(el))).pop();
      if (top) {
        const over = await this.outline(Math.round(max * 0.75), selectorFor(top));
        const under = (await this.outlinePage(max - over.length)).filter((seen) => !over.some((o) => o.selector === seen.selector));
        return [...over, ...under];
      }
    }
    return this.outlinePage(max, within);
  },

  outlinePage(max: number, within: string | null = null): Promise<Seen[]> {
    const scope = within ? query(document, within) : null;
    if (within && !scope) return Promise.resolve([]);
    const inScope = (el: Element) => !scope || (scope.contains(el) && el !== scope);
    const whole = scope ? boxOf(scope) : null;
    const area = Math.max(1, whole ? whole.w * whole.h : window.innerWidth * Math.max(window.innerHeight, document.documentElement.scrollHeight));
    const share = (el: Element) => {
      const box = boxOf(el);
      return box ? (box.w * box.h) / area : 0;
    };
    const picked = new Set<Element>(Array.from((scope ?? document).querySelectorAll(PARTS)).filter(inScope));
    // Parts that the authors named are parts they think in: [data-slot="sidebar"], [data-testid="save"].
    for (const el of Array.from((scope ?? document).querySelectorAll('*'))) {
      if (!inScope(el) || el === document.documentElement || el === document.body || el.closest('svg') || share(el) < (scope ? 0.004 : 0.006)) continue;
      const named = nameOf(el).filter((n) => !/\[(role|aria-label)=/.test(n) || scope);
      if (named.length > 0) picked.add(el);
    }
    if (scope) {
      for (const el of Array.from(scope.querySelectorAll(CONTROLS))) if (boxOf(el)) picked.add(el);
    }
    // A page of plain boxes has no such parts: take the larger boxes of its first levels instead.
    const roots = scope ? [scope] : [document.querySelector('main'), document.querySelector('#root,#app,#__next,#__nuxt,#svelte,[data-reactroot]'), document.body].filter((r): r is Element => Boolean(r));
    const walk = (el: Element, level: number) => {
      for (const child of Array.from(el.children)) {
        if (/^(script|style|link|template|noscript|pe-overlay|svg)$/.test(child.localName)) continue;
        if (!boxOf(child)) continue;
        if (share(child) > 0.04 && (child.id || child.classList.length > 0)) picked.add(child);
        if (level < (scope ? 4 : 2)) walk(child, level + 1);
      }
    };
    for (const root of roots) walk(root, 0);
    // A box that only wraps one picked box of the same size says nothing more than that one.
    for (const el of Array.from(picked)) {
      const inner = Array.from(el.children).filter((c) => picked.has(c));
      if (inner.length === 1 && !el.matches(PARTS) && share(inner[0]!) > share(el) * 0.97) picked.delete(el);
    }
    const out: Seen[] = [];
    if (scope) out.push(see(scope, within!, 1, 0));
    for (const el of Array.from((scope ?? document).querySelectorAll('*'))) {
      if (!picked.has(el) || !boxOf(el) || el.closest('pe-overlay')) continue;
      let depth = scope ? 1 : 0;
      for (let p = el.parentElement; p && p !== scope; p = p.parentElement) if (picked.has(p)) depth++;
      out.push(see(el, selectorFor(el), 1, depth));
      if (out.length >= max) break;
    }
    return fromServed(out);
  },

  /** For each patch, the selectors that find nothing on the page as it is now. */
  missing(list: ProbePatch[]): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const item of list) {
      const anchor = query(document, item.anchor);
      out[item.area] = anchor ? missingTargets(item.patch, { doc: document, anchor, page: item.page, addCss: () => () => {} }) : [item.anchor];
    }
    return out;
  },

  /** `live`: the areas are parts of a running page, on which times move on by themselves. */
  measure(areas: ProbeArea[], live = false): { scrollY: number; pageHeight: number; areas: AreaMeasure[] } {
    const out: AreaMeasure[] = [];
    const r = (n: number) => Math.round(n * 2) / 2;
    for (const area of areas) {
      const el = locate(area);
      if (!el) {
        out.push({ id: area.id, found: false, x: 0, y: 0, w: 0, h: 0, elements: [] });
        continue;
      }
      const m = measureArea(el, live);
      out.push({ id: area.id, found: true, x: r(m.x + window.scrollX), y: r(m.y + window.scrollY), w: r(m.w), h: r(m.h), elements: m.elements });
    }
    // The space between areas is part of the design. It is read where nothing is stuck to the screen: at the top of the page.
    if (window.scrollY < 1) {
      for (const area of out) {
        if (!area.found) continue;
        const higher = out.filter((o) => o.found && o !== area && o.y + o.h <= area.y + 1).map((o) => o.y + o.h);
        area.above = r(area.y - (higher.length ? Math.max(...higher) : 0));
      }
    }
    return { scrollY: window.scrollY, pageHeight: document.documentElement.scrollHeight, areas: out };
  },

  /**
   * Bring an area on screen and say which part of the page its visible content covers, for a
   * picture of it. The browser takes a clip in page coordinates, not screen coordinates.
   */
  frameArea(area: ProbeArea): { x: number; y: number; width: number; height: number } | null {
    const el = locate(area);
    if (!el) return null;
    reveal(el);
    const box = measureArea(el);
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const width = Math.min(window.innerWidth, Math.ceil(box.x + box.w)) - x;
    const height = Math.min(window.innerHeight, Math.ceil(box.y + box.h)) - y;
    return width > 1 && height > 1 ? { x: x + window.scrollX, y: y + window.scrollY, width, height } : null;
  },
};

export type Probe = typeof probe;
(globalThis as unknown as { __peProbe: Probe }).__peProbe = probe;
