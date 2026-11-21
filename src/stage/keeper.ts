import { applyPatch, isCss, isScript, missingTargets, type Applied, type PatchContext } from '../core/patch.js';
import type { PatchOp } from '../core/schema.js';
import { query } from './dom.js';

/**
 * The keeper holds patches in place on a page that keeps changing.
 *
 * A framework redraws its page whenever its state changes, and a hot update replaces parts of it.
 * Either can take back what a patch did. The keeper watches the page and puts a patch back, before
 * the next paint where it can. It also gets out of the way: when the framework wants to remove or
 * reorder an element that a patch moved, the patch is undone first, so that the framework finds
 * the page as it left it, and is applied again afterwards.
 *
 * Shared by the stage agent (the review) and the probe (measuring the approved look).
 */

export interface Kept {
  /** One patch per area: its id. */
  key: string;
  option: string;
  anchor: string;
  patch: PatchOp[];
  page: boolean;
}

export interface KeptProblem {
  key: string;
  option: string;
  /** ANCHOR_MISSING, TARGET_MISSING, SCRIPT_FAILED, REVERTED, or NOT_READY while the page is still starting. */
  code: string;
  detail: string;
}

export interface KeeperOptions {
  doc: Document;
  /** Add rules to the page and return a function that removes them again. */
  addCss(css: string): () => void;
  /** Run the scripts of a level-4 patch, or their undo. Resolves to what went wrong, or null. */
  run?(item: Kept, self: object, kind: 'do' | 'undo'): Promise<string | null>;
  /** False while the page is still taking over markup that came from the server: changing it now would confuse its framework. */
  ready?(anchor: Element): boolean;
}

export interface Keeper {
  /** Bring the page in line: undo what is no longer wanted, apply what is new. */
  want(items: Kept[]): Promise<void>;
  has(key: string): boolean;
  problems(): KeptProblem[];
  /** Run `fn` with the patch of one area taken off the page. Nothing is painted in between. */
  without<T>(key: string | undefined, fn: () => T): T;
  /** Resolves once nothing is waiting for the page to finish starting, or after `ms`. */
  settled(ms: number): Promise<void>;
}

interface Rec {
  item: Kept;
  sig: string;
  /** Only the css of the patch, while the elements it needs are not on the page. */
  part: Applied | null;
  full: Applied | null;
  scripted: boolean;
  /** Shared by the script and its undo as "this". */
  self: object;
  problem: KeptProblem | null;
  /** The patch was taken off to let the page through and goes back at once. */
  gaveWay: boolean;
  /** When the patch was last put on the page. */
  appliedAt: number;
  /** How often in a row the page undid the patch right after it was put back. */
  fights: number;
  /** How often it was put back in all. */
  repairs: number;
  /** The page keeps undoing the patch: it is left off. */
  lost: boolean;
  /** Not to be tried again before this time. */
  restUntil: number;
  /** The patch adds elements that its own selectors find: growth is not looked for. */
  feeds: boolean;
}

/**
 * A page that redraws a part for its own reasons (the user typed, a clock ticked) does so at its
 * own pace, and the patch simply goes back on. A page that undoes the patch within FIGHT_MS of it
 * being put back, FIGHTS times in a row, is undoing the patch itself: it would never end, so the
 * patch is left off and reported. REPAIRS is a ceiling for everything else.
 */
const FIGHT_MS = 50;
const FIGHTS = 20;
const REPAIRS = 5000;

