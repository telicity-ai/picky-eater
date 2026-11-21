import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { findBrowser } from '../../src/check/browser.js';
import { approve, readView, setChoices } from '../../src/session/review.js';
import { workspace } from '../../src/session/store.js';
import { makeProject, type Project } from '../helpers/project.js';
import { liveProjectWithSite, startSite, type Site } from '../helpers/site.js';

/**
 * "implement", "check" and "report" drive an installed Chrome, Edge or Chromium. Where there is
 * none these tests are skipped; CI runners have one.
 */
const browser = findBrowser();

/** The person's part, done through the library: choose and approve. The product gives an agent no way to do this. */
async function approveAs(project: Project, session: string, choices: Record<string, string>): Promise<void> {
  const ws = workspace(project.dir);
  const view = readView(ws, session);
  const stamp = { revision: view.revision, digest: view.digest! };
  await setChoices(ws, session, { ...stamp, choices });
  await approve(ws, session, { ...stamp, choices });
}

const replaceIn = (file: string, from: string, to: string) => {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`"${from}" is not in ${file}`);
  writeFileSync(file, text.replace(from, to));
};

describe.skipIf(!browser)('an existing page: measured before, compared after', () => {
  let project: Project;
  let site: Site;
  const CHOICES = { header: 'compact', 'hero-action': 'keep', offer: 'bar', plans: 'featured', 'week-badge': 'keep', 'form-error': 'box' };
  const css = () => join(project.dir, 'site/styles.css');
  const html = () => join(project.dir, 'site/index.html');
  const check = async () => {
    const r = await project.pe('check');
    return { code: r.code, out: r.stdout };
  };

  beforeAll(async () => {
    // One width keeps the test short; both widths are covered by the browser tests of the review page.
    ({ project, site } = await liveProjectWithSite((board) => (board.viewports = [{ id: 'desktop', label: 'Desktop', width: 1280, height: 800 }])));
  }, 60_000);
  afterAll(async () => {
    site.stop();
    await project.cleanup();
  });

  test('nothing can be measured or reported before the person approves', async () => {
    for (const command of ['implement', 'check']) {
      const r = await project.pe(command);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain('NOT_APPROVED');
    }
    expect((await project.pe('report', '--summary', 'done')).stderr).toContain('NOT_APPROVED');
  });

  test('"implement" measures the approved page and says what to build; it is taken once', async () => {
    await approveAs(project, 'harbor', CHOICES);
    expect((await project.pe('check')).stderr).toContain('NO_ANSWER_KEY');
    const first = await project.pe('implement');
    expect(first.code).toBe(0);
    expect(first.stdout).toContain('The approved page is measured: 1 width(s) × 4 moment(s)');
    expect(first.stdout).toContain('plans (Plan cards): featured — The week plan stands out [pricing-table]');
    expect(first.stdout).toContain('source: site/index.html  #plans');
    expect(first.stdout).toContain('week-badge (Label on the week plan): keep');
    expect(first.stdout).not.toContain('billing'); // options that were not chosen are not mentioned
    const dir = join(project.dir, '.picky-eater/sessions/harbor/answer-key/r1-a1');
    expect(readdirSync(dir)).toEqual(expect.arrayContaining(['key.json', 'desktop.top.png', 'desktop.error.png', 'desktop.area.plans.png', 'desktop.area.form-error.png']));
    const key = JSON.parse(readFileSync(join(dir, 'key.json'), 'utf8'));
    // The patches were laid over the page for the measurement: the bar is there, and the error box is measured in its own moment.
    const top = key.views.find((v: { cut: string }) => v.cut === 'top');
    expect(top.areas.find((a: { id: string }) => a.id === 'offer').elements[0].key).toBe('text "Free helmet with every rental this month."');
    expect(top.areas.find((a: { id: string }) => a.id === 'form-error')).toBeUndefined();
    expect(key.views.find((v: { cut: string }) => v.cut === 'error').areas.find((a: { id: string }) => a.id === 'form-error').found).toBe(true);
    // The site itself was not changed by any of this.
    expect(readFileSync(html(), 'utf8')).not.toContain('offer-bar');

    const again = await project.pe('implement');
    expect(again.stdout).toContain('was already measured');
    expect((await project.json<{ answerKey: unknown; check: unknown }>('status')).answerKey).not.toBeNull();
  }, 90_000);

  test('before anything is built, "check" lists what is still to do, cause by cause', async () => {
    const { code, out } = await check();
    expect(code).toBe(20);
    expect(out).toContain('header · desktop · top, plans and 2 more: action "Harbor Bikes" font-size 20px, approved 18px');
    expect(out).toContain('offer · desktop · top, plans and 2 more: text "Free helmet with every rental this month." is missing');
    expect(out).toContain('plans · desktop · top, plans and 2 more: box around heading "Week" box-shadow none, approved yes');
    expect(out).toContain('form-error · desktop · error: text "Tell us your name. Enter an email address, like name@example" padding 0px 0px 0px 0px, approved 12px 14px 12px 14px');
    expect(out).not.toMatch(/line-height|"Harbor Bikes" (size|position)/); // consequences of the font size are not listed
    const refused = await project.pe('report', '--summary', 'Half done');
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('DIFFERENCES');
  }, 90_000);

  test('built as approved, the page matches', async () => {
    replaceIn(css(), '  padding: 22px max(24px, calc((100vw - 1040px) / 2));\n  background: var(--paper);', '  padding: 10px max(24px, calc((100vw - 1040px) / 2));\n  background: var(--paper);');
    replaceIn(css(), '  padding-block: 10px;\n  box-shadow: 0 1px 0 var(--line)', '  padding-block: 6px;\n  box-shadow: 0 1px 0 var(--line)');
    replaceIn(css(), '.brand {\n  color: var(--ink);\n  font-size: 20px;', '.brand {\n  color: var(--ink);\n  font-size: 18px;');
    replaceIn(css(), '.site-header nav a {\n  color: var(--muted);', '.site-header nav a {\n  color: var(--muted);\n  font-size: 15px;');
    replaceIn(css(), '.offer {\n  margin: 20px 0 0;\n  color: var(--sea);\n  font-weight: 600;\n}', '.offer-bar {\n  margin: 0;\n  padding: 8px 16px;\n  background: var(--sun);\n  color: var(--ink);\n  font-weight: 700;\n  text-align: center;\n}');
    replaceIn(css(), '.plan.is-picked {', '.plan--week {\n  border-color: var(--sea);\n  box-shadow: 0 10px 30px rgba(20, 33, 61, 0.14);\n  transform: translateY(-8px);\n}\n.plan--week button {\n  background: var(--sea);\n}\n.plan.is-picked {');
    replaceIn(css(), '.form-error {\n  margin: 4px 0 0;', '.form-error {\n  margin: 0 0 8px;\n  padding: 12px 14px;\n  border: 1px solid #e7b4af;\n  border-left: 4px solid #b3261e;\n  border-radius: 10px;\n  background: #fdecea;');
    replaceIn(html(), '  <body>\n', '  <body>\n    <p class="offer-bar">Free helmet with every rental this month.</p>\n');
    replaceIn(html(), '        <p class="offer" id="offer">Free helmet with every rental.</p>\n', '');
    replaceIn(html(), '          <p class="form-error" role="alert" hidden></p>\n', '');
    replaceIn(html(), '        <form novalidate>\n', '        <form novalidate>\n          <p class="form-error" role="alert" hidden></p>\n');

    const { code, out } = await check();
    expect(out).toContain('The built page matches the approved one.');
    expect(code).toBe(0);
  }, 90_000);

  test('a planted deviation of each kind is found: size, colour, position, a missing state', async () => {
    const restore = [css(), html(), join(project.dir, 'site/app.js')].map((file) => [file, readFileSync(file, 'utf8')] as const);
    const undo = () => restore.forEach(([file, text]) => writeFileSync(file, text));

    replaceIn(css(), '.brand {\n  color: var(--ink);\n  font-size: 18px;', '.brand {\n  color: var(--ink);\n  font-size: 23px;');
    expect((await check()).out).toContain('action "Harbor Bikes" font-size 23px, approved 18px');
    undo();

    replaceIn(css(), '  background: var(--sun);\n  color: var(--ink);\n  font-weight: 700;', '  background: #eeeeee;\n  color: var(--ink);\n  font-weight: 700;');
    expect((await check()).out).toContain('text "Free helmet with every rental this month." background-color rgb(238, 238, 238), approved rgb(252, 163, 17)');
    undo();

    replaceIn(css(), '.cta,\nbutton {\n  display: inline-block;', '.cta {\n  margin-left: 48px;\n}\n.cta,\nbutton {\n  display: inline-block;');
    expect((await check()).out).toMatch(/hero-action · desktop · [^:]*: action "See plans" position 168, [\d.]+px, approved 120, [\d.]+px/);
    undo();

    // A background picture is not among the measured styles; the picture of the area gives it away, also far down the page.
    replaceIn(css(), '  background: #fdecea;', '  background: #fdecea repeating-linear-gradient(45deg, #b3261e 0 6px, transparent 6px 12px);');
    expect((await check()).out).toMatch(/form-error · desktop · error: the picture differs in \d+\.\d% of its pixels/);
    undo();

    // The page no longer shows the error message: that moment of the approved page does not exist in the built one.
    replaceIn(join(project.dir, 'site/app.js'), '    error.hidden = false;\n', '');
    const missing = await check();
    expect(missing.code).toBe(20);
    expect(missing.out).toContain('form-error · desktop · error: the area is missing (approved: on the page)');
    undo();
  }, 180_000);

  test('"report" records the result, with deviations only when they are named', async () => {
    expect((await check()).code).toBe(0);
    const ok = await project.pe('report', '--summary', 'Compact header, offer bar, featured week plan, error box.');
    expect(ok.stdout).toContain('Recorded: built as approved (r1-a1');
    const status = await project.json<{ check: { ok: boolean }; report: { ok: boolean; deviations: string[] } }>('status');
    expect(status.check.ok).toBe(true);
    expect(status.report).toMatchObject({ ok: true, deviations: [] });

    replaceIn(css(), '.brand {\n  color: var(--ink);\n  font-size: 18px;', '.brand {\n  color: var(--ink);\n  font-size: 19.5px;');
    expect((await check()).code).toBe(20);
    expect((await project.pe('report', '--summary', 'x')).stderr).toContain('DIFFERENCES');
    const declared = await project.pe('report', '--summary', 'As approved, except the logo.', '--deviation', 'header: the logo is 19.5px to match the design tokens', '--deviation', 'header: second reason');
    expect(declared.stdout).toContain('built with 2 declared deviation(s)');
    const report = JSON.parse(readFileSync(join(project.dir, '.picky-eater/sessions/harbor/report.json'), 'utf8'));
    expect(report).toMatchObject({ ok: false, deviations: ['header: the logo is 19.5px to match the design tokens', 'header: second reason'] });
  }, 120_000);
});

