import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { findBrowser } from '../../src/check/browser.js';
import { approve, readView, setChoices } from '../../src/session/review.js';
import { workspace } from '../../src/session/store.js';
import type { Project } from '../helpers/project.js';
import { liveProjectWithSite, type Site } from '../helpers/site.js';

/**
 * Motion on a running page, from the first look to the comparison: what the page is like, what
 * is offered, and whether what was built moves as approved, also for people who asked for less.
 */
const browser = findBrowser();
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const PRESS = `#plans button{transition:transform 160ms ${EASE}}#plans button:active{transform:scale(0.97)}@media (prefers-reduced-motion: reduce){#plans button{transition:none}#plans button:active{transform:none}}`;

describe.skipIf(!browser)('motion on a running page', () => {
  let project: Project;
  let site: Site;
  const css = () => join(project.dir, 'site/styles.css');
  const build = (rules: string) => writeFileSync(css(), `${original}\n${rules}\n`);
  let original = '';
  const check = async () => {
    const r = await project.pe('check');
    return { code: r.code, out: r.stdout };
  };

  beforeAll(async () => {
    ({ project, site } = await liveProjectWithSite((board) => {
      board.viewports = [{ id: 'desktop', label: 'Desktop', width: 1280, height: 800 }];
      board.cuts = [{ id: 'top', label: 'Top' }];
      board.areas = [
        {
          id: 'choose',
          label: 'Choose buttons',
          anchor: '#plans',
          source: { file: 'site/styles.css', selector: 'button' },
          decision: 'press-feedback',
          rejected: [{ pattern: 'hold-to-confirm', why: 'Choosing a plan can be undone.' }],
          options: [
            { id: 'keep', label: 'Nothing moves on a press', keep: true, pattern: 'instant-change' },
            { id: 'press', label: 'Buttons shrink while pressed', pattern: 'press-scale', suggested: true, because: 'Nothing answers a press today.', patch: [{ css: PRESS }], build: `styles.css: #plans button scales to 0.97 while pressed, 160 ms ${EASE}; no scale under reduced motion.` },
          ],
        },
      ];
    }));
    original = readFileSync(css(), 'utf8');
  }, 60_000);
  afterAll(async () => {
    site.stop();
    await project.cleanup();
  });

  test('"inspect --profile" says what kind of page it is, what moves on it and where something changes', async () => {
    const out = (await project.pe('inspect', '--profile')).stdout;
    expect(out).toContain('Kind of page: ');
    expect(out).toMatch(/Moves today: \d+ element\(s\) with a transition/);
    expect(out).toMatch(/press {2}\S+ \(\d+\) {2}"[^"]+" {2}— nothing answers a press/);
    const json = await project.json<{ surface: string; moments: Array<{ kind: string; answered: boolean }>; motion: { reducedRules: number } }>('inspect', '--profile');
    expect(json.moments.some((m) => m.kind === 'press' && !m.answered)).toBe(true);
    expect(json.motion.reducedRules).toBeGreaterThan(0); // the example site has a rule for reduced motion
  });

  test('"recommend" turns the moments into decisions with their candidates', async () => {
    const out = (await project.pe('recommend')).stdout;
    expect(out).toContain('decision: press-feedback — Answer a press on a button');
    expect(out).toContain('offer  press-scale — ');
    expect(out).toContain('Write each as an area');
    const often = (await project.pe('recommend', '--frequency', 'frequent')).stdout;
    expect(often).toContain('leave out  hold-to-confirm — This moment is met often; this motion is right only up to occasional use.');
  });

  test('the board with a motion option is valid as it is', async () => {
    const r = await project.pe('validate');
    expect(r.stdout).toContain('The draft is valid.');
    expect(r.stdout).not.toContain('warning');
  });

  test('what moves is part of the answer key, with what people get who asked for less motion', async () => {
    const ws = workspace(project.dir);
    const view = readView(ws, 'harbor');
    const stamp = { revision: view.revision, digest: view.digest! };
    await setChoices(ws, 'harbor', { ...stamp, choices: { choose: 'press' } });
    await approve(ws, 'harbor', { ...stamp, choices: { choose: 'press' } });
    expect((await project.pe('implement')).code).toBe(0);
    const key = JSON.parse(readFileSync(join(project.dir, '.picky-eater/sessions/harbor/answer-key/r1-a1/key.json'), 'utf8'));
    const area = key.views[0].areas.find((a: { id: string }) => a.id === 'choose');
    expect(area.motion).toEqual([{ on: 'transform', ms: 160, delay: 0, easing: EASE }]);
    expect(area.reduced).toEqual([]);
  }, 90_000);

  test('before it is built, the missing motion is one line', async () => {
    const { code, out } = await check();
    expect(code).toBe(20);
    expect(out).toContain(`choose · desktop · top: approved: transform 160 ms ${EASE}. The built page does not have it`);
  }, 90_000);

  test('built slower, or without an answer for reduced motion, it is told apart from what was approved', async () => {
    build(`#plans button { transition: transform 400ms ${EASE}; }\n#plans button:active { transform: scale(0.97); }`);
    const { code, out } = await check();
    expect(code).toBe(20);
    expect(out).toContain(`choose · desktop · top: moves as transform 400 ms ${EASE}, approved transform 160 ms ${EASE}`);
    expect(out).toContain(`choose · desktop · top: the built page has with reduced motion: transform 400 ms ${EASE}. That was not approved`);
  }, 90_000);

  test('built as approved, it matches', async () => {
    build(`#plans button { transition: transform 160ms ${EASE}; }\n#plans button:active { transform: scale(0.97); }\n@media (prefers-reduced-motion: reduce) {\n  #plans button { transition: none; }\n  #plans button:active { transform: none; }\n}`);
    const { code, out } = await check();
    expect(out).toContain('The built page matches the approved one.');
    expect(code).toBe(0);
  }, 90_000);
});
