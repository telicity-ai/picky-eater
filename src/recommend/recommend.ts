import { FREQUENCIES, type Catalog, type Decision, type Frequency, type Pattern } from '../catalog/catalog.js';
import type { Moment, MomentKind, Profile } from '../check/profile.js';
import { rank, reason, type Evidence } from '../taste/score.js';
import type { Offered, TasteRule } from '../taste/store.js';

/**
 * From a page to what to offer on it. Everything here is decided by rule, so that two runs on the
 * same page give the same answer: which moments are candidates, which motions pass the gate at
 * each, which are left out and why, and what the person's earlier choices speak for. Drawing the
 * options stays with the agent.
 */

/** The catalog decision that answers each kind of moment, and how often such a moment is met on a page used all day. */
const MOMENTS: Record<MomentKind, { decision: string; often: Frequency; what: string }> = {
  press: { decision: 'press-feedback', often: 'frequent', what: 'a press' },
  open: { decision: 'open-in-place', often: 'occasional', what: 'a section that opens in place' },
  select: { decision: 'move-selection', often: 'frequent', what: 'a highlight that moves to another tab' },
  overlay: { decision: 'overlay-entrance', often: 'occasional', what: 'something that opens over the page' },
  hover: { decision: 'card-pointer-feedback', often: 'frequent', what: 'the pointer on a card' },
  enter: { decision: 'content-entrance', often: 'constant', what: 'a group that appears' },
  navigate: { decision: 'page-change', often: 'frequent', what: 'going to another page' },
  ambient: { decision: 'hero-ambient-motion', often: 'constant', what: 'something that could move by itself' },
};
/** Which moments are worth an area first: a missing answer before an entrance, decoration last. */
const LEVERAGE: MomentKind[] = ['press', 'open', 'select', 'overlay', 'hover', 'enter', 'navigate', 'ambient'];

const rankOf = (f: Frequency) => FREQUENCIES.indexOf(f);
const OFTEN_WORDS: Record<Frequency, string> = { constant: 'all day', frequent: 'often', occasional: 'now and then', rare: 'rarely' };
/** How often a page of this kind is met, unless the agent says otherwise. */
export const SURFACE_FREQUENCY: Record<Profile['surface'], Frequency> = { landing: 'rare', page: 'occasional', app: 'frequent' };

export interface Candidate {
  pattern: string;
  name: string;
  /** The condition under which the catalog says to pick it. */
  pick: string;
  css?: string;
}

export interface Recommendation {
  moment: Moment;
  decision: string;
  question: string;
  /** How often a person meets this moment on this page. */
  frequency: Frequency;
  offer: Candidate[];
  rejected: Array<{ pattern: string; name: string; why: string }>;
  /** What the person's earlier choices speak for among the offered ones, if anything. */
  taste: { pattern: string; because: string } | null;
}

export interface Recommended {
  frequency: Frequency;
  /** How many motion areas a page of this kind takes. */
  cap: number;
  areas: Recommendation[];
  /** Moments that pass the gate but are over the cap. */
  later: Recommendation[];
  /** Moments the page already answers with motion of its own. */
  answered: Moment[];
  /** Rules about their taste that the person kept. */
  rules: string[];
}

/** A moment on a rarely met page is met rarely; on a page used all day it is met as often as its kind. */
export function frequencyOf(kind: MomentKind, page: Frequency): Frequency {
  const often = MOMENTS[kind].often;
  return rankOf(page) > rankOf(often) ? page : often;
}

/** The first two questions of the gate, by rule: is the moment met too often for this motion, and may it be decoration here. */
export function gate(p: Pattern, frequency: Frequency): string | null {
  const m = p.motion;
  if (!m || m.intensity === 'none') return null;
  if (rankOf(m.upTo) > rankOf(frequency)) {
    return `This moment is met ${OFTEN_WORDS[frequency]}; this motion is right only up to ${m.upTo} use.`;
  }
  return null;
}

/** The candidates of one decision at one frequency, with what earlier choices speak for. */
export function decide(catalog: Catalog, decision: Decision, frequency: Frequency, ev: Evidence | null): Pick<Recommendation, 'offer' | 'rejected' | 'taste'> {
  const byId = new Map(catalog.patterns.map((p) => [p.id, p]));
  const offer: Candidate[] = [];
  const rejected: Recommendation['rejected'] = [];
  for (const c of decision.candidates) {
    const p = byId.get(c.pattern)!;
    const why = gate(p, frequency);
    if (why) rejected.push({ pattern: p.id, name: p.name, why });
    else offer.push({ pattern: p.id, name: p.name, pick: c.pick, ...(p.motion?.css ? { css: p.motion.css } : {}) });
  }
  let taste: Recommendation['taste'] = null;
  if (ev && offer.length > 1) {
    const offered: Offered[] = offer.map((c) => ({ option: c.pattern, pattern: c.pattern, ...(byId.get(c.pattern)?.motion ? { intensity: byId.get(c.pattern)!.motion!.intensity } : {}) }));
    const top = rank(offered, ev)[0];
    if (top && top.best && top.score > 0) taste = { pattern: top.option, because: reason(top.best, (id) => byId.get(id)?.name ?? id) };
  }
  return { offer, rejected: rejected.slice(0, 3), taste };
}

