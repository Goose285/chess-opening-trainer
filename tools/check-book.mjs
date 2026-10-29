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
// structural checks
const ids = new Set(); let problems = 0;
for (const o of OPENINGS) {
  if (ids.has(o.id)) { console.log('DUPLICATE id ' + o.id); problems++; } ids.add(o.id);
  if (!['white', 'black'].includes(o.side)) { console.log('bad side: ' + o.name); problems++; }
  const lineNames = new Set();
  for (const l of o.lines) {
    if (lineNames.has(l.name)) { console.log(`duplicate line name in ${o.name}: ${l.name}`); problems++; } lineNames.add(l.name);
    const n = l.moves.split(/\s+/).length;
    if (n < 8) { console.log(`short line (${n} plies): ${o.name} / ${l.name}`); problems++; }
    // the line must give the user at least 3 moves on its side
    if (Math.floor(n / 2) < 3) { console.log(`too few moves: ${o.name} / ${l.name}`); problems++; }
  }
  if (o.gambit && o.lines.length < 3) { console.log(`gambit with <3 lines: ${o.name}`); problems++; }
}
const gambits = OPENINGS.filter((o) => o.gambit);
console.log(`gambits: ${gambits.length} openings, ${gambits.reduce((s, o) => s + o.lines.length, 0)} lines`);
if (problems) process.exit(1);
console.log(`OK: ${OPENINGS.length} openings, ${lines} lines, ${plies} plies`);
