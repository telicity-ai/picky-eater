import type { DomOp, PatchOp } from './schema.js';

/**
 * The patch engine: applies the operations of an option to a document and can take them back.
 *
 * It runs in two places. The stage agent runs it on the user's live page, where every operation
 * must be undone exactly when a preview ends. The review page runs it on an inert copy of the page
 * to draw thumbnails. Scripts (level 4) are not handled here: only the stage agent runs them.
 */

export interface PatchContext {
  doc: Document;
  /** The element the area covers. */
  anchor: Element;
  /** The option may reach outside the anchor (a sticky bar, a new section next to the area). */
  page: boolean;
  /** Add rules to the page and return a function that removes them again. */
  addCss(css: string): () => void;
}

export interface Applied {
  /** Take every operation back, in reverse order. What the page has changed since is left as the page made it. */
  undo(): void;
  /** False once the page took back or replaced something this patch did (a re-render, a hot update). */
  intact(): boolean;
  /**
   * True once the page has more, or fewer, of what this patch changes: a row arrived in a list, a
   * card was removed. Nothing was taken back; the patch only has to be laid over the page again.
   */
  outgrown(): boolean;
  /** The patch moved or wrapped elements of the page: a framework that wants them back must be let through first. */
  structural: boolean;
  /** Elements of the page that are not where the page left them. */
  displaced: Node[];
  /** What the patch left in their places: markers of moved elements, wrappers. */
  stand: Node[];
  /**
   * Put the displaced elements back among their own siblings, right after what stands in their
   * place, and leave the rest of the patch as it is. For a page that is about to walk its
   * elements from one sibling to the next: it then finds every one of them. Not an undo: the
   * patch is no longer intact afterwards and has to be taken off and applied again.
   */
  home(): void;
  /** The attributes this patch sets, so that a change to them can be noticed. */
  attributes: string[];
}

type Each = Extract<PatchOp, { each: string }>;
type Dom = DomOp | Each;

export const isCss = (op: PatchOp): op is { css: string } => 'css' in op;
export const isScript = (op: PatchOp): op is { script: string; undo: string } => 'script' in op;
const isDom = (op: PatchOp): op is Dom => !isCss(op) && !isScript(op);

/** Marks what a patch added, so that a snapshot or a comparison can tell it from the app's own markup. */
export const ADDED = 'data-pe-added';

const UNSAFE = 'script,iframe,frame,frameset,object,embed,applet,base,link,meta,noscript,portal';
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster', 'xlink:href', 'data', 'ping']);

/** Inserted markup never carries code. "validate" refuses it already; the page's parser has the last word. */
function scrub(root: ParentNode): void {
  for (const el of Array.from(root.querySelectorAll(UNSAFE))) el.remove();
  for (const el of Array.from(root.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      // eslint-disable-next-line no-control-regex
      const scheme = /^[\s\u0000-\u001f]*([a-z][a-z0-9+.-]*):/i.exec(attr.value)?.[1]?.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'srcset') el.removeAttribute(attr.name);
      else if (URL_ATTRS.has(name) && (scheme !== undefined || attr.value.trim().startsWith('//'))) el.removeAttribute(attr.name);
    }
  }
}

function parse(doc: Document, markup: string): DocumentFragment {
  const tpl = doc.createElement('template');
  tpl.innerHTML = markup;
  scrub(tpl.content);
  return tpl.content;
}

function find(ctx: PatchContext, selector: string): Element[] {
  try {
    if (ctx.page) return Array.from(ctx.doc.querySelectorAll(selector));
    const inside = Array.from(ctx.anchor.querySelectorAll(selector));
    return ctx.anchor.matches(selector) ? [ctx.anchor, ...inside] : inside;
  } catch {
    return []; // not a valid selector in this browser
  }
}

const placeOf = (op: { before?: string; after?: string; into?: string; atStartOf?: string }) =>
  op.before !== undefined
    ? (['before', op.before] as const)
    : op.after !== undefined
      ? (['after', op.after] as const)
      : op.into !== undefined
        ? (['into', op.into] as const)
        : (['atStartOf', op.atStartOf ?? ''] as const);

function put(how: 'before' | 'after' | 'into' | 'atStartOf', ref: Element, nodes: Node[]): void {
  if (how === 'before') ref.before(...nodes);
  else if (how === 'after') ref.after(...nodes);
  else if (how === 'into') ref.append(...nodes);
  else ref.prepend(...nodes);
}

/** The last part of a selector: ".form .note" → ".note". */
const lastCompound = (selector: string): string => selector.trim().split(/\s*[\s>+~]\s*(?![^[(]*[\])])/).pop() ?? selector;

/**
 * What each operation needs on the page before it can run. Empty when everything is there.
 * An element that an earlier operation of the same patch adds counts as there.
 */
