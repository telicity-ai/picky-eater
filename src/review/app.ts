import { activeAreas, missingChoices, pruneChoices, stateOf } from '../core/graph.js';
import type { Area, Change, Viewport } from '../core/schema.js';
import type { PublicState } from '../server/review-server.js';
import type { Problem } from '../stage/protocol.js';
import { compose, serialize, type Look, type Pack } from './compose.js';
import { areaBox, fill, findArea, reveal, type Box } from './geometry.js';
import { LiveStage } from './live-stage.js';
import { createMini, type MiniFrame } from './mini.js';
import { flattened, parseSnapshot, snapshotHtml, withOption, type SnapshotDoc } from './snapshot.js';
import { Stage, type Placement, type StageDriver, type StageHandlers } from './stage.js';

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

type Child = Node | string | null | false | undefined;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | null | undefined> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) if (child) el.append(child);
  return el;
}

const SVG = {
  check: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1.6l1.9 4 4.4.6-3.2 3 .8 4.3L8 11.4l-3.9 2.1.8-4.3-3.2-3 4.4-.6z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
  pencil: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
};
const icon = (svg: string, cls: string) => {
  const span = h('span', { class: cls });
  span.innerHTML = svg; // constant markup from this file
  return span;
};

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------

let token = '';
let etag = '';
let server: PublicState | null = null;
let pack: Pack | null = null;
/** The person's choices as shown, ahead of the server while a save is on its way. */
let choices: Record<string, string> = {};
let viewportId = '';
let cutId = '';
let preview: { area: string; option: string } | null = null;
/** How the stage shows motion. Kept across drafts. */
const motionMode = { slow: false, reduced: false };
let saving = 0;
/** Counts every choice sent and every answer to it, so that an older answer of the server is never shown over a newer choice. */
let changes = 0;
let saveChain: Promise<void> = Promise.resolve();

const stageHost = $('stage');
/** The stage of the current draft: a mockup, or the running app. Made when the first draft arrives. */
let stage!: StageDriver;
let stageKey = '';
const handlers: StageHandlers = {
  dotEnter: (area) => {
    clearTimeout(idleClose);
    if (openArea !== area) void openOptions(area, false);
  },
  dotLeave: () => {
    clearTimeout(idleClose);
    if (movedForOptions) return; // the page was scrolled under the pointer; that is not leaving
    idleClose = window.setTimeout(() => !overPopover && closeOptions(), 1500);
  },
  dotClick: (area) => void openOptions(area, false),
  go: (state) => void showCut(state, false),
  cutSeen: (cut) => {
    cutId = cut;
    markCut();
  },
  layout: () => {
    scheduleSheet();
    // Also for the strip: a page that fetches its data is first pictured while it is still loading.
    scheduleShot(true, 500);
  },
  scroll: () => {
    moveSheetView();
    if (popover && openArea) positionPopover();
    scheduleShot(false, 700); // parts that appear while scrolling show up in the miniature
  },
  problems: (list) => {
    if (isBuilt()) return; // the board describes the page before it was built
    problems = list;
    scheduleSheet();
    reportProblems();
    // An option that the page would not take is said once, in words: otherwise choosing it looks broken.
    for (const p of list) {
      const key = `${p.area}/${p.option}/${p.code}`;
      if (p.option === null || p.code === 'ANCHOR_MISSING' || told.has(key)) continue;
      told.add(key);
      const option = areaOf(p.area)?.options.find((o) => o.id === p.option);
      if (option) toast(`"${option.label}" cannot be shown on this page${p.code === 'REVERTED' ? ': the page keeps changing that part back' : ''}. Your coding agent has been told.`);
    }
  },
  notice: (text) => toast(text),
  wall: (on) => {
    walled = on;
    $('sheet-note').hidden = !on;
    scheduleSheet();
  },
  away: (on) => {
    $('sheet-away').hidden = !on;
  },
};

const board = () => pack!.board;
/**
 * Once an existing page has been built and compared, the running page already is the result:
 * the approved patches are no longer laid over it.
 */
const isBuilt = () => pack?.board.base.kind === 'live' && Boolean(server?.built);
const look = (): Look => ({ choices: isBuilt() ? {} : choices, preview, state: stateOf(board(), cutId) });
const committed = (): Look => ({ choices, state: stateOf(board(), cutId) });
const viewport = (): Viewport => board().viewports.find((v) => v.id === viewportId) ?? board().viewports[0]!;
const areaOf = (id: string): Area => board().areas.find((a) => a.id === id)!;
const locked = () => server?.phase === 'approved';
const active = () => activeAreas(board(), pack!.placements, choices);
const missing = () => missingChoices(board(), pack!.placements, choices);
const isLive = () => pack?.board.base.kind === 'live';
const notesOf = (area: string) => pack?.notes?.[area] ?? { by: null, rejected: [], moving: [] };
const moves = (area: string, option: string | undefined) => option !== undefined && notesOf(area).moving.includes(option);
const hasMotion = () => Object.values(pack?.notes ?? {}).some((n) => n.moving.length > 0);
/** Play again what appears: the area whose options are open, or every area that shows a moving option. */
function replayMotion(): void {
  if (!pack) return;
  const shown = (id: string) => (preview?.area === id ? preview.option : choices[id]);
  const ids = openArea ? [openArea] : active().filter((id) => moves(id, shown(id)));
  for (const id of ids.length > 0 ? ids : active()) stage.replay(id);
}
/** Wait until the stage has taken in a scroll or a change. The running app answers by message, so it needs a little longer. */
const settle = () => (isLive() ? new Promise<void>((r) => setTimeout(r, 180)) : new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
/**
 * Wait until the area has its place on the screen after a scroll. A slow page answers late: the
 * wait ends when it has answered, not after a fixed time.
 */
async function placed(areaId: string, limit = 3000): Promise<void> {
  await settle();
  for (let waited = 0; waited < limit && !stage.placement(areaId); waited += 60) await new Promise<void>((r) => setTimeout(r, 60));
}

// ---------------------------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------------------------

async function api<T>(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; data: T; etag: string }> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-PE-Token': token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (res.status === 304) return { status: 304, data: undefined as T, etag: res.headers.get('ETag') ?? '' };
  const data = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? 'Something went wrong.');
  return { status: res.status, data: data as T, etag: res.headers.get('ETag') ?? '' };
}

const stamp = () => ({ revision: server!.revision, digest: server!.digest! });

/** Fetch the session state and bring the screen in line with it. */
async function refresh(): Promise<void> {
  const asked = changes;
  const res = await api<PublicState>('/api/state', undefined, etag ? { 'If-None-Match': etag } : {});
  if (res.status === 304) return;
  // Asked before a choice of ours was stored: this answer is older than what is on screen. The next poll brings the newer state.
  if (asked !== changes || saving > 0) return;
  etag = res.etag;
  await adopt(res.data);
}

