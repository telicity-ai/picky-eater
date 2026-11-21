import { describe, expect, test } from 'vitest';
import { compareArea, describeDifference, withoutTimes, type AreaMeasure, type ElementMeasure } from '../../src/core/measure.js';

const text = (key: string, at: Partial<ElementMeasure> = {}, style: Record<string, string> = {}): ElementMeasure => ({
  key,
  kind: 'text',
  x: 0,
  y: 0,
  w: 200,
  h: 40,
  ...at,
  style: { color: 'rgb(0, 0, 0)', 'font-size': '32px', 'line-height': '40px', padding: '0px 0px 0px 0px', ...style },
});
const area = (elements: ElementMeasure[], box: Partial<AreaMeasure> = {}): AreaMeasure => ({ id: 'hero', found: true, x: 0, y: 100, w: 1280, h: 400, elements, ...box });
const at = { viewport: 'desktop', cut: 'top' };
const diff = (a: AreaMeasure, b: AreaMeasure | undefined) => compareArea(a, b, at).map(describeDifference);

describe('comparing an approved area with the built one', () => {
  const approved = area([text('heading "Learn to ship"'), text('text "One room"', { y: 60, h: 24 }, { 'font-size': '16px', 'line-height': '24px' }), text('action "Save my seat"', { y: 100, w: 140 })]);

  test('the same measurements agree, within what the eye cannot see', () => {
    expect(diff(approved, approved)).toEqual([]);
    const close = area([
      text('heading "Learn to ship"', { w: 201.5, y: 1 }, { padding: '0.4px 0px 0px 0px', color: 'rgb(0,0,0)' }),
      text('text "One room"', { y: 61, h: 24 }, { 'font-size': '16px', 'line-height': '24.5px' }),
      text('action "Save my seat"', { y: 102, w: 141 }),
    ]);
    expect(diff(approved, close)).toEqual([]);
  });

  test('a style that differs is named with both values; what follows from it is not repeated', () => {
    const built = area([
      text('heading "Learn to ship"', { h: 50 }, { 'font-size': '40px', 'line-height': '50px' }),
      text('text "One room"', { y: 70, h: 24 }, { 'font-size': '16px', 'line-height': '24px' }), // pushed down by the larger heading
      text('action "Save my seat"', { y: 110, w: 140 }),
    ]);
    expect(diff(approved, built)).toEqual(['hero · desktop · top: heading "Learn to ship" font-size 40px, approved 32px']);
  });

  test('colour, size and position are each reported', () => {
    const colour = area([approved.elements[0]!, approved.elements[1]!, text('action "Save my seat"', { y: 100, w: 140 }, { color: 'rgb(255, 0, 0)' })]);
    expect(diff(approved, colour)).toEqual(['hero · desktop · top: action "Save my seat" color rgb(255, 0, 0), approved rgb(0, 0, 0)']);
    const size = area([approved.elements[0]!, approved.elements[1]!, text('action "Save my seat"', { y: 100, w: 220 })]);
    expect(diff(approved, size)).toEqual(['hero · desktop · top: action "Save my seat" size 220×40px, approved 140×40px']);
    const position = area([approved.elements[0]!, text('text "One room"', { x: 40, y: 60, h: 24 }, { 'font-size': '16px', 'line-height': '24px' }), approved.elements[2]!]);
    expect(diff(approved, position)).toEqual(['hero · desktop · top: text "One room" position 40, 60px, approved 0, 60px']);
  });

  test('what is missing and what was not approved', () => {
    const built = area([approved.elements[0]!, approved.elements[1]!, text('action "Sign up now"', { y: 100, w: 140 })]);
    expect(diff(approved, built)).toEqual(['hero · desktop · top: action "Save my seat" is missing (approved: present)', 'hero · desktop · top: action "Sign up now" is not in the approved page']);
    expect(diff(approved, { ...approved, found: false })).toEqual(['hero · desktop · top: the area is missing (approved: on the page)']);
    expect(diff(approved, undefined)).toEqual(['hero · desktop · top: the area is missing (approved: on the page)']);
  });

  test('an extra wrapper is not a difference, a missing painted box is', () => {
    const box: ElementMeasure = { key: 'box around heading "Learn to ship"', kind: 'box', x: 0, y: 0, w: 1280, h: 400, style: { 'background-color': 'rgb(238, 238, 255)', border: 'none' } };
    expect(diff(approved, area([box, ...approved.elements]))).toEqual([]);
    expect(diff(area([box, ...approved.elements]), approved)).toEqual(['hero · desktop · top: box around heading "Learn to ship" is missing (approved: rgb(238, 238, 255), border none)']);
  });

  test('the area as a whole is named only when nothing inside explains it', () => {
    expect(diff(approved, area(approved.elements, { h: 460 }))).toEqual(['hero · desktop · top: the area size 1280×460px, approved 1280×400px']);
    expect(diff(approved, area(approved.elements, { x: 40, w: 1240 }))).toEqual(['hero · desktop · top: the area size 1240×400px, approved 1280×400px']);
    expect(diff(approved, area(approved.elements, { y: 900 }))).toEqual([]); // where it sits on the page follows from the areas above it
    // The space above an area is compared where it was measured: at the top of the page.
    expect(diff(area(approved.elements, { above: 72 }), area(approved.elements, { above: 24 }))).toEqual(['hero · desktop · top: the area space above 24px, approved 72px']);
    expect(diff(area(approved.elements, { above: 72 }), area(approved.elements, { above: 74 }))).toEqual([]);
    expect(diff(area(approved.elements, { above: 72 }), area(approved.elements))).toEqual([]);
  });

  test('an area that was not on the approved page in this moment is not compared', () => {
    expect(diff({ ...approved, found: false }, approved)).toEqual([]);
  });
});

