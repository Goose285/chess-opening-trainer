// Unit tests (pure node) for the Tactics data (tactics/tactics.json), puzzle logic and its progression.
// Usage: node tools/test-tactics.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
import * as T from '../src/tactics-core.js';
import * as P from '../src/progress.js';
import { TRAPS as HAND } from './traps-src.mjs';
import { MINED } from './traps-mined.mjs';
const TRAPS = [...HAND, ...MINED];

let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const raw = fs.readFileSync('tactics/tactics.json', 'utf8');
const json = JSON.parse(raw);
const data = T.parseData(json);
const ids = new Set(OPENINGS.map((o) => o.id));
const all = Object.values(data).flat();

// ---------------------------------------------------------------- data
check('every opening has a tactics set (53 of 53)', OPENINGS.every((o) => (data[o.id] || []).length >= 1), OPENINGS.filter((o) => !(data[o.id] || []).length).map((o) => o.id).join(','));
check('no set for an unknown opening', Object.keys(data).every((k) => ids.has(k)));
check('database puzzles: gambits get 20-30 (up to 30 where Lichess has enough), the other openings exactly 20', OPENINGS.every((o) => { const n = data[o.id].filter((p) => !p.trap).length; return o.gambit ? n >= 20 && n <= 30 : n === 20; }), OPENINGS.map((o) => o.id + ':' + (data[o.id] || []).filter((p) => !p.trap).length).join(','));
check('every gambit has at least 3 hand-made / engine-verified traps (Danish and Fajarowicz at least 4)', OPENINGS.filter((o) => o.gambit).every((o) => data[o.id].filter((p) => p.trap).length >= ({ danish: 4, fajarowicz: 4 }[o.id] || 3)), OPENINGS.filter((o) => o.gambit).map((o) => o.id + ':' + data[o.id].filter((p) => p.trap).length).join(','));
check('database puzzles come from the opening phase: start position before move 21, and at least 80% before move 13', all.filter((p) => !p.trap).every((p) => +p.fen.split(' ')[5] <= 20) && all.filter((p) => !p.trap).filter((p) => +p.fen.split(' ')[5] <= 12).length >= 0.8 * all.filter((p) => !p.trap).length, String(all.filter((p) => !p.trap).filter((p) => +p.fen.split(' ')[5] <= 12).length));
check('puzzle ids are unique', new Set(all.map((p) => p.id)).size === all.length);
check('DB puzzles are rated 450-1700 (almost all under 1500), hand traps 400-1400', all.every((p) => (p.trap ? p.rating >= 400 && p.rating <= 1400 : p.rating >= 450 && p.rating <= 1700)));
let bad = [];
for (const p of all) {
  const g = new Chess(p.fen); let legal = p.moves.length >= 2 && p.moves.length % 2 === 0;
  try { for (const u of p.moves) g.move(T.splitUci(u)); } catch { legal = false; }
  if (!legal) bad.push(p.id);
  if (legal && p.themes.some((t) => /^mateIn\d$/.test(t)) && !g.isCheckmate()) bad.push(p.id + ':nomate');
}
check('every puzzle: setup + solution are legal, even length (you always move last), "mate in N" ends in mate', bad.length === 0, bad.slice(0, 5).join(','));
check('solver colour is the side NOT making the setup move, and 1-3 moves to find', all.every((p) => { const g = new Chess(p.fen); const c = T.solverColor(p); return (g.turn() === 'w' ? 'black' : 'white') === c && T.solverMoveCount(p) >= 1 && T.solverMoveCount(p) <= 3; }));
check('themes are the tactical kind (fork / pin / mate / hanging piece ...)', all.every((p) => T.themesOf(p).length >= 1), all.filter((p) => !T.themesOf(p).length).map((p) => p.id).slice(0, 5).join(','));
const themeCount = (k) => all.filter((p) => p.themes.includes(k)).length;
check('plenty of the beginner-friendly themes', themeCount('fork') >= 100 && themeCount('mateIn1') >= 100 && themeCount('hangingPiece') >= 100 && themeCount('trappedPiece') >= 30 && themeCount('pin') >= 10, `fork ${themeCount('fork')}, mateIn1 ${themeCount('mateIn1')}, hanging ${themeCount('hangingPiece')}, trapped ${themeCount('trappedPiece')}, pin ${themeCount('pin')}`);
// hand-made traps
const traps = all.filter((p) => p.trap);
check(`${TRAPS.length} traps (hand-made famous ones + Stockfish-verified mined ones) are in the data, each with a name and a note`, traps.length === TRAPS.length && traps.every((p) => p.name && p.note.length > 30));
const named = (re) => traps.some((p) => re.test(p.name));
check('the requested traps exist: Fried Liver fork, Légal, Stafford, Englund, Danish, Blackburne Shilling, Elephant, Lasker', [/Fried Liver/, /gal's mate/, /Stafford/, /Englund/, /Danish/, /Blackburne/, /Elephant/, /Lasker/].every(named), traps.map((p) => p.name).join(' | '));
check('Fried Liver fork: Nxf7 forks queen and rook', (() => { const p = data['fried-liver'].find((x) => x.id === 'T-fried-liver-fork'); const g = new Chess(p.fen); g.move(T.splitUci(p.moves[0])); const m = g.move(T.splitUci(p.moves[1])); return m.san === 'Nxf7'; })());
check("Légal's mate ends in checkmate with Nd5#", (() => { const p = data.italian.find((x) => x.id === 'T-legals-mate'); const g = new Chess(p.fen); let last; for (const u of p.moves) last = g.move(T.splitUci(u)); return g.isCheckmate() && last.san === 'Nd5#'; })());
check('Lasker trap contains the knight underpromotion', data.albin.find((p) => p.id === 'T-lasker-trap').moves.some((u) => u.endsWith('n')));
const size = Buffer.byteLength(raw), gz = zlib.gzipSync(raw).length;
check('tactics.json stays small (< 300 KB raw, < 100 KB gzip)', size < 300000 && gz < 100000, `${size} bytes raw, ${gz} gzip, ${all.length} puzzles`);

// ---------------------------------------------------------------- move checking + points
const fork = data['fried-liver'].find((p) => p.id === 'T-fried-liver-fork');
const gF = new Chess(fork.fen); gF.move(T.splitUci(fork.moves[0]));
check('the listed move is correct', T.judgeMove(fork, 1, gF.fen(), fork.moves[1]).ok === true);
check('a wrong move is rejected', T.judgeMove(fork, 1, gF.fen(), 'a2a3').ok === false && T.judgeMove(fork, 1, gF.fen(), 'zz99').ok === false);
const mateP = data.italian.find((p) => p.id === 'T-legals-mate'); const gM = new Chess(mateP.fen); gM.move(T.splitUci(mateP.moves[0])); gM.move(T.splitUci(mateP.moves[1])); gM.move(T.splitUci(mateP.moves[2]));
check('any other checkmating move is also accepted (the Lichess rule)', (() => { const alt = gM.moves({ verbose: true }).filter((m) => { const t = new Chess(gM.fen()); t.move(m); return t.isCheckmate(); }); return alt.length >= 1 && T.judgeMove(mateP, 3, gM.fen(), alt[0].from + alt[0].to).ok; })());
check('points: 100 first try, 25 after a wrong attempt, hint caps at 5, solution shown = 0', T.movePoints() === 100 && T.movePoints({ wrong: true }) === 25 && T.movePoints({ hint: true }) === 5 && T.movePoints({ hint: true, wrong: true }) === 5 && T.movePoints({ revealed: true }) === 0 && T.HINT_POINTS === 5);
check('max points = 100 per move you find', T.maxPoints(fork) === 300 && T.maxPoints(data.italian.find((p) => p.themes.includes('mateIn1') && !p.trap)) === 100);

// ---------------------------------------------------------------- queue
const mk = (id, r) => ({ id, rating: r });
const pool = [mk('a', 900), mk('b', 700), mk('c', 1100), mk('d', 800)];
check('queue: unsolved first, easiest first; solved ones go to the back', T.buildQueue(pool, ['b']).map((p) => p.id).join('') === 'dacb');
let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const q = T.buildQueue(all, [], { size: 10, random: true, rng });
check('mixed round: 10 puzzles, sorted by rating, from several openings', q.length === 10 && q.every((p, i) => i === 0 || p.rating >= q[i - 1].rating) && new Set(q.map((p) => p.openingId)).size >= 5);
check('mixed round prefers unsolved puzzles', (() => { const solved = all.slice(0, all.length - 5).map((p) => p.id); const r = T.buildQueue(all, solved, { size: 5, random: true, rng }); return r.every((p) => !solved.includes(p.id)); })());
check('theme filters', all.filter(T.themeFilter('trap').test).length === TRAPS.length && all.filter(T.themeFilter('fork').test).length >= 100 && T.themeFilter('nope').key === 'any');
check('theme names for the after-solve line', T.themesOf({ themes: ['mate', 'mateIn1', 'fork'] }).map((t) => t.label).join() === 'Mate in 1,Fork' && T.themesOf({ themes: ['mate'] })[0].label === 'Checkmate');

// ---------------------------------------------------------------- progression
const solve = (s, id, o = {}) => P.applyPuzzle(s, { openingId: o.open || 'italian', id, trap: !!o.trap, setSize: o.n || 20, kind: o.kind || 'solved', points: o.points ?? 100, max: o.max ?? 100, wrongs: o.wrongs || 0, hints: o.hints || 0 }, { easyIds: [], gambitIds: [] });
let s = P.freshState();
check('fresh state has an empty tactics block', s.tactics.solved === 0 && s.tactics.streak === 0 && Array.isArray(s.tactics.traps));
check('29 achievements (8 new tactics ones)', P.ACHIEVEMENTS.length === 29 && P.ACHIEVEMENTS.filter((a) => a.id.startsWith('tac-')).length === 8);
let r = solve(s, 'p1', { points: 300, max: 300 }); s = r.state;
check('first solve: points become XP; first puzzle badge pays out', r.result.gained.base === 300 && r.result.first && r.result.newAch.includes('tac-first') && s.xp === 300 + 40 && s.tactics.solved === 1, JSON.stringify(r.result.gained));
check('a first-try solve extends the streak', s.tactics.streak === 1 && r.result.flawless);
r = solve(s, 'p1', { points: 300, max: 300 }); const before = s.xp; s = r.state;
check('re-solving the same puzzle pays only 20% XP and does not count twice', r.result.gained.base === 60 && s.xp === before + 60 && s.tactics.solved === 1 && !r.result.first);
r = solve(s, 'p2', { points: 25, wrongs: 1 }); s = r.state;
check('a wrong attempt breaks the streak (but still solves it for 25 pts of XP)', s.tactics.streak === 0 && s.tactics.solved === 2 && r.result.gained.base === 25 && !r.result.flawless);
check('best streak is remembered', s.tactics.bestStreak === 2);
r = solve(s, 'p3', { points: 5, hints: 1 }); s = r.state;
check('a hinted solve (5 pts) is not flawless', s.tactics.streak === 0 && r.result.gained.base === 5 && s.tactics.flawless === 1);
const sx = s.xp; r = solve(s, 'p4', { kind: 'revealed', points: 0 }); 
check('showing the solution / skipping gives no XP and no progress', r.state.xp === sx && r.state.tactics.solved === s.tactics.solved && !r.result.counted);
s = solve(s, 'p5').state; s = solve(s, 'p6').state; r = solve(s, 'p6x'); 
check('streak after 3 clean solves in a row is 3', r.state.tactics.streak === 3);
r = solve(r.state, 'p7'); s = solve(r.state, 'p8').state;
check('"Sharp Shot" at 5 in a row', !!s.ach['tac-streak-5']);
r = solve(s, 'p4', { kind: 'skipped' }); check('skip resets the streak', r.state.tactics.streak === 0 && r.state.xp === s.xp);
// tiers
check('tier thresholds (set of 20): bronze 5, silver 12 + 6 first try, gold all 20 + 12 first try', (() => {
  const rec = (n, f) => ({ solved: Array.from({ length: n }, (_, i) => 'x' + i), flawless: Array.from({ length: f }, (_, i) => 'x' + i) });
  const t = (n, f) => P.tacticTierOf(rec(n, f), 20);
  return t(4, 4) === 'none' && t(5, 0) === 'bronze' && t(12, 5) === 'bronze' && t(12, 6) === 'silver' && t(19, 12) === 'silver' && t(20, 11) === 'silver' && t(20, 12) === 'gold';
})());
check('small sets still earn stars (set of 2: bronze 1, gold 2 solved + 2 first try)', (() => { const rec = (n, f) => ({ solved: Array.from({ length: n }, (_, i) => 'x' + i), flawless: Array.from({ length: f }, (_, i) => 'x' + i) }); return P.tacticTierOf(rec(1, 0), 2) === 'bronze' && P.tacticTierOf(rec(2, 1), 2) === 'silver' && P.tacticTierOf(rec(2, 2), 2) === 'gold' && P.tacticTierOf(rec(0, 0), 2) === 'none'; })());
s = P.freshState(); let stars = 0, xp0;
for (let i = 0; i < 5; i++) { r = solve(s, 'q' + i, { open: 'danish', n: 20 }); s = r.state; if (r.result.tierUp) stars++; }
check('5th solve in a set of 20 earns the bronze star: +50 XP, "Tactics Star" badge, tier saved', stars === 1 && s.tactics.sets.danish.tier === 'bronze' && s.tactics.stars === 1 && !!s.ach['tac-star'] && r.result.gained.star === 50);
check('opening mastery stars are separate from tactics stars', s.stars === 0 && Object.keys(s.openings).length === 0);
r = solve(P.freshState(), 'T-x', { open: 'traxler', n: 2, trap: true, points: 300, max: 300 });
check('famous-trap badge + a star for a tiny set in a single solve', !!r.state.ach['tac-trap'] && r.result.tierUp && r.result.tierUp.to === 'bronze' && r.state.tactics.traps.length === 1);
s = P.freshState(); for (let i = 0; i < 5; i++) s = solve(s, 'm' + i, { open: ['italian', 'ruy', 'scotch', 'london', 'caro'][i] }).state;
check('"Well Rounded" for puzzles from 5 openings', !!s.ach['tac-mixed']);
s = P.freshState(); for (let i = 0; i < 10; i++) s = solve(s, 'e' + i).state; check('"Eagle Eyes" at 10 solved', !!s.ach['tac-10'] && s.tactics.solved === 10);
check('tactics solves count as a training day', s.days.streak === 1 && s.days.last === P.dayKey());
check('level-ups are reported', (() => { let st = P.freshState(); st.xp = 390; const rr = solve(st, 'z1', { points: 100 }); return rr.result.levelUp && rr.result.levelUp.to.n === 2; })());
// storage
check('tactics progress survives a save / load round trip', (() => { const mem = {}; const store = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } }; P.saveState(store, s); const l = P.loadState(store); return JSON.stringify(l.tactics) === JSON.stringify(s.tactics) && l.xp === s.xp; })());
check('an older save without tactics still loads (nothing lost)', (() => { const old = { v: 1, xp: 500, done: 3, ach: { 'first-line': '2026-01-01' }, openings: { italian: { runs: 2, done: 2, clean: 1, perfect: 0, best: 80, vars: [], tier: 'bronze', last: '' } } }; const l = P.sanitize(old); return l.xp === 500 && l.openings.italian.tier === 'bronze' && l.tactics.solved === 0 && Array.isArray(l.tactics.traps); })());
check('junk tactics data is sanitised', (() => { const l = P.sanitize({ tactics: { solved: -5, streak: 'x', traps: [1, 'a', 'a'], sets: { x: { solved: 'no', flawless: [3, 'b'], tier: 'platinum' }, y: 5 } } }); return l.tactics.solved === 0 && l.tactics.streak === 0 && l.tactics.traps.length === 1 && l.tactics.sets.x.solved.length === 0 && l.tactics.sets.x.flawless.length === 1 && l.tactics.sets.x.tier === 'none' && !l.tactics.sets.y; })());
check('line drills still behave: applyRun unaffected by the tactics block', (() => { const rr = P.applyRun(P.freshState(), { openingId: 'italian', gambit: false, lineCount: 5, side: 'white', moves: 8, points: 800, pct: 100, hints: 0, retries: 0, perfect: true, maxStreak: 8, variation: 'x', completed: true }, {}); return rr.result.counted && rr.state.tactics.solved === 0 && rr.state.xp >= 800; })());

