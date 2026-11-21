import { createHash } from 'node:crypto';
import { createServer, request, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Board } from '../../src/core/schema.js';
import { injectAgent, rewriteCsp, stagePortFor, startStageProxy, type StageProxy } from '../../src/server/stage-proxy.js';

/** A stand-in for the user's development server that records what it was asked. */
interface Upstream {
  server: Server;
  origin: string;
  seen: IncomingMessage[];
  handler: (req: IncomingMessage, res: ServerResponse) => void;
}

let up: Upstream;
let stage: StageProxy;
const REVIEW = ['http://127.0.0.1:4999', 'http://localhost:4999'];

const board = (base: Record<string, unknown>, script = false) =>
  Board.parse({
    schema: 'picky-eater/board',
    schemaVersion: '2.0',
    title: 'Page',
    base: { kind: 'live', url: `${up.origin}/`, ...base },
    areas: [
      {
        id: 'hero',
        label: 'Hero',
        anchor: '.hero',
        options: [
          { id: 'keep', label: 'Keep', keep: true },
          { id: 'new', label: 'New', patch: script ? [{ script: "area.dataset.on = '1'", undo: 'delete area.dataset.on' }] : [{ css: '.hero{color:red}' }] },
        ],
      },
    ],
  });

beforeEach(async () => {
  const seen: IncomingMessage[] = [];
  up = { server: createServer(), origin: '', seen, handler: (_, res) => res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html><head><title>App</title></head><body>app</body></html>') };
  up.server.on('request', (req, res) => {
    seen.push(req);
    up.handler(req, res);
  });
  await new Promise<void>((r) => up.server.listen(0, '127.0.0.1', r));
  up.origin = `http://127.0.0.1:${(up.server.address() as AddressInfo).port}`;
  stage = await startStageProxy({ agentJs: '/* agent */(()=>{})();' });
  stage.configure({ reviewOrigins: REVIEW, revision: 3, board: board({}) });
});
afterEach(async () => {
  await stage.close();
  up.server.closeAllConnections();
  await new Promise((r) => up.server.close(r));
});

const get = (path: string, init: RequestInit = {}) => fetch(stage.origin + path, { redirect: 'manual', ...init });

describe('stage listener: proxying', () => {
  test('the development server sees its own host and origin', async () => {
    await get('/pricing?x=1', { method: 'POST', headers: { Origin: stage.origin, Referer: `${stage.origin}/a` }, body: 'hello' });
    const req = up.seen[0]!;
    expect(req.url).toBe('/pricing?x=1');
    expect(req.method).toBe('POST');
    expect(req.headers.host).toBe(new URL(up.origin).host);
    expect(req.headers.origin).toBe(up.origin);
    expect(req.headers.referer).toBe(`${up.origin}/a`);
  });

  test('HTML gets the agent as its first script; other files pass untouched', async () => {
    const html = await (await get('/')).text();
    expect(html).toContain('<head><script src="/__pe/agent.js" data-pe-agent></script><title>App</title>');
    up.handler = (_, res) => res.writeHead(200, { 'Content-Type': 'text/css' }).end('<head>{}');
    expect(await (await get('/a.css')).text()).toBe('<head>{}');
  });

  test('compressed HTML is unpacked before the tag is added', async () => {
    up.handler = (_, res) => res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Encoding': 'gzip' }).end(gzipSync('<html><head></head><body>zipped</body></html>'));
    const res = await get('/');
    expect(res.headers.get('content-encoding')).toBeNull();
    expect(await res.text()).toBe('<html><head><script src="/__pe/agent.js" data-pe-agent></script></head><body>zipped</body></html>');
  });

  test('framing is allowed for the review page only, whatever the app says', async () => {
    up.handler = (_, res) =>
      res.writeHead(200, { 'Content-Type': 'text/html', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'" }).end('<html><head></head></html>');
    const res = await get('/');
    expect(res.headers.get('x-frame-options')).toBeNull();
    const csp = res.headers.get('content-security-policy')!;
    expect(csp).toContain(`frame-ancestors ${REVIEW.join(' ')}`);
    expect(csp).not.toContain("frame-ancestors 'none'");
    expect(csp).toContain(`script-src 'self' ${stage.origin}/__pe/`);

    up.handler = (_, res) => res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html><head></head></html>');
    expect((await get('/')).headers.get('content-security-policy')).toBe(`frame-ancestors ${REVIEW.join(' ')}`);
  });

  test('a nonce policy is kept, and the tag carries the nonce', async () => {
    up.handler = (_, res) => res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': "script-src 'nonce-abc123' 'strict-dynamic'" }).end('<html><head></head></html>');
    const res = await get('/');
    expect(res.headers.get('content-security-policy')).toContain("script-src 'nonce-abc123' 'strict-dynamic'");
    expect(res.headers.get('content-security-policy')).not.toContain('/__pe/');
    expect(await res.text()).toContain('<script src="/__pe/agent.js" nonce="abc123" data-pe-agent></script>');
  });

  test('a policy written into the page lets the agent load as well', async () => {
    up.handler = (_, res) => res.writeHead(200, { 'Content-Type': 'text/html' }).end(`<html><head><meta http-equiv="Content-Security-Policy" content="script-src 'self'"></head></html>`);
    expect(await (await get('/')).text()).toContain(`content="script-src 'self' ${stage.origin}/__pe/"`);
  });

  test('cookies lose their Domain, redirects and absolute addresses point at the stage', async () => {
    up.handler = (_, res) =>
      res
        .writeHead(302, { 'Content-Type': 'text/html', Location: `${up.origin}/login?next=/`, 'Set-Cookie': ['sid=1; Path=/; Domain=localhost; HttpOnly; SameSite=Lax', 'theme=dark; domain=.example.test'] })
        .end(`<html><head></head><body><a href="${up.origin}/x">x</a></body></html>`);
    const res = await get('/');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${stage.origin}/login?next=/`);
    expect(res.headers.getSetCookie()).toEqual(['sid=1; Path=/; HttpOnly; SameSite=Lax', 'theme=dark']);
    expect(await res.text()).toContain(`<a href="${stage.origin}/x">x</a>`);
  });

  test('service workers are switched off unless the board allows them', async () => {
    up.handler = (_, res) => res.writeHead(200, { 'Content-Type': 'text/javascript' }).end('self.caching = true;');
    const worker = { headers: { 'Service-Worker': 'script' } };
    expect(await (await get('/sw.js', worker)).text()).not.toContain('caching');
    expect(up.seen).toHaveLength(0);
    expect(await (await get('/sw.js')).text()).toBe('self.caching = true;'); // an ordinary request for the same file
    stage.configure({ reviewOrigins: REVIEW, revision: 3, board: board({ serviceWorker: 'allow' }) });
    expect(await (await get('/sw.js', worker)).text()).toBe('self.caching = true;');
  });

  test('a hot-reload socket is piped through, with the development server’s own host', async () => {
    let handshake: IncomingMessage | null = null;
    up.server.on('upgrade', (req, socket) => {
      handshake = req;
      socket.on('end', () => socket.destroy());
      const accept = createHash('sha1').update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
      socket.write(Buffer.concat([Buffer.from([0x81, 5]), Buffer.from('hello')]));
    });
    const ws = new WebSocket(`${stage.origin.replace('http', 'ws')}/__hmr`);
    const message = await new Promise<string>((resolve, reject) => {
      ws.addEventListener('message', (e) => resolve(String(e.data)));
      ws.addEventListener('error', () => reject(new Error('socket failed')));
    });
    ws.close();
    expect(message).toBe('hello');
    expect(handshake!.url).toBe('/__hmr');
    expect(handshake!.headers.host).toBe(new URL(up.origin).host);
  });

  test('a development server that is not running is explained, not hidden', async () => {
    const port = (up.server.address() as AddressInfo).port;
    await new Promise((r) => up.server.close(r));
    const res = await get('/');
    expect(res.status).toBe(502);
    expect(await res.text()).toContain(`could not reach <b>http://127.0.0.1:${port}</b>`);
    await new Promise<void>((r) => up.server.listen(port, '127.0.0.1', r));
  });
});

describe('stage listener: its own files and its limits', () => {
  test('the agent is served with the review origins it obeys', async () => {
    const res = await get('/__pe/agent.js');
    expect(res.headers.get('content-type')).toContain('text/javascript');
    const js = await res.text();
    expect(js).toContain('/* agent */');
    const cfg = JSON.parse(/\}\)\((\{.*\})\);\s*$/s.exec(js)![1]!);
    expect(cfg).toEqual({ origins: REVIEW, mode: 'proxy', serviceWorker: 'block', base: stage.origin });
    expect(up.seen).toHaveLength(0);
  });

  test('a patch script is served only for the revision on show, with a plain key', async () => {
    stage.configure({ reviewOrigins: REVIEW, revision: 3, board: board({}, true) });
    const ok = await get('/__pe/op.js?r=3&a=hero&o=new&i=0&k=do&key=1.2');
    expect(await ok.text()).toBe(`__peRun("1.2", function (area, document) {\narea.dataset.on = '1'\n});\n`);
    expect(await (await get('/__pe/op.js?r=3&a=hero&o=new&i=0&k=undo&key=1.2')).text()).toContain('delete area.dataset.on');
    for (const query of ['r=2&a=hero&o=new&i=0&k=do&key=1.2', 'r=3&a=hero&o=keep&i=0&k=do&key=1.2', 'r=3&a=hero&o=new&i=0&k=do&key=1);alert(1', 'r=3&a=hero&o=new&i=0&k=run&key=1.2', 'r=3&a=hero&o=new&i=9&k=do&key=1.2']) {
      expect((await get(`/__pe/op.js?${query}`)).status, query).toBe(404);
    }
  });

  test('with "attach": "tag" nothing is proxied; only the agent is served', async () => {
    stage.configure({ reviewOrigins: REVIEW, revision: 3, board: board({ attach: 'tag' }) });
    expect((await get('/')).status).toBe(404);
    expect(up.seen).toHaveLength(0);
    expect(await (await get('/__pe/agent.js')).text()).toContain('"mode":"tag"');
  });

  test('without a board over an existing page nothing is shown from here', async () => {
    stage.configure({ reviewOrigins: REVIEW, revision: 0, board: null });
    expect((await get('/')).status).toBe(404);
  });

  test('a request under another host name is refused (DNS rebinding)', async () => {
    const status = await new Promise<number>((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port: stage.port, path: '/', headers: { Host: 'evil.example' } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(403);
    expect(up.seen).toHaveLength(0);
  });

  test('the port is the same for the same project, and another one when it is taken', async () => {
    expect(stagePortFor('/a/project')).toBe(stagePortFor('/a/project'));
    expect(stagePortFor('/a/project')).not.toBe(stagePortFor('/another/project'));
    const second = await startStageProxy({ agentJs: '', port: stage.port });
    expect(second.port).not.toBe(stage.port);
    await second.close();
  });
});

describe('stage listener: pure helpers', () => {
  test('rewriteCsp', () => {
    const opts = { frameAncestors: ['http://127.0.0.1:1'], agentPrefix: 'http://127.0.0.1:2/__pe/' };
    expect(rewriteCsp("default-src 'none'", opts).csp).toBe("default-src 'none'; script-src 'none' http://127.0.0.1:2/__pe/; frame-ancestors http://127.0.0.1:1");
    expect(rewriteCsp("img-src *; frame-ancestors 'self' https://a.example", opts).csp).toBe('img-src *; frame-ancestors http://127.0.0.1:1');
    expect(rewriteCsp("script-src 'self'; script-src-elem 'self' https://cdn.example", opts).csp).toBe("script-src 'self'; script-src-elem 'self' https://cdn.example http://127.0.0.1:2/__pe/; frame-ancestors http://127.0.0.1:1");
    expect(rewriteCsp("script-src 'nonce-r4nd0m'", opts)).toEqual({ csp: "script-src 'nonce-r4nd0m'; frame-ancestors http://127.0.0.1:1", nonce: 'r4nd0m' });
  });

  test('injectAgent', () => {
    expect(injectAgent('<!DOCTYPE html><HTML lang="en"><HEAD data-x><title>x</title>', '<s>')).toBe('<!DOCTYPE html><HTML lang="en"><HEAD data-x><s><title>x</title>');
    expect(injectAgent('<html><body>x', '<s>')).toBe('<html><s><body>x');
    expect(injectAgent('<!doctype html><p>x', '<s>')).toBe('<!doctype html><s><p>x');
    expect(injectAgent('<p>x', '<s>')).toBe('<s><p>x');
    expect(injectAgent('<header>x</header>', '<s>')).toBe('<s><header>x</header>'); // <header> is not <head>
  });
});
