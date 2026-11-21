import { findCycle, stateCuts } from './graph.js';
import { ASSET_EXTENSIONS, lintCss, scanHtml } from './lint.js';
import { lintMotion, type MotionRange } from './motion.js';
import { Board, describeIssues, isSafeRelativePath, type Area, type PatchOp, type Placements } from './schema.js';

export interface Issue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  /** The file or board field the issue is about. */
  where?: string;
}

/** How the validator reads the draft folder. Paths are relative to it. */
export interface DraftReader {
  text(path: string): string | null;
  size(path: string): number | null;
}

export interface ValidationResult {
  ok: boolean;
  issues: Issue[];
  board?: Board;
  placements?: Placements;
  /** Text files the board uses (frame, styles, sketches, options). */
  files?: string[];
  /** Image files the mockup refers to. */
  assets?: string[];
}

export const LIMITS = {
  textFile: 200 * 1024,
  asset: 512 * 1024,
  total: 4 * 1024 * 1024,
  /** Above this an option stops being "a small piece"; a warning, not an error. */
  optionHint: 6 * 1024,
  areasHint: 8,
};

/**
 * Check a draft: structure, safety of every mockup file, that every area has a place on the page,
 * that the area graph has no cycle, and that every cut reference resolves.
 */
export interface ValidateOptions {
  /** Ids of the pattern catalog; an option's "pattern" must be one of them. */
  patternIds?: ReadonlySet<string>;
  /** Whether a file exists in the user's project. Used to check "source" on boards over an existing page. */
  projectFile?: (path: string) => string | null;
  /** Ids of the catalog's decisions; an area's "decision" must be one of them. */
  decisionIds?: ReadonlySet<string>;
  /** For a catalog pattern that is a motion: the time it allows. Undefined for every other pattern. */
  motionOf?: (pattern: string) => MotionRange | undefined;
}

