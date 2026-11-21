/**
 * What a style sheet says about movement, read from its text without a browser: which properties
 * it changes over time, for how long, and whether it has an answer for people who asked for less
 * motion. Used by "validate" to warn about motion that breaks the floor every option has to clear.
 */

export interface MotionFacts {
  /** Properties named by transitions; "all" if a transition names none. */
  transitions: Array<{ property: string; ms: number }>;
  /** Animations by name, with how long one run takes and how many runs there are. */
  animations: Array<{ name: string; ms: number; runs: number }>;
  /** Properties changed inside @keyframes. */
  keyframeProperties: string[];
  /** The longest single transition or animation run, in milliseconds. */
  longest: number;
  /** There is a rule for prefers-reduced-motion. */
  reducedAware: boolean;
  /** Something can pause what runs by itself (animation-play-state: paused). */
  pausable: boolean;
}

/** Properties whose change is a fade or a change of color, not movement. */
const STILL = new Set(['opacity', 'color', 'background-color', 'border-color', 'outline-color', 'fill', 'stroke', 'box-shadow', 'filter', 'visibility', 'content-visibility', 'text-decoration-color', 'backdrop-filter']);
/** Properties that make the browser lay the page out again on every frame. */
const LAYOUT = /^(width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|inset|inset-.*|margin|margin-.*|padding|padding-.*|font-size|line-height|border-width|gap)$/;

const time = (token: string): number | null => {
  const m = /^(-?\d*\.?\d+)(ms|s)$/.exec(token);
  return m ? Math.round(Number(m[1]) * (m[2] === 's' ? 1000 : 1)) : null;
};

/** Split on commas that are not inside parentheses: "opacity .2s, transform .2s cubic-bezier(.2, 0, 0, 1)". */
function items(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(value.slice(start, i));
      start = i + 1;
    }
  }
  out.push(value.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

const tokens = (item: string) => item.replace(/\([^)]*\)/g, (m) => m.replace(/\s+/g, '')).split(/\s+/).filter(Boolean);
const KEYWORDS = /^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|normal|reverse|alternate|alternate-reverse|none|forwards|backwards|both|running|paused|infinite|allow-discrete|all|initial|inherit|unset)$/;

export function motionFacts(css: string): MotionFacts {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const facts: MotionFacts = { transitions: [], animations: [], keyframeProperties: [], longest: 0, reducedAware: /prefers-reduced-motion/.test(flat), pausable: /animation-play-state\s*:\s*paused/.test(flat) };

  // Keyframes first, and out of the way: their declarations are not rules of the page.
  const rest = flat.replace(/@keyframes\s+[^{]+\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g, (_, body: string) => {
    for (const m of body.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:/g)) if (!facts.keyframeProperties.includes(m[1]!)) facts.keyframeProperties.push(m[1]!);
    return '';
  });

  // "transition-property" and "transition-duration" written apart belong together, in order.
  const named: string[] = [];
  const timed: number[] = [];
  for (const m of rest.matchAll(/(?:^|[;{\s])(transition|animation)(-[a-z-]+)?\s*:\s*([^;}]+)/g)) {
    const [kind, sub, value] = [m[1]!, m[2] ?? '', m[3]!.replace(/!important/g, '').trim()];
    if (/^(none|initial|inherit|unset)$/.test(value)) continue;
    if (kind === 'transition' && (sub === '' || sub === '-property' || sub === '-duration')) {
      for (const item of items(value)) {
        const parts = tokens(item);
        const times = parts.map(time).filter((t): t is number => t !== null);
        const property = parts.find((p) => time(p) === null && !p.includes('(') && !/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|allow-discrete|normal)$/.test(p)) ?? 'all';
        if (sub === '-property') named.push(property);
        else if (sub === '-duration') timed.push(times[0] ?? 0);
        else if (times.length > 0 && times[0]! > 0) facts.transitions.push({ property, ms: times[0]! });
      }
    } else if (kind === 'animation' && (sub === '' || sub === '-duration' || sub === '-iteration-count')) {
      for (const item of items(value)) {
        const parts = tokens(item);
        const times = parts.map(time).filter((t): t is number => t !== null);
        const count = parts.find((p) => p === 'infinite' || /^\d+(\.\d+)?$/.test(p));
        const name = parts.find((p) => time(p) === null && !p.includes('(') && !KEYWORDS.test(p) && !/^\d/.test(p)) ?? '';
        if (sub === '-iteration-count') {
          if (count === 'infinite') facts.animations.push({ name: '', ms: 0, runs: Infinity });
        } else if (times.length > 0 && times[0]! > 0) {
          facts.animations.push({ name, ms: times[0]!, runs: count === 'infinite' ? Infinity : count ? Number(count) : 1 });
        } else if (sub === '' && name && /animation-timeline/.test(rest)) {
          facts.animations.push({ name, ms: 0, runs: 1 }); // driven by scrolling: it has no time of its own
        }
      }
    }
  }
  for (const [i, ms] of timed.entries()) if (ms > 0) facts.transitions.push({ property: named[i] ?? named.at(-1) ?? 'all', ms });
  facts.longest = Math.max(0, ...facts.transitions.map((t) => t.ms), ...facts.animations.map((a) => a.ms));
  return facts;
}

