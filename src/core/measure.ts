/**
 * What is measured of a page, and how two measurements are compared.
 *
 * The same measurement is taken twice: of the approved mockup before any code is written (the
 * answer key), and of the built page afterwards. A mockup and its implementation rarely share
 * markup, so elements are not paired by selector but by what a person would call them: their
 * role and their text ("heading: Learn to ship in a day"), or, for a painted box, the first
 * thing inside it.
 */

/**
 * Raised whenever elements are named, placed or styled differently than before. An answer key
 * taken by another version cannot be compared with a measurement of this one.
 */
export const MEASURE_VERSION = 3;

export type Kind = 'text' | 'control' | 'image' | 'box';

export interface ElementMeasure {
  /** How the element is paired with its counterpart, e.g. `heading "Plans"` or `box around heading "Week"`. */
  key: string;
  kind: Kind;
  /** Box relative to the top-left corner of its area, in CSS pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  style: Record<string, string>;
  /** A text that tells the time ("36m", "3 minutes ago", "10:28 AM"): it changes by itself, and its width with it. */
  live?: boolean;
}

export interface AreaMeasure {
  id: string;
  found: boolean;
  /**
   * The box around everything that is drawn in the area, in the page, from the top-left of the
   * document. Not the box of the element that holds the area: a mockup and its implementation
   * wrap their content differently, and what is drawn is what a person approved.
   */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Empty space between this area and the one above it (or the top of the page). Only measured at the top of the page. */
  above?: number;
  elements: ElementMeasure[];
  /** What moves in the area: every transition and animation that is declared in it. Absent in keys taken before motion was measured. */
  motion?: MotionSign[];
  /** The same for people who asked for less motion. */
  reduced?: MotionSign[];
}

/** One declared movement: what changes, for how long, along which curve. Elements are not named: an implementation may put it on another one. */
export interface MotionSign {
  /** The property that changes, or "animation" for keyframes. */
  on: string;
  /** Milliseconds; 0 for an animation that scrolling drives. */
  ms: number;
  delay: number;
  easing: string;
  /** Animations: how many times it runs ("3", "infinite"), and "scroll" if scrolling drives it. */
  runs?: string;
}

const round = (n: number) => Math.round(n * 2) / 2;
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

const TEXT_STYLE = ['color', 'font-size', 'font-weight', 'line-height', 'text-align', 'text-transform', 'text-decoration-line', 'letter-spacing'];
const BOX_STYLE = ['background-color', 'border-top-left-radius', 'opacity'];
const LAYOUT_STYLE = ['display', 'flex-direction', 'justify-content', 'align-items'];
const SIDES = ['top', 'right', 'bottom', 'left'];

function role(el: Element): string {
  const tag = el.localName;
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'a' || tag === 'button' || tag === 'summary' || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return 'action';
  if (tag === 'label' || tag === 'legend') return 'label';
  if (tag === 'li' || tag === 'dt' || tag === 'dd') return 'item';
  if (tag === 'th' || tag === 'td') return 'cell';
  return 'text';
}

const CONTROLS = new Set(['input', 'select', 'textarea', 'img', 'svg', 'picture', 'video', 'canvas']);

/** True if the element holds text itself, not only through its children. */
function hasOwnText(el: Element): boolean {
  return Array.from(el.childNodes).some((node) => node.nodeType === 3 && (node.nodeValue ?? '').trim() !== '');
}

/**
 * The text of an element as a person reads it: its own text together with the text of the inline
 * elements in it. "Sent to <span>mina@example.com</span>." is one sentence, however it is marked up.
 */
function readText(el: Element, view: Window): string {
  let text = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) text += node.nodeValue ?? '';
    else if (node.nodeType === 1) {
      const child = node as Element;
      if (CONTROLS.has(child.localName)) continue;
      const cs = view.getComputedStyle(child);
      if (cs.display.startsWith('inline') && cs.visibility !== 'hidden') text += readText(child, view);
    }
  }
  return text;
}

