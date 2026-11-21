import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Frame } from '@playwright/test';
import { chooseAll, patched as patchedIn, redraws } from './visit.js';

/**
 * One stack, as run.mjs started it: the shared board is published over its page and a person's
 * visit to the review is played. What must hold on every stack:
 *
 *  - "validate" finds every anchor on the running page and names the component that draws it
 *  - the real app runs inside the review, and its own development tools keep working
 *  - patches of every kind stay in place while the framework redraws the page, and the app keeps working
 *  - an edit of a source file arrives (hot update or reload) and the patches are there afterwards
 *  - after approval the approved look can be measured
 *  - nothing is reported in the console that the app would not report by itself
 */

interface Stack {
  name: string;
  title: string;
  dir: string;
  url: string;
  hero: string;
  owner?: { component?: string; file?: string };
  frameworks?: string[];
  update: 'hot' | 'reload';
  /** Console messages this stack prints by itself, as regular expressions. */
  noise?: string[];
  /** Where to leave what "validate" said about the page, for the record of the run. */
  notes?: string;
}

const stack = JSON.parse(process.env.PE_STACK ?? 'null') as Stack | null;
const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', '..', 'skills', 'picky-eater', 'scripts', 'picky-eater.mjs');

interface Ran {
  code: number;
  stdout: string;
  stderr: string;
}
const pe = (...args: string[]) =>
  new Promise<Ran>((resolve) => {
    execFile(process.execPath, [CLI, ...args, '--root', stack!.dir], { maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof (err as { code?: unknown }).code === 'number' ? ((err as { code: number }).code) : 1) : 0, stdout, stderr });
    });
  });
const json = async <T>(...args: string[]): Promise<T> => {
  const ran = await pe(...args, '--json');
  try {
    return JSON.parse(ran.stdout) as T;
  } catch {
    throw new Error(`picky-eater ${args.join(' ')} (exit ${ran.code}):\n${ran.stdout}\n${ran.stderr}`);
  }
};

test.skip(!stack, 'Started by tests/stacks/run.mjs, which says which stack is running.');

