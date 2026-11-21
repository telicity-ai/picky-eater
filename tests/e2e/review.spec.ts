import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL, expect, test, wheel } from './helpers.js';

test.describe('storyboard to finished mockup', () => {
  test('the page opens as a sketch with a dot on every area', async ({ page, review }) => {
    await expect(review.mock.locator('[data-pe-state="sketch"]')).toHaveCount(4);
    await expect(review.mock.locator('[data-pe-state="chosen"]')).toHaveCount(0);
    await expect(page.locator('.hit:visible')).toHaveCount(3); // the fourth area is further down the page
    await expect(page.locator('#count')).toHaveText('0 of 4 chosen');
    await expect(page.locator('.sheet .cell.is-sketch')).toHaveCount(4);
    await expect(page.locator('#btn-approve')).toBeDisabled();
    await expect(page.locator('.cut')).toHaveCount(6);
  });

  test('the options are drawings, without titles or instructions', async ({ page, review }) => {
    await review.openOptions('hero');
    const pop = page.locator('.pop');
    await expect(pop.locator('.opt')).toHaveCount(3);
    await expect(pop.locator('.opt .mini.is-ready iframe')).toHaveCount(3);
    expect((await pop.innerText()).trim()).toBe('');
    // Each option is named for screen readers, and the suggested one is marked.
    await expect(pop.locator('.opt').first()).toHaveAttribute('aria-label', 'Text on the left, picture on the right');
    await expect(pop.locator('.opt-star')).toHaveCount(1);
    // The popover does not cover the dot it belongs to.
    const dot = (await page.locator('.hit[data-area="hero"]').boundingBox())!;
    const box = (await pop.boundingBox())!;
    const overlaps = box.x < dot.x + dot.width && box.x + box.width > dot.x && box.y < dot.y + dot.height && box.y + box.height > dot.y;
    expect(overlaps).toBe(false);
  });

  test('a thumbnail shows the part that changes, not the top of the page', async ({ page, review }) => {
    await wheel(page, 200);
    await review.openOptions('schedule');
    const text = await page.locator('.pop .opt[data-option="table"] iframe').evaluate((frame: HTMLIFrameElement) => {
      const doc = frame.contentDocument!;
      const area = doc.querySelector('[data-pe-area="schedule"]')!;
      const box = area.getBoundingClientRect();
      // The area is at the top of the thumbnail's screen, below the sticky bar at most.
      return { top: box.top, heading: area.querySelector('h2')!.textContent };
    });
    expect(text.heading).toBe('Schedule');
    expect(text.top).toBeGreaterThanOrEqual(0);
    expect(text.top).toBeLessThan(120);
  });

  test('pointing at an option shows it on the page; moving away puts the sketch back', async ({ page, review }) => {
    await review.openOptions('hero');
    const slot = review.mock.locator('[data-pe-area="hero"]');
    await page.locator('.pop .opt[data-option="facts"]').hover();
    await expect(slot).toHaveAttribute('data-pe-state', 'preview');
    await expect(slot.locator('dl.facts')).toBeVisible();
    await page.locator('.pop .opt[data-option="centered"]').hover();
    await expect(slot.locator('.hero--centered')).toBeVisible();
    await page.locator('#title').hover();
    await expect(slot).toHaveAttribute('data-pe-state', 'sketch');
    await expect(page.locator('.pop')).toHaveCount(0);
    expect((await review.status()).choices).toEqual({});
  });

  test('clicking an option keeps it, here and on disk', async ({ page, review }) => {
    await review.choose('hero', 'split');
    await expect(review.mock.locator('[data-pe-area="hero"]')).toHaveAttribute('data-pe-state', 'chosen');
    await expect(review.mock.locator('[data-pe-area="hero"] img')).toHaveJSProperty('complete', true);
    await expect(page.locator('#count')).toHaveText('1 of 4 chosen');
    await expect(page.locator('.sheet .cell[data-area="hero"]')).toHaveClass(/is-chosen/);
    await expect(page.locator('.sheet .cell[data-area="hero"] .mini.is-ready')).toHaveCount(1);
    await expect.poll(async () => (await review.status()).choices).toEqual({ hero: 'split' });

    await page.reload();
    await expect(review.mock.locator('[data-pe-area="hero"]')).toHaveAttribute('data-pe-state', 'chosen');
    await expect(page.locator('#count')).toHaveText('1 of 4 chosen');
  });

  test('choosing keeps the page where it was', async ({ page, review }) => {
    await wheel(page, 250);
    const top = () => review.inMock((doc) => doc.querySelector('[data-pe-area="schedule"]')!.getBoundingClientRect().top);
    await expect.poll(async () => (await review.inMock((_, win) => win.scrollY)) > 200).toBe(true);
    const before = await top();
    // An option of the area above is taller than its sketch; the area being decided must not move.
    await review.openOptions('schedule');
    await page.locator('.pop .opt[data-option="cards"]').hover();
    expect(Math.abs((await top()) - before)).toBeLessThan(1.5);
    await page.locator('.pop .opt[data-option="cards"]').click();
    expect(Math.abs((await top()) - before)).toBeLessThan(1.5);
  });

  test('an area that is mostly below the screen is brought up before its options open', async ({ page, review }) => {
    await review.choose('nav', 'links');
    await review.choose('hero', 'split');
    const box = () =>
      review.inMock((doc, win) => {
        const r = doc.querySelector('[data-pe-area="schedule"]')!.getBoundingClientRect();
        return { top: r.top, visible: Math.min(win.innerHeight, r.bottom) - Math.max(0, r.top), screen: win.innerHeight };
      });
    const before = await box();
    expect(before.top).toBeGreaterThan(before.screen * 0.5); // only its top edge is on screen
    await review.openOptions('schedule');
    const after = await box();
    expect(after.top).toBeLessThan(260);
    // The preview of a tall option is now in view, and the options stay open although the dot moved away.
    await page.locator('.pop .opt[data-option="cards"]').hover();
    await expect(review.mock.locator('[data-pe-area="schedule"]')).toHaveAttribute('data-pe-state', 'preview');
    expect((await box()).visible).toBeGreaterThan(before.screen * 0.4);
  });

  test('an area inside an option appears once that option is chosen', async ({ page, review }) => {
    await review.chooseAll({ signup: 'stacked' });
    await expect(page.locator('#count')).toHaveText('1 of 6 chosen');
    // The two new areas belong to other cuts, so they are listed under the sheet.
    await expect(page.locator('.sheet .more')).toHaveCount(2);
    await page.locator('.sheet .more[data-area="signup-error"]').click();
    await expect(page.locator('.cut[data-cut="error"]')).toHaveAttribute('aria-current', 'true');
    await page.locator('.pop .opt[data-option="summary"]').click();
    await expect(review.mock.locator('.error-summary')).toBeVisible();
    await expect(page.locator('#count')).toHaveText('2 of 6 chosen');
  });
});

