import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { findBrowser } from '../../src/check/browser.js';
import { fileFromAddress } from '../../src/stage/framework.js';
import { makeProject, type Project } from '../helpers/project.js';
import { liveProject, startSite, type Site } from '../helpers/site.js';

/**
 * Looking at the running page from the command line ("inspect", and the page check of
 * "validate"). Both drive an installed Chrome, Edge or Chromium; where there is none these tests
 * are skipped. Component and source lookups against real frameworks are run by tests/stacks.
 */
const browser = findBrowser();

describe('source files as a running page names them', () => {
  test('addresses of development servers become paths', () => {
    expect(fileFromAddress('http://127.0.0.1:5173/src/pages/Settings.tsx?t=1730000000')).toBe('/src/pages/Settings.tsx');
    expect(fileFromAddress('http://localhost:5173/@fs/Users/me/app/src/Hero.vue')).toBe('/Users/me/app/src/Hero.vue');
    expect(fileFromAddress('webpack-internal:///(app-pages-browser)/./app/page.tsx')).toBe('app/page.tsx');
    expect(fileFromAddress('webpack://_N_E/./src/Hero.jsx')).toBe('src/Hero.jsx');
  });
  test('what is not the project\'s own source is not a source', () => {
    expect(fileFromAddress('http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1')).toBeUndefined();
    expect(fileFromAddress('http://localhost:3000/_next/static/chunks/app_page_tsx_1a2b._.js')).toBeUndefined();
    expect(fileFromAddress('http://localhost:5173/@vite/client')).toBeUndefined();
    expect(fileFromAddress('http://localhost:5173/')).toBeUndefined();
    // A server component's stack names the chunk the server ran, not the file it was written in.
    expect(fileFromAddress('file:///Users/me/app/.next/dev/server/chunks/ssr/%5Broot-of-the-server%5D__1a2b._.js')).toBeUndefined();
    expect(fileFromAddress('file:///Users/me/app/src/Hero.astro')).toBe('/Users/me/app/src/Hero.astro');
  });
});

