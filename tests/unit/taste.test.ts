import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GENERAL, LEAD, advise, gather, rank, summarize } from '../../src/taste/score.js';
import { appendEvents, forget, projectKey, proposeRule, readEvents, readRules, settleRule, standingEvents, type Offered, type TasteEvent, type TasteRule } from '../../src/taste/store.js';

const NOW = Date.parse('2026-11-17T00:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo = 0) => new Date(NOW - daysAgo * DAY).toISOString();

const HERO: Offered[] = [{ option: 'split', pattern: 'hero-split' }, { option: 'centered', pattern: 'hero-centered' }];
const FAQ: Offered[] = [{ option: 'keep', keep: true, pattern: 'instant-change', intensity: 'none' }, { option: 'grow', pattern: 'expand-height', intensity: 'subtle' }];
const PRESS: Offered[] = [{ option: 'keep', keep: true, pattern: 'instant-change', intensity: 'none' }, { option: 'press', pattern: 'press-scale', intensity: 'subtle' }];

let n = 0;
const event = (project: string, offered: Offered[], chosen: string, suggested: string | null, opts: { area?: string; daysAgo?: number; session?: string } = {}): TasteEvent => ({
  at: iso(opts.daysAgo ?? 0),
  project,
  session: opts.session ?? `s${++n}`,
  revision: 1,
  area: opts.area ?? 'hero',
  suggested,
  ...(suggested ? { suggestedBy: 'agent' as const } : {}),
  chosen,
  offered,
});
const board = (areas: Array<{ id: string; options: Array<{ id: string; pattern?: string; keep?: boolean; suggested?: boolean; label?: string }> }>) =>
  ({ schema: 'picky-eater/board', schemaVersion: '2.0', title: 'P', base: { kind: 'live', url: 'http://localhost:1/', attach: 'proxy', serviceWorker: 'block' }, viewports: [], cuts: [], areas: areas.map((a) => ({ id: a.id, label: a.id, options: a.options.map((o) => ({ label: o.label ?? o.id, ...o })) })) }) as never;
const intensityOf = (pattern: string) => ({ 'instant-change': 'none', 'expand-height': 'subtle', 'press-scale': 'subtle', 'stagger-in': 'moderate' })[pattern] as Offered['intensity'];
const heroBoard = (suggested: string) => board([{ id: 'hero', options: [{ id: 'split', pattern: 'hero-split', suggested: suggested === 'split', label: 'Text left' }, { id: 'centered', pattern: 'hero-centered', suggested: suggested === 'centered', label: 'Text centered' }] }]);

describe('from choices to a preference', () => {
  test('without choices nothing is ranked and no mark moves', () => {
    const ev = gather([], [], 'a', NOW);
    expect(rank(HERO, ev).map((r) => r.score)).toEqual([0, 0]);
    expect(advise(heroBoard('split'), ev, intensityOf)).toEqual({});
  });

  test('the same project counts at once: one choice against the mark moves it next time', () => {
    const ev = gather([event('a', HERO, 'centered', 'split')], [], 'a', NOW);
    expect(rank(HERO, ev)[0]).toMatchObject({ option: 'centered', score: 2 });
    expect(advise(heroBoard('split'), ev, intensityOf)).toEqual({ hero: { suggested: 'centered', by: 'taste', because: 'You chose this over "Text left" in this project.' } });
    // What the agent suggests is what the person chose: nothing to move.
    expect(advise(heroBoard('centered'), ev, intensityOf)).toEqual({});
  });

  test('choosing with the mark weighs half as much as choosing against it', () => {
    const accepted = gather([event('a', HERO, 'split', 'split')], [], 'a', NOW);
    const overridden = gather([event('a', HERO, 'centered', 'split')], [], 'a', NOW);
    expect(rank(HERO, accepted)[0]!.score).toBe(1);
    expect(rank(HERO, overridden)[0]!.score).toBe(2);
    expect(LEAD).toBeLessThan(1); // one plain choice in the same project is enough to move a mark
  });

  test('one choice in another project is seen and not used', () => {
    const ev = gather([event('b', HERO, 'centered', 'split')], [], 'a', NOW);
    expect(rank(HERO, ev)[0]!.score).toBe(0);
    expect(advise(heroBoard('split'), ev, intensityOf)).toEqual({});
    expect(summarize(ev)).toEqual([expect.objectContaining({ scope: 'seen', text: 'hero-centered over hero-split' })]);
  });

  test('what repeats across projects becomes general, at half weight', () => {
    const events = [event('b', HERO, 'centered', 'split'), event('c', HERO, 'centered', 'split')];
    const ev = gather(events, [], 'a', NOW);
    expect(GENERAL).toEqual({ weight: 3, projects: 2, factor: 0.5 });
    expect(rank(HERO, ev)[0]).toMatchObject({ option: 'centered', score: 2 }); // (2 + 2) × 0.5
    expect(advise(heroBoard('split'), ev, intensityOf).hero).toMatchObject({ suggested: 'centered', because: 'You chose this over "Text left" in 2 projects.' });
    // The same weight from a single project does not: it has to repeat in another one.
    const one = gather([event('b', HERO, 'centered', 'split'), event('b', HERO, 'centered', 'split', { area: 'second' })], [], 'a', NOW);
    expect(rank(HERO, one)[0]!.score).toBe(0);
  });

  test('how much something moves adds up across decisions: a habit reaches motions that were never offered before', () => {
    // No motion, chosen over subtle motion, in two areas of each of two projects.
    const events = ['b', 'c'].flatMap((p) => [event(p, FAQ, 'keep', 'grow', { area: 'faq' }), event(p, PRESS, 'keep', 'press', { area: 'cta' })]);
    const ev = gather(events, [], 'a', NOW);
    const stagger: Offered[] = [{ option: 'still', pattern: 'instant-change', intensity: 'none' }, { option: 'rise', pattern: 'rise-in', intensity: 'subtle' }];
    const top = rank(stagger, ev)[0]!;
    expect(top.option).toBe('still');
    expect(top.best!.key).toBe('i:none>i:subtle');
    const b = board([{ id: 'cards', options: [{ id: 'still', pattern: 'instant-change' }, { id: 'rise', pattern: 'rise-in', suggested: true }] }]);
    expect(advise(b, ev, (p) => (p === 'rise-in' ? 'subtle' : intensityOf(p))).cards).toEqual({ suggested: 'still', by: 'taste', because: 'You usually choose no motion over subtle motion: 4 times in 2 projects.' });
  });

  test('keeping the page as it is says something about that page only', () => {
    const plain: Offered[] = [{ option: 'keep', keep: true }, { option: 'chips', pattern: 'tag' }];
    const events = [event('b', plain, 'keep', 'chips'), event('c', plain, 'keep', 'chips')];
    expect(rank(plain, gather(events, [], 'a', NOW))[0]!.score).toBe(0);
    expect(rank(plain, gather(events, [], 'b', NOW))[0]).toMatchObject({ option: 'keep', score: 2 });
  });

  test('a choice fades: after half a year it counts half', () => {
    const ev = gather([event('a', HERO, 'centered', 'split', { daysAgo: 180 })], [], 'a', NOW);
    expect(rank(HERO, ev)[0]!.score).toBeCloseTo(1, 5);
    const old = gather([event('a', HERO, 'split', 'split', { daysAgo: 400 })], [], 'a', NOW);
    expect(advise(heroBoard('centered'), old, intensityOf)).toEqual({}); // too long ago to move a mark by itself
  });

  test('of each area of a session the last approval speaks', () => {
    const events = [event('a', HERO, 'split', 'split', { session: 's' }), event('a', HERO, 'centered', 'split', { session: 's' })];
    expect(standingEvents(events)).toHaveLength(1);
    expect(rank(HERO, gather(events, [], 'a', NOW))[0]).toMatchObject({ option: 'centered', score: 2 });
  });

  test('a rule counts only once it is kept, and where it was kept for', () => {
    const rule = (status: TasteRule['status'], scope: TasteRule['scope']): TasteRule => ({ id: 't1', text: 'Text on the left, always.', project: 'b', scope, status, prefer: 'hero-split', over: 'hero-centered', at: iso() });
    expect(rank(HERO, gather([], [rule('pending', 'general')], 'a', NOW))[0]!.score).toBe(0);
    expect(rank(HERO, gather([], [rule('kept', 'project')], 'a', NOW))[0]!.score).toBe(0);
    expect(rank(HERO, gather([], [rule('kept', 'project')], 'b', NOW))[0]).toMatchObject({ option: 'split', score: 3 });
    const everywhere = gather([], [rule('kept', 'general')], 'a', NOW);
    expect(rank(HERO, everywhere)[0]).toMatchObject({ option: 'split', score: 1.5 });
    expect(advise(heroBoard('centered'), everywhere, intensityOf).hero!.because).toBe('Your rule: Text on the left, always.');
  });
});

describe('where it is kept', () => {
  let home: string;
  const before = process.env.PICKY_EATER_HOME;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'picky-eater-taste-'));
    process.env.PICKY_EATER_HOME = home;
  });
  afterEach(() => {
    process.env.PICKY_EATER_HOME = before;
    rmSync(home, { recursive: true, force: true });
  });

  test('choices are appended to one file in the home folder, and read back', () => {
    expect(readEvents()).toEqual([]);
    appendEvents([event('a', HERO, 'centered', 'split')]);
    appendEvents([event('b', HERO, 'split', 'split')]);
    expect(readEvents().map((e) => e.project)).toEqual(['a', 'b']);
    writeFileSync(join(home, 'taste', 'events.jsonl'), 'not json\n{"at":1}\n', { flag: 'a' });
    expect(readEvents()).toHaveLength(2); // a damaged line is skipped, not fatal
  });

  test('forgetting takes out a project, a pattern or everything', () => {
    appendEvents([event('a', HERO, 'centered', 'split'), event('b', FAQ, 'keep', 'grow')]);
    expect(forget('expand-height')).toEqual({ events: 1, rules: 0 });
    expect(readEvents().map((e) => e.project)).toEqual(['a']);
    expect(forget('a')).toEqual({ events: 1, rules: 0 });
    appendEvents([event('a', HERO, 'centered', 'split')]);
    proposeRule({ text: 'No motion on product screens.', project: 'a' });
    expect(forget(null)).toEqual({ events: 1, rules: 1 });
    expect(readEvents()).toEqual([]);
    expect(readRules()).toEqual([]);
  });

  test('a proposed rule waits; the person keeps it for the project or for all, or discards it', () => {
    const rule = proposeRule({ text: 'No motion on product screens.', project: 'a', from: 'q1' });
    expect(rule).toMatchObject({ id: 't1', status: 'pending', scope: 'project' });
    expect(settleRule('t1', 'general')).toMatchObject({ status: 'kept', scope: 'general' });
    expect(proposeRule({ text: 'Another one.', project: 'a' }).id).toBe('t2');
    settleRule('t2', 'discard');
    expect(readRules().map((r) => r.id)).toEqual(['t1']);
    expect(settleRule('t9', 'project')).toBeNull();
  });

  test('a project is named by its git remote, the same in every checkout and worktree of it', () => {
    const repo = join(home, 'repo');
    mkdirSync(join(repo, '.git', 'worktrees', 'wt'), { recursive: true });
    writeFileSync(join(repo, '.git', 'config'), '[core]\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:Acme/Shop.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n');
    expect(projectKey(repo)).toBe('github.com/acme/shop');
    mkdirSync(join(repo, 'packages', 'web'), { recursive: true });
    expect(projectKey(join(repo, 'packages', 'web'))).toBe('github.com/acme/shop');
    const worktree = join(home, 'elsewhere');
    mkdirSync(worktree);
    writeFileSync(join(worktree, '.git'), `gitdir: ${join(repo, '.git', 'worktrees', 'wt')}\n`);
    writeFileSync(join(repo, '.git', 'worktrees', 'wt', 'commondir'), '../..\n');
    expect(projectKey(worktree)).toBe('github.com/acme/shop');
    writeFileSync(join(repo, '.git', 'config'), '[remote "origin"]\n\turl = https://token:secret@gitlab.example.com/team/app.git\n');
    expect(projectKey(repo)).toBe('gitlab.example.com/team/app'); // credentials are not kept
    const plain = join(home, 'plain');
    mkdirSync(plain);
    expect(projectKey(plain)).toMatch(/^folder-[a-f0-9]{12}$/);
  });
});
