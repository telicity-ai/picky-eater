import { activeAreas, missingChoices, pruneChoices, stateCuts } from '../core/graph.js';
import { SCHEMA_VERSION, type Approval, type ChangeRequest, type Change, type Phase, type Session } from '../core/schema.js';
import { PeError, nowIso, withLock } from './fs.js';
import { readAdvice, recordApproval } from '../taste/record.js';
import { readRevision } from './revisions.js';
import { appendEvent, listApprovals, readChoices, readRequests, readSession, sessionPaths, writeApproval, writeChoices, writeRequests, type Ws } from './store.js';

/** The request no longer matches the session (another revision, other choices, already approved). */
export class ConflictError extends PeError {
  constructor(message: string, code: string) {
    super(message, code);
  }
}

export interface View {
  session: Session;
  phase: Phase;
  revision: number;
  digest: string | null;
  choices: Record<string, string>;
  /** Areas on the page under the current choices, in board order. */
  active: string[];
  /** Active areas that still need a choice. */
  missing: string[];
  approval: Approval | null;
  approvals: Approval[];
  requests: ChangeRequest[];
  history: Array<{ revision: number; createdAt: string; note: string | null; changes: Change[]; answered: string[] }>;
}

/** The whole state of a session, as the CLI and the review page see it. */
export function readView(ws: Ws, id: string): View {
  const session = readSession(ws, id);
  const approvals = listApprovals(ws, id);
  const requests = readRequests(ws, id);
  const approval = approvals.find((a) => a.status === 'current') ?? null;
  if (session.revision === 0) {
    return { session, phase: 'drafting', revision: 0, digest: null, choices: {}, active: [], missing: [], approval: null, approvals, requests, history: [] };
  }
  const { board, manifest } = readRevision(ws, id, session.revision);
  const placements = Object.fromEntries(Object.entries(manifest.areas).map(([area, a]) => [area, a.placement]));
  const stored = readChoices(ws, id);
  const choices = stored && stored.revision === session.revision ? pruneChoices(board, placements, stored.choices) : {};
  const history: View['history'] = [];
  for (let n = 1; n <= session.revision; n++) {
    const m = n === session.revision ? manifest : readRevision(ws, id, n).manifest;
    history.push({ revision: n, createdAt: m.createdAt, note: m.note ?? null, changes: m.changes, answered: m.answered });
  }
  const phase: Phase = approval ? 'approved' : requests.some((r) => r.status === 'open') ? 'changes-requested' : 'choosing';
  return {
    session,
    phase,
    revision: session.revision,
    digest: manifest.digest,
    choices,
    active: activeAreas(board, placements, choices),
    missing: missingChoices(board, placements, choices),
    approval,
    approvals,
    requests,
    history,
  };
}

interface Stamp {
  revision: number;
  digest: string;
}

/** Load the current revision and make sure the caller saw exactly this one. */
function current(ws: Ws, id: string, stamp: Stamp) {
  const session = readSession(ws, id);
  if (session.revision === 0) throw new ConflictError('Nothing has been published yet.', 'NO_REVISION');
  const rev = readRevision(ws, id, session.revision);
  if (stamp.revision !== session.revision || stamp.digest !== rev.manifest.digest) {
    throw new ConflictError('A newer draft was published while this page was open. Reload to see it.', 'STALE_REVISION');
  }
  const placements = Object.fromEntries(Object.entries(rev.manifest.areas).map(([area, a]) => [area, a.placement]));
  return { session, ...rev, placements };
}

const sameChoices = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

/** Replace the person's choices for the current revision. */
export async function setChoices(ws: Ws, id: string, input: Stamp & { choices: Record<string, string> }): Promise<View> {
  return withLock(sessionPaths(ws, id).lockFile, () => {
    const { board, placements } = current(ws, id, input);
    if (listApprovals(ws, id).some((a) => a.status === 'current')) {
      throw new ConflictError('This page is approved. Reopen it before changing a choice.', 'APPROVED');
    }
    for (const [area, option] of Object.entries(input.choices)) {
      const a = board.areas.find((x) => x.id === area);
      if (!a || !a.options.some((o) => o.id === option)) throw new PeError(`Unknown choice ${area}=${option}.`, 'UNKNOWN_CHOICE');
    }
    writeChoices(ws, id, input.revision, pruneChoices(board, placements, input.choices));
    return readView(ws, id);
  });
}

