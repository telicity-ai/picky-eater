import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { startReviewServer, type ReviewServer } from '../../src/server/review-server.js';
import { approve, readView, reopen, setChoices } from '../../src/session/review.js';
import { propose, readPack } from '../../src/session/revisions.js';
import { createSession, sessionPaths, workspace, type Ws } from '../../src/session/store.js';
import { proposeRule, readEvents, readRules } from '../../src/taste/store.js';
import { EXAMPLE, makeProject } from '../helpers/project.js';

/**
 * What a person approves is remembered outside the project and comes back as the suggested mark of
 * the next draft. The person's part (choosing, approving) is done through the library here, as in
 * the other tests; the product gives an agent no way to do it.
 */

let home: string;
const dirs: string[] = [];
const ALL = { nav: 'links', hero: 'centered', schedule: 'timeline', signup: 'stacked', 'signup-error': 'inline', 'signup-done': 'inline' };

function project(): Ws {
  const dir = mkdtempSync(join(tmpdir(), 'picky-eater-taste-project-'));
  dirs.push(dir);
  const ws = workspace(dir);
  createSession(ws, { title: 'Workshop sign-up', id: 'workshop', from: EXAMPLE });
  return ws;
}
const stamp = (ws: Ws) => {
  const v = readView(ws, 'workshop');
  return { revision: v.revision, digest: v.digest! };
};
async function approveAll(ws: Ws, choices: Record<string, string> = ALL): Promise<void> {
  await setChoices(ws, 'workshop', { ...stamp(ws), choices });
  await approve(ws, 'workshop', { ...stamp(ws), choices });
}
const hero = (ws: Ws, n: number) => readPack(ws, 'workshop', n).board.areas.find((a) => a.id === 'hero')!;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'picky-eater-home-'));
  process.env.PICKY_EATER_HOME = home;
  delete process.env.PICKY_EATER_TASTE;
});
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

describe('remembering what was chosen', () => {
  test('an approval is recorded with what was offered, what carried the mark and what was taken: ids only', async () => {
    const ws = project();
    await propose(ws, 'workshop');
    expect(hero(ws, 1).options.find((o) => o.suggested)!.id).toBe('split'); // the example's own suggestion
    await approveAll(ws);
    const events = readEvents();
    expect(events.map((e) => e.area).sort()).toEqual(Object.keys(ALL).sort());
    const e = events.find((x) => x.area === 'hero')!;
    expect(e).toMatchObject({ session: 'workshop', revision: 1, suggested: 'split', suggestedBy: 'agent', chosen: 'centered' });
    expect(e.project).toMatch(/^folder-/);
    expect(e.offered).toEqual([
      { option: 'split', pattern: 'hero-split' },
      { option: 'centered', pattern: 'hero-centered' },
      { option: 'facts', pattern: 'hero-split' },
    ]);
    // Nothing a person wrote or read is in the file: no labels, no markup, no texts of the page.
    const raw = readFileSync(join(home, 'taste', 'events.jsonl'), 'utf8');
    expect(raw).not.toMatch(/Learn to ship|Text on the left|<|"label"/);
  });

  test('the next draft of the same project carries the mark where the person chose, and says why', async () => {
    const ws = project();
    await propose(ws, 'workshop');
    await approveAll(ws);
    // The agent publishes again and still marks "split".
    const draft = join(sessionPaths(ws, 'workshop').draftDir, 'areas/hero/split.html');
    writeFileSync(draft, readFileSync(draft, 'utf8').replace('Save my seat', 'Save a seat'));
    const result = await propose(ws, 'workshop');
    expect(result.moved).toEqual([{ area: 'hero', option: 'centered', because: 'You chose this over "Text on the left, picture on the right" in this project.' }]);
    const options = hero(ws, 2).options;
    expect(options.find((o) => o.suggested)).toMatchObject({ id: 'centered', because: 'You chose this over "Text on the left, picture on the right" in this project.' });
    expect(options.find((o) => o.id === 'split')!.suggested).toBeUndefined();
    expect(readPack(ws, 'workshop', 2).notes.hero).toMatchObject({ by: 'taste' });
    expect(readPack(ws, 'workshop', 2).notes.nav).toMatchObject({ by: 'agent' });
    // The published board itself is untouched: the mark is advice, not content.
    const frozen = JSON.parse(readFileSync(join(sessionPaths(ws, 'workshop').revisionDir(2), 'board.json'), 'utf8'));
    expect(frozen.areas.find((a: { id: string }) => a.id === 'hero').options.find((o: { suggested?: boolean }) => o.suggested).id).toBe('split');
  });

  test('another project is not moved by one choice elsewhere, and is once it repeats', async () => {
    const first = project();
    await propose(first, 'workshop');
    await approveAll(first);
    const second = project();
    expect((await propose(second, 'workshop')).moved).toEqual([]);
    await approveAll(second);
    const third = project();
    expect((await propose(third, 'workshop')).moved).toEqual([{ area: 'hero', option: 'centered', because: 'You chose this over "Text on the left, picture on the right" in 2 projects.' }]);
  });

  test('approving again replaces what the session said before; reopening alone changes nothing', async () => {
    const ws = project();
    await propose(ws, 'workshop');
    await approveAll(ws);
    await reopen(ws, 'workshop', stamp(ws));
    expect(readEvents().filter((e) => e.area === 'hero')).toHaveLength(1);
    await approveAll(ws, { ...ALL, hero: 'split' });
    const draft = join(sessionPaths(ws, 'workshop').draftDir, 'areas/hero/split.html');
    writeFileSync(draft, readFileSync(draft, 'utf8').replace('Save my seat', 'Save a seat'));
    expect((await propose(ws, 'workshop')).moved).toEqual([]); // the last word was "split", which is what the draft marks
  });

  test('switched off, nothing is written and nothing is moved', async () => {
    process.env.PICKY_EATER_TASTE = 'off';
    const ws = project();
    await propose(ws, 'workshop');
    await approveAll(ws);
    expect(readEvents()).toEqual([]);
    delete process.env.PICKY_EATER_TASTE;
    const cli = makeProject({ home });
    dirs.push(cli.dir);
    await cli.pe('new', '--title', 'Workshop sign-up', '--id', 'workshop', '--from', EXAMPLE);
    expect((await cli.pe('taste', '--off')).stdout).toContain('no longer reads or writes');
    await cli.pe('propose');
    await approveAll(workspace(cli.dir));
    expect(readEvents()).toEqual([]);
    expect((await cli.pe('taste', '--on')).stdout).toContain('remembers choices again');
  });
});