/** An inline element that only marks up part of a sentence: it looks like the text around it and does nothing. */
function plainInline(el: Element, cs: CSSStyleDeclaration, parent: CSSStyleDeclaration): boolean {
  if (cs.display !== 'inline' || role(el) === 'action' || painted(cs)) return false;
  return ['color', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-decoration-line', 'text-transform'].every((name) => cs.getPropertyValue(name) === parent.getPropertyValue(name));
}

function painted(cs: CSSStyleDeclaration): boolean {
  const clear = (c: string) => c === 'transparent' || /rgba?\([^)]*,\s*0\)$/.test(c);
  if (!clear(cs.backgroundColor) || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none') return true;
  return SIDES.some((side) => parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0 && !clear(cs.getPropertyValue(`border-${side}-color`)));
}

function styleOf(cs: CSSStyleDeclaration, kind: Kind): Record<string, string> {
  const out: Record<string, string> = {};
  const take = (names: string[]) => {
    for (const name of names) out[name] = cs.getPropertyValue(name);
  };
  if (kind === 'text' || kind === 'control') {
    take(TEXT_STYLE);
    out['font-family'] = (cs.fontFamily.split(',')[0] ?? '').replace(/["']/g, '').trim().toLowerCase();
  }
  if (kind !== 'image') {
    take(BOX_STYLE);
    out.padding = SIDES.map((side) => cs.getPropertyValue(`padding-${side}`)).join(' ');
    const widths = SIDES.map((side) => cs.getPropertyValue(`border-${side}-width`));
    out.border = widths.every((w) => parseFloat(w) === 0) ? 'none' : `${widths.join(' ')} ${cs.borderTopStyle} ${cs.borderTopColor}`;
    out['box-shadow'] = cs.boxShadow === 'none' ? 'none' : 'yes';
  }
  if (kind === 'box') {
    take(LAYOUT_STYLE);
    if (cs.display.includes('flex') || cs.display.includes('grid')) out.gap = cs.gap;
    if (cs.display.includes('grid')) out.columns = String(cs.gridTemplateColumns.split(/\s+/).filter(Boolean).length);
  }
  return out;
}

/**
 * Texts that tell the time. On a running page they are not the same a minute later, so a text
 * that is nothing but a time is paired as "a time", and a time inside a sentence is left out of
 * what the sentence is paired by.
 */
const WHOLE_TIME = [
  /^(\d+\s?(s|secs?|m|mins?|h|hrs?|d|w|wks?|mo|y|yrs?)\.?\s?){1,3}( ago)?$/i,
  /^(just now|now|moments ago|a moment ago|yesterday|today)$/i,
  /^(\d+\s?(초|분|시간|일|주|개월|달|년)\s?){1,2}전$/,
  /^(방금|방금 전|어제|오늘)$/,
];
const TIME_PART = [
  /\b(?:an?|\d+) (?:seconds?|minutes?|hours?|days?|weeks?|months?|years?) ago\b/gi,
  /\bin (?:an?|\d+) (?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/gi,
  /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]\.?M\.?)?(?![\d:])/gi,
];
const A_TIME = '(a time)';

/** The text as it is paired, and whether a time was taken out of it. */
export function withoutTimes(text: string): { text: string; live: boolean } {
  if (WHOLE_TIME.some((re) => re.test(text))) return { text: A_TIME, live: true };
  let out = text;
  for (const re of TIME_PART) out = out.replace(re, A_TIME);
  return { text: out, live: out !== text };
}

/**
 * The order in which a person reads what is drawn: line by line, left to right. Things that are
 * told apart by a number ("picture 2", the second "Done") are numbered in this order, not in the
 * order of the markup: a page that looks the same may be written in another order.
 */
function readingOrder(rects: DOMRect[]): number[] {
  const byTop = rects.map((_, i) => i).sort((a, b) => rects[a]!.top - rects[b]!.top || rects[a]!.left - rects[b]!.left);
  const lines: number[][] = [];
  for (const i of byTop) {
    const line = lines[lines.length - 1];
    const first = line ? rects[line[0]!]! : null;
    const r = rects[i]!;
    // On the line of its first element: the two overlap by more than half of the lower one of them.
    if (line && first && Math.min(first.bottom, r.bottom) - Math.max(first.top, r.top) > Math.min(first.height, r.height) / 2) line.push(i);
    else lines.push([i]);
  }
  return lines.flatMap((line) => line.sort((a, b) => rects[a]!.left - rects[b]!.left || rects[a]!.top - rects[b]!.top));
}

/**
 * Measure one area: every piece of text, control, picture and painted box in it, placed relative
 * to the box around all of them. Returns that box in screen coordinates. With `live`, the area is
 * part of a running page whose times move on by themselves.
 */
export function measureArea(root: Element, live = false): { x: number; y: number; w: number; h: number; elements: ElementMeasure[] } {
  const view = root.ownerDocument.defaultView!;
  const found: Array<{ el: Element; kind: Kind; base: string; live?: boolean }> = [];
  const walk = (el: Element, inText: CSSStyleDeclaration | null) => {
    const tag = el.localName;
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'noscript') return;
    const cs = view.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.getClientRects().length === 0) return;
    if (tag === 'img' || tag === 'svg' || tag === 'picture' || tag === 'video' || tag === 'canvas') {
      found.push({ el, kind: 'image', base: 'picture' });
      return; // what is inside a picture is the picture
    }
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      const input = el as HTMLInputElement;
      const type = tag === 'input' ? input.type : tag;
      if (type === 'hidden') return;
      if (type === 'submit' || type === 'button' || type === 'reset') found.push({ el, kind: 'text', base: `action "${squash(input.value).slice(0, 60)}"` });
      else {
        const name = squash(input.labels?.[0]?.textContent ?? '') || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '';
        found.push({ el, kind: 'control', base: `${type} field${name ? ` "${name.slice(0, 60)}"` : ''}` });
      }
      return;
    }
    // A span that looks like its sentence is part of that sentence, not a thing of its own.
    const part = inText !== null && plainInline(el, cs, inText);
    const text = part ? '' : hasOwnText(el) ? squash(readText(el, view)) : '';
    if (text) {
      const timed = live ? withoutTimes(text) : { text, live: false };
      found.push({ el, kind: 'text', base: timed.text === A_TIME ? `${role(el)} ${A_TIME}` : `${role(el)} "${timed.text.slice(0, 60)}"`, ...(timed.live ? { live: true } : {}) });
    }
    else if (!part && painted(cs)) found.push({ el, kind: 'box', base: '' });
    const within = text || part ? (part ? inText : cs) : null;
    for (const child of Array.from(el.children)) walk(child, within);
  };
  walk(root, null);

  const rects = found.map(({ el }) => el.getBoundingClientRect());
  // A painted box is named after the first thing a person reads in it; a picture by where it stands among the pictures.
  const order = readingOrder(rects);
  const pictures = order.filter((i) => found[i]!.kind === 'image');
  const nameOf = (i: number) => (found[i]!.kind === 'image' ? `picture ${pictures.indexOf(i) + 1}` : found[i]!.base);
  for (const item of found) {
    if (item.kind !== 'box') continue;
    const inside = order.find((i) => found[i] !== item && found[i]!.kind !== 'box' && item.el.contains(found[i]!.el));
    item.base = inside !== undefined ? `box around ${nameOf(inside)}` : 'empty box';
  }
  const outer = root.getBoundingClientRect();
  const left = rects.length ? Math.min(...rects.map((r) => r.left)) : outer.left;
  const top = rects.length ? Math.min(...rects.map((r) => r.top)) : outer.top;
  const right = rects.length ? Math.max(...rects.map((r) => r.right)) : outer.right;
  const bottom = rects.length ? Math.max(...rects.map((r) => r.bottom)) : outer.bottom;
  // Numbered in the order they are read. Pictures always carry their number: "picture 1".
  const seen = new Map<string, number>();
  const keys: string[] = [];
  for (const i of order) {
    const { base, kind } = found[i]!;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    keys[i] = kind === 'image' ? `${base} ${n}` : n === 1 ? base : `${base} (${n})`;
  }
  const elements = found.map(({ el, kind, live: isLive }, i) => {
    const r = rects[i]!;
    return {
      key: keys[i]!,
      kind,
      x: round(r.left - left),
      y: round(r.top - top),
      w: round(r.width),
      h: round(r.height),
      style: styleOf(view.getComputedStyle(el), kind),
      ...(isLive ? { live: true } : {}),
    };
  });
  return { x: left, y: top, w: right - left, h: bottom - top, elements };
}

