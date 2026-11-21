import { z } from 'zod';
import { CATEGORIES, FREQUENCIES, describeDecision, describeIndex, describePattern, renderMarkdown, search, type Frequency } from '../catalog/catalog.js';
import { catalogChecks, getCatalog } from '../catalog/load.js';
import { activeAreas } from '../core/graph.js';
import { Board, Step } from '../core/schema.js';
import type { Issue } from '../core/validate.js';
import { SIGNIN_HINT, checkBoardOnPage, inspectPage, profileOf, whereText, type BoardOnPage } from '../check/page.js';
import { clearSignin, loadSignin, signIn } from '../check/signin.js';
import { brief, builtHint, captureAnswerKey, differenceLines, latestCheck, readAnswerKey, readReport, runCheck, writeReport } from '../check/run.js';
import kitCss from '../kit/kit.css';
import { snippetFor } from '../kit/snippets.js';
import { startReviewServer, type UiAssets } from '../server/review-server.js';
import { stagePortFor, startStageProxy } from '../server/stage-proxy.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PeError, nowIso, readJson } from '../session/fs.js';
import { readView, type View } from '../session/review.js';
import { DraftError, checkDraft, propose, readRevision } from '../session/revisions.js';
import { createSession, listSessions, readWorkspace, resolveSessionId, sessionPaths, workspace, writeWorkspace, type Ws } from '../session/store.js';
import { decide, describeDecided, describeRecommended, recommend } from '../recommend/recommend.js';
import { gather, summarize } from '../taste/score.js';
import { forget, projectKey, proposeRule, readEvents, readRules, standingEvents, tasteDir, tasteOn } from '../taste/store.js';
import { VERSION } from '../version.js';
import { attach, attachedFiles, detach, syncAttached } from './attach.js';
import { clearRuntime, linkOf, openInBrowser, probe, readRuntime, startDetached, stop, writeRuntime } from './runtime.js';

/** Set by the build: the review page, so the bundled CLI needs nothing on disk. */
declare const __PE_UI_ASSETS__: UiAssets | undefined;

export const EXIT = { ok: 0, error: 1, changesRequested: 10, differences: 20, timeout: 124 } as const;

const HELP = `picky-eater ${VERSION} — build a web page like a storyboard

Usage: picky-eater <command> [options]

  new --title "<page>"      Start a session and a draft folder for a new screen
      --url <page>          … for a page that exists: its address on your development server
      --from <folder>       … from a copy of an existing draft
  inspect [<selector>…]     Look at a running page: its parts, or what the selectors find, with the
      [--url <page>]        component and source file of each (default: the page of the session's draft)
      [--within <selector>] … a closer map of one part, down to its controls
      [--steps '<json>']    … after these actions: a menu opened, a tab chosen, another screen
      [--profile]           … what kind of page it is, what moves on it today, and where something changes
  signin --url <page>       For a page behind a sign-in: sign the browser of inspect / validate / implement /
      [--steps '<json>']    check in once, with the development account (--clear forgets it)
  validate                  Check the draft: structure, safety, areas, cuts; on an existing page also
                            against the running page (--no-page skips that)
  propose [--note "<…>"]    Freeze the draft as the next revision for review
  preview                   Start the review page and print its link (--stop, --foreground, --open, --port <n>)
  status                    Show where the session stands
  wait [--timeout <sec>]    Wait for the person: exit 0 approved, 10 change requested, 124 still waiting
  implement                 After approval, before any code: measure the approved page and print what to build
  check [--url <page>]      After building: compare the built page with what was approved (exit 20: differences)
  report --summary "<…>"    Record what was built (--deviation "<area>: <why>" for a difference that stays)
  patterns [<id>… | --find "<words>" | --category <name>]
                            Look up layouts, controls and motions to offer as options
  recommend [<decision>…]   What to offer on the page of the session: the moments where it could move, which
      [--url <page>]        motions pass at each and which are left out, and what the person chose before.
      [--frequency <how often the page is met: constant, frequent, occasional, rare>]
                            With decision ids: the candidates of those decisions, the same way, without a page
  taste                     What is remembered of the person's choices, on this machine (--off / --on for this
                            project, --forget <project, pattern or rule>, --forget-all)
  taste propose --rule "<sentence>" [--prefer <pattern> --over <pattern>] [--from <request>]
                            Propose a rule from what the person said. It counts only once they keep it in the review
  schema                    Print the JSON Schema of board.json
  kit                       Print the stylesheet of the built-in pk-* classes that mockups may use
  attach --file <html>      Only for "attach": "tag": add picky-eater's script tag to the app's development HTML
  detach                    Remove that tag again

Options for every command: --root <project folder> (default: current folder), --session <id>, --json
`;

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | true>;
}

const BOOLEAN_FLAGS = new Set(['json', 'help', 'version', 'stop', 'foreground', 'quiet', 'open', 'markdown', 'decisions', 'recapture', 'no-page', 'clear', 'profile', 'off', 'on', 'forget-all']);
/** Flags that may be given more than once; their values are joined with a line break. */
const REPEATED_FLAGS = new Set(['deviation']);

export function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    const key = arg.slice(2, eq < 0 ? undefined : eq);
    if (eq >= 0) flags[key] = arg.slice(eq + 1);
    else if (BOOLEAN_FLAGS.has(key)) flags[key] = true;
    else {
      const value = argv[++i];
      if (value === undefined) throw new PeError(`--${key} needs a value.`, 'USAGE');
      flags[key] = REPEATED_FLAGS.has(key) && typeof flags[key] === 'string' ? `${flags[key]}\n${value}` : value;
    }
  }
  return { command: positional.shift() ?? '', positional, flags };
}

interface Ctx {
  args: Args;
  ws: Ws;
  json: boolean;
  out: (line?: string) => void;
}