export function missingTargets(patch: PatchOp[], ctx: PatchContext): string[] {
  const missing: string[] = [];
  /** Markup the patch brings itself. */
  let added: HTMLElement | null = null;
  const brings = (selector: string): boolean => {
    if (!added) return false;
    try {
      return added.querySelector(selector) !== null || added.querySelector(lastCompound(selector)) !== null;
    } catch {
      return false;
    }
  };
  for (const op of patch) {
    if (!isDom(op)) continue;
    if ('each' in op) {
      // The operations inside are looked up in an item: the first one stands for all.
      const items = find(ctx, op.each);
      if (items.length === 0) {
        if (!brings(op.each) && !missing.includes(op.each)) missing.push(op.each);
        continue;
      }
      const inside = items.map((item) => missingTargets(op.patch, { ...ctx, anchor: item, page: false }));
      // A list may hold rows of another kind (a heading, a divider): what no item has is what is missing.
      for (const selector of inside[0] ?? []) if (inside.every((m) => m.includes(selector)) && !missing.includes(selector)) missing.push(selector);
      continue;
    }
    const need: string[] = [];
    if ('move' in op) need.push(op.move, placeOf(op)[1]);
    else if ('wrap' in op) need.push(op.wrap);
    else if ('set' in op) need.push(op.set);
    else need.push(placeOf(op)[1]);
    for (const selector of need) if (find(ctx, selector).length === 0 && !brings(selector) && !missing.includes(selector)) missing.push(selector);
    const markup = 'insert' in op ? op.insert : 'wrap' in op ? op.in : null;
    if (markup !== null) {
      added ??= ctx.doc.createElement('div');
      added.append(parse(ctx.doc, markup));
    }
  }
  return missing;
}

/**
 * Apply the css and DOM operations of a patch, in order. If an operation cannot find its target,
 * everything done so far is taken back and the selector is thrown as the error message.
 *
 * The page may be redrawn by its framework at any time. Each operation therefore knows how to tell
 * whether its effect is still there, and its undo only takes back what is still its own: what the
 * page wrote afterwards is the page's.
 */
