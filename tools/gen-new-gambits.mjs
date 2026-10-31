// Phase 3: five new gambits (src/gambits-new.js). Each opening has hand-picked stem lines (checked for legality with chess.js) plus
// "branch" lines: at a chosen position the opponent's top engine replies (Stockfish MultiPV) each start a line, extended with engine
// moves. Names come from the CC0 lichess-org/chess-openings data where a prefix matches. Plain data afterwards: edit freely.
//   node tools/gen-new-gambits.mjs
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { startEngine } from './lib-engine.mjs';

const eng = startEngine();
const clean = (pgn) => pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
const eco = ['a', 'b', 'c', 'd', 'e'].flatMap((f) => fs.readFileSync(`/workspace/lichess/eco/${f}.tsv`, 'utf8').trim().split('\n').slice(1).map((l) => { const [code, name, pgn] = l.split('\t'); return { code, name, moves: clean(pgn) }; }));
const ecoName = (moves) => { const hit = eco.filter((e) => e.moves.length <= moves.length && e.moves.every((m, i) => m === moves[i])).sort((a, b) => b.moves.length - a.moves.length)[0]; return hit ? hit.name.replace(/^[^:]*:\s*/, '') : null; };
const play = (g, uci) => g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

const GAMBITS = {
  'urusov-gambit': {
    name: 'Urusov Gambit', eco: 'C24', side: 'white',
    blurb: 'Bishop\'s Opening: 1.e4 e5 2.Bc4 Nf6 3.d4 exd4 4.Nf3 — give a pawn for a big lead in development against a king still in the centre.',
    stem: 'e4 e5 Bc4 Nf6 d4 exd4 Nf3',
    lines: [
      ['Main line: 4...Nc6 5.O-O Nxe4 6.Re1 d5 7.Bxd5 Qxd5 8.Nc3', '1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3 Nc6 5. O-O Nxe4 6. Re1 d5 7. Bxd5 Qxd5 8. Nc3', 8],
      ['4...Bc5: 5.e5 d5 6.Bb5+ Nc6 7.Nxd4', '1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3 Bc5 5. e5 d5 6. Bb5+ Nc6 7. Nxd4', 8],
      ['4...Nxe4: 5.Qxd4 Nf6', '1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3 Nxe4 5. Qxd4 Nf6', 8],
      ['4...Bb4+: 5.c3 dxc3 6.Nxc3', '1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3 Bb4+ 5. c3 dxc3 6. Nxc3', 8],
      ['3...Nxe4: 4.dxe5 d5 5.Bd3 Nc5', '1. e4 e5 2. Bc4 Nf6 3. d4 Nxe4 4. dxe5 d5 5. Bd3 Nc5', 8],
    ],
    branch: [{ at: 'e4 e5 Bc4 Nf6 d4 exd4 Nf3', n: 3, ext: 10 }, { at: 'e4 e5 Bc4 Nf6 d4', n: 3, ext: 10 }],
  },
  'tennison-gambit': {
    name: 'Tennison Gambit', eco: 'A06', side: 'white',
    blurb: '1.e4 d5 2.Nf3!? dxe4 3.Ng5 — a pawn for quick development and a target on f7, with the sneaky Brigg\'s Trap for Black.',
    stem: 'e4 d5 Nf3',
    lines: [
      ['Main line: 3.Ng5 Nf6 4.Nc3 Bf5', '1. e4 d5 2. Nf3 dxe4 3. Ng5 Nf6 4. Nc3 Bf5 5. g4 Bg6 6. Bg2', 8],
      ['Brigg\'s Trap: 5.Qe2 Qd4', '1. e4 d5 2. Nf3 dxe4 3. Ng5 Nf6 4. Nc3 Bf5 5. Qe2 Qd4', 6, true],
      ['2...Nc6: 3.exd5 Qxd5 4.Nc3', '1. e4 d5 2. Nf3 Nc6 3. exd5 Qxd5 4. Nc3', 10],
    ],
    branch: [{ at: 'e4 d5 Nf3 dxe4 Ng5', n: 3, ext: 10 }, { at: 'e4 d5 Nf3', n: 3, ext: 10 }],
  },
  'rasa-studier': {
    name: 'Rasa-Studier Gambit', eco: 'B10', side: 'white',
    blurb: 'Caro-Kann 3.Nc3 dxe4 4.f3!? — the pawn on f3 hits e4 like a Blackmar-Diemer, with quick development and a lead on the e-file.',
    stem: 'e4 c6 d4 d5 Nc3 dxe4 f3',
    lines: [
      ['4...exf3 5.Nxf3 Bg4 6.Bc4 e6 7.O-O', '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. f3 exf3 5. Nxf3 Bg4 6. Bc4 e6 7. O-O', 8],
      ['4...exf3 5.Nxf3 Nf6 6.Bc4 e6 7.O-O', '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. f3 exf3 5. Nxf3 Nf6 6. Bc4 e6 7. O-O', 8],
      ['4...e5: 5.dxe5 exf3 6.Nxf3 Qxd1+', '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. f3 e5 5. dxe5 exf3 6. Nxf3 Qxd1+ 7. Kxd1', 8],
      ['4...Nd7: 5.fxe4 e5 6.Nf3', '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. f3 Nd7 5. fxe4 e5 6. Nf3', 8],
    ],
    branch: [{ at: 'e4 c6 d4 d5 Nc3 dxe4 f3', n: 4, ext: 10 }],
  },
  'blackburne-shilling': {
    name: 'Blackburne Shilling Gambit', eco: 'C50', side: 'black',
    blurb: 'Italian 3.Bc4 Nd4!? — a trap-laden surprise: if White grabs 4.Nxe5? Qg5! Black wins with Qxg2 and a knight mate on f3.',
    stem: 'e4 e5 Nf3 Nc6 Bc4 Nd4',
    lines: [
      ['Shilling trap: 4.Nxe5? Qg5 5.Nxf7 Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3#', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#', 0, true],
      ['4.Nxe5 Qg5: the critical test', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5', 8],
      ['4.Nxd4 exd4 5.O-O', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxd4 exd4 5. O-O', 8],
      ['4.Nxd4 exd4 5.d3', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxd4 exd4 5. d3', 8],
      ['4.c3: Nxf3+ 5.Qxf3', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. c3 Nxf3+ 5. Qxf3', 8],
    ],
    branch: [{ at: 'e4 e5 Nf3 Nc6 Bc4 Nd4', n: 3, ext: 10 }],
  },
  'froms-gambit': {
    name: "From's Gambit", eco: 'A02', side: 'black',
    blurb: "Against 1.f4: 1...e5!? 2.fxe5 d6 3.exd6 Bxd6 — open lines and quick development for a pawn, with a fast attack down the g- and h-files.",
    stem: 'f4 e5 fxe5 d6 exd6 Bxd6',
    lines: [
      ['Lasker: 4.Nf3 g5 5.g3 g4 6.Nh4 Ne7', '1. f4 e5 2. fxe5 d6 3. exd6 Bxd6 4. Nf3 g5 5. g3 g4 6. Nh4 Ne7 7. d4 Ng6', 8],
      ['Lasker: 5.d4 g4 6.Ne5 Bxe5', '1. f4 e5 2. fxe5 d6 3. exd6 Bxd6 4. Nf3 g5 5. d4 g4 6. Ne5 Bxe5 7. dxe5 Qxd1+ 8. Kxd1', 8],
      ['Lipke: 4.Nf3 Nh6 5.d4', '1. f4 e5 2. fxe5 d6 3. exd6 Bxd6 4. Nf3 Nh6 5. d4', 8],
      ['Langheld: 3.exd6 Nf6', '1. f4 e5 2. fxe5 d6 3. exd6 Nf6 4. Nf3 Bxd6', 8],
      ['Declined: 2.Nf3 e4', '1. f4 e5 2. Nf3 e4 3. Ne5 d6 4. Nc4 d5 5. Ne3', 8],
    ],
    branch: [{ at: 'f4 e5 fxe5 d6 exd6 Bxd6', n: 3, ext: 10 }],
  },
};

const out = {}; const report = [];
for (const [id, G] of Object.entries(GAMBITS)) {
  const lines = []; const seen = new Set();
  const add = async (name, moves, ext, trap) => {
    const g = new Chess(); try { moves.forEach((s) => g.move(s)); } catch (e) { console.error(`ILLEGAL in ${id} / ${name}: ${e.message}`); return; }
    let m = [...moves];
    for (let i = 0; i < ext && !g.isGameOver(); i++) {
      const r = await eng.analyze(g.fen(), 14); if (Math.abs(r.cp) > 450) break;
      m.push(play(g, r.best).san);
    }
    if (m.length % 2 === 1 && !g.isGameOver()) { const r = await eng.analyze(g.fen(), 14); m.push(play(g, r.best).san); } // end on the second player's move
    const key = m.join(' '); if (seen.has(key)) return; seen.add(key);
    const fin = await eng.analyze(g.fen(), 14);
    const povWhite = g.isGameOver() ? NaN : g.turn() === 'w' ? fin.cp : -fin.cp;
    lines.push(trap ? { name, moves: key, trap: true } : { name, moves: key });
    report.push(`${id.padEnd(20)} ${String(m.length).padStart(2)} plies  eval(white) ${(povWhite / 100).toFixed(1).padStart(5)}  ${name}`);
  };
  for (const [name, pgn, ext, trap] of G.lines) await add(name, clean(pgn), ext, trap);
  for (const b of G.branch) {
    const base = clean(b.at); const g = new Chess(); base.forEach((s) => g.move(s));
    const r = await eng.analyze(g.fen(), 14, b.n + 2); const known = new Set(lines.map((l) => l.moves.split(' ').slice(0, base.length + 1).join(' ')));
    let k = 0;
    for (const key of Object.keys(r.lines)) {
      if (k >= b.n) break; const L = r.lines[key]; const h = new Chess(g.fen()); const mv = play(h, L.pv[0]);
      const moves = [...base, mv.san]; if (known.has(moves.join(' '))) continue; known.add(moves.join(' ')); k++;
      const label = `${Math.floor(base.length / 2) + 1}${base.length % 2 ? '...' : '.'}${mv.san}`;
      const nm = ecoName(moves); await add(`Reply ${label}${nm && /Defen[cs]e|Variation|Attack|Countergambit/.test(nm) ? ' – ' + nm : ''}`, moves, b.ext);
    }
  }
  out[id] = { id, name: G.name, eco: G.eco, side: G.side, gambit: true, blurb: G.blurb, lines };
}
eng.quit();
console.log(report.join('\n'));
fs.writeFileSync(new URL('../src/gambits-new.js', import.meta.url), `// GENERATED by tools/gen-new-gambits.mjs: five more gambits (names and base moves from the CC0 lichess-org/chess-openings data, lines extended with Stockfish).
// Same rules as src/gambits.js: a book move is always graded "Book"; only moves outside the book are graded by the engine. Plain data: edit freely.
export const NEW_GAMBITS = ${JSON.stringify(Object.values(out), null, 1)};
`);
