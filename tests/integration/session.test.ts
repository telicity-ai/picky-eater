import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { addRequest, approve, readView, reopen, setChoices } from '../../src/session/review.js';
import { propose, readPack } from '../../src/session/revisions.js';
import { createSession, sessionPaths, workspace, type Ws } from '../../src/session/store.js';
import { EXAMPLE } from '../helpers/project.js';

let dir: string;
let ws: Ws;
const ID = 'workshop';
const ALL = { nav: 'links', hero: 'split', schedule: 'timeline', signup: 'stacked', 'signup-error': 'inline', 'signup-done': 'inline' };

const draft = (file: string) => join(sessionPaths(ws, ID).draftDir, file);
const edit = (file: string, change: (text: string) => string) => writeFileSync(draft(file), change(readFileSync(draft(file), 'utf8')));
const stamp = () => {
  const v = readView(ws, ID);
  return { revision: v.revision, digest: v.digest! };
};

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'picky-eater-session-'));
  ws = workspace(dir);
  process.env.PICKY_EATER_HOME = join(dir, '.home'); // what is approved here is remembered here
  createSession(ws, { title: 'Workshop sign-up', id: ID, from: EXAMPLE });
  await propose(ws, ID);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('choices', () => {
  test('areas inside an option only count once that option is chosen', async () => {
    expect(readView(ws, ID).active).toEqual(['nav', 'hero', 'schedule', 'signup']);
    const view = await setChoices(ws, ID, { ...stamp(), choices: { signup: 'stacked' } });
    expect(view.active).toEqual(['nav', 'hero', 'schedule', 'signup', 'signup-error', 'signup-done']);
    expect(view.missing).toEqual(['nav', 'hero', 'schedule', 'signup-error', 'signup-done']);
  });

  test('unknown options are refused', async () => {
    await expect(setChoices(ws, ID, { ...stamp(), choices: { hero: 'nope' } })).rejects.toMatchObject({ code: 'UNKNOWN_CHOICE' });
  });

  test('a request made for another revision is a conflict', async () => {
    await expect(setChoices(ws, ID, { revision: 1, digest: 'a'.repeat(64), choices: {} })).rejects.toMatchObject({ code: 'STALE_REVISION' });
  });
});

describe('approval', () => {
  test('needs a choice for every area on the page', async () => {
    await setChoices(ws, ID, { ...stamp(), choices: { hero: 'split' } });
    await expect(approve(ws, ID, { ...stamp(), choices: { hero: 'split' } })).rejects.toMatchObject({ code: 'INCOMPLETE' });
  });

  test('binds to the choices the page showed', async () => {
    await setChoices(ws, ID, { ...stamp(), choices: ALL });
    await expect(approve(ws, ID, { ...stamp(), choices: { ...ALL, hero: 'centered' } })).rejects.toMatchObject({ code: 'STALE_CHOICES' });
    const view = await approve(ws, ID, { ...stamp(), choices: ALL });
    expect(view.phase).toBe('approved');
    expect(view.approval).toMatchObject({ id: 'r1-a1', revision: 1, choices: ALL, status: 'current', changedSincePrevious: [] });
  });

  test('locks the choices until it is reopened, and records what changed next time', async () => {
    await setChoices(ws, ID, { ...stamp(), choices: ALL });
    await approve(ws, ID, { ...stamp(), choices: ALL });
    await expect(setChoices(ws, ID, { ...stamp(), choices: { ...ALL, hero: 'facts' } })).rejects.toMatchObject({ code: 'APPROVED' });

    expect((await reopen(ws, ID, stamp())).phase).toBe('choosing');
    const next = { ...ALL, hero: 'facts' };
    await setChoices(ws, ID, { ...stamp(), choices: next });
    const view = await approve(ws, ID, { ...stamp(), choices: next });
    expect(view.approval).toMatchObject({ id: 'r1-a2', changedSincePrevious: [{ area: 'hero', from: 'split', to: 'facts' }] });
    expect(view.approvals.map((a) => a.status)).toEqual(['withdrawn', 'current']);
  });
});

describe('change requests and new revisions', () => {
  test('a request withdraws the approval and must be answered by the next revision', async () => {
    await setChoices(ws, ID, { ...stamp(), choices: ALL });
    await approve(ws, ID, { ...stamp(), choices: ALL });
    const asked = await addRequest(ws, ID, { ...stamp(), area: 'hero', cut: 'top', text: 'Show the price in the banner.' });
    expect(asked.phase).toBe('changes-requested');
    expect(asked.approval).toBeNull();

    // A draft that does not touch the hero does not answer the request.
    edit('areas/schedule/table.html', (t) => t.replace('Schedule', 'Programme'));
    await expect(propose(ws, ID)).rejects.toMatchObject({ code: 'REQUEST_NOT_ANSWERED' });

    edit('areas/hero/facts.html', (t) => t.replace('Free, 40 seats', 'Free'));
    const result = await propose(ws, ID);
    expect(result).toMatchObject({ revision: 2, answered: ['q1'] });
    // Choices for areas that look the same are kept; the changed areas are asked again.
    expect(result.dropped.sort()).toEqual(['hero', 'schedule']);
    expect(result.kept.sort()).toEqual(['nav', 'signup', 'signup-done', 'signup-error']);

    const view = readView(ws, ID);
    expect(view.phase).toBe('choosing');
    expect(view.requests[0]).toMatchObject({ id: 'q1', status: 'answered', answeredIn: 2 });
    expect(view.history.map((h) => h.revision)).toEqual([1, 2]);
  });

  test('a new revision supersedes an approval', async () => {
    await setChoices(ws, ID, { ...stamp(), choices: ALL });
    await approve(ws, ID, { ...stamp(), choices: ALL });
    edit('areas/nav/minimal.html', (t) => t.replace('Sign up', 'Join'));
    const result = await propose(ws, ID);
    expect(result.approvalSuperseded).toBe('r1-a1');
    expect(readView(ws, ID).phase).toBe('choosing');
  });

  test('approving settles requests that were still open', async () => {
    await addRequest(ws, ID, { ...stamp(), area: null, cut: null, text: 'Make it warmer.' });
    await setChoices(ws, ID, { ...stamp(), choices: ALL });
    const view = await approve(ws, ID, { ...stamp(), choices: ALL });
    expect(view.requests[0]!.status).toBe('dismissed');
    expect(view.phase).toBe('approved');
  });
});

describe('published revisions', () => {
  test('a pack carries every file and inlines images', () => {
    const pack = readPack(ws, ID, 1);
    expect(Object.keys(pack.files)).toEqual(expect.arrayContaining(['frame.html', 'styles.css', 'areas/hero/split.html']));
    expect(pack.assets['assets/room.svg']).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(pack.placements['signup-done']!.hosts).toHaveLength(2);
  });

  test('files changed after publishing are not served', () => {
    const file = join(sessionPaths(ws, ID).revisionDir(1), 'areas/hero/split.html');
    writeFileSync(file, readFileSync(file, 'utf8') + '<p>sneaked in</p>');
    expect(() => readPack(ws, ID, 1)).toThrow(/modified after it was published/);
  });
});
