import { z } from 'zod';
import { Id, describeIssues } from '../core/schema.js';

/** The shapes documented in catalog/README.md. */

export const CATEGORIES = ['layout', 'navigation', 'input', 'action', 'content', 'feedback', 'overlay', 'motion'] as const;
export type Category = (typeof CATEGORIES)[number];

/** What sets a motion off. */
export const TRIGGERS = ['press', 'hover', 'state', 'open', 'enter', 'scroll', 'navigate', 'ambient'] as const;
/** Why something moves. A motion that has none of these purposes is not offered. */
export const PURPOSES = ['feedback', 'spatial', 'state', 'continuity', 'attention', 'explanation', 'delight'] as const;
/** How often a person meets the moment, from most to least often. */
export const FREQUENCIES = ['constant', 'frequent', 'occasional', 'rare'] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const INTENSITIES = ['none', 'subtle', 'moderate', 'expressive'] as const;

export const FREQUENCY_MEANING: Record<Frequency, string> = {
  constant: 'a hundred times a day or more: keyboard shortcuts, the command palette, core navigation',
  frequent: 'tens of times a day: hover, moving through a list, a toggle used all the time',
  occasional: 'now and then: dialogs, drawers, toasts, settings',
  rare: 'rarely or once: a first visit, a landing page, an empty state, a success moment',
};

const Line = z.string().trim().min(3).max(400);
const SourceRef = z.strictObject({ ref: Id, where: z.string().trim().min(1).max(200) });

/** The part of a motion pattern that can be checked and built: when it plays, why, how long, with which CSS. */
export const Motion = z.strictObject({
  trigger: z.array(z.enum(TRIGGERS)).min(1).max(4),
  purpose: z.enum(PURPOSES).optional(),
  /** The most frequent use at which the pattern is still right. More often than this: do not offer it. */
  upTo: z.enum(FREQUENCIES),
  intensity: z.enum(INTENSITIES),
  /** Shortest and longest duration in milliseconds. */
  duration: z.tuple([z.number().int().min(0).max(60_000), z.number().int().min(0).max(60_000)]).optional(),
  easing: z.string().trim().min(3).max(80).optional(),
  /** The CSS properties that change. */
  properties: z.array(z.string().trim().min(2).max(40)).max(6).default([]),
  /** What a person who asked for reduced motion gets. */
  reduced: Line,
  /** A working rule set in plain CSS, to start an option from. */
  css: z.string().trim().min(10).max(1400).optional(),
});
export type Motion = z.infer<typeof Motion>;

export const Reference = z.strictObject({
  id: Id,
  kind: z.enum(['book', 'design-system', 'article']),
  authors: z.string().trim().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  edition: z.string().trim().max(40).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  publisher: z.string().trim().max(120).optional(),
  url: z.string().url().optional(),
});
export type Reference = z.infer<typeof Reference>;

export const Pattern = z.strictObject({
  id: Id,
  name: z.string().trim().min(1).max(60),
  aka: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  what: Line,
  useWhen: z.array(Line).min(1).max(6),
  avoidWhen: z.array(Line).min(1).max(5),
  rules: z.array(Line).min(2).max(8),
  examples: z
    .array(z.strictObject({ who: z.string().trim().min(1).max(80), where: Line, url: z.string().url().optional(), verified: z.boolean() }))
    .min(1)
    .max(6),
  sources: z.array(SourceRef).min(1).max(5),
  alternatives: z.array(Id).max(8).default([]),
  motion: Motion.optional(),
});
export type Pattern = z.infer<typeof Pattern> & { category: Category };

export const Decision = z.strictObject({
  id: Id,
  question: Line,
  candidates: z.array(z.strictObject({ pattern: Id, pick: Line })).min(2).max(5),
  sources: z.array(SourceRef).min(1).max(4),
});
export type Decision = z.infer<typeof Decision>;

const PatternFile = z.strictObject({ category: z.enum(CATEGORIES), patterns: z.array(Pattern) });

/** The catalog files as read from disk, before validation. */
export interface RawCatalog {
  references: unknown;
  decisions: unknown;
  /** One entry per file under catalog/patterns/. */
  patternFiles: unknown[];
}

export interface Catalog {
  patterns: Pattern[];
  decisions: Decision[];
  references: Reference[];
}