const str = (v: string | true | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

function printIssues(ctx: Ctx, issues: Issue[]) {
  for (const level of ['error', 'warning'] as const) {
    for (const i of issues.filter((x) => x.level === level)) ctx.out(`${level === 'error' ? 'ERROR' : 'warning'} ${i.code}${i.where ? ` [${i.where}]` : ''}: ${i.message}`);
  }
}

function phaseLine(view: View): string {
  const chosen = view.active.length - view.missing.length;
  switch (view.phase) {
    case 'drafting':
      return 'drafting — nothing published yet';
    case 'choosing':
      return `choosing — ${chosen} of ${view.active.length} areas chosen, not approved`;
    case 'changes-requested':
      return 'changes requested — the person asked for something the options do not offer';
    case 'approved':
      return `approved (${view.approval!.id})`;
  }
}

// ---------------------------------------------------------------------------------------------

function cmdNew(ctx: Ctx) {
  const title = str(ctx.args.flags.title);
  if (!title) throw new PeError('Give the page a name: picky-eater new --title "<page name>"', 'USAGE');
  const url = str(ctx.args.flags.url);
  if (url !== undefined && !Board.shape.base.safeParse({ kind: 'live', url }).success) {
    throw new PeError('--url is the page on your development server, e.g. http://localhost:5173/pricing', 'USAGE');
  }
  const session = createSession(ctx.ws, { title, id: str(ctx.args.flags.id), from: str(ctx.args.flags.from), url });
  const draft = sessionPaths(ctx.ws, session.id).draftDir;
  if (ctx.json) return ctx.out(JSON.stringify({ session: session.id, draft }, null, 2));
  ctx.out(`Session "${session.id}" created.`);
  ctx.out(`Draft folder: ${draft}`);
  ctx.out(ctx.args.flags.from ? 'Next: picky-eater validate' : 'It holds a small working board. Replace it with the page, then: picky-eater validate');
}

async function cmdValidate(ctx: Ctx): Promise<number> {
  const id = resolveSessionId(ctx.ws, str(ctx.args.flags.session));
  let issues: Issue[];
  let summary: Record<string, unknown> | null = null;
  let onPage: BoardOnPage | null = null;
  try {
    const { result } = checkDraft(ctx.ws, id, catalogChecks());
    issues = result.issues;
    if (result.board && result.placements) {
      const b = result.board;
      // A board over an existing page is also held against that page, as it runs right now.
      if (result.ok && b.base.kind === 'live' && !ctx.args.flags['no-page']) {
        onPage = await checkBoardOnPage(b, checkAssets()['probe.js'], ctx.ws.root);
        issues = [...issues, ...onPage.issues];
      }
      summary = {
        ...(b.base.kind === 'live' ? { page: b.base.url } : {}),
        ...(onPage ? { onPage: onPage.skipped ? { checked: false, why: onPage.skipped } : { checked: true, frameworks: onPage.frameworks, areas: onPage.areas } } : {}),
        areas: b.areas.map((a) => ({
          id: a.id,
          options: a.options.map((o) => o.id),
          inside: result.placements![a.id]!.inFrame ? 'page' : result.placements![a.id]!.hosts.map((h) => `${h.area}/${h.option}`).join(', '),
          ...(a.cuts ? { cuts: a.cuts } : {}),
        })),
        cuts: b.cuts.map((c) => c.id),
        viewports: b.viewports.map((v) => `${v.id} ${v.width}×${v.height}`),
      };
    }
  } catch (err) {
    if (!(err instanceof DraftError)) throw err;
    issues = err.issues;
  }
  const ok = !issues.some((i) => i.level === 'error');
  if (ctx.json) {
    ctx.out(JSON.stringify({ ok, issues, ...(summary ?? {}) }, null, 2));
    return ok ? EXIT.ok : EXIT.error;
  }
  printIssues(ctx, issues);
  if (ok && summary) {
    ctx.out(`The draft is valid${issues.length ? ' (with warnings)' : ''}.`);
    if (summary.page) {
      const state = !onPage
        ? 'not opened'
        : onPage.skipped
          ? `not checked on the running page: ${onPage.skipped}`
          : `checked on the running page${onPage.frameworks.length ? `, drawn by ${onPage.frameworks.join(', ')}` : ''}${onPage.issues.length ? '; see the PAGE_ warnings above' : ''}`;
      ctx.out(`  page: ${summary.page as string} (${state})`);
    }
    for (const a of summary.areas as Array<{ id: string; options: string[]; inside: string; cuts?: string[] }>) {
      const where = whereText(onPage?.areas[a.id]);
      ctx.out(`  ${a.id}: ${a.options.join(' | ')}${a.inside === 'page' ? '' : `  (inside ${a.inside})`}${a.cuts ? `  (only in cut ${a.cuts.join(', ')})` : ''}${where ? `  — ${where}` : ''}`);
    }
    ctx.out(`  cuts: ${(summary.cuts as string[]).join(' → ')}`);
    ctx.out('Next: picky-eater propose');
  } else {
    ctx.out(`${issues.filter((i) => i.level === 'error').length} error(s). Fix them and run "picky-eater validate" again.`);
  }
  return ok ? EXIT.ok : EXIT.error;
}

/** Look at a running page from the command line: its parts, or what some selectors find there. */
async function cmdInspect(ctx: Ctx): Promise<number> {
  let url = str(ctx.args.flags.url);
  if (!url) {
    // Without --url: the page the session's draft is drawn over.
    try {
      const { result } = checkDraft(ctx.ws, resolveSessionId(ctx.ws, str(ctx.args.flags.session)), catalogChecks());
      if (result.board?.base.kind === 'live') url = result.board.base.url;
    } catch {
      /* no session, or a draft that does not parse yet */
    }
  }
  if (!url || !Board.shape.base.safeParse({ kind: 'live', url }).success) {
    throw new PeError('Say which page: picky-eater inspect --url http://localhost:5173/pricing [<selector>…]', 'USAGE');
  }
  const width = Number(str(ctx.args.flags.width) ?? 1280);
  if (!Number.isInteger(width) || width < 240 || width > 4000) throw new PeError('--width is the width of the screen in pixels.', 'USAGE');
  if (ctx.args.flags.profile) {
    const { profile, frameworks, wall } = await profileOf(checkAssets()['probe.js'], { url, root: ctx.ws.root, width });
    if (ctx.json) ctx.out(JSON.stringify({ url, frameworks, ...profile, ...(wall ? { wall } : {}) }, null, 2));
    else {
      const m = profile.motion;
      ctx.out(`${url}${frameworks.length ? ` — ${frameworks.join(', ')}` : ''}`);
      if (wall) ctx.out(`! ${SIGNIN_HINT}`);
      ctx.out(`Kind of page: ${profile.surface === 'landing' ? 'a page that is read (landing)' : profile.surface === 'app' ? 'a screen that is worked with (app)' : 'a page (neither clearly)'}`);
      ctx.out(`Moves today: ${m.transitions} element(s) with a transition, ${m.animations} animation(s)${m.durations.length ? `, durations ${m.durations.join(', ')} ms` : ''}; ${m.reducedRules} rule(s) for reduced motion${m.libraries.length ? `; ${m.libraries.join(', ')}` : ''}`);
      if (profile.tokens.length) ctx.out(`Timing the project names: ${profile.tokens.map((t) => `${t.name}: ${t.value}`).join('; ')}`);
      ctx.out('Moments where something changes:');
      for (const x of profile.moments) ctx.out(`  ${x.kind}  ${x.selector}${x.count > 1 ? ` (${x.count})` : ''}${x.text ? `  "${x.text}"` : ''}  — ${x.today}`);
      if (profile.moments.length === 0) ctx.out('  none found');
      ctx.out('Next: picky-eater recommend');
    }
    return EXIT.ok;
  }
  const within = str(ctx.args.flags.within);
  if (within && ctx.args.positional.length > 0) throw new PeError('Give either selectors to look up, or --within <selector> for a closer map of one part.', 'USAGE');
  const report = await inspectPage(checkAssets()['probe.js'], { url, root: ctx.ws.root, selectors: ctx.args.positional, ...(within ? { within } : {}), steps: stepsOf(str(ctx.args.flags.steps)), width });
  if (ctx.json) {
    ctx.out(JSON.stringify(report, null, 2));
    return EXIT.ok;
  }
  ctx.out(`${report.url}${report.frameworks.length ? ` — ${report.frameworks.join(', ')}` : ''}${report.signedIn ? ` — signed in (saved ${report.signedIn.slice(0, 16).replace('T', ' ')})` : ''}`);
  if (report.endedAt) ctx.out(`now at ${report.endedAt}`);
  if (report.wall) ctx.out(`! ${SIGNIN_HINT}`);
  if (within && report.found.length === 0) ctx.out(`"${within}" matches nothing on the page.`);
  else if (ctx.args.positional.length === 0 && report.found.length === 0) ctx.out('Nothing with a size was found on the page. Is it behind a sign-in, or still loading?');
  for (const f of report.found) {
    if (f.count === 0) {
      ctx.out(`${f.selector}: ${f.error ?? 'matches nothing'}`);
      continue;
    }
    const pad = '  '.repeat(f.depth ?? 0);
    const many = f.count > 1 ? ` (${f.count} matches; the first)` : '';
    const where = whereText(f.where);
    ctx.out(`${pad}${f.selector}${many}  ${f.text ? `"${f.text}"  ` : ''}${f.w}×${f.h} at ${f.x},${f.y}${where ? `  ${where}` : ''}`);
  }
  if (ctx.args.positional.length === 0) ctx.out(`Each line: a selector that finds the part, its first words, its size and place, and the component and file that draw it.${within ? '' : ' A closer map of one part: --within "<selector>".'}`);
  return EXIT.ok;
}

const STEPS_USAGE = '--steps is a JSON list of {"click": "<selector>"}, {"fill": "<selector>", "value": "…"}, {"wait": "<selector>"}, {"scroll": "<selector>"}, {"hover": "<selector>"} or {"key": "Escape"}.';
function stepsOf(raw: string | undefined): z.infer<typeof Step>[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PeError(STEPS_USAGE, 'USAGE');
  }
  const checked = z.array(Step).max(20).safeParse(parsed);
  if (!checked.success) throw new PeError(STEPS_USAGE, 'USAGE');
  return checked.data;
}