// ---- rating (ELO) range filter, fire streak tiers, session accuracy
{
  const rows = Object.values(JSON.parse(fs.readFileSync(new URL('../tactics/tactics.json', import.meta.url), 'utf8')).sets).flat().map((r) => T.parsePuzzle(r, 'x'));
  const keys = T.RATING_FILTERS.map((f) => f.key);
  check('rating chips: All, <900, 900-1100, 1100-1300, 1300+', keys.join() === 'all,u900,r900,r1100,r1300');
  const per = keys.slice(1).map((k) => rows.filter((p) => T.inRating(p, k)).length);
  check('the four ranges partition every puzzle exactly once (traps use their stored estimated rating)', per.reduce((a, b) => a + b, 0) === rows.length && rows.every((p) => keys.slice(1).filter((k) => T.inRating(p, k)).length === 1) && rows.every((p) => p.rating > 0), per.join('/'));
  check('"all" includes everything; unknown key falls back to all', rows.every((p) => T.inRating(p, 'all') && T.inRating(p, 'nonsense')));
  check('range edges: 899 -> <900, 900 -> 900-1100, 1100 -> 1100-1300, 1300 -> 1300+', T.inRating({ rating: 899 }, 'u900') && T.inRating({ rating: 900 }, 'r900') && !T.inRating({ rating: 900 }, 'u900') && T.inRating({ rating: 1100 }, 'r1100') && T.inRating({ rating: 1300 }, 'r1300') && !T.inRating({ rating: 1299 }, 'r1300'));
  check('every range holds at least 250 puzzles (no near-empty chips)', keys.slice(1).every((k) => rows.filter((p) => T.inRating(p, k)).length >= 250));
  check('traps all have a rating estimate inside the data range', rows.filter((p) => p.trap).every((p) => p.rating >= 500 && p.rating <= 1300));
  check('fire streak tiers: 0-2 cold, 3-4 flame, 5-9 big flame, 10+ inferno', [0, 2, 3, 4, 5, 9, 10, 40].map(T.streakTier).join() === '0,0,1,1,2,2,3,3');
  check('session accuracy: 0 attempts -> none, 5/6 -> 83%, 1/3 -> 33%, 4/4 -> 100%', T.accuracy(0, 0) === null && T.accuracy(5, 6) === 83 && T.accuracy(1, 3) === 33 && T.accuracy(4, 4) === 100);
  // the queue respects a rating-filtered pool (and an empty pool is just an empty queue)
  const pool = rows.filter((p) => T.inRating(p, 'r1100'));
  const q = T.buildQueue(pool, []);
  check('buildQueue on a filtered pool: only that range, easiest first', q.length === pool.length && q.every((p, i) => T.inRating(p, 'r1100') && (i === 0 || p.rating >= q[i - 1].rating)) && T.buildQueue([], []).length === 0);
}

console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
