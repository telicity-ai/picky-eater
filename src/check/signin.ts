import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Step } from '../stage/protocol.js';
import { launchBrowser, type BrowserState, type Tab } from './browser.js';

/**
 * Pages behind a sign-in.
 *
 * The commands that look at the running page (inspect, validate, implement, check) use a browser of
 * their own that starts empty, so a page behind a sign-in shows them its sign-in screen. "signin"
 * signs that browser in once, with the project's development account, and keeps what the browser
 * then remembers (cookies and local storage) for the later commands.
 *
 * It never reads the person's own browser. What is kept stays on this machine, in the folder that
 * picky-eater's own .gitignore keeps out of the repository, readable by this user only.
 */

export interface Signin extends BrowserState {
  schema: 'picky-eater/signin';
  savedAt: string;
  /** The page it ended on, without query and fragment. */
  page: string;
}

const LOCAL = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/;
const MAX_VALUE = 200_000;
const MAX_TOTAL = 2_000_000;

export const signinFile = (root: string): string => join(root, '.picky-eater', 'runtime', 'signin.json');

export function loadSignin(root: string): Signin | null {
  try {
    const raw = JSON.parse(readFileSync(signinFile(root), 'utf8')) as Signin;
    return raw.schema === 'picky-eater/signin' && Array.isArray(raw.cookies) && raw.storage && typeof raw.storage === 'object' ? raw : null;
  } catch {
    return null;
  }
}

export function clearSignin(root: string): boolean {
  const file = signinFile(root);
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  return true;
}

function save(root: string, signin: Signin): void {
  const file = signinFile(root);
  mkdirSync(dirname(file), { recursive: true });
  // Kept out of the repository even where the project's own rules would not.
  const ignore = join(dirname(file), '.gitignore');
  if (!existsSync(ignore)) writeFileSync(ignore, '*\n');
  writeFileSync(file, JSON.stringify(signin), { mode: 0o600 });
  chmodSync(file, 0o600);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The probe, again, in whatever document the tab shows now: a step may have led to another page. */
async function probeIn(tab: Tab, probeJs: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    try {
      if (await tab.evaluate<boolean>('document.readyState !== "loading" && typeof __peProbe === "object"')) return;
      if (await tab.evaluate<boolean>('document.readyState !== "loading"')) {
        await tab.evaluate(probeJs);
        return;
      }
    } catch {
      /* between two documents */
    }
    await sleep(100);
  }
}

async function settle(tab: Tab, probeJs: string): Promise<void> {
  await sleep(250);
  await tab.idle(500, 8000);
  await probeIn(tab, probeJs);
  await tab.evaluate('__peProbe.quiet()').catch(() => {});
}

export interface SigninResult {
  page: string;
  title: string;
  cookies: number;
  keys: number;
  /** True when the page it ended on still looks like a sign-in screen. */
  wall: boolean;
  file: string;
}

/** Open the page, do the steps, and keep the session the browser ends up with. */
export async function signIn(probeJs: string, opts: { url: string; root: string; steps: Step[]; width?: number }): Promise<SigninResult> {
  const browser = await launchBrowser();
  try {
    const tab = await browser.newTab(opts.width ?? 1280, 800);
    await tab.goto(opts.url);
    await settle(tab, probeJs);
    for (const [i, step] of opts.steps.entries()) {
      try {
        await tab.evaluate(`__peProbe.play(${JSON.stringify([step])})`);
      } catch (err) {
        const message = String((err as Error).message);
        // A click that submits a form takes the document away under the step: that is the step working.
        if (!/context|navigat|target|closed/i.test(message)) throw new Error(`Step ${i + 1} (${JSON.stringify(step)}) failed: ${message.replace(/^In the page: (Error: )?/, '')}`);
      }
      await settle(tab, probeJs);
    }
    const here = await tab.evaluate<{ origin: string; path: string; title: string; storage: Record<string, string> }>(
      `(() => { const storage = {}; let total = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const v = localStorage.getItem(k); if (v.length > ${MAX_VALUE} || (total += v.length) > ${MAX_TOTAL}) continue; storage[k] = v; } } catch (e) {} return { origin: location.origin, path: location.pathname, title: document.title, storage }; })()`,
    );
    const wall = await tab.evaluate<boolean>('__peProbe.signinWall()');
    const cookies = (await browser.cookies()).filter((c) => LOCAL.test(c.domain.replace(/^\./, '')));
    const signin: Signin = { schema: 'picky-eater/signin', savedAt: new Date().toISOString(), page: here.origin + here.path, cookies, storage: Object.keys(here.storage).length > 0 ? { [here.origin]: here.storage } : {} };
    save(opts.root, signin);
    return { page: signin.page, title: here.title, cookies: cookies.length, keys: Object.keys(here.storage).length, wall, file: signinFile(opts.root) };
  } finally {
    await browser.close();
  }
}
