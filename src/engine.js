import { Chess } from 'chess.js';

const MATE = 10000;

// ---------- Stockfish (WASM) in a Web Worker ----------
class StockfishEngine {
  constructor(url) { this.url = url; this.name = 'Stockfish 19 (WASM, lite)'; this.kind = 'stockfish'; }

  init(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const fail = (e) => { if (done) return; done = true; try { this.worker && this.worker.terminate(); } catch {} reject(e); };
      try { this.worker = new Worker(this.url); } catch (e) { return fail(e); }
      this.worker.onerror = (e) => fail(new Error(e.message || 'worker error'));
      const t = setTimeout(() => fail(new Error('Stockfish init timed out')), timeoutMs);
      this.listener = (line) => {
        if (line === 'uciok') this.send('isready');
        else if (line === 'readyok' && !done) { done = true; clearTimeout(t); this.worker.onerror = null; resolve(); }
      };
      this.worker.onmessage = (e) => this.listener && this.listener(typeof e.data === 'string' ? e.data : String(e.data));
      this.send('uci');
    });
  }

  send(cmd) { this.worker.postMessage(cmd); }

  // Returns { cp, best } with cp from the side-to-move's point of view.
  analyze(fen, { depth = 13, movetime = 0 } = {}) {
    return new Promise((resolve) => {
      let last = null;
      this.listener = (line) => {
        if (line.startsWith('info') && / pv /.test(line)) {
          const m = line.match(/score (cp|mate) (-?\d+)/);
          if (m && !/lowerbound|upperbound/.test(line)) {
            const v = +m[2];
            last = m[1] === 'cp' ? v : Math.sign(v) * (MATE - Math.abs(v));
          }
        } else if (line.startsWith('bestmove')) {
          this.listener = null;
          const best = line.split(/\s+/)[1];
          resolve({ cp: last ?? 0, best: best && best !== '(none)' ? best : null });
        }
      };
      this.send('ucinewgame');
      this.send('position fen ' + fen);
      this.send(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
    });
  }
}

// ---------- Tiny built-in fallback engine (used if the Stockfish worker can't start, e.g. file://) ----------
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PST_CENTER = [0, 0, 5, 10, 10, 5, 0, 0];
function pstBonus(type, file, rank, color) {
  const r = color === 'w' ? rank : 7 - rank;
  if (type === 'p') return r * 6 + (file >= 2 && file <= 5 ? 4 * (r > 1 ? 1 : 0) : 0);
  if (type === 'n' || type === 'b') return PST_CENTER[file] + PST_CENTER[r] - (r === 0 ? 10 : 0);
  if (type === 'k') return r === 0 ? 5 : -15;
  return 0;
}
function evaluate(g) { // from side-to-move POV
  let score = 0;
  const b = g.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = b[r][f]; if (!p) continue;
    const v = VAL[p.type] + pstBonus(p.type, f, 7 - r, p.color);
    score += p.color === 'w' ? v : -v;
  }
  return g.turn() === 'w' ? score : -score;
}
class MiniEngine {
  constructor() { this.name = 'Built-in basic engine (Stockfish unavailable)'; this.kind = 'mini'; }
  async init() {}
  analyze(fen) {
    return new Promise((resolve) => setTimeout(() => {
      const g = new Chess(fen);
      const order = (ms) => ms.sort((a, b) => ((b.captured ? VAL[b.captured] * 10 - VAL[b.piece] : 0) + (b.promotion ? 800 : 0)) - ((a.captured ? VAL[a.captured] * 10 - VAL[a.piece] : 0) + (a.promotion ? 800 : 0)));
      const q = (alpha, beta, d) => {
        const stand = evaluate(g);
        if (d === 0 || stand >= beta) return stand;
        if (stand > alpha) alpha = stand;
        for (const m of order(g.moves({ verbose: true }).filter((m) => m.captured))) {
          g.move(m); const s = -q(-beta, -alpha, d - 1); g.undo();
          if (s >= beta) return s; if (s > alpha) alpha = s;
        }
        return alpha;
      };
      const search = (depth, alpha, beta, ply) => {
        if (g.isCheckmate()) return -(MATE - ply);
        if (g.isDraw()) return 0;
        if (depth === 0) return q(alpha, beta, 4);
        for (const m of order(g.moves({ verbose: true }))) {
          g.move(m); const s = -search(depth - 1, -beta, -alpha, ply + 1); g.undo();
          if (s >= beta) return s; if (s > alpha) alpha = s;
        }
        return alpha;
      };
      let best = null, alpha = -Infinity;
      const moves = order(g.moves({ verbose: true }));
      if (!moves.length) return resolve({ cp: g.isCheckmate() ? -MATE : 0, best: null });
      for (const m of moves) {
        g.move(m); const s = -search(2, -Infinity, -alpha, 1); g.undo();
        if (s > alpha) { alpha = s; best = m.from + m.to + (m.promotion || ''); }
      }
      resolve({ cp: alpha, best });
    }, 10));
  }
}

// ---------- Manager: serialises requests, caches results ----------
export class EngineManager {
  constructor({ stockfishUrl, depth = 13 }) { this.stockfishUrl = stockfishUrl; this.depth = depth; this.cache = new Map(); this.chain = Promise.resolve(); this.engine = null; }

  async init() {
    try {
      const sf = new StockfishEngine(this.stockfishUrl);
      await sf.init();
      this.engine = sf;
    } catch (e) {
      console.warn('Stockfish failed to start, using fallback engine:', e && e.message);
      this.engine = new MiniEngine();
      this.fallbackReason = e && e.message;
    }
    return this.engine;
  }

  get name() { return this.engine ? this.engine.name : 'loading…'; }
  get isStockfish() { return !!this.engine && this.engine.kind === 'stockfish'; }

  // cp from side-to-move POV; cached by position
  analyze(fen) {
    const key = fen.split(' ').slice(0, 4).join(' ');
    if (this.cache.has(key)) return this.cache.get(key);
    const p = (this.chain = this.chain.then(() => this.engine.analyze(fen, { depth: this.depth })));
    this.cache.set(key, p);
    return p;
  }
}

export { MATE };