test.describe('the page behaves like a page', () => {
  test('it scrolls inside a frame of screen height, so sticky and scroll effects work', async ({ page, review }) => {
    await review.choose('nav', 'links');
    const sizes = await page.evaluate(() => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe.frame-page')!;
      return { frame: frame.clientHeight, page: frame.contentDocument!.documentElement.scrollHeight, window: innerHeight };
    });
    expect(sizes.frame).toBeLessThan(sizes.window);
    expect(sizes.page).toBeGreaterThan(sizes.frame * 1.5);

    const nav = () => review.inMock((doc) => {
      const r = doc.querySelector('.nav')!.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height), scroll: doc.documentElement.getAttribute('data-pe-scroll') };
    });
    expect(await nav()).toEqual({ top: 0, height: 72, scroll: 'top' });
    await wheel(page, 700);
    await expect.poll(nav).toEqual({ top: 0, height: 56, scroll: 'scrolled' });
  });

  test('the mockup cannot run scripts, and nothing in it loads from the network', async ({ page, review }) => {
    void review;
    const frame = page.locator('iframe.frame-page');
    await expect(frame).toHaveAttribute('sandbox', 'allow-same-origin');
    const csp = await frame.evaluate((f: HTMLIFrameElement) => f.contentDocument!.querySelector('meta[http-equiv]')!.getAttribute('content'));
    expect(csp).toContain("default-src 'none'");
  });

  test('controls work, and pressing the button moves to the right cut', async ({ page, review }) => {
    await review.chooseAll({ signup: 'stacked' });
    await page.locator('.cut[data-cut="empty"]').click();
    await expect(page.locator('.cut[data-cut="empty"]')).toHaveAttribute('aria-current', 'true');

    // Sent blank: the browser's own validation decides that this is the error cut.
    await page.locator('.zone[data-go="sent"]').click();
    await expect(page.locator('.cut[data-cut="error"]')).toHaveAttribute('aria-current', 'true');
    await expect(review.mock.locator('html')).toHaveAttribute('data-pe-cut', 'error');
    await expect(review.mock.locator('[data-pe-area="signup-error"]')).toBeVisible();

    // Typing happens in the mockup itself.
    await review.mock.locator('#name').fill('Mina Park');
    await review.mock.locator('#email').fill('mina@example.com');
    await page.locator('.zone[data-go="sent"]').click();
    await expect(page.locator('.cut[data-cut="sent"]')).toHaveAttribute('aria-current', 'true');
    await expect(review.mock.locator('form')).toBeHidden();
    await expect(review.mock.locator('[data-pe-area="signup-done"]')).toBeVisible();
  });

  test('a dot only exists in the cut its area belongs to', async ({ page, review }) => {
    await review.chooseAll({ signup: 'stacked' });
    await page.locator('.cut[data-cut="empty"]').click();
    await expect(page.locator('.hit[data-area="signup"]')).toBeVisible();
    await expect(page.locator('.hit[data-area="signup-error"]')).toHaveCount(0);
    await page.locator('.cut[data-cut="error"]').click();
    await expect(page.locator('.hit[data-area="signup-error"]')).toBeVisible();
    await expect(page.locator('.hit[data-area="signup-done"]')).toHaveCount(0);
  });

  test('choosing a cut sets its form values, and scrolling follows the cuts', async ({ page, review }) => {
    await review.chooseAll({ signup: 'stacked' });
    await page.locator('.cut[data-cut="filled"]').click();
    await expect(review.mock.locator('#email')).toHaveValue('mina@example.com');
    await page.locator('.cut[data-cut="top"]').click();
    await expect(review.mock.locator('#email')).toHaveValue('');
    expect(await review.inMock((_, win) => win.scrollY)).toBe(0);
    await wheel(page, 900);
    await expect(page.locator('.cut[data-cut="scrolled"]')).toHaveAttribute('aria-current', 'true');
  });

  test('at phone width the options appear beside the page', async ({ page, review }) => {
    await page.locator('[data-viewport="phone"]').click();
    await expect(page.locator('iframe.frame-page')).toHaveCSS('width', '390px');
    await expect(page.locator('.frame')).toHaveClass(/is-phone/);
    await review.openOptions('hero');
    const frame = (await page.locator('.frame').boundingBox())!;
    const pop = (await page.locator('.pop').boundingBox())!;
    expect(pop.x).toBeGreaterThanOrEqual(frame.x + frame.width);
    await page.locator('.pop .opt[data-option="split"]').click();
    // The chosen layout is the phone layout: one column.
    const columns = await review.inMock((doc, win) => win.getComputedStyle(doc.querySelector('.hero')!).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);
  });
});

