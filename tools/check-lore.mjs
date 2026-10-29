// Verifies the teaching content: every opening has Learn-more text and a move-by-move walkthrough whose SAN
// matches the real main line, and every trap line shown in the popup is legal (and mates when it ends in #).
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
import { WALK, MAIN_LINE } from '../src/lore.js';
import { LORE } from '../src/lore-text.js';

let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const ids = OPENINGS.map((o) => o.id);

for (const o of OPENINGS) {
  const walk = WALK[o.id];
  const lore = LORE[o.id];
  if (!walk) fail(`${o.id}: no WALK`);
  if (!lore) fail(`${o.id}: no LORE`);
  const line = o.lines[MAIN_LINE[o.id] || 0].moves || o.lines[MAIN_LINE[o.id] || 0];
  const moves = Array.isArray(line) ? line : String(line).split(/\s+/);
  if (walk) {
    if (walk.length < 10) fail(`${o.id}: walk too short (${walk.length})`);
    walk.forEach((s, i) => {
      const m = /^([^:]+): (.+)$/.exec(s);
      if (!m) return fail(`${o.id}[${i}]: bad format "${s}"`);
      if (m[1] !== moves[i]) fail(`${o.id}[${i}]: note SAN ${m[1]} but line has ${moves[i]}`);
      if (m[2].length > 220) fail(`${o.id}[${i}]: note too long (${m[2].length})`);
    });
  }
  if (lore) {
    for (const k of ['idea', 'structure', 'players']) if (!lore[k] || lore[k].length < 20) fail(`${o.id}: ${k} missing`);
    for (const k of ['white', 'black', 'traps']) if (!Array.isArray(lore[k]) || lore[k].length < 2) fail(`${o.id}: ${k} needs >=2 items`);
    for (const tr of lore.traps || []) {
      if (!tr.name || !tr.text) fail(`${o.id}: trap missing name/text`);
      if (tr.moves) {
        const c = new Chess();
        for (const san of tr.moves.split(/\s+/)) {
          try { c.move(san); } catch { fail(`${o.id}: trap "${tr.name}" illegal move ${san}`); break; }
        }
        if (tr.moves.endsWith('#') && !c.isCheckmate()) fail(`${o.id}: trap "${tr.name}" should end in mate`);
      }
    }
  }
}
for (const k of Object.keys(WALK)) if (!ids.includes(k)) fail(`WALK has unknown id ${k}`);
for (const k of Object.keys(LORE)) if (!ids.includes(k)) fail(`LORE has unknown id ${k}`);
console.log(bad ? `${bad} problem(s)` : `lore OK: ${ids.length} openings, walkthroughs aligned, trap lines legal`);
process.exit(bad ? 1 : 0);