/** Sign the browser of the page-reading commands in, once, with the project's development account. */
async function cmdSignin(ctx: Ctx): Promise<number> {
  if (ctx.args.flags.clear) {
    const had = clearSignin(ctx.ws.root);
    ctx.out(ctx.json ? JSON.stringify({ ok: true, cleared: had }) : had ? 'The saved sign-in is gone.' : 'There was no saved sign-in.');
    return EXIT.ok;
  }
  const url = str(ctx.args.flags.url);
  if (!url) {
    const saved = loadSignin(ctx.ws.root);
    if (ctx.json) ctx.out(JSON.stringify({ ok: true, saved: saved ? { savedAt: saved.savedAt, page: saved.page, cookies: saved.cookies.length } : null }, null, 2));
    else if (saved) ctx.out(`Signed in since ${saved.savedAt.slice(0, 16).replace('T', ' ')} (ended on ${saved.page}). "picky-eater signin --clear" forgets it.`);
    else ctx.out('No saved sign-in. picky-eater signin --url <sign-in page> [--steps \'[{"fill":"#email","value":"…"},{"click":"button[type=submit]"}]\']');
    return EXIT.ok;
  }
  if (!Board.shape.base.safeParse({ kind: 'live', url }).success) throw new PeError('--url is a page on a local development server, e.g. http://localhost:5173/login', 'USAGE');
  const steps = stepsOf(str(ctx.args.flags.steps));
  const result = await signIn(checkAssets()['probe.js'], { url, root: ctx.ws.root, steps });
  if (ctx.json) {
    ctx.out(JSON.stringify({ ok: !result.wall, ...result }, null, 2));
    return result.wall ? EXIT.error : EXIT.ok;
  }
  ctx.out(`Ended on ${result.page}${result.title ? ` ("${result.title}")` : ''}; kept ${result.cookies} cookie(s) and ${result.keys} stored value(s) in ${result.file}.`);
  if (result.wall) {
    ctx.out('That page still looks like a sign-in screen: the steps did not get past it. Look with "picky-eater inspect --url <page>" and correct the steps.');
    return EXIT.error;
  }
  ctx.out('inspect, validate, implement and check now open pages with this session. It stays on this machine and out of the repository.');
  return EXIT.ok;
}

