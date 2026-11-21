import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { getCatalog } from '../catalog/load.js';
import { Id, type Approval, type Board } from '../core/schema.js';
import { readJson, writeJsonAtomic } from '../session/fs.js';
import type { Ws } from '../session/store.js';
import { advise, gather, offeredOf, type AreaAdvice } from './score.js';
import { appendEvents, projectKey, readEvents, readRules, tasteOn, type Offered, type TasteEvent } from './store.js';

/** What taste says about a revision, written when it is published. Advice, not content: it is not part of the digest. */
export const Advice = z.strictObject({
  schema: z.literal('picky-eater/advice'),
  areas: z.record(Id, z.strictObject({ suggested: Id, by: z.literal('taste'), because: z.string().max(200) })),
});
export type Advice = z.infer<typeof Advice>;

const intensities = (): ((pattern: string) => Offered['intensity'] | undefined) => {
  const map = new Map(getCatalog().patterns.filter((p) => p.motion).map((p) => [p.id, p.motion!.intensity]));
  return (pattern) => map.get(pattern);
};

/** Compute where the mark should move for a board, from what the person chose before. Empty when taste is off. */
export function adviceFor(ws: Ws, board: Board): Record<string, AreaAdvice> {
  if (!tasteOn(ws)) return {};
  try {
    return advise(board, gather(readEvents(), readRules(), projectKey(ws.root)), intensities());
  } catch {
    return {}; // taste never stands in the way of publishing
  }
}

export function writeAdvice(revisionDir: string, areas: Record<string, AreaAdvice>): void {
  if (Object.keys(areas).length === 0) return;
  writeJsonAtomic(join(revisionDir, 'advice.json'), { schema: 'picky-eater/advice', areas } satisfies Advice);
}

export function readAdvice(revisionDir: string): Advice['areas'] {
  const file = join(revisionDir, 'advice.json');
  if (!existsSync(file)) return {};
  try {
    const r = Advice.safeParse(readJson(file));
    return r.success ? r.data.areas : {};
  } catch {
    return {};
  }
}

/** The board as the person sees it: with the mark where taste moved it. */
export function withAdvice(board: Board, advice: Advice['areas']): Board {
  if (Object.keys(advice).length === 0) return board;
  return {
    ...board,
    areas: board.areas.map((area) => {
      const a = advice[area.id];
      if (!a || !area.options.some((o) => o.id === a.suggested)) return area;
      return {
        ...area,
        options: area.options.map((o) => {
          const { suggested: _s, because: _b, ...rest } = o;
          return o.id === a.suggested ? { ...rest, suggested: true, because: a.because } : rest;
        }),
      };
    }),
  };
}

/**
 * The person approved: remember, for each area that was on the page, what was offered, which
 * option carried the mark and which one they took. Called by the review listener only.
 */
export function recordApproval(ws: Ws, session: string, board: Board, advice: Advice['areas'], approval: Approval, active: string[]): number {
  if (!tasteOn(ws)) return 0;
  try {
    const project = projectKey(ws.root);
    const intensityOf = intensities();
    const events: TasteEvent[] = [];
    for (const area of board.areas) {
      const chosen = approval.choices[area.id];
      if (!chosen || !active.includes(area.id)) continue;
      const moved = advice[area.id];
      const suggested = moved?.suggested ?? area.options.find((o) => o.suggested)?.id ?? null;
      events.push({
        at: approval.approvedAt,
        project,
        session,
        revision: approval.revision,
        area: area.id,
        ...(area.decision ? { decision: area.decision } : {}),
        suggested,
        ...(suggested ? { suggestedBy: moved ? ('taste' as const) : ('agent' as const) } : {}),
        chosen,
        offered: offeredOf(area, intensityOf),
      });
    }
    appendEvents(events);
    return events.length;
  } catch {
    return 0; // an approval is never refused because taste could not be written
  }
}
