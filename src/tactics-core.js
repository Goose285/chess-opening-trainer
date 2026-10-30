// Tactics (puzzles linked to openings): pure logic, no DOM and no fetch, so it can be unit-tested in node.
// Data comes from tactics/tactics.json (see tools/build-tactics.mjs). Puzzle rows: [id, fen, "uci uci ...", rating, "themes", name?, note?]
//   fen   = the position BEFORE the opponent's setup move; moves[0] is that setup move, then you and the opponent alternate.
//   ids starting with "T-" are hand-made famous traps (they carry a name and a note).
import { Chess } from 'chess.js';
import { HINT_POINTS, hintCap } from './grading.js';

export const MOVE_POINTS = 100, RETRY_POINTS = 25; // per move you have to find: first try / after a wrong attempt (a hint caps it at HINT_POINTS)
export { HINT_POINTS };

export function parsePuzzle(row, openingId) {
  const [id, fen, moves, rating, themes, name, note] = row;
  return { id, openingId, fen, moves: moves.split(' '), rating: +rating, themes: themes ? themes.split(' ') : [], name: name || '', note: note || '', trap: String(id).startsWith('T-') };
}
export const solverMoveCount = (p) => Math.ceil((p.moves.length - 1) / 2);
/** colour the player has: the opposite of the side that plays the setup move */
export const solverColor = (p) => (p.fen.split(' ')[1] === 'w' ? 'black' : 'white');
export const maxPoints = (p) => solverMoveCount(p) * MOVE_POINTS;
export const splitUci = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

/** points for one move you had to find */
export function movePoints({ wrong = false, hint = false, revealed = false } = {}) {
  if (revealed) return 0;
  const base = wrong ? RETRY_POINTS : MOVE_POINTS;
  return hint ? hintCap(base) : base;
}

/**
 * Is `uci` the right move at puzzle index `idx` (a solver move) in position `fen`?
 * The listed move always counts; any other move that checkmates also counts (the Lichess rule), and then ends the puzzle.
 * Returns { ok, mate } .
 */
export function judgeMove(p, idx, fen, uci) {
  if (uci === p.moves[idx]) return { ok: true, mate: false };
  try {
    const g = new Chess(fen); g.move(splitUci(uci));
    if (g.isCheckmate()) return { ok: true, mate: true };
  } catch { /* illegal */ }
  return { ok: false, mate: false };
}

// ---- themes: name + one plain-English line, shown after a solve
export const THEMES = {
  mateIn1: ['Mate in 1', 'Checkmate right now: the king is attacked and has no escape.'],
  mateIn2: ['Mate in 2', 'A forcing move, then checkmate. Look for checks and captures first.'],
  mateIn3: ['Mate in 3', 'A forced sequence that ends in checkmate.'],
  mate: ['Checkmate', 'The line ends with the king trapped and no way out.'],
  backRankMate: ['Back-rank mate', 'The king is boxed in by its own pawns, so a rook or queen on the back rank is checkmate.'],
  smotheredMate: ['Smothered mate', 'The king is surrounded by its own pieces, so a knight check cannot be escaped.'],
  bodenMate: ['Boden\u2019s mate', 'Two crossing bishops deliver mate to a king hemmed in by its own pieces.'],
  anastasiaMate: ['Anastasia\u2019s mate', 'A knight and a rook trap the king against the edge of the board.'],
  fork: ['Fork', 'One piece attacks two or more targets at once, and the opponent can only save one.'],
  pin: ['Pin', 'A piece cannot move without exposing something more valuable behind it.'],
  skewer: ['Skewer', 'A valuable piece is forced to move and exposes the piece behind it.'],
  hangingPiece: ['Free piece', 'A piece is left undefended (or badly defended), so you can simply take it.'],
  trappedPiece: ['Trapped piece', 'The piece has no safe square to go to, so it will be won.'],
  discoveredAttack: ['Discovered attack', 'Moving one piece uncovers an attack from another piece behind it.'],
  doubleCheck: ['Double check', 'Two pieces give check at once, so the king must move.'],
  sacrifice: ['Sacrifice', 'You give up material on purpose to win more, or checkmate, afterwards.'],
  deflection: ['Deflection', 'Force a defender away from the job it was doing.'],
  attraction: ['Attraction', 'Lure a piece (often the king) to a square where it can be hit.'],
  clearance: ['Clearance', 'Move a piece out of the way so another piece can do its work.'],
  intermezzo: ['In-between move', 'A surprise move played before the expected recapture.'],
  attackingF2F7: ['The f2 / f7 weakness', 'f2 and f7 are the weakest squares next to the king in the opening.'],
  kingsideAttack: ['Attack on the king', 'Pieces swing over to the king\u2019s side to go after the king.'],
  exposedKing: ['Exposed king', 'The king has lost its shelter and is easy to attack.'],
  xRayAttack: ['X-ray', 'A piece attacks through another piece along a line.'],
  interference: ['Interference', 'Block the line between two enemy pieces so they cannot work together.'],
  capturingDefender: ['Remove the defender', 'Take the piece that was guarding something important.'],
  defensiveMove: ['Defence', 'The best move here keeps you safe rather than attacking.'],
  promotion: ['Promotion', 'A pawn reaches the last rank and becomes a queen (or another piece).'],
  regainMaterial: ['Win the pawn back', 'You gambited a pawn. Trade the right pieces and take it back with interest.'],
  exchange: ['Exchange', 'Trade pieces to reach the position you want.'],
};
const PRIORITY = ['smotheredMate', 'backRankMate', 'bodenMate', 'anastasiaMate', 'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'trappedPiece', 'hangingPiece', 'discoveredAttack', 'doubleCheck',
  'regainMaterial', 'attraction', 'deflection', 'clearance', 'intermezzo', 'sacrifice', 'attackingF2F7', 'capturingDefender', 'interference', 'xRayAttack', 'promotion', 'exposedKing', 'defensiveMove', 'kingsideAttack', 'exchange', 'mate'];
