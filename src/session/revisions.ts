import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pruneChoices } from '../core/graph.js';
import { Board, Manifest, SCHEMA_VERSION, describeIssues, type Change, type Placements } from '../core/schema.js';
import { validateDraft, type Issue, type ValidateOptions } from '../core/validate.js';
import { PeError, digestOf, nowIso, readJson, resolveInside, sha256, withLock, writeFileAtomic, writeJsonAtomic } from './fs.js';
import { getCatalog } from '../catalog/load.js';
import { adviceFor, readAdvice, withAdvice, writeAdvice } from '../taste/record.js';
import { appendEvent, folderReader, listApprovals, readChoices, readRequests, readSession, sessionPaths, writeApproval, writeChoices, writeRequests, writeSession, type Ws } from './store.js';

export interface Revision {
  board: Board;
  manifest: Manifest;
  dir: string;
}

/** Everything the browser needs to draw a revision. Immutable once published. */
export interface Pack {
  revision: number;
  digest: string;
  /** The board, with the mark where the person's earlier choices moved it. */
  board: Board;
  placements: Placements;
  /** Text files by path. */
  files: Record<string, string>;
  /** Images by path, as data: URLs. */
  assets: Record<string, string>;
  /** What the review page shows about the options without it being part of the board. */
  notes: Record<string, AreaNotes>;
}

export interface AreaNotes {
  /** Who put the mark where it is. */
  by: 'agent' | 'taste' | null;
  /** Candidates that were left out, with the name a person knows them by. */
  rejected: Array<{ pattern: string; name: string; why: string }>;
  /** Options that move: their thumbnail stands still, so they are marked. */
  moving: string[];
}

/** For each area: who suggested, what was left out, and which options are motions. */
export function notesOf(board: Board, advice: ReturnType<typeof readAdvice>): Record<string, AreaNotes> {
  const patterns = new Map(getCatalog().patterns.map((p) => [p.id, p]));
  return Object.fromEntries(
    board.areas.map((area) => [
      area.id,
      {
        by: advice[area.id] ? ('taste' as const) : area.options.some((o) => o.suggested) ? ('agent' as const) : null,
        rejected: (area.rejected ?? []).map((r) => ({ pattern: r.pattern, name: patterns.get(r.pattern)?.name ?? r.pattern, why: r.why })),
        moving: area.options.filter((o) => o.pattern && (patterns.get(o.pattern)?.motion?.intensity ?? 'none') !== 'none').map((o) => o.id),
      },
    ]),
  );
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml' };

export function readRevision(ws: Ws, id: string, n: number): Revision {
  const dir = sessionPaths(ws, id).revisionDir(n);
  if (!existsSync(join(dir, 'manifest.json'))) throw new PeError(`Revision r${n} does not exist.`, 'NO_REVISION');
  const manifest = Manifest.safeParse(readJson(join(dir, 'manifest.json')));
  const board = Board.safeParse(readJson(join(dir, 'board.json')));
  if (!manifest.success || !board.success) {
    const lines = [...(manifest.success ? [] : describeIssues(manifest.error)), ...(board.success ? [] : describeIssues(board.error))];
    throw new PeError(`Revision r${n} is damaged:\n  ${lines.join('\n  ')}`, 'REVISION_DAMAGED');
  }
  return { board: board.data, manifest: manifest.data, dir };
}

/** Read a revision's files, refusing any whose bytes no longer match what was published. */
export function readPack(ws: Ws, id: string, n: number): Pack {
  const { board, manifest, dir } = readRevision(ws, id, n);
  const files: Record<string, string> = {};
  const assets: Record<string, string> = {};
  for (const [path, hash] of Object.entries(manifest.files)) {
    const bytes = readFileSync(resolveInside(dir, path));
    if (sha256(bytes) !== hash) throw new PeError(`Revision r${n} was modified after it was published (${path}). Publish a new revision instead.`, 'REVISION_DAMAGED');
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    if (MIME[ext]) assets[path] = `data:${MIME[ext]};base64,${bytes.toString('base64')}`;
    else files[path] = bytes.toString('utf8');
  }
  const placements = Object.fromEntries(Object.entries(manifest.areas).map(([area, a]) => [area, a.placement]));
  const advice = readAdvice(dir);
  return { revision: n, digest: manifest.digest, board: withAdvice(board, advice), placements, files, assets, notes: notesOf(board, advice) };
}

export interface ProposeResult {
  revision: number;
  digest: string;
  changes: Change[];
  warnings: Issue[];
  /** Choices carried over from the previous revision. */
  kept: string[];
  /** Areas whose earlier choice was dropped because the area changed. */
  dropped: string[];
  answered: string[];
  approvalSuperseded: string | null;
  /** Areas whose mark was moved by what the person chose before. */
  moved: Array<{ area: string; option: string; because: string }>;
}

export class DraftError extends PeError {
  constructor(readonly issues: Issue[]) {
    super('The draft has problems. Fix them and run the command again.', 'INVALID_DRAFT');
  }
}

/** Validate the draft of a session. */
export function checkDraft(ws: Ws, id: string, checks: Pick<ValidateOptions, 'patternIds' | 'decisionIds' | 'motionOf'> = {}) {
  const draftDir = sessionPaths(ws, id).draftDir;
  const reader = folderReader(draftDir);
  const text = reader.text('board.json');
  if (text === null) throw new PeError(`There is no board.json in ${draftDir}.`, 'NO_DRAFT');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new DraftError([{ level: 'error', code: 'INVALID_JSON', message: `board.json is not valid JSON: ${(err as Error).message}`, where: 'board.json' }]);
  }
  return { draftDir, result: validateDraft(json, reader, { ...checks, projectFile: folderReader(ws.root).text }) };
}