async function adopt(next: PublicState): Promise<void> {
  const previous = server;
  server = next;
  if (next.revision === 0) {
    showMessage('Nothing to look at yet', 'Your coding agent is still drawing the page. This screen updates by itself when the first draft arrives.');
    return;
  }
  hideMessage();
  if (!pack || pack.revision !== next.revision) {
    const arriving = pack !== null;
    // A new draft opens where the person was looking, not at the top again.
    const was = arriving ? { cut: cutId, y: stage?.metrics()?.scrollY ?? 0 } : null;
    if (pack) closeOptions();
    pack = (await api<Pack>(`/api/pack/${next.revision}`)).data;
    choices = { ...next.choices };
    preview = null;
    for (const cell of cells.values()) cell.el.remove();
    cells.clear();
    clearShots();
    problems = [];
    if (!board().viewports.some((v) => v.id === viewportId)) viewportId = board().viewports[0]!.id;
    cutId = board().cuts[0]!.id;
    if (isLive() && !next.stage) {
      showMessage('This draft cannot be shown', 'It draws on a running page, and this preview was started without the second address it needs. Ask your coding agent to restart the preview.');
      return;
    }
    const key = next.stage ? `live ${next.stage.url}` : 'sketch';
    if (key !== stageKey) {
      stage?.destroy();
      stage = next.stage ? new LiveStage(stageHost, handlers, next.stage) : new Stage(stageHost, handlers);
      stageKey = key;
    }
    stage.dotsOn = !locked();
    stage.setMotion(motionMode);
    await stage.load(pack, viewport(), look());
    if (was && board().cuts.some((c) => c.id === was.cut) && (was.cut !== cutId || was.y > 0)) {
      cutId = was.cut;
      await stage.showCut(cutId, look());
      stage.scrollToPage(was.y);
    }
    renderAll();
    shotForStrip = true;
    void takeShot();
    if (arriving) toast('A new draft arrived.');
    return;
  }
  if (saving === 0 && JSON.stringify(choices) !== JSON.stringify(next.choices)) {
    choices = { ...next.choices };
    await stage.update(look());
  }
  if (previous?.phase !== next.phase && next.phase === 'approved') closeOptions();
  if (Boolean(previous?.built) !== Boolean(next.built) && isLive()) {
    problems = [];
    await stage.update(look());
  }
  stage.dotsOn = !locked();
  renderAll();
}

function save(): void {
  saving++;
  changes++;
  saveChain = saveChain
    .then(async () => {
      const res = await api<PublicState>('/api/choices', { ...stamp(), choices });
      changes++;
      etag = '';
      server = res.data;
    })
    .catch(async (err: unknown) => {
      toast(err instanceof ApiError ? err.message : 'Your choice could not be saved.');
      saving = 0;
      etag = '';
      await refresh().catch(() => {});
    })
    .finally(() => {
      saving = Math.max(0, saving - 1);
      renderTop();
    });
}

// ---------------------------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------------------------

function renderTop(): void {
  if (!server || !pack) return;
  $('title').textContent = server.session.title;
  document.title = `${server.session.title} · picky-eater`;
  $('draft').textContent = `Draft ${server.revision}`;

  const seg = $('viewports');
  seg.replaceChildren(
    ...board().viewports.map((v) => {
      const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(v.id === viewport().id), 'data-viewport': v.id }, v.label ?? v.id);
      b.addEventListener('click', () => void setViewport(v.id));
      return b;
    }),
  );
  seg.hidden = board().viewports.length < 2;
  // Only a board that offers motion has the switches for looking at it.
  $('motion').hidden = !hasMotion();
  $('motion-slow').setAttribute('aria-pressed', String(motionMode.slow));
  $('motion-reduced').setAttribute('aria-pressed', String(motionMode.reduced));

  const all = active();
  const todo = new Set(missing());
  $('pips').replaceChildren(...all.map((id) => h('i', { class: todo.has(id) ? '' : 'is-on' })));
  $('count').textContent = `${all.length - todo.size} of ${all.length} chosen`;
  const progress = $<HTMLButtonElement>('progress');
  progress.disabled = todo.size === 0 || locked();
  progress.title = todo.size ? 'Go to the next area to choose' : '';

  const status = $('status');
  const text = server.phase === 'approved' ? 'Approved' : server.phase === 'changes-requested' ? 'Waiting for a new draft' : '';
  status.hidden = text === '';
  status.textContent = text;
  status.className = `status is-${server.phase}`;

  $('btn-built').hidden = !server.built;
  const approve = $<HTMLButtonElement>('btn-approve');
  if (locked()) {
    approve.textContent = 'Change something';
    approve.className = 'btn';
    approve.disabled = false;
    approve.title = '';
  } else {
    approve.textContent = 'Approve';
    approve.className = 'btn btn-primary';
    approve.disabled = todo.size > 0;
    approve.title = todo.size > 0 ? 'Choose an option for every area first' : '';
  }
}

async function setViewport(id: string): Promise<void> {
  if (!pack || id === viewportId) return;
  viewportId = id;
  closeOptions();
  clearShots();
  await stage.load(pack, viewport(), look());
  await stage.showCut(cutId, look());
  renderAll();
  scheduleShot(true, 300);
}

// ---------------------------------------------------------------------------------------------
// Sheet: the whole page in miniature, one cell per area
// ---------------------------------------------------------------------------------------------

const SHEET_WIDTH = 168;
const cells = new Map<string, { el: HTMLButtonElement; miniKey: string }>();
let sheetScale = 0.1;
let sheetQueued = false;

function scheduleSheet(): void {
  if (sheetQueued) return;
  sheetQueued = true;
  requestAnimationFrame(() => {
    sheetQueued = false;
    renderSheet();
  });
}

function cellLabel(area: Area): string {
  const picked = area.options.find((o) => o.id === choices[area.id]);
  return picked ? `${area.label}: ${picked.label}` : `${area.label}: not chosen yet`;
}

/** The choice of an area together with the choices of the areas inside it. */
function subtreeKey(id: string): string {
  const picked = choices[id];
  if (picked === undefined) return `${id}=`;
  const inner = board()
    .areas.filter((a) => pack!.placements[a.id]?.hosts.some((host) => host.area === id && host.option === picked))
    .map((a) => subtreeKey(a.id));
  return `${id}=${picked}(${inner.join(',')})`;
}

