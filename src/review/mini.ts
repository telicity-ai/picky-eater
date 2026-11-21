import type { Box } from './geometry.js';

export interface MiniFrame {
  /** The part of the frame's screen to show. */
  crop: Box;
  scale: number;
}

export interface Mini {
  el: HTMLDivElement;
  ready: Promise<void>;
}

/**
 * A small, inert rendering of a page: a script-less sandboxed frame at the real screen size,
 * scaled down and cropped. `frame` runs once the page is laid out; it may scroll the page and
 * says which part to show.
 */
export function createMini(html: string, width: number, height: number, frame: (doc: Document, win: Window) => MiniFrame | null): Mini {
  const el = document.createElement('div');
  el.className = 'mini';
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.setAttribute('tabindex', '-1');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('scrolling', 'no');
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  el.append(iframe);
  const ready = new Promise<void>((resolve) => {
    iframe.addEventListener(
      'load',
      () => {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (doc && win) {
          doc.documentElement.style.scrollBehavior = 'auto';
          const f = frame(doc, win);
          if (f) {
            el.style.width = `${Math.round(f.crop.w * f.scale)}px`;
            el.style.height = `${Math.round(f.crop.h * f.scale)}px`;
            iframe.style.transform = `translate(${-f.crop.x * f.scale}px, ${-f.crop.y * f.scale}px) scale(${f.scale})`;
          }
        }
        el.classList.add('is-ready');
        resolve();
      },
      { once: true },
    );
  });
  iframe.srcdoc = html;
  return { el, ready };
}
