import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Frame } from '@playwright/test';
import { choose } from './visit.js';

/**
 * examples/react-app on its Vite development server, with the board that comes with it
 * (examples/react-app/board). Started by run.mjs like the stacks of the matrix. It shows on a
 * real app what the matrix shows on a small page: areas resolve to components and files, patches
 * hold while React redraws, a hot update arrives, and the approved look can be measured.
 */

interface Stack {
  dir: string;
  url: string;
  notes?: string;
}

const stack = JSON.parse(process.env.PE_STACK ?? 'null') as Stack | null;
const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', '..', 'skills', 'picky-eater', 'scripts', 'picky-eater.mjs');

const pe = (...args: string[]) =>
  new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    execFile(process.execPath, [CLI, ...args, '--root', stack!.dir], { maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof (err as { code?: unknown }).code === 'number' ? (err as unknown as { code: number }).code : 1) : 0, stdout, stderr });
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

test.skip(!stack, 'Started by tests/stacks/run.mjs.');

test('examples/react-app: a storyboard over the settings page of a React app', async ({ page }) => {
  const s = stack!;
  rmSync(join(s.dir, '.picky-eater'), { recursive: true, force: true });
  const draft = mkdtempSync(join(tmpdir(), 'picky-eater-react-'));
  const board = JSON.parse(readFileSync(join(s.dir, 'board', 'board.json'), 'utf8'));
  board.base.url = s.url;
  writeFileSync(join(draft, 'board.json'), JSON.stringify(board, null, 2));
  expect((await pe('new', '--title', 'Switchback settings', '--id', 'settings', '--from', draft)).code).toBe(0);
  rmSync(draft, { recursive: true, force: true });

  await test.step('every area resolves to the component and file that draw it', async () => {
    const v = await json<{ ok: boolean; issues: Array<{ code: string; message: string }>; onPage: { checked: boolean; frameworks: string[]; areas: Record<string, { components: string[]; file?: string }> } }>('validate');
    expect(v.ok, JSON.stringify(v.issues)).toBe(true);
    expect(v.issues.map((i) => i.message)).toEqual([]);
    expect(v.onPage.frameworks.join(', ')).toMatch(/React \d+.*Vite \d+/);
    const areas = v.onPage.areas;
    expect(areas.sections).toMatchObject({ components: expect.arrayContaining(['SettingsPage']), file: 'src/pages/SettingsPage.tsx' });
    // The button is written in Button.tsx and used by the settings page: both are named, the nearest first.
    expect(areas.delete!.components.slice(0, 2)).toEqual(['Button', 'SettingsPage']);
    expect(areas.delete!.file).toBe('src/components/Button.tsx');
    // The message after saving only exists in its own cut; it was reached by playing the steps.
    expect(areas['saved-note']).toMatchObject({ file: 'src/pages/SettingsPage.tsx' });
    if (s.notes) writeFileSync(s.notes, JSON.stringify({ frameworks: v.onPage.frameworks, areas }, null, 2));

    const map = (await pe('inspect')).stdout;
    expect(map).toContain('.settings-form');
    expect(map).toContain('<FormSection> src/components/FormSection.tsx');
  });

  expect((await pe('propose')).code).toBe(0);
  const { link } = await json<{ link: string }>('preview');
  const reviewOrigin = new URL(link).origin;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Blocked script execution in 'about:(srcdoc|blank)'|allow-scripts and allow-same-origin/.test(m.text())) errors.push(`${m.text().slice(0, 400)} (${m.location().url})`);
  });
  await page.goto(link);
  await expect(page.locator('.hit').first()).toBeVisible({ timeout: 60_000 });
  const app = page.frameLocator('iframe.frame-page');
  const frame = (): Frame => page.frames().find((f) => f.parentFrame() === page.mainFrame() && /^http:/.test(f.url()) && !f.url().startsWith(reviewOrigin))!;
  const style = (selector: string, property: string) => frame().evaluate(([sel, prop]) => getComputedStyle(document.querySelector(sel!)!).getPropertyValue(prop!), [selector, property]);

  const patched = async () => {
    await expect(app.locator('.danger-zone > .button')).toHaveText('Delete account');
    await expect(app.locator('.settings-actions .button--secondary')).toHaveCount(0);
    await expect(app.locator('.notifications-section .form-section__body > .select-field:first-child')).toHaveCount(1);
    expect(await style('.settings-actions', 'position')).toBe('sticky');
    expect(await style('.settings-form .form-section', 'border-top-left-radius')).toBe('12px');
    expect(await style('.weekday-list .checkbox__label', 'border-top-left-radius')).not.toBe('0px');
  };

  await test.step('the suggested options are laid over the running app', async () => {
    await expect(page.locator('#count')).toHaveText('0 of 6 chosen');
    for (const [area, option] of [['sections', 'cards'], ['days', 'chips'], ['notifications', 'lead-first'], ['save', 'sticky'], ['delete', 'danger-zone']] as const) await choose(page, area, option);
    await patched();
  });

  await test.step('React redraws the form as it is used; the options stay and the form works', async () => {
    await app.locator('input[autocomplete="name"]').fill('Mina Park');
    await expect(app.locator('input[autocomplete="name"]')).toHaveValue('Mina Park');
    const wednesday = app.locator('.weekday-list .checkbox__input').nth(2);
    const was = await wednesday.isChecked();
    await wednesday.click({ force: true });
    expect(await wednesday.isChecked()).toBe(!was);
    await patched();
    // The button that was moved into its own section still asks before it deletes.
    let asked = '';
    page.once('dialog', (d) => {
      asked = d.message();
      void d.dismiss();
    });
    await app.locator('.danger-zone > .button').click();
    await expect.poll(() => asked).toContain('Delete your Switchback account?');
    await patched();
  });

  await test.step('a moment that is reached by acting in the app gets its own area', async () => {
    await app.locator('.settings-actions .button--primary').click();
    await expect(app.locator('.saved-message')).toHaveText('Saved.');
    // The review notices the new state by itself, and the message has a dot now.
    await expect(page.locator('.hit[data-area="saved-note"]')).toBeVisible();
    await choose(page, 'saved-note', 'pill');
    await expect(app.locator('.saved-message')).toHaveText('Changes saved');
    await expect(page.locator('#count')).toHaveText('6 of 6 chosen');
    // Saving again makes React take the message away and add a new one: the option is on the new one.
    await app.locator('.settings-actions .button--primary').click();
    await expect(app.locator('.settings-actions .button--primary')).toHaveText('Save changes');
    await expect(app.locator('.saved-message')).toHaveText('Changes saved');
    await patched();
  });

  await test.step('React takes the whole page away and draws it again; the options are on the new one', async () => {
    await app.locator('.app-nav__link', { hasText: 'Shifts' }).click();
    await expect(app.locator('.settings-form')).toHaveCount(0);
    await app.locator('.app-nav__link', { hasText: 'Settings' }).click();
    await expect(app.locator('.settings-form')).toBeVisible();
    await patched();
  });

  await test.step('a hot update arrives and the options are there afterwards', async () => {
    const file = join(s.dir, 'src/pages/SettingsPage.tsx');
    const before = readFileSync(file, 'utf8');
    expect(before).toContain('Manage your profile, availability, notifications and account.');
    await frame().evaluate(() => ((window as unknown as { __mark: number }).__mark = 1));
    writeFileSync(file, before.replace('notifications and account.', 'notifications and your account.'));
    try {
      await expect(app.locator('.settings-intro')).toHaveText('Manage your profile, availability, notifications and your account.', { timeout: 30_000 });
      expect(await frame().evaluate(() => (window as unknown as { __mark?: number }).__mark)).toBe(1);
      await patched();
    } finally {
      writeFileSync(file, before);
    }
    await expect(app.locator('.settings-intro')).toHaveText('Manage your profile, availability, notifications and account.', { timeout: 30_000 });
    await patched();
  });

  await test.step('after approval the look is measured, and the brief says where each area is drawn', async () => {
    const status = await json<{ pageProblems: unknown[]; missing: string[] }>('status');
    expect(status.pageProblems).toEqual([]);
    expect(status.missing).toEqual([]);
    await page.locator('#btn-approve').click();
    await page.locator('#confirm-yes').click();
    await expect(page.locator('#status')).toHaveText('Approved');
    const done = await json<{ ok: boolean; build: string[]; error?: { message: string } }>('implement');
    expect(done.ok, done.error?.message).toBe(true);
    const brief = done.build.join('\n');
    expect(brief).toContain('on the running page ".settings-form" is drawn by: <SettingsPage> src/pages/SettingsPage.tsx');
    expect(brief).toContain('is drawn by: <Button> src/components/Button.tsx');
  });

  expect(errors, 'errors in the review page or the app').toEqual([]);
});
