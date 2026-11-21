/** Reading layout from a mockup frame. Everything here only reads; nothing listens inside the frame. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The box of an area. A slot with no box of its own (display: contents) is the union of its children. */
export function areaBox(el: Element): Box | null {
  const r = el.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) return { x: r.left, y: r.top, w: r.width, h: r.height };
  let box: Box | null = null;
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

/**
 * If a sticky or fixed element that is not part of `el` covers the point, the bottom edge of that
 * element; otherwise null.
 */
export function coverAt(doc: Document, el: Element, x: number, y: number): number | null {
  const view = doc.defaultView;
  if (!view) return null;
  let node: Element | null = doc.elementFromPoint(x, y);
  if (!node || el.contains(node)) return null;
  for (; node && node !== doc.documentElement; node = node.parentElement) {
    if (node.contains(el)) return null;
    const position = view.getComputedStyle(node).position;
    if (position === 'sticky' || position === 'fixed') return node.getBoundingClientRect().bottom;
  }
  return null;
}

/** Scroll so that the top of `el` is at the top of the screen, just below a sticky header if there is one. */
export function reveal(win: Window, el: Element): void {
  const doc = win.document;
  const first = areaBox(el);
  if (!first) return;
  win.scrollTo(win.scrollX, win.scrollY + first.y);
  const box = areaBox(el);
  if (!box) return;
  const cover = coverAt(doc, el, Math.min(Math.max(box.x + box.w / 2, 1), win.innerWidth - 1), Math.max(box.y, 0) + 2);
  if (cover !== null && cover > box.y && cover < win.innerHeight * 0.6) win.scrollBy(0, box.y - cover);
}

/** The first rendered slot of an area. */
export function findArea(doc: Document, id: string): Element | null {
  for (const el of Array.from(doc.querySelectorAll(`[data-pe-area="${id}"]`))) {
    if (areaBox(el)) return el;
  }
  return null;
}

/** Set form values without events: text for fields, true or false for checkboxes and radio buttons. */
export function fill(doc: Document, values: Record<string, string | boolean> | undefined): void {
  for (const [selector, value] of Object.entries(values ?? {})) {
    let found: Element[] = [];
    try {
      found = Array.from(doc.querySelectorAll(selector));
    } catch {
      continue; // not a valid selector in this browser
    }
    for (const el of found) {
      const input = el as HTMLInputElement;
      if (typeof value === 'boolean') input.checked = value;
      else input.value = value;
    }
  }
}