test('special differences read as sentences', () => {
  const base = { viewport: 'desktop', cut: 'error', area: 'page', element: null, approved: '', built: '' };
  expect(describeDifference({ ...base, property: 'cut', built: '"#send" did not appear on the page' })).toBe('page · desktop · error: this moment could not be reached on the built page ("#send" did not appear on the page)');
  expect(describeDifference({ ...base, area: 'hero', property: 'pixels', approved: '3.0%', built: '12.4%' })).toBe('hero · desktop · error: the picture differs in 12.4% of its pixels (allowed: 3.0%)');
});

describe('times on a running page', () => {
  test('a text that is nothing but a time is paired as a time', () => {
    for (const t of ['36m', '2h', '5 min', '1h 5m', '3d ago', 'just now', 'Yesterday', '12분 전', '방금']) expect(withoutTimes(t), t).toEqual({ text: '(a time)', live: true });
  });
  test('a time inside a sentence is left out of what the sentence is paired by', () => {
    expect(withoutTimes('Updated 3 minutes ago by Mina')).toEqual({ text: 'Updated (a time) by Mina', live: true });
    expect(withoutTimes('Sent at 10:28 AM')).toEqual({ text: 'Sent at (a time)', live: true });
    expect(withoutTimes('Starts in 2 hours')).toEqual({ text: 'Starts (a time)', live: true });
  });
  test('numbers that are not times stay what they are', () => {
    for (const t of ['$29', '12 passed', '+4 lines', '3 places', 'Worked for 5.2s', 'v2 migration', '1 of 5 chosen', 'Room 12', '2026']) expect(withoutTimes(t), t).toEqual({ text: t, live: false });
  });
  test('a time may be wider or narrower than it was, but not on another line', () => {
    const approved = area([text('text "Plan the v2 migration"', { w: 150, h: 20 }), { ...text('text (a time)', { x: 200, w: 24, h: 16 }), live: true }]);
    const later = area([text('text "Plan the v2 migration"', { w: 150, h: 20 }), { ...text('text (a time)', { x: 186, w: 38, h: 16 }), live: true }]);
    expect(diff(approved, later)).toEqual([]);
    const below = area([text('text "Plan the v2 migration"', { w: 150, h: 20 }), { ...text('text (a time)', { x: 200, y: 24, w: 24, h: 16 }), live: true }]);
    expect(diff(approved, below)).toEqual(['hero · desktop · top: text (a time) position 200, 24px, approved 200, 0px']);
    const restyled = area([text('text "Plan the v2 migration"', { w: 150, h: 20 }), { ...text('text (a time)', { x: 200, w: 24, h: 16 }, { color: 'rgb(255, 0, 0)' }), live: true }]);
    expect(diff(approved, restyled)).toEqual(['hero · desktop · top: text (a time) color rgb(255, 0, 0), approved rgb(0, 0, 0)']);
  });
});
