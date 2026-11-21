import { boxOf } from '../stage/dom.js';

/**
 * What a running page is like, as far as that decides which motion to offer: what kind of page it
 * is, what moves on it today, which timing values its authors named, and the moments where
 * something changes (a press, a section that opens, a tab that is chosen, a group that appears).
 * Evaluated inside the page by the probe. It only reads.
 */

export type MomentKind = 'press' | 'open' | 'select' | 'overlay' | 'hover' | 'enter' | 'navigate' | 'ambient';

export interface Moment {
  kind: MomentKind;
  /** A selector that finds the elements of this moment. */
  selector: string;
  count: number;
  /** The first words of the first one. */
  text: string;
  /** What the page does at this moment today, in plain words. */
  today: string;
  /** The page already answers this moment with motion of its own. */
  answered: boolean;
}

export interface Profile {
  /** "landing": a page that is read; "app": a screen that is worked with; "page": neither clearly. */
  surface: 'landing' | 'app' | 'page';
  /** Custom properties whose names speak of time or easing, with their values. */
  tokens: Array<{ name: string; value: string }>;
  motion: {
    /** Elements that have a transition, and animations that are running or waiting. */
    transitions: number;
    animations: number;
    /** Durations in use, in milliseconds, most common first. */
    durations: number[];
    /** Rules for prefers-reduced-motion in the page's style sheets. */
    reducedRules: number;
    libraries: string[];
  };
  moments: Moment[];
}

interface Helpers {
  selectorFor(el: Element): string;
  say(el: Element, max?: number): string;
}

const ms = (value: string): number => {
  const m = /^(-?\d*\.?\d+)(ms|s)$/.exec(value.trim());
  return m ? Math.round(Number(m[1]) * (m[2] === 's' ? 1000 : 1)) : 0;
};

/** Every style rule of the page that can be read, with the media conditions around it. */
function* rulesOf(doc: Document): Generator<{ rule: CSSStyleRule; media: string }> {
  const walk = function* (rules: CSSRuleList, media: string): Generator<{ rule: CSSStyleRule; media: string }> {
    for (const rule of Array.from(rules)) {
      if ('selectorText' in rule && 'style' in rule) yield { rule: rule as CSSStyleRule, media };
      const inner = (rule as CSSGroupingRule).cssRules;
      if (inner && !('selectorText' in rule)) yield* walk(inner, `${media} ${(rule as CSSMediaRule).conditionText ?? ''}`.trim());
    }
  };
  for (const sheet of [...Array.from(doc.styleSheets), ...doc.adoptedStyleSheets]) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules; // a style sheet from another site cannot be read
    } catch {
      continue;
    }
    yield* walk(rules, '');
  }
}