export function validateDraft(boardJson: unknown, reader: DraftReader, opts: ValidateOptions = {}): ValidationResult {
  const issues: Issue[] = [];
  const error = (code: string, message: string, where?: string) => issues.push({ level: 'error', code, message, ...(where ? { where } : {}) });
  const warn = (code: string, message: string, where?: string) => issues.push({ level: 'warning', code, message, ...(where ? { where } : {}) });
  const done = (extra: Partial<ValidationResult> = {}): ValidationResult => ({ ok: !issues.some((i) => i.level === 'error'), issues, ...extra });

  const parsed = Board.safeParse(boardJson);
  if (!parsed.success) {
    for (const line of describeIssues(parsed.error)) error('BOARD_SCHEMA', line, 'board.json');
    return done();
  }
  const board = parsed.data;

  // --- ids ---------------------------------------------------------------------------------
  const dup = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(dup(board.areas.map((a) => a.id)))) error('DUPLICATE_ID', `Two areas have the id "${id}".`, 'board.json');
  for (const id of new Set(dup(board.cuts.map((c) => c.id)))) error('DUPLICATE_ID', `Two cuts have the id "${id}".`, 'board.json');
  for (const id of new Set(dup(board.viewports.map((v) => v.id)))) error('DUPLICATE_ID', `Two viewports have the id "${id}".`, 'board.json');
  const areaIds = new Set(board.areas.map((a) => a.id));

  if (board.base.kind === 'live') {
    const placements = validateLive(board, opts, error, warn);
    return done({ board, placements, files: [], assets: [] });
  }

  // --- cuts --------------------------------------------------------------------------------
  const states = new Set(stateCuts(board));
  if (board.cuts[0]?.sameAs) error('CUT_ORDER', `The first cut ("${board.cuts[0].id}") is the page as it opens; it cannot use "sameAs".`, 'board.json');
  for (const cut of board.cuts) {
    if (cut.sameAs && !states.has(cut.sameAs)) {
      error('CUT_REFERENCE', `Cut "${cut.id}" says sameAs "${cut.sameAs}", which is not a cut with its own page state.`, 'board.json');
    }
    if (cut.sameAs && cut.fill) error('CUT_FILL', `Cut "${cut.id}" shares the state of "${cut.sameAs}", so it cannot have its own "fill".`, 'board.json');
    if (cut.sameAs && !cut.at) error('CUT_AT', `Cut "${cut.id}" shares the state of "${cut.sameAs}"; give it "at" so it shows another part of the page.`, 'board.json');
    if (cut.steps || cut.seen) error('CUT_LIVE_ONLY', `Cut "${cut.id}": "steps" and "seen" are for boards over an existing page.`, 'board.json');
  }

  // --- files -------------------------------------------------------------------------------
  let total = 0;
  const files: string[] = [];
  const assets = new Set<string>();
  const readText = (path: string, what: string): string | null => {
    const size = reader.size(path);
    if (size === null) {
      error('FILE_MISSING', `${what} "${path}" does not exist in the draft folder.`, path);
      return null;
    }
    if (size > LIMITS.textFile) {
      error('FILE_TOO_LARGE', `${what} "${path}" is ${Math.round(size / 1024)} KB; the limit is ${LIMITS.textFile / 1024} KB.`, path);
      return null;
    }
    total += size;
    if (!files.includes(path)) files.push(path);
    return reader.text(path);
  };
  const addAssets = (from: string, refs: string[]) => {
    const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : '';
    for (const ref of refs) {
      // Images are named relative to the draft folder, or relative to the file that uses them.
      const candidates = [ref, dir + ref].filter((p) => isSafeRelativePath(p));
      const found = candidates.find((p) => reader.size(p) !== null);
      if (!found) {
        error('ASSET_MISSING', `"${ref}" is used in ${from} but does not exist in the draft folder.`, from);
        continue;
      }
      const ext = found.slice(found.lastIndexOf('.') + 1).toLowerCase();
      if (!ASSET_EXTENSIONS.includes(ext)) {
        error('ASSET_TYPE', `"${ref}" is not an image (${ASSET_EXTENSIONS.join(', ')}).`, from);
        continue;
      }
      const size = reader.size(found)!;
      if (size > LIMITS.asset) {
        error('FILE_TOO_LARGE', `Image "${found}" is ${Math.round(size / 1024)} KB; the limit is ${LIMITS.asset / 1024} KB.`, found);
        continue;
      }
      if (!assets.has(found)) total += size;
      assets.add(found);
    }
  };

  const cutRefs: Array<{ id: string; where: string }> = [];
  const scanFile = (path: string, what: string, frame = false) => {
    const text = readText(path, what);
    if (text === null) return null;
    const scan = scanHtml(text, { frame });
    for (const i of scan.issues) error(i.code, i.message, path);
    for (const id of scan.cutRefs) cutRefs.push({ id, where: path });
    addAssets(path, scan.assets);
    return scan;
  };

  const placements: Placements = Object.fromEntries(board.areas.map((a) => [a.id, { inFrame: false, hosts: [] }]));
  const place = (slot: string, where: string, host: { area: string; option: string } | null) => {
    if (!areaIds.has(slot)) {
      error('UNKNOWN_AREA', `data-pe-area="${slot}" in ${where} names an area that is not in board.json.`, where);
      return;
    }
    const p = placements[slot]!;
    if (!host) p.inFrame = true;
    else if (host.area === slot) error('AREA_CYCLE', `Area "${slot}" contains its own slot in option "${host.option}".`, where);
    else if (!p.hosts.some((h) => h.area === host.area && h.option === host.option)) p.hosts.push(host);
  };

  if (board.base.kind !== 'sketch') return done({ board });
  const frame = scanFile(board.base.frame, 'The page frame', true);
  if (frame) {
    if (frame.slots.length === 0) error('NO_SLOTS', `The page frame has no data-pe-area="…" element, so no area would appear on the page.`, board.base.frame);
    for (const slot of frame.slots) place(slot, board.base.frame, null);
  }
  for (const path of board.base.styles ?? []) {
    const css = readText(path, 'Stylesheet');
    if (css === null) continue;
    const r = lintCss(css, path);
    for (const i of r.issues) error(i.code, i.message, path);
    addAssets(path, r.assets);
    for (const i of lintMotion(css)) warn(i.code, `${path}: ${i.message}`, path);
  }

  for (const area of board.areas) {
    const where = `areas.${area.id}`;
    if (area.anchor || area.source || area.when) {
      error('AREA_LIVE_ONLY', `Area "${area.id}": "anchor", "source" and "when" are for boards over an existing page. On a new screen an area is placed by data-pe-area="${area.id}".`, where);
    }
    for (const cut of area.cuts ?? []) {
      if (!states.has(cut)) error('CUT_REFERENCE', `Area "${area.id}" is limited to cut "${cut}", which is not a cut with its own page state.`, where);
    }
    if (area.sketch) {
      const scan = scanFile(area.sketch, 'Sketch');
      if (scan && scan.slots.length > 0) error('SLOT_IN_SKETCH', `The sketch of "${area.id}" contains data-pe-area. Only options can contain other areas.`, area.sketch);
    }
    for (const id of new Set(dup(area.options.map((o) => o.id)))) error('DUPLICATE_ID', `Area "${area.id}" has two options with the id "${id}".`, where);
    if (area.options.filter((o) => o.suggested).length > 1) error('SUGGESTED', `Area "${area.id}" marks more than one option as suggested.`, where);
    checkAdvice(area, opts, error, warn);
    for (const option of area.options) {
      const at = `${where}.${option.id}`;
      if (option.patch || option.page || option.keep) error('OPTION_LIVE_ONLY', `Option "${area.id}/${option.id}": "patch", "keep" and "page" are for boards over an existing page.`, at);
      if (opts.patternIds && option.pattern && !opts.patternIds.has(option.pattern)) {
        error('UNKNOWN_PATTERN', `Option "${area.id}/${option.id}" names pattern "${option.pattern}", which is not in the catalog. Run "picky-eater patterns" to list ids.`, at);
      }
      if (!option.html) {
        error('OPTION_HTML', `Option "${area.id}/${option.id}" needs "html": the fragment that draws it.`, at);
        continue;
      }
      const scan = scanFile(option.html, 'Option');
      if (!scan) continue;
      const size = reader.size(option.html) ?? 0;
      if (size > LIMITS.optionHint) {
        warn('OPTION_LARGE', `Option "${area.id}/${option.id}" is ${Math.round(size / 1024)} KB. Options should be small pieces; move shared styles to a stylesheet.`, option.html);
      }
      for (const slot of scan.slots) place(slot, option.html, { area: area.id, option: option.id });
    }
    const htmls = area.options.map((o) => o.html).filter(Boolean);
    if (new Set(htmls).size !== htmls.length) error('OPTION_SAME_FILE', `Two options of "${area.id}" use the same file, so they would look identical.`, where);
  }

  for (const area of board.areas) {
    const p = placements[area.id]!;
    if (!p.inFrame && p.hosts.length === 0) {
      error('AREA_NOT_PLACED', `Area "${area.id}" has no place on the page. Add data-pe-area="${area.id}" to the page frame or to an option of another area.`, `areas.${area.id}`);
    }
  }
  const cycle = findCycle(placements);
  if (cycle) error('AREA_CYCLE', `Areas contain each other in a loop: ${cycle.join(' → ')}.`, 'board.json');

  for (const ref of cutRefs) {
    if (!states.has(ref.id)) {
      error('CUT_REFERENCE', `"${ref.id}" in ${ref.where} is not a cut with its own page state (${[...states].join(', ')}).`, ref.where);
    }
  }
  if (total > LIMITS.total) error('DRAFT_TOO_LARGE', `The draft is ${Math.round(total / 1024)} KB in total; the limit is ${LIMITS.total / 1024} KB.`);
  if (board.areas.length > LIMITS.areasHint) {
    warn('MANY_AREAS', `${board.areas.length} areas is a lot to decide in one sitting. Keep choices that change the result and fix the rest in the frame.`, 'board.json');
  }
  for (const area of board.areas) {
    if (!area.options.some((o) => o.suggested)) warn('NO_SUGGESTION', `Area "${area.id}" has no suggested option. Mark the one you would pick with "suggested": true.`, `areas.${area.id}`);
  }

  return done({ board, placements, files, assets: [...assets] });
}

