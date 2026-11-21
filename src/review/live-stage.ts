import { activeAreas, stateOf } from '../core/graph.js';
import type { Viewport } from '../core/schema.js';
import type { StageInfo } from '../server/review-server.js';
import type { AgentLook, Envelope, Frame, FromAgent, ToAgent } from '../stage/protocol.js';
import type { Look, Pack } from './compose.js';
import { StageBase, type AreaBox, type MotionMode, type Placement, type Snapshot, type StageDriver, type StageHandlers } from './stage-base.js';

/** What the app may do inside the frame. It may not navigate the review page (no allow-top-navigation). */
const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads';

type Reply = Extract<FromAgent, { req: number }>;

/**
 * The user's running app, framed from another origin.
 *
 * Everything goes through postMessage with the stage agent inside the app. What comes back is
 * used for drawing only: where the areas are, where the dots are, a copy of the page for
 * thumbnails. It is never a choice. The app cannot reach this page's DOM, storage or token.
 */
export class LiveStage extends StageBase implements StageDriver {
  private look: Look = { choices: {}, state: '' };
  private epoch = 0;
  private last: Frame | null = null;
  private readonly waiting = new Map<number, (reply: Reply | null) => void>();
  private seq = 0;
  private whenReady: (() => void) | null = null;
  /** The page state the app is known to be in: the one last replayed, or the one it moved to by itself. */
  private pageState = '';
  private detected = '';
  private busy = 0;
  private pinned: { cut: string; y: number } | null = null;
  private seen = '';
  private layoutKey = '';
  private problemKey = '';
  private wall = false;
  private away = false;
  private dots = true;
  private hotArea: string | null = null;
  private readonly listener = (e: MessageEvent) => this.receive(e);

  constructor(
    host: HTMLElement,
    on: StageHandlers,
    private readonly info: StageInfo,
  ) {
    super(host, on, SANDBOX);
    window.addEventListener('message', this.listener);
  }

  get dotsOn(): boolean {
    return this.dots;
  }
  set dotsOn(value: boolean) {
    if (value === this.dots) return;
    this.dots = value;
    this.post({ type: 'dots', on: this.dots, hot: this.hotArea });
  }
  get hot(): string | null {
    return this.hotArea;
  }
  set hot(value: string | null) {
    if (value === this.hotArea) return;
    this.hotArea = value;
    this.post({ type: 'dots', on: this.dots, hot: this.hotArea });
  }

  private post(msg: ToAgent): void {
    const message: Envelope<ToAgent> = { pe: 1, epoch: this.epoch, ...msg };
    this.iframe.contentWindow?.postMessage(message, this.info.origin);
  }

