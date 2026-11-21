import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { activeAreas, stateOf } from '../core/graph.js';
import { getCatalog } from '../catalog/load.js';
import { MEASURE_VERSION, TOLERANCE, compareArea, describeDifference, describeSign, type Difference, type Tolerance } from '../core/measure.js';
import { Built, describeIssues, type Area, type Board, type Cut, type Option } from '../core/schema.js';
import { PeError, nowIso, readJson, resolveInside, sha256, writeJsonAtomic } from '../session/fs.js';
import { readView } from '../session/review.js';
import { readPack, readRevision } from '../session/revisions.js';
import { appendEvent, sessionPaths, type Ws } from '../session/store.js';
import type { Step } from '../stage/protocol.js';
import { launchBrowser } from './browser.js';
import { loadSignin } from './signin.js';
import { capture, openPage, pixelDifference, type AreaShot, type View } from './capture.js';
import { sourceLocator, whereText, type Where } from './page.js';
import type { ProbePatch, Seen } from './probe.js';

/** The two scripts the headless browser needs, built into the CLI. */
export interface CheckAssets {
  'probe.js': string;
  'composer.js': string;
}

/** The approved mockup, measured before any code was written. */
export interface AnswerKey {
  schema: 'picky-eater/answer-key';
  /** The way of measuring it was taken with (MEASURE_VERSION). */
  measure: number;
  approval: string;
  revision: number;
  digest: string;
  capturedAt: string;
  kind: 'sketch' | 'live';
  /** Live boards: the page the key was taken from, with the approved patches laid over it. */
  url: string | null;
  browser: string;
  /** Live boards: hashes of the source files of the areas when the key was taken. */
  sources: Record<string, string>;
  /** Live boards: the component and source file that draw each area, as the running page told it. */
  drawnBy?: Record<string, Where>;
  views: View[];
  areaShots: AreaShot[];
}

export interface CheckResult {
  schema: 'picky-eater/check';
  id: string;
  approval: string;
  at: string;
  url: string;
  browser: string;
  ok: boolean;
  differences: Difference[];
  views: View[];
  /** Per area: its picture, and the share of pixels that differ from the approved one. */
  areaShots: Array<AreaShot & { pixels: number | null }>;
}

export interface Report {
  schema: 'picky-eater/report';
  approval: string;
  check: string;
  ok: boolean;
  differences: number;
  summary: string;
  /** Differences that stay, each with its reason. */
  deviations: string[];
  at: string;
}

interface Approved {
  approval: string;
  revision: number;
  digest: string;
  board: Board;
  choices: Record<string, string>;
  /** Areas that exist under the approved choices, with the option that was chosen. */
  areas: Array<{ area: Area; option: Option }>;
  dir: string;
}

function approved(ws: Ws, id: string): Approved {
  const view = readView(ws, id);
  if (view.phase !== 'approved' || !view.approval) {
    throw new PeError('Nothing is approved yet. The person approves in the review page; run "picky-eater wait" until it reports "approved".', 'NOT_APPROVED');
  }
  const { board, manifest, dir } = readRevision(ws, id, view.approval.revision);
  if (manifest.digest !== view.approval.digest) throw new PeError('The approved revision was changed after it was approved. Publish a new revision and ask for approval again.', 'REVISION_DAMAGED');
  const placements = Object.fromEntries(Object.entries(manifest.areas).map(([area, a]) => [area, a.placement]));
  const choices = view.approval.choices;
  const areas = activeAreas(board, placements, choices).map((areaId) => {
    const area = board.areas.find((a) => a.id === areaId)!;
    return { area, option: area.options.find((o) => o.id === choices[areaId])! };
  });
  return { approval: view.approval.id, revision: view.approval.revision, digest: manifest.digest, board, choices, areas, dir };
}