/** up to 3 themes to show after a solve, most specific first (generic "mate" is hidden when a mate-in-N exists) */
export function themesOf(p, max = 3) {
  const have = new Set(p.themes);
  const mateN = ['mateIn1', 'mateIn2', 'mateIn3'].some((k) => have.has(k)) || ['smotheredMate', 'backRankMate', 'bodenMate', 'anastasiaMate'].some((k) => have.has(k));
  const out = PRIORITY.filter((k) => have.has(k) && THEMES[k] && !(k === 'mate' && mateN)).slice(0, max).map((k) => ({ key: k, label: THEMES[k][0], text: THEMES[k][1] }));
  return out.length ? out : [{ key: 'tactic', label: 'Tactic', text: 'A tactical shot: the best move wins material or keeps a big advantage.' }];
}

// ---- theme filter on the Tactics home screen
export const THEME_FILTERS = [
  { key: 'any', label: 'Any', test: () => true },
  { key: 'mate', label: '♚ Mates', test: (p) => p.themes.some((t) => /mate/i.test(t)) },
  { key: 'fork', label: 'Forks', test: (p) => p.themes.includes('fork') },
  { key: 'pin', label: 'Pins & skewers', test: (p) => p.themes.includes('pin') || p.themes.includes('skewer') },
  { key: 'hanging', label: 'Free pieces', test: (p) => p.themes.includes('hangingPiece') },
  { key: 'trapped', label: 'Trapped pieces', test: (p) => p.themes.includes('trappedPiece') },
  { key: 'trap', label: '🪤 Famous traps', test: (p) => p.trap },
];
export const themeFilter = (key) => THEME_FILTERS.find((f) => f.key === key) || THEME_FILTERS[0];

/** All puzzles of a loaded data blob as { [openingId]: puzzle[] } */
export function parseData(data) {
  const out = {};
  for (const [id, rows] of Object.entries((data && data.sets) || {})) out[id] = rows.map((r) => parsePuzzle(r, id));
  return out;
}

const shuffle = (a, rng) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
/**
 * Order a pool into a play queue. Unsolved puzzles first, easiest first; solved ones go to the back so you meet new ones.
 * `size` limits the queue (used for "Mixed", which serves rounds of 10: random unsolved picks, then sorted by rating so it warms up).
 */
export function buildQueue(pool, solved, { size = Infinity, random = false, rng = Math.random } = {}) {
  const sv = new Set(solved || []);
  const byRating = (a, b) => a.rating - b.rating || (a.id < b.id ? -1 : 1);
  let fresh = pool.filter((p) => !sv.has(p.id)), done = pool.filter((p) => sv.has(p.id));
  if (random) { fresh = shuffle(fresh, rng); done = shuffle(done, rng); const pick = fresh.concat(done).slice(0, size); return pick.sort(byRating); }
  const q = fresh.sort(byRating).concat(done.sort(byRating));
  return q.slice(0, size);
}
