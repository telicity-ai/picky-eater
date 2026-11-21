import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { EXAMPLE, makeProject, type Project } from '../helpers/project.js';

let project: Project;
afterEach(() => project?.cleanup());

const edit = (file: string, change: (text: string) => string) => writeFileSync(file, change(readFileSync(file, 'utf8')));

describe('picky-eater CLI', () => {
  test('new creates a session with a draft that validates', async () => {
    project = makeProject();
    const created = await project.pe('new', '--title', 'Pricing page');
    expect(created.code).toBe(0);
    expect(created.stdout).toContain('Session "pricing-page" created.');
    expect(readdirSync(project.draft('pricing-page')).sort()).toEqual(['areas', 'board.json', 'frame.html', 'styles.css']);
    expect(readFileSync(join(project.dir, '.picky-eater', '.gitignore'), 'utf8')).toContain('runtime/');

    const validated = await project.pe('validate');
    expect(validated.code).toBe(0);
    expect(validated.stdout).toContain('The draft is valid');
    expect((await project.json('status')).phase).toBe('drafting');
  });

  test('commands explain what to do when there is no session', async () => {
    project = makeProject();
    const r = await project.pe('status');
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('picky-eater new --title');
  });

  test('validate lists every problem and propose publishes nothing', async () => {
    project = makeProject();
    await project.pe('new', '--title', 'Workshop', '--id', 'w', '--from', EXAMPLE);
    edit(join(project.draft('w'), 'areas/hero/split.html'), (t) => t + '<img src="https://example.com/a.png" onerror="x()">');
    edit(join(project.draft('w'), 'frame.html'), (t) => t.replace('data-pe-area="schedule"', 'data-pe-area="agenda"'));

    const validated = await project.json<{ ok: boolean; issues: Array<{ code: string }> }>('validate');
    expect(validated.ok).toBe(false);
    expect(validated.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['REMOTE_URL', 'EVENT_HANDLER', 'UNKNOWN_AREA', 'AREA_NOT_PLACED']));

    const proposed = await project.pe('propose');
    expect(proposed.code).toBe(1);
    expect(proposed.stdout).toContain('Nothing was published');
    expect((await project.json('status')).revision).toBe(0);
  });

  test('propose freezes the draft, and the revision cannot be changed afterwards', async () => {
    project = makeProject();
    await project.pe('new', '--title', 'Workshop', '--id', 'w', '--from', EXAMPLE);
    const first = await project.json<{ revision: number; changes: Array<{ kind: string }> }>('propose', '--note', 'First look');
    expect(first.revision).toBe(1);
    expect(first.changes).toEqual([{ kind: 'first' }]);

    const dir = join(project.dir, '.picky-eater/sessions/w/revisions/r1');
    expect(existsSync(join(dir, 'manifest.json'))).toBe(true);
    expect(existsSync(join(dir, 'areas/hero/split.html'))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).note).toBe('First look');

    const again = await project.pe('propose');
    expect(again.code).toBe(1);
    expect(again.stderr).toContain('identical to revision r1');
  });

  test('a second revision reports what changed', async () => {
    project = makeProject();
    await project.pe('new', '--title', 'Workshop', '--id', 'w', '--from', EXAMPLE);
    await project.pe('propose');
    edit(join(project.draft('w'), 'areas/hero/centered.html'), (t) => t.replace('40 seats', '60 seats'));
    edit(join(project.draft('w'), 'styles.css'), (t) => t + '\n.foot{font-size:14px}\n');
    const second = await project.json<{ revision: number; changes: Array<{ kind: string; area?: string }> }>('propose');
    expect(second.revision).toBe(2);
    expect(second.changes).toEqual([{ kind: 'page' }, { kind: 'area-changed', area: 'hero', label: 'Top banner' }]);
  });

  test('wait times out with 124 while the person has not decided', async () => {
    project = makeProject();
    await project.pe('new', '--title', 'Workshop', '--id', 'w', '--from', EXAMPLE);
    await project.pe('propose');
    const waited = await project.pe('wait', '--timeout', '0');
    expect(waited.code).toBe(124);
    expect(waited.stdout).toContain('Still waiting');
  });

  test('there is no way to approve from the command line', async () => {
    project = makeProject();
    await project.pe('new', '--title', 'Workshop', '--id', 'w', '--from', EXAMPLE);
    await project.pe('propose');
    for (const command of ['approve', 'choose', 'select']) {
      const r = await project.pe(command);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain('Unknown command');
    }
    const help = (await project.pe('--help')).stdout;
    expect(help).not.toMatch(/\bapprove\b(?! )/i);
  });

  test('preview starts once, is reused, and stops', async () => {
    project = makeProject();
    await project.pe('new', '--title', 'Workshop', '--id', 'w', '--from', EXAMPLE);
    expect((await project.pe('preview')).stderr).toContain('Publish the draft first');
    await project.pe('propose');

    const started = await project.json<{ link: string; port: number; reused: boolean }>('preview');
    expect(started.link).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/#token=[A-Za-z0-9_-]{43}$/);
    expect(started.reused).toBe(false);
    const again = await project.json<{ link: string; reused: boolean }>('preview');
    expect(again).toMatchObject({ link: started.link, reused: true });

    const page = await fetch(`http://127.0.0.1:${started.port}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>picky-eater</title>');

    expect((await project.pe('preview', '--stop')).stdout).toContain('Preview stopped');
    await expect(fetch(`http://127.0.0.1:${started.port}/`)).rejects.toThrow();
  });

  test('schema prints the JSON Schema of a board', async () => {
    project = makeProject();
    const schema = await project.json<{ properties: Record<string, unknown> }>('schema');
    expect(Object.keys(schema.properties)).toEqual(expect.arrayContaining(['title', 'base', 'areas', 'cuts', 'viewports']));
  });
});
