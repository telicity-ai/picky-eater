import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { Board } from '../../src/core/schema.js';
import { validateDraft, type DraftReader } from '../../src/core/validate.js';
import { folderReader } from '../../src/session/store.js';
import { EXAMPLE } from '../helpers/project.js';

function memory(files: Record<string, string>): DraftReader {
  return { text: (p) => files[p] ?? null, size: (p) => (p in files ? Buffer.byteLength(files[p]!) : null) };
}

const base = () => ({
  board: {
    schema: 'picky-eater/board',
    schemaVersion: '2.0',
    title: 'Page',
    base: { kind: 'sketch', frame: 'frame.html', styles: ['styles.css'] },
    areas: [
      {
        id: 'hero',
        label: 'Top banner',
        options: [
          { id: 'a', label: 'A', html: 'a.html', suggested: true },
          { id: 'b', label: 'B', html: 'b.html' },
        ],
      },
    ],
  } as Record<string, any>,
  files: {
    'frame.html': '<!doctype html><html><body><section data-pe-area="hero"></section></body></html>',
    'styles.css': 'body{margin:0}',
    'a.html': '<h1>A</h1>',
    'b.html': '<h1>B</h1>',
  } as Record<string, string>,
});

const run = (d: ReturnType<typeof base>, patternIds?: Set<string>) => validateDraft(d.board, memory(d.files), { patternIds });
const errors = (d: ReturnType<typeof base>) => run(d).issues.filter((i) => i.level === 'error').map((i) => i.code);

describe('validateDraft', () => {
  test('accepts the smallest board and fills in defaults', () => {
    const r = run(base());
    expect(r.issues).toEqual([]);
    expect(r.board!.viewports.map((v) => v.id)).toEqual(['desktop', 'phone']);
    expect(r.board!.cuts.map((c) => c.id)).toEqual(['top']);
    expect(r.placements).toEqual({ hero: { inFrame: true, hosts: [] } });
    expect(r.files!.sort()).toEqual(['a.html', 'b.html', 'frame.html', 'styles.css']);
  });

  test('the example board is valid', () => {
    const r = validateDraft(JSON.parse(readFileSync(`${EXAMPLE}/board.json`, 'utf8')), folderReader(EXAMPLE));
    expect(r.issues).toEqual([]);
    expect(r.placements!['signup-error']).toEqual({
      inFrame: false,
      hosts: [
        { area: 'signup', option: 'stacked' },
        { area: 'signup', option: 'one-line' },
      ],
    });
    expect(r.assets).toEqual(['assets/room.svg']);
  });

  test('reports schema problems with the path of the field', () => {
    const d = base();
    d.board.areas[0].options.pop();
    d.board.areas[0].id = 'Hero Area';
    const r = run(d);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.message).join('\n')).toMatch(/areas\.0\.id/);
    expect(r.issues.map((i) => i.message).join('\n')).toMatch(/areas\.0\.options/);
  });

  test('an area needs a slot, and a slot needs an area', () => {
    const d = base();
    d.files['frame.html'] = '<html><body><div data-pe-area="footer"></div></body></html>';
    expect(errors(d)).toEqual(expect.arrayContaining(['UNKNOWN_AREA', 'AREA_NOT_PLACED']));
  });

  test('a frame without any slot is refused', () => {
    const d = base();
    d.files['frame.html'] = '<html><body><p>nothing</p></body></html>';
    expect(errors(d)).toContain('NO_SLOTS');
  });

  test('missing files and unsafe mockups are errors', () => {
    const d = base();
    delete d.files['b.html'];
    d.files['a.html'] = '<img src=x onerror="alert(1)"><script>1</script>';
    expect(errors(d)).toEqual(expect.arrayContaining(['FILE_MISSING', 'EVENT_HANDLER', 'SCRIPT', 'ASSET_MISSING']));
  });

  test('areas that contain each other are a cycle', () => {
    const d = base();
    d.board.areas.push({ id: 'cta', label: 'Button', options: [{ id: 'x', label: 'X', html: 'x.html' }, { id: 'y', label: 'Y', html: 'y.html' }] });
    d.files['a.html'] = '<div data-pe-area="cta"></div>';
    d.files['x.html'] = '<div data-pe-area="hero"></div>';
    d.files['y.html'] = '<b>y</b>';
    d.files['frame.html'] = '<html><body><div data-pe-area="hero"></div></body></html>';
    expect(errors(d)).toContain('AREA_CYCLE');
  });

  test('cut references must name a cut with its own state', () => {
    const d = base();
    d.board.cuts = [{ id: 'top', label: 'Top' }, { id: 'low', label: 'Lower', sameAs: 'top', at: '#x' }, { id: 'error', label: 'Error' }];
    d.board.areas[0].cuts = ['low'];
    d.files['a.html'] = '<p data-pe-in="error">e</p><button data-pe-go="nowhere">go</button>';
    const codes = errors(d);
    expect(codes.filter((c) => c === 'CUT_REFERENCE').length).toBe(2);
  });

  test('a cut that shares a state needs a position and cannot have values', () => {
    const d = base();
    d.board.cuts = [{ id: 'top', label: 'Top' }, { id: 'low', label: 'Lower', sameAs: 'top', fill: { '#a': 'x' } }];
    expect(errors(d)).toEqual(expect.arrayContaining(['CUT_FILL', 'CUT_AT']));
  });

  test('unknown pattern ids are refused when a catalog is given', () => {
    const d = base();
    d.board.areas[0].options[0].pattern = 'switch';
    expect(run(d, new Set(['switch'])).ok).toBe(true);
    expect(run(d, new Set(['checkbox'])).issues.map((i) => i.code)).toContain('UNKNOWN_PATTERN');
  });

  test('warns when no option is suggested', () => {
    const d = base();
    delete d.board.areas[0].options[0].suggested;
    const r = run(d);
    expect(r.ok).toBe(true);
    expect(r.issues.map((i) => i.code)).toEqual(['NO_SUGGESTION']);
  });

  test('a board over an existing page follows its own rules (see validate-live.test.ts)', () => {
    const d = base();
    d.board.base = { kind: 'live', url: 'http://localhost:5173/pricing' };
    expect(errors(d)).toEqual(expect.arrayContaining(['AREA_ANCHOR', 'OPTION_SKETCH_ONLY']));
  });
});

test('the board schema refuses unknown fields and unsafe paths', () => {
  const d = base();
  expect(Board.safeParse({ ...d.board, extra: 1 }).success).toBe(false);
  d.board.base.frame = '../frame.html';
  expect(Board.safeParse(d.board).success).toBe(false);
  d.board.base.frame = '/etc/passwd';
  expect(Board.safeParse(d.board).success).toBe(false);
});
