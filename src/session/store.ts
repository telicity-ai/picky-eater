import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { z } from 'zod';
import {
  Approval,
  Choices,
  Id,
  Requests,
  SCHEMA_VERSION,
  Session,
  Workspace,
  describeIssues,
  isSafeRelativePath,
  type ChangeRequest,
} from '../core/schema.js';
import type { DraftReader } from '../core/validate.js';
import { PeError, nowIso, readJson, resolveInside, writeJsonAtomic } from './fs.js';
import { LIVE_TEMPLATE, TEMPLATE } from './template.js';

/** The .picky-eater folder of a project. */
export interface Ws {
  root: string;
  dir: string;
  workspaceFile: string;
  sessionsDir: string;
  runtimeDir: string;
  runtimeFile: string;
}

export function workspace(root: string): Ws {
  const abs = resolve(root);
  const dir = join(abs, '.picky-eater');
  return {
    root: abs,
    dir,
    workspaceFile: join(dir, 'workspace.json'),
    sessionsDir: join(dir, 'sessions'),
    runtimeDir: join(dir, 'runtime'),
    runtimeFile: join(dir, 'runtime', 'preview.json'),
  };
}

export function sessionPaths(ws: Ws, id: string) {
  const dir = join(ws.sessionsDir, id);
  return {
    dir,
    sessionFile: join(dir, 'session.json'),
    draftDir: join(dir, 'draft'),
    revisionsDir: join(dir, 'revisions'),
    revisionDir: (n: number) => join(dir, 'revisions', `r${n}`),
    choicesFile: join(dir, 'choices.json'),
    requestsFile: join(dir, 'requests.json'),
    approvalsDir: join(dir, 'approvals'),
    /** Measurements and pictures of the approved mockup, one folder per approval. */
    answerKeyDir: (approval: string) => join(dir, 'answer-key', approval),
    /** One folder per comparison of the built page with the answer key. */
    checksDir: join(dir, 'checks'),
    /** Written by the agent: where the built page is and how its parts map to the board. */
    builtFile: join(dir, 'built.json'),
    reportFile: join(dir, 'report.json'),
    eventsFile: join(dir, 'events.jsonl'),
    lockFile: join(dir, '.lock'),
  };
}

const GITIGNORE = `# picky-eater: local server state and captured screenshots are not committed.
runtime/
.lock
*.png
`;

function parse<T extends z.ZodType>(schema: T, file: string): z.infer<T> {
  const r = schema.safeParse(readJson(file));
  if (!r.success) throw new PeError(`${file} is not valid:\n  ${describeIssues(r.error).join('\n  ')}`, 'INVALID_STATE');
  return r.data;
}

export function ensureWorkspace(ws: Ws): void {
  mkdirSync(ws.sessionsDir, { recursive: true });
  const ignore = join(ws.dir, '.gitignore');
  if (!existsSync(ignore)) writeFileSync(ignore, GITIGNORE);
  if (!existsSync(ws.workspaceFile)) {
    writeJsonAtomic(ws.workspaceFile, { schema: 'picky-eater/workspace', schemaVersion: SCHEMA_VERSION, activeSession: null });
  }
}

/** The settings of the project's .picky-eater folder; defaults if it has none yet. */
export function readWorkspace(ws: Ws): Workspace {
  if (!existsSync(ws.workspaceFile)) return { schema: 'picky-eater/workspace', schemaVersion: SCHEMA_VERSION, activeSession: null };
  return parse(Workspace, ws.workspaceFile);
}

export function writeWorkspace(ws: Ws, value: Workspace): void {
  ensureWorkspace(ws);
  writeJsonAtomic(ws.workspaceFile, value);
}

export function listSessions(ws: Ws): string[] {
  if (!existsSync(ws.sessionsDir)) return [];
  return readdirSync(ws.sessionsDir)
    .filter((name) => Id.safeParse(name).success && existsSync(sessionPaths(ws, name).sessionFile))
    .sort();
}

/** The session a command works on: the one named, or the active one. */
export function resolveSessionId(ws: Ws, explicit?: string): string {
  if (explicit !== undefined) {
    if (!Id.safeParse(explicit).success || !existsSync(sessionPaths(ws, explicit).sessionFile)) {
      throw new PeError(`There is no session "${explicit}". Sessions: ${listSessions(ws).join(', ') || '(none)'}.`, 'NO_SESSION');
    }
    return explicit;
  }
  if (!existsSync(ws.workspaceFile)) {
    throw new PeError('No picky-eater session in this folder. Start one with: picky-eater new --title "<page name>"', 'NO_SESSION');
  }
  const active = parse(Workspace, ws.workspaceFile).activeSession;
  if (!active || !existsSync(sessionPaths(ws, active).sessionFile)) {
    throw new PeError('No active session. Start one with: picky-eater new --title "<page name>"', 'NO_SESSION');
  }
  return active;
}

function slug(title: string): string {
  const s = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return s || 'page';
}

