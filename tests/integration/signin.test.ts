import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { findBrowser } from '../../src/check/browser.js';
import { sourceLocator } from '../../src/check/page.js';
import { approve, readView, setChoices } from '../../src/session/review.js';
import { workspace } from '../../src/session/store.js';
import { makeProject, type Project } from '../helpers/project.js';
import { startSite, type Site } from '../helpers/site.js';

/**
 * An app screen behind a sign-in (tests/e2e/pages/app): what the page-reading commands see
 * before and after "signin", the closer maps of "inspect", and a dialog that is drawn late.
 */
const browser = findBrowser();
const STEPS = (password: string) => JSON.stringify([{ fill: '#email', value: 'dev@relay.test' }, { fill: '#password', value: password }, { click: 'button[type=submit]' }]);

interface Found {
  selector: string;
  count: number;
  text?: string;
  depth?: number;
}
interface Report {
  url: string;
  endedAt?: string;
  wall?: boolean;
  signedIn?: string;
  found: Found[];
}

describe.skipIf(!browser)('a page behind a sign-in', () => {
  let site: Site;
  let project: Project;
  const board = () => ({
    schema: 'picky-eater/board',
    schemaVersion: '2.0',
    title: 'Relay',
    base: { kind: 'live', url: `${site.origin}/` },
    areas: [
      {
        id: 'rows',
        label: 'Thread rows',
        anchor: '[data-slot="sidebar"] ul',
        options: [
          { id: 'keep', label: 'Project first', keep: true },
          { id: 'title-first', label: 'Title first', suggested: true, patch: [{ each: '[data-testid="thread-row"]', patch: [{ move: ':scope > :nth-child(2)', before: ':scope > :nth-child(1)' }] }], build: 'The title is the first line of every row.' },
        ],
      },
      {
        id: 'sections',
        label: 'Settings sections',
        anchor: '[data-workspace-area="settings-nav"]',
        cuts: ['settings'],
        options: [
          { id: 'keep', label: 'A list', keep: true },
          { id: 'tight', label: 'Tighter', suggested: true, patch: [{ css: '[data-workspace-area="settings-nav"] button{padding-block:1px}' }], build: 'Less padding in the section buttons.' },
        ],
      },
    ],
    cuts: [
      { id: 'top', label: 'Threads' },
      { id: 'settings', label: 'Settings open', steps: [{ click: 'button[aria-label="Settings"]' }], seen: '[data-app-modal]' },
    ],
  });

  beforeAll(async () => {
    site = await startSite({ dir: resolve('tests/e2e/pages/app') });
    project = makeProject();
    expect((await project.pe('new', '--title', 'Relay', '--id', 'relay', '--url', `${site.origin}/`)).code).toBe(0);
    writeFileSync(join(project.draft('relay'), 'board.json'), JSON.stringify(board(), null, 2));
  }, 60_000);
  afterAll(async () => {
    site.stop();
    await project.cleanup();
  });

  test('without a session, "inspect" and "validate" say that they see a sign-in screen', async () => {
    const r = await project.json<Report>('inspect');
    expect(r.wall).toBe(true);
    expect(r.endedAt).toBe(`${site.origin}/login.html`);
    const text = (await project.pe('inspect')).stdout;
    expect(text).toContain(`now at ${site.origin}/login.html`);
    expect(text).toContain('This looks like a sign-in screen');
    expect(text).toContain('picky-eater signin --url');
    const v = await project.json<{ ok: boolean; issues: Array<{ code: string; message: string }> }>('validate');
    expect(v.ok).toBe(true);
    expect(v.issues.map((i) => i.code)).toContain('PAGE_SIGNIN');
  });

  test('"signin" with steps that do not get in says so, and keeps nothing that helps', async () => {
    const r = await project.pe('signin', '--url', `${site.origin}/login.html`, '--steps', STEPS('wrong'));
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('still looks like a sign-in screen');
    expect((await project.json<Report>('inspect')).wall).toBe(true);
    // Steps that are not steps, and pages that are not on this machine, are refused.
    expect((await project.pe('signin', '--url', `${site.origin}/login.html`, '--steps', '[{"type":"#email"}]')).stderr).toContain('USAGE');
    expect((await project.pe('signin', '--url', 'https://example.org/login')).stderr).toContain('USAGE');
  });

  test('"signin" keeps the session of the development account, outside what is committed', async () => {
    const r = await project.pe('signin', '--url', `${site.origin}/login.html`, '--steps', STEPS('trail-dev'));
    expect(r.code, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toContain(`Ended on ${site.origin}/`);
    // The password is not echoed, and the address is given without what follows a "?" or "#".
    expect(r.stdout).not.toContain('trail-dev');
    const file = join(project.dir, '.picky-eater', 'runtime', 'signin.json');
    expect(existsSync(file)).toBe(true);
    if (process.platform !== 'win32') expect(statSync(file).mode & 0o777).toBe(0o600);
    const saved = JSON.parse(readFileSync(file, 'utf8')) as { cookies: Array<{ name: string; domain: string }>; storage: Record<string, Record<string, string>> };
    expect(saved.cookies.map((c) => c.name)).toContain('sid');
    expect(saved.cookies.every((c) => c.domain === '127.0.0.1')).toBe(true);
    expect(saved.storage[site.origin]).toEqual({ token: 't-dev' });
    // The folder it lies in is one that picky-eater's own .gitignore leaves out.
    expect(readFileSync(join(project.dir, '.picky-eater', '.gitignore'), 'utf8')).toContain('runtime/');
    expect((await project.pe('signin')).stdout).toContain('Signed in since');
  });

  test('with the session, "inspect" maps the app: named parts, no styling classes, closer on request', async () => {
    const r = await project.json<Report>('inspect');
    expect(r.wall).toBeUndefined();
    expect(r.endedAt).toBeUndefined();
    expect(typeof r.signedIn).toBe('string');
    const selectors = r.found.map((f) => f.selector);
    expect(selectors).toEqual(expect.arrayContaining(['aside[data-slot="sidebar"]', '[data-chat-header]', 'div[data-slot="composer"]']));
    // "flex", "p-2", "text-sm" say how a part looks, not what it is.
    expect(selectors.filter((s) => /\.(flex|p-\d|px-\d|text-(xs|sm|lg)|gap-\d|rounded-md|w-64)\b/.test(s))).toEqual([]);
    for (const f of r.found) expect(f.count).toBe(1);

    const close = await project.json<Report>('inspect', '--within', '[data-slot="sidebar"]');
    expect(close.found[0]!.selector).toBe('[data-slot="sidebar"]');
    const inside = close.found.map((f) => f.selector);
    expect(inside).toEqual(expect.arrayContaining(['input[aria-label="Search threads"]', 'button[aria-label="Settings"]', 'button[aria-label="Add a thread"]']));
    // Three rows share a test id: each still gets a selector of its own.
    expect(inside.filter((s) => s.includes('thread-row') || s.includes('li')).length).toBeGreaterThanOrEqual(3);
    expect((await project.pe('inspect', '--within', '.no-such-part')).stdout).toContain('".no-such-part" matches nothing on the page');
  });

  test('"inspect --steps" waits for a screen that is drawn late and lists what lies over the page first', async () => {
    const r = await project.json<Report>('inspect', '--steps', '[{"click":"button[aria-label=\\"Settings\\"]"}]');
    expect(r.endedAt).toBe(`${site.origin}/?settings=general`);
    expect(r.found[0]!.selector).toBe('[data-app-modal]');
    const selectors = r.found.map((f) => f.selector);
    expect(selectors).toEqual(expect.arrayContaining(['[data-workspace-area="settings-nav"]', '[data-settings-section="general"]', 'button[aria-label="Close"]']));
    // The page under the dialog follows it.
    expect(selectors.indexOf('aside[data-slot="sidebar"]')).toBeGreaterThan(selectors.indexOf('[data-workspace-area="settings-nav"]'));
    const bad = await project.pe('inspect', '--steps', '[{"click":"#no-such-button"}]');
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain('"#no-such-button" did not appear');
  });

  test('"validate" then holds the board against the signed-in page, the cut behind a click included', async () => {
    const v = await project.json<{ ok: boolean; issues: Array<{ code: string; message: string }>; onPage: { checked: boolean } }>('validate');
    expect(v.onPage.checked).toBe(true);
    expect(v.issues.filter((i) => i.code.startsWith('PAGE_')).map((i) => i.message)).toEqual([]);
    // A selector inside "each" that no row has is named.
    const file = join(project.draft('relay'), 'board.json');
    const original = readFileSync(file, 'utf8');
    const changed = JSON.parse(original);
    changed.areas[0].options[1].patch = [{ each: '[data-testid="thread-row"]', patch: [{ set: '.badge', text: 'New' }] }];
    writeFileSync(file, JSON.stringify(changed, null, 2));
    try {
      const w = await project.json<{ issues: Array<{ code: string; message: string }> }>('validate');
      expect(w.issues.find((i) => i.code === 'PAGE_TARGET')!.message).toContain('".badge" matches nothing');
    } finally {
      writeFileSync(file, original);
    }
  });

  test('"signin --clear" forgets the session', async () => {
    expect((await project.pe('signin', '--clear')).stdout).toContain('The saved sign-in is gone.');
    expect(existsSync(join(project.dir, '.picky-eater', 'runtime', 'signin.json'))).toBe(false);
    expect((await project.pe('signin')).stdout).toContain('No saved sign-in');
    expect((await project.json<Report>('inspect')).wall).toBe(true);
  });
});

describe('sources in a repository of several packages', () => {
  let project: Project;
  const put = (path: string, text: string) => {
    const file = join(project.dir, path);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, text);
  };
  beforeAll(() => {
    project = makeProject();
    put('package.json', '{"private":true}');
    put('apps/web/package.json', '{"name":"web"}');
    put('apps/web/src/App.tsx', 'export function App() {\n  return null;\n}\n');
    put('apps/web/src/components/ThreadRow.tsx', "import { Tip } from './ui/tip';\n\nconst helper = 1;\n\nexport function ThreadRow() {\n  return null;\n}\n");
    put('apps/web/src/components/ui/tip.tsx', 'export const TipTrigger = () => null;\n');
    put('apps/site/package.json', '{"name":"site"}');
    put('apps/site/src/App.tsx', 'export default function App() {\n  return null;\n}\n');
    put('packages/ui/package.json', '{"name":"ui"}');
    put('packages/ui/src/Button.tsx', '// a button\nexport const Button = () => null;\n');
    put('node_modules/react/index.js', 'export function ThreadRow() {}\n');
  });
  afterAll(async () => {
    await project.cleanup();
  });

  test('a file that the development server names from its own root is found in the package that has it', () => {
    const locate = sourceLocator(project.dir);
    const where = locate({ framework: 'react', components: ['ThreadRow', 'App'], file: '/src/components/ThreadRow.tsx' });
    expect(where).toMatchObject({ file: 'apps/web/src/components/ThreadRow.tsx', components: ['ThreadRow', 'App'], line: 5 });
  });

  test('the component the file defines is named, not the library component that took the element over', () => {
    const locate = sourceLocator(project.dir);
    const where = locate({ framework: 'react', components: ['TooltipTrigger', 'ThreadRow', 'App'], file: '/src/components/ThreadRow.tsx' });
    expect(where!.components[0]).toBe('ThreadRow');
    expect(where!.line).toBe(5);
  });

  test('a name alone is looked up in every package, and a file that two packages have goes to the one already in use', () => {
    const locate = sourceLocator(project.dir);
    expect(locate({ framework: 'react', components: ['Button'] })).toMatchObject({ file: 'packages/ui/src/Button.tsx', line: 2 });
    // "/src/App.tsx" exists in two packages: not decided until the page has named a file that only one has.
    expect(locate({ framework: 'react', components: [], file: '/src/App.tsx' })).toBeUndefined();
    locate({ framework: 'react', components: ['ThreadRow'], file: '/src/components/ThreadRow.tsx' });
    expect(locate({ framework: 'react', components: ['App'], file: '/src/App.tsx' })).toMatchObject({ file: 'apps/web/src/App.tsx' });
    // What is installed is not the project's source.
    expect(locate({ framework: 'react', components: ['NoSuchComponent'] })?.file).toBeUndefined();
  });
});

