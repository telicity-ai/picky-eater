import type { Step } from './protocol.js';

/**
 * Reading and driving a page from inside it. Shared by the stage agent (the user's app during a
 * review) and the probe (the headless browser that measures a page before and after it is built).
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function query(doc: Document, selector: string | undefined, root: ParentNode = doc): Element | null {
  if (!selector) return null;
  try {
    return root.querySelector(selector);
  } catch {
    return null; // not a valid selector in this browser
  }
}

/** The box of an element on screen. One with no box of its own (display: contents) is the union of its children. */
export function boxOf(el: Element): Rect | null {
  const r = el.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) return { x: r.left, y: r.top, w: r.width, h: r.height };
  let box: Rect | null = null;
  for (const child of Array.from(el.children)) {
    const c = child.getBoundingClientRect();
    if (c.width === 0 || c.height === 0) continue;
    if (!box) box = { x: c.left, y: c.top, w: c.width, h: c.height };
    else {
      const right = Math.max(box.x + box.w, c.right);
      const bottom = Math.max(box.y + box.h, c.bottom);
      box.x = Math.min(box.x, c.left);
      box.y = Math.min(box.y, c.top);
      box.w = right - box.x;
      box.h = bottom - box.y;
    }
  }
  return box;
}

export function visible(el: Element | null): boolean {
  if (!el || el.getClientRects().length === 0) return false;
  const view = el.ownerDocument.defaultView;
  return !view || view.getComputedStyle(el).visibility !== 'hidden';
}

/** Bottom edge of a sticky or fixed element that covers the point and is not part of `el`. */
export function coverAt(el: Element, x: number, y: number): number | null {
  const doc = el.ownerDocument;
  const view = doc.defaultView;
  if (!view) return null;
  let node = doc.elementFromPoint(x, y);
  if (!node || el.contains(node)) return null;
  for (; node && node !== doc.documentElement; node = node.parentElement) {
    if (node.contains(el)) return null;
    const position = view.getComputedStyle(node).position;
    if (position === 'sticky' || position === 'fixed') return node.getBoundingClientRect().bottom;
  }
  return null;
}