async function cmdPropose(ctx: Ctx): Promise<number> {
  const id = resolveSessionId(ctx.ws, str(ctx.args.flags.session));
  let result;
  try {
    result = await propose(ctx.ws, id, { note: str(ctx.args.flags.note), checks: catalogChecks() });
  } catch (err) {
    if (!(err instanceof DraftError)) throw err;
    if (ctx.json) ctx.out(JSON.stringify({ ok: false, issues: err.issues }, null, 2));
    else {
      printIssues(ctx, err.issues);
      ctx.out('Nothing was published. Fix the errors and run "picky-eater propose" again.');
    }
    return EXIT.error;
  }
  if (ctx.json) {
    ctx.out(JSON.stringify({ ok: true, ...result }, null, 2));
    return EXIT.ok;
  }
  printIssues(ctx, result.warnings);
  ctx.out(`Published revision r${result.revision}.`);
  const describe = (c: (typeof result.changes)[number]) =>
    c.kind === 'first' ? 'first revision' : c.kind === 'page' ? 'page frame or shared styles changed' : c.kind === 'cuts' ? 'cuts changed' : `${c.kind.replace('area-', 'area ')}: ${c.area}`;
  ctx.out(`Changes: ${result.changes.map(describe).join('; ')}`);
  if (result.kept.length) ctx.out(`Choices kept: ${result.kept.join(', ')}`);
  if (result.dropped.length) ctx.out(`Choices to make again (the area changed): ${result.dropped.join(', ')}`);
  if (result.answered.length) ctx.out(`Change requests answered: ${result.answered.join(', ')}`);
  if (result.approvalSuperseded) ctx.out(`Approval ${result.approvalSuperseded} no longer applies; the person needs to approve this revision.`);
  for (const m of result.moved) ctx.out(`Suggested mark moved by earlier choices: ${m.area} → ${m.option} (${m.because})`);
  ctx.out('Next: picky-eater preview   (then give the link to the person and run: picky-eater wait)');
  return EXIT.ok;
}

function uiAssets(): UiAssets {
  if (typeof __PE_UI_ASSETS__ === 'undefined') throw new PeError('The review page is only available in the built CLI. Run "npm run build".', 'NOT_BUILT');
  return __PE_UI_ASSETS__;
}

async function cmdPreview(ctx: Ctx): Promise<number> {
  const { flags } = ctx.args;
  const existing = readRuntime(ctx.ws);
  if (flags.stop) {
    if (!existing) ctx.out('No preview is running.');
    else {
      await stop(ctx.ws, existing);
      ctx.out('Preview stopped.');
    }
    return EXIT.ok;
  }
  const id = resolveSessionId(ctx.ws, str(flags.session));
  if (readView(ctx.ws, id).revision === 0) throw new PeError('Nothing to review yet. Publish the draft first: picky-eater propose', 'NO_REVISION');
  const port = flags.port === undefined ? 0 : Number(str(flags.port));
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new PeError('--port must be a number between 0 and 65535.', 'USAGE');

  if (flags.foreground) {
    const idle = Number(str(flags['idle-minutes']) ?? 120);
    // Two listeners: the review page, and the address the user's app is shown from on boards over an existing page.
    const stage = await startStageProxy({ agentJs: uiAssets()['agent.js'], port: stagePortFor(ctx.ws.root) });
    const server = await startReviewServer({ ws: ctx.ws, sessionId: id, assets: uiAssets(), stage, port, idleTimeoutMs: Number.isFinite(idle) ? idle * 60_000 : 0 });
    const rt = { pid: process.pid, port: server.port, stagePort: stage.port, sessionId: id, pageToken: server.pageToken, cliToken: server.cliToken, startedAt: nowIso(), version: VERSION };
    writeRuntime(ctx.ws, rt);
    syncAttached(ctx.ws, stage.port);
    if (!flags.quiet) ctx.out(`Review page: ${server.link}\nPress Ctrl+C to stop.`);
    const shutdown = () => void server.close();
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    await server.closed;
    clearRuntime(ctx.ws, process.pid);
    return EXIT.ok;
  }

  let rt = existing;
  if (rt && (rt.sessionId !== id || rt.version !== VERSION || !(await probe(rt)))) {
    await stop(ctx.ws, rt);
    rt = null;
  }
  const reused = rt !== null;
  rt ??= await startDetached(ctx.ws, ['--root', ctx.ws.root, '--session', id, '--port', String(port)]);
  const link = linkOf(rt);
  if (flags.open) openInBrowser(link);
  if (ctx.json) ctx.out(JSON.stringify({ link, port: rt.port, session: id, reused }, null, 2));
  else {
    ctx.out(`Review page${reused ? ' (already running)' : ''}: ${link}`);
    ctx.out('Give this link to the person. It is private to this machine and contains an access token.');
    ctx.out('Next: picky-eater wait');
  }
  return EXIT.ok;
}

function statusData(ctx: Ctx, id: string) {
  const view = readView(ctx.ws, id);
  const rt = readRuntime(ctx.ws);
  let labels: Record<string, string> = {};
  let build: Array<{ area: string; option: string; pattern?: string; build?: string }> = [];
  if (view.revision > 0) {
    const { board, manifest } = readRevision(ctx.ws, id, view.revision);
    labels = Object.fromEntries(board.areas.map((a) => [a.id, a.label]));
    const placements = Object.fromEntries(Object.entries(manifest.areas).map(([area, a]) => [area, a.placement]));
    const chosen = view.approval?.choices ?? view.choices;
    build = activeAreas(board, placements, chosen)
      .filter((area) => chosen[area])
      .map((area) => {
        const option = board.areas.find((a) => a.id === area)!.options.find((o) => o.id === chosen[area])!;
        return { area, option: option.id, ...(option.pattern ? { pattern: option.pattern } : {}), ...(option.build ? { build: option.build } : {}) };
      });
  }
  // What the review page could not find or apply on the running page, for the revision on show.
  let seen: Array<{ area: string; option: string | null; code: string; detail: string }> = [];
  const file = join(ctx.ws.runtimeDir, 'diagnostics.json');
  if (existsSync(file)) {
    try {
      const d = readJson(file) as { sessionId?: string; revision?: number; problems?: typeof seen };
      if (d.sessionId === id && d.revision === view.revision && Array.isArray(d.problems)) seen = d.problems;
    } catch {
      seen = [];
    }
  }
  // After approval: has the approved page been measured, has the built page been compared, is it reported?
  const approval = view.approval?.id;
  const key = approval ? readAnswerKey(ctx.ws, id, approval) : null;
  const check = approval ? latestCheck(ctx.ws, id, approval) : null;
  const report = approval ? readReport(ctx.ws, id, approval) : null;
  const built = {
    answerKey: key ? { capturedAt: key.capturedAt, views: key.views.length } : null,
    check: check ? { id: check.id, at: check.at, ok: check.ok, differences: check.differences.length } : null,
    report: report ? { at: report.at, check: report.check, ok: report.ok, deviations: report.deviations } : null,
  };
  return { view, rt: rt && rt.sessionId === id ? rt : null, labels, build, seen, attached: attachedFiles(ctx.ws), built };
}