const toMs = (value: string): number => {
  const m = /^(-?[\d.]+)(ms|s)$/.exec(value.trim());
  return m ? Math.round(Number(m[1]) * (m[2] === 's' ? 1000 : 1)) : 0;
};
const list = (value: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out;
};

/** The transitions and animations a computed style declares. Nothing has to be playing for them to be read. */
function signsOf(cs: CSSStyleDeclaration): MotionSign[] {
  const out: MotionSign[] = [];
  const at = (values: string[], i: number) => values[i % values.length] ?? '';
  const durations = list(cs.transitionDuration || '0s');
  if (durations.some((d) => toMs(d) > 0)) {
    const properties = list(cs.transitionProperty || 'all');
    const delays = list(cs.transitionDelay || '0s');
    const easings = list(cs.transitionTimingFunction || 'ease');
    properties.forEach((property, i) => {
      const ms = toMs(at(durations, i));
      if (ms > 0 && property !== 'none') out.push({ on: property, ms, delay: toMs(at(delays, i)), easing: at(easings, i) });
    });
  }
  const names = list(cs.animationName || 'none');
  if (names.some((n) => n !== 'none')) {
    const times = list(cs.animationDuration || '0s');
    const delays = list(cs.animationDelay || '0s');
    const easings = list(cs.animationTimingFunction || 'ease');
    const counts = list(cs.animationIterationCount || '1');
    const timeline = (cs as unknown as { animationTimeline?: string }).animationTimeline ?? 'auto';
    names.forEach((name, i) => {
      if (name === 'none') return;
      const scrolled = at(list(timeline), i) !== 'auto' && at(list(timeline), i) !== '';
      out.push({ on: 'animation', ms: scrolled ? 0 : toMs(at(times, i)), delay: toMs(at(delays, i)), easing: at(easings, i), runs: scrolled ? 'scroll' : at(counts, i) });
    });
  }
  return out;
}

