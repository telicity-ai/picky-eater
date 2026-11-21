import { describe, expect, test } from 'vitest';
import { parseCatalog } from '../../src/catalog/catalog.js';
import { catalogChecks, readCatalogDir } from '../../src/catalog/load.js';
import { compareArea, describeDifference, type AreaMeasure, type MotionSign } from '../../src/core/measure.js';
import { asReduced, lintMotion, motionFacts, moves } from '../../src/core/motion.js';
import { validateDraft } from '../../src/core/validate.js';

const catalog = parseCatalog(readCatalogDir('catalog'));
const none = { text: () => null, size: () => null };
const codes = (css: string, pattern?: { id: string; duration?: [number, number] }) => lintMotion(css, pattern).map((i) => i.code);

describe('what a style sheet says about movement', () => {
  test('transitions are read with their property and time, written together or apart', () => {
    expect(motionFacts('.a{transition:transform 160ms cubic-bezier(.2, 0, 0, 1), opacity .2s ease-out 50ms}').transitions).toEqual([
      { property: 'transform', ms: 160 },
      { property: 'opacity', ms: 200 },
    ]);
    expect(motionFacts('.a{transition-property:opacity, height;transition-duration:.2s, 1s}').transitions).toEqual([
      { property: 'opacity', ms: 200 },
      { property: 'height', ms: 1000 },
    ]);
    expect(motionFacts('.a{transition:none}.b{transition:0.3s}').transitions).toEqual([{ property: 'all', ms: 300 }]);
  });

  test('animations are read with their runs, and what their keyframes change', () => {
    const facts = motionFacts('.a{animation:spin 1s linear infinite}.b{animation:rise 260ms cubic-bezier(0.22, 1, 0.36, 1) both}@keyframes spin{to{transform:rotate(1turn)}}@keyframes rise{from{opacity:0;transform:translateY(10px)}}');
    expect(facts.animations).toEqual([
      { name: 'spin', ms: 1000, runs: Infinity },
      { name: 'rise', ms: 260, runs: 1 },
    ]);
    expect(facts.keyframeProperties).toEqual(['transform', 'opacity']);
    expect(facts.longest).toBe(1000);
  });

  test('a fade is not movement; anything that travels, grows or turns is', () => {
    expect(moves(motionFacts('.a{transition:opacity .2s, background-color .2s}'))).toBe(false);
    expect(moves(motionFacts('.a{transition:transform .2s}'))).toBe(true);
    expect(moves(motionFacts('.a{animation:x 1s}@keyframes x{to{opacity:0}}'))).toBe(false);
  });
});

describe('the floor every motion has to clear', () => {
  test('a style sheet without motion has nothing to answer for', () => {
    expect(codes('.a{color:red;transform:scale(2)}')).toEqual([]);
  });

  test('movement needs an answer for people who asked for less of it; a fade does not', () => {
    expect(codes('.a{transition:transform .2s}')).toEqual(['MOTION_NO_REDUCED']);
    expect(codes('.a{transition:opacity .2s}')).toEqual([]);
    expect(codes('.a{transition:transform .2s}@media (prefers-reduced-motion: reduce){.a{transition:none}}')).toEqual([]);
  });

  test('"transition: all", layout work on every frame, a run that never ends and a run slower than its pattern are named', () => {
    expect(codes('.a{transition:all .2s}@media (prefers-reduced-motion: reduce){.a{transition:none}}')).toEqual(['MOTION_ALL']);
    expect(codes('.a{transition:height .2s}@media (prefers-reduced-motion: reduce){.a{transition:none}}')).toEqual(['MOTION_LAYOUT']);
    expect(codes('.a{animation:x 2s linear infinite}@keyframes x{to{opacity:.5}}')).toEqual(['MOTION_ENDLESS']);
    expect(codes('.a{animation:x 2s linear infinite}.a:hover{animation-play-state:paused}@keyframes x{to{opacity:.5}}')).toEqual([]);
    expect(codes('.a{transition:opacity .6s}', { id: 'fade-in', duration: [100, 200] })).toEqual(['MOTION_SLOW']);
  });

  test('every motion of the catalog clears it with its own css', () => {
    for (const p of catalog.patterns.filter((x) => x.motion?.css)) {
      expect(lintMotion(p.motion!.css!, { id: p.id, ...(p.motion!.duration ? { duration: p.motion!.duration } : {}) }), p.id).toEqual([]);
    }
  });

  test('"validate" warns about it on a board over an existing page, per option', () => {
    const board = {
      schema: 'picky-eater/board',
      schemaVersion: '2.0',
      title: 'Pricing',
      base: { kind: 'live', url: 'http://localhost:5173/' },
      areas: [
        {
          id: 'cta',
          label: 'Button',
          anchor: '.cta',
          source: { file: 'a.css' },
          decision: 'press-feedback',
          rejected: [{ pattern: 'hold-to-confirm', why: 'The action can be undone.' }],
          options: [
            { id: 'keep', label: 'As it is', keep: true, pattern: 'instant-change' },
            { id: 'press', label: 'Shrinks while pressed', pattern: 'press-scale', suggested: true, because: 'Nothing answers a press today.', patch: [{ css: '.cta{transition:transform 900ms}.cta:active{transform:scale(.97)}' }] },
          ],
        },
      ],
      cuts: [{ id: 'top', label: 'Top' }],
    };
    const result = validateDraft(board, none, catalogChecks());
    expect(result.ok).toBe(true);
    expect(result.issues.map((i) => i.code).sort()).toEqual(['MOTION_NO_REDUCED', 'MOTION_SLOW']);
    expect(result.issues[0]!.message).toContain('Option "cta/press"');
  });

  test('the decision, the reason and what was left out are checked against the catalog', () => {
    const board = (edit: (area: Record<string, any>) => void) => {
      const area: Record<string, any> = {
        id: 'cta',
        label: 'Button',
        anchor: '.cta',
        source: { file: 'a.css' },
        options: [
          { id: 'keep', label: 'As it is', keep: true },
          { id: 'big', label: 'Bigger', suggested: true, patch: [{ css: '.cta{padding:20px}' }] },
        ],
      };
      edit(area);
      return { schema: 'picky-eater/board', schemaVersion: '2.0', title: 'P', base: { kind: 'live', url: 'http://localhost:5173/' }, areas: [area], cuts: [{ id: 'top', label: 'Top' }] };
    };
    const run = (edit: (area: Record<string, any>) => void) => validateDraft(board(edit), none, catalogChecks()).issues.map((i) => i.code);
    expect(run((a) => (a.decision = 'no-such-decision'))).toEqual(['UNKNOWN_DECISION']);
    expect(run((a) => (a.rejected = [{ pattern: 'no-such-pattern', why: 'Because.' }]))).toEqual(['UNKNOWN_PATTERN']);
    expect(run((a) => ((a.options[1].pattern = 'press-scale'), (a.rejected = [{ pattern: 'press-scale', why: 'Because.' }])))).toEqual(['REJECTED_OFFERED']);
    expect(run((a) => (a.options[0].because = 'It is fine.'))).toEqual(['BECAUSE_UNUSED']);
    expect(run((a) => (a.options[1].because = 'It <b>is</b> fine.'))).toEqual(['BOARD_SCHEMA']);
  });
});

