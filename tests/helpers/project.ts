import { execFile } from 'node:child_process';
import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const EXAMPLE = resolve('examples/new-screen/board');
/** The example site with a board over it. */
export const LIVE_EXAMPLE = resolve('examples/static-site');

export interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

/** A temporary project folder with helpers to run the built CLI in it. */
export interface Project {
  dir: string;
  /** The draft folder of a session. */
  draft(session: string): string;
  pe(...args: string[]): Promise<Run>;
  json<T = Record<string, unknown>>(...args: string[]): Promise<T>;
  cleanup(): Promise<void>;
}

export function cliPath(): string {
  const cli = process.env.PE_TEST_CLI;
  if (!cli) throw new Error('PE_TEST_CLI is not set; the global setup builds the CLI.');
  return cli;
}

export function makeProject(opts: { home?: string } = {}): Project {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'picky-eater-test-')));
  // Each project remembers choices in a home of its own, unless a test shares one between projects on purpose.
  const env = { ...process.env, PICKY_EATER_HOME: opts.home ?? join(dir, '.home') };
  const pe = (...args: string[]) =>
    new Promise<Run>((done) => {
      execFile(process.execPath, [cliPath(), ...args], { cwd: dir, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
        done({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr });
      });
    });
  return {
    dir,
    draft: (session) => join(dir, '.picky-eater', 'sessions', session, 'draft'),
    pe,
    json: async <T>(...args: string[]) => {
      const r = await pe(...args, '--json');
      try {
        return JSON.parse(r.stdout) as T;
      } catch {
        throw new Error(`Not JSON (exit ${r.code}): ${r.stdout}\n${r.stderr}`);
      }
    },
    cleanup: async () => {
      await pe('preview', '--stop');
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** A project with the example board published as revision 1 of session "workshop". */
export async function exampleProject(): Promise<Project> {
  const project = makeProject();
  const created = await project.pe('new', '--title', 'Workshop sign-up', '--id', 'workshop', '--from', EXAMPLE);
  if (created.code !== 0) throw new Error(created.stderr);
  const published = await project.pe('propose');
  if (published.code !== 0) throw new Error(published.stdout + published.stderr);
  return project;
}

/** A copy of the example draft that a test can change freely. */
export function copyExample(): string {
  const dir = mkdtempSync(join(tmpdir(), 'picky-eater-draft-'));
  cpSync(EXAMPLE, dir, { recursive: true });
  return dir;
}
