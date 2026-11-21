import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateOf } from '../core/graph.js';
import type { AreaMeasure, MotionSign } from '../core/measure.js';
import type { Board, Cut, Viewport } from '../core/schema.js';
import type { Step } from '../stage/protocol.js';
import type { Browser, Tab } from './browser.js';
import type { ProbeArea, ProbePatch } from './probe.js';
import { playSteps } from './steps.js';

/** One moment of the page at one width: where its areas are and what is in them. */
export interface View {
  viewport: string;
  width: number;
  height: number;
  cut: string;
  scrollY: number;
  /** File name of the picture of the screen. */
  shot: string;
  areas: AreaMeasure[];
  /** Why this moment could not be reached, if it could not. */
  problem?: string;
}

export interface AreaShot {
  viewport: string;
  area: string;
  cut: string;
  shot: string;
}

export interface Capture {
  views: View[];
  areaShots: AreaShot[];
}

export interface CaptureJob {
  browser: Browser;
  board: Board;
  /** Folder for the pictures. */
  dir: string;
  /** The built-in script that measures a page from inside. */
  probeJs: string;
  mockup: boolean;
  /** The areas to measure in a page state, with the selectors that find them. */
  areas(state: string): ProbeArea[];
  /** Where a cut scrolls to. */
  at(cut: Cut): string | null;
  /** Bring the tab to a page state, from scratch. Returns what went wrong, if anything. */
  open(tab: Tab, viewport: Viewport, state: string): Promise<string | null>;
  /** Areas in which a motion was offered: what moves in them is part of what was decided, and is measured. */
  moving?: ReadonlySet<string>;
}

const js = (value: unknown) => JSON.stringify(value);

export async function capture(job: CaptureJob): Promise<Capture> {
  mkdirSync(job.dir, { recursive: true });
  const views: View[] = [];
  const areaShots: AreaShot[] = [];
  for (const viewport of job.board.viewports) {
    const tab = await job.browser.newTab(viewport.width, viewport.height);
    const pictured = new Set<string>();
    try {
      for (const cut of job.board.cuts) {
        const state = stateOf(job.board, cut.id);
        const problem = await job.open(tab, viewport, state);
        await tab.evaluate(`__peProbe.show(${js(job.at(cut))}, ${job.mockup})`);
        await tab.evaluate('__peProbe.settle()');
        const list = job.areas(state);
        const measured = await tab.evaluate<{ scrollY: number; areas: AreaMeasure[] }>(`__peProbe.measure(${js(list)}, ${job.board.base.kind === 'live'})`);
        // Where a motion was offered, what moves is part of what was approved: as declared, and as people get it who asked for less.
        const asked = list.filter((area) => job.moving?.has(area.id));
        if (asked.length > 0) {
          const moving = await tab.evaluate<Record<string, MotionSign[]>>(`__peProbe.motion(${js(asked)})`);
          await tab.reducedMotion(true);
          const reduced = await tab.evaluate<Record<string, MotionSign[]>>(`__peProbe.motion(${js(asked)})`);
          await tab.reducedMotion(false);
          for (const area of measured.areas) {
            if (!area.found || !job.moving!.has(area.id)) continue;
            area.motion = moving[area.id] ?? [];
            area.reduced = reduced[area.id] ?? [];
          }
        }
        const shot = `${viewport.id}.${cut.id}.png`;
        writeFileSync(join(job.dir, shot), await tab.screenshot());
        views.push({ viewport: viewport.id, width: viewport.width, height: viewport.height, cut: cut.id, scrollY: measured.scrollY, shot, areas: measured.areas, ...(problem ? { problem } : {}) });

        // Each area gets a picture of its own, in the first moment in which it is on the page.
        for (const area of list) {
          if (pictured.has(area.id) || !measured.areas.find((a) => a.id === area.id)?.found) continue;
          const clip = await tab.evaluate<{ x: number; y: number; width: number; height: number } | null>(`__peProbe.frameArea(${js(area)})`);
          if (!clip) continue;
          await tab.evaluate('__peProbe.settle(60)');
          const file = `${viewport.id}.area.${area.id}.png`;
          writeFileSync(join(job.dir, file), await tab.screenshot(clip));
          areaShots.push({ viewport: viewport.id, area: area.id, cut: cut.id, shot: file });
          pictured.add(area.id);
        }
      }
    } finally {
      await tab.close();
    }
  }
  return { views, areaShots };
}

/** Open a real page, lay patches over it if there are any, and perform the steps that lead to a state. */
export async function openPage(tab: Tab, probeJs: string, url: string, patches: ProbePatch[], steps: Step[] | undefined, untouched?: () => Promise<void>, seen?: string): Promise<string | null> {
  await tab.goto(url);
  await tab.evaluate(probeJs);
  await tab.evaluate('__peProbe.still()');
  // A page that fetches its data, or that a framework draws after it opens, is measured once it has.
  await tab.evaluate('__peProbe.ready()');
  await tab.idle();
  await tab.evaluate('__peProbe.quiet()');
  const apply = async () => {
    if (patches.length === 0) return;
    const result = await tab.evaluate<{ scripts: Array<{ area: string; anchor: string; code: string }> }>(`__peProbe.apply(${js(patches)})`);
    for (const script of result.scripts) {
      // The script of a level-4 patch, as the stage agent would run it: with the area and a "this" it shares with its undo.
      await tab.evaluate(`(function (area, document) {\n${script.code}\n}).call({}, document.querySelector(${js(script.anchor)}), document)`).catch(() => {});
    }
  };
  // The caller may look at the page as the app draws it, before any patch moves things.
  await untouched?.();
  await apply();
  let problem: string | null = null;
  if (steps && steps.length > 0) {
    try {
      await playSteps(tab, steps, seen);
    } catch (err) {
      problem = (err as Error).message;
    }
    await untouched?.();
    await apply(); // patches whose elements only exist in this state
  }
  await tab.evaluate('__peProbe.settle()');
  return problem;
}

/** Compare two pictures in the browser: the share of pixels that differ visibly. */
export async function pixelDifference(tab: Tab, a: Buffer, b: Buffer): Promise<number> {
  const url = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;
  return tab.evaluate<number>(`(async (a, b) => {
    const load = (src) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('picture')); img.src = src; });
    const [x, y] = await Promise.all([load(a), load(b)]);
    const w = Math.max(x.width, y.width), h = Math.max(x.height, y.height);
    const pixels = (img, fill) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = fill; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; };
    // Where one picture is larger than the other, the missing part counts as different.
    const p = pixels(x, '#ff00ff'), q = pixels(y, '#00ff00');
    let differ = 0;
    for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 60) differ++;
    return differ / (w * h);
  })(${js(url(a))}, ${js(url(b))})`);
}
