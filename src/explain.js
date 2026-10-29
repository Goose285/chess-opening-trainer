// Turns an opening line into annotated demo steps. Hand-written notes (lore.js WALK) are used while a line is
// still on the opening's main line; everywhere else a factual note is generated from the position itself.
import { Chess } from 'chess.js';
import { WALK, MAIN_LINE } from './lore.js';

const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const sanList = (line) => line.moves.trim().split(/\s+/);
export const mainLineIndex = (opening) => MAIN_LINE[opening.id] || 0;

// Facts about one move: used for the fallback sentence and for the board highlights.
export function explainAuto(m, afterFen) {
  const who = m.color === 'w' ? 'White' : 'Black';
  const after = new Chess(afterFen);
  let t;
  if (m.flags.includes('k') || m.flags.includes('q')) {
    t = `${who} castles ${m.flags.includes('k') ? 'kingside' : 'queenside'}: the king is safer and a rook joins the game.`;
  } else if (m.captured) {
    t = `The ${m.piece === 'p' ? m.from[0] + '-pawn' : NAME[m.piece]} takes the ${NAME[m.captured]} on ${m.to}.`;
  } else if (m.piece === 'p') {
    const central = ['c', 'd', 'e', 'f'].includes(m.to[0]) && ['4', '5'].includes(m.to[1]);
    t = central ? `${who} pushes a pawn to ${m.to} to claim space in the centre.` : `The pawn moves to ${m.to}, gaining space and shaping the pawn structure.`;
  } else if ((m.piece === 'n' || m.piece === 'b') && m.from[1] === (m.color === 'w' ? '1' : '8')) {
    t = `${who} develops the ${NAME[m.piece]} to ${m.to}.`;
  } else {
    t = `The ${NAME[m.piece]} moves to ${m.to}.`;
  }
  if (m.promotion) t += ` The pawn promotes to a ${NAME[m.promotion]}.`;
  if (after.isCheckmate()) return t + ' Checkmate!';
  if (after.isCheck()) t += ' It gives check.';
  else {
    // enemy pieces the moved piece now attacks (largest first, at most two)
    const enemy = m.color === 'w' ? 'b' : 'w';
    const hits = [];
    for (const row of after.board()) for (const p of row) {
      if (!p || p.color !== enemy || p.type === 'k' || p.type === 'p') continue;
      if (after.attackers(p.square, m.color).includes(m.to)) hits.push(p);
    }
    hits.sort((a, b) => VAL[b.type] - VAL[a.type]);
    if (hits.length) t += ` It now attacks the ${hits.slice(0, 2).map((p) => `${NAME[p.type]} on ${p.square}`).join(' and the ')}.`;
  }
  return t;
}

// The demo steps for one line of an opening.
export function buildSteps(opening, lineIdx) {
  const line = opening.lines[lineIdx];
  const moves = sanList(line);
  const main = sanList(opening.lines[mainLineIndex(opening)]);
  const walk = WALK[opening.id] || [];
  const g = new Chess();
  const steps = [];
  let onMain = true, branched = false;
  moves.forEach((san, i) => {
    const m = g.move(san);
    const wasOnMain = onMain;
    if (onMain && main[i] !== san) onMain = false;
    let text = null;
    if (onMain && walk[i] && walk[i].startsWith(san + ': ')) text = walk[i].slice(san.length + 2);
    if (text == null) {
      text = explainAuto(m, m.after);
      if (wasOnMain && !onMain && !branched) { text = `The line branches here (${line.name}). ` + text; branched = true; }
    }
    steps.push({
      ply: i + 1, san: m.san, from: m.from, to: m.to, fen: m.after, color: m.color, piece: m.piece, captured: m.captured || null,
      castle: m.flags.includes('k') || m.flags.includes('q'), check: g.isCheck(), mate: g.isCheckmate(), text,
      label: (m.color === 'w' ? `${Math.ceil((i + 1) / 2)}.` : `${Math.ceil((i + 1) / 2)}…`) + ' ' + m.san,
    });
  });
  return steps;
}

// The rook's from/to for the castling arrow.
export function castleRook(step) {
  const rank = step.color === 'w' ? '1' : '8';
  return step.to[0] === 'g' ? ['h' + rank, 'f' + rank] : ['a' + rank, 'd' + rank];
}

// A short note on "where we are" for the Learn-more popup during a drill.
export function positionNote(opening, history, lineName) {
  if (!history.length) return { title: 'Starting position', text: 'No moves yet. The book move is yours to find, so think about the centre, development and king safety.' };
  const g = new Chess();
  let last = null;
  for (const san of history) { last = g.move(san); if (!last) break; }
  if (!last) return null;
  const main = sanList(opening.lines[mainLineIndex(opening)]);
  const walk = WALK[opening.id] || [];
  const i = history.length - 1;
  const onMain = history.every((s, k) => main[k] === s);
  const num = `${Math.ceil(history.length / 2)}${last.color === 'w' ? '.' : '…'} ${last.san}`;
  let text = onMain && walk[i] && walk[i].startsWith(last.san + ': ') ? walk[i].slice(last.san.length + 2) : explainAuto(last, last.after);
  return { title: `Last move: ${num}`, text, line: lineName || null };
}
