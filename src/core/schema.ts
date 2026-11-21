import { z } from 'zod';

export const SCHEMA_VERSION = '2.0';

/** Lowercase kebab-case identifier chosen by the agent and kept stable across revisions. */
export const Id = z
  .string()
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and single hyphens, e.g. "hero" or "sign-up-form"');

export function isSafeRelativePath(p: string): boolean {
  if (p.length === 0 || p.length > 200) return false;
  if (!/^[A-Za-z0-9._\-/]+$/.test(p)) return false;
  return p.split('/').every((seg) => seg.length > 0 && seg !== '.' && seg !== '..' && !seg.startsWith('.'));
}

/** A file inside the draft folder. */
export const RelPath = z.string().refine(isSafeRelativePath, 'use a relative path inside the draft folder, e.g. "areas/hero/split.html"');

const Label = z.string().trim().min(1).max(80).regex(/^[^\n\r<>]*$/, 'one line of plain text');
const Selector = z.string().trim().min(1).max(300);
/** One sentence a person reads in the review: no markup, one line. */
const Reason = z.string().trim().min(3).max(200).regex(/^[^\n\r<>]*$/, 'one line of plain text');
const Markup = z.string().min(1).max(4000);

const exactlyOne = (keys: string[]) => (v: Record<string, unknown>) => keys.filter((k) => v[k] !== undefined).length === 1;

/** Where an inserted or moved element goes, relative to an existing element. */
const Place = { before: Selector.optional(), after: Selector.optional(), into: Selector.optional(), atStartOf: Selector.optional() };
const PLACE_KEYS = ['before', 'after', 'into', 'atStartOf'];
const placeMessage = 'give exactly one of "before", "after", "into" or "atStartOf"';

/**
 * One operation of a patch on a live page. Listed from least to most intrusive; use the first
 * kind that does the job.
 */
const MoveOp = z.strictObject({ move: Selector, ...Place }).refine(exactlyOne(PLACE_KEYS), placeMessage);
const WrapOp = z.strictObject({ wrap: Selector, in: z.string().min(1).max(600) });
const SetOp = z.strictObject({
  set: Selector,
  text: z.string().max(600).optional(),
  attr: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/), z.string().max(600).nullable()).optional(),
  addClass: z.array(z.string().regex(/^[^\s]+$/)).max(12).optional(),
  removeClass: z.array(z.string().regex(/^[^\s]+$/)).max(12).optional(),
});
const InsertOp = z.strictObject({ insert: Markup, ...Place }).refine(exactlyOne(PLACE_KEYS), placeMessage);
/** An operation on the elements of the page, as opposed to its styles or its behavior. */
export const DomOp = z.union([MoveOp, WrapOp, SetOp, InsertOp]);
export type DomOp = z.infer<typeof DomOp>;

export const PatchOp = z.union([
  z.strictObject({ css: z.string().min(1).max(4000) }),
  MoveOp,
  WrapOp,
  SetOp,
  InsertOp,
  /**
   * The same operations in every item of a list: each row, card or cell that the selector finds,
   * with the selectors of the operations looked up inside that item. Items that arrive later get
   * them too.
   */
  z.strictObject({ each: Selector, patch: z.array(DomOp).min(1).max(8) }),
  z.strictObject({ script: z.string().min(1).max(800), undo: z.string().min(1).max(800) }),
]);
export type PatchOp = z.infer<typeof PatchOp>;

export const Option = z.strictObject({
  id: Id,
  /** What a person would call this option. Read by screen readers and shown as a tooltip. */
  label: Label,
  /** Sketch boards: the HTML fragment that draws this option. */
  html: RelPath.optional(),
  /** Live boards: the smallest change to the running page that shows this option. */
  patch: z.array(PatchOp).min(1).max(12).optional(),
  /** Live boards: this option leaves the area as it is now. Every area has exactly one. */
  keep: z.boolean().optional(),
  /** At most one option per area: the one the agent would pick. */
  suggested: z.boolean().optional(),
  /** Id of the catalog pattern this option uses (see "picky-eater patterns"). */
  pattern: Id.optional(),
  /** Notes for the implementation: what to build when this option is approved. Not shown to the person. */
  build: z.string().trim().max(600).optional(),
  /** Live boards: the patch reaches outside the area's anchor (a sticky bar, for example). */
  page: z.boolean().optional(),
  /** The part that changes, if it is smaller than the area. Thumbnails are cropped to it. */
  focus: Selector.optional(),
  /** On the suggested option: one sentence on why it is suggested. Shown when the person points at the mark. */
  because: Reason.optional(),
});
export type Option = z.infer<typeof Option>;

/** A candidate that was considered for an area and left out, with the reason. */
export const Rejected = z.strictObject({ pattern: Id, why: Reason });
export type Rejected = z.infer<typeof Rejected>;

