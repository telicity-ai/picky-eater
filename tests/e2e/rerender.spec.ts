import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test as base, type FrameLocator, type Page } from '@playwright/test';
import { makeProject, type Project } from '../helpers/project.js';
import { startSite, type Site } from '../helpers/site.js';
import { choose, chooseAll, patched, redraws } from '../stacks/visit.js';

/**
 * Patches on a page that redraws itself. The page (tests/e2e/pages/rerender) stands in for a
 * framework: it keeps references to its elements and changes them in the three ways frameworks
 * do. Real frameworks on their own development servers are run by tests/stacks.
 */

interface Opened {
  project: Project;
  app: FrameLocator;
  status(): Promise<{ pageProblems: Array<{ area: string; code: string }>; choices: Record<string, string> }>;
}

type Edit = (board: { areas: Array<Record<string, any>> }) => void;

const test = base.extend<{ open: (query: string, edit?: Edit) => Promise<Opened> }>({
  open: async ({ page }, use) => {
    const sites: Site[] = [];
    const projects: Project[] = [];
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Blocked script execution in 'about:(srcdoc|blank)'|allow-scripts and allow-same-origin|Refused to apply a stylesheet/.test(m.text())) errors.push(m.text());
    });
    await use(async (query, edit) => {
      const site = await startSite({ dir: resolve('tests/e2e/pages/rerender') });
      sites.push(site);
      const project = makeProject();
      projects.push(project);
      const board = JSON.parse(readFileSync(resolve('tests/stacks/board.json'), 'utf8')) as { base: { url: string }; areas: Array<Record<string, any>> };
      board.base.url = `${site.origin}/${query}`;
      edit?.(board as unknown as Parameters<Edit>[0]);
      expect((await project.pe('new', '--title', 'Trailhead', '--id', 'trailhead')).code).toBe(0);
      writeFileSync(`${project.draft('trailhead')}/board.json`, JSON.stringify(board, null, 2));
      const published = await project.pe('propose');
      expect(published.code, published.stdout + published.stderr).toBe(0);
      const { link } = await project.json<{ link: string }>('preview');
      await page.goto(link);
      await expect(page.locator('.hit').first()).toBeVisible({ timeout: 15_000 });
      return { project, app: page.frameLocator('iframe.frame-page'), status: () => project.json('status') };
    });
    expect(errors, 'errors in the review page or the app').toEqual([]);
    for (const site of sites) site.stop();
    for (const project of projects) await project.cleanup();
  },
});

/** The app as the page itself draws it, with nothing of picky-eater left in it. */
async function untouched(page: Page, app: FrameLocator): Promise<void> {
  await expect(app.locator('.count-box, .field-box, .hint, [data-pe-added]')).toHaveCount(0);
  await expect(app.locator('#join')).toHaveText('Join a crew');
  await expect(app.locator('#join')).not.toHaveClass(/big/);
  await expect(app.locator('#hero h1')).not.toHaveAttribute('data-tone');
  await expect(app.locator('#crews h2')).toHaveText('Crews near you');
  await expect(app.locator('.crew-list')).not.toHaveClass(/two-up/);
  await expect(app.locator('#name')).not.toHaveAttribute('placeholder');
  // Every element is back where the app put it, in the app's order, and no marker is left behind.
  const frame = page.frames().find((f) => f.parentFrame() === page.mainFrame() && f.url().includes('dom='))!;
  const children = await frame.evaluate(() => Array.from(document.querySelector('#crews')!.childNodes).map((n) => (n.nodeType === 1 ? (n as Element).id || (n as Element).localName : n.nodeType === 8 ? 'comment' : 'text')));
  expect(children.filter((c) => c !== 'text')).toEqual(['h2', 'ul', 'note', 'count', 'div']);
  expect(await frame.evaluate(() => document.querySelector('#signup')!.children[2]!.id)).toBe('name');
}

