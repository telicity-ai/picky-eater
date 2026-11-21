import { expect, type FrameLocator, type Page } from '@playwright/test';

/**
 * A person's visit to the review of the "Trailhead" page (board.json), shared by the test of real
 * development servers (stack.spec.ts) and the test that needs none (tests/e2e/rerender.spec.ts).
 */

export const CHOICES = { hero: 'cta', crews: 'count-first', note: 'in-hero', signup: 'framed' } as const;

export async function choose(page: Page, area: string, option: string): Promise<void> {
  // From the sheet: it brings the area on screen first, wherever it is.
  await page.locator(`.sheet [data-area="${area}"]`).click({ position: { x: 3, y: 3 } });
  await page.locator(`.pop[data-area="${area}"] .opt[data-option="${option}"]`).click();
  await expect(page.locator('.pop')).toHaveCount(0);
}

export async function chooseAll(page: Page): Promise<void> {
  for (const [area, option] of Object.entries(CHOICES)) await choose(page, area, option);
  await expect(page.locator('#count')).toHaveText('4 of 4 chosen');
}

/** Every patch of the board is in place: a text, a class, attributes, a wrapper, a moved element, inserted markup. */
export async function patched(app: FrameLocator): Promise<void> {
  await expect(app.locator('#join')).toHaveText('Pick a crew');
  await expect(app.locator('#join')).toHaveClass(/big/);
  await expect(app.locator('#hero h1')).toHaveAttribute('data-tone', 'loud');
  await expect(app.locator('#crews h2')).toHaveText('Crews with places');
  await expect(app.locator('#crews h2 + .count-box > #count')).toHaveCount(1);
  await expect(app.locator('.crew-list')).toHaveClass(/two-up/);
  await expect(app.locator('.field-box > #name')).toHaveCount(1);
  await expect(app.locator('#hello + .hint')).toHaveText('We only use it to greet you.');
  await expect(app.locator('#name')).toHaveAttribute('placeholder', 'Mina');
}

/** The app redraws itself in the ways that undo patches. They hold, and the app keeps working. */
export async function redraws(app: FrameLocator): Promise<void> {
  // New list items, a class the app rewrites, a text it updates inside an element that was wrapped and moved.
  await app.locator('#more').click();
  await expect(app.locator('.crew')).toHaveCount(5);
  await expect(app.locator('#count')).toHaveText('Showing 5 crews');
  await expect(app.locator('.crew-list')).toHaveClass(/all/);
  await patched(app);
  // The app removes an element that was moved elsewhere, then adds it back before one that was wrapped.
  await app.locator('#toggle').click();
  await expect(app.locator('#note')).toHaveCount(0);
  await expect(app.locator('#toggle')).toHaveText('Show the note');
  await patched(app);
  await app.locator('#toggle').click();
  await expect(app.locator('#hero > #note')).toHaveCount(1);
  await expect(app.locator('#note')).toHaveCount(1);
  await expect(app.locator('#toggle')).toHaveText('Hide the note');
  await patched(app);
  // A field the app listens to, inside a wrapper it does not know about.
  await app.locator('#name').fill('Mina');
  await expect(app.locator('#hello')).toHaveText('Hello, Mina!');
  await patched(app);
}