/** What to offer on a page: its moments, gated, ordered and capped. */
export function recommend(catalog: Catalog, profile: Profile, opts: { frequency?: Frequency; evidence?: Evidence | null; rules?: TasteRule[]; project?: string } = {}): Recommended {
  const page = opts.frequency ?? SURFACE_FREQUENCY[profile.surface];
  const cap = page === 'rare' ? 3 : 2;
  const decisions = new Map(catalog.decisions.map((d) => [d.id, d]));
  const all: Recommendation[] = [];
  const answered: Moment[] = [];
  for (const kind of LEVERAGE) {
    for (const moment of profile.moments.filter((m) => m.kind === kind)) {
      if (moment.answered) {
        answered.push(moment);
        continue;
      }
      const decision = decisions.get(MOMENTS[kind].decision);
      if (!decision) continue;
      const frequency = frequencyOf(kind, page);
      const decided = decide(catalog, decision, frequency, opts.evidence ?? null);
      // Nothing but "it does not move" is left: this moment is not an area.
      if (!decided.offer.some((c) => catalog.patterns.find((p) => p.id === c.pattern)?.motion?.intensity !== 'none')) continue;
      all.push({ moment, decision: decision.id, question: decision.question, frequency, ...decided });
    }
  }
  // One area per decision: the same question is asked once for the page.
  const seen = new Set<string>();
  const unique = all.filter((r) => (seen.has(r.decision) ? false : (seen.add(r.decision), true)));
  const rules = (opts.rules ?? []).filter((r) => r.status === 'kept' && (r.scope === 'general' || r.project === opts.project)).map((r) => r.text);
  return { frequency: page, cap, areas: unique.slice(0, cap), later: unique.slice(cap), answered, rules };
}

const kindWord = (kind: MomentKind) => MOMENTS[kind].what;
const OFTEN = OFTEN_WORDS;

/** The recommendation as text for an agent: short, one block per area. */
export function describeRecommended(url: string, profile: Profile, frameworks: string[], rec: Recommended): string {
  const lines: string[] = [];
  const surface = profile.surface === 'landing' ? 'a page that is read' : profile.surface === 'app' ? 'a screen that is worked with' : 'a page';
  const m = profile.motion;
  lines.push(`${url} — ${surface}, met ${OFTEN[rec.frequency]} (${rec.frequency}; say otherwise with --frequency)${frameworks.length ? ` — ${frameworks.join(', ')}` : ''}`);
  lines.push(
    `Moves today: ${m.transitions} element(s) with a transition, ${m.animations} animation(s)${m.durations.length ? `, mostly ${m.durations.join(', ')} ms` : ''}; ${m.reducedRules > 0 ? `${m.reducedRules} rule(s) for reduced motion` : 'no rule for reduced motion'}${m.libraries.length ? `; uses ${m.libraries.join(', ')}` : '; no motion library'}`,
  );
  if (profile.tokens.length) lines.push(`Timing the project names (use these, not new values): ${profile.tokens.map((t) => `${t.name}: ${t.value}`).join('; ')}`);
  if (rec.rules.length) lines.push(`Rules the person kept:\n${rec.rules.map((r) => `  - ${r}`).join('\n')}`);
  lines.push('');
  if (rec.areas.length === 0) lines.push('No motion to offer on this page: nothing passes the questions. That is a result, not a gap.');
  const block = (r: Recommendation, n: number | null) => {
    lines.push(`${n === null ? '-' : `${n}.`} ${kindWord(r.moment.kind)} · ${r.moment.selector}${r.moment.count > 1 ? ` (${r.moment.count} on the page)` : ''}${r.moment.text ? ` · "${r.moment.text}"` : ''} · today: ${r.moment.today}`);
    lines.push(`   decision: ${r.decision} — ${r.question} · met ${OFTEN[r.frequency]}`);
    for (const c of r.offer) lines.push(`   offer  ${c.pattern} — ${c.pick}`);
    for (const x of r.rejected) lines.push(`   leave out  ${x.pattern} — ${x.why}`);
    if (r.taste) lines.push(`   earlier choices speak for ${r.taste.pattern}: ${r.taste.because}`);
  };
  rec.areas.forEach((r, i) => block(r, i + 1));
  if (rec.later.length) {
    lines.push('', `Over the cap of ${rec.cap} motion areas for this page; offer these only if the person asks:`);
    for (const r of rec.later) lines.push(`- ${kindWord(r.moment.kind)} · ${r.moment.selector} · decision: ${r.decision}`);
  }
  if (rec.answered.length) {
    lines.push('', 'Already answered by the page itself (leave as they are):');
    for (const a of rec.answered) lines.push(`- ${kindWord(a.kind)} · ${a.selector} · ${a.today}`);
  }
  if (rec.areas.length) {
    lines.push(
      '',
      'Write each as an area: "decision": "<id>", one option per offered pattern ("pattern": "<id>", the page as it is for instant-change), "suggested" with a "because" on the one whose condition fits, and "rejected": [{ "pattern", "why" }] for what was left out. The fourth question is yours: does the motion get in the way of reading or working here? Details and CSS: picky-eater patterns <id>.',
    );
  }
  return lines.join('\n');
}

/** A decision by itself, without a page: its candidates and what earlier choices speak for. */
export function describeDecided(decision: Decision, frequency: Frequency | null, decided: Pick<Recommendation, 'offer' | 'rejected' | 'taste'>): string {
  const lines = [`${decision.id} — ${decision.question}${frequency ? ` · met ${OFTEN[frequency]}` : ''}`];
  for (const c of decided.offer) lines.push(`  offer  ${c.pattern} — ${c.pick}`);
  for (const x of decided.rejected) lines.push(`  leave out  ${x.pattern} — ${x.why}`);
  lines.push(decided.taste ? `  earlier choices speak for ${decided.taste.pattern}: ${decided.taste.because}` : '  earlier choices: nothing yet for these options');
  return lines.join('\n');
}
