// Headless end-to-end test (playwright-core + system Chrome). Usage: node tools/e2e.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = process.argv[2] || 'http://localhost:8099/index.html';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
await page.goto(URL_);
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' — ' + extra : '')); };

// engine loads
await page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });
const pill = await page.textContent('#engine-pill span');
check('engine initialised', /Stockfish 19 ready/.test(pill) || /file:/.test(URL_), pill);
check('16 opening cards + surprise', (await page.$$('.ocard')).length === 17);

const OPEN = process.env.OPENING || 'italian';
await page.click(`.ocard[data-id="${OPEN}"]`);
await page.click(`#color-seg button[data-color="${process.env.COLOR || 'white'}"]`);
await page.click('#start-btn');
await page.waitForSelector('#board cg-board');

async function squareCenter(sq) {
  return page.evaluate((sq) => {
    const b = document.querySelector('#board cg-board').getBoundingClientRect();
    const o = window.__ot.getSession().userColor;
    const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1;
    const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r;
    return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 };
  }, sq);
}
async function playMove(from, to) {
  const a = await squareCenter(from), b = await squareCenter(to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up();
}
const getFb = () => page.evaluate(() => ({ title: document.querySelector('#fb-title').textContent, cls: document.querySelector('#feedback').className, text: document.querySelector('#fb-text').textContent }));
const waitUserTurn = () => page.waitForFunction(() => { const s = window.__ot.getSession(); return s.phase === 'user' || s.phase === 'over'; }, null, { timeout: 30000 });
const userBookMoves = () => page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); return window.__ot.bookMoves(s.book, s.game.fen()).map((san) => { const m = g.move(san); g.undo(); return { san, from: m.from, to: m.to }; }); });

await waitUserTurn();
let st = await page.evaluate(() => window.__ot.getSession().phase);
check('reached user turn', st === 'user');

// 1) play a clearly bad non-book move; expect graded as mistake/blunder + retry offered
const sess0 = await page.evaluate(() => ({ color: window.__ot.getSession().userColor, fen: window.__ot.getSession().game.fen() }));
const bad = sess0.color === 'white' ? ['f2', 'f3'] : ['f7', 'f6'];
await playMove(...bad);
await page.waitForFunction(() => /state-(best|excellent|good|inaccuracy|mistake|blunder)/.test(document.querySelector('#feedback').className), null, { timeout: 30000 });
let fb = await getFb();
console.log('   feedback:', fb.title, '|', fb.text.slice(0, 160));
check('non-book move graded by engine', /state-(inaccuracy|mistake|blunder|good|excellent|best)/.test(fb.cls), fb.cls);
check('feedback shows expected book move', /Expected book move/.test(fb.text));
check('retry button present', !!(await page.$('#fb-actions button')));
await page.screenshot({ path: 'docs/shot-feedback.png' });
// retry
await page.click('#fb-actions button:has-text("Retry")');
await page.waitForTimeout(500);
const reverted = await page.evaluate(() => window.__ot.getCg().getFen() === window.__ot.getSession().game.fen().split(' ')[0]);
check('retry restores the board', reverted);
st = await page.evaluate(() => window.__ot.getSession().phase);
check('retry returns to user turn', st === 'user');

// 2) play through the line choosing random book moves (with one "continue with book" in the middle)
let n = 0, usedContinue = false;
while (n++ < 40) {
  await waitUserTurn();
  const phase = await page.evaluate(() => window.__ot.getSession().phase);
  if (phase === 'over') break;
  const opts = await userBookMoves();
  if (!usedContinue && n === 3) {
    // play a poor non-book move and choose "Show book move & continue"
    const c = await page.evaluate(() => window.__ot.getSession().userColor);
    const g = await page.evaluate(() => { const s = window.__ot.getSession(); const gg = new window.__ot.Chess(s.game.fen()); const book = window.__ot.bookMoves(s.book, s.game.fen()); const mv = gg.moves({ verbose: true }).find((m) => !book.includes(m.san) && m.piece === 'p' && m.flags.includes('n') === false || (!book.includes(m.san) && m.piece === 'r')); return mv ? { from: mv.from, to: mv.to } : null; });
    if (g) {
      await playMove(g.from, g.to);
      await page.waitForFunction(() => document.querySelector('#fb-actions button'), null, { timeout: 30000 });
      fb = await getFb(); console.log('   2nd feedback:', fb.title);
      await page.click('#fb-actions button:has-text("continue")');
      usedContinue = true; continue;
    }
  }
  const pick = opts[Math.floor(Math.random() * opts.length)];
  await playMove(pick.from, pick.to);
  const before = await page.evaluate(() => window.__ot.getSession().records.length);
  try { await page.waitForFunction((b) => { const s = window.__ot.getSession(); return s.records.length > b && s.phase !== 'busy'; }, before, { timeout: 20000 }); }
  catch (e) { console.log('STUCK', JSON.stringify(await page.evaluate(() => { const s = window.__ot.getSession(); return { phase: s.phase, fen: s.game.fen(), hist: s.game.history(), fb: document.querySelector('#fb-title').textContent }; })), 'tried', JSON.stringify(pick)); await page.screenshot({ path: '/tmp/stuck.png' }); throw e; }
}
await page.waitForSelector('#summary:not(.hidden)', { timeout: 15000 });
const sum = await page.evaluate(() => ({ title: document.querySelector('#sum-title').textContent, line: document.querySelector('#sum-line').textContent, pts: document.querySelector('#sum-points').textContent, max: document.querySelector('#sum-max').textContent, pct: document.querySelector('#sum-pct').textContent, rows: document.querySelectorAll('.srow').length }));
console.log('   summary:', JSON.stringify(sum));
check('summary shown at end of line', sum.rows > 3 && +sum.max > 0);
check('score recorded', +sum.pts > 0 && +sum.pts <= +sum.max);
await page.screenshot({ path: 'docs/shot-summary.png' });

// mobile viewport screenshot
await page.setViewportSize({ width: 390, height: 844 });
await page.click('#sum-review');
await page.screenshot({ path: 'docs/shot-mobile.png', fullPage: true });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('no horizontal overflow on mobile', !overflow);

check('no JS errors', errors.length === 0, errors.join(' | '));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
