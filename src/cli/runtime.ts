import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, rmSync } from 'node:fs';
import { Runtime } from '../core/schema.js';
import { PeError, readJson, writeJsonAtomic } from '../session/fs.js';
import type { Ws } from '../session/store.js';

/** Origin and link of a running preview. Derived, so a tampered file cannot point elsewhere. */
export const originOf = (rt: Runtime) => `http://127.0.0.1:${rt.port}`;
export const linkOf = (rt: Runtime) => `${originOf(rt)}/#token=${rt.pageToken}`;

/**
 * The runtime file of a preview, or null. Ignored unless it is a regular file that only the
 * current user can read, because it holds the access tokens.
 */
export function readRuntime(ws: Ws): Runtime | null {
  if (!existsSync(ws.runtimeFile)) return null;
  try {
    const st = lstatSync(ws.runtimeFile);
    if (!st.isFile()) return null;
    if (process.platform !== 'win32') {
      if (typeof process.getuid === 'function' && st.uid !== process.getuid()) return null;
      if ((st.mode & 0o077) !== 0) return null;
    }
    return Runtime.parse(readJson(ws.runtimeFile));
  } catch {
    return null;
  }
}

export function writeRuntime(ws: Ws, rt: Runtime): void {
  mkdirSync(ws.runtimeDir, { recursive: true, mode: 0o700 });
  writeJsonAtomic(ws.runtimeFile, rt, 0o600);
}

export function clearRuntime(ws: Ws, pid: number): void {
  if (readRuntime(ws)?.pid === pid) rmSync(ws.runtimeFile, { force: true });
}

/** True if a process with this pid exists. */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Whether the recorded preview answers and is the process the file names. */
export async function probe(rt: Runtime, timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(`${originOf(rt)}/api/health`, { headers: { Authorization: `Bearer ${rt.cliToken}` }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return false;
    const body = (await res.json()) as { sessionId?: string; pid?: number };
    return body.sessionId === rt.sessionId && body.pid === rt.pid;
  } catch {
    return false;
  }
}

export async function stop(ws: Ws, rt: Runtime): Promise<boolean> {
  let ok = false;
  try {
    const res = await fetch(`${originOf(rt)}/api/shutdown`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rt.cliToken}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(3000),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  for (let i = 0; i < 40 && pidAlive(rt.pid); i++) await new Promise((r) => setTimeout(r, 50));
  clearRuntime(ws, rt.pid);
  return ok;
}

/** Start "preview --foreground" as a detached process and wait until it is serving. */
export async function startDetached(ws: Ws, args: string[]): Promise<Runtime> {
  const script = process.argv[1];
  if (!script) throw new PeError('Cannot find the picky-eater script to start the preview.', 'NO_SCRIPT');
  const child = spawn(process.execPath, [script, 'preview', '--foreground', '--quiet', ...args], { detached: true, stdio: 'ignore' });
  let exited: number | null = null;
  child.on('exit', (code) => (exited = code ?? 1));
  child.on('error', () => (exited = 1));
  child.unref();
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    const rt = readRuntime(ws);
    if (rt && rt.pid === child.pid) return rt;
    if (exited !== null) break;
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new PeError(
    'The preview did not start. Run "picky-eater preview --foreground" to see why. In a sandboxed agent shell, listening on 127.0.0.1 may need permission.',
    'PREVIEW_FAILED',
  );
}

/** Open a loopback URL in the default browser, without a shell. Best effort. */
export function openInBrowser(url: string): boolean {
  if (!/^http:\/\/127\.0\.0\.1:\d+\/(#token=[A-Za-z0-9_-]+)?$/.test(url)) throw new PeError('Refusing to open a non-loopback URL', 'BAD_URL');
  const [cmd, args] =
    process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
