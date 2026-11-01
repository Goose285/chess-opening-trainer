// Share card: the pure part (no DOM, so tools/ can unit-test it in node). It decides WHEN a milestone is worth a Share
// prompt and builds the card "spec" that share.js paints onto a canvas. Nothing here touches progress or grading.

export const SITE_URL = 'goose285.github.io/chess-opening-trainer';
export const SITE_LINK = 'https://' + SITE_URL + '/';
export const TAGLINE = 'Your road to 1500';
export const FORMATS = { story: { w: 1080, h: 1920, label: 'Story' }, square: { w: 1080, h: 1080, label: 'Square' } };

/** Tactics fire streak: 5, 10, 15, 20 … (first-try solves in a row). */
export const isStreakMilestone = (n) => n >= 5 && n % 5 === 0;

const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

/**
 * A just-solved puzzle -> card spec, or null when it is not a milestone.
 * in: { streak, prevBest, flawless, trap, trapName, openingName, rating, fen (final position), lastMove: [from,to], orientation: 'white'|'black' }
 * Priority: a 5/10/15… streak, then a new personal best (beating a best of 3+), then a trap landed first try.
 */
export function puzzleMilestone(i) {
  if (!i || !i.flawless) return null;
  const board = { fen: i.fen, lastMove: i.lastMove || null, orientation: i.orientation || 'white' };
  const where = i.openingName ? clip(i.openingName, 34) : 'Opening tactics';
  if (isStreakMilestone(i.streak)) {
    return { kind: 'streak', ...board, eyebrow: 'TACTICS STREAK', big: String(i.streak), label: 'in a row', flame: i.streak >= 10 ? 2 : 1, title: where, sub: 'Every one first try, no hints',
      prompt: { icon: '🔥', title: `${i.streak} in a row!`, sub: 'Share your streak' }, share: { text: `${i.streak} tactics in a row, first try, on Pawnado.` } };
  }
  if (i.streak >= 4 && i.prevBest >= 3 && i.streak > i.prevBest) {
    return { kind: 'best', ...board, eyebrow: 'NEW PERSONAL BEST', big: String(i.streak), label: 'in a row', flame: 1, title: where, sub: `Old record: ${i.prevBest}`,
      prompt: { icon: '🏆', title: `New best streak: ${i.streak}`, sub: 'Share it' }, share: { text: `New best tactics streak on Pawnado: ${i.streak} in a row.` } };
  }
  if (i.trap) {
    const name = clip(i.trapName || 'Famous trap', 30);
    return { kind: 'trap', ...board, eyebrow: 'TRAP LANDED', big: name, label: 'first try', flame: 0, text: true, title: where, sub: 'Spotted the trap and sprang it',
      prompt: { icon: '🪤', title: 'Trap landed!', sub: name }, share: { text: `Landed ${name} on Pawnado.` } };
  }
  return null;
}

/**
 * A finished gambit / opening drill -> card spec when it was perfect (100%, no hints, no retries, whole line played).
 * in: { perfect, completed, gambit, openingName, variation, side: 'white'|'black', fen (final), lastMove }
 */
export function runMilestone(i) {
  if (!i || !i.perfect || !i.completed) return null;
  const line = i.variation && i.variation !== i.openingName ? clip(i.variation, 40) : '';
  return { kind: 'perfect', fen: i.fen, lastMove: i.lastMove || null, orientation: i.side === 'black' ? 'black' : 'white',
    eyebrow: i.gambit ? 'PERFECT GAMBIT' : 'PERFECT LINE', big: '100%', label: 'no hints, no retries', flame: 0, title: clip(i.openingName, 34), sub: line || `Played as ${i.side === 'black' ? 'Black' : 'White'}`,
    prompt: { icon: '💯', title: 'Perfect line!', sub: clip(i.openingName, 30) }, share: { text: `Perfect ${i.gambit ? 'gambit' : 'line'} on Pawnado: ${i.openingName}.` } };
}

/**
 * Profile stats -> card spec (no board). in: { levelName, levelN, rating, xp, pct, toNext, nextName, max, done, perfect, solved, bestStreak, dayStreak, stars, badges, badgeTotal }
 */
export function profileSpec(i) {
  const fmt = (n) => Number(n).toLocaleString('en-US');
  return { kind: 'profile', eyebrow: `LEVEL ${i.levelN}`, big: i.levelName, label: `playing like a ${i.rating}`, flame: 0, text: true,
    xp: i.xp, pct: Math.max(0, Math.min(100, i.pct || 0)), progress: i.max ? 'You made it to the 1500 Club' : `${fmt(i.toNext)} XP to ${i.nextName}`,
    stats: [
      { n: fmt(i.done), l: 'lines finished' }, { n: fmt(i.perfect), l: 'perfect lines' },
      { n: fmt(i.solved), l: 'puzzles solved' }, { n: fmt(i.bestStreak), l: 'best streak' },
      { n: fmt(i.dayStreak), l: 'day streak' }, { n: fmt(i.stars), l: 'mastery stars' },
    ],
    title: `${fmt(i.xp)} XP`, sub: `${i.badges} of ${i.badgeTotal} badges`,
    prompt: null, share: { text: `Level ${i.levelN} (${i.levelName}) on Pawnado. ${fmt(i.xp)} XP and climbing.` } };
}

export const fileName = (spec, fmt) => `pawnado-${spec.kind}-${fmt}.png`;

/** FEN piece placement -> 8x8 array (rank 8 first), each cell '' or a letter like 'P' / 'n'. */
export function parseFen(fen) {
  const rows = String(fen || '').split(' ')[0].split('/');
  if (rows.length !== 8) return null;
  const out = [];
  for (const r of rows) {
    const row = [];
    for (const ch of r) { if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) row.push(''); else row.push(ch); }
    if (row.length !== 8) return null;
    out.push(row);
  }
  return out;
}
/** 'P' -> 'wP', 'n' -> 'bN' (Merida file names) */
export const pieceFile = (ch) => (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
/** square name -> {f,r} 0..7 */
export const sqCoords = (sq) => ({ f: sq.charCodeAt(0) - 97, r: +sq[1] - 1 });
