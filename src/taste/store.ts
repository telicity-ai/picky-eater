import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { Id } from '../core/schema.js';
import { nowIso, readJson, writeJsonAtomic } from '../session/fs.js';
import { readWorkspace, type Ws } from '../session/store.js';

/**
 * What a person chose before, kept on their machine and outside every repository, so that the
 * next recommendation can take it into account. Only the review listener writes choices here, at
 * the moment of an approval. An entry holds catalog ids, option ids and the name of the project;
 * never labels, markup, texts of a page or the words of a change request.
 */

const Iso = z.string().min(20).max(40);
const INTENSITY = z.enum(['none', 'subtle', 'moderate', 'expressive']);

export const Offered = z.strictObject({
  option: Id,
  pattern: Id.optional(),
  /** The option leaves the page as it is. */
  keep: z.boolean().optional(),
  /** How much it moves, for a motion pattern. */
  intensity: INTENSITY.optional(),
});
export type Offered = z.infer<typeof Offered>;

export const TasteEvent = z.strictObject({
  at: Iso,
  project: z.string().min(1).max(300),
  session: Id,
  revision: z.number().int().min(1),
  area: Id,
  decision: Id.optional(),
  /** The option that carried the mark, and who put it there. */
  suggested: Id.nullable(),
  suggestedBy: z.enum(['agent', 'taste']).optional(),
  chosen: Id,
  offered: z.array(Offered).min(2).max(8),
});
export type TasteEvent = z.infer<typeof TasteEvent>;

export const TasteRule = z.strictObject({
  id: z.string().regex(/^t\d+$/),
  /** One sentence for the agent, in the person's sense. */
  text: z.string().trim().min(3).max(300).regex(/^[^\n\r<>]*$/, 'one line of plain text'),
  /** The project it was proposed in. */
  project: z.string().min(1).max(300),
  /** "project": only there. "general": everywhere. Chosen by the person when they keep the rule. */
  scope: z.enum(['project', 'general']),
  /** Only a kept rule counts. Keeping is a click in the review page. */
  status: z.enum(['pending', 'kept']),
  /** If the rule is about two patterns: the one to prefer, and over which. */
  prefer: Id.optional(),
  over: Id.optional(),
  /** The change request it came from. */
  from: z.string().max(60).optional(),
  at: Iso,
});
export type TasteRule = z.infer<typeof TasteRule>;

/** The folder of the person's taste: in their home, or where PICKY_EATER_HOME says. */
export function tasteDir(): string {
  const home = process.env.PICKY_EATER_HOME?.trim();
  return join(home ? resolve(home) : join(homedir(), '.picky-eater'), 'taste');
}
const eventsFile = () => join(tasteDir(), 'events.jsonl');
const rulesFile = () => join(tasteDir(), 'rules.json');

/** Whether this project reads and writes taste: not switched off for the run or for the project. */
export function tasteOn(ws: Ws): boolean {
  if ((process.env.PICKY_EATER_TASTE ?? '').toLowerCase() === 'off') return false;
  try {
    return readWorkspace(ws).taste !== false;
  } catch {
    return true;
  }
}

/**
 * A name for the project that is the same in every checkout of it: the address of its git remote,
 * without credentials. A folder that is no repository is named by a hash of its path.
 */
