import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { startReviewServer, type ReviewServer } from '../../src/server/review-server.js';
import { readView } from '../../src/session/review.js';
import { propose } from '../../src/session/revisions.js';
import { createSession, workspace, type Ws } from '../../src/session/store.js';
import { EXAMPLE } from '../helpers/project.js';

let dir: string;
let ws: Ws;
let server: ReviewServer;
const ID = 'workshop';
const ALL = { nav: 'links', hero: 'split', schedule: 'timeline', signup: 'stacked', 'signup-error': 'inline', 'signup-done': 'inline' };
const assets = { 'index.html': '<!doctype html><title>review</title>', 'app.js': '/* js */', 'app.css': '/* css */', 'agent.js': '/* agent */', 'probe.js': '', 'composer.js': '' };

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'picky-eater-server-'));
  ws = workspace(dir);
  process.env.PICKY_EATER_HOME = join(dir, '.home'); // what is approved here is remembered here
  createSession(ws, { title: 'Workshop sign-up', id: ID, from: EXAMPLE });
  await propose(ws, ID);
  server = await startReviewServer({ ws, sessionId: ID, assets });
});
afterEach(async () => {
  await server.close();
  rmSync(dir, { recursive: true, force: true });
});

const page = (extra: Record<string, string> = {}) => ({ 'X-PE-Token': server.pageToken, Origin: server.origin, 'Content-Type': 'application/json', ...extra });
const cli = () => ({ Authorization: `Bearer ${server.cliToken}`, 'Content-Type': 'application/json' });
const get = (path: string, headers: Record<string, string> = {}) => fetch(server.origin + path, { headers });
const post = (path: string, body: unknown, headers: Record<string, string>) => fetch(server.origin + path, { method: 'POST', headers, body: JSON.stringify(body) });
const stamp = () => {
  const v = readView(ws, ID);
  return { revision: v.revision, digest: v.digest! };
};
const code = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

/** A request with a Host header fetch() would not let us set. */
function withHost(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: server.port, path: '/api/health', headers: { Host: host } }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });
}

describe('review server: access', () => {
  test('serves the page without a token, and nothing else', async () => {
    const res = await get('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect((await get('/api/state')).status).toBe(401);
    expect((await get('/api/pack/1')).status).toBe(401);
    expect((await get('/api/state', { 'X-PE-Token': 'x'.repeat(43) })).status).toBe(401);
  });

  test('health says nothing about the session without the CLI token', async () => {
    expect(await (await get('/api/health')).json()).toEqual({ ok: true, app: 'picky-eater', version: expect.any(String) });
    expect(await (await get('/api/health', cli())).json()).toMatchObject({ sessionId: ID, pid: process.pid });
  });

  test('refuses a Host header that is not its own loopback address', async () => {
    expect(await withHost(`127.0.0.1:${server.port}`)).toBe(200);
    expect(await withHost(`localhost:${server.port}`)).toBe(200);
    expect(await withHost('evil.example')).toBe(403);
    expect(await withHost(`evil.example:${server.port}`)).toBe(403);
  });

  test('state and pack are served to the page, with an ETag', async () => {
    const res = await get('/api/state', page());
    const state = (await res.json()) as Record<string, any>;
    expect(state).toMatchObject({ phase: 'choosing', revision: 1, choices: {}, active: ['nav', 'hero', 'schedule', 'signup'] });
    expect(JSON.stringify(state)).not.toContain(dir);
    expect((await get('/api/state', { ...page(), 'If-None-Match': res.headers.get('etag')! })).status).toBe(304);

    const pack = (await (await get('/api/pack/1', page())).json()) as Record<string, any>;
    expect(pack.board.title).toBe('Workshop sign-up');
    expect(pack.files['frame.html']).toContain('data-pe-area="hero"');
    expect((await get('/api/pack/9', page())).status).toBe(404);
  });
});

describe('review server: decisions belong to the page', () => {
  test('the page can choose, ask for a change and approve', async () => {
    const chosen = await post('/api/choices', { ...stamp(), choices: ALL }, page());
    expect(chosen.status).toBe(200);
    expect(((await chosen.json()) as any).missing).toEqual([]);

    const approved = await post('/api/approve', { ...stamp(), choices: ALL }, page());
    expect(((await approved.json()) as any).phase).toBe('approved');

    const asked = await post('/api/requests', { ...stamp(), area: 'hero', cut: null, text: 'Bigger picture please' }, page());
    expect(((await asked.json()) as any).phase).toBe('changes-requested');
  });

  test('the CLI token can read and stop the server, and nothing else', async () => {
    expect((await get('/api/state', cli())).status).toBe(200);
    for (const path of ['/api/choices', '/api/approve', '/api/reopen', '/api/requests']) {
      const res = await post(path, { ...stamp(), choices: ALL }, cli());
      expect(res.status).toBe(403);
      expect(await code(res)).toBe('PAGE_ONLY');
    }
    expect(readView(ws, ID).choices).toEqual({});
    expect((await post('/api/shutdown', {}, cli())).status).toBe(200);
    await server.closed;
  });

  test('the page token cannot stop the server', async () => {
    expect((await post('/api/shutdown', {}, page())).status).toBe(404);
  });

  test('requests from another origin are refused even with the token', async () => {
    const body = { ...stamp(), choices: { hero: 'split' } };
    expect(await code(await post('/api/choices', body, page({ Origin: 'http://127.0.0.1:1' })))).toBe('BAD_ORIGIN');
    expect(await code(await post('/api/choices', body, page({ Origin: 'https://evil.example' })))).toBe('BAD_ORIGIN');
    expect(await code(await post('/api/choices', body, page({ 'Sec-Fetch-Site': 'cross-site' })))).toBe('BAD_ORIGIN');
    const { Origin: _omit, ...noOrigin } = page();
    expect(await code(await post('/api/choices', body, noOrigin))).toBe('BAD_ORIGIN');
    expect((await post('/api/choices', body, page({ 'Content-Type': 'text/plain' }))).status).toBe(415);
  });

  test('stale or malformed requests change nothing', async () => {
    const stale = await post('/api/approve', { revision: 1, digest: 'b'.repeat(64), choices: ALL }, page());
    expect(stale.status).toBe(409);
    expect((await post('/api/choices', { ...stamp(), choices: ALL, extra: true }, page())).status).toBe(400);
    expect((await post('/api/choices', { ...stamp(), choices: { hero: 'nope' } }, page())).status).toBe(400);
    const big = await post('/api/requests', { ...stamp(), area: null, cut: null, text: 'x'.repeat(70 * 1024) }, page());
    expect(big.status).toBe(413);
    expect(readView(ws, ID)).toMatchObject({ phase: 'choosing', choices: {} });
  });
});
