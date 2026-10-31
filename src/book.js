import { Chess } from 'chess.js';

export const posKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

// Build a position graph for one opening: key -> Map(san -> { lines:Set(lineIdx) })
// Trap lines (trap:true) are only in the book when the opponent is the one falling for them, i.e. you play the opening's own colour.
export function buildBook(opening, userColor) {
  const graph = new Map();
  const ends = new Map(); // key at end of line -> [line names]
  opening.lines.forEach((line, idx) => {
    if (line.trap && userColor && userColor !== opening.side) return;
    const g = new Chess();
    for (const san of line.moves.split(/\s+/)) {
      const key = posKey(g.fen());
      let m;
      try { m = g.move(san); } catch (e) { throw new Error(`Illegal move "${san}" in ${opening.name} / ${line.name}`); }
      if (!graph.has(key)) graph.set(key, new Map());
      const node = graph.get(key);
      if (!node.has(m.san)) node.set(m.san, new Set());
      node.get(m.san).add(idx);
    }
    const endKey = posKey(g.fen());
    if (!ends.has(endKey)) ends.set(endKey, []);
    ends.get(endKey).push(line.name);
  });
  return { opening, graph, ends };
}

// Book moves (SAN strings) available at a position
export function bookMoves(book, fen) {
  const node = book.graph.get(posKey(fen));
  return node ? [...node.keys()] : [];
}

// Weighted random pick: moves that appear in more lines are more likely
export function pickBookMove(book, fen, rng = Math.random) {
  const node = book.graph.get(posKey(fen));
  if (!node || !node.size) return null;
  const entries = [...node.entries()];
  const total = entries.reduce((s, [, set]) => s + set.size, 0);
  let r = rng() * total;
  for (const [san, set] of entries) { r -= set.size; if (r <= 0) return san; }
  return entries[entries.length - 1][0];
}

export function lineNameAt(book, fen) {
  const names = book.ends.get(posKey(fen));
  return names ? names.join(' / ') : null;
}
