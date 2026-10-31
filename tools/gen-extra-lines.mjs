// Phase 1: "opponent replies" lines. For every gambit, find the most common replies/declines that the book does not cover yet,
// using the CC0 lichess-org/chess-openings names + moves (/workspace/lichess/eco/*.tsv) ranked by how often that variation appears in
// the Lichess puzzle database games (/workspace/lichess/tags.json, a popularity proxy: the explorer API needs a login),
// then extend each with Stockfish's top moves to a playable length. Output: src/gambit-replies.js (REPLIES), plain data.
//   node tools/gen-extra-lines.mjs [id ...]
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
import { buildBook, posKey } from '../src/book.js';
import { startEngine } from './lib-engine.mjs';

const RULES = {
  'fried-liver': /^Italian_Game_Two_Knights_Defense|^Italian_Game_Anti-Fried/, traxler: /Traxler|Wilkes-Barre/, 'kings-gambit': /^Kings_Gambit/, evans: /^Italian_Game_Evans_Gambit/,
  danish: /^Danish_Gambit/, 'scotch-gambit': /^(Scotch_Game|Italian_Game)_Scotch_Gambit/, 'smith-morra': /^Sicilian_Defense_Smith-Morra_Gambit/,
  budapest: /^Indian_Defense_Budapest/, benko: /^Benko_Gambit/, albin: /^Queens_Gambit_Declined_Albin_Countergambit/, 'englund-black': /^Englund_Gambit/,
  'englund-white': /^Englund_Gambit/, stafford: /Stafford_Gambit/, 'vienna-gambit': /^(Vienna_Game_Vienna_Gambit|Vienna_Gambit_with_Max_Lange)/,
  qga: /^Queens_Gambit_Accepted/, latvian: /^Latvian_Gambit/, 'blackmar-diemer': /^Blackmar-Diemer_Gambit/, halloween: /^Four_Knights_Game_Halloween_Gambit/,
  jerome: /^Italian_Game_Jerome_Gambit/, schliemann: /^Ruy_Lopez_Schliemann_Defense/, marshall: /^Ruy_Lopez_Marshall_Attack/,
  'icelandic-palme': /^Scandinavian_Defense_Icelandic-Palme_Gambit/, elephant: /^Elephant_Gambit/, 'von-hennig-schara': /^Tarrasch_Defense_(Schara|von_Hennig)_Gambit/,
  rousseau: /^Italian_Game_Rousseau_Gambit/, fajarowicz: /Fajarowicz/, blumenfeld: /^Blumenfeld_Countergambit/, 'wing-gambit': /^Sicilian_Defense_Wing_Gambit/,
  'goring-gambit': /^Scotch_Game_Goring_Gambit/, 'staunton-gambit': /^Dutch_Defense_Staunton_Gambit/, 'muzio-gambit': /^Kings_Gambit_.*Muzio/,
  'belgrade-gambit': /^Four_Knights_Game_Scotch_Variation/,
};
const tagOf = (name) => name.replace(/'/g, '').replace(/[:,]\s*/g, '_').replace(/ /g, '_');
const counts = JSON.parse(fs.readFileSync('/workspace/lichess/tags.json', 'utf8'));
const eco = ['a', 'b', 'c', 'd', 'e'].flatMap((f) => fs.readFileSync(`/workspace/lichess/eco/${f}.tsv`, 'utf8').trim().split('\n').slice(1).map((l) => { const [code, name, pgn] = l.split('\t'); return { code, name, tag: tagOf(name), moves: pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean) }; }));
const eng = startEngine();
const ids = process.argv.slice(2).length ? process.argv.slice(2) : OPENINGS.filter((o) => o.gambit && RULES[o.id]).map((o) => o.id);
const out = {};
const covered = (book, moves) => { const g = new Chess(); for (const s of moves) { const node = book.graph.get(posKey(g.fen())); let m; try { m = g.move(s); } catch { return true; } if (!node || !node.has(m.san)) return false; } return true; };
const commonPrefix = (book, moves) => { const g = new Chess(); let n = 0; for (const s of moves) { const node = book.graph.get(posKey(g.fen())); let m; try { m = g.move(s); } catch { break; } if (!node || !node.has(m.san)) break; n++; } return n; };
for (const id of ids) {
  const o = OPENINGS.find((x) => x.id === id); const book = buildBook({ ...o, lines: o.lines.filter((l) => !l.extra) });
  const solverIsWhite = o.side === 'white';
  let cands = eco.filter((e) => RULES[id].test(e.tag) && !/Other_variations/.test(e.tag) && e.moves.length >= 4)
    .map((e) => ({ ...e, n: counts[e.tag] || 0, cp: commonPrefix(book, e.moves) }))
    .filter((e) => !covered(book, e.moves) && e.cp >= 3 && e.cp < e.moves.length)
    .filter((e) => ((e.cp % 2 === 0) === solverIsWhite ? false : true)) // diverge on the OPPONENT's move (index cp is white's when even)
    ;
  cands.sort((a, b) => b.n - a.n || b.moves.length - a.moves.length);
  const picked = [];
  for (const c of cands) {
    if (picked.length >= 3) break;
    const dv = c.moves.slice(0, c.cp + 1).join(' ');
    if (picked.some((p) => p.dv === dv || p.moves.join(' ').startsWith(c.moves.join(' ')) || c.moves.join(' ').startsWith(p.moves.join(' ')))) continue;
    picked.push({ ...c, dv });
  }
  // engine fallback: if the opening data had fewer than 2 uncovered popular replies, add the most natural early engine-approved replies
  if (picked.length < 2) {
    const paths = new Map(); // node key -> SAN path (first line that reaches it), opponent to move only
    for (const l of o.lines.filter((x) => !x.extra)) { const g = new Chess(); const sans = l.moves.split(' '); for (let i = 0; i < Math.min(sans.length, 14); i++) { const oppToMove = (g.turn() === 'w') !== solverIsWhite; const k = posKey(g.fen()); if (oppToMove && i >= 3 && !paths.has(k)) paths.set(k, g.history()); try { g.move(sans[i]); } catch { break; } } }
    const nodes = [...paths.entries()].sort((a, b) => a[1].length - b[1].length);
    for (const [k, path] of nodes) {
      if (picked.length >= 2) break;
      const g = new Chess(); path.forEach((s2) => g.move(s2));
      const r = await eng.analyze(g.fen(), 12, 5); const best = r.lines[1].cp; const node = book.graph.get(k);
      for (const key of Object.keys(r.lines)) {
        const L = r.lines[key]; if (L.cp < best - 120) continue;
        const h = new Chess(g.fen()); let m; try { m = h.move({ from: L.pv[0].slice(0, 2), to: L.pv[0].slice(2, 4), promotion: L.pv[0][4] }); } catch { continue; }
        if (node && node.has(m.san)) continue;
        const moves = [...path, m.san];
        if (picked.some((p2) => p2.dv === moves.slice(0, path.length + 1).join(' ') || p2.moves[path.length] === m.san && p2.cp === path.length)) continue;
        // follow the engine's PV a few plies, then name it from the ECO data if a prefix matches
        for (const u of L.pv.slice(1, 5)) { try { h.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); moves.push(h.history().pop()); } catch { break; } }
        const hit = eco.filter((e) => moves.join(' ').startsWith(e.moves.join(' ')) && e.moves.length > path.length).sort((a, b) => b.moves.length - a.moves.length)[0];
                picked.push({ fallback: !hit, name: hit ? hit.name : '', moves, n: hit ? counts[hit.tag] || 0 : 0, cp: path.length, dv: moves.slice(0, path.length + 1).join(' ') });
        break;
      }
    }
  }
  out[id] = [];
  for (const c of picked) {
    const g = new Chess(); c.moves.forEach((s) => g.move(s));
    let moves = [...c.moves];
    // extend to ~14 plies with the engine's top move, stop if the position gets lopsided
    while (moves.length < 14 && !g.isGameOver()) {
      const r = await eng.analyze(g.fen(), 13); if (Math.abs(r.cp) > 450) break;
      const m = g.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }); moves.push(m.san);
    }
    if (moves.length % 2 === 1) { // the line should end after the opponent's move so the user gets the last word? keep the user's move last when possible
      if (!g.isGameOver()) { const r = await eng.analyze(g.fen(), 13); try { const m = g.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }); moves.push(m.san); } catch {} }
    }
    const k = c.cp, label = `${Math.floor(k / 2) + 1}${k % 2 ? '...' : '.'}${c.moves[k]}`;
    const short = c.fallback ? '' : c.name.replace(/^[^:]*:\s*/, '');
    out[id].push({ name: `Reply ${label}${short ? ' – ' + short : ''}`, moves: moves.join(' '), extra: 'reply', pop: c.n });
  }
  console.error(id, out[id].map((l) => `${l.name} [${l.pop}] (${l.moves.split(' ').length})`).join(' | ') || '(nothing new)');
}
eng.quit();
fs.writeFileSync(new URL('../src/gambit-replies.js', import.meta.url), `// GENERATED by tools/gen-extra-lines.mjs: the most common replies / declines to each gambit, as extra drillable lines.
// Names and moves come from lichess-org/chess-openings (CC0), ranked by how often the variation shows up in Lichess games,
// then extended with Stockfish. Plain data: edit freely.
export const REPLIES = ${JSON.stringify(out, null, 1)};
`);
