import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, sep } from 'node:path';
import type { Board } from '../core/schema.js';
import type { Issue } from '../core/validate.js';
import { PeError } from '../session/fs.js';
import type { Owner } from '../stage/framework.js';
import type { Step } from '../stage/protocol.js';
import { launchBrowser, type Tab } from './browser.js';
import type { ProbePatch, Seen } from './probe.js';
import type { Profile } from './profile.js';
import { loadSignin } from './signin.js';
import { playSteps } from './steps.js';

/**
 * Looking at the running page from the command line, before a person does: what is on it, which
 * component draws each part and where that component's source is, and whether a board fits it.
 *
 * The page is opened in a headless browser with an empty profile. A page behind a login shows its
 * login screen there, so nothing found here is ever more than a warning.
 */

export interface Where {
  framework: string;
  /** Components around the element, nearest first. */
  components: string[];
  /** Source file, relative to the project where it is inside it. */
  file?: string;
  line?: number;
}

export interface Found {
  selector: string;
  count: number;
  tag?: string;
  text?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  depth?: number;
  where?: Where;
  error?: string;
}

export interface PageReport {
  url: string;
  /** Where the page is now, when that is not the address that was opened: a redirect, or a step that led elsewhere. */
  endedAt?: string;
  frameworks: string[];
  found: Found[];
  /** When the saved sign-in that was used was made. */
  signedIn?: string;
  /** The page looks like a sign-in screen, not like the page that was asked for. */
  wall?: boolean;
}

export const SIGNIN_HINT =
  'This looks like a sign-in screen. The commands that look at the page use their own empty browser: sign it in once with the development account, picky-eater signin --url <sign-in page> --steps \'[{"fill":"#email","value":"…"},{"fill":"#password","value":"…"},{"click":"button[type=submit]"}]\'.';

const js = (value: unknown) => JSON.stringify(value);

// --- from what the page says to a file in the project ---------------------------------------------

const SOURCE_EXT = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.vue', '.svelte', '.astro', '.mdx']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.output', '.svelte-kit', '.astro', '.angular', '.vite', '.cache', '.turbo', '.vercel', '.picky-eater', 'test-results']);

/** What is known of a project's sources: which packages it has, and where each component is defined. */
interface Sources {
  /** Where a component is defined, for pages that only know its name. */
  find(component: string): { file: string; line: number } | null;
  /** A file as the page names it, as a path in the project. Null when the project has no such file: a bundle, a server chunk. */
  path(raw: string): string | null;
}

const MAX_FILES = 30_000;
const DEFINES = /(?:^|[\s;])(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Z][\w$]*)/g;