/** Areas in which a motion was offered: one of their options uses a motion pattern that moves. */
function movingAreas(board: Board): Set<string> {
  const moves = new Set(getCatalog().patterns.filter((p) => p.motion && p.motion.intensity !== 'none').map((p) => p.id));
  return new Set(board.areas.filter((area) => area.options.some((o) => o.pattern && moves.has(o.pattern))).map((area) => area.id));
}

const inState = (a: Approved, state: string) => a.areas.filter(({ area }) => !area.cuts || area.cuts.includes(state));
const stateCut = (board: Board, state: string): Cut => board.cuts.find((c) => c.id === state)!;

function sourceHashes(ws: Ws, a: Approved): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { area } of a.areas) {
    const file = area.source?.file;
    if (!file || file in out) continue;
    try {
      const abs = resolveInside(ws.root, file);
      if (existsSync(abs)) out[file] = sha256(readFileSync(abs));
    } catch {
      /* a path outside the project is not fingerprinted */
    }
  }
  return out;
}

export function readAnswerKey(ws: Ws, id: string, approval: string): AnswerKey | null {
  const file = join(sessionPaths(ws, id).answerKeyDir(approval), 'key.json');
  if (!existsSync(file)) return null;
  const key = readJson(file) as AnswerKey;
  return key.schema === 'picky-eater/answer-key' ? key : null;
}

/** The newest comparison for an approval, or null. */
export function latestCheck(ws: Ws, id: string, approval: string): CheckResult | null {
  const dir = sessionPaths(ws, id).checksDir;
  if (!existsSync(dir)) return null;
  const ids = readdirSync(dir)
    .filter((name) => /^c\d+$/.test(name) && existsSync(join(dir, name, 'result.json')))
    .sort((x, y) => Number(y.slice(1)) - Number(x.slice(1)));
  for (const name of ids) {
    const result = readJson(join(dir, name, 'result.json')) as CheckResult;
    if (result.schema === 'picky-eater/check' && result.approval === approval) return result;
  }
  return null;
}

export function readReport(ws: Ws, id: string, approval: string): Report | null {
  const file = sessionPaths(ws, id).reportFile;
  if (!existsSync(file)) return null;
  const report = readJson(file) as Report;
  return report.schema === 'picky-eater/report' && report.approval === approval ? report : null;
}

function readBuilt(ws: Ws, id: string): Built {
  const file = sessionPaths(ws, id).builtFile;
  if (!existsSync(file)) return { areas: {}, cuts: {} };
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new PeError(`built.json is not valid JSON: ${(err as Error).message}`, 'INVALID_BUILT');
  }
  const parsed = Built.safeParse(json);
  if (!parsed.success) throw new PeError(`built.json is not valid:\n  ${describeIssues(parsed.error).join('\n  ')}`, 'INVALID_BUILT');
  return parsed.data;
}

export interface KeyOutcome {
  key: AnswerKey;
  /** False when a key for this approval was already there and was kept. */
  fresh: boolean;
  /** Source files that changed since the key was taken. */
  changed: string[];
}

/**
 * Measure the approved mockup: on a new screen the composed mockup, on an existing page the
 * running page with the approved patches laid over it. Taken once per approval, before the code
 * changes; afterwards the page it was taken from no longer exists.
 */
