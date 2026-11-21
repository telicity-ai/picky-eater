import type { Area, Board } from '../core/schema.js';
import { standingEvents, type Offered, type TasteEvent, type TasteRule } from './store.js';

/**
 * From recorded choices to a preference between two options.
 *
 * A choice says "this one, over each of the others that were offered with it". It is kept as
 * pairs, at two levels at once: the patterns ("hero-centered over hero-split") and, where both
 * options are motions, how much they move ("no motion over subtle motion"). Pairs of the second
 * kind add up across decisions, which is how a habit becomes visible.
 *
 * The same project counts in full and from the first choice. Other projects count for half, and
 * only once a pair has repeated: a weight of 3 or more, from at least 2 projects.
 */

/** Choosing against the mark is a correction; choosing with it is weaker, because the mark itself pulls. */
export const WEIGHT = { override: 2, accept: 1, rule: 3 };
export const HALF_LIFE_DAYS = 180;
/** What other projects must add up to before a pair counts everywhere. */
export const GENERAL = { weight: 3, projects: 2, factor: 0.5 };
/** How far ahead of the agent's suggestion another option must be for the mark to move. */
export const LEAD = 0.75;

interface Pair {
  here: number;
  hereTimes: number;
  /** Weight per other project. */
  elsewhere: Map<string, number>;
  elsewhereTimes: number;
  /** A rule the person kept for all projects. */
  ruled: number;
  rule?: string;
}

export interface Evidence {
  project: string;
  pairs: Map<string, Pair>;
}

const INTENSITY_WORDS: Record<string, string> = { none: 'no motion', subtle: 'subtle motion', moderate: 'moderate motion', expressive: 'expressive motion' };

/** The keys under which "a over b" is remembered. Keys about leaving the page as it is stay in their project. */
function keysOf(a: Offered, b: Offered): Array<{ key: string; local: boolean }> {
  const out: Array<{ key: string; local: boolean }> = [];
  if (a.pattern && b.pattern && a.pattern !== b.pattern) out.push({ key: `p:${a.pattern}>p:${b.pattern}`, local: false });
  else if (a.keep && !a.pattern && b.pattern) out.push({ key: `keep>p:${b.pattern}`, local: true });
  else if (b.keep && !b.pattern && a.pattern) out.push({ key: `p:${a.pattern}>keep`, local: true });
  if (a.intensity && b.intensity && a.intensity !== b.intensity) out.push({ key: `i:${a.intensity}>i:${b.intensity}`, local: false });
  return out;
}

const pairOf = (ev: Evidence, key: string): Pair => {
  let p = ev.pairs.get(key);
  if (!p) ev.pairs.set(key, (p = { here: 0, hereTimes: 0, elsewhere: new Map(), elsewhereTimes: 0, ruled: 0 }));
  return p;
};

/** Everything that is known, seen from one project. */
export function gather(events: TasteEvent[], rules: TasteRule[], project: string, now = Date.now()): Evidence {
  const ev: Evidence = { project, pairs: new Map() };
  const fade = (at: string) => {
    const days = Math.max(0, (now - Date.parse(at)) / 86_400_000);
    return Number.isFinite(days) ? 0.5 ** (days / HALF_LIFE_DAYS) : 0;
  };
  const add = (key: string, local: boolean, from: string, weight: number) => {
    const p = pairOf(ev, key);
    if (from === project) {
      p.here += weight;
      p.hereTimes++;
    } else if (!local) {
      p.elsewhere.set(from, (p.elsewhere.get(from) ?? 0) + weight);
      p.elsewhereTimes++;
    }
  };
  for (const e of standingEvents(events)) {
    const chosen = e.offered.find((o) => o.option === e.chosen);
    if (!chosen) continue;
    const weight = (e.suggested !== null && e.suggested !== e.chosen ? WEIGHT.override : WEIGHT.accept) * fade(e.at);
    // One choice says each thing once, however many of the other options share a pattern.
    const said = new Set<string>();
    for (const other of e.offered) {
      if (other.option === e.chosen) continue;
      for (const { key, local } of keysOf(chosen, other)) {
        if (said.has(key)) continue;
        said.add(key);
        add(key, local, e.project, weight);
      }
    }
  }
  for (const r of rules) {
    if (r.status !== 'kept' || !r.prefer || !r.over) continue;
    const key = `p:${r.prefer}>p:${r.over}`;
    const weight = WEIGHT.rule * fade(r.at);
    if (r.scope === 'general') {
      const p = pairOf(ev, key);
      p.ruled += weight;
      p.rule = r.text;
    } else if (r.project === project) {
      const p = pairOf(ev, key);
      p.here += weight;
      p.hereTimes++;
      p.rule = r.text;
    }
  }
  return ev;
}

export interface Strength {
  /** What the pair is worth in a ranking. */
  value: number;
  here: number;
  hereTimes: number;
  /** The weight from other projects, if it has repeated often enough to count; otherwise 0. */
  general: number;
  /** The weight from other projects whether it counts or not, and how many projects. */
  elsewhere: number;
  projects: number;
  elsewhereTimes: number;
  rule?: string;
}

export function strength(ev: Evidence, key: string): Strength {
  const p = ev.pairs.get(key);
  if (!p) return { value: 0, here: 0, hereTimes: 0, general: 0, elsewhere: 0, projects: 0, elsewhereTimes: 0 };
  const elsewhere = [...p.elsewhere.values()].reduce((a, b) => a + b, 0);
  const repeated = elsewhere >= GENERAL.weight && p.elsewhere.size >= GENERAL.projects;
  const general = (repeated ? elsewhere : 0) + p.ruled;
  return { value: p.here + GENERAL.factor * general, here: p.here, hereTimes: p.hereTimes, general, elsewhere, projects: p.elsewhere.size, elsewhereTimes: p.elsewhereTimes, ...(p.rule ? { rule: p.rule } : {}) };
}