describe('the taste command', () => {
  test('it shows what is known and where it comes from, and forgets on request', async () => {
    const cli = makeProject({ home });
    dirs.push(cli.dir);
    await cli.pe('new', '--title', 'Workshop sign-up', '--id', 'workshop', '--from', EXAMPLE);
    expect((await cli.pe('taste')).stdout).toContain('No choices yet');
    await cli.pe('propose');
    await approveAll(workspace(cli.dir));
    const shown = (await cli.pe('taste')).stdout;
    expect(shown).toContain('6 choice(s)');
    expect(shown).toContain('In this project (counts in full)');
    expect(shown).toContain('hero-centered over hero-split — 1 time in this project (weight 2.0)');
    const json = await cli.json<{ on: boolean; choices: number; preferences: Array<{ key: string; scope: string }> }>('taste');
    expect(json).toMatchObject({ on: true, choices: 6 });
    expect(json.preferences).toContainEqual(expect.objectContaining({ key: 'p:hero-centered>p:hero-split', scope: 'project' }));
    expect((await cli.pe('taste', '--forget', 'hero-split')).stdout).toBe('Forgot 1 choice(s) and 0 rule(s).\n');
    expect((await cli.pe('taste', '--forget-all')).stdout).toBe('Forgot 5 choice(s) and 0 rule(s).\n');
  });

  test('the agent can propose a rule; it stays pending until the person keeps it', async () => {
    const cli = makeProject({ home });
    dirs.push(cli.dir);
    await cli.pe('new', '--title', 'Workshop sign-up', '--id', 'workshop', '--from', EXAMPLE);
    expect((await cli.pe('taste', 'propose')).stderr).toContain('one sentence');
    expect((await cli.pe('taste', 'propose', '--rule', 'x', '--prefer', 'hero-split')).stderr).toContain('--prefer and --over go together');
    expect((await cli.pe('taste', 'propose', '--rule', 'Text on the left.', '--prefer', 'hero-split', '--over', 'nope')).stderr).toContain('not a pattern of the catalog');
    const out = (await cli.pe('taste', 'propose', '--rule', 'Text on the left, always.', '--prefer', 'hero-split', '--over', 'hero-centered', '--from', 'q1')).stdout;
    expect(out).toContain('Proposed rule t1');
    expect(out).toContain('It is pending');
    expect(readRules()).toEqual([expect.objectContaining({ id: 't1', status: 'pending', scope: 'project', prefer: 'hero-split', over: 'hero-centered', from: 'q1' })]);
    expect((await cli.pe('taste')).stdout).toContain('t1 [pending: the person decides in the review] Text on the left, always.');
    // A pending rule moves nothing.
    const published = await cli.json<{ moved: unknown[] }>('propose');
    expect(published.moved).toEqual([]);
  });

  test('"recommend" names the candidates of a decision and what earlier choices speak for', async () => {
    const cli = makeProject({ home });
    dirs.push(cli.dir);
    await cli.pe('new', '--title', 'Workshop sign-up', '--id', 'workshop', '--from', EXAMPLE);
    const before = (await cli.pe('recommend', 'landing-hero')).stdout;
    expect(before).toContain('landing-hero — Lay out a landing page hero');
    expect(before).toContain('offer  hero-split — ');
    expect(before).toContain('earlier choices: nothing yet for these options');
    await cli.pe('propose');
    await approveAll(workspace(cli.dir));
    expect((await cli.pe('recommend', 'landing-hero')).stdout).toContain('earlier choices speak for hero-centered: You chose this over "Split hero" in this project.');
    const gated = (await cli.pe('recommend', 'content-entrance', '--frequency', 'frequent')).stdout;
    expect(gated).toContain('leave out  stagger-in — This moment is met often; this motion is right only up to rare use.');
    expect((await cli.pe('recommend', 'no-such-decision')).stderr).toContain('Not a decision of the catalog');
    expect((await cli.pe('recommend', 'landing-hero', '--frequency', 'sometimes')).stderr).toContain('--frequency is how often');
  });
});