function renderSheet(): void {
  const m = pack ? stage.metrics() : null;
  if (!pack || !m) return;
  const sheet = $('sheet');
  const rail = sheet.parentElement!;
  // As wide as the rail allows, but small enough to show the whole page when that is possible.
  const s = Math.min(SHEET_WIDTH / m.width, Math.max(0.1, (rail.clientHeight - 32 - $('sheet-more').offsetHeight - 12) / m.height));
  sheetScale = s;
  sheet.style.width = `${Math.round(m.width * s)}px`;
  sheet.style.height = `${Math.round(m.height * s)}px`;
  const boxes = stage.boxes();
  const state = stateOf(board(), cutId);
  // Larger areas first, so that areas inside other areas end up on top; under all of them, what a dialog covers.
  [...boxes]
    .sort((x, y) => Number(y.covered ?? false) - Number(x.covered ?? false) || y.page.w * y.page.h - x.page.w * x.page.h)
    .forEach((box, order) => {
      const area = areaOf(box.id);
      const chosen = choices[box.id] !== undefined;
      const top = pack!.placements[box.id]?.inFrame ?? false;
      let cell = cells.get(box.id);
      if (!cell) {
        const el = h('button', { type: 'button', 'data-area': box.id, title: area.label });
        el.addEventListener('click', () => void openFromSheet(box.id));
        cell = { el, miniKey: '' };
        cells.set(box.id, cell);
        sheet.append(el);
      }
      cell.el.className = `cell ${chosen ? 'is-chosen' : 'is-sketch'}${top ? '' : ' is-inner'}`;
      cell.el.setAttribute('aria-label', cellLabel(area));
      cell.el.style.cssText = `left:${box.page.x * s}px;top:${box.page.y * s}px;width:${box.page.w * s}px;height:${Math.max(6, box.page.h * s)}px;z-index:${order + 1}`;
      // A frame reloads when it is moved in the document, so a miniature stays in its cell until it is out of date.
      // Over a running page the whole page is one picture behind the cells.
      const key = chosen && top && !isLive() ? `${pack!.revision}|${viewportId}|${state}|${subtreeKey(box.id)}|${s.toFixed(4)}|${Math.round(box.page.w)}x${Math.round(box.page.h)}` : '';
      if (key !== cell.miniKey) {
        cell.miniKey = key;
        cell.el.replaceChildren(...(key ? [sheetMini(box.id, s, m.viewHeight)] : []));
      }
    });
  const shown = new Set(boxes.map((b) => b.id));
  for (const [id, cell] of cells) {
    if (shown.has(id)) continue;
    cell.el.remove();
    cells.delete(id);
  }
  if (!document.getElementById('sheet-view')) sheet.append(h('div', { class: 'sheet-view', id: 'sheet-view' }));
  moveSheetView();
  sheet.classList.toggle('is-live', isLive());
  renderSheetPicture(m.width, m.height, m.viewHeight, s);

  // Areas that only exist in another cut are listed under the page.
  const elsewhere = active().filter((id) => !shown.has(id));
  $('sheet-more').replaceChildren(
    ...elsewhere.map((id) => {
      const area = areaOf(id);
      const cut = board().cuts.find((c) => c.id === area.cuts?.[0]);
      // On a running page an area of this cut that is not listed above was not found on the page.
      // Behind a sign-in screen nothing is lost: the page has simply not been opened yet.
      const lost = isLive() && !walled && problems.some((p) => p.area === id && p.code === 'ANCHOR_MISSING');
      const b = h(
        'button',
        { type: 'button', class: `more ${choices[id] !== undefined ? 'is-chosen' : 'is-sketch'}${lost ? ' is-lost' : ''}`, 'data-area': id, 'aria-label': lost ? `${area.label}: not found on the page` : cellLabel(area), title: lost ? `${area.label}: not found on the page` : area.label },
        h('i', {}),
        h('span', {}, lost ? `${area.label}: not found` : cut ? cut.label : area.label),
      );
      b.addEventListener('click', () => void openFromSheet(id, b));
      return b;
    }),
  );
}

function sheetMini(id: string, s: number, viewHeight: number): HTMLElement {
  return createMini(serialize(compose(pack!, committed())), viewport().width, viewHeight, (doc, win) => {
    const el = findArea(doc, id);
    if (!el) return null;
    reveal(win, el);
    const box = areaBox(el);
    return box ? { crop: { x: box.x, y: box.y, w: box.w, h: Math.min(box.h, win.innerHeight - Math.max(0, box.y)) }, scale: s } : null;
  }).el;
}

function moveSheetView(): void {
  const m = pack ? stage.metrics() : null;
  const view = document.getElementById('sheet-view');
  if (!m || !view) return;
  view.style.top = `${m.scrollY * sheetScale}px`;
  view.style.height = `${m.viewHeight * sheetScale}px`;
}

async function openFromSheet(id: string, from?: HTMLElement): Promise<void> {
  const area = areaOf(id);
  const state = stateOf(board(), cutId);
  if (area.cuts && !area.cuts.includes(state)) await showCut(area.cuts[0]!, true);
  stage.scrollToArea(id);
  if (locked()) return;
  // The dot is placed once the page has been read again. An entry beside the sheet stands for an
  // area that has no place on the page: there is nothing to wait for.
  if (from) await settle();
  else await placed(id);
  await openOptions(id, true, from);
}

// ---------------------------------------------------------------------------------------------
// Options popover: drawn options beside the dot
// ---------------------------------------------------------------------------------------------

let popover: HTMLDivElement | null = null;
let openArea: string | null = null;
let overPopover = false;
let idleClose = 0;
let leaveClose = 0;
let previewClear = 0;
let returnFocus: HTMLElement | null = null;
/** The page was scrolled to bring the area into view when its options opened. */
let movedForOptions = false;
let lastPlacement: Placement | null = null;
/** The page moved under the open options while they were not allowed to follow. */
let held = false;
/** The options are open for an area that has no place on the page; they stand beside the sheet. */
let loose = false;
/** Height of the area under its tallest option, in page pixels. */
let tallest = 0;

function setPreview(area: string, option: string | null): void {
  clearTimeout(previewClear);
  const next = option ? { area, option } : null;
  if (preview?.area === next?.area && preview?.option === next?.option) return;
  preview = next;
  void stage.update(look(), area).then(() => {
    // A motion has to be seen moving: what the option does when it appears plays once it is on the page.
    if (option && preview?.area === area && preview.option === option && moves(area, option)) stage.replay(area);
  });
}

function closeOptions(): void {
  clearTimeout(idleClose);
  clearTimeout(leaveClose);
  clearTimeout(previewClear);
  const area = openArea;
  openArea = null;
  movedForOptions = false;
  held = false;
  loose = false;
  stage.hot = null;
  if (!popover) return;
  popover.remove();
  popover = null;
  overPopover = false;
  lastPlacement = null;
  if (preview && area) setPreview(area, null);
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
  scheduleShot(false, 500);
}