const PROBLEMS: Record<string, string> = {
  ANCHOR_MISSING: 'the anchor matches nothing on the page',
  TARGET_MISSING: 'a selector of the patch matches nothing inside the anchor',
  SCRIPT_FAILED: 'the script did not run',
  REVERTED: 'the page keeps undoing the patch',
};

function printStatus(ctx: Ctx, id: string) {
  const { view, rt, labels, build, seen, attached, built } = statusData(ctx, id);
  const open = view.requests.filter((r) => r.status === 'open');
  if (ctx.json) {
    ctx.out(
      JSON.stringify(
        { session: view.session.id, title: view.session.title, phase: view.phase, revision: view.revision, digest: view.digest, choices: view.choices, missing: view.missing, approval: view.approval, openRequests: open, chosen: build, pageProblems: seen, attached, ...built, preview: rt ? linkOf(rt) : null },
        null,
        2,
      ),
    );
    return view;
  }
  ctx.out(`Session: ${view.session.id} — ${view.session.title}`);
  ctx.out(`Revision: ${view.revision === 0 ? 'none' : `r${view.revision}`}`);
  ctx.out(`Phase: ${phaseLine(view)}`);
  if (build.length) {
    ctx.out(view.phase === 'approved' ? 'Approved choices:' : 'Choices so far:');
    for (const b of build) ctx.out(`  ${b.area} (${labels[b.area]}): ${b.option}${b.pattern ? ` [${b.pattern}]` : ''}${b.build ? ` — ${b.build}` : ''}`);
  }
  if (view.missing.length) ctx.out(`Not chosen yet: ${view.missing.join(', ')}`);
  for (const r of open) ctx.out(`Change request ${r.id}${r.area ? ` (area "${r.area}"${r.cut ? `, cut "${r.cut}"` : ''})` : ' (whole page)'}: ${r.text}`);
  for (const p of seen) ctx.out(`Problem on the page: ${p.area}${p.option ? `/${p.option}` : ''}: ${PROBLEMS[p.code] ?? p.code} (${p.detail})`);
  if (attached.length) ctx.out(`Script tag in place: ${attached.join(', ')} — remove it with "picky-eater detach" before you finish`);
  if (rt) ctx.out(`Preview: ${linkOf(rt)}`);
  if (view.phase === 'approved') {
    if (built.check) ctx.out(`Compared with the built page: ${built.check.id}, ${built.check.ok ? 'no differences' : `${built.check.differences} difference(s)`}`);
    if (built.report) ctx.out(`Reported: ${built.report.ok ? 'built as approved' : `built with ${built.report.deviations.length} declared deviation(s)`}`);
    if (!built.answerKey) ctx.out('Next: picky-eater implement   (before you change any code)');
    else if (!built.check) ctx.out('Next: build what was approved, then picky-eater check');
    else if (!built.check.ok && !built.report) ctx.out('Next: fix the differences, then picky-eater check');
    else if (!built.report) ctx.out('Next: picky-eater report --summary "<what you built>"');
  }
  if (view.phase === 'drafting') ctx.out('Next: picky-eater validate, then picky-eater propose');
  else if (view.phase === 'changes-requested') ctx.out('Next: change the named area in the draft, then picky-eater propose');
  else if (view.phase === 'choosing') ctx.out(rt ? 'Next: picky-eater wait' : 'Next: picky-eater preview');
  return view;
}

function cmdStatus(ctx: Ctx): number {
  printStatus(ctx, resolveSessionId(ctx.ws, str(ctx.args.flags.session)));
  return EXIT.ok;
}

