import { expect, test } from './live-helpers.js';
import { expect as plainExpect, test as sketch } from './helpers.js';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const PRESS = `#plans button{transition:transform 160ms ${EASE}}#plans button:active{transform:scale(0.97)}@media (prefers-reduced-motion: reduce){#plans button{transition:none}#plans button:active{transform:none}}`;
const STAGGER = `#plans .plan{animation:pe-rise 4000ms ${EASE} both}@keyframes pe-rise{from{opacity:0;transform:translateY(10px)}}@media (prefers-reduced-motion: reduce){#plans .plan{animation:none}}`;

/** The example board with one area that offers motion, and the reasons behind its suggestion. */
const withMotion = (board: Record<string, any>) => {
  board.areas = [
    board.areas.find((a: { id: string }) => a.id === 'header'),
    {
      id: 'choose',
      label: 'Choose buttons',
      anchor: '#plans',
      source: { file: 'site/styles.css', selector: 'button' },
      decision: 'press-feedback',
      rejected: [{ pattern: 'hold-to-confirm', why: 'Choosing a plan can be undone.' }],
      options: [
        { id: 'keep', label: 'Nothing moves on a press', keep: true, pattern: 'instant-change' },
        { id: 'press', label: 'Buttons shrink while pressed', pattern: 'press-scale', suggested: true, because: 'Nothing answers a press today.', patch: [{ css: PRESS }], build: 'styles.css: scale 0.97 while pressed.' },
        { id: 'cascade', label: 'Plans appear one after another', pattern: 'stagger-in', patch: [{ css: STAGGER }], build: 'styles.css: plans rise in.' },
      ],
    },
  ];
  board.cuts = [{ id: 'top', label: 'Top' }];
};

test.describe('motion in the review', () => {
  test.use({ liveOptions: { board: withMotion } });

  test('an option that moves is marked, and the reason behind the suggested mark shows only to who asks', async ({ page, live }) => {
    // A board that offers motion has the switches for looking at it.
    await expect(page.locator('#motion')).toBeVisible();
    await live.openOptions('choose');
    await expect(page.locator('.pop .opt')).toHaveCount(3);
    // The picture of a motion stands still: a mark says that it moves.
    await expect(page.locator('.pop .opt[data-option="press"] .opt-moves')).toBeVisible();
    await expect(page.locator('.pop .opt[data-option="cascade"] .opt-moves')).toBeVisible();
    await expect(page.locator('.pop .opt[data-option="keep"] .opt-moves')).toHaveCount(0);
    await expect(page.locator('.pop .opt[data-option="press"]')).toHaveAttribute('aria-label', /Buttons shrink while pressed \(moves:/);

    // Nothing but drawings until the mark is pointed at.
    const note = page.locator('.pop .opt[data-option="press"] .opt-note');
    await expect(note).toBeHidden();
    await page.locator('.pop .opt[data-option="press"] .opt-star').hover();
    await expect(note).toBeVisible();
    await expect(note).toContainText('Nothing answers a press today.');
    await expect(note).toContainText('Not offered');
    await expect(note).toContainText('Hold to confirm Choosing a plan can be undone.');
    await page.locator('.pop .opt[data-option="keep"]').hover();
    await expect(note).toBeHidden();
    // The same note describes the option for a screen reader, and shows when the keyboard reaches it.
    await expect(page.locator('.pop .opt[data-option="press"]')).toHaveAttribute('aria-describedby', 'note-choose');
    await expect(page.locator('.pop .opt[data-option="keep"] .opt-note')).toHaveCount(0);
  });

  test('"Reduced" shows the option as people get it who asked for less motion; "Slow" slows what moves', async ({ page, live }) => {
    const transition = () => live.read('getComputedStyle(document.querySelector("#plans button")).transitionDuration');
    await live.choose('choose', 'press');
    await expect.poll(transition).toBe('0.16s');
    await page.locator('#motion-reduced').click();
    await expect(page.locator('#motion-reduced')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(transition).toBe('0s');
    // The page's own styles are untouched: only what the option adds is shown in its reduced form.
    expect(await live.read('matchMedia("(prefers-reduced-motion: reduce)").matches')).toBe(false);
    await page.locator('#motion-reduced').click();
    await expect.poll(transition).toBe('0.16s');

    // An entrance plays when its option is chosen, and again on "Replay"; "Slow" runs it at a quarter of its speed.
    await live.choose('choose', 'cascade');
    const rates = () => live.read('document.getAnimations().map((a) => a.playbackRate).join(",")');
    await expect.poll(rates).toBe('1,1,1');
    await page.locator('#motion-slow').click();
    await expect.poll(rates).toBe('0.25,0.25,0.25');
    const started = () => live.read('Math.round(Math.min(...document.getAnimations().map((a) => a.currentTime)))');
    await page.waitForTimeout(400);
    const before = (await started()) as number;
    await page.locator('#motion-replay').click();
    await expect.poll(async () => ((await started()) as number) < before).toBe(true); // it started over
    await page.locator('#motion-slow').click();
    await expect.poll(rates).toBe('1,1,1');
  });

  test('a rule the agent proposes waits in History until the person keeps it', async ({ page, live }) => {
    const proposed = await live.project.pe('taste', 'propose', '--rule', 'No motion on buttons that are pressed all day.', '--prefer', 'instant-change', '--over', 'press-scale');
    expect(proposed.stdout).toContain('Proposed rule t1');
    await page.reload();
    await expect(page.locator('.hit').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('#btn-history').click();
    const rule = page.locator('.rule.is-pending');
    await expect(rule).toContainText('No motion on buttons that are pressed all day.');
    await rule.getByRole('button', { name: 'Keep for this project' }).click();
    await expect(page.locator('.rule.is-pending')).toHaveCount(0);
    await expect(page.locator('.rule')).toContainText('In this project');
    expect((await live.project.pe('taste')).stdout).toContain('t1 [kept, this project] No motion on buttons that are pressed all day.');
    // From now on it counts: the next draft carries the mark on what the rule prefers.
    const published = await live.project.json<{ ok: boolean }>('recommend', 'press-feedback');
    expect(JSON.stringify(published)).toContain('Your rule: No motion on buttons that are pressed all day.');
  });
});

sketch.describe('a board without motion', () => {
  sketch('has no switches for it', async ({ page, review }) => {
    void review;
    await plainExpect(page.locator('#viewports')).toBeVisible();
    await plainExpect(page.locator('#motion')).toBeHidden();
    await plainExpect(page.locator('.opt-moves')).toHaveCount(0);
  });
});