describe('the reduced form of a style sheet', () => {
  test('its rules for reduced motion apply and its rules for no preference do not', () => {
    const css = '@media (prefers-reduced-motion: reduce){.a{transition:none}}@media (hover: hover) and (prefers-reduced-motion: no-preference){.b{animation:x 1s}}';
    expect(asReduced(css, false)).toBe(css);
    expect(asReduced(css, true)).toBe('@media (min-width: 0px){.a{transition:none}}@media (hover: hover) and (max-width: 0px){.b{animation:x 1s}}');
  });
});

describe('comparing what moves', () => {
  const area = (motion: MotionSign[] | undefined, reduced: MotionSign[] | undefined = motion ? [] : undefined): AreaMeasure => ({ id: 'faq', found: true, x: 0, y: 0, w: 100, h: 100, elements: [], ...(motion ? { motion } : {}), ...(reduced ? { reduced } : {}) });
  const at = { viewport: 'desktop', cut: 'top' };
  const grow: MotionSign = { on: 'block-size', ms: 240, delay: 0, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
  const lines = (a: AreaMeasure, b: AreaMeasure, opts = {}) => compareArea(a, b, at, undefined, opts).map(describeDifference);

  test('the same movement, a few milliseconds apart, is the same', () => {
    expect(lines(area([grow]), area([{ ...grow, ms: 245, easing: 'cubic-bezier(0.22,1,0.36,1)' }]))).toEqual([]);
  });

  test('another time or curve, a missing one and an added one are each one line', () => {
    expect(lines(area([grow]), area([{ ...grow, ms: 400 }]))).toEqual(['faq · desktop · top: moves as block-size 400 ms cubic-bezier(0.22, 1, 0.36, 1), approved block-size 240 ms cubic-bezier(0.22, 1, 0.36, 1)']);
    expect(lines(area([grow]), area([]))).toEqual(['faq · desktop · top: approved: block-size 240 ms cubic-bezier(0.22, 1, 0.36, 1). The built page does not have it']);
    expect(lines(area([]), area([grow]))).toEqual(['faq · desktop · top: the built page has: block-size 240 ms cubic-bezier(0.22, 1, 0.36, 1). That was not approved']);
    expect(lines(area([]), area([grow]), { extraMotion: false })).toEqual([]);
  });

  test('what people get who asked for less motion is held against what was approved for them', () => {
    expect(lines(area([grow], []), area([grow], [grow]))).toEqual(['faq · desktop · top: the built page has with reduced motion: block-size 240 ms cubic-bezier(0.22, 1, 0.36, 1). That was not approved']);
  });

  test('an answer key taken before motion was measured says nothing about it', () => {
    expect(lines(area(undefined), area([grow]))).toEqual([]);
  });
});
