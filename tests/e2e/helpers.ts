import { expect, test as base, type FrameLocator, type Page } from '@playwright/test';
import { exampleProject, type Project } from '../helpers/project.js';

export interface Review {
  project: Project;
  link: string;
  /** The page inside the stage. */
  mock: FrameLocator;
  /** Run a function inside the mockup's document, from the review page. */
  inMock<T>(fn: (doc: Document, win: Window) => T): Promise<T>;
  /** Point at an area's dot and wait for its options. */
  openOptions(area: string): Promise<void>;
  choose(area: string, option: string): Promise<void>;
  chooseAll(choices: Record<string, string>): Promise<void>;
  status(): Promise<{ phase: string; choices: Record<string, string>; missing: string[]; openRequests: Array<{ id: string; area: string | null; text: string }> }>;
}

/** Every test gets its own project with the example board published and the review page open. */
export const test = base.extend<{ review: Review }>({
  review: async ({ page }, use) => {
    const project = await exampleProject();
    const { link } = await project.json<{ link: string }>('preview');
    const errors: string[] = [];
    // Chromium reports the test driver's own attempts to run code inside the script-less frames.
    const fromDriver = (text: string) => /Blocked script execution in 'about:(srcdoc|blank)'/.test(text);
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !fromDriver(m.text()) && errors.push(m.text()));
    await page.goto(link);
    await expect(page.locator('.hit').first()).toBeVisible();
    const review: Review = {
      project,
      link,
      mock: page.frameLocator('iframe.frame-page'),
      inMock: (fn) =>
        page.evaluate((source) => {
          const frame = document.querySelector<HTMLIFrameElement>('iframe.frame-page')!;
          return (0, eval)(`(${source})`)(frame.contentDocument, frame.contentWindow);
        }, fn.toString()),
      openOptions: async (area) => {
        await page.locator(`.hit[data-area="${area}"]`).hover();
        await expect(page.locator(`.pop[data-area="${area}"]`)).toBeVisible();
      },
      choose: async (area, option) => {
        await review.openOptions(area);
        await page.locator(`.pop[data-area="${area}"] .opt[data-option="${option}"]`).click();
        await expect(page.locator('.pop')).toHaveCount(0);
      },
      chooseAll: async (choices) => {
        // The keyboard path: every area is a button on the sheet.
        for (const [area, option] of Object.entries(choices)) {
          await page.locator(`.sheet [data-area="${area}"]`).click();
          await page.locator(`.pop[data-area="${area}"] .opt[data-option="${option}"]`).click();
          await expect(page.locator('.pop')).toHaveCount(0);
        }
      },
      status: () => project.json('status'),
    };
    await use(review);
    expect(errors, 'errors in the review page').toEqual([]);
    await project.cleanup();
  },
});

export { expect };

export const ALL = { nav: 'links', hero: 'split', schedule: 'timeline', signup: 'stacked', 'signup-error': 'inline', 'signup-done': 'inline' };

/** Scroll the mockup with the mouse wheel, the way a person does. */
export async function wheel(page: Page, dy: number): Promise<void> {
  const box = (await page.locator('iframe.frame-page').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, dy);
}