export function projectKey(root: string): string {
  try {
    let dir = resolve(root);
    for (let i = 0; i < 40; i++) {
      const dot = join(dir, '.git');
      if (existsSync(dot)) {
        let gitDir = dot;
        if (statSync(dot).isFile()) {
          // A worktree: ".git" is a file that points at its own folder, which names the shared one.
          const pointer = /^gitdir:\s*(.+)$/m.exec(readFileSync(dot, 'utf8'))?.[1]?.trim();
          if (pointer) {
            gitDir = resolve(dir, pointer);
            const common = join(gitDir, 'commondir');
            if (existsSync(common)) gitDir = resolve(gitDir, readFileSync(common, 'utf8').trim());
          }
        }
        const config = join(gitDir, 'config');
        if (existsSync(config)) {
          const url = /\[remote "origin"\][^[]*?\burl\s*=\s*(\S+)/.exec(readFileSync(config, 'utf8'))?.[1];
          if (url) {
            const clean = url
              .replace(/^[a-z+]+:\/\//i, '')
              .replace(/^[^@/]+@/, '')
              .replace(/^([^/:]+):(?!\d+\/)/, '$1/')
              .replace(/\.git$/, '')
              .replace(/\/+$/, '');
            if (clean) return clean.toLowerCase();
          }
        }
        break;
      }
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  } catch {
    /* fall through to the path */
  }
  return `folder-${createHash('sha256').update(resolve(root)).digest('hex').slice(0, 12)}`;
}

/** Every recorded choice, oldest first. Lines that do not parse are skipped. */
export function readEvents(): TasteEvent[] {
  if (!existsSync(eventsFile())) return [];
  const out: TasteEvent[] = [];
  for (const line of readFileSync(eventsFile(), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = TasteEvent.safeParse(JSON.parse(line));
      if (r.success) out.push(r.data);
    } catch {
      /* a damaged line */
    }
  }
  return out;
}

/** The choices that still stand: of each area of a session, the last approval speaks. */
export function standingEvents(events = readEvents()): TasteEvent[] {
  const last = new Map<string, TasteEvent>();
  for (const e of events) last.set(`${e.project}\n${e.session}\n${e.area}`, e);
  return [...last.values()];
}

export function appendEvents(events: TasteEvent[]): void {
  if (events.length === 0) return;
  mkdirSync(tasteDir(), { recursive: true, mode: 0o700 });
  appendFileSync(eventsFile(), events.map((e) => JSON.stringify(e)).join('\n') + '\n', { mode: 0o600 });
}

export function readRules(): TasteRule[] {
  if (!existsSync(rulesFile())) return [];
  try {
    const r = z.array(TasteRule).safeParse(readJson(rulesFile()));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}

export function writeRules(rules: TasteRule[]): void {
  mkdirSync(tasteDir(), { recursive: true, mode: 0o700 });
  writeJsonAtomic(rulesFile(), rules, 0o600);
}

/** Add a rule that waits for the person. Returns it. */
export function proposeRule(input: { text: string; project: string; prefer?: string; over?: string; from?: string }): TasteRule {
  const rules = readRules();
  const n = rules.reduce((max, r) => Math.max(max, Number(r.id.slice(1))), 0) + 1;
  const rule = TasteRule.parse({ id: `t${n}`, text: input.text, project: input.project, scope: 'project', status: 'pending', ...(input.prefer ? { prefer: input.prefer } : {}), ...(input.over ? { over: input.over } : {}), ...(input.from ? { from: input.from } : {}), at: nowIso() });
  writeRules([...rules, rule]);
  return rule;
}

/** The person keeps a pending rule, for this project or for all, or discards it. Only the review page calls this. */
export function settleRule(id: string, verdict: 'project' | 'general' | 'discard'): TasteRule | null {
  const rules = readRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return null;
  if (verdict === 'discard') {
    writeRules(rules.filter((r) => r.id !== id));
    return rule;
  }
  const kept: TasteRule = { ...rule, status: 'kept', scope: verdict };
  writeRules(rules.map((r) => (r.id === id ? kept : r)));
  return kept;
}

/** Forget everything, or what matches: a project, a rule id, or a pattern or trait value in a choice. */
export function forget(what: string | null): { events: number; rules: number } {
  const events = readEvents();
  const rules = readRules();
  if (what === null) {
    rmSync(eventsFile(), { force: true });
    rmSync(rulesFile(), { force: true });
    return { events: events.length, rules: rules.length };
  }
  const hit = (e: TasteEvent) => e.project === what || e.offered.some((o) => o.pattern === what);
  const keptEvents = events.filter((e) => !hit(e));
  const keptRules = rules.filter((r) => r.id !== what && r.project !== what && r.prefer !== what && r.over !== what);
  if (keptEvents.length !== events.length) {
    mkdirSync(tasteDir(), { recursive: true, mode: 0o700 });
    writeFileAtomicLines(keptEvents);
  }
  if (keptRules.length !== rules.length) writeRules(keptRules);
  return { events: events.length - keptEvents.length, rules: rules.length - keptRules.length };
}

function writeFileAtomicLines(events: TasteEvent[]): void {
  rmSync(eventsFile(), { force: true });
  appendEvents(events);
}
