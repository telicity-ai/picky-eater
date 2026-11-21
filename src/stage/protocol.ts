import type { Board, PatchOp } from '../core/schema.js';

/**
 * Messages between the review page and the stage agent, the one script that runs inside the
 * user's app. They travel by postMessage between two origins. The agent only obeys the review
 * origin it was served for; the review page treats everything the agent says as untrusted data
 * for drawing, never as a choice or an approval.
 */

/** Baked into the agent script by the stage listener. */
export interface StageConfig {
  /** Origins of the review page. Messages from anywhere else are ignored. */
  origins: string[];
  /** "proxy": the app is served through the stage listener. "tag": the app loads the agent itself. */
  mode: 'proxy' | 'tag';
  serviceWorker: 'block' | 'allow';
  /** Origin of the stage listener, which serves the agent and the scripts of level-4 patches. */
  base: string;
}

export interface AgentOption {
  id: string;
  patch?: PatchOp[];
  page?: boolean;
  focus?: string;
}
export interface AgentArea {
  id: string;
  anchor: string;
  cuts?: string[];
  options: AgentOption[];
}
export interface AgentCut {
  id: string;
  at?: string;
  sameAs?: string;
  seen?: string;
}
export type Step = NonNullable<Board['cuts'][number]['steps']>[number];

export interface AgentLook {
  choices: Record<string, string>;
  preview: { area: string; option: string } | null;
  /** The page state the review page is showing: decides which dots exist. */
  state: string;
  /** Areas that exist under the current choices. */
  active: string[];
}

export type ToAgent =
  | { type: 'init'; epoch: number; revision: number; areas: AgentArea[]; cuts: AgentCut[]; look: AgentLook; dots: boolean }
  | { type: 'look'; req: number; look: AgentLook; anchor?: string }
  | { type: 'dots'; on: boolean; hot: string | null }
  | { type: 'scroll'; by?: [number, number]; to?: number; area?: string; always?: boolean; reveal?: string }
  | { type: 'snapshot'; req: number; without?: string }
  | { type: 'steps'; req: number; steps: Step[] }
  /** How motion is shown: slowed down, and in the form people get who asked for less of it. */
  | { type: 'motion'; slow: boolean; reduced: boolean }
  /** Play the entrance of an area again. */
  | { type: 'replay'; area: string };

export interface AreaFrame {
  id: string;
  /** Box in the screen of the app, in CSS pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where a sticky area sits when the page is at the top, in page pixels. */
  rest?: number;
  /** Where its dot is, and whether it can be seen (on screen, not under a sticky bar, right cut). */
  dot: { x: number; y: number; on: boolean };
  /** A dialog or a bar that stays on screen lies over the area. */
  covered?: boolean;
  state: 'sketch' | 'preview' | 'chosen';
}

export interface Problem {
  area: string;
  option: string | null;
  /** ANCHOR_MISSING, TARGET_MISSING, SCRIPT_FAILED or REVERTED. */
  code: string;
  detail: string;
}

export interface Frame {
  sx: number;
  sy: number;
  vw: number;
  vh: number;
  /** Height of the whole page. */
  ph: number;
  /** The page state recognised from the "seen" selectors of the cuts. */
  state: string;
  /** The cut whose scroll position is in view. */
  spy: string;
  areas: AreaFrame[];
  problems: Problem[];
  /** Areas are missing and the page looks like a sign-in screen. */
  wall?: boolean;
  /** Where the app is: path and query. An app moves between its screens without loading a page. */
  at?: string;
}

export type FromAgent =
  | { type: 'ready'; href: string }
  | ({ type: 'frame' } & Frame)
  | { type: 'done'; req: number; ok: boolean; error?: string }
  | { type: 'snapshot'; req: number; html?: string; scrollY: number; error?: string };

/** Every message carries this marker and the epoch of the page load it belongs to. */
export type Envelope<T> = T & { pe: 1; epoch: number };

export const DOT_STYLE = `
.dot{position:absolute;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;box-sizing:border-box;border-radius:50%;
  background:#2f6fed;border:3px solid #fff;box-shadow:0 0 0 1px rgba(20,40,90,.4),0 2px 6px rgba(0,0,0,.3)}
.dot.open::after{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px solid #2f6fed;animation:pulse 1.8s ease-out infinite}
.dot.done{background:#fff;border-color:#2f6fed}
.dot.done::before{content:"";position:absolute;left:4px;top:2px;width:4px;height:8px;border:solid #2f6fed;border-width:0 2px 2px 0;transform:rotate(45deg)}
.dot.hot{box-shadow:0 0 0 6px rgba(47,111,237,.3),0 2px 6px rgba(0,0,0,.3)}
@keyframes pulse{from{transform:scale(.6);opacity:.8}to{transform:scale(1.3);opacity:0}}
@media (prefers-reduced-motion:reduce){.dot.open::after{animation:none;opacity:.5}}
`;

/** The storyboard frame around an area of a live page that is not decided yet, or is being tried out. */
export const BOX_STYLE = `
.box{position:absolute;left:0;top:0;box-sizing:border-box;border-radius:6px;pointer-events:none}
.box.sketch{border:2px dashed rgba(83,104,150,.8)}
.box.preview{border:2px solid #2f6fed}
`;

/** The dot sits in the top-right corner of its area; beside a small one (a button, a short message), so that it does not cover it. */
export function dotPoint(box: { x: number; y: number; w: number; h: number }, screenWidth: number): { x: number; y: number } {
  if (box.h < 44 && box.w < 240) return { x: Math.min(box.x + box.w + 16, screenWidth - 18), y: box.y + box.h / 2 };
  return { x: Math.max(box.x + 18, Math.min(box.x + box.w - 20, screenWidth - 18)), y: box.y + 20 };
}