type Report = (code: string, message: string, where?: string) => void;

/** What an area says about why its options are these: the decision it answers, the reason of the mark, what was left out. */
function checkAdvice(area: Area, opts: ValidateOptions, error: Report, warn: Report): void {
  const where = `areas.${area.id}`;
  if (area.decision && opts.decisionIds && !opts.decisionIds.has(area.decision)) {
    error('UNKNOWN_DECISION', `Area "${area.id}" names decision "${area.decision}", which is not in the catalog. Run "picky-eater patterns" to list decisions.`, where);
  }
  for (const option of area.options) {
    if (option.because && !option.suggested) {
      warn('BECAUSE_UNUSED', `Option "${area.id}/${option.id}" has "because" but is not the suggested option. The reason is only shown on the mark of the suggested one.`, `${where}.${option.id}`);
    }
  }
  const offered = new Set(area.options.map((o) => o.pattern).filter(Boolean));
  const seen = new Set<string>();
  for (const r of area.rejected ?? []) {
    if (opts.patternIds && !opts.patternIds.has(r.pattern)) error('UNKNOWN_PATTERN', `Area "${area.id}": "rejected" names pattern "${r.pattern}", which is not in the catalog.`, where);
    if (offered.has(r.pattern)) error('REJECTED_OFFERED', `Area "${area.id}": pattern "${r.pattern}" is both an option and in "rejected". Leave it out of one of them.`, where);
    if (seen.has(r.pattern)) error('DUPLICATE_ID', `Area "${area.id}" lists "${r.pattern}" twice in "rejected".`, where);
    seen.add(r.pattern);
  }
}

