import { asReduced } from '../core/motion.js';
import { isScript } from '../core/patch.js';
import { boxOf, coverAt, pace, play, query, replay, reveal, visible, signinWall } from './dom.js';
import { createReadiness } from './framework.js';
import { createKeeper, type Kept } from './keeper.js';
import { BOX_STYLE, DOT_STYLE, dotPoint, type AgentArea, type AgentCut, type AgentLook, type AgentOption, type AreaFrame, type Frame, type FromAgent, type Problem, type StageConfig, type ToAgent } from './protocol.js';

/**
 * The stage agent: the one script picky-eater adds to the user's app while it is being reviewed.
 *
 * It applies and undoes patches, draws the dots, and tells the review page where things are. It
 * takes orders only from the review page (by origin) and never decides anything: choosing and
 * approving happen in the review page, which this script cannot reach.
 */

declare const __PE_STAGE__: StageConfig;

function blockServiceWorkers(): void {
  try {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    // A caching worker could serve pages that never pass the stage listener.
    void sw.getRegistrations().then((list) => list.forEach((r) => void r.unregister()));
    Object.defineProperty(sw, 'register', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Service workers are switched off in the picky-eater preview.', 'SecurityError')),
    });
  } catch {
    /* no service workers here */
  }
}

function main(cfg: StageConfig): void {
  if (cfg.mode === 'proxy' && cfg.serviceWorker === 'block') blockServiceWorkers();
  if (window.parent === window) return; // opened on its own: nothing to do

  const nonce = (document.currentScript as HTMLScriptElement | null)?.nonce ?? '';
  const review = window.parent;
  let reviewOrigin: string | null = null;
  let epoch = 0;
  let revision = 0;
  let areas: AgentArea[] = [];
  let cuts: AgentCut[] = [];
  let look: AgentLook = { choices: {}, preview: null, state: '', active: [] };
  let dotsOn = true;
  let hot: string | null = null;
  /** The option whose patch is on the page, per area. */
  const applied = new Map<string, AgentOption>();
  /** Looks, snapshots and steps run one after the other. */
  let chain: Promise<void> = Promise.resolve();

  // Before the review page has spoken, its origin is one of the allowed ones; where the browser says which, use that.
  const framedBy = Array.from(location.ancestorOrigins ?? []).find((o) => cfg.origins.includes(o));
  const send = (msg: FromAgent) => {
    for (const origin of reviewOrigin ? [reviewOrigin] : framedBy ? [framedBy] : cfg.origins) review.postMessage({ pe: 1, epoch, ...msg }, origin);
  };

  // --- reading the page ------------------------------------------------------------------------

  const q = (selector: string | undefined, root: ParentNode = document) => query(document, selector, root);
  const stateOf = (cutId: string) => cuts.find((c) => c.id === cutId)?.sameAs ?? cutId;
  const jump = (x: number, y: number) => window.scrollTo({ left: x, top: y, behavior: 'instant' });

  // --- patches ---------------------------------------------------------------------------------

  /** How the review wants motion shown. Patches are written again when this changes. */
  const motion = { slow: false, reduced: false };
  /** Every style sheet a patch has on the page, with its text as it was written. */
  const sheets = new Set<{ css: string; write: (css: string) => void }>();

  const addCss = (css: string): (() => void) => {
    let entry: { css: string; write: (css: string) => void };
    let remove: () => void;
    try {
      // A constructed stylesheet is not subject to the app's Content-Security-Policy.
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(asReduced(css, motion.reduced));
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      entry = { css, write: (text) => sheet.replaceSync(text) };
      remove = () => (document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet));
    } catch {
      const style = document.createElement('style');
      style.setAttribute('data-pe-patch', '');
      if (nonce) style.nonce = nonce;
      style.textContent = asReduced(css, motion.reduced);
      (document.head ?? document.documentElement).append(style);
      entry = { css, write: (text) => (style.textContent = text) };
      remove = () => style.remove();
    }
    sheets.add(entry);
    return () => {
      sheets.delete(entry);
      remove();
    };
  };

  const waiting = new Map<string, { item: Kept; self: object; done: (error: string | null) => void }>();
  let scriptSeq = 0;
  Object.defineProperty(window, '__peRun', {
    configurable: true,
    value: (key: unknown, fn: unknown) => {
      const entry = typeof key === 'string' ? waiting.get(key) : undefined;
      if (!entry || typeof fn !== 'function') return;
      waiting.delete(key as string);
      let error: string | null = null;
      try {
        (fn as (this: object, area: Element | null, doc: Document) => void).call(entry.self, q(entry.item.anchor), document);
      } catch (err) {
        error = String((err as Error)?.message ?? err);
      }
      entry.done(error);
    },
  });

  /** Level 4: the code is served by the stage listener as a script file, so the app's CSP need not allow eval. */
  const runScripts = async (item: Kept, self: object, kind: 'do' | 'undo'): Promise<string | null> => {
    const ops = item.patch.map((op, i) => [op, i] as const).filter(([op]) => isScript(op));
    for (const [, index] of kind === 'do' ? ops : [...ops].reverse()) {
      const error = await new Promise<string | null>((resolve) => {
        const key = `${epoch}.${++scriptSeq}`;
        const tag = document.createElement('script');
        const done = (e: string | null) => {
          clearTimeout(timer);
          waiting.delete(key);
          tag.remove();
          resolve(e);
        };
        const timer = window.setTimeout(() => done('the script did not run (blocked by the page, or too slow)'), 4000);
        waiting.set(key, { item, self, done });
        tag.src = `${cfg.base}/__pe/op.js?r=${revision}&a=${item.key}&o=${item.option}&i=${index}&k=${kind}&key=${key}`;
        if (nonce) tag.nonce = nonce;
        tag.onerror = () => done('the script could not be loaded');
        (document.head ?? document.documentElement).append(tag);
      });
      if (error) return error;
    }
    return null;
  };

  // Keeps the patches on the page while its framework redraws it, and out of the framework's way.
  const keeper = createKeeper({ doc: document, addCss, run: runScripts, ready: createReadiness(document) });

  const wanted = (next: AgentLook): Map<string, AgentOption> => {
    const want = new Map<string, AgentOption>();
    for (const area of areas) {
      if (!next.active.includes(area.id)) continue;
      const id = next.preview?.area === area.id ? next.preview.option : next.choices[area.id];
      const option = area.options.find((o) => o.id === id);
      if (option?.patch) want.set(area.id, option);
    }
    return want;
  };

  /** Bring the page in line with a look: undo what is no longer wanted, apply what is new. */
  const setLook = async (next: AgentLook, anchorId?: string): Promise<void> => {
    const want = wanted(next);
    const anchorArea = areas.find((a) => a.id === anchorId);
    const anchor = anchorArea ? q(anchorArea.anchor) : null;
    const before = anchor?.getBoundingClientRect().top;
    const items: Kept[] = [];
    for (const area of areas) {
      const option = want.get(area.id);
      if (option) items.push({ key: area.id, option: option.id, anchor: area.anchor, patch: option.patch ?? [], page: Boolean(option.page) });
    }
    await keeper.want(items);
    applied.clear();
    for (const [id, option] of want) applied.set(id, option);
    look = next;
    if (!anchorArea || !anchor?.isConnected || before === undefined) return;
    // The area stays where it is on screen even if something above it changed height.
    const after = anchor.getBoundingClientRect().top;
    if (Math.abs(after - before) > 0.5) window.scrollBy({ top: after - before, behavior: 'instant' });
    // A change nobody can see is no preview: bring the changed part into view.
    if (next.preview?.area !== anchorId) return;
    const focus = anchorArea.options.find((o) => o.id === next.preview!.option)?.focus;
    const target = (focus && (q(focus, anchor) ?? q(focus))) || anchor;
    const box = boxOf(target);
    if (box && (box.y > window.innerHeight - 80 || box.y + box.h < 80)) reveal(target);
  };

  // --- the overlay: dots and storyboard frames, drawn in the page so that they scroll with it ---

  const holder = document.createElement('pe-overlay');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText =
    'all:initial!important;position:absolute!important;top:0!important;left:0!important;width:0!important;height:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important';
  const shadow = holder.attachShadow({ mode: 'closed' });
  try {
    // Constructed, so that an app that forbids inline styles still gets its dots.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(DOT_STYLE + BOX_STYLE);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement('style');
    if (nonce) style.nonce = nonce;
    style.textContent = DOT_STYLE + BOX_STYLE;
    shadow.append(style);
  }
  const dotEls = new Map<string, HTMLElement>();
  const boxEls = new Map<string, HTMLElement>();
  const resting = new Map<string, number>();
  let covered = new Set<string>();
  let coverKey = '';

  const detectState = (): string => {
    let found = cuts[0]?.id ?? '';
    for (const cut of cuts) if (!cut.sameAs && cut.seen && visible(q(cut.seen))) found = cut.id;
    return found;
  };
  const spy = (): string => {
    let current = look.state;
    for (const cut of cuts) {
      if (stateOf(cut.id) !== look.state || !cut.at) continue;
      const target = q(cut.at);
      if (target && target.getBoundingClientRect().top <= 120) current = cut.id;
    }
    return current;
  };

  let lastFrame = '';
  let wall = { at: -1e9, is: false };
  const tick = () => {
    requestAnimationFrame(tick);
    if (motion.slow) pace(document, 0.25); // also what started since the last frame
    if (epoch === 0) return;
    if (!holder.isConnected) document.documentElement.append(holder);
    const sx = window.scrollX;
    const sy = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out: AreaFrame[] = [];
    const problems: Problem[] = [];
    const placed: Array<{ id: string; el: Element; x: number; y: number }> = [];
    for (const area of areas) {
      if (!look.active.includes(area.id)) continue;
      const inCut = !area.cuts || area.cuts.includes(look.state);
      // The option in place may hide the element it replaces, or move it out of reach of its selector:
      // the part the option points at stands for the area then.
      const part = q(applied.get(area.id)?.focus);
      let el = q(area.anchor) ?? part;
      if (!el) {
        // An area of another cut is simply not on the page right now.
        if (inCut) problems.push({ area: area.id, option: null, code: 'ANCHOR_MISSING', detail: area.anchor });
        continue;
      }
      let box = boxOf(el);
      if (!box) {
        box = part && boxOf(part);
        if (!part || !box) continue;
        el = part;
      }
      const state = look.preview?.area === area.id ? 'preview' : look.choices[area.id] !== undefined ? 'chosen' : 'sketch';
      const point = dotPoint(box, vw);
      // Dots of areas that share a corner sit side by side.
      while (placed.some((p) => Math.abs(p.x - point.x) < 26 && Math.abs(p.y - point.y) < 26)) point.x -= 30;
      let rest: number | undefined;
      if (getComputedStyle(el).position === 'sticky') {
        if (sy < 1) resting.set(area.id, box.y);
        rest = resting.get(area.id);
      }
      if (inCut) placed.push({ id: area.id, el, x: point.x, y: point.y });
      out.push({ id: area.id, ...box, ...(rest === undefined ? {} : { rest }), dot: { x: point.x, y: point.y, on: false }, state });
    }
    const key = `${sy}|${vw}x${vh}|${document.documentElement.scrollHeight}|${out.map((a) => `${a.id}:${Math.round(a.x)},${Math.round(a.y)},${Math.round(a.w)},${Math.round(a.h)}`).join(';')}`;
    if (key !== coverKey) {
      coverKey = key;
      covered = new Set(placed.filter((p) => coverAt(p.el, p.x, p.y) !== null).map((p) => p.id));
    }

    const shown = new Set<string>();
    for (const a of out) {
      const p = placed.find((x) => x.id === a.id);
      a.dot.on = Boolean(p) && dotsOn && a.dot.x > 0 && a.dot.x < vw && a.dot.y > 0 && a.dot.y < vh && !covered.has(a.id);
      if (covered.has(a.id)) a.covered = true;
      if (!p || !dotsOn) continue;
      shown.add(a.id);
      let dot = dotEls.get(a.id);
      if (!dot) {
        dot = document.createElement('div');
        shadow.append(dot);
        dotEls.set(a.id, dot);
      }
      const cls = `dot ${a.state === 'chosen' ? 'done' : 'open'}${hot === a.id ? ' hot' : ''}`;
      if (dot.className !== cls) dot.className = cls;
      dot.style.display = a.dot.on ? '' : 'none';
      dot.style.transform = `translate(${a.dot.x + sx}px, ${a.dot.y + sy}px)`;

      // Only an area that is still open, or being tried out, is framed like a storyboard panel.
      let box = boxEls.get(a.id);
      if (!box) {
        box = document.createElement('div');
        shadow.prepend(box);
        boxEls.set(a.id, box);
      }
      const boxCls = `box ${a.state}`;
      if (box.className !== boxCls) box.className = boxCls;
      box.style.display = a.state === 'chosen' ? 'none' : '';
      box.style.transform = `translate(${a.x + sx}px, ${a.y + sy}px)`;
      box.style.width = `${a.w}px`;
      box.style.height = `${a.h}px`;
    }
    for (const map of [dotEls, boxEls]) {
      for (const [id, el] of map) {
        if (shown.has(id)) continue;
        el.remove();
        map.delete(id);
      }
    }

    for (const p of keeper.problems()) {
      // Elements of another cut are expected to be missing until that cut is reached.
      const area = areas.find((a) => a.id === p.key);
      const inCut = !area?.cuts || area.cuts.includes(look.state);
      if ((inCut || !p.code.endsWith('_MISSING')) && !problems.some((x) => x.area === p.key)) problems.push({ area: p.key, option: p.option, code: p.code, detail: p.detail });
    }
    // A page that shows none of its areas may be the sign-in screen in front of it. Looked at now and then, not every frame.
    if (out.length > 0 || !problems.some((p) => p.code === 'ANCHOR_MISSING')) wall = { at: -1e9, is: false };
    else if (performance.now() - wall.at > 700) wall = { at: performance.now(), is: signinWall(document) };
    const frame: Frame = { sx, sy, vw, vh, ph: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0), state: detectState(), spy: spy(), areas: out, problems, ...(wall.is ? { wall: true } : {}), at: location.pathname + location.search };
    const text = JSON.stringify(frame);
    if (text === lastFrame) return;
    lastFrame = text;
    send({ type: 'frame', ...frame });
  };

  // --- snapshots: the page as inert markup, for thumbnails --------------------------------------

  const absolute = (ref: string, base: string): string => {
    try {
      return new URL(ref, base).href;
    } catch {
      return '';
    }
  };
  const cssUrls = (css: string, base: string) =>
    css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (_, a?: string, b?: string, c?: string) => {
      const ref = (a ?? b ?? c ?? '').trim();
      return ref.startsWith('data:') || ref.startsWith('#') ? `url("${ref}")` : `url("${absolute(ref, base)}")`;
    });
  const sheetText = (s: CSSStyleSheet, depth = 0): string => {
    let rules: CSSRule[];
    try {
      rules = Array.from(s.cssRules);
    } catch {
      return ''; // a stylesheet from another origin cannot be read
    }
    const base = s.href ?? document.baseURI;
    const text = rules
      .map((rule) => {
        if (rule instanceof CSSImportRule) return depth < 4 && rule.styleSheet ? sheetText(rule.styleSheet, depth + 1) : '';
        return cssUrls(rule.cssText, base);
      })
      .join('\n');
    const media = s.media.mediaText;
    return media && media !== 'all' ? `@media ${media}{${text}}` : text;
  };

  const snapshot = (): string => {
    const root = document.documentElement.cloneNode(true) as HTMLElement;
    // Walk the live page and its copy side by side: what the person typed and where sticky parts are is not in the markup.
    const live = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
    const copy = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let a = live.currentNode as Element | null, b = copy.currentNode as Element | null; a && b; a = live.nextNode() as Element | null, b = copy.nextNode() as Element | null) {
      if (a instanceof HTMLInputElement) {
        if (a.type === 'checkbox' || a.type === 'radio') b.toggleAttribute('checked', a.checked);
        else if (a.type !== 'password' && a.type !== 'file') b.setAttribute('value', a.value);
        else b.removeAttribute('value');
      } else if (a instanceof HTMLTextAreaElement) b.textContent = a.value;
      else if (a instanceof HTMLOptionElement) b.toggleAttribute('selected', a.selected);
      else if (a instanceof HTMLImageElement && (a.currentSrc || a.src)) b.setAttribute('src', a.currentSrc || a.src);
      const position = getComputedStyle(a).position;
      if (position === 'sticky' || position === 'fixed') b.setAttribute('data-pe-pos', position);
    }
    for (const el of Array.from(root.querySelectorAll('script,noscript,iframe,frame,object,embed,base,link,meta,style,template,source,pe-overlay'))) {
      if (el.localName === 'meta' && el.hasAttribute('charset')) continue;
      if (el.localName === 'meta' && el.getAttribute('name') === 'viewport') continue;
      el.remove();
    }
    for (const el of Array.from(root.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || name === 'srcset' || name === 'nonce' || name === 'loading' || name === 'srcdoc') el.removeAttribute(attr.name);
        else if (name === 'poster') el.setAttribute(attr.name, absolute(attr.value, document.baseURI));
        else if (name === 'style') el.setAttribute('style', cssUrls(attr.value, document.baseURI));
      }
    }
    const head = root.querySelector('head') ?? root.insertBefore(document.createElement('head'), root.firstChild);
    for (const s of [...Array.from(document.styleSheets), ...document.adoptedStyleSheets]) {
      const style = document.createElement('style');
      style.textContent = sheetText(s);
      head.append(style);
    }
    return `<!doctype html>\n${root.outerHTML}`;
  };

  /** The page without the patch of one area, so that each of its options can be drawn on top. */
  const snapshotWithout = (areaId?: string): string => keeper.without(areaId, snapshot);

  // --- orders from the review page -------------------------------------------------------------

  const handle = (msg: ToAgent) => {
    switch (msg.type) {
      case 'init':
        epoch = msg.epoch;
        revision = msg.revision;
        areas = msg.areas;
        cuts = msg.cuts;
        dotsOn = msg.dots;
        lastFrame = '';
        chain = chain.then(() => setLook(msg.look)).catch(() => {});
        return;
      case 'look':
        chain = chain
          .then(() => setLook(msg.look, msg.anchor))
          .then(
            () => send({ type: 'done', req: msg.req, ok: true }),
            (err: unknown) => send({ type: 'done', req: msg.req, ok: false, error: String((err as Error)?.message ?? err) }),
          );
        return;
      case 'dots':
        dotsOn = msg.on;
        hot = msg.hot;
        return;
      case 'scroll': {
        if (msg.by) window.scrollBy({ left: msg.by[0], top: msg.by[1], behavior: 'instant' });
        if (msg.to !== undefined) jump(window.scrollX, Math.max(0, msg.to));
        if (msg.reveal) {
          const el = q(msg.reveal);
          if (el) reveal(el);
        }
        const area = areas.find((a) => a.id === msg.area);
        const box = area && q(area.anchor) && boxOf(q(area.anchor)!);
        if (box) {
          // Bring an area on screen, with room above it for its options.
          const want = Math.min(240, window.innerHeight * 0.33);
          if (msg.always || box.y < 80 || box.y > window.innerHeight * 0.5) window.scrollBy({ top: box.y - want, behavior: 'instant' });
        }
        return;
      }
      case 'snapshot':
        chain = chain
          .then(() => {
            const html = snapshotWithout(msg.without);
            if (html.length > 4_000_000) send({ type: 'snapshot', req: msg.req, scrollY: window.scrollY, error: 'The page is too large to draw as a thumbnail.' });
            else send({ type: 'snapshot', req: msg.req, html, scrollY: window.scrollY });
          })
          .catch((err: unknown) => send({ type: 'snapshot', req: msg.req, scrollY: 0, error: String((err as Error)?.message ?? err) }));
        return;
      case 'motion':
        if (msg.reduced !== motion.reduced) {
          motion.reduced = msg.reduced;
          for (const sheet of sheets) sheet.write(asReduced(sheet.css, motion.reduced));
        }
        if (msg.slow !== motion.slow) {
          motion.slow = msg.slow;
          if (!motion.slow) pace(document, 1);
        }
        return;
      case 'replay': {
        const area = areas.find((a) => a.id === msg.area);
        const option = area ? applied.get(area.id) : undefined;
        // What appears is the part the option points at, or the area itself.
        const el = (option?.focus ? q(option.focus) : null) ?? (area ? q(area.anchor) : null);
        if (el instanceof HTMLElement) replay(el);
        return;
      }
      case 'steps':
        chain = chain
          .then(() => play(document, msg.steps))
          .then(
            () => send({ type: 'done', req: msg.req, ok: true }),
            (err: unknown) => send({ type: 'done', req: msg.req, ok: false, error: String((err as Error)?.message ?? err) }),
          );
        return;
    }
  };

  window.addEventListener('message', (e) => {
    if (e.source !== review || !cfg.origins.includes(e.origin)) return;
    const msg = e.data as ({ pe?: unknown } & ToAgent) | null;
    if (!msg || typeof msg !== 'object' || msg.pe !== 1 || typeof msg.type !== 'string') return;
    reviewOrigin = e.origin;
    handle(msg);
  });

  const start = () => {
    send({ type: 'ready', href: location.href });
    requestAnimationFrame(tick);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

main(__PE_STAGE__);
