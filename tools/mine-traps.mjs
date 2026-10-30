// Mines "does it look fine, but loses" opponent moves along an opening's book lines, with Stockfish.
//   node tools/mine-traps.mjs <opening-id> [maxPly=16]  > /workspace/lichess/traps-<id>.json
// A candidate: the opponent (side that is NOT the solver) plays a move that a shallow search (depth 4) thinks is fine
// (solver score <= +120) but a deeper search (depth 14) refutes (solver >= +350 or forced mate), and the refutation is unique.
// The refutation line (engine PV) is cut to end on the solver's move. A human then curates the output into tools/traps-src.mjs.
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
import { startEngine } from './lib-engine.mjs';
const id = process.argv[2], maxPly = +(process.argv[3] || 16);
const o = OPENINGS.find((x) => x.id === id); if (!o) throw new Error('unknown opening ' + id);
const solver = o.side === 'white' ? 'w' : 'b';
const eng = startEngine();
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const seen = new Set(), out = [];
const play = (g, u) => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
const val = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const mat = (g, c) => g.board().flat().filter(Boolean).reduce((n, p) => n + (p.color === c ? (val[p.type] || 0) : 0), 0);
const RELAX = process.env.RELAX === '1'; // wider net for openings where the strict pass found too few
const DEPTH = +(process.argv[4] || 1); // extra engine-guided levels beyond the book line
async function testNode(g, prefix) { // opponent to move: look for moves that look fine but lose
  for (const m of g.moves({ verbose: true })) {
    const h = replay(g); h.move(m);
    if (h.isGameOver()) continue;
    const d4 = await eng.analyze(h.fen(), 4); // solver to move
    if (d4.cp > (RELAX ? 260 : 200)) continue;
    const d12 = await eng.analyze(h.fen(), 12, 2);
    const a = d12.lines[1], b = d12.lines[2];
    if (a.cp < (RELAX ? 300 : 350)) continue;
    if (b && b.cp > a.cp - (RELAX ? 110 : 150) && a.cp < 9000) continue; // not unique
    const base = await eng.analyze(g.fen(), 12);
    if (-base.cp > 150) continue; // solver was already much better: just a bad position
    const full = (await eng.analyze(h.fen(), 14)).pv; let pv = full.slice(0, 5); if (pv.length % 2 === 0) pv.pop();
    const h2 = new Chess(h.fen()); const sansPv = []; let ok = true;
    for (const u of pv) { try { sansPv.push(play(h2, u).san); } catch { ok = false; break; } }
    if (!ok || !sansPv.length) continue;
    const gain = (mat(h2, solver) - mat(h2, solver === 'w' ? 'b' : 'w')) - (mat(h, solver) - mat(h, solver === 'w' ? 'b' : 'w'));
    out.push({ open: id, prefix: prefix.join(' '), oppMove: m.san, d4: d4.cp, d12: a.cp, second: b ? b.cp : null, base: -base.cp, pv: sansPv.join(' '), mate: h2.isCheckmate(), gain });
  }
}
async function explore(g, lvl) {
  if (seen.has(key(g.fen()))) return; seen.add(key(g.fen()));
  const prefix = g.history();
  await testNode(g, prefix);
  if (lvl <= 0) return;
  const r = await eng.analyze(g.fen(), 10, 4); // opponent to move: sensible moves only
  const best = r.lines[1].cp;
  for (const k of Object.keys(r.lines)) {
    const L = r.lines[k]; if (L.cp < best - 80) continue;
    const h = replay(g); try { play(h, L.pv[0]); } catch { continue; }
    if (h.isGameOver()) continue;
    const reply = (await eng.analyze(h.fen(), 10)).best; // solver's best answer
    try { play(h, reply); } catch { continue; }
    if (h.isGameOver()) continue;
    await explore(h, lvl - 1);
  }
}
for (const line of o.lines) {
  const sans = line.moves.split(' '); const g = new Chess();
  for (let i = 0; i < Math.min(sans.length, maxPly); i++) {
    if (g.turn() !== solver) await explore(replay(g), DEPTH);
    try { g.move(sans[i]); } catch { break; }
  }
}
function replay(g) { const c = new Chess(); g.history().forEach((s) => c.move(s)); return c; }
eng.quit();
out.sort((x, y) => (y.mate - x.mate) || (y.d12 - x.d12));
console.log(JSON.stringify(out));
