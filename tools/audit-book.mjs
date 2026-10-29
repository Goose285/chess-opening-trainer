// Audits book lines with Stockfish (node): flags book moves that lose a lot vs the engine's best.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
const require = createRequire(import.meta.url);
const enginePath = require('stockfish').findEngine('lite-single');
const sf = spawn(process.execPath, [enginePath], { stdio: 'pipe' });
let buf = '', waiters = [];
sf.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiters.forEach(w => w(l)); } });
const send = c => sf.stdin.write(c + '\n');
const DEPTH = +process.env.DEPTH || 12;
function analyze(fen) {
  return new Promise(res => {
    let last = null;
    const w = l => {
      const m = l.match(/score (cp|mate) (-?\d+)/);
      if (l.startsWith('info') && m && / pv /.test(l)) last = m[1] === 'cp' ? +m[2] : Math.sign(+m[2]) * (10000 - Math.abs(+m[2]));
      const b = l.match(/^bestmove (\S+)/);
      if (b) { waiters = waiters.filter(x => x !== w); res({ cp: last, best: b[1] }); }
    };
    waiters.push(w); send('position fen ' + fen); send('go depth ' + DEPTH);
  });
}
send('uci'); send('isready');
const cache = new Map();
const an = async fen => { const k = fen.split(' ').slice(0,4).join(' '); if (!cache.has(k)) cache.set(k, await analyze(fen)); return cache.get(k); };
let flagged = 0, checked = 0;
for (const o of OPENINGS) {
  for (const l of o.lines) {
    const g = new Chess();
    for (const san of l.moves.split(' ')) {
      const before = await an(g.fen());
      const m = g.move(san);
      const after = await an(g.fen());
      const loss = before.cp - (-after.cp);
      checked++;
      if (loss > 70) { flagged++; console.log(`${o.name} / ${l.name}: ${san} (ply ${g.history().length}) loss ${loss}cp (best ${before.best}, eval ${before.cp}→${-after.cp})`); }
    }
    const f = await an(g.fen());
    const sideEval = g.turn() === 'w' ? f.cp : -f.cp;
    console.log(`  [${o.name} / ${l.name}] final eval (white): ${(sideEval/100).toFixed(2)}`);
  }
}
console.log(`checked ${checked} moves, flagged ${flagged}`);
sf.kill(); process.exit(0);
