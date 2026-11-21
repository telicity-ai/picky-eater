import { describe, expect, test } from 'vitest';
import { parseCatalog } from '../../src/catalog/catalog.js';
import { readCatalogDir } from '../../src/catalog/load.js';
import type { Moment, Profile } from '../../src/check/profile.js';
import { decide, describeRecommended, frequencyOf, gate, recommend } from '../../src/recommend/recommend.js';
import { gather } from '../../src/taste/score.js';
import type { Offered, TasteEvent } from '../../src/taste/store.js';

const catalog = parseCatalog(readCatalogDir('catalog'));
const pattern = (id: string) => catalog.patterns.find((p) => p.id === id)!;
const decision = (id: string) => catalog.decisions.find((d) => d.id === id)!;
const moment = (kind: Moment['kind'], selector: string, answered = false): Moment => ({ kind, selector, count: 2, text: 'Something', today: answered ? 'moves already' : 'nothing happens', answered });
const profile = (surface: Profile['surface'], moments: Moment[]): Profile => ({ surface, tokens: [], motion: { transitions: 0, animations: 0, durations: [], reducedRules: 0, libraries: [] }, moments });

describe('the gate', () => {
  test('a moment on a rarely met page is met rarely; on a screen used all day, as often as its kind', () => {
    expect(frequencyOf('press', 'rare')).toBe('rare');
    expect(frequencyOf('press', 'constant')).toBe('frequent');
    expect(frequencyOf('open', 'frequent')).toBe('occasional');
    expect(frequencyOf('enter', 'frequent')).toBe('frequent'); // content appears as often as the page is opened
  });

  test('a motion is left out where its moment is met more often than it allows, with the reason', () => {
    expect(gate(pattern('press-scale'), 'frequent')).toBeNull();
    expect(gate(pattern('stagger-in'), 'rare')).toBeNull();
    expect(gate(pattern('stagger-in'), 'frequent')).toBe('This moment is met often; this motion is right only up to rare use.');
    expect(gate(pattern('instant-change'), 'constant')).toBeNull(); // not moving is always allowed
    expect(gate(pattern('hero-split'), 'constant')).toBeNull(); // not a motion at all
  });

  test('a decision keeps its candidates in order and names what was left out', () => {
    const d = decide(catalog, decision('content-entrance'), 'occasional', null);
    expect(d.offer.map((c) => c.pattern)).toEqual(['instant-change', 'rise-in']);
    expect(d.rejected.map((r) => r.pattern)).toEqual(['stagger-in', 'scroll-reveal']);
    expect(d.rejected[0]!.why).toContain('met now and then');
    expect(d.taste).toBeNull();
  });
});

describe('what to offer on a page', () => {
  const landing = profile('landing', [moment('enter', '.cards'), moment('ambient', '.logos'), moment('press', '.button'), moment('open', 'details'), moment('hover', '.card', true)]);

  test('moments come in order of what they are worth, one area per decision, up to the cap', () => {
    const rec = recommend(catalog, landing);
    expect(rec.frequency).toBe('rare');
    expect(rec.cap).toBe(3);
    expect(rec.areas.map((r) => r.decision)).toEqual(['press-feedback', 'open-in-place', 'content-entrance']);
    expect(rec.later.map((r) => r.decision)).toEqual(['hero-ambient-motion']);
    expect(rec.answered.map((m) => m.selector)).toEqual(['.card']); // the page answers it already: left alone
  });

  test('on a screen that is worked with, less is offered and more is left out', () => {
    const app = recommend(catalog, profile('app', landing.moments));
    expect(app.frequency).toBe('frequent');
    expect(app.cap).toBe(2);
    expect(app.areas.map((r) => r.decision)).toEqual(['press-feedback', 'open-in-place']);
    // A group that appears every time the screen opens: only "it does not move" is left, so it is no area at all.
    expect([...app.areas, ...app.later].map((r) => r.decision)).not.toContain('content-entrance');
    expect(app.areas[0]!.rejected.map((r) => r.pattern)).toEqual(['hold-to-confirm']);
    expect(recommend(catalog, landing, { frequency: 'constant' }).areas.map((r) => r.decision)).toEqual(['press-feedback', 'open-in-place']);
  });

  test('earlier choices are named among the offered ones, never among those left out', () => {
    const offered: Offered[] = [{ option: 'keep', pattern: 'instant-change', intensity: 'none' }, { option: 'grow', pattern: 'expand-height', intensity: 'subtle' }];
    const events: TasteEvent[] = [{ at: new Date().toISOString(), project: 'a', session: 's', revision: 1, area: 'faq', suggested: 'grow', suggestedBy: 'agent', chosen: 'keep', offered }];
    const rec = recommend(catalog, landing, { evidence: gather(events, [], 'a') });
    // The same question as before: the choice itself is the reason. Another question: the habit behind it is.
    expect(rec.areas.find((r) => r.decision === 'open-in-place')!.taste).toEqual({ pattern: 'instant-change', because: 'You chose this over "Expand in place" in this project.' });
    expect(rec.areas.find((r) => r.decision === 'press-feedback')!.taste).toEqual({ pattern: 'instant-change', because: 'In this project you chose no motion over subtle motion.' });
  });

  test('it reads as instructions for an agent, and says so when there is nothing to offer', () => {
    const text = describeRecommended('http://localhost:1/', landing, ['React 19.1.0'], recommend(catalog, landing));
    expect(text).toContain('a page that is read, met rarely');
    expect(text).toContain('1. a press · .button (2 on the page)');
    expect(text).toContain('offer  press-scale — ');
    expect(text).toContain('Over the cap of 3 motion areas');
    expect(text).toContain('Already answered by the page itself');
    expect(describeRecommended('http://localhost:1/', profile('app', []), [], recommend(catalog, profile('app', [])))).toContain('No motion to offer on this page');
  });
});