for (const dom of ['refs', 'parent', 'self'] as const) {
  test.describe(`a page that redraws itself (${dom === 'refs' ? 'through the parents it remembers' : dom === 'parent' ? 'through the parents its elements have now' : 'through the elements themselves'})`, () => {
    test('patches stay in place, the app keeps working, and taking them off leaves the page as the app has it', async ({ page, open }) => {
      const { app, status } = await open(`?dom=${dom}`);
      await expect(app.locator('#stack')).toHaveText(`dom=${dom}`);
      await chooseAll(page);
      await patched(app);
      await expect(app.locator('#hero > #note')).toHaveCount(1);
      await redraws(app);

      // What a hot update does: the top banner is made anew. The element that was moved into the old one is not lost.
      await app.locator('#remount').click();
      await expect(app.locator('#hero h1')).toHaveText('Fix a trail on Saturday');
      await patched(app);
      await expect(app.locator('#hero > #note')).toHaveCount(1);
      await expect(app.locator('#note')).toHaveCount(1);
      // The app still owns its note: it can take it away and bring it back.
      await app.locator('#toggle').click();
      await expect(app.locator('#note')).toHaveCount(0);
      await app.locator('#toggle').click();
      await expect(app.locator('#hero > #note')).toHaveCount(1);
      // A problem named while the app had the element away is taken back once the page is read again.
      await expect.poll(async () => (await status()).pageProblems).toEqual([]);

      // Back to "as it is now" everywhere: what the app changed meanwhile stays, what the patches did is gone.
      for (const area of ['hero', 'crews', 'note', 'signup']) await choose(page, area, 'keep');
      await untouched(page, app);
      await expect(app.locator('.crew')).toHaveCount(5);
      await expect(app.locator('#count')).toHaveText('Showing 5 crews');
      await expect(app.locator('#hello')).toHaveText('Hello, Mina!');
      await expect(app.locator('#hero h1')).toHaveText('Fix a trail on Saturday');
      // And the app works on: its own redraws find everything where it left it.
      await app.locator('#toggle').click();
      await expect(app.locator('#note')).toHaveCount(0);
      await app.locator('#toggle').click();
      await expect(app.locator('#crews > #note + #count')).toHaveCount(1);
    });
  });
}

/**
 * Two elements that the page adds and removes together, by walking from the first to the last.
 * If a patch has put the last one elsewhere, the walk must still stop there: otherwise the page
 * removes everything that follows.
 */
for (const [what, patch] of [
  ['moved', [{ move: '#tip2', into: '#hero' }]],
  ['wrapped', [{ wrap: '#tip2', in: '<div class="tip-box"></div>' }]],
] as const) {
  for (const dom of ['refs', 'parent', 'self'] as const) {
    test(`the last of a run of elements is ${what}, and the page takes the run away (dom=${dom})`, async ({ page, open }) => {
      const { app, status } = await open(`?dom=${dom}`, (board) => {
        const note = board.areas.find((a) => a.id === 'note')!;
        note.anchor = '#tip2';
        note.options[1] = { id: 'in-hero', label: 'Somewhere else', page: true, suggested: true, patch, focus: '#tip2' };
      });
      const place = what === 'moved' ? '#hero > #tip2' : '#signup .tip-box > #tip2';
      await choose(page, 'note', 'in-hero');
      await expect(app.locator(place)).toHaveCount(1);
      // The page removes both tips. What follows them stays, and nothing of the tips is left behind.
      await app.locator('#tips').click();
      await expect(app.locator('#tips')).toHaveText('Show the tips');
      await expect(app.locator('#tip1, #tip2, .tip-box')).toHaveCount(0);
      await expect(app.locator('#signup > #tips + #after')).toHaveText('See you on the trail.');
      await expect(app.locator('#hero > #join')).toHaveCount(1);
      // It brings them back, and the patch is on the new ones.
      await app.locator('#tips').click();
      await expect(app.locator('#tip1')).toHaveCount(1);
      await expect(app.locator(place)).toHaveCount(1);
      await expect(app.locator('#tip2')).toHaveCount(1);
      await app.locator('#tips').click();
      await expect(app.locator('#tip1, #tip2, .tip-box')).toHaveCount(0);
      await expect(app.locator('#signup > #tips + #after')).toHaveCount(1);
      expect((await status()).pageProblems.filter((p) => p.code !== 'ANCHOR_MISSING')).toEqual([]);
    });
  }
}

