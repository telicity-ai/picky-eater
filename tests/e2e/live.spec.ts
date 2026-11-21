import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser } from '../../src/check/browser.js';
import { ALL, expect, test, wheel } from './live-helpers.js';

const style = (selector: string, property: string) => `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).${property}`;

test.describe('a storyboard over a running page', () => {
  test('the real page runs inside the review: styles, scripts, scroll effects, socket, cookie', async ({ page, live }) => {
    await expect(live.app.locator('h1')).toHaveText('See the harbor on two wheels');
    // Another origin, in a frame that cannot navigate the review page.
    const iframe = page.locator('iframe.frame-page');
    expect(new URL((await iframe.getAttribute('src'))!).origin).not.toBe(new URL(live.link).origin);
    expect(await iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation');

    // The site's own script works: the sticky header gets lower once the page is scrolled …
    await expect.poll(() => live.read(style('.site-header', 'position'))).toBe('sticky');
    await expect(live.app.locator('.site-header')).not.toHaveClass(/is-scrolled/);
    await wheel(page, 400);
    await expect(live.app.locator('.site-header')).toHaveClass(/is-scrolled/);
    await expect.poll(() => live.read('document.querySelector(".site-header").getBoundingClientRect().top')).toBe(0);
    // … and the steps appear when they scroll into view.
    await expect(live.app.locator('.reveal').first()).not.toHaveClass(/is-visible/);
    await expect(async () => {
      await wheel(page, 300);
      await expect(live.app.locator('.reveal').first()).toHaveClass(/is-visible/, { timeout: 600 });
    }).toPass();

    // What the development server adds still works behind the stage listener.
    await expect(live.app.locator('#dev')).toHaveText('Development server: connected · cookie set');
    await live.site.update();
    await expect(live.app.locator('#dev')).toHaveText('Development server: connected, 1 update · cookie set');
    // The caching service worker of the site is not registered in the preview.
    expect(await live.frame().evaluate(async () => ('serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0))).toBe(0);
  });

  test('a dot shows drawn options; pointing at one previews it on the real page, leaving undoes it, clicking keeps it', async ({ page, live }) => {
    await expect(page.locator('#count')).toHaveText('0 of 5 chosen');
    const padding = () => live.read(style('.site-header', 'paddingTop'));
    await expect.poll(padding).toBe('22px');

    await live.openOptions('header');
    const options = page.locator('.pop .opt');
    await expect(options).toHaveCount(3);
    // The thumbnails are inert copies of the page: frames that cannot run scripts.
    await expect(page.locator('.pop .opt .mini.is-ready')).toHaveCount(3);
    for (const sandbox of await page.locator('.pop .opt iframe').evaluateAll((list) => list.map((f) => f.getAttribute('sandbox')))) expect(sandbox).toBe('allow-same-origin');
    // Each one shows the header, not the top-left corner of some other part.
    const drawn = await page.locator('.pop .opt[data-option="compact"] iframe').evaluate((f: HTMLIFrameElement) => f.contentDocument!.querySelector('.brand')?.textContent);
    expect(drawn).toBe('Harbor Bikes');

    // A patch that finds its element by an attribute is drawn too: the copy is only made inert afterwards.
    const pill = (option: string) => page.locator(`.pop .opt[data-option="${option}"] iframe`).evaluate((f: HTMLIFrameElement) => f.contentDocument!.querySelectorAll('.nav-cta').length);
    expect(await pill('reserve-button')).toBe(1);
    expect(await pill('keep')).toBe(0);
    expect(await page.locator('.pop .opt iframe').first().evaluate((f: HTMLIFrameElement) => f.contentDocument!.querySelectorAll('[href], script, [onclick]').length)).toBe(0);

    await page.locator('.pop .opt[data-option="compact"]').hover();
    await expect.poll(padding).toBe('10px');
    expect((await live.status()).choices).toEqual({});
    await page.locator('.pop .opt[data-option="reserve-button"]').hover();
    await expect.poll(padding).toBe('22px');
    await expect(live.app.locator('.site-header nav a').last()).toHaveClass('nav-cta');
    await page.keyboard.press('Escape');
    await expect(live.app.locator('.site-header nav a').last()).not.toHaveClass(/nav-cta/);

    await live.openOptions('header');
    await page.locator('.pop .opt[data-option="compact"]').click();
    await expect(page.locator('#count')).toHaveText('1 of 5 chosen');
    await expect.poll(padding).toBe('10px');
    await expect.poll(async () => (await live.status()).choices).toEqual({ header: 'compact' });
    // The site forbids inline styles. The patch and the dots are in constructed stylesheets, which its policy does not cover.
    expect(await live.read("document.querySelectorAll('style').length")).toBe(0);
    expect(await live.read('document.adoptedStyleSheets.length')).toBe(1);

    // The choice is stored, not just shown: it is there again after a reload.
    await page.reload();
    await expect(page.locator('#count')).toHaveText('1 of 5 chosen');
    await expect.poll(padding).toBe('10px');
  });

  test('patches of every level leave the page working', async ({ page, live }) => {
    // Level 2, set: text and an attribute of an existing element.
    await live.choose('hero-action', 'reserve');
    await expect(live.app.locator('.hero .cta')).toHaveText('Reserve a bike');
    await expect(live.app.locator('.hero .cta')).toHaveAttribute('href', '#signup');

    // Level 3, insert, outside the area ("page": true).
    await live.choose('offer', 'bar');
    await expect.poll(() => live.read('document.body.firstElementChild.className')).toBe('offer-bar');
    await expect(live.app.locator('#offer')).toBeHidden();
    // The option hides the line it replaces. The area is still there, on the bar, and can be changed again.
    await expect(page.locator('.sheet-more .is-lost')).toHaveCount(0);
    await expect(page.locator('.sheet-page [data-area="offer"]')).toBeVisible();
    expect((await live.status()).pageProblems).toEqual([]);

    // Level 2, move: the card is the same element, so the listener the site attached is still on it.
    await live.choose('plans', 'week-first');
    await expect(live.app.locator('.plan-row .plan').first()).toHaveClass(/plan--week/);
    await live.app.locator('.plan--week button').click();
    await expect(live.app.locator('#picked')).toHaveText('You picked: Week.');
    await expect(live.app.locator('.plan--week')).toHaveClass(/is-picked/);

    // Level 4, a script: marked as approximate, working on the real page, and undone completely.
    await page.locator('.sheet [data-area="plans"]').click();
    await expect(page.locator('.pop .opt[data-option="billing"] .opt-approx')).toHaveText('Approximate');
    await expect(page.locator('.pop .opt-approx')).toHaveCount(1);
    await page.locator('.pop .opt[data-option="billing"]').click();
    await expect(live.app.locator('.billing button')).toHaveCount(2);
    await expect(live.app.locator('.plan-row .plan').first()).toHaveClass(/plan--day/); // the move is undone
    await live.app.locator('.billing button', { hasText: 'Subscribe' }).click();
    await expect(live.app.locator('.plan--day .price b')).toHaveText('10');
    await expect(live.app.locator('.plan--month .price b')).toHaveText('102');
    await live.choose('plans', 'keep');
    await expect(live.app.locator('.billing')).toHaveCount(0);
    await expect(live.app.locator('.plan--day .price b')).toHaveText('12');

    // The form of the site still checks itself and still sends.
    await live.app.locator('#name').fill('Mina Park');
    await live.app.locator('#email').fill('not an address');
    await live.app.locator('#signup button[type=submit]').click();
    await expect(live.app.locator('.form-error')).toHaveText('Enter an email address, like name@example.com.');
    await live.app.locator('#email').fill('mina@example.com');
    await live.app.locator('#signup button[type=submit]').click();
    await expect(live.app.locator('.form-done')).toBeVisible();
    await expect(live.app.locator('.signup form')).toBeHidden();
    expect((await live.status()).choices).toEqual({ 'hero-action': 'reserve', offer: 'bar', plans: 'keep' });
  });

  test('cuts are reached by their steps, recognised when the person acts, and own their dots', async ({ page, live }) => {
    const current = page.locator('.cut[aria-current="true"]');
    await expect(current).toHaveAttribute('data-cut', 'top');
    await expect(page.locator('.hit[data-area="form-error"]')).toHaveCount(0);

    // From the strip: the page is opened afresh and the steps are replayed on it.
    await page.locator('.cut[data-cut="error"]').click();
    await expect(live.app.locator('.form-error')).toHaveText('Tell us your name. Enter an email address, like name@example.com.');
    await expect(current).toHaveAttribute('data-cut', 'error');
    await expect(page.locator('.hit[data-area="form-error"]')).toBeVisible();

    await live.openOptions('form-error');
    await page.locator('.pop .opt[data-option="box"]').click();
    await expect.poll(() => live.read('document.querySelector(".signup form").firstElementChild.className')).toBe('form-error');
    await expect.poll(() => live.read(style('.form-error', 'borderLeftWidth'))).toBe('4px');

    // Back to the top: a fresh page, where the error message does not exist.
    await page.locator('.cut[data-cut="top"]').click();
    await expect(live.app.locator('.form-error')).toBeHidden();
    await expect(current).toHaveAttribute('data-cut', 'top');
    await expect(page.locator('.hit[data-area="form-error"]')).toHaveCount(0);
    await expect.poll(() => live.read('window.scrollY')).toBe(0);

    // The person sends the empty form themselves: the review follows, and the chosen patch is applied to the new message.
    await live.app.locator('#signup button[type=submit]').click();
    await expect(current).toHaveAttribute('data-cut', 'error');
    await expect.poll(() => live.read('document.querySelector(".signup form").firstElementChild.className')).toBe('form-error');
    await expect(page.locator('.hit[data-area="form-error"]')).toBeVisible();

    // A cut with values to fill in.
    await page.locator('.cut[data-cut="sent"]').click();
    await expect(live.app.locator('.form-done')).toBeVisible();
    await expect(current).toHaveAttribute('data-cut', 'sent');
    await expect(page.locator('.cut[data-cut="sent"] .mini.is-empty')).toHaveCount(0); // its picture is taken while the page is in it
    // A scroll position of the first state.
    await page.locator('.cut[data-cut="plans"]').click();
    await expect(current).toHaveAttribute('data-cut', 'plans');
    await expect(live.app.locator('.form-done')).toBeHidden();
    await expect.poll(() => live.read('Math.round(document.querySelector("#plans").getBoundingClientRect().top)')).toBeLessThan(120);
    // Every moment that was visited has a picture in the strip.
    await expect(page.locator('.cut .mini.is-empty')).toHaveCount(0);
  });

  test('an area can depend on the choice of another', async ({ page, live }) => {
    await live.choose('plans', 'featured');
    await expect(page.locator('#count')).toHaveText('1 of 6 chosen');
    await live.choose('week-badge', 'popular');
    await expect(live.app.locator('.plan--week .plan-badge')).toHaveText('Most popular');
    // Without its host the area and its patch are gone.
    await live.choose('plans', 'keep');
    await expect(page.locator('#count')).toHaveText('1 of 5 chosen');
    await expect(live.app.locator('.plan-badge')).toHaveCount(0);
    await expect.poll(async () => (await live.status()).choices).toEqual({ plans: 'keep' });
  });

  test('Desktop and Phone show the same page at another width', async ({ page, live }) => {
    await live.choose('header', 'compact');
    await page.locator('[data-viewport="phone"]').click();
    await expect.poll(() => live.read('window.innerWidth')).toBe(390);
    await expect.poll(() => live.read(style('.plan-row', 'gridTemplateColumns'))).not.toContain(' ');
    await expect.poll(() => live.read(style('.site-header', 'paddingTop'))).toBe('10px');
    await live.openOptions('header');
    await expect(page.locator('.pop .opt .mini.is-ready')).toHaveCount(3);
  });

  test('approving keeps what was chosen on the page and takes the dots away', async ({ page, live }) => {
    for (const [area, option] of Object.entries(ALL)) {
      if (area === 'form-error') await page.locator('.cut[data-cut="error"]').click();
      await live.choose(area, option);
    }
    await expect(page.locator('#count')).toHaveText('6 of 6 chosen');
    await page.locator('#btn-approve').click();
    await page.locator('#confirm-yes').click();
    await expect(page.locator('#status')).toHaveText('Approved');
    await expect(page.locator('.hit:visible')).toHaveCount(0);
    const status = await live.status();
    expect(status.phase).toBe('approved');
    expect(status.choices).toEqual(ALL);
    expect((await live.project.pe('wait', '--timeout', '0')).stdout).toContain('plans (Plan cards): featured [pricing-table]');
    await expect.poll(() => live.read('document.querySelector(".signup form").firstElementChild.className')).toBe('form-error');
  });
});

test.describe('after approval', () => {
  test.skip(!findBrowser(), 'needs an installed Chrome, Edge or Chromium for the comparison');
  test('what was approved is shown next to what was built', async ({ page, live }) => {
    // Two headless runs of the comparison: slow when the machine is short of memory.
    test.setTimeout(240_000);
    for (const [area, option] of Object.entries({ ...ALL, 'week-badge': 'keep' })) {
      if (area === 'form-error') await page.locator('.cut[data-cut="error"]').click();
      await live.choose(area, option);
    }
    await expect(page.locator('#btn-built')).toBeHidden();
    await page.locator('#btn-approve').click();
    await page.locator('#confirm-yes').click();
    await expect(page.locator('#status')).toHaveText('Approved');

    // The agent's part: measure the approved page, then compare. Nothing has been built, so everything approved is still missing.
    expect((await live.project.pe('implement')).code).toBe(0);
    const check = await live.project.pe('check');
    expect(check.code).toBe(20);
    expect(check.stdout).toContain('text "Free helmet with every rental this month." is missing');

    await expect(page.locator('#btn-built')).toBeVisible();
    // Once the page is compared, the review shows it as it is: the approved patches are no longer laid over it.
    await expect(live.app.locator('.offer-bar')).toHaveCount(0);
    await page.locator('#btn-built').click();
    await expect(page.locator('#panel-title')).toHaveText('Approved and built');
    await expect(page.locator('#panel-body')).toContainText('The built page differs from what you approved');
    const offer = page.locator('#panel-body .built[data-area="offer"]');
    await expect(offer.locator('figcaption')).toHaveText(['Approved', 'Built']);
    await expect(offer).toContainText('text "Free helmet with every rental this month." is missing');
    await expect.poll(() => offer.locator('img').evaluateAll((list) => list.map((img) => (img as HTMLImageElement).naturalWidth > 0))).toEqual([true, true]);
    await expect(page.locator('#panel-body .built[data-area="hero-action"]')).toContainText('is not in the approved page');
    // The top bar still fits on one line with the extra button.
    expect(await page.evaluate(() => document.querySelector('.top')!.scrollWidth <= document.querySelector('.top')!.clientWidth)).toBe(true);
  });
});

test.describe('the app has no say', () => {
  test.use({ liveOptions: { hostile: true } });
  test('messages, requests and navigation from the app change nothing', async ({ page, live }) => {
    const reviewOrigin = new URL(live.link).origin;
    const outcome = await live.frame().evaluate(async (origin) => {
      const out: Record<string, string> = {};
      // Pretend to be the agent, the review page, anything.
      for (const type of ['choose', 'approve', 'done', 'look', 'init']) {
        parent.postMessage({ pe: 1, epoch: 1, type, req: 1, ok: true, area: 'header', option: 'compact', choices: { header: 'compact' } }, '*');
      }
      parent.postMessage({ pe: 1, epoch: 1, type: 'frame', sx: 0, sy: 0, vw: 99999, vh: 99999, ph: 1, state: 'error', spy: 'error', areas: [{ id: 'nope', x: -5000, y: -5000, w: 1e9, h: 1e9, dot: { x: 1e9, y: -1e9, on: true }, state: 'chosen' }], problems: [] }, '*');
      try {
        const res = await fetch(`${origin}/api/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        out.approve = String(res.status);
      } catch {
        out.approve = 'blocked';
      }
      try {
        out.state = String((await fetch(`${origin}/api/state`)).status);
      } catch {
        out.state = 'blocked';
      }
      try {
        // The review page's own document is out of reach.
        out.dom = String(parent.document.title);
      } catch {
        out.dom = 'blocked';
      }
      try {
        top!.location.href = 'about:blank';
        out.navigate = 'tried';
      } catch {
        out.navigate = 'blocked';
      }
      return out;
    }, reviewOrigin);
    expect(outcome.approve).toMatch(/^(blocked|401|403)$/);
    expect(outcome.state).toMatch(/^(blocked|401)$/);
    expect(outcome.dom).toBe('blocked');
    await page.waitForTimeout(400);
    expect(page.url().startsWith(reviewOrigin)).toBe(true);
    const status = await live.status();
    expect(status.phase).toBe('choosing');
    expect(status.choices).toEqual({});
    await expect(page.locator('#count')).toHaveText('0 of 5 chosen');
    await expect(page.locator('.hit[data-area="nope"]')).toHaveCount(0);
    await expect(page.locator('#confirm')).toBeHidden();
  });
});

test.describe('what the page could not find', () => {
  test.use({
    liveOptions: {
      board: (board) => {
        board.areas[1].anchor = '.no-such-element';
        board.areas[3].options[2].patch = [{ move: '.plan--year', before: '.plan--day' }];
      },
    },
  });
  test('is shown to the person and reported to the coding agent', async ({ page, live }) => {
    await expect(page.locator('#count')).toHaveText('0 of 5 chosen');
    const lost = page.locator('.sheet-more .more.is-lost');
    await expect(lost).toHaveText('Main button of the top banner: not found');
    await expect.poll(async () => (await live.status()).pageProblems).toEqual([{ area: 'hero-action', option: null, code: 'ANCHOR_MISSING', detail: '.no-such-element' }]);
    expect((await live.project.pe('status')).stdout).toContain('Problem on the page: hero-action: the anchor matches nothing on the page (.no-such-element)');

    // A patch whose element is missing changes nothing, and says so.
    await live.choose('plans', 'week-first');
    await expect(live.app.locator('.plan-row .plan').first()).toHaveClass(/plan--day/);
    await expect.poll(async () => (await live.status()).pageProblems.map((p) => `${p.area} ${p.code}`)).toEqual(['hero-action ANCHOR_MISSING', 'plans TARGET_MISSING']);
  });
});

test.describe('an option that hides its own area', () => {
  test.use({ liveOptions: { board: (board) => delete board.areas[2].options[1].focus } });
  test('can still be changed, from the sheet', async ({ page, live }) => {
    await live.choose('offer', 'bar');
    await expect(live.app.locator('.offer-bar')).toBeVisible();
    await expect(live.app.locator('#offer')).toBeHidden();
    await expect(page.locator('.hit[data-area="offer"]')).toHaveCount(0);
    // It is listed under the page, and it is not an error.
    const entry = page.locator('.sheet-more [data-area="offer"]');
    await expect(entry).toBeVisible();
    await expect(entry).not.toHaveClass(/is-lost/);
    expect((await live.status()).pageProblems).toEqual([]);

    await entry.click();
    await expect(page.locator('.pop[data-area="offer"] .opt')).toHaveCount(2);
    const size = await page.locator('.pop').boundingBox();
    expect(size!.width).toBeLessThan(900); // drawn small, not as a whole page
    await page.locator('.pop .opt[data-option="keep"]').click();
    await expect(live.app.locator('.offer-bar')).toHaveCount(0);
    await expect(live.app.locator('#offer')).toBeVisible();
    await expect(page.locator('.hit[data-area="offer"]')).toBeVisible();
  });
});

test.describe('"attach": "tag"', () => {
  test.use({ liveOptions: { tag: true } });
  test('the app is framed from its own origin and loads the agent through one script tag', async ({ page, live }) => {
    const file = join(live.project.dir, 'site/index.html');
    expect(readFileSync(file, 'utf8')).toContain('data-picky-eater');
    expect(await page.locator('iframe.frame-page').getAttribute('src')).toBe(`${live.site.origin}/`);

    await live.choose('header', 'compact');
    await expect.poll(() => live.read(style('.site-header', 'paddingTop'))).toBe('10px');
    expect((await live.project.pe('status')).stdout).toContain('Script tag in place: site/index.html');
    // The site keeps its own service worker: it is the user's own origin, so nothing there is switched off.
    await expect.poll(() => live.read("'serviceWorker' in navigator ? String(navigator.serviceWorker.register).includes('picky-eater') : false")).toBe(false);

    expect((await live.project.pe('detach')).stdout).toContain('Removed picky-eater\'s script tag from site/index.html.');
    expect(readFileSync(file, 'utf8')).toBe(readFileSync('examples/static-site/site/index.html', 'utf8'));
    expect((await live.project.pe('status')).stdout).not.toContain('Script tag in place');
  });
});