export function applyPatch(patch: PatchOp[], ctx: PatchContext): Applied {
  const undo: Array<() => void> = [];
  const checks: Array<() => boolean> = [];
  const grown: Array<() => boolean> = [];
  const settled: Array<() => void> = [];
  const attributes = new Set<string>();
  const displaced: Node[] = [];
  const stand: Node[] = [];
  const homes: Array<() => void> = [];
  let structural = false;
  const back = () => {
    for (const fn of undo.reverse()) {
      try {
        fn();
      } catch {
        /* the page changed underneath; whatever is left is cleaned up by a reload */
      }
    }
    undo.length = 0;
    checks.length = 0;
    grown.length = 0;
    displaced.length = 0;
    stand.length = 0;
    homes.length = 0;
  };
  /**
   * A list grows: rows arrive, a framework draws an item anew. An operation on everything a
   * selector finds is whole only while nothing it finds is left out. (An element that the
   * operation itself made stop matching is not missing.)
   */
  const covers = (selector: string, done: Element[]) => {
    const known = new Set(done);
    // What the selector finds once the whole patch is in place is the starting point: a selector by
    // position ("the second line") finds another element after its own move, and that is not growth.
    settled.push(() => {
      for (const el of find(ctx, selector)) known.add(el);
    });
    grown.push(() => find(ctx, selector).some((el) => !known.has(el)));
  };
  const need = (selector: string): Element[] => {
    const found = find(ctx, selector);
    if (found.length === 0) throw new Error(selector);
    return found;
  };

  try {
    for (const op of patch) {
      if (isScript(op)) continue;
      if (isCss(op)) {
        undo.push(ctx.addCss(op.css));
      } else if ('move' in op) {
        const targets = need(op.move);
        const [how, selector] = placeOf(op);
        const ref = need(selector).find((el) => !targets.includes(el));
        if (!ref) throw new Error(selector);
        // A marker keeps each element's old place, whatever the page does to its neighbors meanwhile.
        const home = targets.map((el) => {
          const mark = ctx.doc.createComment('pe');
          el.before(mark);
          return { el, mark };
        });
        put(how, ref, targets);
        structural = true;
        displaced.push(...targets);
        stand.push(...home.map((h) => h.mark));
        covers(op.move, targets);
        homes.push(() => {
          for (const { el, mark } of home) if (mark.isConnected && el.parentNode !== null) mark.after(el);
        });
        checks.push(() => home.every(({ el, mark }) => el.isConnected && mark.isConnected && (how === 'into' || how === 'atStartOf' ? el.parentNode === ref : el.parentNode === ref.parentNode)));
        undo.push(() => {
          for (const { el, mark } of home) {
            // Back home, also when the element was lost together with the place it was moved to: the page
            // still counts on it. It still has a parent then, which an element the page removed itself has not.
            if (mark.isConnected && (el.isConnected || el.parentNode !== null)) mark.replaceWith(el);
            else {
              // The page removed the place this element came from, or the element itself: it goes the same way.
              if (el.isConnected && !mark.isConnected) el.remove();
              mark.remove();
            }
          }
        });
      } else if ('each' in op) {
        const items = need(op.each);
        // Tried, not necessarily patched: a row of another kind in the same list has none of the targets.
        const tried = [...items];
        let lacking: string | null = null;
        let done = 0;
        for (const item of items) {
          let inner: Applied;
          try {
            inner = applyPatch(op.patch, { ...ctx, anchor: item, page: false });
          } catch (err) {
            lacking ??= (err as Error).message;
            continue;
          }
          done++;
          structural ||= inner.structural;
          displaced.push(...inner.displaced);
          stand.push(...inner.stand);
          homes.push(() => inner.home());
          for (const name of inner.attributes) attributes.add(name);
          checks.push(() => !item.isConnected || inner.intact());
          grown.push(() => !item.isConnected || inner.outgrown());
          undo.push(() => inner.undo());
        }
        if (done === 0) throw new Error(lacking ?? op.each);
        covers(op.each, tried);
      } else if ('wrap' in op) {
        const targets = need(op.wrap);
        covers(op.wrap, targets);
        for (const target of targets) {
          const wrapper = parse(ctx.doc, op.in).firstElementChild;
          if (!wrapper) throw new Error(op.wrap);
          wrapper.setAttribute(ADDED, '');
          let inner: Element = wrapper;
          while (inner.firstElementChild) inner = inner.firstElementChild;
          target.before(wrapper);
          inner.append(target);
          structural = true;
          displaced.push(target);
          stand.push(wrapper);
          homes.push(() => void (wrapper.isConnected && target.parentNode === inner && wrapper.after(target)));
          checks.push(() => wrapper.isConnected && target.parentNode === inner);
          undo.push(() => {
            // Whatever is inside now takes the wrapper's place, even if the page re-rendered it.
            if (wrapper.isConnected) wrapper.replaceWith(...Array.from(inner.childNodes));
          });
        }
      } else if ('set' in op) {
        const targets = need(op.set);
        covers(op.set, targets);
        for (const el of targets) {
          // An element that the page dropped (a row that left the list) took its change with it.
          grown.push(() => !el.isConnected);
          if (op.text !== undefined) {
            const text = op.text;
            const children = Array.from(el.childNodes);
            el.textContent = text;
            checks.push(() => !el.isConnected || el.textContent === text);
            // Only while the text is still ours: a page that has written its own since keeps it.
            undo.push(() => void (el.textContent === text && el.replaceChildren(...children)));
          }
          for (const [name, value] of Object.entries(op.attr ?? {})) {
            const before = el.getAttribute(name);
            if (value === null) el.removeAttribute(name);
            else el.setAttribute(name, value);
            attributes.add(name);
            checks.push(() => !el.isConnected || el.getAttribute(name) === value);
            undo.push(() => {
              if (el.getAttribute(name) !== value) return;
              if (before === null) el.removeAttribute(name);
              else el.setAttribute(name, before);
            });
          }
          const added = (op.addClass ?? []).filter((c) => !el.classList.contains(c));
          const removed = (op.removeClass ?? []).filter((c) => el.classList.contains(c));
          if (added.length + removed.length > 0) {
            el.classList.add(...added);
            el.classList.remove(...removed);
            attributes.add('class');
            const ours = () => added.every((c) => el.classList.contains(c)) && removed.every((c) => !el.classList.contains(c));
            checks.push(() => !el.isConnected || ours());
            undo.push(() => {
              // A page that rewrote the class list has already put back what it wants there.
              if (ours()) el.classList.add(...removed);
              el.classList.remove(...added);
            });
          }
        }
      } else {
        const [how, selector] = placeOf(op);
        const ref = need(selector)[0]!;
        const nodes = Array.from(parse(ctx.doc, op.insert).childNodes);
        for (const node of nodes) if (node.nodeType === 1) (node as Element).setAttribute(ADDED, '');
        put(how, ref, nodes);
        const elements = nodes.filter((n) => n.nodeType === 1);
        checks.push(() => elements.every((n) => n.isConnected));
        undo.push(() => {
          for (const node of nodes) node.parentNode?.removeChild(node);
        });
      }
    }
  } catch (err) {
    back();
    throw err;
  }
  for (const fn of settled) fn();
  const goHome = () => {
    for (const fn of [...homes].reverse()) {
      try {
        fn();
      } catch {
        /* the page changed underneath */
      }
    }
    displaced.length = 0;
  };
  return { undo: back, intact: () => checks.every((ok) => ok()), outgrown: () => grown.some((is) => is()), structural, displaced, stand, home: goHome, attributes: [...attributes] };
}
