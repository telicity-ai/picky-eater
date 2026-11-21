import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { differencesByArea, latestCheck } from '../check/run.js';
import { Id, type LiveBase } from '../core/schema.js';
import { sessionPaths } from '../session/store.js';
import { PeError, nowIso, writeJsonAtomic } from '../session/fs.js';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ConflictError, addRequest, approve, readView, reopen, setChoices, type View } from '../session/review.js';
import { readPack, readRevision } from '../session/revisions.js';
import type { Ws } from '../session/store.js';
import { projectKey, readRules, settleRule, tasteOn } from '../taste/store.js';
import { VERSION } from '../version.js';
import { allowedHostHeaders, bearerToken, randomToken, readBody, reviewHeaders, safeEqual } from './security.js';
import type { StageProxy } from './stage-proxy.js';

export interface UiAssets {
  'index.html': string;
  'app.js': string;
  'app.css': string;
  /** The stage agent, served by the stage listener. */
  'agent.js': string;
  /** Evaluated by the headless browser of "implement" and "check"; never served. */
  'probe.js': string;
  'composer.js': string;
}

export interface ReviewServerOptions {
  ws: Ws;
  sessionId: string;
  assets: UiAssets;
  /** The second listener, from which the user's app is shown on boards over an existing page. */
  stage?: StageProxy;
  port?: number;
  /** Fixed tokens (tests). Default: fresh random tokens. */
  pageToken?: string;
  cliToken?: string;
  /** Stop after this long without a request. 0 disables. */
  idleTimeoutMs?: number;
  log?: (line: string) => void;
}

export interface ReviewServer {
  server: Server;
  port: number;
  /** Origin of the review page, e.g. "http://127.0.0.1:4173". */
  origin: string;
  /** The link for the person. It contains the page token: treat it like a password. */
  link: string;
  pageToken: string;
  cliToken: string;
  closed: Promise<void>;
  close(): Promise<void>;
}

const HOST = '127.0.0.1';
const MAX_BODY = 64 * 1024;

const Stamp = { revision: z.number().int().min(1), digest: z.string().regex(/^[a-f0-9]{64}$/) };
const ChoicesBody = z.strictObject({ ...Stamp, choices: z.record(Id, Id) });
const ReopenBody = z.strictObject({ ...Stamp });
const RequestBody = z.strictObject({ ...Stamp, area: Id.nullable(), cut: Id.nullable(), text: z.string().trim().min(3).max(2000) });
const RuleBody = z.strictObject({ id: z.string().regex(/^t\d+$/), verdict: z.enum(['project', 'general', 'discard']) });
const DiagnosticsBody = z.strictObject({
  ...Stamp,
  problems: z.array(z.strictObject({ area: Id, option: Id.nullable(), code: z.string().regex(/^[A-Z_]{3,40}$/), detail: z.string().max(300) })).max(60),
});