export function createKeeper(opts: KeeperOptions): Keeper {
  const { doc } = opts;
  const view = doc.defaultView!;
  const recs = new Map<string, Rec>();
  /** Looks and repairs run one after the other. */
  let chain: Promise<void> = Promise.resolve();
  const enqueue = (job: () => Promise<void>) => (chain = chain.then(job).catch(() => {}));

  const context = (rec: Rec, anchor: Element | null): PatchContext => ({ doc, anchor: anchor ?? doc.documentElement, page: rec.item.page, addCss: opts.addCss });
  const problem = (rec: Rec, code: string, detail: string): KeptProblem => ({ key: rec.item.key, option: rec.item.option, code, detail });

  const tryApply = async (rec: Rec): Promise<void> => {
    const { patch } = rec.item;
    const anchor = query(doc, rec.item.anchor);
    const ctx = context(rec, anchor);
    const cssOnly = () => {
      // Styles are harmless while the elements are not there yet (another cut, a late render).
      rec.part ??= applyPatch(patch.filter(isCss), ctx);
    };
    const missing = anchor ? missingTargets(patch, ctx) : [rec.item.anchor];
    if (missing.length > 0) {
      rec.problem = problem(rec, anchor ? 'TARGET_MISSING' : 'ANCHOR_MISSING', missing[0]!);
      return cssOnly();
    }
    if (anchor && opts.ready && patch.some((op) => !isCss(op)) && !opts.ready(anchor)) {
      rec.problem = problem(rec, 'NOT_READY', 'the page is still starting');
      return cssOnly();
    }
    rec.part?.undo();
    rec.part = null;
    try {
      rec.full = applyPatch(patch, ctx);
      rec.appliedAt = Date.now();
      rec.problem = null;
      // A patch whose own additions match its selectors would ask to be laid again for ever.
      rec.feeds = rec.full.outgrown();
    } catch (err) {
      // Everything seemed to be there and still an element was not: trying again at once would only stir the page.
      rec.problem = problem(rec, 'TARGET_MISSING', String((err as Error).message));
      rec.restUntil = Date.now() + 500;
      return cssOnly();
    }
    if (rec.full.structural) guard();
    if (opts.run && patch.some(isScript)) {
      const error = await opts.run(rec.item, rec.self, 'do');
      rec.scripted = error === null;
      if (error) rec.problem = problem(rec, 'SCRIPT_FAILED', error);
    }
  };

  const takeOff = async (rec: Rec): Promise<void> => {
    if (rec.scripted && opts.run) await opts.run(rec.item, rec.self, 'undo');
    rec.scripted = false;
    rec.full?.undo();
    rec.full = null;
    rec.part?.undo();
    rec.part = null;
  };

  /** The page has more or fewer of what the patch covers: rows that arrived, cards that left. */
  const outgrown = (rec: Rec) => rec.full !== null && !rec.feeds && rec.full.outgrown();
  const broken = (rec: Rec) => !rec.lost && (rec.gaveWay || (rec.full !== null && !rec.full.intact()) || outgrown(rec));

  /** The page changed by itself: apply what was waiting for its elements, redo what the page took back. */
  const repair = async (): Promise<void> => {
    const now = Date.now();
    for (const rec of recs.values()) {
      if (rec.lost) continue;
      if (rec.full && !rec.gaveWay && rec.full.intact()) {
        if (!outgrown(rec)) continue;
        // Nothing was taken back: a list changed. That is the page working, not the page fighting the patch.
        await takeOff(rec);
        await tryApply(rec);
        continue;
      }
      if (rec.full || rec.gaveWay) {
        rec.fights = now - rec.appliedAt < FIGHT_MS ? rec.fights + 1 : 0;
        if (rec.fights >= FIGHTS || ++rec.repairs > REPAIRS) {
          await takeOff(rec);
          rec.lost = true;
          rec.gaveWay = false;
          rec.problem = problem(rec, 'REVERTED', 'the page keeps replacing the elements this option changes');
          continue;
        }
        rec.gaveWay = false;
        await takeOff(rec);
      }
      if (now < rec.restUntil) {
        later(rec.restUntil - now + 10);
        continue;
      }
      await tryApply(rec);
    }
    watch();
    if ([...recs.values()].some((r) => r.problem?.code === 'NOT_READY')) later(100);
  };

  let timer = 0;
  const later = (ms: number) => {
    view.clearTimeout(timer);
    timer = view.setTimeout(() => enqueue(repair), ms);
  };
  const check = () => {
    if (recs.size === 0) return;
    // What the page took back goes back before the next paint; what is waiting for its elements can wait a moment.
    if ([...recs.values()].some(broken)) enqueue(repair);
    else if ([...recs.values()].some((r) => !r.full && !r.lost)) later(50);
  };

  const observer = new view.MutationObserver(check);
  let watching = '';
  /** Watch the whole page for elements coming and going, and the attributes the patches set. */
  const watch = () => {
    const names = new Set<string>();
    for (const rec of recs.values()) for (const name of rec.full?.attributes ?? []) names.add(name);
    const key = recs.size === 0 ? '' : `on ${[...names].sort().join(' ')}`;
    if (key === watching) return;
    watching = key;
    observer.disconnect();
    if (recs.size === 0) return;
    observer.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, ...(names.size > 0 ? { attributes: true, attributeFilter: [...names] } : {}) });
  };

  let guarded = false;
  /**
   * Frameworks remember where their elements are, each in its own way, and a patch that moved or
   * wrapped one of them must not be in their way:
   *
   * - One asks a parent to remove, replace or insert before a child that is no longer there
   *   (React, Vue, Angular). The browser would refuse and the app would break.
   * - One takes the parent the element has now for the place to work in (Solid, Preact), and
   *   would build on the patched place as if it were its own.
   * - One removes a run of siblings by walking from the first to the last (Svelte, Lit). If the
   *   last one is elsewhere, the walk does not stop where it should.
   *
   * So, just before any of that happens, the displaced elements are put back among their own
   * siblings, the request is carried out where the element really belongs, and "repair" puts the
   * patches back afterwards.
   */
  const guard = () => {
    if (guarded) return;
    guarded = true;
    const proto = view.Node.prototype;
    const { removeChild, insertBefore, replaceChild } = proto;
    let busy = false;
    const allHome = () => {
      busy = true;
      try {
        for (const rec of recs.values()) {
          if (!rec.full?.structural || rec.gaveWay) continue;
          rec.full.home();
          rec.gaveWay = true;
        }
      } finally {
        busy = false;
      }
    };
    const placed = () => [...recs.values()].filter((rec) => rec.full?.structural && !rec.gaveWay);
    /** A child is asked for by a parent. Returns the parent to carry the request out on. */
    const giveWay = (parent: Node, child: Node | null | undefined): Node => {
      if (busy || child == null) return parent;
      const ours = placed().some((rec) => rec.full!.displaced.includes(child));
      if (!ours && child.parentNode === parent) return parent;
      allHome();
      // What the framework means is this child, wherever the page really has it.
      return ours && child.parentNode ? child.parentNode : parent;
    };
    /** A node is about to go. If what follows it stands for a displaced element, a walk may be on its way there. */
    const before = (node: Node) => {
      if (busy) return;
      const next = node.nextSibling;
      if (next && placed().some((rec) => rec.full!.stand.includes(next))) allHome();
    };
    proto.removeChild = function <T extends Node>(this: Node, child: T): T {
      const parent = giveWay(this, child);
      before(child);
      return removeChild.call(parent, child) as T;
    };
    proto.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
      return insertBefore.call(giveWay(this, ref), node, ref) as T;
    };
    proto.replaceChild = function <T extends Node>(this: Node, node: Node, old: T): T {
      return replaceChild.call(giveWay(this, old), node, old) as T;
    };
    for (const own of [view.Element.prototype, view.CharacterData.prototype] as Array<{ remove(this: ChildNode): void }>) {
      const remove = own.remove;
      own.remove = function (this: ChildNode): void {
        before(this);
        remove.call(this);
      };
    }
  };

  return {
    want: (items) =>
      enqueue(async () => {
        const next = new Map(items.map((item) => [item.key, { item, sig: JSON.stringify([item.option, item.anchor, item.patch, item.page]) }]));
        for (const [key, rec] of [...recs].reverse()) {
          if (next.get(key)?.sig === rec.sig) continue;
          await takeOff(rec);
          recs.delete(key);
        }
        for (const { item, sig } of next.values()) {
          if (recs.has(item.key)) continue;
          const rec: Rec = { item, sig, part: null, full: null, scripted: false, self: {}, problem: null, gaveWay: false, appliedAt: 0, fights: 0, repairs: 0, lost: false, restUntil: 0, feeds: false };
          recs.set(item.key, rec);
          await tryApply(rec);
        }
        watch();
        if ([...recs.values()].some((r) => r.problem?.code === 'NOT_READY')) later(100);
      }),

    has: (key) => recs.has(key),

    problems: () => [...recs.values()].flatMap((rec) => (rec.problem && rec.problem.code !== 'NOT_READY' ? [rec.problem] : [])),

    without: (key, fn) => {
      const rec = key === undefined ? undefined : recs.get(key);
      if (!rec || (!rec.full && !rec.part)) return fn();
      const whole = rec.full !== null;
      rec.full?.undo();
      rec.part?.undo();
      rec.full = rec.part = null;
      try {
        return fn();
      } finally {
        const ctx = context(rec, query(doc, rec.item.anchor));
        try {
          if (whole) rec.full = applyPatch(rec.item.patch, ctx);
          else rec.part = applyPatch(rec.item.patch.filter(isCss), ctx);
        } catch {
          later(0); // its elements are gone for now
        }
      }
    },

    settled: async (ms) => {
      const until = Date.now() + ms;
      for (;;) {
        await chain;
        if (Date.now() > until || ![...recs.values()].some((r) => r.problem?.code === 'NOT_READY' || broken(r))) return;
        await new Promise<void>((r) => view.setTimeout(r, 50));
      }
    },
  };
}
