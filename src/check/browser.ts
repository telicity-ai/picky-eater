import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { PeError } from '../session/fs.js';

/**
 * A headless browser driven over the DevTools protocol, with nothing but Node built-ins. It is
 * the Chrome, Edge or Chromium that is already installed: nothing is downloaded and nothing is
 * added to the user's project. The browser is started so that it can only reach this machine.
 */

export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Tab {
  goto(url: string): Promise<void>;
  /** Replace the document with this markup. */
  setContent(html: string): Promise<void>;
  /** Evaluate an expression in the page and return its value (a promise is awaited). */
  evaluate<T = unknown>(expression: string): Promise<T>;
  resize(width: number, height: number): Promise<void>;
  /** Resolves once the page has had no request under way for `quietMs`, or after `maxMs`. Sockets and event streams do not count. */
  idle(quietMs?: number, maxMs?: number): Promise<void>;
  /** A PNG of the screen, or of a part of it. */
  screenshot(clip?: Clip): Promise<Buffer>;
  /** Show the page as people get it who asked their system for less motion, or as everyone else does. */
  reducedMotion(on: boolean): Promise<void>;
  close(): Promise<void>;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  /** Seconds since 1970; absent for a cookie that lasts as long as the browser. */
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

/** What a browser remembers of a signed-in session: its cookies, and the local storage of each origin. */
export interface BrowserState {
  cookies: Cookie[];
  storage: Record<string, Record<string, string>>;
}

export interface Browser {
  /** Product and version, e.g. "Chrome/131.0.6778.86". */
  version: string;
  newTab(width: number, height: number): Promise<Tab>;
  /** The cookies the browser holds now. */
  cookies(): Promise<Cookie[]>;
  close(): Promise<void>;
}

/** The newest Chromium that Playwright keeps in its cache, if the user has one. */
function playwrightChromium(): string[] {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), '.cache/ms-playwright'), join(homedir(), 'AppData/Local/ms-playwright')].filter((p): p is string => Boolean(p));
  const out: string[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const builds = readdirSync(root)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const build of builds) {
      for (const rel of ['chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) out.push(join(root, build, rel));
    }
  }
  return out;
}

/**
 * The headless-only Chromium builds in Playwright's cache. They are the last resort, because they
 * are the ones that still start inside a sandboxed agent shell.
 */
function headlessShells(): string[] {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), '.cache/ms-playwright'), join(homedir(), 'AppData/Local/ms-playwright')].filter((p): p is string => Boolean(p));
  const out: string[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const builds = readdirSync(root)
      .filter((name) => /^chromium_headless_shell-\d+$/.test(name))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const build of builds) {
      for (const dir of ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac-x64', 'chrome-headless-shell-linux64', 'chrome-headless-shell-linux', 'chrome-headless-shell-win64']) {
        out.push(join(root, build, dir, process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell'));
      }
    }
  }
  return out.filter((p) => existsSync(p));
}

/** Path of a browser that speaks the DevTools protocol, or null. PICKY_EATER_BROWSER overrides the search. */
export function findBrowser(): string | null {
  const env = process.env.PICKY_EATER_BROWSER;
  if (env) return existsSync(env) ? env : null;
  const candidates: string[] = [];
  if (process.platform === 'darwin') {
    for (const base of ['/Applications', join(homedir(), 'Applications')]) {
      candidates.push(`${base}/Google Chrome.app/Contents/MacOS/Google Chrome`, `${base}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`, `${base}/Chromium.app/Contents/MacOS/Chromium`, `${base}/Brave Browser.app/Contents/MacOS/Brave Browser`);
    }
  } else if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter((p): p is string => Boolean(p))) {
      candidates.push(join(base, 'Google/Chrome/Application/chrome.exe'), join(base, 'Microsoft/Edge/Application/msedge.exe'), join(base, 'Chromium/Application/chrome.exe'));
    }
  } else {
    const names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable'];
    for (const dir of (process.env.PATH ?? '').split(':').filter(Boolean)) for (const name of names) candidates.push(join(dir, name));
  }
  candidates.push(...playwrightChromium(), ...headlessShells());
  return candidates.find((p) => existsSync(p)) ?? null;
}

export const NO_BROWSER =
  'No Chrome, Edge or Chromium was found on this machine. Comparing the built page needs one of them. Install one, or point PICKY_EATER_BROWSER at its executable.';

interface Pending {
  resolve(value: unknown): void;
  reject(err: Error): void;
}

/**
 * Flags for a shell that is itself sandboxed (an agent's command sandbox): the browser cannot set
 * up its own sandbox or its helper processes there, so it runs as one process.
 */
const CONFINED = ['--no-sandbox', '--disable-gpu', '--single-process', '--no-zygote'];

