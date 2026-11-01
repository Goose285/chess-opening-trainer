// Gambit mastery map: pure rules (no DOM, no storage). Levels are derived from the per-opening stats progress.js already keeps,
// so the map and the bronze/silver/gold stars can never disagree:
//   unseen   - never played a line and never watched it
//   learning - watched it, or played it, but fewer than 2 clean runs (a clean run = a finished line with 90%+ and no hints)
//   solid    - 2+ clean runs                                   (= the silver star)
//   mastered - 3+ clean runs incl. a perfect one, across different lines (= the gold star)
export const LEVELS = ['unseen', 'learning', 'solid', 'mastered'];
export const LEVEL_LABEL = { unseen: 'Unseen', learning: 'Learning', solid: 'Solid', mastered: 'Mastered' };
export const LEVEL_RULE = {
  unseen: 'Not played or watched yet',
  learning: 'Watched or played, fewer than 2 clean runs',
  solid: '2 clean runs (a finished line at 90%+, no hints)',
  mastered: '3 clean runs incl. a perfect line, on different lines',
};

/** rec = state.openings[id] (or undefined), watched = state.watched includes the id */
export function masteryOf(rec, watched = false, tier = rec && rec.tier) {
  if (tier === 'gold') return 'mastered';
  if (tier === 'silver') return 'solid';
  if (rec && (rec.runs > 0 || rec.done > 0)) return 'learning';
  return watched ? 'learning' : 'unseen';
}

const FIRST = ['e4', 'd4'];
/** first move of the main line (what White opens with); anything else is grouped as "other" */
export const firstMoveOf = (o) => { const m = (o.lines && o.lines[0] ? o.lines[0].moves.split(' ')[0] : '') || ''; return FIRST.includes(m) ? m : 'other'; };
const TITLE = {
  white: { e4: 'As White · 1.e4', d4: 'As White · 1.d4', other: 'As White · other first moves' },
  black: { e4: 'As Black · against 1.e4', d4: 'As Black · against 1.d4', other: 'As Black · against other first moves' },
};
/** Gambits (with lines) grouped by side, then first move: [{ key, title, items:[opening] }] in a fixed order. Empty groups are dropped. */
export function groupGambits(openings) {
  const g = openings.filter((o) => o.gambit && o.lines.length);
  const out = [];
  for (const side of ['white', 'black']) for (const f of [...FIRST, 'other']) {
    const items = g.filter((o) => o.side === side && firstMoveOf(o) === f).sort((a, b) => a.name.localeCompare(b.name));
    if (items.length) out.push({ key: `${side}-${f}`, title: TITLE[side][f], items });
  }
  return out;
}

/** One cell's view model. */
export function cellOf(o, state) {
  const rec = state.openings[o.id], watched = state.watched.includes(o.id), level = masteryOf(rec, watched);
  const n = o.lines.length, done = rec ? Math.min(n, rec.vars.length) : 0;
  return { id: o.id, name: o.name, side: o.side, level, lines: n, linesDone: done, best: rec ? rec.best : 0, clean: rec ? rec.clean : 0, perfect: rec ? rec.perfect : 0 };
}
export function summary(openings, state) {
  const cells = openings.filter((o) => o.gambit && o.lines.length).map((o) => cellOf(o, state));
  const counts = { unseen: 0, learning: 0, solid: 0, mastered: 0 };
  cells.forEach((c) => counts[c.level]++);
  return { total: cells.length, counts, started: cells.length - counts.unseen };
}
