import type { Viewport } from '../core/schema.js';
import type { Problem } from '../stage/protocol.js';
import type { Look, Pack } from './compose.js';
import type { Box } from './geometry.js';

export interface AreaBox {
  id: string;
  /** "sketch", "chosen" or "preview". */
  state: string;
  /** Position in the page, in page pixels from the top-left of the document. */
  page: Box;
  /** Something lies over the area (a dialog over the page): it is there, but not what the person looks at. */
  covered?: boolean;
}

export interface StageHandlers {
  dotEnter(area: string): void;
  dotLeave(area: string): void;
  dotClick(area: string): void;
  /** The person acted inside the page and it moved to another page state. */
  go(state: string): void;
  /** Scrolling brought another cut into view. */
  cutSeen(cut: string): void;
  /** Areas moved or changed size. */
  layout(): void;
  scroll(): void;
  /** Live boards: what could not be found or applied on the running page. */
  problems?(list: Problem[]): void;
  /** Live boards: something the person should know, in one sentence. */
  notice?(text: string): void;
  /** Live boards: the page shows a sign-in screen instead of its areas (or no longer does). */
  wall?(on: boolean): void;
  /** Live boards: the app is on another page than the one of the board, without its areas (or no longer is). */
  away?(on: boolean): void;
}

/** Where things are, in pixels of the stage element, for placing the options popover. */
export interface Placement {
  dot: Box;
  area: Box;
  frame: Box;
}

/** A copy of the page as inert markup, for thumbnails. */
export interface Snapshot {
  html: string;
  scrollY: number;
}

/** What the review page needs from a stage, whether it shows a mockup or the running app. */
export interface StageDriver {
  readonly frame: HTMLDivElement;
  readonly scale: number;
  /** Dots are hidden once the page is approved. */
  dotsOn: boolean;
  /** The area whose options are open. */
  hot: string | null;
  /** Show a revision from scratch. */
  load(pack: Pack, viewport: Viewport, look: Look): Promise<void>;
  /** Change what the page shows without reloading it. With `anchor`, that area stays where it is on screen. */
  update(look: Look, anchor?: string): Promise<void>;
  /** Move to a cut chosen in the strip. */
  showCut(cutId: string, look: Look): Promise<void>;
  scrollToArea(id: string, always?: boolean): void;
  scrollToPage(y: number): void;
  metrics(): { width: number; height: number; viewHeight: number; scrollY: number } | null;
  boxes(): AreaBox[];
  placement(id: string): Placement | null;
  /** Live boards: the page as it is now, optionally without the patch of one area. */
  snapshot?(without?: string): Promise<Snapshot | null>;
  /** Live boards: open the page of the board again. */
  returnToPage?(): Promise<void>;
  /** How motion is shown: at a quarter of the speed, and in the form people get who asked for less of it. */
  setMotion(mode: MotionMode): void;
  /** Play the entrance of an area again. */
  replay(area: string): void;
  destroy(): void;
}

export interface MotionMode {
  slow: boolean;
  reduced: boolean;
}

const HIT = 30;

/**
 * What both stages share: the frame at real screen size, scaled to fit, and the invisible hit
 * targets that sit above it. The page inside never receives the review page's clicks for dots;
 * the review page owns them.
 */
export abstract class StageBase {
  readonly frame = document.createElement('div');
  protected iframe: HTMLIFrameElement;
  protected readonly hits = document.createElement('div');
  protected pack: Pack | null = null;
  protected viewport: Viewport | null = null;
  protected readonly hitEls = new Map<string, HTMLButtonElement>();
  private readonly resize: ResizeObserver;
  scale = 1;

  constructor(
    protected readonly host: HTMLElement,
    protected readonly on: StageHandlers,
    private readonly sandbox: string,
  ) {
    this.frame.className = 'frame';
    this.iframe = this.makeIframe();
    this.hits.className = 'hits';
    this.frame.append(this.iframe, this.hits);
    host.append(this.frame);
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(host);
  }

  protected makeIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.className = 'frame-page';
    iframe.setAttribute('sandbox', this.sandbox);
    iframe.title = 'Page';
    return iframe;
  }

  /** Scroll the page by this much, in page pixels. */
  protected abstract wheel(dx: number, dy: number): void;

  protected fit(): void {
    const v = this.viewport;
    if (!v) return;
    const pad = 16;
    const availW = Math.max(200, this.host.clientWidth - pad * 2);
    const availH = Math.max(200, this.host.clientHeight - pad);
    const phone = v.width < 600;
    this.scale = Math.min(1, availW / v.width);
    const height = Math.round(phone ? Math.min(v.height, (availH - pad) / this.scale) : availH / this.scale);
    this.frame.classList.toggle('is-phone', phone);
    this.frame.style.width = `${Math.round(v.width * this.scale)}px`;
    this.frame.style.height = `${Math.round(height * this.scale)}px`;
    this.iframe.style.width = `${v.width}px`;
    this.iframe.style.height = `${height}px`;
    this.iframe.style.transform = this.scale === 1 ? '' : `scale(${this.scale})`;
  }

  /** The pointer is over one of our targets, not over the page: pass the wheel on. */
  protected forwardWheel(el: HTMLElement): void {
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheel(e.deltaX / this.scale, e.deltaY / this.scale);
      },
      { passive: false },
    );
  }

  /** Put the hit target of a dot at a point of the page's screen, creating it on first use. */
  protected placeHit(id: string, x: number, y: number, visible: boolean): void {
    let hit = this.hitEls.get(id);
    if (!hit) {
      const area = this.pack?.board.areas.find((a) => a.id === id);
      hit = document.createElement('button');
      hit.type = 'button';
      hit.className = 'hit';
      hit.dataset.area = id;
      hit.tabIndex = -1;
      hit.setAttribute('aria-label', `Options for ${area?.label ?? id}`);
      hit.addEventListener('pointerenter', () => this.on.dotEnter(id));
      hit.addEventListener('pointerleave', () => this.on.dotLeave(id));
      hit.addEventListener('click', () => this.on.dotClick(id));
      this.forwardWheel(hit);
      this.hits.append(hit);
      this.hitEls.set(id, hit);
    }
    hit.hidden = !visible;
    hit.style.transform = `translate(${x * this.scale - HIT / 2}px, ${y * this.scale - HIT / 2}px)`;
  }

  protected dropHits(keep?: Set<string>): void {
    for (const [id, hit] of this.hitEls) {
      if (keep?.has(id)) continue;
      hit.remove();
      this.hitEls.delete(id);
    }
  }

  destroy(): void {
    this.resize.disconnect();
    this.frame.remove();
  }
}