describe.skipIf(!browser)('the running page, from the command line', () => {
  let site: Site;
  let project: Project;
  beforeAll(async () => {
    site = await startSite();
    project = await liveProject(site.origin);
  }, 60_000);
  afterAll(async () => {
    site.stop();
    await project.cleanup();
  });

  test('"inspect" maps the page: its parts, each with a selector that finds exactly it', async () => {
    const r = await project.json<{ url: string; found: Array<{ selector: string; count: number; text: string; w: number; h: number; depth: number }> }>('inspect', '--url', `${site.origin}/`);
    expect(r.url).toBe(`${site.origin}/`);
    const selectors = r.found.map((f) => f.selector);
    expect(selectors).toEqual(expect.arrayContaining(['.site-header', '.hero', '#plans', '#signup']));
    for (const f of r.found) {
      expect(f.count).toBe(1);
      expect(f.w).toBeGreaterThan(0);
      expect(f.h).toBeGreaterThan(0);
    }
    // Parts inside parts are indented under them.
    expect(r.found.find((f) => f.selector === '.site-header')!.depth).toBeLessThan(r.found.find((f) => f.selector.includes('nav'))!.depth);
    // Without --url it looks at the page of the session's draft.
    const text = (await project.pe('inspect')).stdout;
    expect(text.split('\n')[0]).toBe(`${site.origin}/`);
    expect(text).toContain('#plans  "Plans"');
  });

  test('"inspect" with selectors says what each one finds', async () => {
    const r = await project.json<{ found: Array<{ selector: string; count: number; tag?: string; text?: string; error?: string }> }>('inspect', '--url', `${site.origin}/`, '.plan', '#signup form', '.no-such-thing', 'p:::');
    expect(r.found.map((f) => [f.selector, f.count])).toEqual([['.plan', 3], ['#signup form', 1], ['.no-such-thing', 0], ['p:::', 0]]);
    expect(r.found[0]!.tag).toBe('article');
    expect(r.found[3]!.error).toBe('not a valid selector');
    const text = (await project.pe('inspect', '--url', `${site.origin}/`, '.plan', '.no-such-thing')).stdout;
    expect(text).toContain('.plan (3 matches; the first)');
    expect(text).toContain('.no-such-thing: matches nothing');
  });

  test('"inspect" refuses a page that is not on this machine, and says so when nothing answers', async () => {
    const remote = await project.pe('inspect', '--url', 'https://example.org/');
    expect(remote.code).toBe(1);
    expect(remote.stderr).toContain('USAGE');
    const dead = await project.pe('inspect', '--url', 'http://127.0.0.1:59998/');
    expect(dead.code).toBe(1);
    expect(dead.stderr).toContain('Is the development server running?');
  });

  test('"validate" holds the board against the running page: the example fits', async () => {
    const v = await project.json<{ ok: boolean; issues: Array<{ code: string }>; onPage: { checked: boolean; areas: Record<string, unknown> } }>('validate');
    expect(v.ok).toBe(true);
    expect(v.onPage.checked).toBe(true);
    expect(v.issues.filter((i) => i.code.startsWith('PAGE_'))).toEqual([]);
    expect((await project.pe('validate')).stdout).toContain(`page: ${site.origin}/ (checked on the running page)`);
  });

  test('"validate" names what does not fit: an anchor, a patch target, a cut that cannot be reached, a mark', async () => {
    const file = join(project.draft('harbor'), 'board.json');
    const original = readFileSync(file, 'utf8');
    const board = JSON.parse(original);
    board.areas[0].anchor = '.site-heder';
    board.areas[3].options[2].patch = [{ move: '.plan--year', before: '.plan--day' }];
    board.cuts[1].at = '#plans-section';
    board.cuts[2].steps = [{ click: '#no-such-button' }];
    writeFileSync(file, JSON.stringify(board, null, 2));
    try {
      const v = await project.json<{ ok: boolean; issues: Array<{ level: string; code: string; message: string }> }>('validate');
      // Warnings, not errors: the page is opened without the person's login, so it may simply look different there.
      expect(v.ok).toBe(true);
      const page = v.issues.filter((i) => i.code.startsWith('PAGE_'));
      expect(page.every((i) => i.level === 'warning')).toBe(true);
      expect(page.map((i) => i.code).sort()).toEqual(['PAGE_ANCHOR', 'PAGE_CUT', 'PAGE_STEPS', 'PAGE_TARGET']);
      expect(page.find((i) => i.code === 'PAGE_ANCHOR')!.message).toContain('".site-heder" matches nothing on the running page');
      expect(page.find((i) => i.code === 'PAGE_TARGET')!.message).toContain('option "week-first": ".plan--year" matches nothing inside the anchor');
      expect(page.find((i) => i.code === 'PAGE_CUT')!.message).toContain('"#plans-section"');
      expect(page.find((i) => i.code === 'PAGE_STEPS')!.message).toContain('"#no-such-button" did not appear');
      // The page can be left out of it.
      const offline = await project.json<{ issues: Array<{ code: string }>; onPage?: unknown }>('validate', '--no-page');
      expect(offline.issues.filter((i) => i.code.startsWith('PAGE_'))).toEqual([]);
      expect(offline.onPage).toBeUndefined();
    } finally {
      writeFileSync(file, original);
    }
  });

  test('an area that depends on the choice of another is looked at with that choice in place', async () => {
    const file = join(project.draft('harbor'), 'board.json');
    const original = readFileSync(file, 'utf8');
    const board = JSON.parse(original);
    // The label area now sits on an element that only the "billing" option of the plans adds.
    const badge = board.areas.find((a: { id: string }) => a.id === 'week-badge');
    badge.when = { plans: ['billing'] };
    badge.anchor = '#plans .billing';
    badge.options[1].patch = [{ css: '#plans .billing{outline:2px solid}' }];
    writeFileSync(file, JSON.stringify(board, null, 2));
    try {
      const v = await project.json<{ ok: boolean; issues: Array<{ code: string; message: string }> }>('validate');
      expect(v.issues.filter((i) => i.code.startsWith('PAGE_')).map((i) => i.message)).toEqual([]);
    } finally {
      writeFileSync(file, original);
    }
  });
});

describe.skipIf(!browser)('a page that does not answer', () => {
  test('"validate" still checks the draft and says that the page was not looked at', async () => {
    const project = await liveProject('http://127.0.0.1:59998');
    try {
      const v = await project.json<{ ok: boolean; onPage: { checked: boolean; why: string } }>('validate');
      expect(v.ok).toBe(true);
      expect(v.onPage.checked).toBe(false);
      expect(v.onPage.why).toContain('Is the development server running?');
    } finally {
      await project.cleanup();
    }
  });
});

describe.skipIf(!browser)('a page that draws itself after it opens', () => {
  let site: Site;
  let project: Project;
  beforeAll(async () => {
    site = await startSite({ dir: resolve('tests/e2e/pages/rerender') });
    project = makeProject();
  }, 60_000);
  afterAll(async () => {
    site.stop();
    await project.cleanup();
  });

  test('"validate" finds the anchors of a page that is built by script, and plays the steps of its cuts', async () => {
    const board = JSON.parse(readFileSync(resolve('tests/stacks/board.json'), 'utf8'));
    board.base.url = `${site.origin}/?dom=refs`;
    expect((await project.pe('new', '--title', 'Trailhead', '--id', 'trailhead')).code).toBe(0);
    writeFileSync(join(project.draft('trailhead'), 'board.json'), JSON.stringify(board, null, 2));
    const v = await project.json<{ ok: boolean; issues: Array<{ code: string; message: string }>; onPage: { checked: boolean } }>('validate');
    expect(v.onPage.checked).toBe(true);
    // The board names no sources and this page has no framework to ask, so nothing is said about them here.
    expect(v.issues.filter((i) => i.code.startsWith('PAGE_')).map((i) => i.message)).toEqual([]);
  });
});