async function openOptions(areaId: string, viaKeyboard: boolean, from?: HTMLElement): Promise<void> {
  if (!pack || locked()) return;
  closeOptions();
  let place = stage.placement(areaId);
  const m = stage.metrics();
  // The sheet may have been drawn again since the click: the entry to stand beside is the one that is there now.
  const entry = from?.isConnected ? from : from ? document.querySelector<HTMLElement>(`#sheet-more [data-area="${areaId}"]`) : null;
  if (!place && entry && m) {
    // The area has no place on the page right now (its chosen option hides it). Its options open
    // beside the entry in the sheet, so that the choice can still be changed.
    const r = entry.getBoundingClientRect();
    const host = stageHost.getBoundingClientRect();
    const f = stage.frame;
    place = {
      dot: { x: r.right - host.left - 22, y: r.top - host.top + r.height / 2 - 11, w: 22, h: 22 },
      area: { x: r.right - host.left, y: r.top - host.top, w: 0, h: 0 },
      frame: { x: f.offsetLeft, y: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight },
    };
    loose = true;
  }
  if (!place || !m) return;
  // A preview nobody can see is no preview: if most of the area is below the screen, bring it up first.
  const seen = Math.min(place.frame.y + place.frame.h, place.area.y + place.area.h) - Math.max(place.frame.y, place.area.y);
  if (!viaKeyboard && seen < Math.min(place.area.h, place.frame.h * 0.45)) {
    openArea = areaId;
    movedForOptions = true;
    stage.scrollToArea(areaId, true);
    await placed(areaId);
    if (openArea !== areaId) return;
    place = stage.placement(areaId);
    if (!place) return;
  }
  const area = areaOf(areaId);
  openArea = areaId;
  stage.hot = areaId;
  returnFocus = viaKeyboard ? (document.activeElement as HTMLElement | null) : null;

  const pop = h('div', { class: 'pop', role: 'group', 'aria-label': `Options for ${area.label}`, 'data-area': areaId });
  pop.style.visibility = 'hidden';
  // Beside a narrow page there is room for a column of options. Over a wide page they sit in a row,
  // unless the area is a wide, low strip: then each option is a strip too, one under the other.
  const beside = stageHost.clientWidth - (place.frame.x + place.frame.w) >= 300;
  const wide = !beside && place.area.h / stage.scale <= 120 && place.area.w / place.area.h > 8;
  if (beside) pop.classList.add('is-beside');
  if (beside || wide) pop.classList.add('is-column');
  popover = pop;

  const state = stateOf(board(), cutId);
  // The best place is just above the dot. If there is some room there, the thumbnails are cropped to fit it.
  const room = stageHost.getBoundingClientRect().top + place.dot.y - 34;
  tallest = 0;
  const maxThumb = beside ? Math.max(120, Math.min(300, (window.innerHeight - 150) / area.options.length - 12)) : room >= 90 && !wide ? Math.min(180, room) : 180;
  // Over a running page the options are drawn on a copy of the page as it is now, without this area's own patch.
  let snap: SnapshotDoc | null = null;
  if (isLive()) {
    const shot = await stage.snapshot?.(areaId);
    if (popover !== pop) return;
    snap = shot && server?.stage ? parseSnapshot(shot.html, [server.stage.origin]) : null;
  }
  const minis: Promise<void>[] = [];
  for (const option of area.options) {
    const current = choices[areaId] === option.id;
    const approximate = Boolean(option.patch?.some((op) => 'script' in op));
    const moving = moves(areaId, option.id);
    const label = `${option.label}${approximate ? ' (approximate: the real page will behave like this, the preview only roughly)' : ''}${moving ? ' (moves: the picture stands still; point at it and use the page to see it)' : ''}`;
    const button = h('button', { type: 'button', class: 'opt', 'aria-label': label, 'aria-pressed': String(current), title: label, 'data-option': option.id });
    /** The part of the page to show: cropped to what changes, never to the top of the page. */
    const crop = (doc: Document, win: Window, el: Element): MiniFrame | null => {
      let target: Element = el;
      if (option.focus) {
        try {
          target = el.querySelector(option.focus) ?? doc.querySelector(option.focus) ?? el;
        } catch {
          target = el;
        }
      }
      reveal(win, target);
      const box = areaBox(target);
      if (!box) return null;
      tallest = Math.max(tallest, areaBox(el)?.h ?? 0);
      // A wide, low area such as a top bar is drawn larger. A tall one is drawn smaller rather than
      // cut off, so that options that differ further down can still be told apart.
      const base = Math.min(1, (wide ? 600 : box.w >= 700 && area.options.length < 4 ? 300 : 240) / box.w);
      const shown = Math.min(box.h, win.innerHeight - Math.max(0, box.y));
      const scale = Math.max(base * 0.45, Math.min(base, maxThumb / shown));
      let top = box.y;
      let height = Math.max(24, Math.min(shown, maxThumb / scale));
      // A very small one is shown with a little of what surrounds it.
      const least = 56 / scale;
      if (height < least) {
        top = Math.max(0, top - (least - height) / 2);
        height = Math.min(least, win.innerHeight - top);
      }
      return { crop: { x: box.x, y: top, w: box.w, h: height }, scale };
    };
    let mini: { el: HTMLElement; ready: Promise<void> } | null = null;
    if (!isLive()) {
      const tried = pruneChoices(board(), pack.placements, { ...choices, [areaId]: option.id });
      mini = createMini(serialize(compose(pack, { choices: tried, state })), viewport().width, m.viewHeight, (doc, win) => {
        const el = findArea(doc, areaId);
        if (!el) return null;
        fill(doc, board().cuts.find((c) => c.id === state)?.fill);
        return crop(doc, win, el);
      });
    } else if (snap) {
      mini = createMini(withOption(snap, area, option), viewport().width, m.viewHeight, (doc, win) => {
        let el: Element | null = null;
        try {
          el = area.anchor ? doc.querySelector(area.anchor) : null;
          // The option may have moved the anchor out of reach of its selector: the part it points at stands for the area.
          el ??= option.focus ? doc.querySelector(option.focus) : null;
        } catch {
          el = null;
        }
        // An area that cannot be found or seen in the copy is shown as the top of the screen, never as a full-size page.
        return (el && crop(doc, win, el)) ?? { crop: { x: 0, y: 0, w: win.innerWidth, h: Math.min(win.innerHeight, 180 / (240 / win.innerWidth)) }, scale: 240 / win.innerWidth };
      });
    }
    if (mini) {
      minis.push(mini.ready);
      button.append(mini.el);
    } else {
      button.append(h('span', { class: 'opt-text' }, option.label)); // the page could not be copied; say what the option is
    }
    if (option.suggested) {
      const star = icon(SVG.star, 'opt-star');
      button.append(star);
      // Why this one, and what was left out: only for who asks, by pointing at the mark or by reaching the option with the keyboard.
      const note = suggestionNote(areaId, option.because);
      if (note) {
        note.id = `note-${areaId}`;
        star.classList.add('has-note');
        button.setAttribute('aria-describedby', note.id);
        button.append(note);
        star.addEventListener('pointerenter', () => button.classList.add('show-note'));
        star.addEventListener('pointerleave', () => button.classList.remove('show-note'));
      }
    }
    if (current) button.append(icon(SVG.check, 'opt-check'));
    if (approximate) button.append(h('span', { class: 'opt-approx' }, 'Approximate'));
    if (moving) button.append(icon(SVG.play, 'opt-moves'));
    button.addEventListener('pointerenter', () => setPreview(areaId, option.id));
    button.addEventListener('focus', () => setPreview(areaId, option.id));
    const clear = () => {
      clearTimeout(previewClear);
      previewClear = window.setTimeout(() => preview?.option === option.id && setPreview(areaId, null), 90);
    };
    button.addEventListener('pointerleave', clear);
    button.addEventListener('blur', clear);
    button.addEventListener('click', () => pick(areaId, option.id));
    pop.append(button);
  }
  const ask = h('button', { type: 'button', class: 'opt-ask', 'aria-label': 'Ask for something else', title: 'Ask for something else' }, icon(SVG.pencil, ''));
  ask.addEventListener('click', () => {
    closeOptions();
    openPanel('ask', areaId);
  });
  pop.append(ask);

  pop.addEventListener('pointerenter', () => {
    overPopover = true;
    clearTimeout(idleClose);
    clearTimeout(leaveClose);
  });
  pop.addEventListener('pointerleave', () => {
    overPopover = false;
    leaveClose = window.setTimeout(closeOptions, 450);
  });
  pop.addEventListener('keydown', (e) => {
    const buttons = Array.from(pop.querySelectorAll<HTMLElement>('button'));
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeOptions();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      buttons[(i + 1) % buttons.length]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      buttons[(i - 1 + buttons.length) % buttons.length]?.focus();
    }
  });
  document.body.append(pop);

  await Promise.all(minis);
  if (popover !== pop) return; // closed or replaced while the options were being drawn
  lastPlacement = stage.placement(areaId) ?? place;
  positionPopover(true);
  pop.style.visibility = '';
  if (viaKeyboard) (pop.querySelector<HTMLElement>('.opt[aria-pressed="true"]') ?? pop.querySelector<HTMLElement>('.opt'))?.focus();
}

