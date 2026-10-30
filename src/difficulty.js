// How easy is each opening to LEARN? A single transparent score built from facts about the book and the meta
// (rating range, play style). Lower = easier. tools/gen-ease.mjs writes the result to src/ease-data.js and
// tools/test-progress.mjs checks that the stored table still matches this formula.
//
//   book size     positions in the opening's book / 25     (how much there is to remember)
//   line depth    (average plies per line - 12) / 5        (how long the lines are)
//   rating floor  (lowest recommended rating - 600) / 400 * 1.5
//   style         solid 0 · balanced .5 · aggressive .7 · sharp 1.35 · positional 1.4  (calculation / subtlety load)
//   very deep     +0.8 if any line is longer than 26 plies
//   trappy        -0.3 for simple trap-based surprise gambits (one idea to remember)
//
//   Easy   : score <= 4.55 and the opening makes sense at 800 or below   -> "Beginner friendly"
//   Hard   : score >= 7.5 or the opening starts to make sense at 1600+
//   Medium : everything else
export const STYLE_LOAD = { solid: 0, balanced: 0.5, aggressive: 0.7, sharp: 1.35, positional: 1.4 };
export const EASE_LEVELS = [
  { key: 'easy', label: 'Beginner friendly', short: 'Easy', dots: 1 },
  { key: 'medium', label: 'Medium', short: 'Medium', dots: 2 },
  { key: 'hard', label: 'Hard', short: 'Hard', dots: 3 },
];
export const EASY_MAX = 4.55, HARD_MIN = 7.5, EASY_RATING_MAX = 800, HARD_RATING_MIN = 1600;

/** m = { positions, avgPlies, maxPlies, lo, style, trappy } */
export function easeScore(m) {
  const s = m.positions / 25 + (m.avgPlies - 12) / 5 + ((m.lo - 600) / 400) * 1.5 + (STYLE_LOAD[m.style] ?? 0.7)
    + (m.maxPlies > 26 ? 0.8 : 0) - (m.trappy ? 0.3 : 0);
  return Math.round(s * 100) / 100;
}
export function classifyEase(score, lo) {
  if (score >= HARD_MIN || lo >= HARD_RATING_MIN) return 'hard';
  if (score <= EASY_MAX && lo <= EASY_RATING_MAX) return 'easy';
  return 'medium';
}
export function easeWhy(m, key) {
  const bits = [];
  bits.push(m.positions <= 45 ? 'small book' : m.positions <= 75 ? 'medium-sized book' : 'big book');
  if (m.style === 'solid') bits.push('quiet, safe plans');
  else if (m.style === 'sharp') bits.push(key === 'hard' ? 'sharp tactics' : 'open tactical play');
  else if (m.style === 'positional') bits.push('subtle plans');
  else if (m.style === 'aggressive') bits.push(m.trappy ? 'one simple attacking idea' : 'attacking plans');
  else bits.push('natural development');
  if (m.maxPlies > 26) bits.push('very long lines');
  if (key === 'hard' && m.lo >= HARD_RATING_MIN) bits.push('club-level theory');
  return bits.join(', ');
}
export function metricsOf(opening, book, meta, style) {
  const lens = opening.lines.map((l) => l.moves.trim().split(/\s+/).length);
  return {
    positions: book.graph.size, avgPlies: lens.reduce((a, b) => a + b, 0) / lens.length, maxPlies: Math.max(...lens),
    lo: meta.lo, style, trappy: !!meta.trappy,
  };
}
/** Recompute the whole table from the live book + meta (used by the generator and the test). */
export function computeEase(openings, buildBook, META, STYLE) {
  const out = {};
  for (const o of openings) {
    const m = metricsOf(o, buildBook(o), META[o.id], STYLE[o.id].style);
    const score = easeScore(m); const ease = classifyEase(score, m.lo);
    out[o.id] = { ease, score, why: easeWhy(m, ease) };
  }
  return out;
}