/** Validate the catalog files and their cross-references. Throws one error listing every problem. */
export function parseCatalog(raw: RawCatalog): Catalog {
  const problems: string[] = [];
  const read = <T extends z.ZodType>(schema: T, value: unknown, file: string): z.infer<T> | null => {
    const r = schema.safeParse(value);
    if (!r.success) problems.push(...describeIssues(r.error).map((line) => `${file}: ${line}`));
    return r.success ? r.data : null;
  };
  const references = read(z.array(Reference), raw.references, 'references.json') ?? [];
  const decisions = read(z.array(Decision), raw.decisions, 'decisions.json') ?? [];
  const patterns: Pattern[] = [];
  for (const file of raw.patternFiles) {
    const parsed = read(PatternFile, file, 'patterns/*.json');
    if (parsed) patterns.push(...parsed.patterns.map((p) => ({ ...p, category: parsed.category })));
  }

  const refIds = new Set(references.map((r) => r.id));
  const patternIds = new Set<string>();
  for (const p of patterns) {
    if (patternIds.has(p.id)) problems.push(`pattern "${p.id}" is defined twice`);
    patternIds.add(p.id);
  }
  const checkSources = (owner: string, sources: Array<{ ref: string }>) => {
    for (const s of sources) if (!refIds.has(s.ref)) problems.push(`${owner}: source "${s.ref}" is not in references.json`);
  };
  for (const r of references) {
    if (r.kind !== 'book' && !r.url) problems.push(`reference "${r.id}": a ${r.kind} needs a url`);
  }
  for (const p of patterns) {
    checkSources(`pattern "${p.id}"`, p.sources);
    if (p.category === 'motion' && !p.motion) problems.push(`pattern "${p.id}": a motion pattern needs a "motion" block`);
    if (p.category !== 'motion' && p.motion) problems.push(`pattern "${p.id}": only patterns in the motion category have a "motion" block`);
    if (p.motion) problems.push(...motionProblems(p.motion).map((line) => `pattern "${p.id}": ${line}`));
    for (const alt of p.alternatives) {
      if (alt === p.id) problems.push(`pattern "${p.id}" lists itself as an alternative`);
      else if (!patternIds.has(alt)) problems.push(`pattern "${p.id}": alternative "${alt}" does not exist`);
    }
  }
  const decisionIds = new Set<string>();
  for (const d of decisions) {
    if (decisionIds.has(d.id) || patternIds.has(d.id)) problems.push(`decision id "${d.id}" is already used`);
    decisionIds.add(d.id);
    checkSources(`decision "${d.id}"`, d.sources);
    for (const c of d.candidates) if (!patternIds.has(c.pattern)) problems.push(`decision "${d.id}": pattern "${c.pattern}" does not exist`);
  }
  if (problems.length > 0) throw new Error(`The pattern catalog is not valid:\n  ${problems.join('\n  ')}`);
  return { patterns, decisions, references };
}

/** A motion block that contradicts itself, or that leaves people who asked for less motion without an answer. */
export function motionProblems(m: Motion): string[] {
  const out: string[] = [];
  const still = m.intensity === 'none';
  if (still && (m.duration || m.css || m.properties.length > 0)) out.push('a motion of intensity "none" has no duration, properties or css');
  if (!still && !m.purpose) out.push('a motion needs a purpose');
  if (!still && !m.duration && !m.trigger.includes('scroll')) out.push('a motion needs a duration, unless scrolling drives it');
  if (!still && !m.css) out.push('a motion needs css to start from');
  if (m.duration && m.duration[0] > m.duration[1]) out.push('duration is [shortest, longest]');
  if (m.purpose === 'delight' && m.upTo !== 'rare') out.push('delight is only for moments that are rare');
  if (m.css && movesThings(m.properties) && !/prefers-reduced-motion/.test(m.css)) out.push('css that moves, scales or turns something needs a prefers-reduced-motion rule');
  return out;
}

/** Properties that change how something looks without making it travel, grow or turn. */
const STILL = new Set(['opacity', 'color', 'background-color', 'border-color', 'outline-color', 'fill', 'stroke', 'box-shadow', 'filter']);

/** Whether a change of these properties is movement, which people can ask to have reduced, and not only a fade or a change of color. */
export function movesThings(properties: string[]): boolean {
  return properties.some((name) => !STILL.has(name));
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);