/** The note behind the suggested mark: the reason, who gave it, and the candidates that are not offered. Null if there is nothing to say. */
function suggestionNote(areaId: string, because: string | undefined): HTMLElement | null {
  const notes = notesOf(areaId);
  if (!because && notes.rejected.length === 0) return null;
  const note = h('span', { class: 'opt-note', role: 'note' });
  if (because) note.append(h('span', { class: 'opt-note-why' }, because));
  if (notes.by === 'taste') note.append(h('span', { class: 'opt-note-by' }, 'Suggested from what you chose before.'));
  if (notes.rejected.length > 0) {
    note.append(h('span', { class: 'opt-note-head' }, 'Not offered'));
    for (const r of notes.rejected) note.append(h('span', { class: 'opt-note-out' }, h('b', {}, r.name), ` ${r.why}`));
  }
  return note;
}

/**
 * Put the options on a side with room: beside the page if the page is narrow, otherwise just
 * above the area, below it, or over its corner. Once open, the popover only follows scrolling.
 */
function positionPopover(first = false): void {
  if (!popover || !openArea) return;
  const now = stage.placement(openArea);
  if (!first) {
    // While an option is being tried out the area may move, grow or be replaced. The options stay
    // where they are, under the pointer; they do not chase the dot and they do not close.
    if (loose) return; // opened from the sheet for an area that is not on the page: nothing to follow
    if (preview || overPopover) {
      held = true;
      return;
    }
    if (!now) return closeOptions(); // the dot scrolled out of view
    if (held) {
      held = false;
      lastPlacement = now;
      return;
    }
    if (!lastPlacement) return;
    const dy = now.dot.y - lastPlacement.dot.y;
    if (Math.abs(dy) < 0.5) return;
    lastPlacement = now;
    const top = parseFloat(popover.style.top) + dy;
    // Follow the dot while the page scrolls; if that leads off the screen, find a new place.
    if (top >= 4 && top + popover.offsetHeight <= window.innerHeight - 4) {
      popover.style.top = `${top}px`;
      return;
    }
  }
  const local = now ?? lastPlacement;
  if (!local) return;
  // Window coordinates: the options may use the space above and beside the stage.
  const host = stageHost.getBoundingClientRect();
  const shift = (b: Box): Box => ({ x: b.x + host.left, y: b.y + host.top, w: b.w, h: b.h });
  const p = { dot: shift(local.dot), area: shift(local.area), frame: shift(local.frame) };
  const W = window.innerWidth;
  const H = window.innerHeight;
  const w = popover.offsetWidth;
  const hh = popover.offsetHeight;
  const gap = 10;
  const clampX = (x: number) => Math.max(6, Math.min(x, W - w - 6));
  const clampY = (y: number) => Math.max(6, Math.min(y, H - hh - 6));
  // The area may grow while options are tried out; stay clear of its tallest version.
  const areaBottom = p.area.y + Math.max(p.area.h, tallest * stage.scale);
  const rightAligned = clampX(p.dot.x + p.dot.w + 6 - w);
  const candidates: Array<[number, number]> = [
    [rightAligned, p.dot.y - 6 - hh], // just above the dot
    [rightAligned, areaBottom + gap], // below the area
    [rightAligned, p.dot.y + p.dot.h + 6], // over the area's corner, under the dot
  ];
  if (popover.classList.contains('is-beside')) {
    // Beside a narrow page nothing is hidden at all.
    candidates.unshift([p.frame.x + p.frame.w + gap + 8, clampY(p.dot.y - 8)]);
  }
  // Beside a narrow area (a sidebar, a column) the options hide nothing of it either.
  candidates.push([p.area.x + p.area.w + gap, clampY(p.dot.y - 8)], [p.area.x - gap - w, clampY(p.dot.y - 8)]);
  // A place costs what it hides of the area being decided, plus its distance from the dot.
  // It never covers the dot, or the pointer would land on an option by accident.
  const cost = ([x, y]: [number, number]) => {
    if (x < 4 || x + w > W - 4 || y < 4 || y + hh > H - 4) return Infinity;
    const coversDot = x < p.dot.x + p.dot.w + 2 && x + w > p.dot.x - 2 && y < p.dot.y + p.dot.h + 2 && y + hh > p.dot.y - 2;
    if (coversDot) return Infinity;
    const overlapW = Math.max(0, Math.min(x + w, p.area.x + p.area.w) - Math.max(x, p.area.x));
    const overlapH = Math.max(0, Math.min(y + hh, areaBottom) - Math.max(y, p.area.y));
    const dotY = p.dot.y + p.dot.h / 2;
    const away = dotY < y ? y - dotY : dotY > y + hh ? dotY - (y + hh) : 0;
    const dotX = p.dot.x + p.dot.w / 2;
    const aside = dotX < x ? x - dotX : dotX > x + w ? dotX - (x + w) : 0;
    // The bar of the review itself (title, widths, Approve) is better left in sight too.
    const overBar = Math.max(0, host.top - y);
    return overlapW * overlapH + (away + aside) * 220 + overBar * 300;
  };
  const best = candidates.reduce((a, c) => (cost(c) < cost(a) ? c : a));
  const [x, y] = Number.isFinite(cost(best)) ? best : [rightAligned, clampY(p.dot.y + p.dot.h + 6)];
  popover.style.left = `${x}px`;
  popover.style.top = `${y}px`;
}

function pick(area: string, option: string): void {
  if (!pack || locked()) return;
  clearTimeout(previewClear);
  preview = null;
  choices = pruneChoices(board(), pack.placements, { ...choices, [area]: option });
  const keyboard = returnFocus !== null;
  closeOptions();
  void stage.update(look(), area).then(() => {
    if (moves(area, option)) stage.replay(area);
    renderTop();
    renderSheet();
    scheduleStrip();
    if (keyboard) document.querySelector<HTMLElement>(`.sheet [data-area="${area}"]`)?.focus();
    scheduleShot(true, 300);
  });
  save();
}

// ---------------------------------------------------------------------------------------------
// Cut strip: the moments of the page, in order
// ---------------------------------------------------------------------------------------------

let stripTimer = 0;
let stripKey = '';

function scheduleStrip(): void {
  clearTimeout(stripTimer);
  stripTimer = window.setTimeout(renderStrip, 200);
}

