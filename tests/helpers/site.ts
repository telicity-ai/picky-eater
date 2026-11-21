import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LIVE_EXAMPLE, makeProject, type Project } from './project.js';

/** The example site on its own development server, as a user would have it running. */
export interface Site {
  origin: string;
  /** What a file watcher does after a save: tell every open page. */
  update(reload?: boolean): Promise<void>;
  stop(): void;
}

export function startSite(opts: { plain?: boolean; dir?: string } = {}): Promise<Site> {
  const args = [join(LIVE_EXAMPLE, 'server.mjs'), '--port', '0', ...(opts.plain ? ['--plain'] : []), ...(opts.dir ? ['--dir', opts.dir] : [])];
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((resolve, reject) => {
    let out = '';
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`The example site stopped (exit ${code}).`)));
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString();
      const origin = /http:\/\/127\.0\.0\.1:\d+/.exec(out)?.[0];
      if (!origin) return;
      resolve({
        origin,
        update: async (reload = false) => void (await fetch(`${origin}/__dev/update${reload ? '?reload=1' : ''}`, { method: 'POST' })),
        stop: () => void child.kill(),
      });
    });
  });
}

/**
 * A project that holds a copy of the example site and a session ("harbor") with the example board
 * over the running site, published as revision 1. `edit` may change the board first.
 */
export async function liveProject(siteOrigin: string, edit?: (board: Record<string, any>) => void): Promise<Project> {
  const project = makeProject();
  cpSync(join(LIVE_EXAMPLE, 'site'), join(project.dir, 'site'), { recursive: true });
  const draft = mkdtempSync(join(tmpdir(), 'picky-eater-live-'));
  const board = JSON.parse(readFileSync(join(LIVE_EXAMPLE, 'board', 'board.json'), 'utf8')) as Record<string, any>;
  board.base.url = `${siteOrigin}/`;
  edit?.(board);
  writeFileSync(join(draft, 'board.json'), JSON.stringify(board, null, 2));
  const created = await project.pe('new', '--title', 'Harbor Bikes', '--id', 'harbor', '--from', draft);
  rmSync(draft, { recursive: true, force: true });
  if (created.code !== 0) throw new Error(created.stderr);
  const published = await project.pe('propose');
  if (published.code !== 0) throw new Error(published.stdout + published.stderr);
  return project;
}

/**
 * Like liveProject, but the site that runs is the project's own copy of it, so that a test can
 * build the approved options into it. The caller stops the site.
 */
export async function liveProjectWithSite(edit?: (board: Record<string, any>) => void): Promise<{ project: Project; site: Site }> {
  const project = makeProject();
  cpSync(join(LIVE_EXAMPLE, 'site'), join(project.dir, 'site'), { recursive: true });
  const site = await startSite({ dir: join(project.dir, 'site') });
  const draft = mkdtempSync(join(tmpdir(), 'picky-eater-live-'));
  const board = JSON.parse(readFileSync(join(LIVE_EXAMPLE, 'board', 'board.json'), 'utf8')) as Record<string, any>;
  board.base.url = `${site.origin}/`;
  edit?.(board);
  writeFileSync(join(draft, 'board.json'), JSON.stringify(board, null, 2));
  const created = await project.pe('new', '--title', 'Harbor Bikes', '--id', 'harbor', '--from', draft);
  rmSync(draft, { recursive: true, force: true });
  if (created.code !== 0) throw new Error(created.stderr);
  const published = await project.pe('propose');
  if (published.code !== 0) throw new Error(published.stdout + published.stderr);
  return { project, site };
}
