import { stateOf } from '../core/graph.js';
import type { Viewport } from '../core/schema.js';
import { asReduced } from '../core/motion.js';
import { pace, replay } from '../stage/dom.js';
import { DOT_STYLE, dotPoint } from '../stage/protocol.js';
import { compose, serialize, syncSlots, type Look, type Pack } from './compose.js';
import { areaBox, coverAt, fill, findArea, reveal } from './geometry.js';
import { StageBase, type AreaBox, type MotionMode, type Placement, type StageDriver, type StageHandlers } from './stage-base.js';

export type { AreaBox, Placement, StageDriver, StageHandlers } from './stage-base.js';

/**
 * The page, in a script-less sandboxed frame at real screen size.
 *
 * WebKit does not deliver events from such a frame to listeners added from outside, so nothing
 * here listens inside it. Once per animation frame the stage reads the page (layout, scroll
 * position) and moves its own hit targets, which sit above the frame, over the dots and over
 * controls that lead to another cut. The dots themselves are drawn inside the page so that they
 * scroll with it.
 */
export class Stage extends StageBase implements StageDriver {
  private look: Look = { choices: {}, state: '' };
  private overlay: ShadowRoot | null = null;
  private readonly dots = new Map<string, HTMLElement>();
  private zones: Array<{ target: Element; el: HTMLDivElement }> = [];
  private zonesStale = true;
  private covered = new Set<string>();
  private coverKey = '';
  private layoutKey = '';
  private lastScroll = -1;
  private pinned: { cut: string; y: number } | null = null;
  private seen = '';
  private raf = 0;
  /** Where sticky areas sit when the page is at the top. */
  private readonly resting = new Map<string, number>();
  private loading: Promise<void> = Promise.resolve();
  /** Dots are hidden once the page is approved. */
  dotsOn = true;
  /** The area whose options are open. */
  hot: string | null = null;
  private mode: MotionMode = { slow: false, reduced: false };
  /** The style sheets of the mockup as they were written, while they are shown in their reduced form. */
  private readonly written = new WeakMap<HTMLStyleElement, string>();

  setMotion(mode: MotionMode): void {
    const was = this.mode;
    this.mode = { ...mode };
    if (was.reduced !== mode.reduced) this.showReduced();
    if (was.slow && !mode.slow && this.doc) pace(this.doc, 1);
  }

  /** Write the mockup's style sheets as people who asked for less motion get them, or as they were. */
  private showReduced(): void {
    const doc = this.doc;
    if (!doc) return;
    for (const style of Array.from(doc.querySelectorAll('style'))) {
      const original = this.written.get(style) ?? style.textContent ?? '';
      if (!this.written.has(style)) this.written.set(style, original);
      const next = asReduced(original, this.mode.reduced);
      if (style.textContent !== next) style.textContent = next;
    }
  }

  replay(area: string): void {
    const el = this.doc ? findArea(this.doc, area) : null;
    if (el && 'style' in el) replay(el as HTMLElement);
  }

