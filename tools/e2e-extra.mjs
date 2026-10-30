// Extra checks: hint, keep-my-move (leave book), play-as-black first computer move, Surprise-me.
import { chromium } from 'playwright-core';
const URL_ = process.argv[2] || 'http://localhost:8099/index.html';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
// The progression celebrations are a full-screen overlay; this suite plays many full lines in a row, so hide it here (tools/e2e-progress.mjs covers it).
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(URL_);
await page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
await page.click('.ocard[data-id="random"]'); await page.click('#color-seg button[data-color="black"]'); await page.click('#start-btn');
await page.waitForFunction(() => window.__ot.getSession()?.phase === 'user', null, { timeout: 30000 });
let s = await page.evaluate(() => ({ color: window.__ot.getSession().userColor, hist: window.__ot.getSession().game.history(), name: document.querySelector('#opening-title').textContent }));
check('black: computer moved first', s.color === 'black' && s.hist.length === 1, s.name + ' ' + s.hist);
await page.click('#hint-btn');
const shapes = await page.evaluate(() => document.querySelectorAll('#board svg.cg-shapes g, #board svg g line').length);
check('hint draws arrow(s) + text', shapes > 0 && /Hint/.test(await page.textContent('#fb-title')));
const sq = async (k) => page.evaluate((k) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const f = k.charCodeAt(0) - 97, r = +k[1] - 1; return { x: b.left + (7 - f + .5) * b.width / 8, y: b.top + (r + .5) * b.height / 8 }; }, k);
const drag = async (a, b) => { const A = await sq(a), B = await sq(b); await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.move(B.x, B.y, { steps: 6 }); await page.mouse.up(); };
// play the book move with hint -> exactly 5 pts
const bm = await page.evaluate(() => { const ss = window.__ot.getSession(); const g = new window.__ot.Chess(ss.game.fen()); const san = window.__ot.bookMoves(ss.book, ss.game.fen())[0]; const m = g.move(san); return { from: m.from, to: m.to }; });
await drag(bm.from, bm.to);
await page.waitForFunction(() => window.__ot.getSession().records.length === 1, null, { timeout: 15000 });
const pts = await page.evaluate(() => window.__ot.getSession().records[0].points);
check('hint makes the book move score exactly 5 pts', pts === 5, String(pts));
await page.waitForFunction(() => ['user', 'over'].includes(window.__ot.getSession().phase), null, { timeout: 15000 });
// now a sound non-book move if available: try a rook-pawn push as black (a6/h6) and see grading, then keep
const mv = await page.evaluate(() => { const ss = window.__ot.getSession(); const g = new window.__ot.Chess(ss.game.fen()); const book = window.__ot.bookMoves(ss.book, ss.game.fen()); const c = g.moves({ verbose: true }).filter((m) => !book.includes(m.san)); return c.length ? { from: c[0].from, to: c[0].to } : null; });
if (mv) {
  await drag(mv.from, mv.to);
  await page.waitForFunction(() => document.querySelector('#fb-actions button'), null, { timeout: 30000 });
  const labels = await page.$$eval('#fb-actions button', (b) => b.map((x) => x.textContent));
  console.log('   actions:', labels.join(' | '));
  check('retry + continue offered', labels.some((l) => /Retry/.test(l)) && labels.some((l) => /continue/.test(l)));
  const keep = labels.find((l) => /Keep/.test(l));
  if (keep) { await page.click('#fb-actions button:has-text("Keep my move")'); await page.waitForSelector('#summary:not(.hidden)'); check('left-book summary', /left the book/i.test(await page.textContent('#sum-eyebrow'))); }
  else { await page.click('#fb-actions button:has-text("continue")'); console.log('   (move was too weak for Keep option; used continue)'); }
}
check('no JS errors', errors.length === 0, errors.join('|'));
await browser.close(); process.exit(ok ? 0 : 1);
