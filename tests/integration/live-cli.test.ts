import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { stagePortFor } from '../../src/server/stage-proxy.js';
import { makeProject, type Project } from '../helpers/project.js';

let project: Project;
beforeEach(() => {
  project = makeProject();
});
afterEach(() => project.cleanup());

describe('CLI: boards over an existing page', () => {
  test('"new --url" starts from a board over that page, and it validates', async () => {
    const created = await project.pe('new', '--title', 'Pricing page', '--url', 'http://localhost:5173/pricing');
    expect(created.code).toBe(0);
    const board = JSON.parse(readFileSync(join(project.draft('pricing-page'), 'board.json'), 'utf8'));
    expect(board.base).toEqual({ kind: 'live', url: 'http://localhost:5173/pricing' });
    expect(board.areas[0].options.map((o: { keep?: boolean }) => Boolean(o.keep))).toEqual([true, false]);

    const validated = await project.pe('validate');
    expect(validated.code).toBe(0);
    expect(validated.stdout).toContain('page: http://localhost:5173/pricing');
    expect(validated.stdout).toContain('SOURCE_MISSING'); // the template names index.html, which this project does not have
    expect((await project.pe('propose')).code).toBe(0);
    const status = await project.json<{ phase: string; pageProblems: unknown[]; attached: string[] }>('status');
    expect(status).toMatchObject({ phase: 'choosing', pageProblems: [], attached: [] });
  });

  test('"new --url" refuses anything but a local development server', async () => {
    for (const url of ['https://example.com/', 'http://example.com:8080/', 'localhost:5173']) {
      const r = await project.pe('new', '--title', 'Page', '--url', url);
      expect(r.code, url).toBe(1);
      expect(r.stderr).toContain('--url is the page on your development server');
    }
  });

  test('"attach" adds one marked tag, again and again the same one, and "detach" takes it out', async () => {
    const original = '<!doctype html>\n<html>\n  <head>\n    <title>App</title>\n  </head>\n  <body></body>\n</html>\n';
    mkdirSync(join(project.dir, 'public'));
    const file = join(project.dir, 'public/index.html');
    writeFileSync(file, original);
    await project.pe('new', '--title', 'Page', '--url', 'http://localhost:5173/');

    expect((await project.pe('attach', '--file', 'public/index.html')).code).toBe(0);
    expect((await project.pe('attach', '--file', 'public/index.html')).code).toBe(0);
    const html = readFileSync(file, 'utf8');
    expect(html.match(/data-picky-eater/g)).toHaveLength(1);
    expect(html).toContain(`<head>\n    <script src="http://127.0.0.1:${stagePortFor(project.dir)}/__pe/agent.js" data-picky-eater></script>`);
    expect(html.indexOf('data-picky-eater')).toBeLessThan(html.indexOf('<title>')); // before any script of the app
    expect((await project.pe('status')).stdout).toContain('Script tag in place: public/index.html');

    const detached = await project.pe('detach');
    expect(detached.stdout).toContain('Removed picky-eater\'s script tag from public/index.html.');
    expect(readFileSync(file, 'utf8')).toBe(original);
    expect((await project.pe('detach')).stdout).toContain('No script tag was in place.');
  });

  test('"attach" only writes inside the project, to a file that is a page', async () => {
    await project.pe('new', '--title', 'Page', '--url', 'http://localhost:5173/');
    writeFileSync(join(project.dir, 'notes.txt'), 'no markup here');
    expect((await project.pe('attach', '--file', '../outside.html')).stderr).toContain('UNSAFE_PATH');
    expect((await project.pe('attach', '--file', 'missing.html')).stderr).toContain('BAD_FILE');
    expect((await project.pe('attach', '--file', 'notes.txt')).stderr).toContain('BAD_FILE');
    expect((await project.pe('attach')).stderr).toContain('USAGE');
    expect(readFileSync(join(project.dir, 'notes.txt'), 'utf8')).toBe('no markup here');
  });
});
