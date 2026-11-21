import { createHash } from 'node:crypto';
import { createServer, request as httpRequest, type IncomingHttpHeaders, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import type { Board } from '../core/schema.js';
import type { StageConfig } from '../stage/protocol.js';
import { allowedHostHeaders } from './security.js';

/**
 * The stage listener: a second loopback port from which the user's app is shown, so that the app
 * and the review page are different origins and can only talk by postMessage.
 *
 * In "proxy" mode it is a reverse proxy in front of the user's development server that adds one
 * script tag to every HTML page. In "tag" mode the app is framed from its own origin and this
 * listener only serves that script. It never proxies anywhere but to a loopback address.
 */

export interface StageSetup {
  /** Origins of the review page: the only pages that may frame the app and talk to the agent. */
  reviewOrigins: string[];
  revision: number;
  /** The current revision's board, or null when there is nothing to show from here. */
  board: Board | null;
}

export interface StageProxy {
  server: Server;
  port: number;
  origin: string;
  configure(setup: StageSetup): void;
  close(): Promise<void>;
}

export interface StageProxyOptions {
  /** The built stage agent (an IIFE that expects __PE_STAGE__). */
  agentJs: string;
  /** Tried first, then the next few ports, then any free port. */
  port?: number;
  log?: (line: string) => void;
}

const HOST = '127.0.0.1';
const MAX_HTML = 12 * 1024 * 1024;
const AGENT_PATH = '/__pe/agent.js';

/** A stable port per project, so that the app's storage and logins survive a restart of the preview. */
export function stagePortFor(projectRoot: string): number {
  return 42000 + (parseInt(createHash('sha256').update(projectRoot).digest('hex').slice(0, 8), 16) % 5000);
}

/**
 * Make an app's Content-Security-Policy work inside the review: the review page may frame it and
 * the agent script may load. Nothing else is loosened. Returns the nonce to put on the tag, if the
 * policy uses nonces.
 */
export function rewriteCsp(value: string, opts: { frameAncestors: string[] | null; agentPrefix: string }): { csp: string; nonce: string | null } {
  const directives = value
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => opts.frameAncestors === null || !/^frame-ancestors\b/i.test(d));
  const index = (name: string) => directives.findIndex((d) => d.toLowerCase().startsWith(name + ' ') || d.toLowerCase() === name);
  let nonce: string | null = null;
  const scripts = index('script-src-elem') >= 0 ? index('script-src-elem') : index('script-src');
  if (scripts >= 0) {
    nonce = /'nonce-([A-Za-z0-9+/_=-]+)'/.exec(directives[scripts]!)?.[1] ?? null;
    if (!nonce) directives[scripts] = `${directives[scripts]} ${opts.agentPrefix}`;
  } else if (index('default-src') >= 0) {
    const fallback = directives[index('default-src')]!.replace(/^default-src\s*/i, '');
    nonce = /'nonce-([A-Za-z0-9+/_=-]+)'/.exec(fallback)?.[1] ?? null;
    directives.push(`script-src ${fallback}${nonce ? '' : ` ${opts.agentPrefix}`}`);
  }
  if (opts.frameAncestors) directives.push(`frame-ancestors ${opts.frameAncestors.join(' ')}`);
  return { csp: directives.join('; '), nonce };
}

/** Add the agent as the first script of an HTML page. */
export function injectAgent(html: string, tag: string): string {
  const head = /<head(?:\s[^>]*)?>/i.exec(html);
  if (head) return html.slice(0, head.index + head[0].length) + tag + html.slice(head.index + head[0].length);
  const root = /<html(?:\s[^>]*)?>/i.exec(html);
  if (root) return html.slice(0, root.index + root[0].length) + tag + html.slice(root.index + root[0].length);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  return doctype ? doctype[0] + tag + html.slice(doctype[0].length) : tag + html;
}

