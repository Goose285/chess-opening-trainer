// Generates src/gambits.js: gambit/attack opening lines.
// Each line starts from a verified base sequence (names/moves from the lichess-org/chess-openings
// ECO data, CC0) and is then extended for a few plies with Stockfish's top move, stopping early if the
// position gets lopsided. The output is plain data - rerun only when you want to change the spec.
//   node tools/gen-gambits.mjs   (needs: npm install; DEPTH env var optional)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const require = createRequire(import.meta.url);
const enginePath = require('stockfish').findEngine('lite-single');
const sf = spawn(process.execPath, [enginePath], { stdio: 'pipe' });
let buf = '', waiters = [];
sf.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiters.forEach((w) => w(l)); } });
const send = (c) => sf.stdin.write(c + '\n');
const DEPTH = +process.env.DEPTH || 16;
const CACHE_FILE = '/tmp/gambit-eval-cache.json'; // speeds up re-runs; safe to delete
const cache = new Map(existsSync(CACHE_FILE) ? Object.entries(JSON.parse(readFileSync(CACHE_FILE, 'utf8'))) : []);
const DEPTH_KEY = (process.env.DEPTH || '16');
function analyze(fen) {
  const k = DEPTH_KEY + '|' + fen.split(' ').slice(0, 4).join(' ');
  if (cache.has(k)) return Promise.resolve(cache.get(k));
  return new Promise((res) => {
    let last = null;
    const w = (l) => {
      const m = l.match(/score (cp|mate) (-?\d+)/);
      if (l.startsWith('info') && m && / pv /.test(l)) last = m[1] === 'cp' ? +m[2] : Math.sign(+m[2]) * (10000 - Math.abs(+m[2]));
      const b = l.match(/^bestmove (\S+)/);
      if (b) { waiters = waiters.filter((x) => x !== w); const r = { cp: last, best: b[1] }; cache.set(k, r); res(r); }
    };
    waiters.push(w); send('ucinewgame'); send('position fen ' + fen); send('go depth ' + DEPTH);
  });
}
send('uci'); send('isready');

const clean = (pgn) => pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);