function renderStrip(): void {
  if (!pack) return;
  const key = isLive() ? `${pack.revision}|${viewportId}|live ${stripVersion}` : `${pack.revision}|${viewportId}|${JSON.stringify(choices)}`;
  if (key === stripKey) return markCut();
  stripKey = key;
  const v = viewport();
  const scale = Math.min(132 / v.width, 78 / v.height);
  const strip = $('strip');
  strip.hidden = board().cuts.length < 2;
  strip.replaceChildren(
    ...board().cuts.flatMap((cut, i) => {
      const state = stateOf(board(), cut.id);
      const shot = cutShots.get(state);
      // A moment of a running page gets its picture the first time its page state is visited.
      const mini = isLive()
        ? shot
          ? createMini(shot, v.width, v.height, (doc, win) => {
              let target: Element | null = null;
              try {
                target = cut.at ? doc.querySelector(cut.at) : null;
              } catch {
                target = null;
              }
              if (target) reveal(win, target);
              return { crop: { x: 0, y: 0, w: v.width, h: v.height }, scale };
            })
          : { el: h('div', { class: 'mini is-ready is-empty' }) }
        : createMini(serialize(compose(pack!, { choices, state })), v.width, v.height, (doc, win) => {
        fill(doc, board().cuts.find((c) => c.id === state)?.fill);
        if (cut.at) {
          let target: Element | null = null;
          try {
            target = doc.querySelector(cut.at);
          } catch {
            target = null;
          }
          if (target) reveal(win, target);
        }
        doc.documentElement.setAttribute('data-pe-scroll', win.scrollY > 4 ? 'scrolled' : 'top');
        return { crop: { x: 0, y: 0, w: v.width, h: v.height }, scale };
      });
      mini.el.style.width = `${Math.round(v.width * scale)}px`;
      mini.el.style.height = `${Math.round(v.height * scale)}px`;
      const button = h('button', { type: 'button', class: 'cut', 'data-cut': cut.id }, mini.el, h('span', { class: 'cut-name' }, h('b', {}, String(i + 1)), cut.label));
      button.addEventListener('click', () => void showCut(cut.id, true));
      return i === 0 ? [button] : [h('i', { class: 'cut-link', 'aria-hidden': 'true' }), button];
    }),
  );
  markCut();
}

function markCut(): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('.cut'))) {
    if (el.dataset.cut === cutId) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  }
}

/** Move to a cut. From the strip, the page is also scrolled and its form values are set. */
async function showCut(id: string, fromStrip: boolean): Promise<void> {
  if (!pack) return;
  closeOptions();
  cutId = id;
  if (fromStrip) await stage.showCut(id, look());
  else await stage.update(look());
  markCut();
  scheduleSheet();
  // The picture of this moment is taken now, while the page is in it.
  shotForStrip = true;
  await takeShot();
}

// ---------------------------------------------------------------------------------------------
// Running pages: pictures for the miniature and the cut strip, and what was not found
// ---------------------------------------------------------------------------------------------

let problems: Problem[] = [];
/** The running page shows a sign-in screen where the page of the board should be. */
let walled = false;
/** Problems the person has been told about already. */
const told = new Set<string>();
/** A copy of the page per page state; every cut of that state is drawn from it. */
const cutShots = new Map<string, string>();
let stripVersion = 0;
let sheetVersion = 0;
let shotTimer = 0;
let shotForStrip = false;
let sheetShot: { snap: SnapshotDoc; version: number } | null = null;
let sheetPictureKey = '';

function clearShots(): void {
  clearTimeout(shotTimer);
  cutShots.clear();
  sheetShot = null;
  sheetPictureKey = '';
  stripVersion++;
  document.getElementById('sheet-picture')?.remove();
}

/** Copy the running page once it has been still for a moment. */
function scheduleShot(forStrip: boolean, delay: number): void {
  if (!isLive()) return;
  shotForStrip ||= forStrip;
  clearTimeout(shotTimer);
  shotTimer = window.setTimeout(() => void takeShot(), delay);
}

async function takeShot(): Promise<void> {
  if (!pack || !isLive() || !server?.stage) return;
  if (preview) return scheduleShot(false, 600); // not while an option is being tried out
  const revision = pack.revision;
  const state = stateOf(board(), cutId);
  const shot = await stage.snapshot?.();
  if (!shot || !pack || pack.revision !== revision || preview) return;
  const snap = parseSnapshot(shot.html, [server.stage.origin]);
  sheetShot = { snap, version: ++sheetVersion };
  if (shotForStrip || !cutShots.has(state)) {
    shotForStrip = false;
    cutShots.set(state, snapshotHtml(snap));
    stripVersion++;
    renderStrip();
  }
  scheduleSheet();
}

/**
 * The whole running page behind the cells of the sheet: one slice per screen, each a copy of the
 * page scrolled to its part, so that screen-relative sizes come out right.
 */
function renderSheetPicture(width: number, height: number, viewHeight: number, s: number): void {
  if (!isLive() || !sheetShot) return;
  const key = `${sheetShot.version}|${Math.round(width)}x${Math.round(height)}|${Math.round(viewHeight)}|${s.toFixed(4)}`;
  if (key === sheetPictureKey) return;
  sheetPictureKey = key;
  const html = flattened(sheetShot.snap);
  const picture = h('div', { class: 'sheet-picture', id: 'sheet-picture', 'aria-hidden': 'true' });
  const ready: Promise<void>[] = [];
  for (let top = 0; top < height && ready.length < 24; top += viewHeight) {
    const part = Math.min(viewHeight, height - top);
    const mini = createMini(html, width, viewHeight, (_, win) => {
      win.scrollTo(0, top);
      // The last slice cannot scroll all the way: show the part of the screen that belongs to it.
      return { crop: { x: 0, y: top - win.scrollY, w: width, h: part }, scale: s };
    });
    ready.push(mini.ready);
    picture.append(mini.el);
  }
  // Swap the old picture for the new one only when it is complete, so that the sheet never blinks.
  picture.style.visibility = 'hidden';
  $('sheet').prepend(picture);
  void Promise.all(ready).then(() => {
    for (const old of Array.from(document.querySelectorAll('.sheet-picture'))) if (old !== picture) old.remove();
    picture.style.visibility = '';
  });
}

let reportTimer = 0;
let reported = '[]';
/** Tell the coding agent what the page could not find; it reads this with "picky-eater status". */
function reportProblems(): void {
  clearTimeout(reportTimer);
  reportTimer = window.setTimeout(() => {
    const text = JSON.stringify(problems);
    // Areas behind a sign-in screen are not missing from the page; there is nothing to tell the agent yet.
    if (!server || !pack || walled || text === reported) return;
    reported = text;
    void api('/api/diagnostics', { ...stamp(), problems }).catch(() => {});
  }, 800);
}

// ---------------------------------------------------------------------------------------------
// Side panel: ask for a change, history
// ---------------------------------------------------------------------------------------------

let panelMode: 'ask' | 'history' | 'built' | null = null;
let panelOpener: HTMLElement | null = null;
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function describeChange(c: Change): string {
  switch (c.kind) {
    case 'first':
      return 'First draft';
    case 'page':
      return 'The page around the areas changed';
    case 'cuts':
      return 'The moments at the bottom changed';
    case 'area-added':
      return `New area: ${c.label ?? c.area}`;
    case 'area-removed':
      return `Removed: ${c.label ?? c.area}`;
    case 'area-changed':
      return `New options for ${c.label ?? c.area}`;
  }
}

