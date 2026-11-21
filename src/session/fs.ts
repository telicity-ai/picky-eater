import { createHash, randomBytes } from 'node:crypto';
import { closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { isSafeRelativePath } from '../core/schema.js';

/** An error with a stable code and a process exit code. The message is written for the agent. */
export class PeError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly exitCode = 1,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PeError';
  }
}

/** Deterministic JSON: object keys sorted recursively, no whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  return value;
}

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function digestOf(value: unknown): string {
  return sha256(canonicalJson(value));
}

function lexists(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a relative path inside `root`, refusing anything that escapes it, either lexically
 * ("..", absolute paths) or through symlinks.
 */
export function resolveInside(root: string, relPath: string): string {
  if (!isSafeRelativePath(relPath)) throw new PeError(`Refusing unsafe path "${relPath}"`, 'UNSAFE_PATH');
  const absRoot = resolve(root);
  const target = resolve(absRoot, relPath);
  const rel = relative(absRoot, target);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new PeError(`Path "${relPath}" escapes its folder`, 'UNSAFE_PATH');
  }
  // Follow symlinks for the deepest existing ancestor and make sure it stays inside the root.
  let probe = target;
  while (!lexists(probe) && probe !== absRoot) probe = dirname(probe);
  let realRoot: string;
  let realProbe: string;
  try {
    realRoot = realpathSync(absRoot);
    realProbe = realpathSync(probe);
  } catch {
    throw new PeError(`Path "${relPath}" goes through a dangling symlink`, 'UNSAFE_PATH');
  }
  if (realProbe !== realRoot && !realProbe.startsWith(realRoot + sep)) {
    throw new PeError(`Path "${relPath}" resolves outside its folder via a symlink`, 'UNSAFE_PATH');
  }
  return target;
}

/**
 * Write a file atomically: write to a temporary sibling, fsync, then rename over the target.
 * Readers never observe a partially written file.
 */
export function writeFileAtomic(absPath: string, data: string | Buffer, mode = 0o644): void {
  const tmp = resolve(dirname(absPath), `.${randomBytes(6).toString('hex')}.tmp`);
  const fd = openSync(tmp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, mode);
  try {
    writeSync(fd, typeof data === 'string' ? Buffer.from(data, 'utf8') : data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(tmp, absPath);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}

export function writeJsonAtomic(absPath: string, value: unknown, mode = 0o644): void {
  writeFileAtomic(absPath, JSON.stringify(value, null, 2) + '\n', mode);
}

export function readJson(absPath: string): unknown {
  const text = readFileSync(absPath, 'utf8');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new PeError(`Invalid JSON in ${absPath}: ${(err as Error).message}`, 'INVALID_JSON');
  }
}

const LOCK_STALE_MS = 15_000;

/**
 * Cross-process mutual exclusion using an O_EXCL lock file. Used around every read-modify-write
 * of session state so the CLI and the review server never interleave.
 */
export async function withLock<T>(lockPath: string, fn: () => T | Promise<T>, timeoutMs = 10_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    try {
      const fd = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      closeSync(fd);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) {
          rmSync(lockPath, { force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - started > timeoutMs) throw new PeError(`Timed out waiting for lock ${lockPath}`, 'LOCK_TIMEOUT');
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  try {
    return await fn();
  } finally {
    rmSync(lockPath, { force: true });
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