async function cmdWait(ctx: Ctx): Promise<number> {
  const id = resolveSessionId(ctx.ws, str(ctx.args.flags.session));
  const seconds = Number(str(ctx.args.flags.timeout) ?? 90);
  if (!Number.isFinite(seconds) || seconds < 0) throw new PeError('--timeout is a number of seconds.', 'USAGE');
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    const phase = readView(ctx.ws, id).phase;
    if (phase === 'approved' || phase === 'changes-requested' || phase === 'drafting') break;
    if (Date.now() >= deadline) {
      if (ctx.json) ctx.out(JSON.stringify({ phase, waiting: true }, null, 2));
      else ctx.out('Still waiting for the person. Run "picky-eater wait" again.');
      return EXIT.timeout;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  const view = printStatus(ctx, id);
  return view.phase === 'approved' ? EXIT.ok : view.phase === 'changes-requested' ? EXIT.changesRequested : EXIT.error;
}

function cmdPatterns(ctx: Ctx): number {
  const catalog = getCatalog();
  const { flags, positional } = ctx.args;
  if (flags.markdown) {
    ctx.out(renderMarkdown(catalog).trimEnd());
    return EXIT.ok;
  }
  const find = str(flags.find);
  const category = str(flags.category);
  if (category && !(CATEGORIES as readonly string[]).includes(category)) throw new PeError(`Unknown category "${category}". Categories: ${CATEGORIES.join(', ')}.`, 'USAGE');

  if (positional.length > 0) {
    const found = positional.map((id) => ({ id, pattern: catalog.patterns.find((p) => p.id === id), decision: catalog.decisions.find((d) => d.id === id) }));
    const unknown = found.filter((f) => !f.pattern && !f.decision).map((f) => f.id);
    if (unknown.length) throw new PeError(`Not in the catalog: ${unknown.join(', ')}. Run "picky-eater patterns" for the index, or --find "<words>".`, 'UNKNOWN_PATTERN');
    if (ctx.json) ctx.out(JSON.stringify(found.map((f) => (f.pattern ? { ...f.pattern, snippet: snippetFor(f.pattern.id) } : f.decision)), null, 2));
    else {
      ctx.out(
        found
          .map((f) => {
            if (!f.pattern) return describeDecision(f.decision!);
            const snippet = snippetFor(f.pattern.id);
            return describePattern(f.pattern) + (snippet ? `\nMockup snippet (uses the built-in kit classes):\n${snippet}` : '');
          })
          .join('\n\n'),
      );
    }
    return EXIT.ok;
  }
  if (find) {
    const hits = search(catalog, find);
    if (ctx.json) ctx.out(JSON.stringify({ decisions: hits.decisions, patterns: hits.patterns.map((p) => ({ id: p.id, name: p.name, category: p.category, what: p.what })) }, null, 2));
    else if (hits.decisions.length + hits.patterns.length === 0) ctx.out(`Nothing matches "${find}". Run "picky-eater patterns" for the index.`);
    else {
      ctx.out([...hits.decisions.slice(0, 5).map(describeDecision), ...hits.patterns.slice(0, 8).map((p) => `${p.id} [${p.category}]: ${p.what}`)].join('\n'));
      ctx.out('\nDetails: picky-eater patterns <id> [<id>…]');
    }
    return EXIT.ok;
  }
  const scoped = category ? { ...catalog, decisions: flags.decisions ? catalog.decisions : [], patterns: catalog.patterns.filter((p) => p.category === category) } : catalog;
  if (ctx.json) ctx.out(JSON.stringify({ decisions: scoped.decisions.map((d) => ({ id: d.id, question: d.question })), patterns: scoped.patterns.map((p) => ({ id: p.id, name: p.name, category: p.category, what: p.what })) }, null, 2));
  else {
    ctx.out(flags.decisions && !category ? scoped.decisions.map(describeDecision).join('\n\n') : describeIndex(scoped));
    ctx.out('\nDetails: picky-eater patterns <id> [<id>…]   Search: picky-eater patterns --find "<words>"');
  }
  return EXIT.ok;
}

/** The page a command is about: the one named, or the page of the session's draft. */
function pageOf(ctx: Ctx): string | undefined {
  const url = str(ctx.args.flags.url);
  if (url) return url;
  try {
    const { result } = checkDraft(ctx.ws, resolveSessionId(ctx.ws, str(ctx.args.flags.session)), catalogChecks());
    if (result.board?.base.kind === 'live') return result.board.base.url;
  } catch {
    /* no session, or a draft that does not parse yet */
  }
  return undefined;
}

/** What to offer: on a running page, the moments where it could move; for a decision, its candidates. Both with what the person chose before. */
async function cmdRecommend(ctx: Ctx): Promise<number> {
  const catalog = getCatalog();
  const raw = str(ctx.args.flags.frequency);
  if (raw !== undefined && !(FREQUENCIES as readonly string[]).includes(raw)) throw new PeError(`--frequency is how often a person meets the page: ${FREQUENCIES.join(', ')}.`, 'USAGE');
  const frequency = raw as Frequency | undefined;
  const on = tasteOn(ctx.ws);
  const project = projectKey(ctx.ws.root);
  const rules = on ? readRules() : [];
  const evidence = on ? gather(readEvents(), rules, project) : null;

  if (ctx.args.positional.length > 0) {
    const found = ctx.args.positional.map((id) => ({ id, decision: catalog.decisions.find((d) => d.id === id) }));
    const unknown = found.filter((f) => !f.decision).map((f) => f.id);
    if (unknown.length) throw new PeError(`Not a decision of the catalog: ${unknown.join(', ')}. Run "picky-eater patterns" for the list.`, 'UNKNOWN_PATTERN');
    const decided = found.map((f) => ({ decision: f.decision!, ...decide(catalog, f.decision!, frequency ?? 'rare', evidence) }));
    if (ctx.json) ctx.out(JSON.stringify(decided.map((d) => ({ decision: d.decision.id, question: d.decision.question, offer: d.offer.map(({ css: _css, ...c }) => c), rejected: d.rejected, taste: d.taste })), null, 2));
    else ctx.out(decided.map((d) => describeDecided(d.decision, frequency ?? null, d)).join('\n\n'));
    return EXIT.ok;
  }

  const url = pageOf(ctx);
  if (!url || !Board.shape.base.safeParse({ kind: 'live', url }).success) {
    throw new PeError('Say which page: picky-eater recommend --url http://localhost:5173/pricing, or name decisions: picky-eater recommend landing-hero', 'USAGE');
  }
  const { profile, frameworks, wall } = await profileOf(checkAssets()['probe.js'], { url, root: ctx.ws.root });
  const rec = recommend(catalog, profile, { ...(frequency ? { frequency } : {}), evidence, rules, project });
  if (ctx.json) {
    const slim = (r: (typeof rec.areas)[number]) => ({ ...r, offer: r.offer.map(({ css: _css, ...c }) => c) });
    ctx.out(JSON.stringify({ url, frameworks, surface: profile.surface, motion: profile.motion, tokens: profile.tokens, ...rec, areas: rec.areas.map(slim), later: rec.later.map(slim), ...(wall ? { wall } : {}) }, null, 2));
    return EXIT.ok;
  }
  if (wall) ctx.out(`! ${SIGNIN_HINT}`);
  ctx.out(describeRecommended(url, profile, frameworks, rec));
  return EXIT.ok;
}

/** What is remembered of the person's choices. The agent can read it and propose a rule; only the person keeps one. */
function cmdTaste(ctx: Ctx): number {
  const { flags, positional } = ctx.args;
  const project = projectKey(ctx.ws.root);
  if (flags.off || flags.on) {
    writeWorkspace(ctx.ws, { ...readWorkspace(ctx.ws), taste: !flags.off });
    ctx.out(ctx.json ? JSON.stringify({ ok: true, taste: !flags.off }) : flags.off ? 'This project no longer reads or writes what was chosen before. "picky-eater taste --on" turns it back on.' : 'This project remembers choices again.');
    return EXIT.ok;
  }
  if (flags['forget-all'] || flags.forget !== undefined) {
    const what = flags['forget-all'] ? null : (str(flags.forget) ?? null);
    if (!flags['forget-all'] && !what) throw new PeError('Say what to forget: a project, a pattern id or a rule id. Or --forget-all.', 'USAGE');
    const gone = forget(what);
    ctx.out(ctx.json ? JSON.stringify({ ok: true, ...gone }) : `Forgot ${gone.events} choice(s) and ${gone.rules} rule(s).`);
    return EXIT.ok;
  }
  if (positional[0] === 'propose') {
    const text = str(flags.rule);
    if (!text) throw new PeError('Give the rule as one sentence: picky-eater taste propose --rule "No motion on product screens"', 'USAGE');
    const [prefer, over] = [str(flags.prefer), str(flags.over)];
    if (Boolean(prefer) !== Boolean(over)) throw new PeError('--prefer and --over go together: the pattern to prefer, and over which.', 'USAGE');
    const ids = new Set(getCatalog().patterns.map((p) => p.id));
    for (const id of [prefer, over]) if (id && !ids.has(id)) throw new PeError(`"${id}" is not a pattern of the catalog.`, 'UNKNOWN_PATTERN');
    if (!tasteOn(ctx.ws)) throw new PeError('Taste is switched off for this project ("picky-eater taste --on").', 'TASTE_OFF');
    let rule;
    try {
      rule = proposeRule({ text, project, ...(prefer ? { prefer, over: over! } : {}), ...(str(flags.from) ? { from: str(flags.from)! } : {}) });
    } catch {
      throw new PeError('The rule is one line of plain text, 3 to 300 characters.', 'USAGE');
    }
    if (ctx.json) ctx.out(JSON.stringify({ ok: true, rule }, null, 2));
    else {
      ctx.out(`Proposed rule ${rule.id}: ${rule.text}`);
      ctx.out('It is pending. The person keeps or discards it in the review page (History). Until then it does not count.');
    }
    return EXIT.ok;
  }
  if (positional.length > 0) throw new PeError('picky-eater taste [propose --rule "<sentence>"] [--off | --on | --forget <what> | --forget-all]', 'USAGE');

  const on = tasteOn(ctx.ws);
  const events = readEvents();
  const rules = readRules();
  const lines = summarize(gather(events, rules, project));
  const mine = rules.filter((r) => r.project === project || r.scope === 'general');
  if (ctx.json) {
    ctx.out(JSON.stringify({ on, project, folder: tasteDir(), choices: standingEvents(events).length, preferences: lines, rules: mine }, null, 2));
    return EXIT.ok;
  }
  ctx.out(`Project: ${project}${on ? '' : '  (taste is switched off for this project)'}`);
  ctx.out(`Remembered in ${tasteDir()}: ${standingEvents(events).length} choice(s), ${rules.length} rule(s). Nothing leaves this machine.`);
  const section = (title: string, scope: 'project' | 'general' | 'seen') => {
    const list = lines.filter((l) => l.scope === scope);
    if (list.length === 0) return;
    ctx.out(`\n${title}`);
    for (const l of list) ctx.out(`  ${l.text} — ${l.detail}`);
  };
  section('In this project (counts in full)', 'project');
  section('In general (repeated across projects; counts for half)', 'general');
  section('Seen elsewhere (not used yet)', 'seen');
  if (lines.length === 0) ctx.out('\nNo choices yet. They are recorded when the person approves a page.');
  if (mine.length) {
    ctx.out('\nRules');
    for (const r of mine) ctx.out(`  ${r.id} [${r.status === 'kept' ? (r.scope === 'general' ? 'kept, all projects' : 'kept, this project') : 'pending: the person decides in the review'}] ${r.text}`);
  }
  return EXIT.ok;
}

function checkAssets() {
  const assets = uiAssets();
  return { 'probe.js': assets['probe.js'], 'composer.js': assets['composer.js'] };
}

async function cmdImplement(ctx: Ctx): Promise<number> {
  const id = resolveSessionId(ctx.ws, str(ctx.args.flags.session));
  const { key, fresh, changed } = await captureAnswerKey(ctx.ws, id, checkAssets(), { recapture: Boolean(ctx.args.flags.recapture) });
  const lines = brief(ctx.ws, id);
  const hint = builtHint(ctx.ws, id);
  if (ctx.json) {
    ctx.out(JSON.stringify({ ok: true, approval: key.approval, answerKey: { fresh, capturedAt: key.capturedAt, views: key.views.length, browser: key.browser, sourcesChangedSince: changed }, build: lines, built: hint }, null, 2));
    return EXIT.ok;
  }
  const widths = new Set(key.views.map((v) => v.viewport)).size;
  ctx.out(`Approved: ${key.approval}.`);
  ctx.out(
    fresh
      ? `The approved page is measured: ${widths} width(s) × ${key.views.length / widths} moment(s), with ${key.browser}. This is what "check" compares the built page with.`
      : `The approved page was already measured on ${key.capturedAt}; that measurement is kept.${changed.length ? ` (Changed since then: ${changed.join(', ')}.)` : ''}`,
  );
  ctx.out('Build exactly this, in the project\'s own code:');
  for (const line of lines) ctx.out(line);
  for (const line of hint) ctx.out(line);
  ctx.out('Next: build it, then picky-eater check');
  return EXIT.ok;
}

async function cmdCheck(ctx: Ctx): Promise<number> {
  const id = resolveSessionId(ctx.ws, str(ctx.args.flags.session));
  const result = await runCheck(ctx.ws, id, checkAssets(), { url: str(ctx.args.flags.url) });
  const lines = differenceLines(result.differences);
  const dir = sessionPaths(ctx.ws, id).checksDir.slice(ctx.ws.root.length + 1);
  if (ctx.json) {
    ctx.out(JSON.stringify({ ok: result.ok, check: result.id, url: result.url, differences: lines, pictures: `${dir}/${result.id}` }, null, 2));
    return result.ok ? EXIT.ok : EXIT.differences;
  }
  ctx.out(`Compared ${result.url} with what was approved (${result.approval}): ${result.views.length} view(s), check ${result.id}.`);
  if (result.ok) {
    ctx.out('The built page matches the approved one.');
    ctx.out('Next: picky-eater report --summary "<what you built>"');
    return EXIT.ok;
  }
  ctx.out(`${lines.length} difference(s):`);
  for (const line of lines.slice(0, 40)) ctx.out(`  ${line}`);
  if (lines.length > 40) ctx.out(`  … and ${lines.length - 40} more. Fix these first; many of the rest follow from them.`);
  ctx.out(`Pictures of the built page: ${dir}/${result.id}/   approved: ${sessionPaths(ctx.ws, id).answerKeyDir(result.approval).slice(ctx.ws.root.length + 1)}/`);
  ctx.out('Fix the differences in the code and run "picky-eater check" again.');
  return EXIT.differences;
}

function cmdReport(ctx: Ctx): number {
  const id = resolveSessionId(ctx.ws, str(ctx.args.flags.session));
  const summary = str(ctx.args.flags.summary)?.trim();
  if (!summary) throw new PeError('Say what you built: picky-eater report --summary "<one or two sentences>"', 'USAGE');
  const deviations = (str(ctx.args.flags.deviation) ?? '').split('\n').map((d) => d.trim()).filter(Boolean);
  const report = writeReport(ctx.ws, id, { summary: summary.slice(0, 2000), deviations, attached: attachedFiles(ctx.ws) });
  if (ctx.json) ctx.out(JSON.stringify({ ok: true, report }, null, 2));
  else {
    ctx.out(report.ok ? `Recorded: built as approved (${report.approval}, check ${report.check}).` : `Recorded: built with ${report.deviations.length} declared deviation(s) from ${report.approval} (check ${report.check}).`);
    ctx.out('Tell the person what you built and, if anything differs from what they approved, what and why.');
  }
  return EXIT.ok;
}

function cmdAttach(ctx: Ctx): number {
  const file = str(ctx.args.flags.file) ?? ctx.args.positional[0];
  if (!file) throw new PeError('Name the HTML file your development server serves: picky-eater attach --file index.html', 'USAGE');
  const port = readRuntime(ctx.ws)?.stagePort ?? stagePortFor(ctx.ws.root);
  attach(ctx.ws, file, port);
  if (ctx.json) ctx.out(JSON.stringify({ ok: true, file, port }, null, 2));
  else {
    ctx.out(`Added picky-eater's script tag to ${file}.`);
    ctx.out('It only loads from this machine while the preview runs. Remove it with: picky-eater detach');
  }
  return EXIT.ok;
}

function cmdDetach(ctx: Ctx): number {
  const files = detach(ctx.ws);
  if (ctx.json) ctx.out(JSON.stringify({ ok: true, files }, null, 2));
  else ctx.out(files.length ? `Removed picky-eater's script tag from ${files.join(', ')}.` : 'No script tag was in place.');
  return EXIT.ok;
}

function cmdSchema(ctx: Ctx): number {
  ctx.out(JSON.stringify(z.toJSONSchema(Board, { io: 'input' }), null, 2));
  return EXIT.ok;
}

export async function main(argv: string[]): Promise<number> {
  const out = (line = '') => void process.stdout.write(line + '\n');
  let json = argv.includes('--json');
  try {
    const args = parseArgs(argv);
    json = Boolean(args.flags.json);
    if (args.flags.version || args.command === 'version') {
      out(VERSION);
      return EXIT.ok;
    }
    if (args.flags.help || args.command === '' || args.command === 'help') {
      out(HELP);
      return EXIT.ok;
    }
    const ctx: Ctx = { args, ws: workspace(str(args.flags.root) ?? process.cwd()), json, out };
    switch (args.command) {
      case 'new':
        cmdNew(ctx);
        return EXIT.ok;
      case 'validate':
        return await cmdValidate(ctx);
      case 'inspect':
        return await cmdInspect(ctx);
      case 'signin':
        return await cmdSignin(ctx);
      case 'propose':
        return await cmdPropose(ctx);
      case 'preview':
        return await cmdPreview(ctx);
      case 'status':
        return cmdStatus(ctx);
      case 'wait':
        return await cmdWait(ctx);
      case 'patterns':
        return cmdPatterns(ctx);
      case 'recommend':
        return await cmdRecommend(ctx);
      case 'taste':
        return cmdTaste(ctx);
      case 'schema':
        return cmdSchema(ctx);
      case 'kit':
        // The stylesheet behind the pk-* classes of mockups, for writing the same styles in the project's own code.
        ctx.out(kitCss.trimEnd());
        return EXIT.ok;
      case 'implement':
        return await cmdImplement(ctx);
      case 'check':
        return await cmdCheck(ctx);
      case 'report':
        return cmdReport(ctx);
      case 'attach':
        return cmdAttach(ctx);
      case 'detach':
        return cmdDetach(ctx);
      case 'sessions':
        out(json ? JSON.stringify(listSessions(ctx.ws)) : listSessions(ctx.ws).join('\n') || 'No sessions.');
        return EXIT.ok;
      default:
        throw new PeError(`Unknown command "${args.command}". Run "picky-eater --help".`, 'USAGE');
    }
  } catch (err) {
    const e = err instanceof PeError ? err : new PeError((err as Error).message ?? String(err), 'INTERNAL');
    if (json) out(JSON.stringify({ ok: false, error: { code: e.code, message: e.message } }, null, 2));
    else process.stderr.write(`Error (${e.code}): ${e.message}\n`);
    if (!(err instanceof PeError) && process.env.PE_DEBUG) process.stderr.write(`${(err as Error).stack}\n`);
    return e.exitCode;
  }
}