const signKey = (s: MotionSign) => `${s.on}|${s.ms}|${s.delay}|${s.easing}|${s.runs ?? ''}`;

/**
 * Everything that is declared to move in an area: on its elements and on what they generate
 * (::before, ::after, the content of a details element). Each different movement is listed once.
 */
export function measureMotion(root: Element): MotionSign[] {
  const view = root.ownerDocument.defaultView!;
  const found = new Map<string, MotionSign>();
  const take = (cs: CSSStyleDeclaration | null) => {
    if (!cs) return;
    for (const sign of signsOf(cs)) found.set(signKey(sign), sign);
  };
  const pseudo = (el: Element, name: string) => {
    try {
      const cs = view.getComputedStyle(el, name);
      // A pseudo-element that is not there reports the style of its element, or none.
      return cs.content !== 'none' || name === '::details-content' ? cs : null;
    } catch {
      return null;
    }
  };
  for (const el of [root, ...Array.from(root.querySelectorAll('*')).slice(0, 3000)]) {
    const tag = el.localName;
    if (tag === 'script' || tag === 'style' || tag === 'template') continue;
    take(view.getComputedStyle(el));
    take(pseudo(el, '::before'));
    take(pseudo(el, '::after'));
    if (tag === 'details') take(pseudo(el, '::details-content'));
  }
  return [...found.values()].sort((a, b) => signKey(a).localeCompare(signKey(b)));
}

/** "transform 160ms cubic-bezier(0.22, 1, 0.36, 1)", the way a difference names a movement. */
export function describeSign(s: MotionSign): string {
  if (s.on === 'animation') return s.runs === 'scroll' ? `an animation driven by scrolling` : `an animation of ${s.ms} ms, ${s.easing}, ${s.runs === 'infinite' ? 'running on and on' : `${s.runs ?? '1'} run${s.runs === '1' || s.runs === undefined ? '' : 's'}`}${s.delay ? `, after ${s.delay} ms` : ''}`;
  return `${s.on} ${s.ms} ms ${s.easing}${s.delay ? ` after ${s.delay} ms` : ''}`;
}

