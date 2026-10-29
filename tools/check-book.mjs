// Validates every opening line is legal and reports library stats.
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
import { buildBook } from '../src/book.js';
let bad = 0, lines = 0, plies = 0;
for (const o of OPENINGS) {
  for (const l of o.lines) {
    const g = new Chess();
    const mv = l.moves.split(/\s+/);
    for (let i = 0; i < mv.length; i++) {
      try { g.move(mv[i]); } catch { console.log(`ILLEGAL: ${o.name} / ${l.name}: ply ${i + 1} "${mv[i]}" after ${mv.slice(0, i).join(' ')}`); bad++; break; }
    }
  }
}
if (bad) process.exit(1);
for (const o of OPENINGS) {
  const b = buildBook(o);
  lines += o.lines.length;
  plies += o.lines.reduce((s, l) => s + l.moves.split(' ').length, 0);
  console.log(`${o.name.padEnd(26)} lines=${o.lines.length} positions=${b.graph.size}`);
}
console.log(`OK: ${OPENINGS.length} openings, ${lines} lines, ${plies} plies`);
