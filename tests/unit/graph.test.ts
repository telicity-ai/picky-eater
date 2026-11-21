import { describe, expect, test } from 'vitest';
import { activeAreas, findCycle, missingChoices, pruneChoices, stateCuts, stateOf } from '../../src/core/graph.js';
import type { Board, Placements } from '../../src/core/schema.js';

const option = (id: string) => ({ id, label: id, html: `${id}.html` });
const board = {
  areas: [
    { id: 'form', label: 'Form', options: [option('stacked'), option('one-line')] },
    { id: 'error', label: 'Error', options: [option('inline'), option('summary')] },
    { id: 'hint', label: 'Hint', options: [option('a'), option('b')] },
    { id: 'hero', label: 'Hero', options: [option('split'), option('centered')] },
  ],
} as unknown as Board;

const placements: Placements = {
  form: { inFrame: true, hosts: [] },
  hero: { inFrame: true, hosts: [] },
  error: { inFrame: false, hosts: [{ area: 'form', option: 'stacked' }] },
  hint: { inFrame: false, hosts: [{ area: 'error', option: 'summary' }] },
};

describe('activeAreas', () => {
  test('areas in the page frame are always on the page', () => {
    expect(activeAreas(board, placements, {})).toEqual(['form', 'hero']);
  });
  test('an area inside an option exists only while that option is chosen', () => {
    expect(activeAreas(board, placements, { form: 'stacked' })).toEqual(['form', 'error', 'hero']);
    expect(activeAreas(board, placements, { form: 'one-line' })).toEqual(['form', 'hero']);
  });
  test('follows several levels', () => {
    expect(activeAreas(board, placements, { form: 'stacked', error: 'summary' })).toEqual(['form', 'error', 'hint', 'hero']);
    expect(activeAreas(board, placements, { error: 'summary' })).toEqual(['form', 'hero']);
  });
});

test('pruneChoices drops choices for areas and options that no longer exist', () => {
  expect(pruneChoices(board, placements, { form: 'one-line', error: 'inline', hero: 'gone', nope: 'x' })).toEqual({ form: 'one-line' });
  expect(pruneChoices(board, placements, { form: 'stacked', error: 'inline', hint: 'a' })).toEqual({ form: 'stacked', error: 'inline' });
});

test('missingChoices lists what is still open on the chosen path', () => {
  expect(missingChoices(board, placements, { form: 'stacked' })).toEqual(['error', 'hero']);
  expect(missingChoices(board, placements, { form: 'one-line', hero: 'split' })).toEqual([]);
});

test('findCycle reports areas that contain each other', () => {
  expect(findCycle(placements)).toBeNull();
  const loop: Placements = {
    a: { inFrame: true, hosts: [{ area: 'b', option: 'x' }] },
    b: { inFrame: false, hosts: [{ area: 'a', option: 'y' }] },
  };
  expect(findCycle(loop)).toEqual(['a', 'b', 'a']);
});

test('cuts that share a state resolve to it', () => {
  const cuts = { cuts: [{ id: 'top', label: 'Top' }, { id: 'scrolled', label: 'S', sameAs: 'top', at: '#x' }, { id: 'error', label: 'E' }] } as unknown as Board;
  expect(stateCuts(cuts)).toEqual(['top', 'error']);
  expect(stateOf(cuts, 'scrolled')).toBe('top');
  expect(stateOf(cuts, 'error')).toBe('error');
});
