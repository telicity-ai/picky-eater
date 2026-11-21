import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { makeProject } from '../helpers/project.js';
import { startSite } from '../helpers/site.js';
import { choose } from '../stacks/visit.js';

/**
 * A page behind a sign-in, in the review. The preview is an address of its own, so the person's
 * browser has no session there: the app shows its sign-in screen. The review says so instead of
 * calling every area missing, the person signs in right there, and the page of the board opens.
 */
test('the person signs in inside the preview, and the page of the board opens with its areas', async ({ page }) => {
  const site = await startSite({ dir: resolve('tests/e2e/pages/app') });
  const project = makeProject();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    expect((await project.pe('new', '--title', 'Relay', '--id', 'relay', '--url', `${site.origin}/`)).code).toBe(0);
    const board = {
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
            { id: 'tight', label: 'Tighter', suggested: true, patch: [{ set: '[data-settings-section]', addClass: ['tight'] }, { css: '.tight{padding-block:1px}' }], build: 'Less padding in the section buttons.' },
          ],
        },
      ],
      cuts: [
        { id: 'top', label: 'Threads' },
        { id: 'settings', label: 'Settings open', steps: [{ click: 'button[aria-label="Settings"]' }], seen: '[data-app-modal]' },
      ],
    };
    writeFileSync(join(project.draft('relay'), 'board.json'), JSON.stringify(board, null, 2));
    // The page check sees the sign-in screen and says so; that is a warning, the draft can be published.
    const published = await project.pe('propose');
    expect(published.code, published.stdout + published.stderr).toBe(0);
    const { link } = await project.json<{ link: string }>('preview');
    await page.goto(link);

    const app = page.frameLocator('iframe.frame-page');
    await expect(app.locator('#login h1')).toHaveText('Sign in');
    // Nothing is called "not found": the page has simply not been opened yet.
    await expect(page.locator('#sheet-note')).toBeVisible();
    await expect(page.locator('#sheet-note')).toContainText('Sign in, in the preview.');
    await expect(page.locator('.is-lost')).toHaveCount(0);
    await expect(page.locator('.hit')).toHaveCount(0);
    expect((await project.json<{ pageProblems: unknown[] }>('status')).pageProblems).toEqual([]);

    await app.locator('#email').fill('dev@relay.test');
    await app.locator('#password').fill('trail-dev');
    await app.locator('button[type=submit]').click();

    // The app is open, on the page of the board, and its area can be chosen.
    await expect(app.locator('[data-testid="thread-row"]')).toHaveCount(3);
    await expect(page.locator('#sheet-note')).toBeHidden();
    await expect(page.locator('.hit').first()).toBeVisible({ timeout: 15_000 });
    await choose(page, 'rows', 'title-first');
    await expect(app.locator('[data-testid="thread-row"] > .font-medium:first-child')).toHaveCount(3);
    // A row that arrives is a row like the others.
    await app.locator('button[aria-label="Add a thread"]').click();
    await expect(app.locator('[data-testid="thread-row"] > .font-medium:first-child')).toHaveCount(4);

    // A moment behind a click, drawn late and outside the app's root: the dialog gets its dot.
    await page.locator('.cut[data-cut="settings"]').click();
    await expect(app.locator('[data-app-modal]')).toBeVisible();
    await choose(page, 'sections', 'tight');
    await expect(app.locator('[data-settings-section].tight')).toHaveCount(3);
    await expect(page.locator('#count')).toHaveText('2 of 2 chosen');
    expect((await project.json<{ pageProblems: unknown[] }>('status')).pageProblems).toEqual([]);

    // The person follows a link of the app to a screen that has none of the areas: the review offers the way back.
    await page.locator('.cut[data-cut="top"]').click();
    await expect(app.locator('[data-testid="thread-row"]')).toHaveCount(3);
    await expect(page.locator('#sheet-away')).toBeHidden();
    await app.locator('button[aria-label="Help"]').click();
    await expect(app.locator('[data-slot="help"]')).toBeVisible();
    await expect(page.locator('#sheet-away')).toBeVisible();
    await page.locator('#btn-return').click();
    await expect(app.locator('[data-testid="thread-row"] > .font-medium:first-child')).toHaveCount(3);
    await expect(page.locator('#sheet-away')).toBeHidden();
    expect(errors).toEqual([]);
  } finally {
    site.stop();
    await project.cleanup();
  }
});