function decode(body: Buffer, encoding: string | undefined): Buffer | null {
  try {
    switch ((encoding ?? '').trim().toLowerCase()) {
      case '':
      case 'identity':
        return body;
      case 'gzip':
      case 'x-gzip':
        return gunzipSync(body);
      case 'br':
        return brotliDecompressSync(body);
      case 'deflate':
        return inflateSync(body);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

const page = (title: string, text: string) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;margin:15vh auto;max-width:520px;padding:0 24px;color:#1b1f24"><h1 style="font-size:20px">${title}</h1><p>${text}</p></body>`;

export async function startStageProxy(opts: StageProxyOptions): Promise<StageProxy> {
  const log = opts.log ?? (() => {});
  let setup: StageSetup = { reviewOrigins: [], revision: 0, board: null };
  let allowedHosts = new Set<string>();
  let port = 0;

  const live = () => (setup.board?.base.kind === 'live' ? setup.board.base : null);
  const upstream = (): URL | null => {
    const base = live();
    return base && base.attach === 'proxy' ? new URL(base.url) : null;
  };
  const config = (): StageConfig => ({
    origins: setup.reviewOrigins,
    mode: live()?.attach === 'tag' ? 'tag' : 'proxy',
    serviceWorker: live()?.serviceWorker ?? 'block',
    base: `http://${HOST}:${port}`,
  });

  const text = (res: ServerResponse, status: number, body: string, type: string, extra: Record<string, string> = {}) => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
    res.end(body);
  };

  /** Files of picky-eater itself: the agent, and the scripts of level-4 patches. */
  const own = (req: IncomingMessage, res: ServerResponse, url: URL): boolean => {
    if (!url.pathname.startsWith('/__pe/')) return false;
    // Loaded by a script tag, possibly from the app's own origin ("tag" mode).
    const js = { 'Cross-Origin-Resource-Policy': 'cross-origin' };
    if (url.pathname === AGENT_PATH) {
      text(res, 200, `(function(__PE_STAGE__){${opts.agentJs}\n})(${JSON.stringify(config())});\n`, 'text/javascript; charset=utf-8', js);
      return true;
    }
    if (url.pathname === '/__pe/op.js') {
      const p = url.searchParams;
      const key = p.get('key') ?? '';
      const area = setup.board?.areas.find((a) => a.id === p.get('a'));
      const op = area?.options.find((o) => o.id === p.get('o'))?.patch?.[Number(p.get('i'))];
      const kind = p.get('k');
      if (Number(p.get('r')) !== setup.revision || !op || !('script' in op) || !/^\d+\.\d+$/.test(key) || (kind !== 'do' && kind !== 'undo')) {
        text(res, 404, '/* no such patch script */', 'text/javascript; charset=utf-8', js);
        return true;
      }
      text(res, 200, `__peRun(${JSON.stringify(key)}, function (area, document) {\n${kind === 'do' ? op.script : op.undo}\n});\n`, 'text/javascript; charset=utf-8', js);
      return true;
    }
    text(res, 404, 'Not found.', 'text/plain; charset=utf-8');
    return true;
  };

  const mine = (req: IncomingMessage) => `http://${req.headers.host}`;
  /** Headers for the development server: it sees its own host and origin, as if the browser had asked it directly. */
  const outgoing = (req: IncomingMessage, target: URL): IncomingHttpHeaders => {
    const headers: IncomingHttpHeaders = { ...req.headers, host: target.host };
    const swap = (v: string) => (v.startsWith(mine(req)) ? target.origin + v.slice(mine(req).length) : v);
    if (typeof headers.origin === 'string') headers.origin = swap(headers.origin);
    if (typeof headers.referer === 'string') headers.referer = swap(headers.referer);
    return headers;
  };

  const proxy = (req: IncomingMessage, res: ServerResponse, target: URL) => {
    const base = live()!;
    if (base.serviceWorker === 'block' && req.headers['service-worker'] === 'script') {
      // A caching worker could serve pages that never pass through here.
      return text(res, 200, '/* picky-eater: service workers are switched off in the preview */\n', 'text/javascript; charset=utf-8');
    }
    const headers = outgoing(req, target);
    headers['accept-encoding'] = 'identity';
    const up = httpRequest({ hostname: target.hostname.replace(/^\[|\]$/g, ''), port: target.port, method: req.method, path: req.url, headers }, (from) => {
      const out: Record<string, string | string[]> = {};
      for (const [name, value] of Object.entries(from.headers)) if (value !== undefined) out[name] = value;
      const self = mine(req);
      delete out['x-frame-options'];
      if (typeof out.location === 'string' && out.location.startsWith(target.origin)) out.location = self + out.location.slice(target.origin.length);
      if (out['access-control-allow-origin'] === target.origin) out['access-control-allow-origin'] = self;
      if (out['set-cookie']) {
        // The cookie belongs to the stage origin now; a Domain attribute would make the browser drop it.
        out['set-cookie'] = ([] as string[]).concat(out['set-cookie']).map((c) => c.replace(/;\s*domain=[^;]*/gi, ''));
      }
      let nonce: string | null = null;
      if (out['content-security-policy']) {
        out['content-security-policy'] = ([] as string[]).concat(out['content-security-policy']).map((value) => {
          const r = rewriteCsp(value, { frameAncestors: setup.reviewOrigins, agentPrefix: `${self}/__pe/` });
          nonce ??= r.nonce;
          return r.csp;
        });
      } else {
        out['content-security-policy'] = `frame-ancestors ${setup.reviewOrigins.join(' ')}`;
      }

      const isHtml = /^text\/html\b/i.test(String(from.headers['content-type'] ?? ''));
      if (!isHtml || req.method === 'HEAD') {
        res.writeHead(from.statusCode ?? 502, out);
        from.pipe(res);
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      from.on('data', (c: Buffer) => {
        size += c.length;
        if (size <= MAX_HTML) chunks.push(c);
      });
      from.on('end', () => {
        const raw = Buffer.concat(chunks);
        const body = size <= MAX_HTML ? decode(raw, from.headers['content-encoding']) : null;
        if (!body) {
          // Too large, or packed in a way this listener does not read: pass it on untouched.
          res.writeHead(from.statusCode ?? 502, out);
          res.end(raw);
          return;
        }
        let html = body.toString('utf8').split(target.origin).join(self);
        // A policy in the page itself must let the agent load as well.
        html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, (meta) =>
          meta.replace(/(content\s*=\s*)(["'])([\s\S]*?)\2/i, (_, lead: string, quote: string, value: string) => {
            const r = rewriteCsp(value, { frameAncestors: null, agentPrefix: `${self}/__pe/` });
            nonce ??= r.nonce;
            return `${lead}${quote}${r.csp}${quote}`;
          }),
        );
        html = injectAgent(html, `<script src="${AGENT_PATH}"${nonce ? ` nonce="${nonce}"` : ''} data-pe-agent></script>`);
        const bytes = Buffer.from(html, 'utf8');
        delete out['content-encoding'];
        delete out['transfer-encoding'];
        out['content-length'] = String(bytes.length);
        res.writeHead(from.statusCode ?? 502, out);
        res.end(bytes);
      });
      from.on('error', () => res.destroy());
    });
    up.on('error', (err) => {
      log(`upstream error: ${(err as Error).message}`);
      if (res.headersSent) return void res.destroy();
      text(res, 502, page('The page is not running', `picky-eater could not reach <b>${target.origin}</b>. Start your development server, then reload this review.`), 'text/html; charset=utf-8', {
        'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; frame-ancestors ${setup.reviewOrigins.join(' ')}`,
      });
    });
    req.pipe(up);
  };

  const server = createServer((req, res) => {
    // DNS-rebinding protection, as on the review listener.
    if (!req.headers.host || !allowedHosts.has(req.headers.host)) return text(res, 403, 'Host not allowed.', 'text/plain; charset=utf-8');
    const url = new URL(req.url ?? '/', mine(req));
    if (own(req, res, url)) return;
    const target = upstream();
    if (!target) {
      return text(res, 404, page('Nothing is shown from here', 'This address shows a page of your app while a picky-eater review of an existing page is open.'), 'text/html; charset=utf-8');
    }
    proxy(req, res, target);
  });

  // Hot-reload sockets: pipe the upgrade straight through to the development server.
  const sockets = new Set<{ destroy(): void }>();
  server.on('upgrade', (req, socket, head) => {
    const target = upstream();
    if (!target || !req.headers.host || !allowedHosts.has(req.headers.host)) return void socket.destroy();
    const headers = outgoing(req, target);
    const up = connect(Number(target.port), target.hostname.replace(/^\[|\]$/g, ''), () => {
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (const [name, value] of Object.entries(headers)) for (const v of ([] as string[]).concat(value ?? [])) lines.push(`${name}: ${v}`);
      up.write(lines.join('\r\n') + '\r\n\r\n');
      if (head.length) up.write(head);
      socket.pipe(up);
      up.pipe(socket);
    });
    sockets.add(up).add(socket);
    const end = () => {
      up.destroy();
      socket.destroy();
      sockets.delete(up);
      sockets.delete(socket);
    };
    up.on('error', end);
    socket.on('error', end);
    up.on('close', end);
    socket.on('close', end);
    // An http server keeps a socket half open after the other side is done; a hot-reload socket is simply over.
    up.on('end', end);
    socket.on('end', end);
  });

  const listen = (p: number) =>
    new Promise<boolean>((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => (err.code === 'EADDRINUSE' ? resolve(false) : reject(err));
      server.once('error', onError);
      server.listen(p, HOST, () => {
        server.off('error', onError);
        resolve(true);
      });
    });
  const candidates = opts.port ? [...Array.from({ length: 8 }, (_, i) => opts.port! + i), 0] : [0];
  for (const candidate of candidates) {
    if (await listen(candidate)) break;
  }
  port = (server.address() as AddressInfo).port;
  allowedHosts = allowedHostHeaders(port);

  return {
    server,
    port,
    origin: `http://${HOST}:${port}`,
    configure: (next) => (setup = next),
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