/**
 * Record the person's approval of exactly what the page showed: this revision, this digest and
 * these choices. Refused unless every area on the page has a choice.
 */
export async function approve(ws: Ws, id: string, input: Stamp & { choices: Record<string, string> }): Promise<View> {
  return withLock(sessionPaths(ws, id).lockFile, () => {
    const { board, placements, dir } = current(ws, id, input);
    const stored = pruneChoices(board, placements, readChoices(ws, id)?.choices ?? {});
    if (!sameChoices(stored, input.choices)) {
      throw new ConflictError('The choices changed in another window. Reload and check them before approving.', 'STALE_CHOICES');
    }
    const missing = missingChoices(board, placements, stored);
    if (missing.length > 0) {
      throw new ConflictError(`Not every area has a choice yet (${missing.join(', ')}).`, 'INCOMPLETE');
    }
    const approvals = listApprovals(ws, id);
    if (approvals.some((a) => a.status === 'current')) throw new ConflictError('This page is already approved.', 'APPROVED');

    const previous = approvals.at(-1) ?? null;
    const areas = new Set([...Object.keys(stored), ...Object.keys(previous?.choices ?? {})]);
    const changedSincePrevious = previous
      ? [...areas]
          .filter((area) => previous.choices[area] !== stored[area])
          .sort()
          .map((area) => ({ area, from: previous.choices[area] ?? null, to: stored[area] ?? null }))
      : [];
    const count = approvals.filter((a) => a.revision === input.revision).length;
    const approval: Approval = {
      schema: 'picky-eater/approval',
      schemaVersion: SCHEMA_VERSION,
      id: `r${input.revision}-a${count + 1}`,
      revision: input.revision,
      digest: input.digest,
      choices: stored,
      approvedAt: nowIso(),
      status: 'current',
      changedSincePrevious,
    };
    writeApproval(ws, id, approval);
    // Approving settles whatever was still being asked for.
    const requests = readRequests(ws, id);
    if (requests.some((r) => r.status === 'open')) {
      writeRequests(ws, id, requests.map((r) => (r.status === 'open' ? { ...r, status: 'dismissed' as const } : r)));
    }
    appendEvent(ws, id, 'approved', { approval: approval.id, revision: input.revision, digest: input.digest });
    // What was chosen is remembered for the next recommendation, on this machine and outside the repository.
    recordApproval(ws, id, board, readAdvice(dir), approval, activeAreas(board, placements, stored));
    return readView(ws, id);
  });
}

function withdraw(ws: Ws, id: string, reason: string): string | null {
  const approval = listApprovals(ws, id).find((a) => a.status === 'current');
  if (!approval) return null;
  writeApproval(ws, id, { ...approval, status: 'withdrawn', endedAt: nowIso(), reason });
  appendEvent(ws, id, 'approval-withdrawn', { approval: approval.id, reason });
  return approval.id;
}

/** Withdraw the approval so choices can be changed again. */
export async function reopen(ws: Ws, id: string, input: Stamp): Promise<View> {
  return withLock(sessionPaths(ws, id).lockFile, () => {
    current(ws, id, input);
    if (!withdraw(ws, id, 'reopened in the review page')) throw new ConflictError('This page is not approved.', 'NOT_APPROVED');
    return readView(ws, id);
  });
}

/** Ask the agent for something the options do not offer. Withdraws an existing approval. */
export async function addRequest(ws: Ws, id: string, input: Stamp & { area: string | null; cut: string | null; text: string }): Promise<View> {
  return withLock(sessionPaths(ws, id).lockFile, () => {
    const { board } = current(ws, id, input);
    if (input.area !== null && !board.areas.some((a) => a.id === input.area)) throw new PeError(`Unknown area "${input.area}".`, 'UNKNOWN_AREA');
    if (input.cut !== null && !stateCuts(board).includes(input.cut) && !board.cuts.some((c) => c.id === input.cut)) {
      throw new PeError(`Unknown cut "${input.cut}".`, 'UNKNOWN_CUT');
    }
    const requests = readRequests(ws, id);
    const request: ChangeRequest = {
      id: `q${requests.length + 1}`,
      revision: input.revision,
      area: input.area,
      cut: input.cut,
      text: input.text.trim(),
      createdAt: nowIso(),
      status: 'open',
    };
    writeRequests(ws, id, [...requests, request]);
    withdraw(ws, id, `change requested (${request.id})`);
    appendEvent(ws, id, 'change-requested', { request: request.id, area: input.area });
    return readView(ws, id);
  });
}
