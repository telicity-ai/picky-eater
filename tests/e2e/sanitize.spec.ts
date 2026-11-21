import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exampleProject, type Project } from '../helpers/project.js';

/**
 * "validate" refuses unsafe mockups, but the page must stay inert even if a revision gets past
 * it. These tests plant hostile markup directly in a published revision (with matching hashes,
 * as someone who edited the files by hand would) and look at what the browser ends up with.
 */

const HOSTILE = `<div class="hero">
  <h1 id="h">Hostile</h1>
  <script>parent.__pwned = 1; window.__pwned = 1;</script>
  <img id="i1" src="missing.png" onerror="parent.__pwned = 2">
  <img id="i2" src="https://example.invalid/track.png">
  <img id="i3" srcset="https://example.invalid/a.png 2x">
  <a id="a1" href="https://example.invalid/">out</a>
  <a id="a2" href="javascript:parent.__pwned=3">js</a>
  <a id="a3" href="#schedule">in</a>
  <iframe id="f" src="https://example.invalid/"></iframe>
  <form id="fm" action="https://example.invalid/post"><button id="b" formaction="https://example.invalid/x">go</button></form>
  <svg><script>parent.__pwned = 4</script><a id="a4" xlink:href="javascript:parent.__pwned=5"><text>x</text></a></svg>
  <div id="s" style="background:url(https://example.invalid/bg.png)" onclick="parent.__pwned = 7">s</div>
  <style id="st">@import url(https://example.invalid/a.css); #h{background:url(https://example.invalid/h.png)}</style>
  <meta http-equiv="refresh" content="0;url=https://example.invalid/">
  <base href="https://example.invalid/">
  <object data="https://example.invalid/o"></object>
  <embed src="https://example.invalid/e">
  <link rel="stylesheet" href="https://example.invalid/l.css">
  <math><mtext><script>parent.__pwned = 6</script></mtext></math>
</div>`;

let project: Project;
test.afterEach(() => project?.cleanup());

test('a revision with hostile markup is drawn inert', async ({ page }) => {
  project = await exampleProject();
  const dir = join(project.dir, '.picky-eater/sessions/workshop/revisions/r1');
  writeFileSync(join(dir, 'areas/hero/split.html'), HOSTILE);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  manifest.files['areas/hero/split.html'] = createHash('sha256').update(HOSTILE).digest('hex');
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));

  const outside: string[] = [];
  page.on('request', (r) => r.url().includes('example.invalid') && outside.push(r.url()));
  const { link } = await project.json<{ link: string }>('preview');
  await page.goto(link);

  // Draw it everywhere it can appear: in the options, as a preview and as the chosen option.
  await page.locator('.hit[data-area="hero"]').hover();
  await expect(page.locator('.pop .opt .mini.is-ready')).toHaveCount(3);
  await page.locator('.pop .opt[data-option="split"]').click();
  const mock = page.frameLocator('iframe.frame-page');
  await expect(mock.locator('#h')).toHaveText('Hostile');
  await page.waitForTimeout(300);

  const found = await page.evaluate(() => {
    const doc = document.querySelector<HTMLIFrameElement>('iframe.frame-page')!.contentDocument!;
    const attr = (id: string, name: string) => doc.getElementById(id)?.getAttribute(name) ?? null;
    return {
      pwned: (window as unknown as { __pwned?: number }).__pwned ?? null,
      elements: ['script', 'iframe', 'object', 'embed', 'base', 'link', 'meta[http-equiv="refresh"]'].filter((s) => doc.querySelector(`[data-pe-area="hero"] ${s}`)),
      handlers: Array.from(doc.querySelectorAll('[data-pe-area="hero"] *')).flatMap((el) => Array.from(el.attributes).filter((a) => a.name.startsWith('on')).map((a) => a.name)),
      i1: attr('i1', 'src'),
      i2: attr('i2', 'src'),
      i3: attr('i3', 'srcset'),
      a1: attr('a1', 'href'),
      a2: attr('a2', 'href'),
      a3: attr('a3', 'href'),
      a4: attr('a4', 'xlink:href'),
      action: attr('fm', 'action'),
      formaction: attr('b', 'formaction'),
      style: attr('s', 'style'),
      sheet: doc.getElementById('st')?.textContent ?? null,
    };
  });
  expect(found).toEqual({
    pwned: null,
    elements: [],
    handlers: [],
    i1: null,
    i2: null,
    i3: null,
    a1: null,
    a2: null,
    a3: '#schedule',
    a4: null,
    action: null,
    formaction: null,
    style: expect.not.stringContaining('example.invalid'),
    sheet: expect.not.stringContaining('example.invalid'),
  });
  expect(outside).toEqual([]);
});

test('a revision whose files were changed without updating the hashes is not shown', async ({ page }) => {
  project = await exampleProject();
  const file = join(project.dir, '.picky-eater/sessions/workshop/revisions/r1/areas/hero/split.html');
  writeFileSync(file, readFileSync(file, 'utf8') + '<p>added later</p>');
  const { link } = await project.json<{ link: string }>('preview');
  await page.goto(link);
  await expect(page.locator('#message')).toBeVisible();
  await expect(page.locator('iframe.frame-page')).toHaveCount(0); // nothing of it is drawn
});