export interface Ranked {
  option: string;
  score: number;
  /** The pair that speaks most for this option, if any does. */
  best: { against: string; key: string; strength: Strength } | null;
}

/** The offered options, best first by what the person chose before. Without evidence every score is 0. */
export function rank(offered: Offered[], ev: Evidence): Ranked[] {
  const out = offered.map((c) => {
    let score = 0;
    let best: Ranked['best'] = null;
    let bestGain = 0;
    for (const o of offered) {
      if (o.option === c.option) continue;
      for (const { key } of keysOf(c, o)) {
        const s = strength(ev, key);
        score += s.value;
        if (s.value > bestGain) {
          bestGain = s.value;
          best = { against: o.option, key, strength: s };
        }
      }
      for (const { key } of keysOf(o, c)) score -= strength(ev, key).value;
    }
    return { option: c.option, score, best };
  });
  return out.sort((a, b) => b.score - a.score);
}

const times = (n: number) => (n <= 1 ? '' : n === 2 ? ' twice' : ` ${n} times`);

/** One sentence on why taste speaks for an option, in the words of the review. */
export function reason(best: NonNullable<Ranked['best']>, labelOf: (option: string) => string): string {
  const s = best.strength;
  if (s.rule) return `Your rule: ${s.rule}`.slice(0, 200);
  const trait = /^i:([a-z]+)>i:([a-z]+)$/.exec(best.key);
  if (trait) {
    const [a, b] = [INTENSITY_WORDS[trait[1]!] ?? trait[1]!, INTENSITY_WORDS[trait[2]!] ?? trait[2]!];
    if (s.here >= s.general * GENERAL.factor && s.hereTimes > 0) return `In this project you chose ${a} over ${b}${times(s.hereTimes)}.`;
    return `You usually choose ${a} over ${b}: ${s.elsewhereTimes} times in ${s.projects} projects.`;
  }
  const other = labelOf(best.against).slice(0, 80);
  if (s.here >= s.general * GENERAL.factor && s.hereTimes > 0) return `You chose this over "${other}" in this project${times(s.hereTimes)}.`;
  return `You chose this over "${other}" in ${s.projects} projects.`;
}

/** How an option of a board looks to taste: its pattern, and how much it moves. */
export function offeredOf(area: Area, intensityOf: (pattern: string) => Offered['intensity'] | undefined): Offered[] {
  return area.options.map((o) => {
    const intensity = o.pattern ? intensityOf(o.pattern) : undefined;
    return { option: o.id, ...(o.pattern ? { pattern: o.pattern } : {}), ...(o.keep ? { keep: true } : {}), ...(intensity ? { intensity } : {}) };
  });
}

export interface AreaAdvice {
  suggested: string;
  by: 'taste';
  because: string;
}

/**
 * For each area: whether what the person chose before speaks clearly enough for another option
 * than the agent's to move the mark. Taste only ever moves the mark among the options on the board.
 */
export function advise(board: Board, ev: Evidence, intensityOf: (pattern: string) => Offered['intensity'] | undefined): Record<string, AreaAdvice> {
  const out: Record<string, AreaAdvice> = {};
  for (const area of board.areas) {
    const ranked = rank(offeredOf(area, intensityOf), ev);
    const top = ranked[0];
    if (!top || !top.best) continue;
    const agent = area.options.find((o) => o.suggested)?.id ?? null;
    if (top.option === agent) continue;
    const base = agent ? (ranked.find((r) => r.option === agent)?.score ?? 0) : 0;
    if (top.score - base < LEAD) continue;
    out[area.id] = { suggested: top.option, by: 'taste', because: reason(top.best, (id) => area.options.find((o) => o.id === id)?.label ?? id) };
  }
  return out;
}

export interface SummaryLine {
  key: string;
  text: string;
  scope: 'project' | 'general' | 'seen';
  detail: string;
}

/** What is known, in lines a person can read: per pair, where it comes from and whether it counts. */
export function summarize(ev: Evidence): SummaryLine[] {
  const word = (side: string) => (side === 'keep' ? 'the page as it is' : side.startsWith('i:') ? (INTENSITY_WORDS[side.slice(2)] ?? side.slice(2)) : side.slice(2));
  const lines: SummaryLine[] = [];
  for (const key of ev.pairs.keys()) {
    const s = strength(ev, key);
    const [a, b] = key.split('>') as [string, string];
    const text = `${word(a)} over ${word(b)}`;
    if (s.here > 0) lines.push({ key, text, scope: 'project', detail: `${s.hereTimes} time${s.hereTimes === 1 ? '' : 's'} in this project (weight ${s.here.toFixed(1)})${s.rule ? `; rule: ${s.rule}` : ''}` });
    if (s.general > 0) lines.push({ key, text, scope: 'general', detail: s.rule && s.elsewhere === 0 ? `rule: ${s.rule}` : `${s.elsewhereTimes} times in ${s.projects} other projects (weight ${s.general.toFixed(1)})` });
    else if (s.elsewhere > 0) lines.push({ key, text, scope: 'seen', detail: `${s.elsewhereTimes} time${s.elsewhereTimes === 1 ? '' : 's'} in ${s.projects} other project${s.projects === 1 ? '' : 's'} (weight ${s.elsewhere.toFixed(1)}); not repeated often enough to count` });
  }
  const order = { project: 0, general: 1, seen: 2 };
  return lines.sort((x, y) => order[x.scope] - order[y.scope] || x.text.localeCompare(y.text));
}