export async function captureAnswerKey(ws: Ws, id: string, assets: CheckAssets, opts: { recapture?: boolean } = {}): Promise<KeyOutcome> {
  const a = approved(ws, id);
  const dir = sessionPaths(ws, id).answerKeyDir(a.approval);
  const existing = readAnswerKey(ws, id, a.approval);
  // A mockup can be measured again at any time; a key of another version is simply replaced.
  const outdated = existing !== null && existing.measure !== MEASURE_VERSION && a.board.base.kind === 'sketch';
  if (existing && !opts.recapture && !outdated) {
    const now = sourceHashes(ws, a);
    return { key: existing, fresh: false, changed: Object.keys(existing.sources).filter((file) => now[file] !== existing.sources[file]) };
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const base = a.board.base;
  const drawnBy: Record<string, Where> = {};
  const browser = await launchBrowser({ state: loadSignin(ws.root) });
  try {
    let taken;
    if (base.kind === 'sketch') {
      const pack = readPack(ws, id, a.revision);
      const composer = await browser.newTab(800, 600);
      await composer.evaluate(assets['composer.js']);
      await composer.evaluate(`window.__pack = ${JSON.stringify(pack)}; 0`);
      taken = await capture({
        browser,
        board: a.board,
        dir,
        probeJs: assets['probe.js'],
        mockup: true,
        moving: movingAreas(a.board),
        areas: (state) => inState(a, state).map(({ area }) => ({ id: area.id, selectors: [`[data-pe-area="${area.id}"]`] })),
        at: (cut) => cut.at ?? null,
        open: async (tab, _viewport, state) => {
          const html = await composer.evaluate<string>(`__peCompose(__pack, ${JSON.stringify({ choices: a.choices, state })})`);
          await tab.setContent(html);
          await tab.evaluate(assets['probe.js']);
          await tab.evaluate('__peProbe.still()');
          await tab.evaluate(`__peProbe.fill(${JSON.stringify(stateCut(a.board, state).fill ?? {})})`);
          await tab.evaluate('__peProbe.settle()');
          return null;
        },
      });
      await composer.close();
    } else {
      const locate = sourceLocator(ws.root);
      const patches: ProbePatch[] = a.areas.filter(({ option }) => option.patch).map(({ area, option }) => ({ area: area.id, anchor: area.anchor ?? '', patch: option.patch!, page: Boolean(option.page) }));
      taken = await capture({
        browser,
        board: a.board,
        dir,
        probeJs: assets['probe.js'],
        mockup: false,
        moving: movingAreas(a.board),
        areas: (state) => inState(a, state).map(({ area, option }) => ({ id: area.id, selectors: [area.anchor, option.focus].filter((s): s is string => Boolean(s)) })),
        at: (cut) => cut.at ?? null,
        open: (tab, _viewport, state) =>
          openPage(tab, assets['probe.js'], base.url, patches, stateCut(a.board, state).steps, async () => {
            // While the page is open anyway: which component draws each area, so that the code is changed in the
            // right place. Asked before the patches are laid over the page, which may move an anchor out of reach.
            const ask = inState(a, state).filter(({ area }) => area.anchor && !(area.id in drawnBy));
            if (ask.length === 0) return;
            try {
              const seen = await tab.evaluate<Array<Seen | { selector: string; count: 0 }>>(`__peProbe.describe(${JSON.stringify(ask.map(({ area }) => area.anchor))})`);
              ask.forEach(({ area }, i) => {
                const where = seen[i] && seen[i].count > 0 ? locate((seen[i] as Seen).owner) : undefined;
                if (where) drawnBy[area.id] = where;
              });
            } catch {
              /* the page does not say; the board's "source" still does */
            }
          }, stateCut(a.board, state).seen),
      });
    }
    const key: AnswerKey = {
      schema: 'picky-eater/answer-key',
      measure: MEASURE_VERSION,
      approval: a.approval,
      revision: a.revision,
      digest: a.digest,
      capturedAt: nowIso(),
      kind: base.kind,
      url: base.kind === 'live' ? base.url : null,
      browser: browser.version,
      sources: sourceHashes(ws, a),
      ...(Object.keys(drawnBy).length > 0 ? { drawnBy } : {}),
      views: taken.views,
      areaShots: taken.areaShots,
    };
    writeJsonAtomic(join(dir, 'key.json'), key);
    appendEvent(ws, id, 'answer-key-captured', { approval: a.approval, views: key.views.length });
    return { key, fresh: true, changed: [] };
  } catch (err) {
    rmSync(dir, { recursive: true, force: true }); // half a key is worse than none
    throw err;
  } finally {
    await browser.close();
  }
}

/** Form values of a mockup cut, as the actions that produce them on a real page. */
const fillSteps = (cut: Cut): Step[] =>
  Object.entries(cut.fill ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([selector, value]) => ({ fill: selector, value }));

/** Measure the built page the same way as the approved one, and list what differs. */
export async function runCheck(ws: Ws, id: string, assets: CheckAssets, opts: { url?: string; tolerance?: Tolerance } = {}): Promise<CheckResult> {
  const a = approved(ws, id);
  let key = readAnswerKey(ws, id, a.approval);
  if (!key) throw new PeError('There is no answer key for this approval yet. Run "picky-eater implement" before you change any code.', 'NO_ANSWER_KEY');
  if (key.measure !== MEASURE_VERSION) {
    if (a.board.base.kind === 'live') {
      throw new PeError(
        'The approved page was measured by another version of picky-eater, and those measurements cannot be compared with this one. The page it was taken from is the page before your changes: set the changes aside (git stash), run "picky-eater implement --recapture", bring them back, then check again.',
        'KEY_OUTDATED',
      );
    }
    key = (await captureAnswerKey(ws, id, assets)).key;
  }
  const built = readBuilt(ws, id);
  const base = a.board.base;
  const url = opts.url ?? built.url ?? (base.kind === 'live' ? base.url : undefined);
  if (!url) {
    throw new PeError(`Say where the built page is: write ${sessionPaths(ws, id).builtFile} with "url" and a selector for each area (see "picky-eater implement"), or pass --url.`, 'NO_BUILT_URL');
  }
  if (!/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{2,5}\//.test(url)) throw new PeError('The built page must be on a development server on this machine, e.g. http://localhost:5173/pricing', 'USAGE');
  if (base.kind === 'sketch') {
    const unmapped = a.areas.map(({ area }) => area.id).filter((areaId) => !built.areas[areaId]);
    if (unmapped.length) {
      throw new PeError(`built.json does not say which element implements: ${unmapped.join(', ')}. Add a selector for each under "areas".`, 'BUILT_AREAS');
    }
  }
  const tolerance = opts.tolerance ?? TOLERANCE;
  const paths = sessionPaths(ws, id);
  mkdirSync(paths.checksDir, { recursive: true });
  const last = readdirSync(paths.checksDir)
    .filter((name) => /^c\d+$/.test(name))
    .reduce((max, name) => Math.max(max, Number(name.slice(1))), 0);
  const checkId = `c${last + 1}`;
  const dir = join(paths.checksDir, checkId);

  const browser = await launchBrowser({ state: loadSignin(ws.root) });
  try {
    const taken = await capture({
      browser,
      board: a.board,
      dir,
      probeJs: assets['probe.js'],
      mockup: false,
      moving: movingAreas(a.board),
      areas: (state) =>
        inState(a, state).map(({ area, option }) => ({
          id: area.id,
          selectors: built.areas[area.id] ? [built.areas[area.id]!] : [area.anchor, option.focus].filter((s): s is string => Boolean(s)),
        })),
      at: (cut) => built.cuts[cut.id]?.at ?? cut.at ?? null,
      open: (tab, _viewport, state) => {
        const cut = stateCut(a.board, state);
        // The mark of the moment is the board's: it is waited for where the built page is reached by the board's own steps.
        return openPage(tab, assets['probe.js'], url, [], built.cuts[state]?.steps ?? (base.kind === 'live' ? cut.steps : fillSteps(cut)), undefined, base.kind === 'live' && !built.cuts[state]?.steps ? cut.seen : undefined);
      },
    });

    const differences: Difference[] = [];
    for (const want of key.views) {
      const got = taken.views.find((v) => v.viewport === want.viewport && v.cut === want.cut);
      if (!got) continue;
      const at = { viewport: want.viewport, cut: want.cut };
      if (got.problem) {
        differences.push({ ...at, area: 'page', element: null, property: 'cut', approved: 'reached', built: got.problem });
        continue;
      }
      for (const area of want.areas) differences.push(...compareArea(area, got.areas.find((x) => x.id === area.id), at, tolerance, { extraMotion: base.kind === 'live' }));
    }
    const pixelTab = await browser.newTab(400, 300);
    const areaShots: CheckResult['areaShots'] = [];
    for (const shot of taken.areaShots) {
      const want = key.areaShots.find((s) => s.viewport === shot.viewport && s.area === shot.area);
      let pixels: number | null = null;
      if (want) {
        pixels = await pixelDifference(pixelTab, readFileSync(join(paths.answerKeyDir(a.approval), want.shot)), readFileSync(join(dir, shot.shot)));
        // The picture is the last resort: it is only named when the measurements of the area agree.
        if (pixels > tolerance.pixels && !differences.some((d) => d.area === shot.area)) {
          const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
          differences.push({ viewport: shot.viewport, cut: shot.cut, area: shot.area, element: null, property: 'pixels', approved: percent(tolerance.pixels), built: percent(pixels) });
        }
      }
      areaShots.push({ ...shot, pixels });
    }
    const result: CheckResult = { schema: 'picky-eater/check', id: checkId, approval: a.approval, at: nowIso(), url, browser: browser.version, ok: differences.length === 0, differences, views: taken.views, areaShots };
    writeJsonAtomic(join(dir, 'result.json'), result);
    appendEvent(ws, id, 'check', { id: checkId, approval: a.approval, differences: differences.length });
    return result;
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  } finally {
    await browser.close();
  }
}

/**
 * One line per difference. The same difference usually shows at every width and in every moment;
 * it is printed once, with the places it was seen in.
 */
export function differenceLines(differences: Difference[]): string[] {
  const groups = new Map<string, { first: Difference; viewports: string[]; cuts: string[] }>();
  for (const d of differences) {
    const key = JSON.stringify([d.area, d.element, d.property, d.approved, d.built]);
    const group = groups.get(key) ?? { first: d, viewports: [], cuts: [] };
    if (!group.viewports.includes(d.viewport)) group.viewports.push(d.viewport);
    if (!group.cuts.includes(d.cut)) group.cuts.push(d.cut);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ first, viewports, cuts }) =>
    describeDifference({ ...first, viewport: viewports.join(' and '), cut: cuts.length > 2 ? `${cuts.slice(0, 2).join(', ')} and ${cuts.length - 2} more` : cuts.join(', ') }),
  );
}