interface Started {
  child: ChildProcess;
  endpoint: string;
  cleanup(): void;
}

function start(executable: string, extra: string[]): Promise<Started> {
  const profile = mkdtempSync(join(tmpdir(), 'picky-eater-browser-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider',
    '--metrics-recording-only',
    '--password-store=basic',
    '--use-mock-keychain',
    '--hide-scrollbars',
    '--mute-audio',
    '--force-color-profile=srgb',
    '--force-device-scale-factor=1',
    // Only this machine can be reached: every other host name fails to resolve.
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE [::1]',
    ...(typeof process.getuid === 'function' && process.getuid() === 0 ? ['--no-sandbox'] : []),
    ...extra,
    ...(process.env.PICKY_EATER_BROWSER_ARGS?.split(' ').filter(Boolean) ?? []),
    'about:blank',
  ];
  const child: ChildProcess = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const cleanup = () => {
    child.kill('SIGKILL');
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* the browser may still hold a file; the folder is in the system's temporary directory */
    }
  };
  return new Promise<Started>((resolve, reject) => {
    let err = '';
    const fail = (why: string) => {
      clearTimeout(timer);
      cleanup();
      reject(new Error(why));
    };
    const timer = setTimeout(() => fail('it did not start in time'), 20_000);
    child.stderr!.on('data', (chunk: Buffer) => {
      err += chunk.toString();
      const found = /DevTools listening on (ws:\/\/\S+)/.exec(err);
      if (found) {
        clearTimeout(timer);
        child.removeAllListeners('exit');
        resolve({ child, endpoint: found[1]!, cleanup });
      }
    });
    child.once('exit', (code, signal) => fail(`${signal ?? `exit ${code}`}${err.trim() ? `: ${err.trim().split('\n').slice(-1)[0]!.slice(0, 160)}` : ''}`));
    child.once('error', (e) => fail(e.message));
  });
}