describe('keeping a rule is the person\'s', () => {
  let server: ReviewServer;
  let ws: Ws;
  const assets = { 'index.html': '<!doctype html><title>review</title>', 'app.js': '', 'app.css': '', 'agent.js': '', 'probe.js': '', 'composer.js': '' };
  const call = (path: string, body: unknown, headers: Record<string, string>) =>
    new Promise<{ status: number; data: any }>((resolve, reject) => {
      const text = JSON.stringify(body);
      const req = request({ host: '127.0.0.1', port: server.port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text), Origin: server.origin, ...headers } }, (res) => {
        let out = '';
        res.on('data', (c: Buffer) => (out += c.toString()));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, data: out ? JSON.parse(out) : null }));
      });
      req.on('error', reject);
      req.end(text);
    });

  beforeEach(async () => {
    ws = project();
    await propose(ws, 'workshop');
    server = await startReviewServer({ ws, sessionId: 'workshop', assets });
  });
  afterEach(async () => {
    await server.close();
  });

  test('the page can keep or discard a rule of its project; the command line cannot', async () => {
    const rule = proposeRule({ text: 'Text on the left, always.', project: (await import('../../src/taste/store.js')).projectKey(ws.root), prefer: 'hero-split', over: 'hero-centered' });
    const denied = await call('/api/rule', { id: rule.id, verdict: 'general' }, { Authorization: `Bearer ${server.cliToken}` });
    expect(denied.status).toBe(403);
    expect(denied.data.error.code).toBe('PAGE_ONLY');
    expect(readRules()[0]!.status).toBe('pending');

    const kept = await call('/api/rule', { id: rule.id, verdict: 'general' }, { 'X-PE-Token': server.pageToken });
    expect(kept.status).toBe(200);
    expect(kept.data.rules).toEqual([{ id: 't1', text: 'Text on the left, always.', status: 'kept', scope: 'general' }]);
    expect(readRules()[0]).toMatchObject({ status: 'kept', scope: 'general' });

    // A rule of another project is not this page's to settle.
    const foreign = proposeRule({ text: 'Somewhere else.', project: 'github.com/other/project' });
    expect((await call('/api/rule', { id: foreign.id, verdict: 'project' }, { 'X-PE-Token': server.pageToken })).status).toBe(404);
    expect((await call('/api/rule', { id: 't1', verdict: 'maybe' }, { 'X-PE-Token': server.pageToken })).status).toBe(400);
    const gone = await call('/api/rule', { id: 't1', verdict: 'discard' }, { 'X-PE-Token': server.pageToken });
    expect(gone.data.rules).toEqual([]);
  });
});