export const Source = z.strictObject({
  file: RelPath,
  selector: Selector.optional(),
  component: z.string().trim().min(1).max(120).optional(),
  line: z.number().int().min(1).optional(),
});

export const Area = z.strictObject({
  id: Id,
  /** Plain name of this part of the page, e.g. "Top banner". */
  label: Label,
  /** Sketch boards: the rough drawing shown before an option is chosen. */
  sketch: RelPath.optional(),
  /** Live boards: the element this area covers on the running page. */
  anchor: Selector.optional(),
  /** Live boards: where this area lives in the source code. */
  source: Source.optional(),
  /** Show this area only in these cuts. */
  cuts: z.array(Id).min(1).max(12).optional(),
  /** Live boards: this area only exists while another area has one of these options ({ "plans": ["toggle"] }). */
  when: z.record(Id, z.array(Id).min(1)).optional(),
  /** Id of the catalog decision this area answers ("picky-eater patterns"). Earlier choices are remembered by it. */
  decision: Id.optional(),
  /** Up to three candidates that were considered and are not offered, each with the reason. */
  rejected: z.array(Rejected).max(3).optional(),
  options: z.array(Option).min(2).max(5),
});
export type Area = z.infer<typeof Area>;

export const Step = z.union([
  z.strictObject({ click: Selector }),
  z.strictObject({ fill: Selector, value: z.string().max(400) }),
  z.strictObject({ scroll: Selector }),
  z.strictObject({ wait: Selector }),
  /** Move the pointer onto an element. Reaches what a page opens by script; a style on :hover needs a real pointer. */
  z.strictObject({ hover: Selector }),
  /** Press a key ("k", "Escape", "ArrowDown"), on an element or on whatever has the focus. */
  z.strictObject({ key: z.string().min(1).max(20).regex(/^[A-Za-z0-9 ]+$|^.$/, 'the name of one key, e.g. "k", "Enter" or "ArrowDown"'), on: Selector.optional() }),
]);
export type Step = z.infer<typeof Step>;

export const Cut = z.strictObject({
  id: Id,
  label: Label,
  /** Scroll so that this element is at the top of the screen. */
  at: Selector.optional(),
  /** This cut is the same page state as another cut, at a different scroll position. */
  sameAs: Id.optional(),
  /** Sketch boards: form values to show in this cut, by selector. */
  fill: z.record(Selector, z.union([z.string().max(400), z.boolean()])).optional(),
  /** Live boards: user actions that lead from a fresh page to this cut. */
  steps: z.array(Step).min(1).max(12).optional(),
  /** Live boards: the page is in this cut when this element is visible. */
  seen: Selector.optional(),
});
export type Cut = z.infer<typeof Cut>;

const LocalUrl = z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{2,5}\/[^\s]*$/, 'a page on a local development server, e.g. "http://localhost:5173/pricing"');

/**
 * Written by the agent after building: where the built page is and how its parts correspond to
 * the board, so that it can be measured the same way as the approved mockup.
 */
export const Built = z.strictObject({
  /** The built page on the development server. On a board over an existing page it defaults to that page. */
  url: LocalUrl.optional(),
  /** For each area, a selector for the element that implements it. */
  areas: z.record(Id, Selector).default({}),
  /** For a cut, how it is reached on the built page: the scroll target and the actions. */
  cuts: z.record(Id, z.strictObject({ at: Selector.optional(), steps: z.array(Step).min(1).max(12).optional() })).default({}),
});
export type Built = z.infer<typeof Built>;

export const Viewport = z.strictObject({
  id: Id,
  label: Label.optional(),
  width: z.number().int().min(280).max(2560),
  height: z.number().int().min(320).max(1600),
});
export type Viewport = z.infer<typeof Viewport>;

export const DEFAULT_VIEWPORTS: Viewport[] = [
  { id: 'desktop', label: 'Desktop', width: 1280, height: 800 },
  { id: 'phone', label: 'Phone', width: 390, height: 760 },
];
export const DEFAULT_CUTS: Cut[] = [{ id: 'top', label: 'Top' }];

const SketchBase = z.strictObject({
  kind: z.literal('sketch'),
  /** The page skeleton. Marks each area with data-pe-area="<id>". */
  frame: RelPath,
  /** Stylesheets shared by the whole page, in order. */
  styles: z.array(RelPath).max(8).optional(),
});
const LiveBase = z.strictObject({
  kind: z.literal('live'),
  /** The page on the user's development server. */
  url: z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{2,5}\/[^\s]*$/, 'a page on a local development server, e.g. "http://localhost:5173/pricing"'),
  attach: z.enum(['proxy', 'tag']).default('proxy'),
  serviceWorker: z.enum(['block', 'allow']).default('block'),
});
export type LiveBase = z.infer<typeof LiveBase>;

