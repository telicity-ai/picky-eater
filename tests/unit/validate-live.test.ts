import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { activeAreas, missingChoices } from '../../src/core/graph.js';
import { parseCatalog } from '../../src/catalog/catalog.js';
import { readCatalogDir } from '../../src/catalog/load.js';
import { validateDraft } from '../../src/core/validate.js';
import { LIVE_EXAMPLE } from '../helpers/project.js';

const none = { text: () => null, size: () => null };

const board = (): Record<string, any> => ({
  schema: 'picky-eater/board',
  schemaVersion: '2.0',
  title: 'Pricing',
  base: { kind: 'live', url: 'http://localhost:5173/pricing' },
  areas: [
    {
      id: 'plans',
      label: 'Plan cards',
      anchor: '.plans',
      source: { file: 'src/pricing.html', selector: '.plans' },
      options: [
        { id: 'keep', label: 'As it is now', keep: true },
        { id: 'wide', label: 'Wider cards', suggested: true, patch: [{ css: '.plans{gap:32px}' }] },
      ],
    },
  ],
  cuts: [{ id: 'top', label: 'Top' }],
});

const run = (b: Record<string, any>, opts = {}) => validateDraft(b, none, opts);
const codes = (b: Record<string, any>, level: 'error' | 'warning' = 'error') =>
  run(b)
    .issues.filter((i) => i.level === level)
    .map((i) => i.code);
const withPatch = (patch: unknown[], extra: Record<string, unknown> = {}) => {
  const b = board();
  b.areas[0].options[1] = { id: 'wide', label: 'Wider cards', suggested: true, patch, ...extra };
  return b;
};