/**
 * Building on a running app. Between the approval and the check a minute passes and the times on
 * the page move on; and what the preview showed with a style ("this line first") is built by
 * writing the lines in that order. Neither is a difference a person would see.
 */
describe.skipIf(!browser)('a signed-in app, built and compared', () => {
  let site: Site;
  let project: Project;
  const appJs = () => join(project.dir, 'app', 'app.js');
  const css = () => join(project.dir, 'app', 'styles.css');
  const replaceIn = (file: string, from: string, to: string) => {
    const text = readFileSync(file, 'utf8');
    if (!text.includes(from)) throw new Error(`"${from}" is not in ${file}`);
    writeFileSync(file, text.replace(from, to));
  };

  beforeAll(async () => {
    project = makeProject();
    cpSync(resolve('tests/e2e/pages/app'), join(project.dir, 'app'), { recursive: true });
    site = await startSite({ dir: join(project.dir, 'app') });
    expect((await project.pe('new', '--title', 'Relay', '--id', 'relay', '--url', `${site.origin}/`)).code).toBe(0);
    const board = {
      schema: 'picky-eater/board',
      schemaVersion: '2.0',
      title: 'Relay',
      base: { kind: 'live', url: `${site.origin}/` },
      viewports: [{ id: 'desktop', width: 1280, height: 800 }],
      areas: [
        {
          id: 'rows',
          label: 'Thread rows',
          anchor: '[data-slot="sidebar"] ul',
          source: { file: 'app/app.js', selector: '[data-testid="thread-row"]' },
          options: [
            { id: 'keep', label: 'Project first', keep: true },
            { id: 'title-first', label: 'Title first', suggested: true, patch: [{ css: '[data-testid="thread-row"] > :nth-child(2){order:-1}' }], build: 'The title is the first line of every row.' },
          ],
        },
      ],
      cuts: [{ id: 'top', label: 'Threads' }],
    };
    writeFileSync(join(project.draft('relay'), 'board.json'), JSON.stringify(board, null, 2));
    expect((await project.pe('signin', '--url', `${site.origin}/login.html`, '--steps', STEPS('trail-dev'))).code).toBe(0);
    const published = await project.pe('propose');
    expect(published.code, published.stdout + published.stderr).toBe(0);
    const ws = workspace(project.dir);
    const view = readView(ws, 'relay');
    const stamp = { revision: view.revision, digest: view.digest! };
    await setChoices(ws, 'relay', { ...stamp, choices: { rows: 'title-first' } });
    await approve(ws, 'relay', { ...stamp, choices: { rows: 'title-first' } });
  }, 120_000);
  afterAll(async () => {
    site.stop();
    await project.cleanup();
  });

  test('"implement" measures the signed-in page, not its sign-in screen', async () => {
    const r = await project.pe('implement');
    expect(r.code, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toContain('The approved page is measured: 1 width(s) × 1 moment(s)');
    const key = JSON.parse(readFileSync(join(project.dir, '.picky-eater/sessions/relay/answer-key/r1-a1/key.json'), 'utf8')) as { views: Array<{ areas: Array<{ id: string; found: boolean; elements: Array<{ key: string; live?: boolean }> }> }> };
    const rows = key.views[0]!.areas.find((a) => a.id === 'rows')!;
    expect(rows.found).toBe(true);
    const keys = rows.elements.map((e) => e.key);
    // A time is paired as a time, whatever it says at the moment; pictures are numbered as they are read.
    expect(keys).toEqual(expect.arrayContaining(['text (a time)', 'text (a time) (2)', 'text (a time) (3)', 'text "Fix the flaky checkout test"', 'picture 1', 'picture 9']));
    expect(keys.some((k) => /\d+m"/.test(k))).toBe(false);
    expect(rows.elements.find((e) => e.key === 'text (a time)')!.live).toBe(true);
  });

  test('before it is built, "check" says what is not there yet', async () => {
    const r = await project.pe('check');
    expect(r.code).toBe(20);
    // The title is still the second line: one cause, named once. Which element is named, and where
    // it stands, depends on how the fonts of the machine break the lines.
    expect(r.stdout).toMatch(/1 difference\(s\):\n\s+rows · desktop · top: (text "atlas-api"|picture \d+) position \d+, [\d.]+px, approved \d+, [\d.]+px/);
  });

  test('built by writing the lines in the new order, on a page whose times have moved on, it matches', async () => {
    const meta = "el('div', { class: 'flex items-center gap-1 text-xs text-muted' }, [icon('#7c3aed'), el('span', { text: thread[0] }), el('span', { class: 'flex-1' }), el('span', { 'data-time': '', text: ago })]),";
    const title = "el('div', { class: 'flex items-center gap-1 text-sm font-medium' }, [icon('#16a34a'), el('span', { text: thread[1] })]),";
    replaceIn(appJs(), `${meta}\n      ${title}`, `${title}\n      ${meta}`);
    // Another minute on the clock of the page, for certain.
    replaceIn(appJs(), "% 47) + 2 + 'm'", "% 47) + 60 + 'm'");
    const r = await project.pe('check');
    expect(r.stdout + r.stderr).toContain('The built page matches the approved one.');
    expect(r.code).toBe(0);
  });

  test('what a person would see is still a difference: a size, a missing line, a time on another line', async () => {
    replaceIn(css(), '.text-sm { font-size: 14px; }', '.text-sm { font-size: 16px; }');
    const bigger = await project.pe('check');
    expect(bigger.code).toBe(20);
    expect(bigger.stdout).toContain('font-size 16px, approved 14px');
    replaceIn(css(), '.text-sm { font-size: 16px; }', '.text-sm { font-size: 14px; }');

    // The time moves down to the branch line.
    replaceIn(appJs(), ", el('span', { class: 'flex-1' }), el('span', { 'data-time': '', text: ago })]),", ']),');
    replaceIn(appJs(), "[icon('#9ca3af'), el('span', { text: thread[2] })]", "[icon('#9ca3af'), el('span', { text: thread[2] }), el('span', { class: 'flex-1' }), el('span', { 'data-time': '', text: ago })]");
    const moved = await project.pe('check');
    expect(moved.code).toBe(20);
    expect(moved.stdout).toMatch(/rows · desktop · top: text \(a time\) position/);
  });
});
