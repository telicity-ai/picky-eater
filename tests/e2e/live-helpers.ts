import { expect, test as base, type Frame, type FrameLocator, type Page } from '@playwright/test';
import type { Project } from '../helpers/project.js';
import { liveProject, startSite, type Site } from '../helpers/site.js';

export interface Live {
  site: Site;
  project: Project;
  link: string;
  /** The user's app inside the stage. */
  app: FrameLocator;
  /** The same, for running code in it. */
  frame(): Frame;
  /** Evaluate an expression in the app. Undefined while the app is being reloaded, so that it can be polled. */
  read(expression: string): Promise<unknown>;
  openOptions(area: string): Promise<void>;
  choose(area: string, option: string): Promise<void>;
  status(): Promise<{ phase: string; choices: Record<string, string>; missing: string[]; pageProblems: Array<{ area: string; code: string }> }>;
}

export interface LiveOptions {
  /** Change the example board before it is published. */
  board?: (board: Record<string, any>) => void;
  /** Start the site without its security headers and serve the project's own copy of it ("attach": "tag"). */
  tag?: boolean;
  /** The test makes the app attack the review page; the browser's refusals are expected in the console. */
  hostile?: boolean;
}

/** Console noise that comes from the browser or the test driver, not from picky-eater. */
const expected = (text: string) =>
  /Blocked script execution in 'about:(srcdoc|blank)'/.test(text) ||
  /allow-scripts and allow-same-origin/.test(text) ||
  /service ?worker/i.test(text) ||
  // When a test fails, the driver's screenshot adds a style element to every frame; the example site's policy refuses it.
  /Refused to apply a stylesheet/.test(text);

export const test = base.extend<{ liveOptions: LiveOptions; live: Live }>({
  liveOptions: [{}, { option: true }],
  live: async ({ page, liveOptions }, use) => {
    // In tag mode the site must serve the file "attach" writes to, so the project comes first.
    let site = liveOptions.tag ? null : await startSite();
    let project: Project;
    if (site) project = await liveProject(site.origin, liveOptions.board);
    else {
      project = await liveProject('http://127.0.0.1:59999', liveOptions.board);
      site = await startSite({ plain: true, dir: `${project.dir}/site` });
      const origin = site.origin;
      const file = `${project.draft('harbor')}/board.json`;
      const { readFileSync, writeFileSync } = await import('node:fs');
      const board = JSON.parse(readFileSync(file, 'utf8'));
      board.base = { kind: 'live', url: `${origin}/`, attach: 'tag' };
      writeFileSync(file, JSON.stringify(board, null, 2));
      expect((await project.pe('attach', '--file', 'site/index.html')).code).toBe(0);
      expect((await project.pe('propose')).code).toBe(0);
    }
    const { link } = await project.json<{ link: string }>('preview');
    const errors: string[] = [];
    page.on('pageerror', (e) => !liveOptions.hostile && errors.push(e.message));
    // When the test makes the app attack the review page, each browser words its refusals differently; they are the point.
    page.on('console', (m) => m.type() === 'error' && !expected(m.text()) && !liveOptions.hostile && errors.push(`${m.text()} (${m.location().url}:${m.location().lineNumber})`));
    await page.goto(link);
    await expect(page.locator('.hit').first()).toBeVisible({ timeout: 15_000 });
    const frame = () => {
      const found = page.frames().find((f) => f !== page.mainFrame() && f.parentFrame() === page.mainFrame() && /^http:\/\/127\.0\.0\.1:\d+\//.test(f.url()) && f.name() === '' && !f.url().startsWith(new URL(link).origin));
      if (!found) throw new Error('The app frame is not there.');
      return found;
    };
    const live: Live = {
      site,
      project,
      link,
      app: page.frameLocator('iframe.frame-page'),
      frame,
      read: async (expression) => {
        try {
          return await frame().evaluate(expression);
        } catch {
          return undefined;
        }
      },
      openOptions: async (area) => {
        await page.locator(`.hit[data-area="${area}"]`).hover();
        await expect(page.locator(`.pop[data-area="${area}"]`)).toBeVisible();
      },
      choose: async (area, option) => {
        // From the sheet: it brings the area on screen first, wherever it is.
        // In its corner, because another area may lie in the middle of it.
        await page.locator(`.sheet [data-area="${area}"]`).click({ position: { x: 3, y: 3 } });
        await page.locator(`.pop[data-area="${area}"] .opt[data-option="${option}"]`).click();
        await expect(page.locator('.pop')).toHaveCount(0);
      },
      status: () => project.json('status'),
    };
    await use(live);
    expect(errors, 'errors in the review page or the app').toEqual([]);
    site.stop();
    await project.cleanup();
  },
});

export { expect };

export const ALL = { header: 'compact', 'hero-action': 'keep', offer: 'bar', plans: 'featured', 'week-badge': 'popular', 'form-error': 'box' };

/** Scroll the app with the mouse wheel, the way a person does. */
export async function wheel(page: Page, dy: number): Promise<void> {
  const box = (await page.locator('iframe.frame-page').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, dy);
}