/** The differences of a comparison for people: grouped, and told apart by area. */
export function differencesByArea(differences: Difference[]): Array<{ area: string; text: string }> {
  const groups = new Map<string, Difference>();
  for (const d of differences) groups.set(JSON.stringify([d.area, d.element, d.property, d.approved, d.built]), d);
  return [...groups.values()].map((d) => ({ area: d.area, text: describeDifference(d).replace(/^[^:]*: /, '') }));
}

/** What to build, in a few lines: only the approved options, with their notes and where they go. */
export function brief(ws: Ws, id: string): string[] {
  const a = approved(ws, id);
  const key = readAnswerKey(ws, id, a.approval);
  const lines: string[] = [];
  const rel = (path: string) => join(a.dir, path).slice(ws.root.length + 1);
  for (const { area, option } of a.areas) {
    lines.push(`  ${area.id} (${area.label}): ${option.id} — ${option.label}${option.pattern ? ` [${option.pattern}]` : ''}`);
    if (option.build) lines.push(`      build: ${option.build}`);
    if (option.html) lines.push(`      mockup: ${rel(option.html)}`);
    if (area.source) lines.push(`      source: ${area.source.file}${area.source.selector ? `  ${area.source.selector}` : ''}${area.source.component ? `  <${area.source.component}>` : ''}`);
    const drawn = whereText(key?.drawnBy?.[area.id]);
    if (drawn) lines.push(`      on the running page${area.anchor ? ` "${area.anchor}"` : ''} is drawn by: ${drawn}`);
    if (option.keep) lines.push('      nothing changes here');
    else if (option.patch) lines.push(`      patch (a preview, not the implementation): ${JSON.stringify(option.patch)}`);
    // What moves is part of what was approved, and will be held against the built page.
    const measured = key?.views.flatMap((v) => v.areas).find((m) => m.id === area.id && m.motion);
    if (measured?.motion) {
      lines.push(`      moves (measured, to be built as such): ${measured.motion.length ? measured.motion.map(describeSign).join('; ') : 'nothing'}`);
      lines.push(`      with reduced motion: ${measured.reduced?.length ? measured.reduced.map(describeSign).join('; ') : 'nothing moves'}`);
    }
  }
  const base = a.board.base;
  if (base.kind === 'sketch') {
    lines.push(`  page frame: ${rel(base.frame)}${base.styles?.length ? `   shared styles: ${base.styles.map(rel).join(', ')}` : ''}`);
    const usesKit = a.areas.some(({ option }) => option.html && /class\s*=\s*["'][^"']*\bpk-/.test(readFileSync(join(a.dir, option.html), 'utf8')));
    if (usesKit) lines.push('  These mockups use built-in kit classes (pk-*). They exist only in mockups: "picky-eater kit" prints their styles, to be written in the project\'s own code.');
  }
  return lines;
}

/** What built.json has to say for this board, as lines for the agent. */
export function builtHint(ws: Ws, id: string): string[] {
  const a = approved(ws, id);
  const file = sessionPaths(ws, id).builtFile.slice(ws.root.length + 1);
  const states = a.board.cuts.filter((c, i) => i > 0 && !c.sameAs);
  if (a.board.base.kind === 'live') {
    return [
      `The built page is compared at ${a.board.base.url}, with the anchors and steps of the board.`,
      `Only if the implementation moved things, say so in ${file}: {"areas": {"<area>": "<selector>"}, "cuts": {"<cut>": {"steps": [...]}}}`,
    ];
  }
  const example = {
    url: 'http://localhost:<port>/<path>',
    areas: Object.fromEntries(a.areas.map(({ area }) => [area.id, '<selector>'])),
    ...(states.length ? { cuts: Object.fromEntries(states.slice(0, 1).map((c) => [c.id, { steps: [{ click: '<selector>' }] }])) } : {}),
  };
  return [
    `When the page is built, write ${file}: where it is, and which element implements each area.`,
    `  ${JSON.stringify(example)}`,
    ...(states.length ? [`  Moments that are reached by acting in the page need "steps" (scroll, fill, click, wait): ${states.map((c) => `${c.id} (${c.label})`).join(', ')}`] : []),
    '  Scroll targets ("at") are taken from the board; name another one under "cuts" if the built page uses other ids.',
  ];
}

export function writeReport(ws: Ws, id: string, input: { summary: string; deviations: string[]; attached: string[] }): Report {
  const a = approved(ws, id);
  const check = latestCheck(ws, id, a.approval);
  if (!check) throw new PeError('The built page has not been compared yet. Run "picky-eater check" first.', 'NO_CHECK');
  if (input.attached.length) throw new PeError(`picky-eater's script tag is still in ${input.attached.join(', ')}. Run "picky-eater detach" first.`, 'TAG_PRESENT');
  if (!check.ok && input.deviations.length === 0) {
    throw new PeError(`The last comparison (${check.id}) found ${check.differences.length} difference(s). Fix them and run "picky-eater check" again, or explain each one that stays with --deviation "<area>: <why>".`, 'DIFFERENCES');
  }
  const report: Report = { schema: 'picky-eater/report', approval: a.approval, check: check.id, ok: check.ok, differences: check.differences.length, summary: input.summary, deviations: input.deviations, at: nowIso() };
  writeJsonAtomic(sessionPaths(ws, id).reportFile, report);
  appendEvent(ws, id, 'report', { approval: a.approval, check: check.id, ok: check.ok, deviations: input.deviations.length });
  return report;
}
