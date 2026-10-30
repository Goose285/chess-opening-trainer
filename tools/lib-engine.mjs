// Tiny node wrapper around the bundled Stockfish (lite single) for tools that need engine checks.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export function startEngine() {
  const enginePath = require('stockfish').findEngine('lite-single');
  const sf = spawn(process.execPath, [enginePath], { stdio: 'pipe' });
  let buf = '', waiters = [];
  sf.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiters.forEach((w) => w(l)); } });
  const send = (c) => sf.stdin.write(c + '\n');
  send('uci'); send('setoption name Threads value 1'); send('isready');
  const cache = new Map();
  /** returns { cp (side-to-move POV, mates as +-(10000-n)), best (uci), pv: [uci...] } */
  const analyze = (fen, depth = 16, multipv = 1) => new Promise((res) => {
    const key = fen + depth + multipv; if (cache.has(key)) return res(cache.get(key));
    const lines = {};
    const w = (l) => {
      if (l.startsWith('info') && / pv /.test(l)) {
        const m = l.match(/score (cp|mate) (-?\d+)/); const mp = +(l.match(/multipv (\d+)/) || [0, 1])[1]; const pv = l.split(' pv ')[1].split(' ');
        if (m) lines[mp] = { cp: m[1] === 'cp' ? +m[2] : Math.sign(+m[2]) * (10000 - Math.abs(+m[2])), pv };
      }
      const b = l.match(/^bestmove (\S+)/);
      if (b) { waiters = waiters.filter((x) => x !== w); const r = { ...lines[1], best: b[1], lines }; cache.set(key, r); res(r); }
    };
    waiters.push(w); send('setoption name MultiPV value ' + multipv); send('position fen ' + fen); send('go depth ' + depth);
  });
  return { analyze, quit: () => { send('quit'); sf.kill(); } };
}