/** Patterns and decisions that match a free-text query, best first. */
export function search(catalog: Catalog, query: string): { patterns: Pattern[]; decisions: Decision[] } {
  const q = words(query);
  const score = (fields: Array<[string, number]>) => {
    let total = 0;
    for (const w of q) {
      let best = 0;
      for (const [text, weight] of fields) if (text.toLowerCase().includes(w)) best = Math.max(best, weight);
      if (best === 0) return 0; // every word must appear somewhere
      total += best;
    }
    return total;
  };
  const rank = <T>(items: T[], fields: (item: T) => Array<[string, number]>) =>
    items
      .map((item) => ({ item, s: score(fields(item)) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.item);
  return {
    patterns: rank(catalog.patterns, (p) => [
      [`${p.id} ${p.name} ${p.aka.join(' ')}`, 5],
      [p.what, 3],
      [`${p.useWhen.join(' ')} ${p.category} ${p.motion ? `${p.motion.trigger.join(' ')} ${p.motion.purpose ?? ''} ${p.motion.intensity}` : ''}`, 1],
    ]),
    decisions: rank(catalog.decisions, (d) => [
      [`${d.id} ${d.question}`, 5],
      [d.candidates.map((c) => `${c.pattern} ${c.pick}`).join(' '), 1],
    ]),
  };
}

// ---------------------------------------------------------------------------------------------
// Text for agents: short, no decoration
// ---------------------------------------------------------------------------------------------

const bullets = (items: string[]) => items.map((i) => `  - ${i}`).join('\n');

export function describePattern(p: Pattern, opts: { examples?: boolean } = {}): string {
  const lines = [
    `${p.id} — ${p.name} [${p.category}]${p.aka.length ? ` (also: ${p.aka.join(', ')})` : ''}`,
    p.what,
    `Use when:\n${bullets(p.useWhen)}`,
    `Avoid when:\n${bullets(p.avoidWhen)}`,
    `Rules:\n${bullets(p.rules)}`,
  ];
  if (p.motion) lines.push(describeMotion(p.motion));
  if (p.alternatives.length) lines.push(`Alternatives: ${p.alternatives.join(', ')}`);
  if (opts.examples !== false) lines.push(`Seen in: ${p.examples.map((e) => `${e.who} (${e.where})`).join('; ')}`);
  return lines.join('\n');
}

const span = (d: [number, number]) => (d[0] === d[1] ? `${d[0]} ms` : `${d[0]}–${d[1]} ms`);

export function describeMotion(m: Motion): string {
  const facts = [`plays on ${m.trigger.join(', ')}`, m.purpose ? `purpose: ${m.purpose}` : '', `intensity: ${m.intensity}`, m.duration ? span(m.duration) : '', m.easing ?? '', m.properties.length ? `changes ${m.properties.join(', ')}` : '']
    .filter(Boolean)
    .join(' · ');
  const lines = [`Motion: ${facts}`, `Right up to: ${m.upTo} use (${FREQUENCY_MEANING[m.upTo]})`, `Reduced motion: ${m.reduced}`];
  if (m.css) lines.push(`CSS to start from:\n${m.css}`);
  return lines.join('\n');
}

export function describeDecision(d: Decision): string {
  return `${d.id} — ${d.question}\n${d.candidates.map((c) => `  - ${c.pattern}: ${c.pick}`).join('\n')}`;
}

/** The whole catalog as an index: one line per decision and per pattern. */
export function describeIndex(catalog: Catalog): string {
  const out: string[] = [];
  if (catalog.decisions.length) out.push('DECISIONS (a question, and the patterns that answer it)');
  for (const d of catalog.decisions) out.push(`  ${d.id}: ${d.question} → ${d.candidates.map((c) => c.pattern).join(' | ')}`);
  for (const category of CATEGORIES) {
    const list = catalog.patterns.filter((p) => p.category === category);
    if (list.length === 0) continue;
    if (out.length) out.push('');
    out.push(category.toUpperCase());
    for (const p of list) out.push(`  ${p.id}: ${p.what}`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Markdown for people: docs/patterns.md
// ---------------------------------------------------------------------------------------------

const TITLES: Record<Category, string> = {
  layout: 'Layouts',
  navigation: 'Navigation',
  input: 'Inputs and form controls',
  action: 'Actions',
  content: 'Content',
  feedback: 'Feedback',
  overlay: 'Overlays',
  motion: 'Motion',
};

export function renderMarkdown(catalog: Catalog): string {
  const refs = new Map(catalog.references.map((r) => [r.id, r]));
  const names = new Map(catalog.patterns.map((p) => [p.id, p.name]));
  const link = (id: string) => `[${names.get(id) ?? id}](#${id})`;
  const cite = (sources: Array<{ ref: string; where: string }>) =>
    sources
      .map((s) => {
        const r = refs.get(s.ref)!;
        return `${r.authors.split(',')[0]}${r.year ? ` ${r.year}` : ''}, *${r.title}* (${s.where})`;
      })
      .join('; ');
  const md = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

  const out: string[] = [
    '# Pattern catalog',
    '',
    '<!-- Generated from catalog/ by "npm run build". Edit the JSON files, not this page. -->',
    '',
    'The layouts, controls and motions picky-eater offers as options, with the conditions under which each one',
    'is the right choice. Researched from established UI/UX books and public design systems; every',
    'entry names its sources. Agents read the same data with `picky-eater patterns`.',
    '',
    `${catalog.patterns.length} patterns, ${catalog.decisions.length} decisions, ${catalog.references.length} references.`,
    '',
    '## Contents',
    '',
    '- [Decisions](#decisions)',
    ...CATEGORIES.filter((c) => catalog.patterns.some((p) => p.category === c)).map((c) => `- [${TITLES[c]}](#${c})`),
    '- [References](#references)',
    '',
    '## Decisions',
    '',
    'A decision is a question that comes up again and again. Its candidates become the options of an area.',
    '',
  ];
  for (const d of catalog.decisions) {
    out.push(`### ${d.question}`, '', `<a id="${d.id}"></a>`, '', '| Option | Pick it when |', '|---|---|');
    for (const c of d.candidates) out.push(`| ${link(c.pattern)} | ${c.pick} |`);
    out.push('', `Sources: ${cite(d.sources)}`, '');
  }
  for (const category of CATEGORIES) {
    const list = catalog.patterns.filter((p) => p.category === category);
    if (list.length === 0) continue;
    out.push(`## ${TITLES[category]}`, '', `<a id="${category}"></a>`, '');
    for (const p of list) {
      out.push(`### ${p.name}`, '', `<a id="${p.id}"></a>`, '');
      out.push(`\`${p.id}\`${p.aka.length ? ` · also called ${p.aka.join(', ')}` : ''}`, '', p.what, '');
      out.push('**Use when**', '', md(p.useWhen), '', '**Avoid when**', '', md(p.avoidWhen), '', '**Rules**', '', md(p.rules), '');
      out.push('**Seen in**', '');
      out.push(md(p.examples.map((e) => `${e.url ? `[${e.who}](${e.url})` : e.who}: ${e.where}${e.verified ? '' : ' (not re-checked)'}`)), '');
      if (p.motion) {
        const m = p.motion;
        out.push('**Motion**', '');
        out.push(md([
          `Plays on: ${m.trigger.join(', ')}`,
          ...(m.purpose ? [`Purpose: ${m.purpose}`] : []),
          `Right up to: ${m.upTo} use (${FREQUENCY_MEANING[m.upTo]})`,
          `Intensity: ${m.intensity}`,
          ...(m.duration ? [`Duration: ${span(m.duration)}${m.easing ? `, \`${m.easing}\`` : ''}`] : []),
          ...(m.properties.length ? [`Changes: ${m.properties.map((x) => `\`${x}\``).join(', ')}`] : []),
          `Reduced motion: ${m.reduced}`,
        ]), '');
        if (m.css) out.push('```css', m.css, '```', '');
      }
      if (p.alternatives.length) out.push(`**Alternatives:** ${p.alternatives.map(link).join(', ')}`, '');
      out.push(`**Sources:** ${cite(p.sources)}`, '');
    }
  }
  out.push('## References', '');
  for (const r of [...catalog.references].sort((a, b) => a.authors.localeCompare(b.authors))) {
    const title = r.url ? `[${r.title}](${r.url})` : `*${r.title}*`;
    const tail = [r.edition ? `${r.edition} ed.` : '', r.publisher ?? '', r.year ? String(r.year) : ''].filter(Boolean).join(', ');
    out.push(`- ${r.authors}. ${title}${tail ? `. ${tail}` : ''}.`);
  }
  return out.join('\n') + '\n';
}