export function profilePage(doc: Document, help: Helpers): Profile {
  const view = doc.defaultView!;
  const shown = (el: Element) => boxOf(el) !== null && !el.closest('pe-overlay');
  const all = (selector: string) => Array.from(doc.querySelectorAll(selector)).filter(shown);
  const styleOf = (el: Element) => view.getComputedStyle(el);
  const transitions = (el: Element) => styleOf(el).transitionDuration.split(',').map(ms).filter((n) => n > 0);

  // --- what the style sheets say --------------------------------------------------------------
  const pressed: string[] = [];
  const hovered: string[] = [];
  const tokens: Profile['tokens'] = [];
  let reducedRules = 0;
  for (const { rule, media } of rulesOf(doc)) {
    if (/prefers-reduced-motion/.test(media)) reducedRules++;
    for (const part of rule.selectorText.split(',')) {
      if (part.includes(':active')) pressed.push(part.replace(/:active/g, '').trim());
      if (part.includes(':hover')) hovered.push(part.replace(/:hover/g, '').trim());
    }
    if (/^(:root|html|body)$/.test(rule.selectorText.trim())) {
      for (const name of Array.from(rule.style)) {
        if (name.startsWith('--') && /(dur|ease|easing|motion|spring|transition|anim|timing)/i.test(name) && tokens.length < 16) tokens.push({ name, value: rule.style.getPropertyValue(name).trim() });
      }
    }
  }
  const matchesAny = (el: Element, selectors: string[]) =>
    selectors.some((s) => {
      try {
        return s !== '' && el.matches(s);
      } catch {
        return false;
      }
    });

  // --- what moves today -----------------------------------------------------------------------
  const durations = new Map<number, number>();
  let transitioning = 0;
  for (const el of Array.from(doc.querySelectorAll('body *')).slice(0, 4000)) {
    const t = transitions(el);
    if (t.length === 0) continue;
    transitioning++;
    for (const n of t) durations.set(n, (durations.get(n) ?? 0) + 1);
  }
  const animations = typeof doc.getAnimations === 'function' ? doc.getAnimations().filter((a) => a.constructor.name === 'CSSAnimation').length : 0;
  const scripts = Array.from(doc.scripts).map((s) => s.src).join(' ');
  const w = view as unknown as Record<string, unknown>;
  const libraries = [
    w.gsap ? 'GSAP' : '',
    /framer-motion|\/motion[@/.-]/.test(scripts) || doc.querySelector('[data-projection-id],[data-framer-appear-id]') ? 'Motion' : '',
    w.lottie || doc.querySelector('lottie-player,dotlottie-player') ? 'Lottie' : '',
    w.anime ? 'anime.js' : '',
  ].filter(Boolean);

  // --- what kind of page ----------------------------------------------------------------------
  const fields = all('input:not([type="hidden"]):not([type="submit"]),select,textarea').length;
  const controls = all('button,[role="button"],[role="tab"],[role="menuitem"],[role="switch"],input,select,textarea').length;
  const h1 = doc.querySelector('h1');
  const big = h1 && shown(h1) ? parseFloat(styleOf(h1).fontSize) >= 40 : false;
  const sections = all('main > section, body > section, main > div > section').length;
  const surface: Profile['surface'] = fields >= 5 || controls >= 40 ? 'app' : big && sections >= 2 && fields <= 3 ? 'landing' : 'page';

  // --- the moments ----------------------------------------------------------------------------
  const moments: Moment[] = [];
  /** One moment per group of like elements: those that share their first class, or their tag. */
  const group = (els: Element[]): Array<{ selector: string; els: Element[] }> => {
    const by = new Map<string, Element[]>();
    for (const el of els) {
      const cls = Array.from(el.classList).find((c) => /^[a-z][\w-]*$/i.test(c) && !/^(is|has|js)-/.test(c));
      const key = cls ? `.${cls}` : el.localName;
      by.set(key, [...(by.get(key) ?? []), el]);
    }
    return [...by.entries()].map(([key, list]) => ({ selector: list.length === 1 ? help.selectorFor(list[0]!) : key, els: list })).sort((a, b) => b.els.length - a.els.length);
  };
  const add = (kind: MomentKind, selector: string, els: Element[], today: string, answered: boolean) => {
    if (els.length > 0) moments.push({ kind, selector, count: els.length, text: help.say(els[0]!, 40), today, answered });
  };

  // A press: buttons and links drawn as buttons.
  const pressable = all('button:not([disabled]),[role="button"],input[type="submit"],a[class*="btn" i],a[class*="button" i]').filter((el) => !el.closest('[role="tablist"],summary'));
  for (const g of group(pressable).slice(0, 3)) {
    const answered = g.els.some((el) => matchesAny(el, pressed));
    add('press', g.selector, g.els, answered ? 'changes while pressed' : 'nothing answers a press', answered);
  }

  // A section that opens in place.
  const details = all('details');
  if (details.length > 0) {
    const moving = details.some((el) => transitions(el).length > 0 || Array.from(el.children).some((c) => transitions(c).length > 0)) || /::details-content/.test(Array.from(rulesOf(doc)).map((r) => r.rule.selectorText).join(' '));
    add('open', details.length === 1 ? help.selectorFor(details[0]!) : (group(details)[0]?.selector === 'details' ? 'details' : help.selectorFor(details[0]!.parentElement ?? details[0]!)), details, moving ? 'opens with a transition' : 'opens at once', moving);
  }
  const expanders = all('[aria-expanded][aria-controls]:not([aria-haspopup])').filter((el) => !el.closest('details'));
  if (expanders.length > 0) {
    const panels = expanders.map((el) => doc.getElementById(el.getAttribute('aria-controls') ?? '')).filter((p): p is HTMLElement => p !== null);
    const moving = panels.some((p) => transitions(p).length > 0);
    add('open', group(expanders)[0]!.selector, expanders, moving ? 'opens with a transition' : 'opens at once', moving);
  }

  // A highlight that moves to another tab or segment.
  for (const list of all('[role="tablist"]').slice(0, 2)) {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]')).filter(shown);
    if (tabs.length < 2) continue;
    const moving = tabs.some((t) => transitions(t).length > 0) || Array.from(list.children).some((c) => transitions(c).length > 0);
    add('select', help.selectorFor(list), tabs, moving ? 'the selected state changes with a transition' : 'the selected state jumps', moving);
  }

  // Something that opens over the page.
  const openers = all('[aria-haspopup],[popovertarget],[data-popover-target],[data-bs-toggle="dropdown"],[data-bs-toggle="modal"]');
  if (openers.length > 0) add('overlay', group(openers)[0]!.selector, openers, 'opens a menu, a popover or a dialog', false);

  // Cards that are clicked as a whole.
  const cards = all('article,[class*="card" i],li').filter((el) => {
    const links = el.querySelectorAll('a[href]');
    const box = boxOf(el);
    return box !== null && box.w > 140 && box.h > 90 && (el.closest('a[href]') !== null || links.length === 1);
  });
  for (const g of group(cards).filter((x) => x.els.length >= 3).slice(0, 1)) {
    const answered = g.els.some((el) => matchesAny(el, hovered));
    add('hover', g.selector, g.els, answered ? 'changes under the pointer' : 'nothing answers the pointer', answered);
  }

  // A group of like items that appears together.
  const grids = all('ul,ol,[class*="grid" i],[class*="list" i],[class*="cards" i]')
    .map((el) => ({ el, items: Array.from(el.children).filter((c) => shown(c) && (boxOf(c)?.h ?? 0) > 60) }))
    .filter((x) => x.items.length >= 3 && x.items.length <= 12 && new Set(x.items.map((c) => c.localName)).size === 1)
    .filter((x, _, list) => !list.some((other) => other !== x && other.el.contains(x.el)));
  for (const x of grids.slice(0, 2)) {
    const moving = x.items.some((c) => (styleOf(c).animationName ?? 'none') !== 'none');
    add('enter', help.selectorFor(x.el), x.items, moving ? 'the items appear with an animation' : 'the items are there at once', moving);
  }

  // Many short items in a row or grid: logos, tags, names.
  const strips = all('ul,ol,[class*="logos" i],[class*="brands" i],[class*="tags" i]')
    .map((el) => ({ el, items: Array.from(el.children).filter(shown) }))
    .filter((x) => x.items.length >= 8 && x.items.every((c) => (c.textContent ?? '').trim().length <= 24 && (boxOf(c)?.h ?? 0) <= 80));
  for (const x of strips.slice(0, 1)) add('ambient', help.selectorFor(x.el), x.items, 'a still grid of short items', false);

  // Links to other pages of the same site, where each is a page of its own.
  const here = view.location;
  const pages = all('a[href]').filter((a) => {
    const href = (a as HTMLAnchorElement).href;
    try {
      const u = new URL(href);
      return u.origin === here.origin && u.pathname !== here.pathname;
    } catch {
      return false;
    }
  });
  if (pages.length >= 3) {
    const named = /@view-transition/.test(Array.from(doc.querySelectorAll('style')).map((s) => s.textContent ?? '').join(' '));
    add('navigate', 'a[href]', pages, named ? 'pages change with a view transition' : 'pages change at once', named);
  }

  return {
    surface,
    tokens,
    motion: { transitions: transitioning, animations, durations: [...durations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n), reducedRules, libraries },
    moments,
  };
}