/** Starts the browser. With `state`, it starts as a browser that already holds that session. */
export async function launchBrowser(opts: { state?: BrowserState | null } = {}): Promise<Browser> {
  const executable = findBrowser();
  if (!executable) throw new PeError(NO_BROWSER, 'NO_BROWSER');
  // The installed browser as it is; if it cannot start (a sandboxed agent shell), the same one
  // confined to one process, then the headless-only builds, which start where the others do not.
  const attempts: Array<[string, string[]]> = [[executable, []], [executable, CONFINED], ...(process.env.PICKY_EATER_BROWSER ? [] : headlessShells().filter((p) => p !== executable).map((p): [string, string[]] => [p, CONFINED]))];
  let started: Started | null = null;
  let last = '';
  for (const [path, extra] of attempts) {
    try {
      started = await start(path, extra);
      break;
    } catch (err) {
      last = (err as Error).message;
    }
  }
  if (!started) {
    throw new PeError(
      `The browser could not start here (${last}). A sandboxed agent shell usually does not allow starting a browser: run this command outside the sandbox (with the user's permission), or ask the user to run it in their own terminal.`,
      'BROWSER_FAILED',
    );
  }
  const { endpoint, cleanup } = started;

  const socket = new WebSocket(endpoint);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new PeError('Could not connect to the browser.', 'BROWSER_FAILED')), { once: true });
  }).catch((e: unknown) => {
    cleanup();
    throw e;
  });

  let seq = 0;
  const pending = new Map<number, Pending>();
  const listeners = new Set<(method: string, params: Record<string, unknown>, session: string | undefined) => void>();
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string }; method?: string; params?: Record<string, unknown>; sessionId?: string };
    if (msg.id !== undefined) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p?.reject(new PeError(`The browser refused a command: ${msg.error.message}`, 'BROWSER_FAILED'));
      else p?.resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg.method, msg.params ?? {}, msg.sessionId);
    }
  });
  socket.addEventListener('close', () => {
    for (const p of pending.values()) p.reject(new PeError('The browser closed.', 'BROWSER_FAILED'));
    pending.clear();
  });

  const send = <T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  /** Wait for an event of a tab. "cancel" gives the wait up at once, so that its timer does not keep the process alive. */
  const once = (method: string, sessionId: string, timeoutMs: number) => {
    let cancel = () => {};
    const happened = new Promise<boolean>((resolve) => {
      const done = (value: boolean) => {
        clearTimeout(timer);
        listeners.delete(fn);
        resolve(value);
      };
      const fn = (m: string, _: Record<string, unknown>, s: string | undefined) => {
        if (m === method && s === sessionId) done(true);
      };
      const timer = setTimeout(() => done(false), timeoutMs);
      cancel = () => done(false);
      listeners.add(fn);
    });
    return { happened, cancel };
  };

  const { product } = await send<{ product: string }>('Browser.getVersion');
  const state = opts.state ?? null;
  if (state && state.cookies.length > 0) {
    await send('Storage.setCookies', { cookies: state.cookies.map(({ sameSite, expires, ...rest }) => ({ ...rest, ...(expires && expires > 0 ? { expires } : {}), ...(sameSite ? { sameSite } : {}) })) }).catch(() => {});
  }
  // Local storage is put back before the page's own scripts run, and only where the page has not written since.
  const seed =
    state && Object.keys(state.storage).length > 0
      ? `(() => { try { const mine = (${JSON.stringify(state.storage)})[location.origin]; if (!mine) return; for (const k in mine) if (localStorage.getItem(k) === null) localStorage.setItem(k, mine[k]); } catch (e) {} })()`
      : null;

  const newTab = async (width: number, height: number): Promise<Tab> => {
    const { targetId } = await send<{ targetId: string }>('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send('Runtime.enable', {}, sessionId);
    if (seed) await send('Page.addScriptToEvaluateOnNewDocument', { source: seed }, sessionId);
    const resize = async (w: number, h: number) => {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
    };
    await resize(width, height);
    // Requests under way, to know when a page that loads its data after it opens has it.
    const inflight = new Set<string>();
    let lastRequest = Date.now();
    await send('Network.enable', {}, sessionId).catch(() => {});
    listeners.add((method, params, s) => {
      if (s !== sessionId) return;
      if (method === 'Network.requestWillBeSent') {
        if (params.type === 'WebSocket' || params.type === 'EventSource') return;
        inflight.add(String(params.requestId));
        lastRequest = Date.now();
      } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed' || method === 'Network.requestServedFromCache') {
        if (inflight.delete(String(params.requestId))) lastRequest = Date.now();
      } else if (method === 'Network.eventSourceMessageReceived') {
        inflight.delete(String(params.requestId)); // a stream that stays open, whatever it was announced as
      }
    });
    // Dialogs of the page (alert, confirm) must not hold a measurement up.
    listeners.add((method, _, s) => {
      if (method === 'Page.javascriptDialogOpening' && s === sessionId) void send('Page.handleJavaScriptDialog', { accept: true }, sessionId).catch(() => {});
    });
    return {
      resize,
      goto: async (url) => {
        inflight.clear();
        const loaded = once('Page.loadEventFired', sessionId, 30_000);
        let res: { errorText?: string };
        try {
          res = await send<{ errorText?: string }>('Page.navigate', { url }, sessionId);
        } catch (err) {
          loaded.cancel();
          throw err;
        }
        if (res.errorText) {
          loaded.cancel();
          throw new PeError(`${url} could not be opened (${res.errorText}). Is the development server running?`, 'PAGE_UNREACHABLE');
        }
        if (!(await loaded.happened)) throw new PeError(`${url} did not finish loading.`, 'PAGE_UNREACHABLE');
      },
      setContent: async (html) => {
        const tree = await send<{ frameTree: { frame: { id: string } } }>('Page.getFrameTree', {}, sessionId);
        await send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html }, sessionId);
      },
      evaluate: async <T>(expression: string) => {
        const res = await send<{ result: { value?: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
          'Runtime.evaluate',
          { expression, awaitPromise: true, returnByValue: true },
          sessionId,
        );
        if (res.exceptionDetails) throw new PeError(`In the page: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`.split('\n')[0]!, 'PAGE_ERROR');
        return res.result.value as T;
      },
      idle: async (quietMs = 400, maxMs = 5000) => {
        const until = Date.now() + maxMs;
        while (Date.now() < until && (inflight.size > 0 || Date.now() - lastRequest < quietMs)) await new Promise((r) => setTimeout(r, 50));
      },
      screenshot: async (clip) => {
        const res = await send<{ data: string }>('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }, sessionId);
        return Buffer.from(res.data, 'base64');
      },
      reducedMotion: async (on) => {
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : '' }] }, sessionId).catch(() => {});
      },
      close: async () => {
        await send('Target.closeTarget', { targetId }).catch(() => {});
      },
    };
  };

  return {
    version: product,
    newTab,
    cookies: async () => {
      const res = await send<{ cookies: Array<Cookie & { session?: boolean }> }>('Storage.getCookies');
      return res.cookies.map((c) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, ...(c.session || !c.expires || c.expires < 0 ? {} : { expires: c.expires }), ...(c.httpOnly ? { httpOnly: true } : {}), ...(c.secure ? { secure: true } : {}), ...(c.sameSite ? { sameSite: c.sameSite } : {}) }));
    },
    close: async () => {
      await send('Browser.close').catch(() => {});
      socket.close();
      await new Promise((r) => setTimeout(r, 100));
      cleanup();
    },
  };
}