test.describe('review screen', () => {
  test('the top bar is one line at 1440 pixels', async ({ page, review }) => {
    await review.chooseAll(ALL);
    const bar = (await page.locator('.top').boundingBox())!;
    expect(bar.height).toBeLessThanOrEqual(56);
    const overflow = await page.locator('.top').evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(overflow).toBe(false);
    for (const id of ['#title', '#viewports', '#progress', '#btn-history', '#btn-ask', '#btn-approve']) {
      const box = (await page.locator(id).boundingBox())!;
      expect(box.y, id).toBeGreaterThanOrEqual(bar.y);
      expect(box.y + box.height, id).toBeLessThanOrEqual(bar.y + bar.height);
    }
  });

  test('the close button of the side panel stays at the top while its content scrolls', async ({ page, review }) => {
    await page.locator('#btn-history').click();
    await expect(page.locator('#panel')).toBeVisible();
    const before = (await page.locator('#panel-close').boundingBox())!;
    await page.locator('#panel-body').evaluate((el) => {
      el.append(Object.assign(document.createElement('div'), { style: 'height:3000px' }));
      el.scrollTop = 2000;
    });
    const after = (await page.locator('#panel-close').boundingBox())!;
    expect(after.y).toBe(before.y);
    await page.keyboard.press('Escape');
    await expect(page.locator('#panel')).toBeHidden();
    void review;
  });

  test('the review page has no serious accessibility problems', async ({ page, review }) => {
    await review.choose('hero', 'split');
    await page.locator('#btn-ask').click();
    const results = await new AxeBuilder({ page }).exclude('iframe').analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});

test.describe('approval and change requests', () => {
  test('approve needs every area, asks once, and then locks the choices', async ({ page, review }) => {
    await review.chooseAll({ nav: 'links', hero: 'split', schedule: 'timeline' });
    await expect(page.locator('#btn-approve')).toBeDisabled();
    await review.chooseAll({ signup: 'stacked', 'signup-error': 'inline', 'signup-done': 'ticket' });
    await expect(page.locator('#count')).toHaveText('6 of 6 chosen');
    await expect(review.mock.locator('[data-pe-state="sketch"]')).toHaveCount(0);

    await page.locator('#btn-approve').click();
    await expect(page.locator('#confirm')).toBeVisible();
    expect((await review.status()).phase).toBe('choosing');
    await page.locator('#confirm-yes').click();
    await expect(page.locator('#status')).toHaveText('Approved');
    await expect(page.locator('.hit:visible')).toHaveCount(0);

    const status = await review.status();
    expect(status.phase).toBe('approved');
    expect(status.choices).toEqual({ ...ALL, 'signup-done': 'ticket' });
    expect((await review.project.pe('wait', '--timeout', '0')).code).toBe(0);

    await page.locator('#btn-approve').click(); // now "Change something"
    await expect(page.locator('#status')).toBeHidden();
    await expect(page.locator('.hit:visible').first()).toBeVisible();
    expect((await review.status()).phase).toBe('choosing');
  });

  test('what is being written stays when the state of the page changes under it', async ({ page, review }) => {
    await review.openOptions('schedule');
    await page.locator('.pop .opt-ask').click();
    await page.locator('#ask-text').fill('Show the lunch break too.');
    // A choice is saved while the panel is open, and the next looks at the session draw everything again.
    await review.chooseAll({ nav: 'links' });
    for (let looks = 0; looks < 3; looks++) await page.waitForResponse((r) => r.url().includes('/api/state'));
    await expect(page.locator('#ask-area')).toHaveValue('schedule');
    await expect(page.locator('#ask-text')).toHaveValue('Show the lunch break too.');
  });

  test('asking for a change reaches the agent, and the new draft arrives by itself', async ({ page, review }) => {
    await review.chooseAll({ nav: 'links', hero: 'split' });
    await review.openOptions('schedule');
    await page.locator('.pop .opt-ask').click();
    await expect(page.locator('#ask-area')).toHaveValue('schedule');
    await page.locator('#ask-text').fill('Show the lunch break too.');
    await page.locator('.ask button[type="submit"]').click();
    await expect(page.locator('#status')).toHaveText('Waiting for a new draft');

    const waited = await review.project.pe('wait', '--timeout', '0');
    expect(waited.code).toBe(10);
    expect(waited.stdout).toContain('Show the lunch break too.');

    // The agent changes only that area and publishes.
    const file = join(review.project.draft('workshop'), 'areas/schedule/timeline.html');
    writeFileSync(file, readFileSync(file, 'utf8').replace('<li><time>13:00', '<li><time>12:00</time><div><h3>Lunch</h3><p>Together.</p></div></li>\n    <li><time>13:00'));
    expect((await review.project.pe('propose', '--note', 'Added the lunch break')).code).toBe(0);

    await expect(page.locator('#draft')).toHaveText('Draft 2');
    await expect(page.locator('#status')).toBeHidden();
    // Choices for areas that did not change are still there.
    await expect(page.locator('#count')).toHaveText('2 of 4 chosen');
    await expect(review.mock.locator('[data-pe-area="hero"]')).toHaveAttribute('data-pe-state', 'chosen');
    await expect(review.mock.locator('[data-pe-area="schedule"]')).toHaveAttribute('data-pe-state', 'sketch');

    await page.locator('#btn-history').click();
    await expect(page.locator('#panel-body')).toContainText('Added the lunch break');
    await expect(page.locator('#panel-body')).toContainText('New options for Schedule of the day');
    await expect(page.locator('#panel-body')).toContainText('Show the lunch break too.');
  });

  test('without the link the page explains itself', async ({ page, review }) => {
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(review.link.split('#')[0]!);
    await expect(page.locator('#message-title')).toContainText('Open this page from your coding agent');
  });
});
