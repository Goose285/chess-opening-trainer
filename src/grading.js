import { Chess } from 'chess.js';

// Grades: name, label, points, colour used by the UI
export const GRADES = {
  book:       { key: 'book',       label: 'Book move',  points: 100, icon: '★', desc: 'Matches the opening line.' },
  best:       { key: 'best',       label: 'Best',       points: 100, icon: '✓', desc: "Engine's top choice." },
  excellent:  { key: 'excellent',  label: 'Excellent',  points: 90,  icon: '!', desc: 'Practically as good as the best move.' },
  good:       { key: 'good',       label: 'Good',       points: 75,  icon: '✓', desc: 'A fine move.' },
  inaccuracy: { key: 'inaccuracy', label: 'Inaccuracy', points: 40,  icon: '?!', desc: 'Loses a little (50–100 cp).' },
  mistake:    { key: 'mistake',    label: 'Mistake',    points: 15,  icon: '?', desc: 'Loses a clear amount (100–250 cp).' },
  blunder:    { key: 'blunder',    label: 'Blunder',    points: 0,   icon: '??', desc: 'Throws away a lot (250+ cp).' },
};

/** A move made after a hint was shown for it scores at most this many points (a weaker move that normally scores less keeps the lower score). */
export const HINT_POINTS = 5;
export const hintCap = (points) => Math.min(points, HINT_POINTS);

const EVAL_CAP = 800; // evaluations beyond ±8 pawns are treated as equally decisive

export const capEval = (cp) => Math.max(-EVAL_CAP, Math.min(EVAL_CAP, cp));

// Centipawn loss for the player who just moved.
// before: eval (side-to-move POV) of the position before the move (= value of best play)
// after:  eval (side-to-move POV) of the position after the move (opponent to move)
export function centipawnLoss(beforeCp, afterCp) {
  return Math.max(0, capEval(beforeCp) - capEval(-afterCp));
}

export function gradeFromLoss(loss, isEngineBest) {
  if (isEngineBest || loss <= 10) return GRADES.best;
  if (loss <= 25) return GRADES.excellent;
  if (loss < 50) return GRADES.good;
  if (loss < 100) return GRADES.inaccuracy;
  if (loss <= 250) return GRADES.mistake;
  return GRADES.blunder;
}

export const formatEval = (cpWhite) => {
  if (Math.abs(cpWhite) >= 9000) { const n = Math.max(1, Math.round((10000 - Math.abs(cpWhite)))); return (cpWhite > 0 ? '+M' : '-M') + n; }
  const v = cpWhite / 100; return (v > 0 ? '+' : '') + v.toFixed(2);
};

export function uciToSan(fen, uci) {
  if (!uci) return '—';
  try { const g = new Chess(fen); const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return m ? m.san : uci; } catch { return uci; }
}

export function summaryRating(pct) {
  if (pct >= 95) return 'Flawless — you know this line cold.';
  if (pct >= 85) return 'Strong — only small slips.';
  if (pct >= 70) return 'Solid, with a few gaps to review.';
  if (pct >= 50) return 'Getting there — drill this line again.';
  return 'Tough run — try again, the line will stick.';
}