function closePanel(): void {
  $('panel').hidden = true;
  panelMode = null;
  if (panelOpener?.isConnected) panelOpener.focus();
  panelOpener = null;
}

function openPanel(mode: 'ask' | 'history' | 'built', area: string | null = null): void {
  if (!server || !pack) return;
  if (panelMode === null) panelOpener = document.activeElement as HTMLElement | null;
  panelMode = mode;
  $('panel').hidden = false;
  $('panel-title').textContent = mode === 'ask' ? 'Ask for a change' : mode === 'built' ? 'Approved and built' : 'History';
  const body = $('panel-body');
  body.replaceChildren(...(mode === 'ask' ? askContent(area) : mode === 'built' ? builtContent() : historyContent()));
  if (mode === 'ask') body.querySelector<HTMLElement>('textarea')?.focus();
  else $('panel-close').focus();
}

function askContent(area: string | null): HTMLElement[] {
  const select = h('select', { id: 'ask-area' }, h('option', { value: '' }, 'The whole page'));
  for (const id of active()) select.append(h('option', { value: id, selected: id === area }, areaOf(id).label));
  const text = h('textarea', { id: 'ask-text', rows: '6', maxlength: '2000', placeholder: 'For example: none of these show the price. Add a version with the price next to the button.' });
  const send = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Send');
  const note = h('p', { class: 'hint' }, locked() ? 'Sending this withdraws your approval. Your coding agent will draw a new draft.' : 'Your coding agent will draw a new draft. Your other choices are kept.');
  const error = h('p', { class: 'error', role: 'alert', hidden: true });
  const form = h('form', { class: 'ask' }, h('label', { for: 'ask-area' }, 'Which part?'), select, h('label', { for: 'ask-text' }, 'What should be different?'), text, error, note, send);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = text.value.trim();
    if (value.length < 3) {
      error.textContent = 'Say what should be different.';
      error.hidden = false;
      text.focus();
      return;
    }
    send.disabled = true;
    api<PublicState>('/api/requests', { ...stamp(), area: select.value || null, cut: cutId, text: value })
      .then(async (res) => {
        etag = '';
        await adopt(res.data);
        openPanel('ask');
        toast('Sent to your coding agent.');
      })
      .catch((err: unknown) => {
        error.textContent = err instanceof ApiError ? err.message : 'That could not be sent. Try again.';
        error.hidden = false;
        send.disabled = false;
      });
  });
  const open = server!.requests.filter((r) => r.status === 'open');
  const list = open.length
    ? [h('h3', {}, 'Waiting for a new draft'), h('ul', { class: 'requests' }, ...open.map((r) => h('li', {}, h('b', {}, r.area ? areaOf(r.area)?.label ?? r.area : 'The whole page'), h('span', {}, r.text))))]
    : [];
  return [form, ...list];
}

/** A picture from the server, which needs the token: fetched, then shown from memory. */
function picture(path: string, alt: string): HTMLImageElement {
  const img = h('img', { alt, class: 'shot' });
  void fetch(path, { headers: { 'X-PE-Token': token }, cache: 'no-store' })
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
    .then((blob) => {
      img.src = URL.createObjectURL(blob);
      img.addEventListener('load', () => URL.revokeObjectURL(img.src), { once: true });
    })
    .catch(() => img.replaceWith(h('p', { class: 'muted' }, 'This picture is not there any more.')));
  return img;
}

/** What was approved next to what was built, area by area, with what the comparison found. */
function builtContent(): HTMLElement[] {
  const built = server?.built;
  if (!built) return [h('p', { class: 'muted' }, 'The page has not been built and compared yet.')];
  const out: HTMLElement[] = [
    h('p', { class: built.ok ? 'approved' : 'error' }, built.ok ? 'The built page matches what you approved.' : `The built page differs from what you approved in ${built.differences.length} ${built.differences.length === 1 ? 'place' : 'places'}.`),
    h('p', { class: 'muted' }, `Compared ${when(built.at)}`),
  ];
  const general = built.differences.filter((d) => !board().areas.some((a) => a.id === d.area));
  if (general.length) out.push(h('ul', { class: 'diffs' }, ...general.map((d) => h('li', {}, d.text))));
  for (const area of board().areas) {
    const shot = built.shots.find((s) => s.area === area.id && s.viewport === viewport().id);
    const lines = built.differences.filter((d) => d.area === area.id);
    if (!shot && lines.length === 0) continue;
    const section = h('section', { class: 'built', 'data-area': area.id }, h('h3', {}, area.label));
    if (shot) {
      section.append(h('figure', {}, h('figcaption', {}, 'Approved'), picture(shot.approved, `${area.label}, approved`)), h('figure', {}, h('figcaption', {}, 'Built'), picture(shot.built, `${area.label}, built`)));
    }
    section.append(lines.length ? h('ul', { class: 'diffs' }, ...lines.map((d) => h('li', {}, d.text))) : h('p', { class: 'approved' }, 'Same as approved'));
    out.push(section);
  }
  return out;
}

function historyContent(): HTMLElement[] {
  const s = server!;
  const optionLabel = (area: string, option: string | null) => (option ? board().areas.find((a) => a.id === area)?.options.find((o) => o.id === option)?.label ?? option : 'nothing');
  const areaLabel = (area: string) => board().areas.find((a) => a.id === area)?.label ?? area;
  const items: HTMLElement[] = [];
  for (const rev of [...s.history].reverse()) {
    const li = h('li', {}, h('b', {}, `Draft ${rev.revision}`), h('time', {}, when(rev.createdAt)));
    if (rev.note) li.append(h('p', {}, rev.note));
    li.append(h('ul', {}, ...rev.changes.map((c) => h('li', {}, describeChange(c)))));
    for (const id of rev.answered) {
      const r = s.requests.find((x) => x.id === id);
      if (r) li.append(h('p', { class: 'quote' }, `Answers your request: “${r.text}”`));
    }
    for (const a of s.approvals.filter((x) => x.revision === rev.revision)) {
      const line = a.status === 'current' ? `Approved ${when(a.approvedAt)}` : `Approved ${when(a.approvedAt)}, later ${a.status === 'withdrawn' ? 'reopened' : 'replaced by a new draft'}`;
      li.append(h('p', { class: a.status === 'current' ? 'approved' : 'muted' }, line));
      if (a.changedSincePrevious.length) {
        li.append(
          h('p', { class: 'muted' }, 'Different from the approval before it:'),
          h('ul', {}, ...a.changedSincePrevious.map((c) => h('li', {}, `${areaLabel(c.area)}: ${optionLabel(c.area, c.from)} → ${optionLabel(c.area, c.to)}`))),
        );
      }
    }
    items.push(li);
  }
  return [...rulesContent(), h('ol', { class: 'history' }, ...items)];
}