/** Copy a draft folder, skipping hidden files and anything that is not a plain file or folder. */
function copyDraft(from: string, to: string): void {
  if (!existsSync(join(from, 'board.json'))) throw new PeError(`"${from}" has no board.json.`, 'BAD_SOURCE');
  cpSync(from, to, {
    recursive: true,
    dereference: false,
    filter: (src) => {
      const name = src.slice(src.lastIndexOf('/') + 1);
      if (src !== from && name.startsWith('.')) return false;
      const st = statSync(src, { throwIfNoEntry: false });
      return Boolean(st && (st.isFile() || st.isDirectory()));
    },
  });
}

export function createSession(ws: Ws, opts: { title: string; id?: string; from?: string; url?: string }): Session {
  ensureWorkspace(ws);
  const title = opts.title.trim();
  let id = opts.id ?? slug(title);
  if (!Id.safeParse(id).success) throw new PeError(`"${id}" is not a valid session id (lowercase letters, digits, hyphens).`, 'BAD_ID');
  if (opts.id && existsSync(sessionPaths(ws, id).dir)) throw new PeError(`Session "${id}" already exists.`, 'SESSION_EXISTS');
  for (let n = 2; existsSync(sessionPaths(ws, id).dir); n++) id = `${slug(title).slice(0, 36)}-${n}`;

  const session = Session.safeParse({ schema: 'picky-eater/session', schemaVersion: SCHEMA_VERSION, id, title, createdAt: nowIso(), revision: 0 });
  if (!session.success) throw new PeError(`Cannot create the session:\n  ${describeIssues(session.error).join('\n  ')}`, 'BAD_TITLE');

  const p = sessionPaths(ws, id);
  mkdirSync(p.approvalsDir, { recursive: true });
  mkdirSync(p.revisionsDir, { recursive: true });
  if (opts.from) {
    copyDraft(resolve(opts.from), p.draftDir);
  } else {
    for (const [path, text] of Object.entries(opts.url ? LIVE_TEMPLATE : TEMPLATE)) {
      const file = join(p.draftDir, path);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, text.replaceAll('{{title}}', title.replace(/[<>&"\\]/g, '')).replaceAll('{{url}}', (opts.url ?? '').replace(/["\\\s]/g, '')));
    }
  }
  writeJsonAtomic(p.sessionFile, session.data);
  writeJsonAtomic(ws.workspaceFile, { ...readWorkspace(ws), activeSession: id });
  appendEvent(ws, id, 'session-created', { title });
  return session.data;
}

export function readSession(ws: Ws, id: string): Session {
  return parse(Session, sessionPaths(ws, id).sessionFile);
}

export function writeSession(ws: Ws, session: Session): void {
  writeJsonAtomic(sessionPaths(ws, session.id).sessionFile, session);
}

export function appendEvent(ws: Ws, id: string, type: string, data: Record<string, unknown> = {}): void {
  appendFileSync(sessionPaths(ws, id).eventsFile, JSON.stringify({ at: nowIso(), type, ...data }) + '\n');
}

export function readChoices(ws: Ws, id: string): Choices | null {
  const file = sessionPaths(ws, id).choicesFile;
  return existsSync(file) ? parse(Choices, file) : null;
}

export function writeChoices(ws: Ws, id: string, revision: number, choices: Record<string, string>): void {
  writeJsonAtomic(sessionPaths(ws, id).choicesFile, { schema: 'picky-eater/choices', schemaVersion: SCHEMA_VERSION, revision, choices, updatedAt: nowIso() });
}

export function readRequests(ws: Ws, id: string): ChangeRequest[] {
  const file = sessionPaths(ws, id).requestsFile;
  return existsSync(file) ? parse(Requests, file).requests : [];
}

export function writeRequests(ws: Ws, id: string, requests: ChangeRequest[]): void {
  writeJsonAtomic(sessionPaths(ws, id).requestsFile, { schema: 'picky-eater/requests', schemaVersion: SCHEMA_VERSION, requests });
}

/** Every approval of the session, oldest first. */
export function listApprovals(ws: Ws, id: string): Approval[] {
  const dir = sessionPaths(ws, id).approvalsDir;
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^r\d+-a\d+\.json$/.test(f))
    .map((f) => parse(Approval, join(dir, f)))
    .sort((a, b) => a.approvedAt.localeCompare(b.approvedAt));
}

export function writeApproval(ws: Ws, id: string, approval: Approval): void {
  writeJsonAtomic(join(sessionPaths(ws, id).approvalsDir, `${approval.id}.json`), approval);
}

/** Reads files of a draft or revision folder, never anything outside it. */
export function folderReader(dir: string): DraftReader {
  const locate = (path: string): string | null => {
    if (!isSafeRelativePath(path)) return null;
    try {
      const abs = resolveInside(dir, path);
      return statSync(abs, { throwIfNoEntry: false })?.isFile() ? abs : null;
    } catch {
      return null;
    }
  };
  return {
    text: (path) => {
      const abs = locate(path);
      return abs ? readFileSync(abs, 'utf8') : null;
    },
    size: (path) => {
      const abs = locate(path);
      return abs ? statSync(abs).size : null;
    },
  };
}
