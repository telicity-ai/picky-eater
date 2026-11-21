import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CATEGORIES, describeDecision, describeIndex, describePattern, motionProblems, movesThings, parseCatalog, renderMarkdown, search } from '../../src/catalog/catalog.js';
import { readCatalogDir } from '../../src/catalog/load.js';
import { lintCss, scanHtml } from '../../src/core/lint.js';
import { snippetFor, snippetIds } from '../../src/kit/snippets.js';

const catalog = parseCatalog(readCatalogDir('catalog'));
const ids = new Set(catalog.patterns.map((p) => p.id));

describe('the pattern catalog', () => {
  test('is valid and covers every category', () => {
    expect(catalog.patterns.length).toBeGreaterThanOrEqual(80);
    expect(catalog.decisions.length).toBeGreaterThanOrEqual(30);
    for (const category of CATEGORIES) expect(catalog.patterns.some((p) => p.category === category), category).toBe(true);
  });

  test('every pattern cites a book or design system and shows where it can be seen', () => {
    const kinds = new Map(catalog.references.map((r) => [r.id, r.kind]));
    for (const p of catalog.patterns) {
      expect(p.sources.length, p.id).toBeGreaterThan(0);
      expect(p.examples.length, p.id).toBeGreaterThan(0);
      for (const s of p.sources) expect(kinds.has(s.ref), `${p.id} → ${s.ref}`).toBe(true);
    }
    const cited = new Set(catalog.patterns.flatMap((p) => p.sources.map((s) => kinds.get(s.ref))));
    expect(cited.has('book')).toBe(true);
  });

  test('alternatives point both ways often enough to be used as options', () => {
    const withAlternatives = catalog.patterns.filter((p) => p.alternatives.length > 0);
    expect(withAlternatives.length).toBeGreaterThan(catalog.patterns.length / 2);
  });

  test('refuses dangling references', () => {
    const raw = readCatalogDir('catalog');
    const broken = structuredClone(raw) as { decisions: Array<{ candidates: Array<{ pattern: string }> }> };
    broken.decisions[0]!.candidates[0]!.pattern = 'does-not-exist';
    expect(() => parseCatalog(broken as never)).toThrow(/does-not-exist/);
  });
});

describe('looking patterns up', () => {
  test('the index lists every decision and pattern on one line each', () => {
    const index = describeIndex(catalog);
    for (const p of catalog.patterns) expect(index).toContain(`  ${p.id}: `);
    for (const d of catalog.decisions) expect(index).toContain(`  ${d.id}: `);
  });

  test('search finds a control by what it is for', () => {
    expect(search(catalog, 'switch').patterns[0]!.id).toBe('switch');
    expect(search(catalog, 'on off').decisions.map((d) => d.id)).toContain('on-off-setting');
    expect(search(catalog, 'zzzz nothing')).toEqual({ patterns: [], decisions: [] });
  });

  test('a pattern is described with its rules, and a decision with its conditions', () => {
    const text = describePattern(catalog.patterns.find((p) => p.id === 'switch')!);
    expect(text).toMatch(/^switch — /);
    expect(text).toContain('Use when:');
    expect(text).toContain('Rules:');
    expect(describeDecision(catalog.decisions.find((d) => d.id === 'on-off-setting')!)).toContain('  - switch: ');
  });

  test('docs/patterns.md is generated from the catalog', () => {
    expect(readFileSync('docs/patterns.md', 'utf8')).toBe(renderMarkdown(catalog));
  });
});