test('a page that keeps undoing a patch is left alone, and the person and the agent are told', async ({ page, open }) => {
  const { app, status } = await open('?dom=refs&fight=1');
  await choose(page, 'hero', 'cta');
  // The app rewrites the button a hundred times a second. The patch gives up instead of fighting it forever.
  await expect.poll(async () => (await status()).pageProblems.map((p) => `${p.area} ${p.code}`), { timeout: 20_000 }).toEqual(['hero REVERTED']);
  await expect(app.locator('#join')).toHaveText('Join a crew');
  await expect(app.locator('#join')).not.toHaveClass(/big/);
  await expect(page.locator('#toast')).toContainText('cannot be shown on this page: the page keeps changing that part back');
  // The other areas are not affected.
  await choose(page, 'signup', 'framed');
  await expect(app.locator('.field-box > #name')).toHaveCount(1);
});

/**
 * Lists. A patch on every row has to reach the rows that arrive later, and an operation "in each
 * row" has to be done in each of them: an app screen is mostly lists.
 */
for (const dom of ['refs', 'self'] as const) {
  test(`operations in each row of a list reach the rows that arrive later (dom=${dom})`, async ({ page, open }) => {
    const { app, status } = await open(`?dom=${dom}`, (board) => {
      const crews = board.areas.find((a) => a.id === 'crews')!;
      crews.options[1] = {
        id: 'count-first',
        label: 'When first, with a tag',
        suggested: true,
        patch: [
          // "The second element of the row": after the move this selector finds the other one, which is not a new row.
          { each: '.crew', patch: [{ move: ':scope > :nth-child(2)', before: ':scope > :nth-child(1)' }, { insert: '<i class="tag">open</i>', into: ':scope' }, { set: 'b', attr: { 'data-strong': '1' } }] },
          { set: '.crew', addClass: ['boxed'] },
        ],
      };
    });
    await choose(page, 'crews', 'count-first');
    const rows = (n: number) =>
      Promise.all([
        expect(app.locator('.crew')).toHaveCount(n),
        expect(app.locator('.crew.boxed')).toHaveCount(n),
        expect(app.locator('.crew > span:first-child + b[data-strong] + .tag')).toHaveCount(n),
        expect(app.locator('.tag')).toHaveCount(n),
      ]);
    await rows(3);
    // The app adds two rows. They get the same operations, and the first three are not done twice.
    await app.locator('#more').click();
    await expect(app.locator('#count')).toHaveText('Showing 5 crews');
    await rows(5);
    await expect.poll(async () => (await status()).pageProblems).toEqual([]);
    // Taking the option off leaves every row as the app made it.
    await choose(page, 'crews', 'keep');
    await expect(app.locator('.tag, .boxed, [data-strong], [data-pe-added]')).toHaveCount(0);
    await expect(app.locator('.crew > b:first-child + span:last-child')).toHaveCount(5);
  });
}

test('a list whose rows are not all of one kind: the operations are done where they fit', async ({ page, open }) => {
  const { app, status } = await open('?dom=refs', (board) => {
    const crews = board.areas.find((a) => a.id === 'crews')!;
    // The heading and the count are no rows with a <b>; only the crews are.
    crews.options[1] = { id: 'count-first', label: 'Names in capitals', suggested: true, patch: [{ each: '#crews > *, .crew', patch: [{ set: ':scope > b', addClass: ['caps'] }] }] };
  });
  await choose(page, 'crews', 'count-first');
  await expect(app.locator('b.caps')).toHaveCount(3);
  await app.locator('#more').click();
  await expect(app.locator('b.caps')).toHaveCount(5);
  await expect.poll(async () => (await status()).pageProblems).toEqual([]);
});
