// Builds tactics/tactics.json from the Lichess puzzle picks (tools/extract-puzzles.py) + hand-made traps.
//   node tools/build-tactics.mjs [/workspace/lichess/picked.json]      (ENGINE=1 also engine-checks the traps)
// Puzzle data: Lichess open database, CC0 — https://database.lichess.org/#puzzles
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
import { TRAPS as HAND } from './traps-src.mjs';
import { MINED } from './traps-mined.mjs';
const TRAPS = [...HAND, ...MINED];

const PICKED = process.argv[2] || '/workspace/lichess/picked.json';
const ID_MAP = { wing: 'wing-gambit', goring: 'goring-gambit', belgrade: 'belgrade-gambit', vienna: 'vienna-gambit' };
const KEEP = new Set(['mate', 'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'hangingPiece', 'trappedPiece', 'discoveredAttack', 'sacrifice',
  'deflection', 'attraction', 'clearance', 'backRankMate', 'smotheredMate', 'doubleCheck', 'attackingF2F7', 'kingsideAttack', 'intermezzo', 'xRayAttack',
  'interference', 'bodenMate', 'anastasiaMate', 'capturingDefender', 'promotion', 'exposedKing', 'defensiveMove']);
const ids = new Set(OPENINGS.map((o) => o.id));
const uci = (m) => m.from + m.to + (m.promotion || '');
const play = (g, u) => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

const picked = JSON.parse(fs.readFileSync(PICKED, 'utf8'));
const sets = {}; let dropped = 0;
for (const [rawId, list] of Object.entries(picked.sets)) {
  const id = ID_MAP[rawId] || rawId;
  if (!ids.has(id)) throw new Error('unknown opening id ' + id);
  sets[id] = [];
  for (const [pid, fen, moves, rating, themes] of list) {
    const g = new Chess(fen); const us = moves.split(' '); let ok = us.length >= 2 && us.length % 2 === 0;
    try { for (const u of us) play(g, u); } catch { ok = false; }
    const th = themes.split(' ').filter((t) => KEEP.has(t));
    if (ok && /mateIn\d/.test(themes) && !g.isCheckmate()) ok = false; // a "mate in N" puzzle must end in mate
    if (!ok) { dropped++; continue; }
    sets[id].push([pid, fen, moves, rating, th.join(' ')]);
  }
}

// hand-made traps
const engineFlag = process.env.ENGINE === '1';
let eng = null; if (engineFlag) { const { startEngine } = await import('./lib-engine.mjs'); eng = startEngine(); }
let trapCount = 0;
for (const t of TRAPS) {
  if (!ids.has(t.open)) throw new Error('trap for unknown opening ' + t.open);
  const sans = t.line.split(' '); const g = new Chess(); const ucis = [];
  for (let i = 0; i < sans.length; i++) {
    if (i === t.setup) var fen = g.fen();
    const m = g.move(sans[i]); if (i >= t.setup) ucis.push(uci(m));
    if (engineFlag && i > t.setup) {
      const solver = (i - t.setup) % 2 === 1; // solver replies are at odd offsets after the setup move
      const before = new Chess(); sans.slice(0, i).forEach((s) => before.move(s));
      const b = await eng.analyze(before.fen(), 14), a = await eng.analyze(g.fen(), 14);
      const loss = b.cp + a.cp; const lim = solver ? 60 : 200;
      if (loss > lim) console.warn(`  ! ${t.id} ply ${i} ${sans[i]} loses ${loss}cp (limit ${lim})`);
    }
  }
  if (/mateIn\d/.test(t.themes) && !g.isCheckmate()) throw new Error(t.id + ' should end in mate');
  if (ucis.length % 2 !== 0) throw new Error(t.id + ': the line must end on your move (setup + an odd number of plies after it)');
  const solverMoves = Math.ceil((ucis.length - 1) / 2);
  if (!solverMoves) throw new Error(t.id + ' has no solver move');
  (sets[t.open] ||= []).unshift([t.id, fen, ucis.join(' '), t.rating, t.themes, t.name, t.note]);
  trapCount++;
}
eng?.quit();

const out = { v: 1, src: 'Lichess open database (CC0) https://database.lichess.org/#puzzles + hand-made traps', sets };
fs.mkdirSync('tactics', { recursive: true });
const json = JSON.stringify(out);
fs.writeFileSync('tactics/tactics.json', json);
const total = Object.values(sets).reduce((n, a) => n + a.length, 0);
console.log(`openings with puzzles: ${Object.keys(sets).length}, puzzles: ${total} (hand traps ${trapCount}, dropped ${dropped})`);
console.log(`tactics.json: ${json.length} bytes raw, ${zlib.gzipSync(json).length} gzip`);
for (const o of OPENINGS) console.log(o.id.padEnd(20), sets[o.id]?.length || 0);