/** Two movements are the same if they change the same thing along the same curve in about the same time. */
function sameSign(a: MotionSign, b: MotionSign): boolean {
  const close = (x: number, y: number) => Math.abs(x - y) <= Math.max(10, Math.abs(x) * 0.05);
  return a.on === b.on && a.easing.replace(/\s+/g, '') === b.easing.replace(/\s+/g, '') && close(a.ms, b.ms) && close(a.delay, b.delay) && (a.runs ?? '') === (b.runs ?? '');
}

/** What moves differently than approved: one difference per movement that is missing, changed or added. */
function compareMotion(approved: MotionSign[], built: MotionSign[], property: 'motion' | 'reduced motion', add: (element: string | null, property: string, a: string, b: string) => void, extras: boolean): void {
  const rest = [...built];
  const missing: MotionSign[] = [];
  for (const mine of approved) {
    const i = rest.findIndex((other) => sameSign(mine, other));
    if (i >= 0) rest.splice(i, 1);
    else missing.push(mine);
  }
  for (const mine of missing) {
    // The same thing moving in another time or along another curve is one difference, not a missing and an extra one.
    const i = rest.findIndex((other) => other.on === mine.on);
    if (i >= 0) add(null, property, describeSign(mine), describeSign(rest.splice(i, 1)[0]!));
    else add(null, property, describeSign(mine), 'nothing');
  }
  // On a new screen the mockup is drawn with a kit and the page with the project's own components,
  // which move in ways a mockup does not show: there, only what was approved is looked for.
  if (extras) for (const extra of rest) add(null, property, 'nothing', describeSign(extra));
}

// ---------------------------------------------------------------------------------------------
// Comparing
// ---------------------------------------------------------------------------------------------

export interface Difference {
  viewport: string;
  cut: string;
  area: string;
  /** The element the difference is about, or null for the area as a whole. */
  element: string | null;
  /** "missing", "extra", "position", "size", "pixels", "cut" or the name of a style property. */
  property: string;
  approved: string;
  built: string;
}

export interface Tolerance {
  /** Pixels a position or size may be off. */
  px: number;
  /** Share of an area's pixels that may differ in its picture, 0 to 1. */
  pixels: number;
}

export const TOLERANCE: Tolerance = { px: 3, pixels: 0.03 };

const near = (a: number, b: number, px: number) => Math.abs(a - b) <= Math.max(px, Math.abs(a) * 0.015);

/** "12px 16px" and "12.2px 16px" are the same to the eye; "rgb(0, 0, 0)" and "rgb(0,0,0)" are the same value. */
function sameStyle(a: string, b: string): boolean {
  if (a === b) return true;
  const parts = (s: string) => s.replace(/,\s*/g, ',').split(/\s+/);
  const pa = parts(a);
  const pb = parts(b);
  if (pa.length !== pb.length) return false;
  return pa.every((x, i) => {
    const y = pb[i]!;
    if (x === y) return true;
    const nx = /^(-?[\d.]+)(px)?$/.exec(x);
    const ny = /^(-?[\d.]+)(px)?$/.exec(y);
    return Boolean(nx && ny && nx[2] === ny[2] && Math.abs(Number(nx[1]) - Number(ny[1])) <= 0.75);
  });
}