/** Where the review page finds the user's app. */
export interface StageInfo {
  mode: LiveBase['attach'];
  /** Origin of the framed page: the stage listener, or the app itself in "tag" mode. */
  origin: string;
  /** The address to frame. */
  url: string;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** What the review page receives. Session artifacts only, never filesystem paths. */
/** The newest comparison of the built page with what was approved, for the review page. */
export interface BuiltInfo {
  check: string;
  at: string;
  ok: boolean;
  differences: Array<{ area: string; text: string }>;
  /** Areas that have a picture of the approved and of the built page, per width. */
  shots: Array<{ viewport: string; area: string; approved: string; built: string }>;
}

/** Rules about the person's taste that concern this project: waiting for them, or kept. */
export interface RuleInfo {
  id: string;
  text: string;
  status: 'pending' | 'kept';
  scope: 'project' | 'general';
}

export function publicState(view: View, stage: StageInfo | null = null, built: BuiltInfo | null = null, rules: RuleInfo[] = []) {
  return {
    stage,
    built,
    rules,
    app: { name: 'picky-eater', version: VERSION },
    session: { id: view.session.id, title: view.session.title },
    phase: view.phase,
    revision: view.revision,
    digest: view.digest,
    choices: view.choices,
    active: view.active,
    missing: view.missing,
    approval: view.approval ? { id: view.approval.id, revision: view.approval.revision, approvedAt: view.approval.approvedAt } : null,
    approvals: view.approvals.map((a) => ({ id: a.id, revision: a.revision, approvedAt: a.approvedAt, status: a.status, changedSincePrevious: a.changedSincePrevious })),
    requests: view.requests,
    history: view.history,
  };
}
export type PublicState = ReturnType<typeof publicState>;

/**
 * The review listener: serves the review page and its JSON API on loopback.
 *
 * Access control has no cookie, because cookies are shared by every server on 127.0.0.1 regardless
 * of port. The page gets its token in the URL fragment (never sent to a server), keeps it in
 * storage scoped to this origin and sends it as X-PE-Token. The CLI has a second token that can
 * read state and stop the server, and nothing else: choices, requests and approval can only come
 * from the page.
 */
export async function startReviewServer(opts: ReviewServerOptions): Promise<ReviewServer> {
  const { ws, sessionId } = opts;
  const pageToken = opts.pageToken ?? randomToken();
  const cliToken = opts.cliToken ?? randomToken();
  const log = opts.log ?? (() => {});
  let allowedHosts = new Set<string>();
  let idleTimer: NodeJS.Timeout | null = null;

  /** The stage listener follows the current revision: which app to show, and which review page may frame it. */
  let staged: { revision: number; info: StageInfo | null } = { revision: -1, info: null };
  let reviewOrigins: string[] = [];
  const stageInfo = (revision: number): StageInfo | null => {
    if (staged.revision === revision) return staged.info;
    let info: StageInfo | null = null;
    const board = revision > 0 ? readRevision(ws, sessionId, revision).board : null;
    opts.stage?.configure({ reviewOrigins, revision, board });
    if (board?.base.kind === 'live' && opts.stage) {
      const page = new URL(board.base.url);
      info = board.base.attach === 'tag' ? { mode: 'tag', origin: page.origin, url: page.href } : { mode: 'proxy', origin: opts.stage.origin, url: opts.stage.origin + page.pathname + page.search };
    }
    staged = { revision, info };
    return info;
  };
  const builtInfo = (view: View): BuiltInfo | null => {
    if (!view.approval) return null;
    const check = latestCheck(ws, sessionId, view.approval.id);
    if (!check) return null;
    return {
      check: check.id,
      at: check.at,
      ok: check.ok,
      differences: differencesByArea(check.differences).slice(0, 80),
      shots: check.areaShots.map((s) => ({ viewport: s.viewport, area: s.area, approved: `/api/shot/approved/${s.shot}`, built: `/api/shot/built/${s.shot}` })),
    };
  };
  const rulesInfo = (): RuleInfo[] => {
    if (!tasteOn(ws)) return [];
    const project = projectKey(ws.root);
    return readRules()
      .filter((r) => r.project === project || (r.status === 'kept' && r.scope === 'general'))
      .map((r) => ({ id: r.id, text: r.text, status: r.status, scope: r.scope }));
  };
  const state = () => {
    const view = readView(ws, sessionId);
    return publicState(view, stageInfo(view.revision), builtInfo(view), rulesInfo());
  };
  const HEADERS = () => reviewHeaders(staged.info ? [...new Set([staged.info.origin, opts.stage!.origin])] : []);

  const send = (res: ServerResponse, status: number, body: string, type: string, extra: Record<string, string> = {}) => {
    res.writeHead(status, { ...HEADERS(), 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
    res.end(body);
  };
  const json = (res: ServerResponse, status: number, value: unknown, extra: Record<string, string> = {}) =>
    send(res, status, JSON.stringify(value), 'application/json; charset=utf-8', extra);
  const cached = (req: IncomingMessage, res: ServerResponse, body: string) => {
    const etag = `"${createHash('sha256').update(body).digest('base64url').slice(0, 27)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ...HEADERS(), ETag: etag, 'Cache-Control': 'no-cache' });
      res.end();
      return;
    }
    send(res, 200, body, 'application/json; charset=utf-8', { ETag: etag, 'Cache-Control': 'no-cache' });
  };

  const header = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const authenticate = (req: IncomingMessage): 'page' | 'cli' => {
    if (safeEqual(header(req.headers['x-pe-token']), pageToken)) return 'page';
    if (safeEqual(bearerToken(req), cliToken)) return 'cli';
    throw new HttpError(401, 'UNAUTHORIZED', 'Open the review with the link printed by your coding agent. It contains a private access token.');
  };

  const body = async <T extends z.ZodType>(req: IncomingMessage, schema: T): Promise<z.infer<T>> => {
    let text: string;
    try {
      text = await readBody(req, MAX_BODY);
    } catch (err) {
      if ((err as { code?: string }).code === 'TOO_LARGE') throw new HttpError(413, 'TOO_LARGE', 'Request body too large.');
      throw err;
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON.');
    }
    const r = schema.safeParse(data);
    if (!r.success) throw new HttpError(400, 'INVALID_REQUEST', r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
    return r.data;
  };

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    // DNS-rebinding protection: only our own loopback authority is accepted.
    if (!req.headers.host || !allowedHosts.has(req.headers.host)) throw new HttpError(403, 'BAD_HOST', 'Host not allowed.');
    const method = req.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    const path = new URL(req.url ?? '/', `http://${req.headers.host}`).pathname;

    if (method !== 'POST') {
      // The page itself holds no secrets; it reads the token from the URL fragment.
      if (path === '/') {
        stageInfo(readView(ws, sessionId).revision); // the page's policy names the app it may frame
        return send(res, 200, opts.assets['index.html'], 'text/html; charset=utf-8');
      }
      if (path === '/assets/app.js') return send(res, 200, opts.assets['app.js'], 'text/javascript; charset=utf-8');
      if (path === '/assets/app.css') return send(res, 200, opts.assets['app.css'], 'text/css; charset=utf-8');
      if (path === '/favicon.ico') return send(res, 204, '', 'text/plain');
      if (path === '/api/health') {
        const known = safeEqual(bearerToken(req), cliToken);
        return json(res, 200, { ok: true, app: 'picky-eater', version: VERSION, ...(known ? { sessionId, pid: process.pid } : {}) });
      }
      if (path === '/api/state') {
        authenticate(req);
        return cached(req, res, JSON.stringify(state()));
      }
      // Pictures of the approved and of the built page, for "Approved / Built" in the review page.
      const shot = /^\/api\/shot\/(approved|built)\/([a-z0-9-]+\.area\.[a-z0-9-]+\.png)$/.exec(path);
      if (shot) {
        authenticate(req);
        const view = readView(ws, sessionId);
        const check = view.approval ? latestCheck(ws, sessionId, view.approval.id) : null;
        const p = sessionPaths(ws, sessionId);
        const file = check && view.approval ? join(shot[1] === 'approved' ? p.answerKeyDir(view.approval.id) : join(p.checksDir, check.id), shot[2]!) : null;
        if (!file || !existsSync(file)) throw new HttpError(404, 'NOT_FOUND', 'No such picture.');
        res.writeHead(200, { ...HEADERS(), 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
        res.end(readFileSync(file));
        return;
      }
      const pack = /^\/api\/pack\/(\d{1,6})$/.exec(path);
      if (pack) {
        authenticate(req);
        let data;
        try {
          data = readPack(ws, sessionId, Number(pack[1]));
        } catch (err) {
          if (err instanceof PeError && err.code === 'NO_REVISION') throw new HttpError(404, 'NOT_FOUND', 'No such revision.');
          throw err;
        }
        return cached(req, res, JSON.stringify(data));
      }
      throw new HttpError(404, 'NOT_FOUND', 'Not found.');
    }

    const who = authenticate(req);
    if ((req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase() !== 'application/json') {
      throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected application/json.');
    }
    if (who === 'cli') {
      // Decisions belong to the person in the browser. The CLI, and so the agent, may only stop the server.
      if (path !== '/api/shutdown') throw new HttpError(403, 'PAGE_ONLY', 'Choices, change requests and approval can only be made in the review page.');
      await body(req, z.strictObject({}));
      json(res, 200, { ok: true });
      setImmediate(() => void close());
      return;
    }
    const origin = req.headers.origin;
    if (!origin || !origin.startsWith('http://') || !allowedHosts.has(origin.slice('http://'.length))) {
      throw new HttpError(403, 'BAD_ORIGIN', 'Cross-origin requests are not allowed.');
    }
    const site = req.headers['sec-fetch-site'];
    if (site && site !== 'same-origin') throw new HttpError(403, 'BAD_ORIGIN', 'Cross-site requests are not allowed.');

    const withStage = (view: View) => publicState(view, stageInfo(view.revision), builtInfo(view), rulesInfo());
    switch (path) {
      case '/api/rule': {
        // Keeping a rule about one's taste is a decision of the person, like approving: only the page can do it.
        const input = await body(req, RuleBody);
        const project = projectKey(ws.root);
        if (!readRules().some((r) => r.id === input.id && r.project === project)) throw new HttpError(404, 'NOT_FOUND', 'No such rule.');
        settleRule(input.id, input.verdict);
        return json(res, 200, withStage(readView(ws, sessionId)));
      }
      case '/api/diagnostics': {
        // What the page saw when it drew the board on the running app. Read by "status"; not a decision.
        const input = await body(req, DiagnosticsBody);
        mkdirSync(ws.runtimeDir, { recursive: true, mode: 0o700 });
        writeJsonAtomic(join(ws.runtimeDir, 'diagnostics.json'), { sessionId, revision: input.revision, at: nowIso(), problems: input.problems }, 0o600);
        return json(res, 200, { ok: true });
      }
      case '/api/choices':
        return json(res, 200, withStage(await setChoices(ws, sessionId, await body(req, ChoicesBody))));
      case '/api/approve':
        return json(res, 200, withStage(await approve(ws, sessionId, await body(req, ChoicesBody))));
      case '/api/reopen':
        return json(res, 200, withStage(await reopen(ws, sessionId, await body(req, ReopenBody))));
      case '/api/requests':
        return json(res, 200, withStage(await addRequest(ws, sessionId, await body(req, RequestBody))));
      default:
        throw new HttpError(404, 'NOT_FOUND', 'Not found.');
    }
  };

  const server = createServer((req, res) => {
    idleTimer?.refresh();
    log(`${req.method} ${(req.url ?? '').split('?')[0]}`);
    handle(req, res).catch((err: unknown) => {
      if (res.headersSent) return void res.end();
      if (err instanceof HttpError) return json(res, err.status, { error: { code: err.code, message: err.message } });
      if (err instanceof ConflictError) return json(res, 409, { error: { code: err.code, message: err.message } });
      if (err instanceof PeError) return json(res, 400, { error: { code: err.code, message: err.message } });
      log(`internal error: ${(err as Error).stack ?? String(err)}`);
      return json(res, 500, { error: { code: 'INTERNAL', message: 'Something went wrong in picky-eater. See the terminal that runs the preview.' } });
    });
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? 0, HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const port = (server.address() as AddressInfo).port;
  allowedHosts = allowedHostHeaders(port);
  const origin = `http://${HOST}:${port}`;
  reviewOrigins = [origin, `http://localhost:${port}`];

  let done!: () => void;
  const closed = new Promise<void>((resolve) => (done = resolve));
  let closing = false;
  const close = async () => {
    if (closing) return closed;
    closing = true;
    if (idleTimer) clearTimeout(idleTimer);
    server.closeAllConnections();
    server.close(() => void (opts.stage ? opts.stage.close() : Promise.resolve()).then(done));
    return closed;
  };
  if (opts.idleTimeoutMs && opts.idleTimeoutMs > 0) {
    idleTimer = setTimeout(() => {
      log('no requests for a while; stopping the preview');
      void close();
    }, opts.idleTimeoutMs);
    idleTimer.unref();
  }
  return { server, port, origin, link: `${origin}/#token=${pageToken}`, pageToken, cliToken, closed, close };
}