describe.skipIf(!browser)('a new screen: the mockup is the answer key', () => {
  let project: Project;
  let site: Site;
  const session = () => join(project.dir, '.picky-eater/sessions/join');
  const STYLES = 'body{margin:0;font:16px/1.5 Arial,sans-serif;color:#112}.card{margin:40px;padding:24px;border-radius:12px;background:#eef}.card h1{margin:0 0 8px;font-size:32px}.card button{padding:10px 16px;border:0;border-radius:8px;background:#124;color:#fff;font:inherit}.thanks{color:#060;font-weight:700}';

  beforeAll(async () => {
    project = makeProject();
    const draft = join(project.dir, 'draft');
    mkdirSync(draft);
    writeFileSync(
      join(draft, 'board.json'),
      JSON.stringify({
        schema: 'picky-eater/board',
        schemaVersion: '2.0',
        title: 'Join the list',
        base: { kind: 'sketch', frame: 'frame.html', styles: ['styles.css'] },
        viewports: [{ id: 'desktop', label: 'Desktop', width: 1000, height: 700 }],
        areas: [{ id: 'card', label: 'Sign-up card', options: [{ id: 'plain', label: 'Plain', html: 'plain.html', suggested: true }, { id: 'loud', label: 'Loud', html: 'loud.html' }] }],
        cuts: [{ id: 'top', label: 'Top' }, { id: 'done', label: 'Joined' }],
      }),
    );
    writeFileSync(join(draft, 'frame.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Join</title></head><body><main><section data-pe-area="card"></section></main></body></html>');
    writeFileSync(join(draft, 'styles.css'), STYLES);
    writeFileSync(join(draft, 'plain.html'), '<div class="card"><h1>Join the list</h1><p data-pe-not="done">One email a month.</p><button type="button" data-pe-go="done" data-pe-not="done">Join</button><p class="thanks" data-pe-in="done">You are on the list.</p></div>');
    writeFileSync(join(draft, 'loud.html'), '<div class="card"><h1>JOIN NOW</h1><button type="button" data-pe-go="done">Join</button></div>');
    expect((await project.pe('new', '--title', 'Join the list', '--id', 'join', '--from', draft)).code).toBe(0);
    expect((await project.pe('propose')).code).toBe(0);
    await approveAs(project, 'join', { card: 'plain' });

    // What an agent would build from it: its own markup, a script for the second moment.
    const built = join(project.dir, 'public');
    mkdirSync(built);
    writeFileSync(join(built, 'styles.css'), `${STYLES}[hidden]{display:none}`);
    writeFileSync(
      join(built, 'index.html'),
      '<!doctype html><html><head><meta charset="utf-8"><title>Join</title><link rel="stylesheet" href="/styles.css"></head><body><main><article class="card" id="join"><h1>Join the list</h1><p id="blurb">One email a month.</p><button type="button" id="go">Join</button><p class="thanks" id="thanks" hidden>You are on the <span id="which">list</span>.</p></article></main><script src="/app.js"></script></body></html>',
    );
    writeFileSync(join(built, 'app.js'), "document.getElementById('go').addEventListener('click', () => { document.getElementById('blurb').hidden = true; document.getElementById('go').hidden = true; document.getElementById('thanks').hidden = false; });");
    site = await startSite({ plain: true, dir: built });
  }, 60_000);
  afterAll(async () => {
    site.stop();
    await project.cleanup();
  });

  test('"implement" measures the composed mockup and asks for a map of the built page', async () => {
    const r = await project.pe('implement');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('card (Sign-up card): plain — Plain');
    expect(r.stdout).toContain('mockup: .picky-eater/sessions/join/revisions/r1/plain.html');
    expect(r.stdout).toContain('.picky-eater/sessions/join/built.json');
    expect(r.stdout).toContain('need "steps" (scroll, fill, click, wait): done (Joined)');
    const key = JSON.parse(readFileSync(join(session(), 'answer-key/r1-a1/key.json'), 'utf8'));
    expect(key.kind).toBe('sketch');
    const keys = (cut: string) => key.views.find((v: { cut: string }) => v.cut === cut).areas[0].elements.map((e: { key: string }) => e.key);
    expect(keys('top')).toEqual(['box around heading "Join the list"', 'heading "Join the list"', 'text "One email a month."', 'action "Join"']);
    expect(keys('done')).toEqual(['box around heading "Join the list"', 'heading "Join the list"', 'text "You are on the list."']);
    expect(existsSync(join(session(), 'answer-key/r1-a1/desktop.area.card.png'))).toBe(true);
  }, 60_000);

  test('"check" needs to know where the built page is and which element is which area', async () => {
    expect((await project.pe('check')).stderr).toContain('NO_BUILT_URL');
    writeFileSync(join(session(), 'built.json'), JSON.stringify({ url: `${site.origin}/` }));
    expect((await project.pe('check')).stderr).toContain('built.json does not say which element implements: card');
    writeFileSync(join(session(), 'built.json'), JSON.stringify({ url: 'https://example.com/', areas: { card: '#join' } }));
    expect((await project.pe('check')).stderr).toContain('INVALID_BUILT');
  });

  // The built page wraps a word of the last sentence in a span, as code that fills in a value does. It is still that sentence.
  test('other markup, same page: it matches, in both moments', async () => {
    writeFileSync(join(session(), 'built.json'), JSON.stringify({ url: `${site.origin}/`, areas: { card: '#join' }, cuts: { done: { steps: [{ click: '#go' }] } } }));
    const r = await project.pe('check');
    expect(r.stdout).toContain('The built page matches the approved one.');
    expect(r.code).toBe(0);
  }, 60_000);

  test('a moment that cannot be reached, and a difference only a picture shows', async () => {
    writeFileSync(join(session(), 'built.json'), JSON.stringify({ url: `${site.origin}/`, areas: { card: '#join' }, cuts: { done: { steps: [{ click: '#no-such-button' }] } } }));
    const unreachable = await project.pe('check');
    expect(unreachable.code).toBe(20);
    expect(unreachable.stdout).toContain('page · desktop · done: this moment could not be reached on the built page ("#no-such-button" did not appear on the page)');

    writeFileSync(join(session(), 'built.json'), JSON.stringify({ url: `${site.origin}/`, areas: { card: '#join' }, cuts: { done: { steps: [{ click: '#go' }] } } }));
    // A background picture is not among the measured styles; only the picture of the area gives it away.
    const styles = join(project.dir, 'public/styles.css');
    writeFileSync(styles, `${readFileSync(styles, 'utf8')}.card{background-image:repeating-linear-gradient(45deg,#c00 0 12px,transparent 12px 24px)}`);
    const painted = await project.pe('check');
    expect(painted.code).toBe(20);
    expect(painted.stdout).toMatch(/card · desktop · top: the picture differs in \d+\.\d% of its pixels \(allowed: 3\.0%\)/);
  }, 90_000);
});