/** Words that let a script reach the network. A patch script changes how the page behaves; it never sends anything. */
const NETWORK = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|postMessage|indexedDB|localStorage|sessionStorage|cookie)\b|\bimport\s*\(|\b(?:https?|wss?):\/\/|\.(?:src|href|action)\s*=|\blocation\b|\beval\b|\bFunction\s*\(/;

function checkPatch(patch: PatchOp[], name: string, at: string, error: Report, warn: Report): void {
  for (const [i, op] of patch.entries()) {
    const where = `${at}.patch[${i}]`;
    if ('css' in op) {
      for (const issue of lintCss(op.css, 'css', { live: true }).issues) error(issue.code, `${name}: ${issue.message}`, where);
    } else if ('each' in op) {
      checkPatch(op.patch, name, where, error, warn);
    } else if ('insert' in op || 'wrap' in op) {
      const markup = 'insert' in op ? op.insert : op.in;
      for (const issue of scanHtml(markup, { live: true }).issues) error(issue.code, `${name}: ${issue.message}`, where);
      if ('wrap' in op && (!markup.trim().startsWith('<') || markup.replace(/<[^>]*>/g, '').trim() !== '')) {
        error('PATCH_WRAP', `${name}: "in" must be an empty element (it may contain nested empty elements), e.g. <div class="row"></div>.`, where);
      }
    } else if ('set' in op) {
      if (op.text === undefined && !op.attr && !op.addClass && !op.removeClass) error('PATCH_SET', `${name}: "set" needs at least one of "text", "attr", "addClass" or "removeClass".`, where);
      for (const [key, value] of Object.entries(op.attr ?? {})) {
        const k = key.toLowerCase();
        if (k.startsWith('on') || k === 'srcdoc') error('EVENT_HANDLER', `${name}: the attribute "${key}" cannot be set. Patches cannot add code through attributes.`, where);
        else if (value !== null && /^[\s\u0000-\u001f]*(javascript|data|vbscript):/i.test(value)) error('REMOTE_URL', `${name}: "${key}" cannot be a ${value.split(':')[0]!.trim()}: URL.`, where);
        else if (value !== null && ['src', 'href', 'action', 'formaction', 'poster'].includes(k) && (/^[a-z][a-z0-9+.-]*:/i.test(value.trim()) || value.trim().startsWith('//'))) {
          error('REMOTE_URL', `${name}: "${key}" must point inside the app itself; nothing is loaded from the network.`, where);
        } else if (k === 'style' && value !== null) {
          for (const issue of lintCss(value, 'style attribute', { live: true }).issues) error(issue.code, `${name}: ${issue.message}`, where);
        }
      }
    } else if ('script' in op) {
      for (const code of [op.script, op.undo]) {
        const hit = NETWORK.exec(code);
        if (hit) error('SCRIPT_REACH', `${name}: a patch script cannot use "${hit[0].trim()}". It may only change how the page looks and reacts; it never loads, sends or stores anything.`, where);
      }
      warn('APPROXIMATE', `${name} uses a script. It is shown as "Approximate" in the review, and its thumbnail cannot show what the script does. Use "css", "move", "wrap", "set" or "insert" if they can do it.`, where);
    }
  }
}

/** A board over an existing page: no files, only anchors, patches and the steps that reach each cut. */
function validateLive(board: Board, opts: ValidateOptions, error: Report, warn: Report): Placements {
  const states = new Set(stateCuts(board));
  const first = board.cuts[0]!;
  if (first.sameAs || first.steps || first.seen) error('CUT_ORDER', `The first cut ("${first.id}") is the page as it opens; it cannot have "sameAs", "steps" or "seen".`, 'board.json');
  for (const [i, cut] of board.cuts.entries()) {
    if (cut.fill) error('CUT_SKETCH_ONLY', `Cut "${cut.id}": "fill" is for new screens. On an existing page, reach the cut with "steps": [{ "fill": "#email", "value": "…" }].`, 'board.json');
    if (cut.sameAs) {
      if (!states.has(cut.sameAs)) error('CUT_REFERENCE', `Cut "${cut.id}" says sameAs "${cut.sameAs}", which is not a cut with its own page state.`, 'board.json');
      if (!cut.at) error('CUT_AT', `Cut "${cut.id}" shares the state of "${cut.sameAs}"; give it "at" so it shows another part of the page.`, 'board.json');
      if (cut.steps || cut.seen) error('CUT_STEPS', `Cut "${cut.id}" shares the state of "${cut.sameAs}", so it cannot have its own "steps" or "seen".`, 'board.json');
    } else if (i > 0) {
      if (!cut.steps) error('CUT_STEPS', `Cut "${cut.id}" needs "steps": the actions that lead from the freshly opened page to this moment.`, 'board.json');
      if (!cut.seen) warn('CUT_SEEN', `Cut "${cut.id}" has no "seen". Without it the review cannot tell when the person reaches this moment by using the page.`, 'board.json');
    }
  }

  const placements: Placements = {};
  const dup = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const area of board.areas) {
    const where = `areas.${area.id}`;
    if (area.sketch) error('AREA_SKETCH_ONLY', `Area "${area.id}": "sketch" is for new screens. On an existing page the area is the element named by "anchor".`, where);
    if (!area.anchor) error('AREA_ANCHOR', `Area "${area.id}" needs "anchor": a selector for the element it covers on the page.`, where);
    if (!area.source) warn('NO_SOURCE', `Area "${area.id}" has no "source". Say which file (and selector or component) it comes from, so the implementation changes the right place.`, where);
    else if (opts.projectFile) {
      const text = opts.projectFile(area.source.file);
      if (text === null) warn('SOURCE_MISSING', `Area "${area.id}": source file "${area.source.file}" does not exist in the project.`, where);
      else if (area.source.selector) {
        // Without a DOM this can only catch typos: every id and class the selector names should occur in the file.
        const names = [...area.source.selector.matchAll(/[#.]([A-Za-z_][\w-]*)/g)].map((m) => m[1]!);
        const missing = names.filter((n) => !text.includes(n));
        if (missing.length) warn('SOURCE_SELECTOR', `Area "${area.id}": "${missing.join('", "')}" from the source selector does not occur in ${area.source.file}.`, where);
      }
    }
    for (const cut of area.cuts ?? []) {
      if (!states.has(cut)) error('CUT_REFERENCE', `Area "${area.id}" is limited to cut "${cut}", which is not a cut with its own page state.`, where);
    }
    const hosts: Array<{ area: string; option: string }> = [];
    for (const [hostId, options] of Object.entries(area.when ?? {})) {
      const host = board.areas.find((a) => a.id === hostId);
      if (!host || hostId === area.id) {
        error('WHEN_REFERENCE', `Area "${area.id}": "when" names "${hostId}", which is not another area of this board.`, where);
        continue;
      }
      for (const option of options) {
        if (!host.options.some((o) => o.id === option)) error('WHEN_REFERENCE', `Area "${area.id}": "when" names option "${hostId}/${option}", which does not exist.`, where);
        else hosts.push({ area: hostId, option });
      }
    }
    placements[area.id] = { inFrame: !area.when, hosts };

    for (const id of new Set(dup(area.options.map((o) => o.id)))) error('DUPLICATE_ID', `Area "${area.id}" has two options with the id "${id}".`, where);
    if (area.options.filter((o) => o.suggested).length > 1) error('SUGGESTED', `Area "${area.id}" marks more than one option as suggested.`, where);
    if (area.options.filter((o) => o.keep).length !== 1) {
      error('KEEP_OPTION', `Area "${area.id}" needs exactly one option with "keep": true (the page as it is now), so the person can always leave it unchanged.`, where);
    }
    checkAdvice(area, opts, error, warn);
    for (const option of area.options) {
      const at = `${where}.${option.id}`;
      const name = `Option "${area.id}/${option.id}"`;
      if (option.html) error('OPTION_SKETCH_ONLY', `${name}: "html" is for new screens. On an existing page an option is a "patch".`, at);
      if (Boolean(option.patch) === Boolean(option.keep)) error('OPTION_PATCH', `${name} needs either "patch" (what changes) or "keep": true (nothing changes).`, at);
      if (option.keep && option.page) error('OPTION_PATCH', `${name}: "page" only makes sense with a "patch".`, at);
      if (opts.patternIds && option.pattern && !opts.patternIds.has(option.pattern)) {
        error('UNKNOWN_PATTERN', `${name} names pattern "${option.pattern}", which is not in the catalog. Run "picky-eater patterns" to list ids.`, at);
      }
      if (option.patch) {
        checkPatch(option.patch, name, at, error, warn);
        // The motion of an option is the sum of its style sheets: a rule for reduced motion in one of them counts for all.
        const css = option.patch.flatMap((op) => ('css' in op ? [op.css] : [])).join('\n');
        if (css) for (const issue of lintMotion(css, option.pattern ? opts.motionOf?.(option.pattern) : undefined)) warn(issue.code, `${name}: ${issue.message}`, at);
      }
    }
  }
  const cycle = findCycle(placements);
  if (cycle) error('AREA_CYCLE', `Areas depend on each other in a loop: ${cycle.join(' → ')}.`, 'board.json');
  if (board.areas.length > LIMITS.areasHint) {
    warn('MANY_AREAS', `${board.areas.length} areas is a lot to decide in one sitting. Keep the choices that change the result.`, 'board.json');
  }
  for (const area of board.areas) {
    if (!area.options.some((o) => o.suggested)) warn('NO_SUGGESTION', `Area "${area.id}" has no suggested option. Mark the one you would pick with "suggested": true.`, `areas.${area.id}`);
  }
  return placements;
}