/**
 * Freeze the draft as the next revision. Choices for areas that did not change are kept, an
 * existing approval is superseded, and open change requests are marked as answered.
 */
export async function propose(ws: Ws, id: string, opts: { note?: string; checks?: Pick<ValidateOptions, 'patternIds' | 'decisionIds' | 'motionOf'> } = {}): Promise<ProposeResult> {
  const p = sessionPaths(ws, id);
  return withLock(p.lockFile, () => {
    const { draftDir, result } = checkDraft(ws, id, opts.checks);
    if (!result.ok || !result.board || !result.placements) throw new DraftError(result.issues);
    const board = result.board;
    const session = readSession(ws, id);
    const n = session.revision + 1;

    const paths = [...(result.files ?? []), ...(result.assets ?? [])].sort();
    const hashes: Record<string, string> = {};
    for (const path of paths) hashes[path] = sha256(readFileSync(resolveInside(draftDir, path)));

    const areas: Manifest['areas'] = {};
    for (const area of board.areas) {
      const own = [area.sketch, ...area.options.map((o) => o.html)].filter((f): f is string => Boolean(f));
      areas[area.id] = {
        digest: digestOf({ area, files: Object.fromEntries(own.map((f) => [f, hashes[f]])) }),
        placement: result.placements[area.id]!,
      };
    }
    const shared = paths.filter((path) => !board.areas.some((a) => a.sketch === path || a.options.some((o) => o.html === path)));
    const page = digestOf({ title: board.title, base: board.base, viewports: board.viewports, files: Object.fromEntries(shared.map((f) => [f, hashes[f]])) });
    const cuts = digestOf(board.cuts);
    const digest = digestOf({ board, files: hashes });

    const changes: Change[] = [];
    const prev = n > 1 ? readRevision(ws, id, n - 1) : null;
    if (!prev) {
      changes.push({ kind: 'first' });
    } else {
      if (prev.manifest.digest === digest) {
        throw new PeError(`The draft is identical to revision r${n - 1}. Change the draft before publishing again.`, 'NO_CHANGES');
      }
      if (prev.manifest.page !== page) changes.push({ kind: 'page' });
      if (prev.manifest.cuts !== cuts) changes.push({ kind: 'cuts' });
      for (const area of board.areas) {
        const before = prev.manifest.areas[area.id];
        if (!before) changes.push({ kind: 'area-added', area: area.id, label: area.label });
        else if (before.digest !== areas[area.id]!.digest) changes.push({ kind: 'area-changed', area: area.id, label: area.label });
      }
      for (const area of prev.board.areas) {
        if (!areas[area.id]) changes.push({ kind: 'area-removed', area: area.id, label: area.label });
      }
    }

    // Every open request must be visibly answered by this revision.
    const requests = readRequests(ws, id);
    const open = requests.filter((r) => r.status === 'open');
    const touched = new Set(changes.filter((c) => c.area).map((c) => c.area!));
    const pageChanged = changes.some((c) => c.kind === 'page' || c.kind === 'cuts');
    const unanswered = open.filter((r) => r.area !== null && !touched.has(r.area) && !pageChanged);
    if (unanswered.length > 0) {
      throw new PeError(
        `Open change request${unanswered.length > 1 ? 's' : ''} not answered by this draft:\n` +
          unanswered.map((r) => `  ${r.id} (area "${r.area}"): ${r.text}`).join('\n') +
          '\nChange that area in the draft, then publish again.',
        'REQUEST_NOT_ANSWERED',
      );
    }

    const dir = p.revisionDir(n);
    rmSync(dir, { recursive: true, force: true }); // a folder left without manifest.json by a crash
    mkdirSync(dir, { recursive: true });
    for (const path of paths) {
      const target = join(dir, path);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(resolveInside(draftDir, path), target);
    }
    writeFileAtomic(join(dir, 'board.json'), JSON.stringify(board, null, 2) + '\n');
    const note = opts.note?.trim();
    const manifest: Manifest = {
      schema: 'picky-eater/manifest',
      schemaVersion: SCHEMA_VERSION,
      revision: n,
      createdAt: nowIso(),
      ...(note ? { note: note.slice(0, 600) } : {}),
      digest,
      files: hashes,
      page,
      cuts,
      areas,
      changes,
      answered: open.map((r) => r.id),
    };
    writeJsonAtomic(join(dir, 'manifest.json'), manifest);
    // What the person chose before may speak for another option than the one the draft marks.
    const advice = adviceFor(ws, board);
    writeAdvice(dir, advice);

    // Carry over choices for areas that look the same as before.
    const before = readChoices(ws, id)?.choices ?? {};
    const same: Record<string, string> = {};
    for (const [area, option] of Object.entries(before)) {
      if (prev && areas[area] && prev.manifest.areas[area]?.digest === areas[area].digest) same[area] = option;
    }
    const kept = pruneChoices(board, result.placements, same);
    writeChoices(ws, id, n, kept);
    const dropped = Object.keys(before).filter((area) => !(area in kept));

    let approvalSuperseded: string | null = null;
    for (const approval of listApprovals(ws, id)) {
      if (approval.status !== 'current') continue;
      writeApproval(ws, id, { ...approval, status: 'superseded', endedAt: nowIso(), reason: `revision r${n} was published` });
      approvalSuperseded = approval.id;
    }
    if (open.length > 0) {
      writeRequests(ws, id, requests.map((r) => (r.status === 'open' ? { ...r, status: 'answered' as const, answeredIn: n } : r)));
    }
    writeSession(ws, { ...session, title: board.title, revision: n });
    appendEvent(ws, id, 'revision-published', { revision: n, digest, changes: changes.length, answered: open.map((r) => r.id) });

    return {
      revision: n,
      digest,
      changes,
      warnings: result.issues.filter((i) => i.level === 'warning'),
      kept: Object.keys(kept),
      dropped,
      answered: open.map((r) => r.id),
      approvalSuperseded,
      moved: Object.entries(advice).map(([area, a]) => ({ area, option: a.suggested, because: a.because })),
    };
  });
}