  private ask(msg: ToAgent & { req: number }, timeoutMs = 8000): Promise<Reply | null> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.waiting.delete(msg.req);
        resolve(null);
      }, timeoutMs);
      this.waiting.set(msg.req, (reply) => {
        clearTimeout(timer);
        resolve(reply);
      });
      this.post(msg);
    });
  }

  private agentLook(look: Look): AgentLook {
    const board = this.pack!.board;
    const tried = look.preview ? { ...look.choices, [look.preview.area]: look.preview.option } : look.choices;
    return { choices: look.choices, preview: look.preview ?? null, state: look.state, active: activeAreas(board, this.pack!.placements, tried) };
  }

  private receive(e: MessageEvent): void {
    // Only the framed app, only from the origin it is served from. Everything in the message is data for drawing.
    if (e.source !== this.iframe.contentWindow || e.origin !== this.info.origin) return;
    const msg = e.data as Partial<Envelope<FromAgent>> | null;
    if (!msg || typeof msg !== 'object' || msg.pe !== 1 || !this.pack) return;
    if (msg.type === 'ready') {
      // A fresh page: whatever was applied is gone. Tell the agent what to show.
      const board = this.pack.board;
      this.epoch++;
      this.last = null;
      this.pageState = board.cuts[0]!.id;
      this.detected = this.pageState;
      for (const done of this.waiting.values()) done(null);
      this.post({
        type: 'init',
        epoch: this.epoch,
        revision: this.pack.revision,
        areas: board.areas.map((a) => ({ id: a.id, anchor: a.anchor ?? '', ...(a.cuts ? { cuts: a.cuts } : {}), options: a.options.map((o) => ({ id: o.id, ...(o.patch ? { patch: o.patch } : {}), ...(o.page ? { page: true } : {}), ...(o.focus ? { focus: o.focus } : {}) })) })),
        cuts: board.cuts.map((c) => ({ id: c.id, ...(c.at ? { at: c.at } : {}), ...(c.sameAs ? { sameAs: c.sameAs } : {}), ...(c.seen ? { seen: c.seen } : {}) })),
        look: this.agentLook(this.look),
        dots: this.dots,
      });
      if (this.hotArea) this.post({ type: 'dots', on: this.dots, hot: this.hotArea });
      if (this.mode.slow || this.mode.reduced) this.post({ type: 'motion', ...this.mode });
      return;
    }
    if (msg.epoch !== this.epoch) return; // from a page that is gone
    if (msg.type === 'frame') return this.onFrame(msg as Frame);
    if ((msg.type === 'done' || msg.type === 'snapshot') && typeof msg.req === 'number') {
      const done = this.waiting.get(msg.req);
      this.waiting.delete(msg.req);
      done?.(msg as Reply);
    }
  }

  private onFrame(frame: Frame): void {
    if (!Array.isArray(frame.areas) || !this.pack) return;
    const known = new Set(this.pack.board.areas.map((a) => a.id));
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    // Numbers only, clamped to the frame: the app cannot place anything outside its own box.
    const clean: Frame = {
      sx: num(frame.sx),
      sy: num(frame.sy),
      vw: Math.max(1, num(frame.vw)),
      vh: Math.max(1, num(frame.vh)),
      ph: Math.max(1, num(frame.ph)),
      state: String(frame.state ?? ''),
      spy: String(frame.spy ?? ''),
      areas: frame.areas
        .filter((a) => a && known.has(a.id))
        .map((a) => ({
          id: a.id,
          x: num(a.x),
          y: num(a.y),
          w: Math.max(0, num(a.w)),
          h: Math.max(0, num(a.h)),
          ...(typeof a.rest === 'number' ? { rest: num(a.rest) } : {}),
          dot: { x: Math.min(Math.max(num(a.dot?.x), 0), num(frame.vw)), y: Math.min(Math.max(num(a.dot?.y), 0), num(frame.vh)), on: a.dot?.on === true },
          ...(a.covered === true ? { covered: true } : {}),
          state: a.state === 'chosen' || a.state === 'preview' ? a.state : 'sketch',
        })),
      problems: (Array.isArray(frame.problems) ? frame.problems : [])
        .filter((p) => p && known.has(p.area))
        .slice(0, 40)
        .map((p) => ({ area: p.area, option: typeof p.option === 'string' ? p.option : null, code: String(p.code).slice(0, 40), detail: String(p.detail).slice(0, 300) })),
      ...(frame.wall === true ? { wall: true } : {}),
      ...(typeof frame.at === 'string' ? { at: frame.at.slice(0, 600) } : {}),
    };
    this.onWall(clean.wall === true);
    this.onAway(clean);
    const first = this.last === null;
    this.last = clean;
    if (first) {
      this.whenReady?.();
      this.whenReady = null;
    }

    const shown = new Set<string>();
    for (const a of clean.areas) {
      shown.add(a.id);
      this.placeHit(a.id, a.dot.x, a.dot.y, a.dot.on && this.dots);
    }
    this.dropHits(shown);

    const board = this.pack.board;
    if (this.busy === 0 && clean.state !== this.detected && board.cuts.some((c) => c.id === clean.state && !c.sameAs)) {
      // The person used the page and it moved to another moment.
      this.detected = clean.state;
      this.pageState = clean.state;
      this.pinned = null;
      this.on.go(clean.state);
    }
    if (this.pinned && Math.abs(clean.sy - this.pinned.y) > 8) this.pinned = null;
    if (!this.pinned && this.busy === 0 && clean.spy !== this.seen && board.cuts.some((c) => c.id === clean.spy)) {
      this.seen = clean.spy;
      this.on.cutSeen(clean.spy);
    }

    const layoutKey = `${clean.ph}|${clean.vw}x${clean.vh}|${clean.areas.map((a) => `${a.id}:${a.state}:${Math.round(a.x + clean.sx)},${Math.round(a.rest ?? a.y + clean.sy)},${Math.round(a.w)},${Math.round(a.h)}`).join(';')}`;
    if (layoutKey !== this.layoutKey) {
      this.layoutKey = layoutKey;
      this.on.layout();
    }
    this.on.scroll();
    this.reportProblems();
  }

  /**
   * A sign-in screen stands where the page should be. The person signs in right there, in the
   * frame. Nothing is done for them afterwards: a sign-in may have a second step, and only they
   * know when it is over.
   */
  private onWall(on: boolean): void {
    if (on === this.wall) return;
    this.wall = on;
    this.on.wall?.(on);
  }

  /**
   * The app is somewhere else than the page of the board, and areas of the board are not there:
   * after a sign-in an app opens its start page, and a person may simply have followed a link.
   * The review offers the way back.
   */
  private onAway(frame: Frame): void {
    const want = new URL(this.info.url);
    const away = this.busy === 0 && !this.wall && frame.at !== undefined && frame.at !== want.pathname + want.search && frame.problems.some((p) => p.code === 'ANCHOR_MISSING');
    if (away === this.away) return;
    this.away = away;
    this.on.away?.(away);
  }

  /** Open the page of the board again, as it was asked for, with the look that is chosen. */
  async returnToPage(): Promise<void> {
    await this.reopen();
  }

  /** Not while a cut is being replayed: elements are expected to be missing until the steps are done. */
  private reportProblems(): void {
    if (this.busy > 0 || !this.last) return;
    this.onAway(this.last); // what the page said while something was under way counts now
    const key = JSON.stringify(this.last.problems);
    if (key === this.problemKey) return;
    this.problemKey = key;
    this.on.problems?.(this.last.problems);
  }

  /** One at a time: a second request waits for the first, so that neither loses the page under it. */
  private opening: Promise<void> = Promise.resolve();
  private open(): Promise<void> {
    const next = this.opening.then(() => this.openNow());
    this.opening = next.catch(() => {});
    return next;
  }

  /** Open the app from scratch and wait until the agent in it answers. */
  private openNow(): Promise<void> {
    const fresh = this.makeIframe();
    this.iframe.replaceWith(fresh);
    this.iframe = fresh;
    this.fit();
    this.last = null;
    this.layoutKey = '';
    this.dropHits();
    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        this.whenReady = null;
        this.on.notice?.(
          this.info.mode === 'tag'
            ? 'The page did not answer. Check that your development server is running and that "picky-eater attach" added its script tag.'
            : 'The page did not answer. Check that your development server is running.',
        );
        resolve();
      }, 12_000);
      this.whenReady = () => {
        clearTimeout(timer);
        resolve();
      };
      fresh.src = this.info.url;
    });
  }

  async load(pack: Pack, viewport: Viewport, look: Look): Promise<void> {
    this.pack = pack;
    this.viewport = viewport;
    this.look = look;
    this.pinned = null;
    this.seen = '';
    this.busy++;
    try {
      await this.open();
    } finally {
      this.busy--;
    }
    this.detected = this.last?.state ?? this.detected;
    this.reportProblems();
  }

  /** The page of the board again, as it was asked for, with the look that is chosen. */
  private async reopen(): Promise<void> {
    if (!this.pack) return;
    this.busy++;
    try {
      await this.open();
    } finally {
      this.busy--;
    }
    this.detected = this.last?.state ?? this.detected;
    this.reportProblems();
  }

  async update(look: Look, anchor?: string): Promise<void> {
    if (!this.pack) return;
    this.look = look;
    await this.ask({ type: 'look', req: ++this.seq, look: this.agentLook(look), ...(anchor ? { anchor } : {}) });
  }

  async showCut(cutId: string, look: Look): Promise<void> {
    const board = this.pack?.board;
    const cut = board?.cuts.find((c) => c.id === cutId);
    if (!board || !cut) return;
    const state = stateOf(board, cutId);
    const first = board.cuts[0]!.id;
    this.busy++;
    try {
      if (state !== this.pageState) {
        // Another moment is reached the way a person would: from the freshly opened page, by its steps.
        this.look = look;
        await this.open();
        const steps = board.cuts.find((c) => c.id === state)?.steps;
        if (state !== first && steps) {
          // A moment may be drawn late (a screen that is loaded on demand): the steps are over when its mark is on the page.
          const seen = board.cuts.find((c) => c.id === state)?.seen;
          const reply = await this.ask({ type: 'steps', req: ++this.seq, steps: seen ? [...steps, { wait: seen }] : steps }, 30_000);
          if (!reply || (reply.type === 'done' && !reply.ok)) {
            this.on.notice?.(`"${cut.label}" could not be reached on the page${reply && reply.type === 'done' && reply.error ? `: ${reply.error}` : ''}.`);
          }
        }
        this.pageState = state;
      } else {
        await this.update(look);
      }
      if (cut.at) this.post({ type: 'scroll', reveal: cut.at });
      else if (cutId === first) this.post({ type: 'scroll', to: 0 });
      // Let the page report where it ended up before scrolling is watched again.
      await new Promise((r) => setTimeout(r, 120));
    } finally {
      this.busy--;
    }
    this.detected = this.last?.state ?? this.detected;
    this.pinned = { cut: cutId, y: this.last?.sy ?? 0 };
    this.seen = cutId;
    this.reportProblems();
  }

  protected wheel(dx: number, dy: number): void {
    this.post({ type: 'scroll', by: [dx, dy] });
  }
  scrollToArea(id: string, always = false): void {
    this.post({ type: 'scroll', area: id, always });
  }
  scrollToPage(y: number): void {
    this.post({ type: 'scroll', to: y });
  }

  metrics(): { width: number; height: number; viewHeight: number; scrollY: number } | null {
    const f = this.last;
    return f ? { width: f.vw, height: f.ph, viewHeight: f.vh, scrollY: f.sy } : null;
  }

  boxes(): AreaBox[] {
    const f = this.last;
    if (!f) return [];
    return f.areas.map((a) => ({ id: a.id, state: a.state, page: { x: a.x + f.sx, y: a.rest ?? a.y + f.sy, w: a.w, h: a.h }, ...(a.covered ? { covered: true } : {}) }));
  }

  placement(id: string): Placement | null {
    const a = this.last?.areas.find((x) => x.id === id);
    if (!a || !a.dot.on) return null;
    const s = this.scale;
    const fx = this.frame.offsetLeft;
    const fy = this.frame.offsetTop;
    return {
      dot: { x: fx + a.dot.x * s - 11, y: fy + a.dot.y * s - 11, w: 22, h: 22 },
      area: { x: fx + a.x * s, y: fy + a.y * s, w: a.w * s, h: a.h * s },
      frame: { x: fx, y: fy, w: this.frame.offsetWidth, h: this.frame.offsetHeight },
    };
  }

  async snapshot(without?: string): Promise<Snapshot | null> {
    const reply = await this.ask({ type: 'snapshot', req: ++this.seq, ...(without ? { without } : {}) });
    if (!reply || reply.type !== 'snapshot' || typeof reply.html !== 'string') return null;
    return { html: reply.html, scrollY: typeof reply.scrollY === 'number' ? reply.scrollY : 0 };
  }

  private mode: MotionMode = { slow: false, reduced: false };

  setMotion(mode: MotionMode): void {
    this.mode = { ...mode };
    this.post({ type: 'motion', ...this.mode });
  }

  replay(area: string): void {
    this.post({ type: 'replay', area });
  }

  override destroy(): void {
    window.removeEventListener('message', this.listener);
    super.destroy();
  }
}