  constructor(host: HTMLElement, on: StageHandlers) {
    super(host, on, 'allow-same-origin');
    const loop = () => {
      this.tick();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  protected wheel(dx: number, dy: number): void {
    this.win?.scrollBy(dx, dy);
  }

  private get doc(): Document | null {
    const doc = this.iframe.contentDocument;
    return doc && doc.body ? doc : null;
  }
  private get win(): Window | null {
    return this.iframe.contentWindow;
  }

  /** Show a revision from scratch. */
  load(pack: Pack, viewport: Viewport, look: Look): Promise<void> {
    this.pack = pack;
    this.viewport = viewport;
    this.look = look;
    this.fit();
    const html = serialize(compose(pack, look));
    this.loading = new Promise<void>((resolve) => {
      this.iframe.addEventListener(
        'load',
        () => {
          const doc = this.doc;
          if (doc) {
            doc.documentElement.style.scrollBehavior = 'auto';
            const holder = doc.createElement('div');
            holder.setAttribute('data-pe-overlay', '');
            holder.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none';
            doc.documentElement.append(holder);
            this.overlay = holder.attachShadow({ mode: 'open' });
            const style = doc.createElement('style');
            style.textContent = DOT_STYLE;
            this.overlay.append(style);
          }
          this.dots.clear();
          this.resting.clear();
          this.dropHits();
          this.zonesStale = true;
          this.layoutKey = '';
          this.coverKey = '';
          this.pinned = null;
          this.seen = '';
          if (this.mode.reduced) this.showReduced();
          resolve();
        },
        { once: true },
      );
      this.iframe.srcdoc = html;
    });
    return this.loading;
  }

  /**
   * Change what the page shows without reloading it. With `anchor`, that area stays where it is
   * on screen even if content above it changes height.
   */
  async update(look: Look, anchor?: string): Promise<void> {
    await this.loading;
    const doc = this.doc;
    const win = this.win;
    if (!this.pack || !this.viewport || !doc || !win) return;
    const stateChanged = look.state !== this.look.state;
    this.look = look;
    const anchorEl = anchor ? findArea(doc, anchor) : null;
    const before = anchorEl ? areaBox(anchorEl)?.y : undefined;
    if (!syncSlots(doc, compose(this.pack, look), doc)) {
      const y = win.scrollY;
      await this.load(this.pack, this.viewport, look);
      this.win?.scrollTo(0, y);
      return;
    }
    if (stateChanged) doc.documentElement.setAttribute('data-pe-cut', look.state);
    if (this.mode.reduced) this.showReduced(); // an option may have brought a style sheet of its own
    this.zonesStale = true;
    if (anchorEl && before !== undefined) {
      const after = areaBox(anchorEl)?.y;
      if (after !== undefined && Math.abs(after - before) > 0.5) win.scrollBy(0, after - before);
      // A change nobody can see is no preview: bring the changed part into view.
      const option = look.preview?.area === anchor ? this.pack.board.areas.find((a) => a.id === anchor)?.options.find((o) => o.id === look.preview!.option) : null;
      let target: Element | null = anchorEl;
      if (option?.focus) {
        try {
          target = anchorEl.querySelector(option.focus) ?? anchorEl;
        } catch {
          target = anchorEl;
        }
      }
      const box = areaBox(target);
      if (box && (box.y > win.innerHeight - 80 || box.y + box.h < 80)) reveal(win, target);
    }
  }

  /** Move to a cut chosen in the strip: its page state, its form values and its scroll position. */
  async showCut(cutId: string, look: Look): Promise<void> {
    const cut = this.pack?.board.cuts.find((c) => c.id === cutId);
    if (!cut) return;
    await this.update(look);
    const doc = this.doc;
    const win = this.win;
    if (!doc || !win) return;
    for (const form of Array.from(doc.querySelectorAll('form'))) form.reset();
    const state = this.pack!.board.cuts.find((c) => c.id === stateOf(this.pack!.board, cutId));
    fill(doc, state?.fill);
    if (cut.at) {
      let target: Element | null = null;
      try {
        target = doc.querySelector(cut.at);
      } catch {
        target = null;
      }
      if (target) reveal(win, target);
    } else if (this.pack!.board.cuts[0]?.id === cutId) {
      win.scrollTo(0, 0);
    }
    this.pinned = { cut: cutId, y: win.scrollY };
    this.seen = cutId;
  }

  /** Bring an area on screen, with room above it for its options. */
  scrollToArea(id: string, always = false): void {
    const doc = this.doc;
    const win = this.win;
    const el = doc && findArea(doc, id);
    const box = el && areaBox(el);
    if (!box || !win) return;
    const wanted = Math.min(240, win.innerHeight * 0.33);
    if (always || box.y < 80 || box.y > win.innerHeight * 0.5) win.scrollBy(0, box.y - wanted);
  }

  scrollToPage(y: number): void {
    this.win?.scrollTo(0, Math.max(0, y));
  }

  /** Size of the page and of the visible part, in page pixels. */
  metrics(): { width: number; height: number; viewHeight: number; scrollY: number } | null {
    const doc = this.doc;
    const win = this.win;
    if (!doc || !win) return null;
    return { width: win.innerWidth, height: Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight), viewHeight: win.innerHeight, scrollY: win.scrollY };
  }

  /** Every area that is on the page right now. */
  boxes(): AreaBox[] {
    const doc = this.doc;
    const win = this.win;
    if (!doc || !win || !this.pack) return [];
    const out: AreaBox[] = [];
    for (const area of this.pack.board.areas) {
      const el = findArea(doc, area.id);
      const box = el && areaBox(el);
      if (!el || !box) continue;
      let y = box.y + win.scrollY;
      // A sticky area travels with the screen. In the page miniature it belongs where it rests.
      if (win.getComputedStyle(el).position === 'sticky') {
        if (win.scrollY < 1) this.resting.set(area.id, y);
        else y = this.resting.get(area.id) ?? y;
      }
      out.push({ id: area.id, state: el.getAttribute('data-pe-state') ?? 'sketch', page: { x: box.x + win.scrollX, y, w: box.w, h: box.h } });
    }
    return out;
  }

  /** Where the dot and the area are, in stage pixels. Null if the area is not on screen. */
  placement(id: string): Placement | null {
    const doc = this.doc;
    const el = doc && findArea(doc, id);
    const box = el && areaBox(el);
    const dot = this.dots.get(id);
    if (!box || !dot || dot.hidden) return null;
    const s = this.scale;
    const fx = this.frame.offsetLeft;
    const fy = this.frame.offsetTop;
    const point = this.dotPoint(box);
    return {
      dot: { x: fx + point.x * s - 11, y: fy + point.y * s - 11, w: 22, h: 22 },
      area: { x: fx + box.x * s, y: fy + box.y * s, w: box.w * s, h: box.h * s },
      frame: { x: fx, y: fy, w: this.frame.offsetWidth, h: this.frame.offsetHeight },
    };
  }

  private dotPoint(box: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
    return dotPoint(box, this.win?.innerWidth ?? box.x + box.w);
  }

  private tick(): void {
    const doc = this.doc;
    const win = this.win;
    const pack = this.pack;
    if (!doc || !win || !pack || !this.overlay) return;
    if (this.mode.slow) pace(doc, 0.25); // also what started since the last frame
    const sx = win.scrollX;
    const sy = win.scrollY;
    const root = doc.documentElement;
    const scrolled = sy > 4 ? 'scrolled' : 'top';
    if (root.getAttribute('data-pe-scroll') !== scrolled) root.setAttribute('data-pe-scroll', scrolled);

    // --- areas and dots ---
    const state = this.look.state;
    const placed: Array<{ id: string; x: number; y: number; el: Element; decided: boolean }> = [];
    const keys: string[] = [`${state}|${doc.documentElement.scrollHeight}|${win.innerWidth}x${win.innerHeight}`];
    for (const area of pack.board.areas) {
      const el = findArea(doc, area.id);
      const box = el && areaBox(el);
      if (!el || !box) continue;
      keys.push(`${area.id}:${el.getAttribute('data-pe-state')}:${Math.round(box.x + sx)},${Math.round(box.y + sy)},${Math.round(box.w)},${Math.round(box.h)}`);
      if (area.cuts && !area.cuts.includes(state)) continue;
      const point = this.dotPoint(box);
      // Dots of areas that share a corner sit side by side.
      while (placed.some((p) => Math.abs(p.x - point.x) < 26 && Math.abs(p.y - point.y) < 26)) point.x -= 30;
      placed.push({ id: area.id, x: point.x, y: point.y, el, decided: el.getAttribute('data-pe-state') === 'chosen' });
    }
    const layoutKey = keys.join(';');
    const coverKey = `${layoutKey}@${sy}`;
    if (coverKey !== this.coverKey) {
      this.coverKey = coverKey;
      this.covered = new Set(placed.filter((p) => coverAt(doc, p.el, p.x, p.y) !== null).map((p) => p.id));
    }
    const live = new Set(placed.map((p) => p.id));
    for (const [id, dot] of this.dots) {
      if (live.has(id)) continue;
      dot.remove();
      this.dots.delete(id);
    }
    this.dropHits(live);
    for (const p of placed) {
      let dot = this.dots.get(p.id);
      if (!dot) {
        dot = doc.createElement('div');
        this.overlay.append(dot);
        this.dots.set(p.id, dot);
      }
      const onScreen = p.x > 0 && p.x < win.innerWidth && p.y > 0 && p.y < win.innerHeight;
      const visible = this.dotsOn && onScreen && !this.covered.has(p.id);
      const cls = `dot ${p.decided ? 'done' : 'open'}${this.hot === p.id ? ' hot' : ''}`;
      if (dot.className !== cls) dot.className = cls;
      if (dot.hidden !== !visible) dot.hidden = !visible;
      dot.style.display = visible ? '' : 'none';
      dot.style.transform = `translate(${p.x + sx}px, ${p.y + sy}px)`;

      this.placeHit(p.id, p.x, p.y, visible);
    }

    // --- controls that lead to another cut ---
    if (this.zonesStale) {
      this.zonesStale = false;
      for (const z of this.zones) z.el.remove();
      this.zones = Array.from(doc.querySelectorAll('[data-pe-go]')).map((target) => ({ target, el: this.makeZone(target) }));
    }
    for (const z of this.zones) {
      const r = z.target.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < win.innerHeight;
      z.el.hidden = !visible;
      if (!visible) continue;
      z.el.style.transform = `translate(${r.left * this.scale}px, ${r.top * this.scale}px)`;
      z.el.style.width = `${r.width * this.scale}px`;
      z.el.style.height = `${r.height * this.scale}px`;
    }

    // --- which cut is in view ---
    if (this.pinned && Math.abs(sy - this.pinned.y) > 8) this.pinned = null;
    if (!this.pinned) {
      let current = state;
      for (const cut of pack.board.cuts) {
        if (stateOf(pack.board, cut.id) !== state) continue;
        if (!cut.at) {
          if (cut.id === state) current = cut.id;
          continue;
        }
        let target: Element | null = null;
        try {
          target = doc.querySelector(cut.at);
        } catch {
          target = null;
        }
        if (target && target.getBoundingClientRect().top <= 120) current = cut.id;
      }
      if (current !== this.seen) {
        this.seen = current;
        this.on.cutSeen(current);
      }
    }

    if (layoutKey !== this.layoutKey) {
      this.layoutKey = layoutKey;
      this.on.layout();
    }
    if (sy !== this.lastScroll) {
      this.lastScroll = sy;
      this.on.scroll();
    }
  }

  private makeZone(target: Element): HTMLDivElement {
    const zone = document.createElement('div');
    zone.className = 'zone';
    zone.dataset.go = target.getAttribute('data-pe-go') ?? '';
    zone.addEventListener('click', (e) => {
      const doc = this.doc;
      if (!doc || !this.pack) return;
      const rect = this.frame.getBoundingClientRect();
      const top = doc.elementFromPoint((e.clientX - rect.left) / this.scale, (e.clientY - rect.top) / this.scale);
      if (top && !target.contains(top) && !top.contains(target)) return; // something else is in front of it
      const form = target.closest('form');
      const invalid = target.getAttribute('data-pe-go-invalid');
      const next = invalid && form && !form.checkValidity() ? invalid : target.getAttribute('data-pe-go');
      if (next && this.pack.board.cuts.some((c) => c.id === next && !c.sameAs)) this.on.go(next);
    });
    this.forwardWheel(zone);
    this.hits.append(zone);
    return zone;
  }

  override destroy(): void {
    cancelAnimationFrame(this.raf);
    super.destroy();
  }
}