/** Differences between an approved area and the built one. An empty list means they agree. */
export function compareArea(approved: AreaMeasure, built: AreaMeasure | undefined, at: { viewport: string; cut: string }, tolerance: Tolerance = TOLERANCE, opts: { extraMotion?: boolean } = {}): Difference[] {
  const out: Difference[] = [];
  const add = (element: string | null, property: string, a: string, b: string) => out.push({ ...at, area: approved.id, element, property, approved: a, built: b });
  if (!approved.found) return out;
  if (!built || !built.found) {
    add(null, 'missing', 'on the page', 'not found');
    return out;
  }
  const theirs = new Map(built.elements.map((e) => [e.key, e]));
  // Most differences cause others: a larger font makes its element larger and moves everything
  // after it. Only causes are reported; what follows from them shows up again if it stays after a fix.
  let moved = false;
  for (const mine of approved.elements) {
    const other = theirs.get(mine.key);
    if (!other) {
      // A box that is missing shows in its styles: say what it was.
      add(mine.key, 'missing', mine.kind === 'box' ? `${mine.style['background-color']}, border ${mine.style.border}` : 'present', 'not found');
      moved = true;
      continue;
    }
    theirs.delete(mine.key);
    const before = out.length;
    for (const [name, value] of Object.entries(mine.style)) {
      const got = other.style[name] ?? '';
      if (sameStyle(value, got)) continue;
      if (name === 'line-height' && !sameStyle(mine.style['font-size'] ?? '', other.style['font-size'] ?? '')) continue; // follows from the font size
      add(mine.key, name, value, got);
    }
    if (out.length > before) {
      moved = true;
    } else if (mine.live || other.live) {
      // A time is as wide as its digits: only its line and its height are held against the approved page.
      if (!near(mine.h, other.h, tolerance.px) || !near(mine.y, other.y, tolerance.px)) {
        if (!moved) add(mine.key, 'position', `${mine.x}, ${mine.y}px`, `${other.x}, ${other.y}px`);
        moved = true;
      }
    } else if (!near(mine.w, other.w, tolerance.px) || !near(mine.h, other.h, tolerance.px)) {
      if (!moved) add(mine.key, 'size', `${mine.w}×${mine.h}px`, `${other.w}×${other.h}px`);
      moved = true;
    } else if (!moved && (!near(mine.x, other.x, tolerance.px) || !near(mine.y, other.y, tolerance.px))) {
      add(mine.key, 'position', `${mine.x}, ${mine.y}px`, `${other.x}, ${other.y}px`);
      moved = true;
    }
  }
  // Extra boxes are usually wrappers; extra text, controls and pictures are things the person did not approve.
  for (const extra of theirs.values()) if (extra.kind !== 'box') add(extra.key, 'extra', 'not there', 'present');
  // What moves was approved too, and so was what people get who asked for less of it. A key taken before motion was measured says nothing about it.
  const extra = opts.extraMotion !== false;
  if (approved.motion && built.motion) compareMotion(approved.motion, built.motion, 'motion', add, extra);
  if (approved.reduced && built.reduced) compareMotion(approved.reduced, built.reduced, 'reduced motion', add, extra);
  const still = out.filter((d) => d.property !== 'motion' && d.property !== 'reduced motion').length;
  // The area as a whole is only named when nothing inside it explains the difference.
  if (still === 0) {
    if (!near(approved.w, built.w, tolerance.px) || !near(approved.h, built.h, tolerance.px)) add(null, 'size', `${approved.w}×${approved.h}px`, `${built.w}×${built.h}px`);
    else if (!near(approved.x, built.x, tolerance.px)) add(null, 'position', `${approved.x}px from the left`, `${built.x}px from the left`);
    else if (approved.above !== undefined && built.above !== undefined && !near(approved.above, built.above, tolerance.px + 1)) add(null, 'space above', `${approved.above}px`, `${built.above}px`);
  }
  return out;
}

/** One line per difference, the way "check" prints it. */
export function describeDifference(d: Difference): string {
  const where = `${d.area} · ${d.viewport} · ${d.cut}`;
  const what = d.element ?? 'the area';
  switch (d.property) {
    case 'missing':
      return `${where}: ${what} is missing (approved: ${d.approved})`;
    case 'extra':
      return `${where}: ${what} is not in the approved page`;
    case 'cut':
      return `${where}: this moment could not be reached on the built page (${d.built})`;
    case 'pixels':
      return `${where}: the picture differs in ${d.built} of its pixels (allowed: ${d.approved})`;
    case 'motion':
    case 'reduced motion': {
      const who = d.property === 'motion' ? '' : ' with reduced motion';
      if (d.built === 'nothing') return `${where}: approved${who}: ${d.approved}. The built page does not have it`;
      if (d.approved === 'nothing') return `${where}: the built page has${who}: ${d.built}. That was not approved`;
      return `${where}: moves${who} as ${d.built}, approved ${d.approved}`;
    }
    default:
      return `${where}: ${what} ${d.property} ${d.built}, approved ${d.approved}`;
  }
}