test(`${stack?.title ?? 'stack'}: a storyboard over the running app`, async ({ page }) => {
  const s = stack!;
  rmSync(join(s.dir, '.picky-eater'), { recursive: true, force: true });
  const draft = mkdtempSync(join(tmpdir(), 'picky-eater-stack-'));
  const board = JSON.parse(readFileSync(join(here, 'board.json'), 'utf8'));
  board.base.url = s.url;
  writeFileSync(join(draft, 'board.json'), JSON.stringify(board, null, 2));
  expect((await pe('new', '--title', 'Trailhead', '--id', 'trailhead', '--from', draft)).code).toBe(0);
  rmSync(draft, { recursive: true, force: true });

  await test.step('validate looks at the running page: anchors, patch targets, cut steps, components', async () => {
    const v = await json<{ ok: boolean; issues: Array<{ code: string; message: string }>; onPage?: { checked: boolean; why?: string; frameworks?: string[]; areas?: Record<string, { components: string[]; file?: string }> } }>('validate');
    expect(v.ok, JSON.stringify(v.issues)).toBe(true);
    expect(v.onPage?.checked, v.onPage?.why).toBe(true);
    // The board names no sources, so the page's own account of them is offered instead; nothing else may be amiss.
    expect(v.issues.filter((i) => i.code.startsWith('PAGE_') && i.code !== 'PAGE_SOURCE').map((i) => i.message)).toEqual([]);
    for (const name of s.frameworks ?? []) expect(v.onPage!.frameworks!.join(', ')).toContain(name);
    const hero = v.onPage!.areas?.hero;
    if (s.owner?.component) expect(hero?.components, JSON.stringify(hero)).toContain(s.owner.component);
    if (s.owner?.file) expect(hero?.file).toBe(s.owner.file);
    if (s.notes) writeFileSync(s.notes, JSON.stringify({ frameworks: v.onPage!.frameworks, areas: v.onPage!.areas }, null, 2));
  });

  expect((await pe('propose')).code).toBe(0);
  const { link } = await json<{ link: string }>('preview');
  const reviewOrigin = new URL(link).origin;

  // The first two are the browser saying that the thumbnails, which are inert copies of the page, cannot run scripts.
  const noise = [/Blocked script execution in 'about:(srcdoc|blank)'/, /allow-scripts and allow-same-origin/, /Download the React DevTools/, /\[vite\] (connecting|connected)/, /\[HMR\]/, ...(s.noise ?? []).map((n) => new RegExp(n))];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (!noise.some((n) => n.test(text))) errors.push(`${text.slice(0, 400)} (${m.location().url})`);
  });

  await page.goto(link);
  await expect(page.locator('.hit').first()).toBeVisible({ timeout: 60_000 });
  const app = page.frameLocator('iframe.frame-page');
  const frame = (): Frame => {
    const found = page.frames().find((f) => f.parentFrame() === page.mainFrame() && /^http:/.test(f.url()) && !f.url().startsWith(reviewOrigin));
    if (!found) throw new Error('The app frame is not there.');
    return found;
  };
  const patched = () => patchedIn(app);

  await test.step('the real app is inside the review', async () => {
    await expect(app.locator('#stack')).toHaveText(s.name);
    await expect(app.locator('.crew')).toHaveCount(3);
    await expect(page.locator('#count')).toHaveText('0 of 4 chosen');
  });

  await test.step('options of every kind are applied to the running app', async () => {
    await chooseAll(page);
    await patched();
    await expect(app.locator('#hero > #note')).toHaveCount(1);
  });

  await test.step('they stay while the framework redraws the page, and the app keeps working', async () => {
    await redraws(app);
  });

  await test.step(`an edit of a source file arrives (${s.update}) and the patches are there afterwards`, async () => {
    const file = join(s.dir, s.hero);
    const before = readFileSync(file, 'utf8');
    expect(before).toContain('Fix a trail this weekend');
    await frame().evaluate(() => ((window as unknown as { __mark: number }).__mark = 1));
    writeFileSync(file, before.replace('Fix a trail this weekend', 'Fix a trail on Saturday'));
    try {
      await expect(app.locator('#hero h1')).toHaveText('Fix a trail on Saturday', { timeout: 40_000 });
      if (s.update === 'hot') expect(await frame().evaluate(() => (window as unknown as { __mark?: number }).__mark)).toBe(1);
      await patched();
      await expect(app.locator('#hero > #note')).toHaveCount(1);
    } finally {
      writeFileSync(file, before);
    }
    await expect(app.locator('#hero h1')).toHaveText('Fix a trail this weekend', { timeout: 40_000 });
    await patched();
  });

  await test.step('nothing went wrong on the page', async () => {
    const status = await json<{ pageProblems: unknown[]; missing: string[] }>('status');
    expect(status.pageProblems).toEqual([]);
    expect(status.missing).toEqual([]);
  });

  await test.step('the approved look can be measured', async () => {
    await page.locator('#btn-approve').click();
    await page.locator('#confirm-yes').click();
    await expect(page.locator('#status')).toHaveText('Approved');
    const done = await json<{ ok: boolean; error?: { message: string } }>('implement');
    expect(done.ok, done.error?.message).toBe(true);
    const keys = join(s.dir, '.picky-eater', 'sessions', 'trailhead', 'answer-key');
    const key = JSON.parse(readFileSync(join(keys, readdirSync(keys)[0]!, 'key.json'), 'utf8')) as { views: Array<{ viewport: string; cut: string; problem?: string; areas: Array<{ id: string; found: boolean; elements: Array<{ key: string }> }> }> };
    const top = key.views.find((v) => v.cut === 'top')!;
    expect(top.problem).toBeUndefined();
    expect(top.areas.map((a) => [a.id, a.found])).toEqual([['hero', true], ['crews', true], ['note', true], ['signup', true]]);
    const keysOf = (id: string) => top.areas.find((a) => a.id === id)!.elements.map((e) => e.key).join(' | ');
    // Measured with the approved patches in place, not the page as it is.
    expect(keysOf('hero')).toContain('Pick a crew');
    expect(keysOf('crews')).toContain('Crews with places');
    expect(keysOf('signup')).toContain('We only use it to greet you.');
    const more = key.views.find((v) => v.cut === 'more')!;
    expect(more.problem).toBeUndefined();
    expect(more.areas.find((a) => a.id === 'crews')!.elements.map((e) => e.key).join(' | ')).toContain('Summit Stewards');
  });

  expect(errors, 'errors in the review page or the app').toEqual([]);
});