/** Reads the project at most once, and only when a page names something that is not simply there. */
function sourcesOf(root: string): Sources {
  let files: string[] | null = null;
  /** Folders with a package.json: in a repository of several packages, the development server names files from one of them. */
  let packages: string[] = [];
  const list = (): string[] => {
    if (files) return files;
    files = [];
    packages = [];
    // Level by level, so that a large repository gives every package its turn before the limit.
    let level = [root];
    for (let depth = 0; depth <= 10 && level.length > 0 && files.length < MAX_FILES; depth++) {
      const next: string[] = [];
      for (const dir of level) {
        let names: string[];
        try {
          names = readdirSync(dir);
        } catch {
          continue;
        }
        if (dir !== root && depth <= 4 && names.includes('package.json')) packages.push(dir);
        for (const name of names) {
          if (SKIP_DIR.has(name) || (name.startsWith('.') && name !== '.storybook')) continue;
          const path = join(dir, name);
          let stat;
          try {
            stat = statSync(path);
          } catch {
            continue;
          }
          if (stat.isDirectory()) next.push(path);
          else if (SOURCE_EXT.has(extname(name)) && stat.size < 600_000 && !/\.(test|spec|stories|d)\.[a-z]+$/.test(name)) files.push(path);
        }
      }
      level = next;
    }
    return files;
  };

  /** The package whose files the page has named so far: where an ambiguous name is looked for first. */
  let home: string | null = null;
  const rel = (file: string) => relative(root, file).split(sep).join('/');
  const nearest = <T extends { file: string }>(hits: T[]): T | null => hits.find((h) => home !== null && (h.file === home || h.file.startsWith(`${home}/`))) ?? hits[0] ?? null;

  let defined: Map<string, Array<{ file: string; line: number }>> | null = null;
  const index = () => {
    if (defined) return defined;
    defined = new Map();
    const add = (name: string, file: string, line: number) => {
      const at = defined!.get(name);
      if (at) at.push({ file, line });
      else defined!.set(name, [{ file, line }]);
    };
    for (const file of list()) {
      const ext = extname(file);
      // A file named after the component is the component (Hero.vue, Hero.svelte, hero.component.ts).
      if (ext === '.vue' || ext === '.svelte' || ext === '.astro') add(`file:${basename(file, ext).toLowerCase()}`, rel(file), 1);
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      if (!/[A-Z]/.test(text)) continue;
      DEFINES.lastIndex = 0;
      let lineNo = 1;
      let from = 0;
      for (let m = DEFINES.exec(text); m; m = DEFINES.exec(text)) {
        const at = m.index + m[0].length - m[1]!.length;
        for (let i = text.indexOf('\n', from); i >= 0 && i < at; i = text.indexOf('\n', i + 1)) lineNo++;
        from = at;
        add(m[1]!, rel(file), lineNo);
      }
    }
    return defined;
  };

  const cache = new Map<string, { file: string; line: number } | null>();
  const find = (component: string) => {
    if (!/^[A-Za-z_$][\w$]*$/.test(component)) return null;
    if (cache.has(component)) return cache.get(component)!;
    const plain = component.replace(/Component$/, '');
    const kebab = plain.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    const byFile = [component, plain, kebab].flatMap((name) => index().get(`file:${name.toLowerCase()}`) ?? []);
    const all = index().get(component) ?? [];
    // Among several definitions, the one in a file named after the component, then the one nearest to what the page has named.
    const named = all.filter((h) => [component, plain, kebab, `${kebab}.component`].includes(basename(h.file, extname(h.file))));
    const hit = nearest(byFile) ?? nearest(named) ?? nearest(all);
    cache.set(component, hit);
    return hit;
  };

  const isFile = (path: string) => {
    try {
      return statSync(path).isFile();
    } catch {
      return false;
    }
  };
  const path = (raw: string): string | null => {
    const clean = raw.replace(/\\/g, '/');
    const candidates: string[] = [];
    if (isAbsolute(raw)) {
      const inside = rel(raw);
      if (!inside.startsWith('..')) candidates.push(inside);
      // The development server names files from its own root: "/src/App.tsx".
      candidates.push(clean.replace(/^\/+/, ''));
      // A file of a neighboring package in the same repository.
      if (inside.startsWith('../') && !inside.startsWith('../../../') && existsSync(raw)) return inside;
    } else candidates.push(clean.replace(/^\.\//, ''));
    for (const candidate of candidates) if (candidate && isFile(join(root, candidate))) return candidate;
    // In a repository of several packages that root is one of the packages.
    const served = candidates[candidates.length - 1];
    if (!served) return null;
    list();
    const hits = packages.filter((dir) => isFile(join(dir, served))).map((dir) => ({ file: rel(dir) }));
    const pkg = hits.length === 1 ? hits[0]! : nearest(hits.filter((h) => h.file === home));
    if (!pkg) return null;
    home = pkg.file;
    return `${pkg.file}/${served}`;
  };
  return { find, path };
}

function locate(sources: Sources, owner: Owner | null): Where | undefined {
  if (!owner) return undefined;
  const where: Where = { framework: owner.framework, components: owner.components };
  const file = owner.file ? sources.path(owner.file) : null;
  if (file) {
    where.file = file;
    if (owner.line) where.line = owner.line;
    // The page names the components around the element, nearest first, and the nearest may be a
    // library's (a tooltip trigger that took the element over). The one that this file defines wrote it.
    const mine = owner.components.slice(0, 5).findIndex((c) => sources.find(c)?.file === file);
    if (mine >= 0) {
      where.components = owner.components.slice(mine);
      if (!where.line) where.line = sources.find(owner.components[mine]!)!.line;
    }
  } else {
    // Only a name is known, or the page named a file that is not a source: look the component up in the sources.
    for (const component of owner.components.slice(0, 2)) {
      const hit = sources.find(component);
      if (!hit) continue;
      where.file = hit.file;
      where.line = hit.line;
      break;
    }
  }
  return where.components.length > 0 || where.file ? where : undefined;
}

const PACKAGES: Record<string, string> = {
  React: 'react', Preact: 'preact', Vue: 'vue', Svelte: 'svelte', Solid: 'solid-js', Angular: '@angular/core', Lit: 'lit', Qwik: '@builder.io/qwik', Alpine: 'alpinejs', htmx: 'htmx.org',
  'Next.js': 'next', Nuxt: 'nuxt', SvelteKit: '@sveltejs/kit', Astro: 'astro', 'React Router': 'react-router', Remix: '@remix-run/react', Vite: 'vite',
};

/** "React" → "React 19.1.0", from the package the project has installed, where the page did not say. */
function withVersions(root: string, names: string[]): string[] {
  return names.map((name) => {
    const pkg = PACKAGES[name]; // a name that already carries its version is not in the table
    if (!pkg) return name;
    for (let dir = root, i = 0; i < 5; dir = join(dir, '..'), i++) {
      try {
        const version = (JSON.parse(readFileSync(join(dir, 'node_modules', pkg, 'package.json'), 'utf8')) as { version?: string }).version;
        if (version) return `${name} ${version}`;
      } catch {
        /* not installed here */
      }
    }
    return name;
  });
}

/** Turns what a page says about an element's component into a place in the project. */
export function sourceLocator(root: string): (owner: Owner | null) => Where | undefined {
  const sources = sourcesOf(root);
  return (owner) => locate(sources, owner);
}

export const whereText = (w: Where | undefined): string => {
  if (!w) return '';
  const name = w.components[0];
  const file = w.file ? `${w.file}${w.line ? `:${w.line}` : ''}` : '';
  return name && file ? `<${name}> ${file}` : name ? `<${name}>` : file;
};

// --- opening the page ---------------------------------------------------------------------------

/** Wait for a page that fetches its data, or draws itself late, to have done so. */
export async function calm(tab: Tab): Promise<void> {
  await tab.idle();
  await tab.evaluate('__peProbe.quiet()');
  await tab.evaluate('__peProbe.settle(60)');
}

async function open(tab: Tab, probeJs: string, url: string): Promise<void> {
  await tab.goto(url);
  await tab.evaluate(probeJs);
  await tab.evaluate('__peProbe.ready()');
  await calm(tab);
}

const toFound = (sources: Sources, seen: Seen | { selector: string; count: 0; error?: string }): Found => {
  if (seen.count === 0) return { selector: seen.selector, count: 0, ...('error' in seen && seen.error ? { error: seen.error } : {}) };
  const s = seen as Seen;
  const where = locate(sources, s.owner);
  return { selector: s.selector, count: s.count, tag: s.tag, text: s.text, x: s.x, y: s.y, w: s.w, h: s.h, depth: s.depth, ...(where ? { where } : {}) };
};

/** What the selectors find on a page, or a map of the page when there are none. */
export async function inspectPage(probeJs: string, opts: { url: string; root: string; selectors: string[]; within?: string; steps?: Step[]; width?: number; height?: number }): Promise<PageReport> {
  const signin = loadSignin(opts.root);
  const browser = await launchBrowser({ state: signin });
  try {
    const tab = await browser.newTab(opts.width ?? 1280, opts.height ?? 800);
    await open(tab, probeJs, opts.url);
    if (opts.steps && opts.steps.length > 0) {
      // The page as it is after what a person would do: a menu opened, a tab chosen, another screen of the app.
      try {
        await playSteps(tab, opts.steps);
      } catch (err) {
        throw new PeError(`The steps could not be played (${(err as Error).message}).`, 'PAGE_STEPS');
      }
      await calm(tab);
    }
    const frameworks = withVersions(opts.root, await tab.evaluate<string[]>('__peProbe.frameworks()'));
    const seen = await tab.evaluate<Array<Seen | { selector: string; count: 0 }>>(opts.selectors.length > 0 ? `__peProbe.describe(${js(opts.selectors)})` : `__peProbe.outline(${opts.within ? 80 : 60}, ${js(opts.within ?? null)})`);
    const wall = await tab.evaluate<boolean>('__peProbe.signinWall()');
    const sources = sourcesOf(opts.root);
    const here = await tab.evaluate<string>('location.origin + location.pathname + location.search');
    return { url: opts.url, ...(here !== opts.url.replace(/#.*$/, '') ? { endedAt: here } : {}), frameworks, found: seen.map((s) => toFound(sources, s)), ...(signin ? { signedIn: signin.savedAt } : {}), ...(wall ? { wall } : {}) };
  } finally {
    await browser.close();
  }
}

/** The page as "recommend" needs it: its kind, what moves on it today, and the moments where something changes. */
export async function profileOf(probeJs: string, opts: { url: string; root: string; width?: number; height?: number }): Promise<{ profile: Profile; frameworks: string[]; wall: boolean }> {
  const browser = await launchBrowser({ state: loadSignin(opts.root) });
  try {
    const tab = await browser.newTab(opts.width ?? 1280, opts.height ?? 800);
    await open(tab, probeJs, opts.url);
    const frameworks = withVersions(opts.root, await tab.evaluate<string[]>('__peProbe.frameworks()'));
    const profile = await tab.evaluate<Profile>('__peProbe.profile()');
    const wall = await tab.evaluate<boolean>('__peProbe.signinWall()');
    return { profile, frameworks, wall };
  } finally {
    await browser.close();
  }
}

// --- a board against the page it is drawn over -----------------------------------------------------

export interface BoardOnPage {
  /** Why the page was not looked at, if it was not. */
  skipped?: string;
  frameworks: string[];
  /** Where each area is drawn from, as far as the page can tell. */
  areas: Record<string, Where>;
  issues: Issue[];
}

/**
 * Open the page of a live board and see whether the board fits it: every anchor, every selector a
 * patch needs, the steps and marks of every cut, and the component each area belongs to.
 */
export async function checkBoardOnPage(board: Board, probeJs: string, root: string): Promise<BoardOnPage> {
  const out: BoardOnPage = { frameworks: [], areas: {}, issues: [] };
  if (board.base.kind !== 'live') return out;
  const url = board.base.url;
  const warn = (code: string, message: string, where?: string) => out.issues.push({ level: 'warning', code, message, ...(where ? { where } : {}) });
  let browser;
  try {
    browser = await launchBrowser({ state: loadSignin(root) });
  } catch (err) {
    out.skipped = `no browser could be started (${(err as Error).message.split('.')[0]})`;
    return out;
  }
  try {
    const first = board.viewports[0]!;
    const tab = await browser.newTab(first.width, first.height);
    const sources = sourcesOf(root);
    const states = board.cuts.filter((c) => !c.sameAs);
    const seenAreas = new Set<string>();
    for (const [index, state] of states.entries()) {
      try {
        await open(tab, probeJs, url);
      } catch (err) {
        out.skipped = (err as Error).message;
        return out;
      }
      if (index === 0) {
        out.frameworks = withVersions(root, await tab.evaluate<string[]>('__peProbe.frameworks()'));
        if (await tab.evaluate<boolean>('__peProbe.signinWall()')) warn('PAGE_SIGNIN', `${url} shows a sign-in screen to the browser that checks the page. ${SIGNIN_HINT}`);
      }
      if (state.steps) {
        try {
          await playSteps(tab, state.steps, state.seen);
        } catch (err) {
          warn('PAGE_STEPS', `Cut "${state.id}": its steps could not be played on the running page (${(err as Error).message}).`, `cut ${state.id}`);
          continue;
        }
        await calm(tab);
      }
      // Marks of the cuts that show this state.
      for (const cut of board.cuts.filter((c) => c.id === state.id || c.sameAs === state.id)) {
        const marks = [cut.at, cut.seen].filter((s): s is string => Boolean(s));
        if (marks.length === 0) continue;
        const found = await tab.evaluate<Array<{ selector: string; count: number }>>(`__peProbe.describe(${js(marks)})`);
        for (const f of found) if (f.count === 0) warn('PAGE_CUT', `Cut "${cut.id}": "${f.selector}" matches nothing on the running page${state.steps ? ' after its steps' : ''}.`, `cut ${cut.id}`);
      }
      // Each area is looked at in the first state in which it exists.
      const here = board.areas.filter((a) => !seenAreas.has(a.id) && (a.cuts ? a.cuts.includes(state.id) : index === 0));
      for (const area of here) {
        seenAreas.add(area.id);
        if (!area.anchor) continue;
        // An area that depends on the choice of another is looked at with that choice in place.
        const hosts: ProbePatch[] = Object.entries(area.when ?? {}).flatMap(([hostId, options]) => {
          const host = board.areas.find((a) => a.id === hostId);
          const option = host?.options.find((o) => o.id === options[0]);
          return host?.anchor && option?.patch ? [{ area: host.id, anchor: host.anchor, patch: option.patch, page: Boolean(option.page) }] : [];
        });
        if (hosts.length > 0) await tab.evaluate(`__peProbe.apply(${js(hosts)})`);
        const [seen] = await tab.evaluate<Array<Seen | { selector: string; count: 0 }>>(`__peProbe.describe(${js([area.anchor])})`);
        if (!seen || seen.count === 0) {
          warn('PAGE_ANCHOR', `Area "${area.id}": the anchor "${area.anchor}" matches nothing on the running page${state.steps ? ` in cut "${state.id}"` : ''}.`, `area ${area.id}`);
        } else {
          if (seen.count > 1) warn('PAGE_ANCHOR_MANY', `Area "${area.id}": the anchor "${area.anchor}" matches ${seen.count} elements; the first one is used. Make it match one.`, `area ${area.id}`);
          const where = locate(sources, (seen as Seen).owner);
          if (where) out.areas[area.id] = where;
          const patches: ProbePatch[] = area.options.filter((o) => o.patch).map((o) => ({ area: o.id, anchor: area.anchor!, patch: o.patch!, page: Boolean(o.page) }));
          const missing = await tab.evaluate<Record<string, string[]>>(`__peProbe.missing(${js(patches)})`);
          for (const [option, selectors] of Object.entries(missing)) {
            if (selectors.length > 0) warn('PAGE_TARGET', `Area "${area.id}", option "${option}": "${selectors.join('", "')}" matches nothing ${area.options.find((o) => o.id === option)?.page ? 'on the running page' : 'inside the anchor on the running page'}.`, `area ${area.id}`);
          }
          const declared = area.source;
          const inside = where && declared?.component && !where.components.includes(declared.component) ? await tab.evaluate<string[]>(`__peProbe.drawnInside(${js(area.anchor)})`) : [];
          if (where && declared?.component && where.components.length > 0 && !where.components.includes(declared.component) && !inside.includes(declared.component)) {
            warn('PAGE_SOURCE', `Area "${area.id}": the board names the component "${declared.component}", but on the running page its element is drawn by ${whereText(where)}.`, `area ${area.id}`);
          } else if (where?.file && !declared && !/^(\.\.|\/)/.test(where.file)) {
            warn('PAGE_SOURCE', `Area "${area.id}" has no "source". On the running page it is drawn by ${whereText(where)}: "source": ${js({ file: where.file, ...(where.components[0] ? { component: where.components[0] } : {}), ...(where.line ? { line: where.line } : {}) })}`, `area ${area.id}`);
          }
        }
        if (hosts.length > 0) await tab.evaluate('__peProbe.apply([])');
      }
    }
    return out;
  } catch (err) {
    out.skipped = (err as Error).message;
    return out;
  } finally {
    await browser.close();
  }
}
