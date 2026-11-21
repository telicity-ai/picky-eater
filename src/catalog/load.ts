import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCatalog, type Catalog, type RawCatalog } from './catalog.js';

/** Set by the build: the catalog files, so the bundled CLI needs nothing on disk. */
declare const __PE_CATALOG__: RawCatalog | undefined;

export function readCatalogDir(dir: string): RawCatalog {
  const json = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as unknown;
  const patternsDir = join(dir, 'patterns');
  return {
    references: existsSync(join(dir, 'references.json')) ? json(join(dir, 'references.json')) : [],
    decisions: existsSync(join(dir, 'decisions.json')) ? json(join(dir, 'decisions.json')) : [],
    patternFiles: existsSync(patternsDir)
      ? readdirSync(patternsDir)
          .filter((f) => f.endsWith('.json'))
          .sort()
          .map((f) => json(join(patternsDir, f)))
      : [],
  };
}

let cached: Catalog | null = null;

export function getCatalog(): Catalog {
  if (!cached) {
    const raw = typeof __PE_CATALOG__ !== 'undefined' ? __PE_CATALOG__ : readCatalogDir(join(dirname(fileURLToPath(import.meta.url)), '../../catalog'));
    cached = parseCatalog(raw);
  }
  return cached;
}

/** Ids an option may name as its pattern; undefined while the catalog is empty. */
export function patternIds(): Set<string> | undefined {
  const ids = new Set(getCatalog().patterns.map((p) => p.id));
  return ids.size > 0 ? ids : undefined;
}

/** What "validate" needs from the catalog: which ids exist, and how long each motion may take. */
export function catalogChecks() {
  const catalog = getCatalog();
  if (catalog.patterns.length === 0) return {};
  const motions = new Map(catalog.patterns.filter((p) => p.motion).map((p) => [p.id, p.motion!]));
  return {
    patternIds: new Set(catalog.patterns.map((p) => p.id)) as ReadonlySet<string>,
    decisionIds: new Set(catalog.decisions.map((d) => d.id)) as ReadonlySet<string>,
    motionOf: (id: string) => {
      const m = motions.get(id);
      return m ? { id, ...(m.duration ? { duration: m.duration } : {}) } : undefined;
    },
  };
}