// [opening id, line name, base moves, plies to extend]
const SPEC = {
  'fried-liver': [
    ['Fried Liver: 7.Qf3+ Ke6 8.Nc3 Ncb4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Ncb4', 8],
    ['Fried Liver: 8...Nd4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Nd4', 8],
    ['Fried Liver: 7...Kg6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Kg6 8. Bxd5', 8],
    ['Two Knights: 5...Na5, 10.Ne5 Bd6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Be2 h6 9. Nf3 e4 10. Ne5 Bd6 11. d4 exd3 12. Nxd3', 4],
    ['Two Knights: 5...Na5, 9.Nf3 e4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Be2 h6 9. Nf3 e4', 8],
    ['Fritz: 5...Nd4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nd4 6. c3 b5 7. Bf1', 8],
    ['Ulvestad: 5...b5', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 b5 6. Bf1', 8],
    ['Fried Liver: 7...Ke6 8.Nc3 Ncb4 9.Qe4 c6 10.a3 Na6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Ncb4 9. Qe4 c6 10. a3 Na6 11. d4', 6],
  ],
  'traxler': [
    ['King March: 7.Ke3', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5 5. Nxf7 Bxf2+ 6. Kxf2 Nxe4+ 7. Ke3', 10],
    ['Knight sacrifice: 7.Kg1', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5 5. Nxf7 Bxf2+ 6. Kxf2 Nxe4+ 7. Kg1', 10],
    ['Knight sacrifice: 6.Ke2', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5 5. Nxf7 Bxf2+ 6. Ke2', 10],
    ['Bishop sacrifice: 5.Bxf7+ Ke7', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5 5. Bxf7+ Ke7 6. Bb3', 10],
    ['Trencianske-Teplice: 6.d4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5 5. Bxf7+ Ke7 6. d4', 8],
  ],
  'kings-gambit': [
    ['Accepted: Kieseritzky', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ne5 Nf6 6. Bc4 d5 7. exd5 Bd6 8. d4 Nh5', 6],
    ['Accepted: Allgaier, Cook', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 h6 6. Nxf7 Kxf7 7. d4 d5 8. Bxf4 dxe4 9. Bc4+ Kg7', 4],
    ['Accepted: Muzio (Double)', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. e5 Qxe5 8. d3 Bh6', 6],
    ['Accepted: Cunningham, Bertin', '1. e4 e5 2. f4 exf4 3. Nf3 Be7 4. Bc4 Bh4+ 5. g3 fxg3 6. O-O gxh2+ 7. Kh1', 6],
    ['Accepted: Bishop\'s Gambit', '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 g5 5. Nc3 Bg7 6. d4 Ne7', 6],
    ['Accepted: Abbazia (3...d5)', '1. e4 e5 2. f4 exf4 3. Nf3 d5 4. exd5 Nf6 5. Bb5+ c6 6. dxc6 bxc6 7. Bc4', 6],
    ['Declined: Falkbeer Countergambit', '1. e4 e5 2. f4 d5 3. exd5 e4 4. d3 Nf6 5. dxe4 Nxe4 6. Nf3 Bc5 7. Qe2', 6],
    ['Declined: Classical 2...Bc5', '1. e4 e5 2. f4 Bc5 3. Nf3 d6 4. c3 Nf6 5. d4', 6],
  ],
  'evans': [
    ['Main: 7.Qb3 Qd7', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 d6 7. Qb3 Qd7', 6],
    ['Compromised Defence', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O dxc3 8. Qb3 Qf6 9. e5 Qg6', 6],
    ['Classical: 5...Bc5 6.d4 exd4 7.O-O d6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Bc5 6. d4 exd4 7. O-O d6 8. cxd4 Bb6 9. Nc3', 6],
    ['Slow 6.O-O', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. O-O d6 7. d4 Bg4', 6],
    ['Anderssen: 5...Be7', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Be7 6. d4 Na5', 6],
    ['Declined: 4...Bb6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bb6 5. a4 a6 6. Nc3', 6],
    ['Declined: 5.b5 Na5', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bb6 5. b5 Na5 6. Nxe5', 6],
  ],
  'danish': [
    ['Copenhagen Defence', '1. e4 e5 2. d4 exd4 3. c3 dxc3 4. Bc4 cxb2 5. Bxb2 Bb4+', 8],
    ['Classical Defence', '1. e4 e5 2. d4 exd4 3. c3 dxc3 4. Bc4 cxb2 5. Bxb2 Nf6', 8],
    ['Schlechter Defence', '1. e4 e5 2. d4 exd4 3. c3 dxc3 4. Bc4 cxb2 5. Bxb2 d5 6. Bxd5 Nf6 7. Nc3', 8],
    ['Chigorin Defence', '1. e4 e5 2. d4 exd4 3. c3 dxc3 4. Bc4 cxb2 5. Bxb2 Qe7', 8],
    ['Declined: 3...d5', '1. e4 e5 2. d4 exd4 3. c3 d5', 8],
    ['Declined: 3...Nf6', '1. e4 e5 2. d4 exd4 3. c3 Nf6', 8],
    ['Accepted: 4.Nxc3', '1. e4 e5 2. d4 exd4 3. c3 dxc3 4. Nxc3', 8],
  ],
  'scotch-gambit': [
    ['Max Lange Attack', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Bc4 Nf6 5. O-O Bc5 6. e5 d5 7. exf6 dxc4 8. Re1+ Be6 9. Ng5 Qd5', 6],
    ['Double Gambit: 5.e5 d5', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d4 exd4 5. e5 d5 6. Bb5 Ne4', 8],
    ['Canal: 5...Nxe4 6.Re1 d5', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Bc4 Nf6 5. O-O Nxe4 6. Re1 d5 7. Nc3', 6],
    ['Cochrane-Anderssen: 4...Bc5', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Bc4 Bc5 5. O-O d6 6. c3 Bg4', 6],
    ['Göring Gambit', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 dxc3 5. Nxc3', 8],
    ['Göring Gambit Declined', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 d5', 8],
    ['Advance: 5.e5', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Bc4 Nf6 5. e5 d5 6. Bb5 Ne4', 8],
  ],
  'smith-morra': [
    ['Larsen Defence', '1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 Nc6 5. Nf3 e6 6. Bc4 Qc7 7. Qe2 a6 8. O-O Bd6', 6],
    ['Chicago / Sozin Formation', '1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 Nc6 5. Bc4 e6 6. Nf3 d6 7. O-O a6 8. Qe2 b5 9. Bb3', 6],
    ['Classical Formation', '1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 Nc6 5. Nf3 d6 6. Bc4 a6 7. O-O Nf6', 6],
    ['Taimanov Formation', '1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 e6 5. Bc4 a6 6. Nf3 Ne7', 6],
    ['Fianchetto Defence', '1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 Nc6 5. Nf3 d6 6. Bc4 g6', 6],
    ['Pin Defence', '1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 Nc6 5. Nf3 e6 6. Bc4 Bb4', 6],
    ['Declined: 3...Nf6 4.e5 Nd5', '1. e4 c5 2. d4 cxd4 3. c3 Nf6 4. e5 Nd5', 8],
    ['Declined: 3...d5', '1. e4 c5 2. d4 cxd4 3. c3 d5 4. exd5 Qxd5 5. cxd4', 6],
  ],
  'budapest': [
    ['Rubinstein: 4.Bf4', '1. d4 Nf6 2. c4 e5 3. dxe5 Ng4 4. Bf4 Nc6 5. Nf3 Bb4+', 8],
    ['Adler: 4.Nf3', '1. d4 Nf6 2. c4 e5 3. dxe5 Ng4 4. Nf3 Nc6', 8],
    ['Alekhine: 4.e4 Nxe5', '1. d4 Nf6 2. c4 e5 3. dxe5 Ng4 4. e4 Nxe5 5. f4', 8],
    ['Alekhine: 4.e4 d6 (Tartakower)', '1. d4 Nf6 2. c4 e5 3. dxe5 Ng4 4. e4 d6', 8],
    ['Fajarowicz: 3...Ne4', '1. d4 Nf6 2. c4 e5 3. dxe5 Ne4 4. a3', 8],
    ['Fajarowicz: Steiner 4.Qc2', '1. d4 Nf6 2. c4 e5 3. dxe5 Ne4 4. Qc2', 8],
  ],
  'benko': [
    ['Accepted: King Walk', '1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6 5. bxa6 g6 6. Nc3 Bxa6 7. Nf3 d6 8. e4 Bxf1 9. Kxf1 Bg7 10. g3 O-O 11. Kg2', 4],
    ['Accepted: Fianchetto', '1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6 5. bxa6 g6 6. Nc3 Bxa6 7. g3 d6 8. Bg2 Bg7 9. Nf3', 6],
    ['Accepted: Yugoslav', '1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6 5. bxa6 g6 6. Nc3 Bxa6 7. e4 Bxf1 8. Kxf1 d6 9. Nge2', 6],
    ['Accepted: Nd2 Variation', '1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6 5. bxa6 Bxa6 6. Nc3 d6 7. Nf3 g6 8. Nd2', 6],
    ['Zaitsev / Nescafe Frappe', '1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6 5. Nc3 axb5 6. e4 b4 7. Nb5 d6 8. Bc4', 6],
    ['Declined: 4.Nf3', '1. d4 Nf6 2. c4 c5 3. d5 b5 4. Nf3', 8],
    ['Declined: 4.Bg5', '1. d4 Nf6 2. c4 c5 3. d5 b5 4. Bg5', 8],
  ],
  'albin': [
    ['Modern: 5.Nbd2', '1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. Nbd2', 8],
    ['Lasker Trap (7...fxg1=N+!)', '1. d4 d5 2. c4 e5 3. dxe5 d4 4. e3 Bb4+ 5. Bd2 dxe3 6. Bxb4 exf2+ 7. Ke2 fxg1=N+ 8. Rxg1 Bg4+', 4],
    ['Fianchetto: 5.g3 Be6', '1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. g3 Be6', 8],
    ['Fianchetto: 5.g3 Bg4', '1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. g3 Bg4', 8],
    ['Krenosz Variation', '1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. Nbd2 Bg4 6. h3 Bxf3 7. Nxf3 Bb4+ 8. Bd2 Qe7', 4],
    ['Tartakower Defence', '1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 c5', 8],
    ['Spassky: 4.e4', '1. d4 d5 2. c4 e5 3. dxe5 d4 4. e4', 8],
  ],
  'englund-black': [
    ['Trap: 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Bc3? Bb4!', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Bf4 Qb4+ 5. Bd2 Qxb2 6. Bc3', 6],
    ['Main Line: 4.Qd5 Qb4+', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Qd5 Qb4+', 8],
    ['Stockholm: 4.Qd5', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Qd5', 8],
    ['Felbecker: 3...Bc5', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Bc5', 8],
    ['Zilbermints: 3...Nge7', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Nge7', 8],
    ['Hartlaub-Charlick: 2...d6', '1. d4 e5 2. dxe5 d6', 8],
    ['Soller: 2...f6', '1. d4 e5 2. dxe5 f6', 8],
  ],
  'englund-white': [
    ['vs Main Line: 4.Qd5 Qb4+', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Qd5 Qb4+', 8],
    ['vs Main Line: 4.Qd5', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Qd5', 8],
    ['vs Felbecker: 3...Bc5', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Bc5', 8],
    ['vs Zilbermints: 3...Nge7', '1. d4 e5 2. dxe5 Nc6 3. Nf3 Nge7', 8],
    ['vs Hartlaub-Charlick: 2...d6', '1. d4 e5 2. dxe5 d6', 8],
    ['vs Soller: 2...f6', '1. d4 e5 2. dxe5 f6', 8],
    ['vs Mosquito: 2...Qh4', '1. d4 e5 2. dxe5 Qh4', 8],
  ],
  'stafford': [
    ['Main: 5.d3 Bc5', '1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6 4. Nxc6 dxc6 5. d3 Bc5', 10],
    ['5.Nc3 Bc5', '1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6 4. Nxc6 dxc6 5. Nc3 Bc5', 10],
    ['Trap: 5.d3 Bc5 6.Bg5?', '1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6 4. Nxc6 dxc6 5. d3 Bc5 6. Bg5', 8],
    ['5.d3 Bc5 6.Be3', '1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6 4. Nxc6 dxc6 5. d3 Bc5 6. Be3', 8],
  ],
  'vienna-gambit': [
    ['Main: 4.fxe5 Nxe4 5.Nf3 Be7 (Breyer)', '1. e4 e5 2. Nc3 Nf6 3. f4 d5 4. fxe5 Nxe4 5. Nf3 Be7', 8],
    ['Paulsen: 5.Qf3 f5', '1. e4 e5 2. Nc3 Nf6 3. f4 d5 4. fxe5 Nxe4 5. Qf3 f5', 6],
    ['Modern: 5.d3', '1. e4 e5 2. Nc3 Nf6 3. f4 d5 4. fxe5 Nxe4 5. d3', 8],
    ['Kaufmann: 5.Nf3 Bg4 6.Qe2', '1. e4 e5 2. Nc3 Nf6 3. f4 d5 4. fxe5 Nxe4 5. Nf3 Bg4 6. Qe2', 6],
    ['Hamppe-Muzio', '1. e4 e5 2. Nc3 Nc6 3. f4 exf4 4. Nf3 g5 5. Bc4 g4 6. O-O gxf3', 6],
    ['Hamppe-Allgaier', '1. e4 e5 2. Nc3 Nc6 3. f4 exf4 4. Nf3 g5 5. h4 g4 6. Ng5 d6', 6],
    ['Steinitz Gambit', '1. e4 e5 2. Nc3 Nc6 3. f4 exf4 4. d4 Qh4+ 5. Ke2 d5', 6],
  ],
  'qga': [
    ['Classical: Alekhine System', '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4 c5 6. O-O a6 7. Qe2 b5 8. Bb3 Bb7 9. Rd1 Nbd7 10. Nc3 Bd6', 4],
    ['Classical: Furman', '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4 c5 6. Qe2 a6 7. dxc5 Bxc5 8. O-O Nc6', 6],
    ['Normal: Traditional System', '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4 Be7 6. O-O O-O 7. Nc3', 6],
    ['Classical: 5...a6 Main Line', '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4 a6 6. Nc3 b5 7. Bb3 Bb7 8. O-O', 6],
    ['Mannheim: 4.Qa4+', '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. Qa4+ c6 5. Qxc4 e6 6. Qc2', 6],
    ['Bogoljubow: 3...Nf6 4.Nc3 a6', '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. Nc3 a6 5. e4', 6],
    ['Old Variation: 3.e3 e5', '1. d4 d5 2. c4 dxc4 3. e3 e5 4. Bxc4 exd4', 8],
  ],
  'latvian': [
    ['Greco: 3.Nxe5 Qf6 4.d4 d6 (Bilguer)', '1. e4 e5 2. Nf3 f5 3. Nxe5 Qf6 4. d4 d6 5. Nc4 fxe4', 8],
    ['Leonhardt: 4.Nc4 fxe4 5.Nc3', '1. e4 e5 2. Nf3 f5 3. Nxe5 Qf6 4. Nc4 fxe4 5. Nc3', 8],
    ['Foltys: 5.d3', '1. e4 e5 2. Nf3 f5 3. Nxe5 Qf6 4. Nc4 fxe4 5. d3', 8],
    ['Mayet Attack: 3.Bc4', '1. e4 e5 2. Nf3 f5 3. Bc4 fxe4 4. Nxe5 Qg5 5. d4 Qxg2', 6],
    ['Behting: 5.Nf7', '1. e4 e5 2. Nf3 f5 3. Bc4 fxe4 4. Nxe5 Qg5 5. Nf7 Qxg2 6. Rf1 d5 7. Nxh8 Nf6', 4],
    ['Corkscrew Gambit', '1. e4 e5 2. Nf3 f5 3. Nxe5 Nf6 4. Bc4 fxe4 5. Nf7 Qe7 6. Nxh8 d5', 6],
    ['Polerio-Svedenborg: 4...d5', '1. e4 e5 2. Nf3 f5 3. Bc4 fxe4 4. Nxe5 d5', 8],
  ],
  'blackmar-diemer': [
    ['Euwe Defence', '1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. f3 exf3 5. Nxf3 e6 6. Bg5 Be7 7. Bd3', 8],
    ['Teichmann Defence', '1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. f3 exf3 5. Nxf3 Bg4 6. h3 Bxf3 7. Qxf3 c6 8. Be3', 6],
    ['Bogoljubow: Kloss Attack', '1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. f3 exf3 5. Nxf3 g6 6. Bc4 Bg7 7. O-O O-O 8. Kh1', 6],
    ['Ziegler Defence', '1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. f3 exf3 5. Nxf3 c6', 8],
    ['Gunderam Defence', '1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. f3 exf3 5. Nxf3 Bf5 6. Ne5 e6 7. g4 Be4', 6],
    ['von Popiel: 4.Bg5', '1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. Bg5 Bf5 5. Bxf6 exf6 6. g4 Bg6 7. Qe2', 6],
    ['Declined: 4...e6', '1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. f3 e6', 8],
  ],
  'halloween': [
    ['Main: 5.d4 Ng6 6.e5 Ng8', '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Nxe5 Nxe5 5. d4 Ng6 6. e5 Ng8 7. Bc4 Bb4 8. Qf3 f5', 6],
    ['Plasma: 5...Nc6 6.d5', '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Nxe5 Nxe5 5. d4 Nc6 6. d5 Ne5', 8],
    ['Halloween Attack vs the Ruy Lopez (unsound)', '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. Nxe5', 8],
  ],
  'jerome': [
    ['Jerome Gambit: 4.Bxf7+ Kxf7', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Bxf7+ Kxf7 5. Nxe5+', 8],
    ['Jerome Gambit: 5.Nxe5+ Nxe5 6.d4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Bxf7+ Kxf7 5. Nxe5+ Nxe5 6. d4', 8],
    ['Jerome Gambit: 4...Kxf7 5.Nxe5+ Kf6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Bxf7+ Kxf7 5. Nxe5+ Kf6', 6],
  ],
  // ---------------------------------------------------------------- batch 2: more gambits for casual players
  'schliemann': [
    ['Classical: 7.Nxc6 Qg5', '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5 4. Nc3 fxe4 5. Nxe4 d5 6. Nxe5 dxe4 7. Nxc6 Qg5', 8],
    ['Tartakower: 5...Nf6', '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5 4. Nc3 fxe4 5. Nxe4 Nf6', 8],
    ['Kostić: 5...Be7', '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5 4. Nc3 fxe4 5. Nxe4 Be7', 8],
    ['Möhring: 7...Qd5', '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5 4. Nc3 fxe4 5. Nxe4 d5 6. Nxe5 dxe4 7. Nxc6 Qd5', 8],
    ['Jaenisch Gambit accepted: 4.exf5', '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5 4. exf5', 10],
    ['Schönemann Attack: 4.d4', '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5 4. d4', 8],
    ['Exchange: 4.Bxc6', '1. e4 e5 2. Nf3 Nc6 3. Bb5 f5 4. Bxc6', 8],
  ],
  'marshall': [
    ['Modern main line: 14.g3 Qh3', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 Nxd5 10. Nxe5 Nxe5 11. Rxe5 c6 12. d4 Bd6 13. Re1 Qh4 14. g3 Qh3', 6],
    ['Original: 11...Nf6', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 Nxd5 10. Nxe5 Nxe5 11. Rxe5 Nf6', 6],
    ['Re3 Variation', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 Nxd5 10. Nxe5 Nxe5 11. Rxe5 c6 12. Bxd5 cxd5 13. d4 Bd6 14. Re3', 6],
    ['Steiner: 9...e4', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 e4', 8],
    ['Quiet: 10.a4 Bb7', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 Nxd5 10. a4 Bb7', 8],
    ['Declined: 9.d4', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. d4', 8],
  ],
  'icelandic-palme': [
    ['Accepted: 4.dxe6 Bxe6', '1. e4 d5 2. exd5 Nf6 3. c4 e6 4. dxe6 Bxe6', 10],
    ['4.dxe6 Bxe6 5.d4', '1. e4 d5 2. exd5 Nf6 3. c4 e6 4. dxe6 Bxe6 5. d4', 8],
    ['4.dxe6 Bxe6 5.Nf3', '1. e4 d5 2. exd5 Nf6 3. c4 e6 4. dxe6 Bxe6 5. Nf3', 8],
    ['4.Nc3 exd5 5.cxd5 Bd6', '1. e4 d5 2. exd5 Nf6 3. c4 e6 4. Nc3 exd5 5. cxd5 Bd6', 8],
    ['4.Nf3 exd5 5.cxd5 Nxd5', '1. e4 d5 2. exd5 Nf6 3. c4 e6 4. Nf3 exd5 5. cxd5 Nxd5', 8],
    ['4.d3: quiet', '1. e4 d5 2. exd5 Nf6 3. c4 e6 4. d3', 8],
  ],
  'elephant': [
    ['Wasp: 3.Nxe5 dxe4 4.Bc4 Qg5', '1. e4 e5 2. Nf3 d5 3. Nxe5 dxe4 4. Bc4 Qg5', 8],
    ['Paulsen Countergambit: 3.exd5 e4', '1. e4 e5 2. Nf3 d5 3. exd5 e4 4. Qe2', 8],
    ['Maróczy Gambit: 3.exd5 Bd6', '1. e4 e5 2. Nf3 d5 3. exd5 Bd6', 8],
    ['3.exd5 e4 4.Ne5', '1. e4 e5 2. Nf3 d5 3. exd5 e4 4. Ne5 Qxd5', 8],
    ['3.d4 dxe4', '1. e4 e5 2. Nf3 d5 3. d4 dxe4 4. Nxe5', 8],
    ['3.Nxe5 Bd6', '1. e4 e5 2. Nf3 d5 3. Nxe5 Bd6 4. d4', 8],
  ],
  'von-hennig-schara': [
    ['Main: 7.Qxd5 Be6', '1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 cxd4 5. Qxd4 Nc6 6. Qd1 exd5 7. Qxd5 Be6', 8],
    ['6...exd5 7.Nf3', '1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 cxd4 5. Qxd4 Nc6 6. Qd1 exd5 7. Nf3', 8],
    ['5.Nb5 Nf6', '1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 cxd4 5. Nb5 Nf6', 8],
    ['5.Qxd4 Nc6 6.Qd1 exd5 7.e4', '1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 cxd4 5. Qxd4 Nc6 6. Qd1 exd5 7. e4', 8],
    ['5.Qxd4 Nc6 6.Qa4', '1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 cxd4 5. Qxd4 Nc6 6. Qa4', 8],
  ],
  'rousseau': [
    ['4.d3 fxe4 5.dxe4 Nf6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 f5 4. d3 fxe4 5. dxe4 Nf6', 8],
    ['4.exf5 e4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 f5 4. exf5 e4', 8],
    ['4.Nxe5 Nxe5 5.d4 Nxc4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 f5 4. Nxe5 Nxe5 5. d4 Nxc4', 0],
    ['4.d4 fxe4', '1. e4 e5 2. Nf3 Nc6 3. Bc4 f5 4. d4 fxe4 5. Ng5', 8],
    ['4.Nc3 fxe4 5.Nxe4 Nf6', '1. e4 e5 2. Nf3 Nc6 3. Bc4 f5 4. Nc3 fxe4 5. Nxe4 Nf6', 8],
  ],
  'fajarowicz': [
    ['Main: 4.a3 (Bonsdorf)', '1. d4 Nf6 2. c4 e5 3. dxe5 Ne4 4. a3', 8],
    ['Steiner: 4.Qc2', '1. d4 Nf6 2. c4 e5 3. dxe5 Ne4 4. Qc2', 8],
    ['4.Nf3 Bb4+', '1. d4 Nf6 2. c4 e5 3. dxe5 Ne4 4. Nf3 Bb4+', 8],
    ['4.Nd2', '1. d4 Nf6 2. c4 e5 3. dxe5 Ne4 4. Nd2', 8],
    ['4.Nf3 d6', '1. d4 Nf6 2. c4 e5 3. dxe5 Ne4 4. Nf3 d6 5. exd6 Bxd6', 8],
  ],
  'blumenfeld': [
    ['Accepted: 5.dxe6 fxe6 6.cxb5 d5', '1. d4 Nf6 2. c4 e6 3. Nf3 c5 4. d5 b5 5. dxe6 fxe6 6. cxb5 d5', 8],
    ['Duz-Khotimirsky: 5.Bg5', '1. d4 Nf6 2. c4 e6 3. Nf3 c5 4. d5 b5 5. Bg5 exd5', 8],
    ['Spielmann: 5.Bg5 exd5 6.cxd5 h6', '1. d4 Nf6 2. c4 e6 3. Nf3 c5 4. d5 b5 5. Bg5 exd5 6. cxd5 h6', 8],
    ['Declined: 5.e4', '1. d4 Nf6 2. c4 e6 3. Nf3 c5 4. d5 b5 5. e4', 8],
    ['Declined: 5.g3', '1. d4 Nf6 2. c4 e6 3. Nf3 c5 4. d5 b5 5. g3', 8],
  ],
  'wing-gambit': [
    ['Marienbad: 5.Bb2', '1. e4 c5 2. b4 cxb4 3. a3 d5 4. exd5 Qxd5 5. Bb2', 8],
    ['Nanu / Romanian: 5.Nf3 e5', '1. e4 c5 2. b4 cxb4 3. a3 d5 4. exd5 Qxd5 5. Nf3 e5 6. c4 Qe6 7. Bd3', 6],
    ['Carlsbad: 3...bxa3', '1. e4 c5 2. b4 cxb4 3. a3 bxa3', 8],
    ['Abrahams: 3.Bb2', '1. e4 c5 2. b4 cxb4 3. Bb2 e6', 8],
    ['Santasiere: 3.c4', '1. e4 c5 2. b4 cxb4 3. c4', 8],
    ['Declined: 2...Nf6', '1. e4 c5 2. b4 Nf6 3. e5 Nd5 4. Bb2', 8],
    ['Declined: 2...e6', '1. e4 c5 2. b4 e6 3. bxc5 Bxc5 4. Nf3', 8],
    ['Wing Gambit Deferred', '1. e4 c5 2. Nf3 e6 3. b4 cxb4 4. a3', 8],
  ],
  'goring-gambit': [
    ['Main: 5.Nxc3 Bb4', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 dxc3 5. Nxc3 Bb4', 8],
    ['Double pawn sacrifice: 5.Bc4', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 dxc3 5. Bc4 cxb2 6. Bxb2', 8],
    ['Bardeleben: 5.Bc4 Nf6', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 dxc3 5. Bc4 Nf6 6. Nxc3 Bb4', 8],
    ['Declined: 4...d5', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 d5 5. exd5 Qxd5 6. cxd4', 8],
    ['4...d3', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 d3 5. Bxd3', 8],
    ['5.Nxc3 d6', '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. c3 dxc3 5. Nxc3 d6 6. Bc4 Nf6 7. Qb3', 6],
  ],
  'staunton-gambit': [
    ['Main: 4.Bg5 e6', '1. d4 f5 2. e4 fxe4 3. Nc3 Nf6 4. Bg5 e6 5. Nxe4 Be7 6. Bxf6 Bxf6 7. Nf3', 8],
    ['Alekhine: 4...g6 5.h4', '1. d4 f5 2. e4 fxe4 3. Nc3 Nf6 4. Bg5 g6 5. h4', 8],
    ['Lasker: 4...g6 5.f3', '1. d4 f5 2. e4 fxe4 3. Nc3 Nf6 4. Bg5 g6 5. f3', 8],
    ['Chigorin: 4...c6', '1. d4 f5 2. e4 fxe4 3. Nc3 Nf6 4. Bg5 c6', 8],
    ['Nimzowitsch: 4...b6', '1. d4 f5 2. e4 fxe4 3. Nc3 Nf6 4. Bg5 b6', 8],
    ['Tartakower: 4.g4', '1. d4 f5 2. e4 fxe4 3. Nc3 Nf6 4. g4', 8],
    ['American Attack: 3.Nd2', '1. d4 f5 2. e4 fxe4 3. Nd2 Nf6', 8],
  ],
  'muzio-gambit': [
    ['Paulsen: 7.e5 Qxe5 8.d3 Bh6', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. e5 Qxe5 8. d3 Bh6', 6],
    ['Holloway: 6...Nc6', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Nc6', 8],
    ['From: 6...Qe7', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qe7', 8],
    ['Brentano: 5...d5', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O d5 6. exd5', 8],
    ['Bello: 7.Nc3', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. Nc3', 8],
    ['Young: 7.Bxf7+', '1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. Bxf7+ Kxf7 8. d4', 6],
  ],
  'belgrade-gambit': [
    ['Modern Defence: 6...f5', '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. d4 exd4 5. Nd5 Nxe4 6. Qe2 f5', 8],
    ['Declined: 5...Be7', '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. d4 exd4 5. Nd5 Be7 6. Nxe7 Qxe7 7. Nxd4', 8],
    ['5...Nxd5 6.exd5', '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. d4 exd4 5. Nd5 Nxd5 6. exd5 Qe7+', 8],
  ],
};

const out = {};
for (const [id, lines] of Object.entries(SPEC)) {
  out[id] = [];
  for (const [name, pgn, ext] of lines) {
    const g = new Chess();
    for (const san of clean(pgn)) { try { g.move(san); } catch { console.error(`ILLEGAL base in ${id} / ${name}: ${san}`); process.exit(1); } }
    let n = 0, stopped = '';
    while (n < ext && !g.isGameOver()) {
      const a = await analyze(g.fen());
      const sideCp = a.cp; // side to move POV
      if (Math.abs(sideCp) > 450) { stopped = ` (stopped: eval ${sideCp})`; break; }
      const mv = g.move({ from: a.best.slice(0, 2), to: a.best.slice(2, 4), promotion: a.best[4] });
      n++;
    }
    const moves = g.history();
    out[id].push({ name, moves: moves.join(' ') });
    const fin = await analyze(g.fen());
    const white = g.turn() === 'w' ? fin.cp : -fin.cp;
    console.log(`${id.padEnd(16)} ${name.padEnd(44)} plies=${moves.length} +${n}${stopped} eval(w)=${(white / 100).toFixed(2)}`);
  }
}
const META = {
  'fried-liver': { name: 'Fried Liver Attack', eco: 'C57', side: 'white', blurb: 'Two Knights 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7!? — a sacrificial attack on the Black king, plus Black\'s tries 5...Na5, Fritz and Ulvestad.' },
  'traxler': { name: 'Traxler Counterattack', eco: 'C57', side: 'black', blurb: 'Meet 4.Ng5 with 4...Bc5!? — wild mutual sacrifices after 5.Nxf7 or 5.Bxf7+.' },
  'kings-gambit': { name: "King's Gambit", eco: 'C30–C39', side: 'white', blurb: '2.f4! Accepted (Kieseritzky, Allgaier, Muzio, Cunningham, Bishop\'s) and declined (Falkbeer, Classical).' },
  'evans': { name: 'Evans Gambit', eco: 'C51–C52', side: 'white', blurb: '4.b4!? — a pawn for rapid development and a big centre. Accepted and declined lines.' },
  'danish': { name: 'Danish Gambit', eco: 'C21', side: 'white', blurb: 'Two pawns for a lead in development and bishops aimed at the king: 1.e4 e5 2.d4 exd4 3.c3.' },
  'scotch-gambit': { name: 'Scotch Gambit', eco: 'C44–C56', side: 'white', blurb: 'Max Lange Attack, Göring Gambit and the Italian-style Scotch Gambit: open play with development for a pawn.' },
  'smith-morra': { name: 'Smith-Morra Gambit', eco: 'B21', side: 'white', blurb: 'Meet the Sicilian with 2.d4 cxd4 3.c3!? — a pawn for fast development and open lines.' },
  'budapest': { name: 'Budapest Gambit', eco: 'A51–A52', side: 'black', blurb: 'Counter 1.d4 Nf6 2.c4 with 2...e5!? Rubinstein, Adler, Alekhine and the Fajarowicz 3...Ne4.' },
  'benko': { name: 'Benko Gambit', eco: 'A57–A59', side: 'black', blurb: 'Sacrifice a queenside pawn with ...b5 for long-term pressure on the a- and b-files.' },
  'albin': { name: 'Albin Countergambit', eco: 'D08–D09', side: 'black', blurb: 'Against the Queen\'s Gambit: 2...e5!? and a monster d4 pawn. Includes the Lasker Trap.' },
  'englund-black': { name: 'Englund Gambit (as Black)', eco: 'A40', side: 'black', blurb: '1.d4 e5?! — the cheeky gambit and its traps (4.Bf4? Qb4+!). Unsound, but full of pitfalls for White.' },
  'englund-white': { name: 'Englund Gambit — refuting it (White)', eco: 'A40', side: 'white', blurb: 'Take the pawn and know how to cash in: 2.dxe5 Nc6 3.Nf3 Qe7 4.Qd5!, and the other Englund tries.' },
  'stafford': { name: 'Stafford Gambit', eco: 'C42', side: 'black', blurb: 'Petrov-style 3...Nc6!? after 3.Nxe5: fast development, a few traps, lots of fun.' },
  'vienna-gambit': { name: 'Vienna Gambit', eco: 'C25–C29', side: 'white', blurb: '2.Nc3 and 3.f4: Breyer, Paulsen, Modern and Kaufmann lines, plus Hamppe-Muzio, Allgaier and Steinitz gambits.' },
  'qga': { name: "Queen's Gambit Accepted", eco: 'D20–D29', side: 'white', blurb: '1.d4 d5 2.c4 dxc4 — Black takes the pawn; you reclaim it and aim for a healthy centre. Classical, Mannheim and Old variations.' },
  'latvian': { name: 'Latvian Gambit', eco: 'C40', side: 'black', blurb: '2...f5!? against 2.Nf3 — sharp and risky. Greco, Leonhardt, Mayet, Behting and Corkscrew lines.' },
  'blackmar-diemer': { name: 'Blackmar-Diemer Gambit', eco: 'D00', side: 'white', blurb: '1.d4 d5 2.e4!? dxe4 3.Nc3 Nf6 4.f3 — pawn for rapid development and an attack on the kingside.' },
  'halloween': { name: 'Halloween Gambit', eco: 'C47', side: 'white', blurb: 'Four Knights 4.Nxe5!? — a wild, unsound piece sacrifice. Just for fun (and for Black to punish).' },
  'jerome': { name: 'Jerome Gambit', eco: 'C50', side: 'white', blurb: 'Italian 4.Bxf7+?! — two pieces for a king walk. Spectacular, unsound, great practice for the defender.' },
  'schliemann': { name: 'Schliemann (Jaenisch) Gambit', eco: 'C63', side: 'black', blurb: 'Answer the Ruy Lopez with 3...f5!? — a fighting counter-gambit with tricks if White grabs on e5.' },
  'marshall': { name: 'Marshall Attack', eco: 'C89', side: 'black', blurb: 'Ruy Lopez Closed: sacrifice a pawn with 8...d5! for a fierce kingside attack. A famous weapon, easy to learn the first moves.' },
  'icelandic-palme': { name: 'Icelandic-Palme Gambit', eco: 'B01', side: 'black', blurb: 'Against the Scandinavian-style 2.exd5 Nf6 3.c4: the cheeky 3...e6!? with quick development for a pawn.' },
  'elephant': { name: 'Elephant Gambit', eco: 'C40', side: 'black', blurb: '2...d5!? against 2.Nf3: a surprising counter-gambit with traps like the Wasp line (3.Nxe5 dxe4 4.Bc4 Qg5).' },
  'von-hennig-schara': { name: 'Von Hennig-Schara Gambit', eco: 'D32', side: 'black', blurb: 'Queen\'s Gambit Declined: 3...c5 4.cxd5 cxd4! — a pawn for quick development and a lead in the centre.' },
  'rousseau': { name: 'Rousseau Gambit', eco: 'C50', side: 'black', blurb: 'Meet the Italian 3.Bc4 with 3...f5!? — a wild counter-gambit with plenty of traps for White.' },
  'fajarowicz': { name: 'Fajarowicz Gambit', eco: 'A51', side: 'black', blurb: 'The cheeky sister of the Budapest: 1.d4 Nf6 2.c4 e5 3.dxe5 Ne4!? with sudden queen-and-knight tricks.' },
  'blumenfeld': { name: 'Blumenfeld Countergambit', eco: 'E10', side: 'black', blurb: 'Against 1.d4 Nf6 2.c4 e6 3.Nf3: 3...c5 4.d5 b5!? — sacrifice a pawn to grab the centre and open files.' },
  'wing-gambit': { name: 'Wing Gambit (vs the Sicilian)', eco: 'B20', side: 'white', blurb: '1.e4 c5 2.b4!? — give a wing pawn to deflect the c-pawn and take the centre. Marshall, Carlsbad, Santasiere and Deferred lines.' },
  'goring-gambit': { name: 'Göring Gambit', eco: 'C44', side: 'white', blurb: 'Scotch Game 4.c3!? — a pawn (or two) for open lines and rapid development. Main line, Bardeleben and the double pawn sacrifice.' },
  'staunton-gambit': { name: 'Staunton Gambit (vs the Dutch)', eco: 'A82–A83', side: 'white', blurb: 'Hit the Dutch with 2.e4!? fxe4 3.Nc3 Nf6 4.Bg5 — a pawn for fast development and an attack.' },
  'muzio-gambit': { name: 'Muzio Gambit', eco: 'C37', side: 'white', blurb: 'King\'s Gambit: sacrifice a whole knight (5.O-O!?) for a raging attack. Paulsen, Holloway, From, Brentano and Young lines.' },
  'belgrade-gambit': { name: 'Belgrade Gambit', eco: 'C47', side: 'white', blurb: 'Four Knights Scotch 5.Nd5!? — give a pawn for rapid play against the black knights and e-file.' },
};
const lines = (id) => out[id].map((l) => `      { name: ${JSON.stringify(l.name)}, moves: ${JSON.stringify(l.moves)} },`).join('\n');
const body = Object.entries(META).map(([id, m]) => `  {
    id: ${JSON.stringify(id)}, name: ${JSON.stringify(m.name)}, eco: ${JSON.stringify(m.eco)}, side: ${JSON.stringify(m.side)}, gambit: true,
    blurb: ${JSON.stringify(m.blurb)},
    lines: [
${lines(id)}
    ],
  },`).join('\n');
writeFileSync(new URL('../src/gambits.js', import.meta.url), `// GENERATED by tools/gen-gambits.mjs — gambit & attack openings (book lines are plain SAN data; edit freely).
// Gambit lines are *book first*: a move in the book is always graded "Book", never by the engine, even if it
// gives up material. Only moves outside the book are graded by Stockfish.
export const GAMBITS = [
${body}
];
`);
writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)));
sf.kill(); process.exit(0);