/** Rules about the person's taste: those that wait for them, and those they kept. Keeping one is theirs alone. */
function rulesContent(): HTMLElement[] {
  const rules = server?.rules ?? [];
  if (rules.length === 0) return [];
  const settle = (id: string, verdict: 'project' | 'general' | 'discard') => {
    void api<PublicState>('/api/rule', { id, verdict })
      .then(async (r) => {
        etag = '';
        await adopt(r.data);
        if (panelMode === 'history') openPanel('history');
      })
      .catch((err: unknown) => toast(err instanceof Error ? err.message : 'That did not work.'));
  };
  const out: HTMLElement[] = [];
  const pending = rules.filter((r) => r.status === 'pending');
  if (pending.length > 0) {
    out.push(h('p', { class: 'muted' }, 'Your coding agent proposes to remember this about how you choose. It counts only if you keep it.'));
    for (const r of pending) {
      const here = h('button', { type: 'button', class: 'btn', 'data-rule': r.id, 'data-verdict': 'project' }, 'Keep for this project');
      const everywhere = h('button', { type: 'button', class: 'btn', 'data-rule': r.id, 'data-verdict': 'general' }, 'Keep for all projects');
      const drop = h('button', { type: 'button', class: 'btn', 'data-rule': r.id, 'data-verdict': 'discard' }, 'Discard');
      here.addEventListener('click', () => settle(r.id, 'project'));
      everywhere.addEventListener('click', () => settle(r.id, 'general'));
      drop.addEventListener('click', () => settle(r.id, 'discard'));
      out.push(h('div', { class: 'rule is-pending' }, h('p', { class: 'quote' }, r.text), h('div', { class: 'rule-actions' }, here, everywhere, drop)));
    }
  }
  const kept = rules.filter((r) => r.status === 'kept');
  if (kept.length > 0) {
    out.push(h('p', { class: 'muted' }, 'Rules you kept'));
    for (const r of kept) {
      const drop = h('button', { type: 'button', class: 'btn', 'data-rule': r.id, 'data-verdict': 'discard' }, 'Forget');
      drop.addEventListener('click', () => settle(r.id, 'discard'));
      out.push(h('div', { class: 'rule' }, h('p', {}, r.text), h('p', { class: 'muted' }, r.scope === 'general' ? 'In all projects' : 'In this project'), h('div', { class: 'rule-actions' }, drop)));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------------------------

let toastTimer = 0;
function toast(text: string): void {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), 4500);
}

function showMessage(title: string, text: string): void {
  $('message-title').textContent = title;
  $('message-text').textContent = text;
  $('message').hidden = false;
}
function hideMessage(): void {
  $('message').hidden = true;
}

function renderAll(): void {
  renderTop();
  renderSheet();
  renderStrip();
  if (panelMode === 'ask') redrawAsk();
  else if (panelMode) openPanel(panelMode);
}

/** The state changed while the person was writing: what they wrote and the part they picked stay. */
function redrawAsk(): void {
  const text = document.querySelector<HTMLTextAreaElement>('#ask-text');
  const part = document.querySelector<HTMLSelectElement>('#ask-area');
  const focused = document.activeElement as HTMLElement | null;
  const writing = focused === text;
  const kept = text ? { value: text.value, start: text.selectionStart, end: text.selectionEnd } : null;
  openPanel('ask', part?.value || null);
  const now = document.querySelector<HTMLTextAreaElement>('#ask-text');
  if (now && kept) {
    now.value = kept.value;
    if (writing) now.setSelectionRange(kept.start, kept.end);
  }
  // Drawing the panel again puts the cursor in the text: it goes back to where the person was.
  if (!writing && focused?.isConnected && focused !== document.body) focused.focus();
}

// ---------------------------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------------------------

$('progress').addEventListener('click', () => {
  const next = missing()[0];
  if (next) void openFromSheet(next);
});
$('btn-built').addEventListener('click', () => (panelMode === 'built' ? closePanel() : openPanel('built')));
$('btn-history').addEventListener('click', () => (panelMode === 'history' ? closePanel() : openPanel('history')));
$('motion-replay').addEventListener('click', replayMotion);
for (const [id, key] of [['motion-slow', 'slow'], ['motion-reduced', 'reduced']] as const) {
  $(id).addEventListener('click', () => {
    motionMode[key] = !motionMode[key];
    stage.setMotion(motionMode);
    renderTop();
    if (key === 'reduced') toast(motionMode.reduced ? 'Options are shown as people see them who asked for less motion.' : 'Options are shown with their motion.');
  });
}
$('btn-ask').addEventListener('click', () => (panelMode === 'ask' ? closePanel() : openPanel('ask')));
$('panel-close').addEventListener('click', closePanel);

const confirmDialog = $<HTMLDialogElement>('confirm');
$('btn-return').addEventListener('click', () => {
  $('sheet-away').hidden = true;
  void stage.returnToPage?.();
});
$('btn-approve').addEventListener('click', () => {
  if (!server) return;
  if (locked()) {
    api<PublicState>('/api/reopen', stamp())
      .then((res) => {
        etag = '';
        return adopt(res.data);
      })
      .catch((err: unknown) => toast(err instanceof ApiError ? err.message : 'That did not work. Try again.'));
    return;
  }
  closeOptions();
  confirmDialog.showModal();
});
$('confirm-no').addEventListener('click', () => confirmDialog.close());
$('confirm-yes').addEventListener('click', () => {
  confirmDialog.close();
  saveChain
    .then(() => api<PublicState>('/api/approve', { ...stamp(), choices }))
    .then(async (res) => {
      etag = '';
      await adopt(res.data);
      toast('Approved. Your coding agent takes it from here.');
    })
    .catch(async (err: unknown) => {
      toast(err instanceof ApiError ? err.message : 'That did not work. Try again.');
      etag = '';
      await refresh().catch(() => {});
    });
});

document.addEventListener('pointerdown', (e) => {
  const target = e.target as Element | null;
  if (popover && target && !popover.contains(target) && !target.closest('.hit')) closeOptions();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || confirmDialog.open) return;
  if (popover) closeOptions();
  else if (panelMode) closePanel();
});
window.addEventListener('resize', () => {
  if (!pack) return;
  closeOptions();
  scheduleSheet();
  scheduleStrip();
});

async function boot(): Promise<void> {
  const store = {
    get: () => {
      try {
        return sessionStorage.getItem('pe-token') ?? '';
      } catch {
        return '';
      }
    },
    set: (value: string) => {
      try {
        sessionStorage.setItem('pe-token', value);
      } catch {
        /* private mode: the token then lives only as long as this page */
      }
    },
  };
  const fromLink = /[#&]token=([A-Za-z0-9_-]+)/.exec(location.hash)?.[1];
  if (fromLink) {
    store.set(fromLink);
    history.replaceState(null, '', location.pathname);
  }
  token = fromLink ?? store.get();
  if (!token) {
    showMessage('Open this page from your coding agent’s link', 'The link contains a private key, so this page cannot open without it. Ask your coding agent for the link again.');
    return;
  }
  try {
    await refresh();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      showMessage('This link no longer works', 'The review was restarted. Ask your coding agent for the new link.');
      return;
    }
    if (err instanceof ApiError) showMessage('This draft cannot be shown', err.message);
    else showMessage('The review is not running', 'Ask your coding agent to start it again.');
  }
  window.setInterval(() => void refresh().catch(() => {}), 2000);
}

void boot();