/** Whether these facts describe movement (something travels, grows or turns), and not only a fade. */
export function moves(facts: MotionFacts): boolean {
  const moving = (property: string) => property === 'all' || !STILL.has(property);
  return facts.transitions.some((t) => moving(t.property)) || facts.keyframeProperties.some(moving);
}

export interface MotionIssue {
  code: 'MOTION_NO_REDUCED' | 'MOTION_LAYOUT' | 'MOTION_ALL' | 'MOTION_SLOW' | 'MOTION_ENDLESS';
  message: string;
}

/** The range a catalog pattern gives for one run, in milliseconds. */
export interface MotionRange {
  id: string;
  duration?: [number, number];
}

/**
 * Check the motion of one style sheet against the floor: an answer for reduced motion, no layout
 * work on every frame, inside the time its pattern allows, and nothing that runs on with no pause.
 */
export function lintMotion(css: string, pattern?: MotionRange): MotionIssue[] {
  const facts = motionFacts(css);
  const out: MotionIssue[] = [];
  if (facts.transitions.length === 0 && facts.animations.length === 0) return out;

  if (moves(facts) && !facts.reducedAware) {
    out.push({ code: 'MOTION_NO_REDUCED', message: 'something moves, grows or turns, and there is no rule for people who asked for less motion. Add @media (prefers-reduced-motion: reduce) { … } that keeps the change and drops the movement.' });
  }
  if (facts.transitions.some((t) => t.property === 'all' && t.ms > 0)) {
    out.push({ code: 'MOTION_ALL', message: 'a transition names no property, so every change of the element is animated, also those that should be instant. Name what moves: "transition: transform 160ms …".' });
  }
  const layout = [...new Set([...facts.transitions.filter((t) => t.ms > 0).map((t) => t.property), ...facts.keyframeProperties].filter((p) => LAYOUT.test(p)))];
  if (layout.length > 0) {
    out.push({ code: 'MOTION_LAYOUT', message: `"${layout.join('", "')}" is animated, which lays the page out again on every frame. Move with transform, and open to a content's height with grid-template-rows or interpolate-size.` });
  }
  const max = pattern?.duration?.[1];
  if (max !== undefined && facts.longest > max) {
    out.push({ code: 'MOTION_SLOW', message: `the longest run is ${facts.longest} ms; pattern "${pattern!.id}" allows up to ${max} ms. Motion that only works slowly is not right for this moment.` });
  }
  const endless = facts.animations.some((a) => a.runs === Infinity || a.ms * a.runs > 5000);
  if (endless && !facts.pausable) {
    out.push({ code: 'MOTION_ENDLESS', message: 'something moves by itself for more than five seconds and nothing pauses it. Stop it after a few runs, or pause it on hover and focus (animation-play-state: paused), unless it reports progress.' });
  }
  return out;
}

/**
 * A style sheet as people who asked for less motion get it, without changing their system
 * setting: its rules for reduced motion apply and its rules for no preference do not. Used by the
 * review to show the reduced form of an option. The page's own style sheets are not touched.
 */
export function asReduced(css: string, on: boolean): string {
  if (!on) return css;
  return css.replace(/\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g, '(min-width: 0px)').replace(/\(\s*prefers-reduced-motion\s*(:\s*no-preference\s*)?\)/g, '(max-width: 0px)');
}