describe('boards over an existing page', () => {
  test('the example board is valid and needs no files', () => {
    const json = JSON.parse(readFileSync(`${LIVE_EXAMPLE}/board/board.json`, 'utf8'));
    const result = validateDraft(json, none, { projectFile: (p) => (p === 'site/index.html' ? readFileSync(`${LIVE_EXAMPLE}/site/index.html`, 'utf8') : null) });
    expect(result.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(result.issues.map((i) => i.code)).toEqual(['APPROXIMATE']); // the one option that needs a script
    expect(result.files).toEqual([]);
  });

  test('a minimal board passes', () => {
    expect(run(board()).ok).toBe(true);
  });

  test('only a development server on this machine can be the page', () => {
    for (const url of ['https://example.com/', 'http://example.com:80/', 'http://192.168.0.4:3000/', 'file:///etc/passwd', 'http://localhost/']) {
      const b = board();
      b.base.url = url;
      expect(codes(b), url).toEqual(['BOARD_SCHEMA']);
    }
  });

  test('every area needs an anchor and exactly one "keep" option', () => {
    const noAnchor = board();
    delete noAnchor.areas[0].anchor;
    expect(codes(noAnchor)).toContain('AREA_ANCHOR');

    const noKeep = board();
    noKeep.areas[0].options[0] = { id: 'narrow', label: 'Narrow', patch: [{ css: '.plans{gap:4px}' }] };
    expect(codes(noKeep)).toEqual(['KEEP_OPTION']);

    const both = board();
    both.areas[0].options[1].keep = true;
    expect(codes(both)).toEqual(expect.arrayContaining(['KEEP_OPTION', 'OPTION_PATCH']));
  });

  test('parts that belong to new screens are refused', () => {
    const b = board();
    b.areas[0].sketch = 'sketch.html';
    b.areas[0].options[1] = { id: 'wide', label: 'Wide', html: 'wide.html', patch: [{ css: 'a{}' }] };
    b.cuts.push({ id: 'filled', label: 'Filled', steps: [{ click: 'button' }], fill: { '#a': 'x' } });
    expect(codes(b)).toEqual(expect.arrayContaining(['AREA_SKETCH_ONLY', 'OPTION_SKETCH_ONLY', 'CUT_SKETCH_ONLY']));
  });

  test('a cut says how it is reached', () => {
    const b = board();
    b.cuts.push({ id: 'error', label: 'Error' }, { id: 'low', label: 'Lower', sameAs: 'top' });
    expect(codes(b)).toEqual(['CUT_STEPS', 'CUT_AT']);
    const fine = board();
    fine.cuts.push({ id: 'error', label: 'Error', steps: [{ click: 'form button' }] });
    expect(codes(fine)).toEqual([]);
    expect(codes(fine, 'warning')).toContain('CUT_SEEN');
    const first = board();
    first.cuts[0].steps = [{ click: 'a' }];
    expect(codes(first)).toEqual(['CUT_ORDER']);
  });

  test('patches cannot carry code or reach the network', () => {
    expect(codes(withPatch([{ css: '@import url(https://evil.example/x.css);' }]))).toEqual(expect.arrayContaining(['CSS_IMPORT']));
    expect(codes(withPatch([{ css: '.a{background:url(https://evil.example/p.png)}' }]))).toEqual(['CSS_REMOTE_URL']);
    expect(codes(withPatch([{ css: '.a{background:url(/img/own.png)}' }]))).toEqual([]);
    expect(codes(withPatch([{ insert: '<script>alert(1)</script>', into: '.plans' }]))).toEqual(expect.arrayContaining(['SCRIPT']));
    expect(codes(withPatch([{ insert: '<img src="/x.png" onerror="alert(1)">', into: '.plans' }]))).toEqual(['EVENT_HANDLER']);
    expect(codes(withPatch([{ insert: '<img src="https://evil.example/x.png">', into: '.plans' }]))).toEqual(['REMOTE_URL']);
    expect(codes(withPatch([{ insert: '<a href="/pricing">Pricing</a><img src="/logo.svg" alt="">', into: '.plans' }]))).toEqual([]);
    expect(codes(withPatch([{ insert: '<a href="https://evil.example">x</a>', into: '.plans' }]))).toEqual(['LINK_TARGET']);
    expect(codes(withPatch([{ insert: '<iframe src="/x"></iframe>', into: '.plans' }]))).toEqual(['FORBIDDEN_ELEMENT']);
    expect(codes(withPatch([{ set: '.plan', attr: { onclick: 'x()' } }]))).toEqual(['EVENT_HANDLER']);
    expect(codes(withPatch([{ set: '.plan a', attr: { href: 'javascript:alert(1)' } }]))).toEqual(['REMOTE_URL']);
    expect(codes(withPatch([{ set: '.plan img', attr: { src: 'https://evil.example/p.png' } }]))).toEqual(['REMOTE_URL']);
    expect(codes(withPatch([{ set: '.plan' }]))).toEqual(['PATCH_SET']);
    expect(codes(withPatch([{ wrap: '.plan', in: '<div class="row">text</div>' }]))).toEqual(['PATCH_WRAP']);
    expect(codes(withPatch([{ wrap: '.plan', in: '<div class="row"><div></div></div>' }]))).toEqual([]);
  });

  test('a script is allowed but named, and cannot load, send or store anything', () => {
    const ok = withPatch([{ script: "area.classList.add('on')", undo: "area.classList.remove('on')" }]);
    expect(codes(ok)).toEqual([]);
    expect(codes(ok, 'warning')).toContain('APPROXIMATE');
    for (const script of ["fetch('/x')", 'new XMLHttpRequest()', "new WebSocket('ws://x')", "navigator.sendBeacon('/x')", "import('/x.js')", "location.href = '/x'", 'document.cookie', "localStorage.setItem('a','b')", "new Image().src = 'https://evil.example'", "eval('1')", "parent.postMessage('x','*')"]) {
      expect(codes(withPatch([{ script, undo: 'void 0' }])), script).toEqual(['SCRIPT_REACH']);
      expect(codes(withPatch([{ script: 'void 0', undo: script }])), script).toEqual(['SCRIPT_REACH']);
    }
  });

  test('"when" makes an area depend on the choice of another', () => {
    const b = board();
    b.areas.push({
      id: 'badge',
      label: 'Badge',
      anchor: '.plan--pro',
      when: { plans: ['wide'] },
      options: [
        { id: 'keep', label: 'None', keep: true },
        { id: 'new', label: 'New', patch: [{ insert: '<b>New</b>', into: '.plan--pro' }] },
      ],
    });
    const result = run(b);
    expect(result.ok).toBe(true);
    const placements = result.placements!;
    expect(placements.badge).toEqual({ inFrame: false, hosts: [{ area: 'plans', option: 'wide' }] });
    expect(activeAreas(result.board!, placements, {})).toEqual(['plans']);
    expect(activeAreas(result.board!, placements, { plans: 'wide' })).toEqual(['plans', 'badge']);
    expect(missingChoices(result.board!, placements, { plans: 'keep' })).toEqual([]);

    b.areas[1].when = { plans: ['nope'] };
    expect(codes(b)).toEqual(['WHEN_REFERENCE']);
    b.areas[1].when = { badge: ['new'] };
    expect(codes(b)).toEqual(['WHEN_REFERENCE']);
    b.areas[1].when = { plans: ['wide'] };
    b.areas[0].when = { badge: ['new'] };
    expect(codes(b)).toEqual(['AREA_CYCLE']);
  });

  test('the source is checked against the project, as far as that is possible without a browser', () => {
    const warnings = (file: string | null) =>
      run(board(), { projectFile: () => file })
        .issues.filter((i) => i.level === 'warning')
        .map((i) => i.code);
    expect(warnings(null)).toEqual(['SOURCE_MISSING']);
    expect(warnings('<section class="plans"></section>')).toEqual([]);
    expect(warnings('<section class="tiers"></section>')).toEqual(['SOURCE_SELECTOR']);
    const b = board();
    delete b.areas[0].source;
    expect(codes(b, 'warning')).toEqual(['NO_SOURCE']);
  });

  test('patterns are checked as on new screens', () => {
    const b = board();
    b.areas[0].options[1].pattern = 'not-a-pattern';
    expect(run(b, { patternIds: new Set(['card-grid']) }).issues.map((i) => i.code)).toEqual(['UNKNOWN_PATTERN']);
  });

  test('a motion from the catalog is an option like any other: its css goes into a patch unchanged', () => {
    const catalog = parseCatalog(readCatalogDir('catalog'));
    const opts = { patternIds: new Set(catalog.patterns.map((p) => p.id)) };
    for (const p of catalog.patterns.filter((x) => x.motion?.css)) {
      const b = withPatch([{ css: p.motion!.css }], { pattern: p.id, build: `styles.css: ${p.motion!.properties.join(', ')}; ${p.motion!.reduced}` });
      const result = validateDraft(b, none, opts);
      expect(result.issues, p.id).toEqual([]);
    }
    const still = board();
    still.areas[0].options[0] = { id: 'keep', label: 'Opens at once', keep: true, pattern: 'instant-change' };
    expect(validateDraft(still, none, opts).issues).toEqual([]);
  });
});
