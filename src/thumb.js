// Little static board pictures (position after the first moves of an opening) for cards, tiles and the home hero.
// They reuse chessground's own markup so they follow the player's chosen board and piece set.
import { Chess } from 'chess.js';

const ROLE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const cache = new Map();

/** position after the first `plies` half-moves of the opening's main line */
export function thumbPosition(opening, plies = 9) {
  const key = opening.id + ':' + plies;
  if (cache.has(key)) return cache.get(key);
  const g = new Chess(); let last = null;
  const line = opening.lines && opening.lines[0] ? opening.lines[0].moves.split(' ') : [];
  for (const san of line.slice(0, plies)) { try { last = g.move(san); } catch { break; } }
  const res = { board: g.board(), last: last ? [last.from, last.to] : null };
  cache.set(key, res); return res;
}

/** { board: 8x8 chess.js board, last: [from,to]|null } -> HTML. flip = show from Black's side */
export function boardHtml({ board, last }, flip = false) {
  const pos = (f, r) => `left:${(flip ? 7 - f : f) * 12.5}%;top:${(flip ? r : 7 - r) * 12.5}%`;
  let out = '';
  if (last) for (const sq of last) out += `<square class="last-move" style="${pos(sq.charCodeAt(0) - 97, +sq[1] - 1)}"></square>`;
  for (let ri = 0; ri < 8; ri++) for (let f = 0; f < 8; f++) {
    const p = board[ri][f]; if (!p) continue;
    out += `<piece class="${p.color === 'w' ? 'white' : 'black'} ${ROLE[p.type]}" style="${pos(f, 7 - ri)}"></piece>`;
  }
  return `<span class="thumb cg-wrap" aria-hidden="true"><cg-container><cg-board>${out}</cg-board></cg-container></span>`;
}
export const thumbHtml = (opening, flip = opening.side === 'black') => boardHtml(thumbPosition(opening), flip);