/** Scroll so that the top of `el` is at the top of the screen, just below a sticky header if there is one. */
export function reveal(el: Element): void {
  const view = el.ownerDocument.defaultView;
  const first = boxOf(el);
  if (!view || !first) return;
  view.scrollTo({ left: view.scrollX, top: view.scrollY + first.y, behavior: 'instant' });
  const box = boxOf(el);
  if (!box) return;
  const cover = coverAt(el, Math.min(Math.max(box.x + box.w / 2, 1), view.innerWidth - 1), Math.max(box.y, 0) + 2);
  if (cover !== null && cover > box.y && cover < view.innerHeight * 0.6) view.scrollBy({ top: box.y - cover, behavior: 'instant' });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitFor(doc: Document, selector: string, ms: number, mustShow = false): Promise<Element> {
  const until = Date.now() + ms;
  for (;;) {
    const el = query(doc, selector);
    if (el && (!mustShow || visible(el))) return el;
    if (Date.now() > until) throw new Error(`"${selector}" did not appear on the page`);
    await sleep(50);
  }
}

/** The live preview's cross-origin frame can take focus after the person interacts with it. */
function focusForStep(el: HTMLElement, options?: FocusOptions): void {
  const view = el.ownerDocument.defaultView;
  if (view && (view.top === view || view.navigator.userActivation?.isActive === true) && typeof el.focus === 'function') {
    el.focus(options);
  }
}

/**
 * A click as a pointer makes it: menus and popovers of component libraries open on the press, not
 * on the click that follows it.
 */
function press(el: HTMLElement): void {
  const view = el.ownerDocument.defaultView!;
  const rect = el.getBoundingClientRect();
  const at = { bubbles: true, cancelable: true, composed: true, view, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  const pointer = (type: string, buttons: number) =>
    el.dispatchEvent(typeof view.PointerEvent === 'function' ? new view.PointerEvent(type, { ...at, buttons, pointerId: 1, pointerType: 'mouse', isPrimary: true }) : new view.MouseEvent(type, { ...at, buttons }));
  pointer('pointerdown', 1);
  const down = el.dispatchEvent(new view.MouseEvent('mousedown', { ...at, buttons: 1, detail: 1 }));
  if (down) focusForStep(el, { preventScroll: true });
  pointer('pointerup', 0);
  el.dispatchEvent(new view.MouseEvent('mouseup', { ...at, buttons: 0, detail: 1 }));
  // The click itself through the element, so that links, labels and form buttons do what they do.
  el.click();
}

/**
 * The pointer arrives on an element, as far as a script can say so: what the page opens with its
 * own listeners opens. A style on :hover does not apply; only a real pointer does that.
 */
function pointAt(el: HTMLElement): void {
  const view = el.ownerDocument.defaultView!;
  const rect = el.getBoundingClientRect();
  const at = { bubbles: true, cancelable: true, composed: true, view, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  const pointer = (type: string, bubbles: boolean) =>
    el.dispatchEvent(typeof view.PointerEvent === 'function' ? new view.PointerEvent(type, { ...at, bubbles, pointerId: 1, pointerType: 'mouse', isPrimary: true }) : new view.MouseEvent(type, { ...at, bubbles }));
  pointer('pointerover', true);
  pointer('pointerenter', false);
  el.dispatchEvent(new view.MouseEvent('mouseover', at));
  el.dispatchEvent(new view.MouseEvent('mouseenter', { ...at, bubbles: false }));
  pointer('pointermove', true);
  el.dispatchEvent(new view.MouseEvent('mousemove', at));
}

/** A key goes down and up, on an element or on whatever has the focus: a shortcut, Escape, an arrow. */
function typeKey(doc: Document, key: string, on: HTMLElement | null): void {
  const view = doc.defaultView!;
  const target = on ?? (doc.activeElement as HTMLElement | null) ?? doc.body;
  if (on) focusForStep(on, { preventScroll: true });
  const code = key.length === 1 ? (/[a-z]/i.test(key) ? `Key${key.toUpperCase()}` : /\d/.test(key) ? `Digit${key}` : key === ' ' ? 'Space' : '') : key;
  const init = { key, code, bubbles: true, cancelable: true, composed: true, view };
  target.dispatchEvent(new view.KeyboardEvent('keydown', init));
  target.dispatchEvent(new view.KeyboardEvent('keyup', init));
}

/** Do what a person would do to reach a moment of the page: scroll, fill in, click, point, press a key, wait. */
export async function play(doc: Document, steps: Step[]): Promise<void> {
  const view = doc.defaultView!;
  for (const step of steps) {
    if ('scroll' in step) reveal(await waitFor(doc, step.scroll, 3000));
    else if ('wait' in step) await waitFor(doc, step.wait, 10_000, true);
    else if ('click' in step) press((await waitFor(doc, step.click, 3000)) as HTMLElement);
    else if ('hover' in step) pointAt((await waitFor(doc, step.hover, 3000)) as HTMLElement);
    else if ('key' in step) typeKey(doc, step.key, step.on ? ((await waitFor(doc, step.on, 3000)) as HTMLElement) : null);
    else {
      const el = (await waitFor(doc, step.fill, 3000)) as HTMLInputElement;
      focusForStep(el);
      // Through the native setter, so that frameworks that track the value notice the change.
      const proto = el instanceof view.HTMLTextAreaElement ? view.HTMLTextAreaElement.prototype : el instanceof view.HTMLSelectElement ? view.HTMLSelectElement.prototype : view.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, step.value);
      else el.value = step.value;
      el.dispatchEvent(new view.Event('input', { bubbles: true }));
      el.dispatchEvent(new view.Event('change', { bubbles: true }));
    }
    await new Promise<void>((r) => view.requestAnimationFrame(() => r()));
  }
  await sleep(60);
}

/**
 * Play the entrance of an element again: what it does when it appears (keyframes, a transition
 * from its starting style) runs once more. The element is taken out of the rendering and put back
 * within one task, so nothing is seen of that.
 */
export function replay(el: HTMLElement): void {
  const view = el.ownerDocument.defaultView;
  const y = view?.scrollY ?? 0;
  const before = el.style.getPropertyValue('display');
  const priority = el.style.getPropertyPriority('display');
  el.style.setProperty('display', 'none', 'important');
  void el.offsetHeight; // the browser has to see it gone before it can appear again
  if (before) el.style.setProperty('display', before, priority);
  else el.style.removeProperty('display');
  // A page that was shorter for a moment may have been scrolled up by the browser: put it back.
  if (view && view.scrollY !== y) view.scrollTo({ left: view.scrollX, top: y, behavior: 'instant' });
}

/** Run every transition and animation of a page at this rate (1: as written; 0.25: slow motion). */
export function pace(doc: Document, rate: number): void {
  if (typeof doc.getAnimations !== 'function') return;
  for (const animation of doc.getAnimations()) if (animation.playbackRate !== rate) animation.playbackRate = rate;
}

/**
 * Does the page look like a sign-in screen rather than the page that was asked for? A password
 * field, or a nearly empty page whose address or heading speaks of signing in.
 */
export function signinWall(doc: Document): boolean {
  const shown = (el: Element) => (el as HTMLElement).getClientRects().length > 0;
  if (Array.from(doc.querySelectorAll('input[type="password"]')).some(shown)) return true;
  const words = /\b(sign[ -]?in|log[ -]?in|sign[ -]?up|pair(ing)?|authenticate|unauthori[sz]ed|access token|passcode)\b/i;
  const controls = Array.from(doc.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="link"]')).filter(shown).length;
  if (controls > 12) return false;
  const heading = Array.from(doc.querySelectorAll('h1, h2, [role="heading"], form label, form button'))
    .filter(shown)
    .map((el) => el.textContent ?? '')
    .join(' ');
  return words.test((doc.location?.pathname ?? '').replace(/[/_]/g, ' ')) || words.test(heading) || words.test(doc.title);
}