describe('motion patterns', () => {
  const motions = catalog.patterns.filter((p) => p.category === 'motion');
  const byId = new Map(catalog.patterns.map((p) => [p.id, p]));

  test('say when they play, why, how often at most, and what reduced motion gets', () => {
    expect(motions.length).toBeGreaterThanOrEqual(15);
    for (const p of motions) {
      expect(p.motion, p.id).toBeDefined();
      expect(motionProblems(p.motion!), p.id).toEqual([]);
    }
    for (const p of catalog.patterns.filter((x) => x.category !== 'motion')) expect(p.motion, p.id).toBeUndefined();
  });

  test('carry css that a board accepts as it is, with an answer for reduced motion where something moves', () => {
    for (const p of motions) {
      const m = p.motion!;
      if (!m.css) continue;
      expect(lintCss(m.css, p.id, { live: true }).issues, p.id).toEqual([]);
      expect(lintCss(m.css, p.id).issues, p.id).toEqual([]);
      if (movesThings(m.properties)) expect(m.css, p.id).toContain('prefers-reduced-motion');
      // Balanced braces: the rule set can be pasted into a patch or a stylesheet.
      expect(m.css.split('{').length, p.id).toBe(m.css.split('}').length);
    }
  });

  test('delight is kept for rare moments, and what runs by itself is never offered for frequent use', () => {
    for (const p of motions) {
      const m = p.motion!;
      if (m.purpose === 'delight') expect(m.upTo, p.id).toBe('rare');
      if (m.trigger.includes('ambient')) expect(['occasional', 'rare'], p.id).toContain(m.upTo);
      if (m.intensity === 'expressive') expect(m.upTo, p.id).toBe('rare');
    }
  });

  test('every decision that offers a motion also offers not moving', () => {
    for (const d of catalog.decisions) {
      const candidates = d.candidates.map((c) => byId.get(c.pattern)!);
      if (!candidates.some((p) => p.motion && p.motion.intensity !== 'none')) continue;
      expect(candidates.some((p) => !p.motion || p.motion.intensity === 'none'), d.id).toBe(true);
    }
  });

  test('a motion block that moves something without a reduced-motion rule is refused', () => {
    const raw = readCatalogDir('catalog') as { patternFiles: Array<{ category: string; patterns: Array<{ id: string; motion?: { css?: string } }> }> };
    const broken = structuredClone(raw);
    const press = broken.patternFiles.find((f) => f.category === 'motion')!.patterns.find((p) => p.id === 'press-scale')!;
    press.motion!.css = '.btn:active { transform: scale(0.97); }';
    expect(() => parseCatalog(broken as never)).toThrow(/press-scale.*prefers-reduced-motion/);
  });

  test('are found by what sets them off and described with their css', () => {
    expect(search(catalog, 'hover').patterns.map((p) => p.id)).toContain('hover-lift');
    expect(search(catalog, 'accordion').patterns.map((p) => p.id)).toContain('expand-height');
    const text = describePattern(byId.get('press-scale')!);
    expect(text).toContain('Motion: plays on press');
    expect(text).toContain('Right up to: frequent use');
    expect(text).toContain('Reduced motion:');
    expect(text).toContain('.btn:active { transform: scale(0.97); }');
  });
});

describe('mockup snippets', () => {
  const kit = readFileSync('src/kit/kit.css', 'utf8');

  test('belong to catalog patterns, and most patterns have one', () => {
    for (const id of snippetIds()) expect(ids.has(id), id).toBe(true);
    expect(snippetIds().length).toBeGreaterThan(catalog.patterns.length * 0.8);
  });

  test('pass the same checks as any mockup fragment', () => {
    for (const id of snippetIds()) expect(scanHtml(snippetFor(id)!).issues, id).toEqual([]);
  });

  test('only use classes the kit defines', () => {
    const defined = new Set(Array.from(kit.matchAll(/\.(pk-[a-z0-9-]+)/g), (m) => m[1]));
    for (const id of snippetIds()) {
      for (const m of snippetFor(id)!.matchAll(/class="([^"]*)"/g)) {
        for (const cls of m[1]!.split(/\s+/).filter((c) => c.startsWith('pk-'))) expect(defined.has(cls), `${id}: ${cls}`).toBe(true);
      }
    }
  });
});