export const Board = z.strictObject({
  schema: z.literal('picky-eater/board'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  title: Label,
  base: z.discriminatedUnion('kind', [SketchBase, LiveBase]),
  viewports: z.array(Viewport).min(1).max(4).default(DEFAULT_VIEWPORTS),
  areas: z.array(Area).min(1).max(24),
  cuts: z.array(Cut).min(1).max(16).default(DEFAULT_CUTS),
});
export type Board = z.infer<typeof Board>;

// ---------------------------------------------------------------------------------------------
// Session state (written by the CLI and the review server, never by the agent)
// ---------------------------------------------------------------------------------------------

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const Iso = z.string().min(20).max(40);
const ChoiceMap = z.record(Id, Id);

export const Workspace = z.strictObject({
  schema: z.literal('picky-eater/workspace'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  activeSession: Id.nullable(),
  /** false: this project neither reads nor writes what the person chose before ("picky-eater taste --off"). */
  taste: z.boolean().optional(),
});
export type Workspace = z.infer<typeof Workspace>;

export const Session = z.strictObject({
  schema: z.literal('picky-eater/session'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: Id,
  title: Label,
  createdAt: Iso,
  /** Number of the latest revision; 0 before the first "propose". */
  revision: z.number().int().min(0),
});
export type Session = z.infer<typeof Session>;

/** An area exists when it is in the page frame, or inside the chosen option of another area. */
export const Placement = z.strictObject({
  inFrame: z.boolean(),
  hosts: z.array(z.strictObject({ area: Id, option: Id })),
});
export type Placement = z.infer<typeof Placement>;
export type Placements = Record<string, Placement>;

export const Change = z.strictObject({
  kind: z.enum(['first', 'page', 'cuts', 'area-added', 'area-removed', 'area-changed']),
  area: Id.optional(),
  label: Label.optional(),
});
export type Change = z.infer<typeof Change>;

export const Manifest = z.strictObject({
  schema: z.literal('picky-eater/manifest'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  revision: z.number().int().min(1),
  createdAt: Iso,
  note: z.string().max(600).optional(),
  /** Covers the board and every file a person can see in this revision. */
  digest: Sha256,
  files: z.record(RelPath, Sha256),
  page: Sha256,
  cuts: Sha256,
  areas: z.record(Id, z.strictObject({ digest: Sha256, placement: Placement })),
  /** What is different from the previous revision. */
  changes: z.array(Change),
  /** Change requests this revision answers. */
  answered: z.array(z.string()),
});
export type Manifest = z.infer<typeof Manifest>;

export const Choices = z.strictObject({
  schema: z.literal('picky-eater/choices'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  revision: z.number().int().min(1),
  choices: ChoiceMap,
  updatedAt: Iso,
});
export type Choices = z.infer<typeof Choices>;

export const ChangeRequest = z.strictObject({
  id: z.string().regex(/^q\d+$/),
  revision: z.number().int().min(1),
  /** The area the request is about, or null for the whole page. */
  area: Id.nullable(),
  cut: Id.nullable(),
  text: z.string().trim().min(3).max(2000),
  createdAt: Iso,
  status: z.enum(['open', 'answered', 'dismissed']),
  answeredIn: z.number().int().min(1).optional(),
});
export type ChangeRequest = z.infer<typeof ChangeRequest>;

export const Requests = z.strictObject({
  schema: z.literal('picky-eater/requests'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  requests: z.array(ChangeRequest),
});

export const Approval = z.strictObject({
  schema: z.literal('picky-eater/approval'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().regex(/^r\d+-a\d+$/),
  revision: z.number().int().min(1),
  digest: Sha256,
  choices: ChoiceMap,
  approvedAt: Iso,
  status: z.enum(['current', 'withdrawn', 'superseded']),
  endedAt: Iso.optional(),
  reason: z.string().max(200).optional(),
  /** Choices that differ from the previous approval of this session. */
  changedSincePrevious: z.array(z.strictObject({ area: Id, from: Id.nullable(), to: Id.nullable() })),
});
export type Approval = z.infer<typeof Approval>;

export const Runtime = z.strictObject({
  pid: z.number().int().min(1),
  port: z.number().int().min(1).max(65535),
  /** The second listener: the user's app is shown from this port, on its own origin. */
  stagePort: z.number().int().min(1).max(65535).optional(),
  sessionId: Id,
  /** In the review link. Lets the page read state, choose, request changes and approve. */
  pageToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  /** Used by the CLI. Read-only, plus stopping the server. */
  cliToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  startedAt: Iso,
  version: z.string(),
});
export type Runtime = z.infer<typeof Runtime>;

export type Phase = 'drafting' | 'choosing' | 'changes-requested' | 'approved';

/** Zod issues as short "path: message" lines an agent can act on. */
export function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`);
}
