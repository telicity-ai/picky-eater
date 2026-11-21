import type { Board, Placements } from './schema.js';

/**
 * Areas and options form a directed acyclic graph: an area is on the page when its slot is in the
 * page frame, or inside the chosen option of another area that is itself on the page. A person's
 * choices are one path through that graph. Everything here is pure, so the CLI, the server and
 * the browser agree on what "complete" means.
 */

export type ChoiceMap = Record<string, string>;

/** Ids of the areas that exist under these choices, in board order. */
export function activeAreas(board: Pick<Board, 'areas'>, placements: Placements, choices: ChoiceMap): string[] {
  const active = new Set<string>();
  // Hosts can come after their guests in board order, so iterate until nothing changes.
  for (let changed = true; changed; ) {
    changed = false;
    for (const area of board.areas) {
      if (active.has(area.id)) continue;
      const p = placements[area.id];
      if (!p) continue;
      if (p.inFrame || p.hosts.some((h) => active.has(h.area) && choices[h.area] === h.option)) {
        active.add(area.id);
        changed = true;
      }
    }
  }
  return board.areas.filter((a) => active.has(a.id)).map((a) => a.id);
}

/** Choices limited to areas that exist and options that exist. */
export function pruneChoices(board: Pick<Board, 'areas'>, placements: Placements, choices: ChoiceMap): ChoiceMap {
  const valid: ChoiceMap = {};
  for (const area of board.areas) {
    const picked = choices[area.id];
    if (picked !== undefined && area.options.some((o) => o.id === picked)) valid[area.id] = picked;
  }
  const out: ChoiceMap = {};
  for (const id of activeAreas(board, placements, valid)) {
    if (valid[id] !== undefined) out[id] = valid[id];
  }
  return out;
}

/** Active areas that still need a choice. */
export function missingChoices(board: Pick<Board, 'areas'>, placements: Placements, choices: ChoiceMap): string[] {
  return activeAreas(board, placements, choices).filter((id) => choices[id] === undefined);
}

/** A cycle of area ids such as ["a", "b", "a"], or null when the graph is acyclic. */
export function findCycle(placements: Placements): string[] | null {
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 'done') return null;
    if (state.get(id) === 'visiting') return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 'visiting');
    stack.push(id);
    for (const host of placements[id]?.hosts ?? []) {
      const cycle = visit(host.area);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };
  for (const id of Object.keys(placements)) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return null;
}

/** Cuts that are a page state of their own (not another cut's state at a different scroll position). */
export function stateCuts(board: Pick<Board, 'cuts'>): string[] {
  return board.cuts.filter((c) => !c.sameAs).map((c) => c.id);
}

/** The page state a cut shows. */
export function stateOf(board: Pick<Board, 'cuts'>, cutId: string): string {
  return board.cuts.find((c) => c.id === cutId)?.sameAs ?? cutId;
}
