// Plays every gambit opening through the real UI choosing random book moves and asserts that
// (a) the gambit filter works, (b) every book move is graded "Book" (never engine-graded / downgraded),
// (c) each run finishes with a summary. Usage: node tools/e2e-gambits.mjs [url] ; ONLY=id,id to limit.
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
// The progression celebrations are a full-screen overlay; this suite plays many full lines in a row, so hide it here (tools/e2e-progress.mjs covers it).
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(URL_);
await page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });

// filter
await page.click('#filter-seg button[data-filter="gambit"]');
const cards = await page.$$eval('.ocard', (c) => c.map((x) => ({ id: x.dataset.id, gambit: x.classList.contains('gambit') })));
const ids = cards.filter((c) => c.id !== 'random').map((c) => c.id);
check('gambit filter shows only gambits', ids.length === 37 && cards.filter((c) => c.id !== 'random').every((c) => c.gambit), `${ids.length} cards`);
const wanted = process.env.ONLY ? process.env.ONLY.split(',') : ids;
await page.click('#filter-seg button[data-filter="all"]');
check('"All" filter shows everything', (await page.$$('.ocard')).length === 54);
await page.click('#filter-seg button[data-filter="black"]');
check('"Black" filter only lists Black openings', (await page.$$eval('.ocard:not([data-id="random"]) .chip', (c) => c.every((x) => x.classList.contains('b')))));
await page.click('#filter-seg button[data-filter="gambit"]');

const squareCenter = (sq) => page.evaluate((sq) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, sq);
async function playMove(from, to) { const a = await squareCenter(from), b = await squareCenter(to); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 3 }); await page.mouse.up(); }

for (const id of wanted) {
  await page.click(`.ocard[data-id="${id}"]`);
  const side = await page.evaluate((id) => document.querySelector(`.ocard[data-id="${id}"] .chip`).textContent.trim().toLowerCase(), id);
  const colorActive = await page.$eval('#color-seg button.active', (b) => b.dataset.color);
  if (colorActive !== side) { check(`${id}: picking a card switches to its side`, false, `${colorActive} vs ${side}`); await page.click(`#color-seg button[data-color="${side}"]`); }
  await page.click('#start-btn');
  await page.waitForFunction(() => ['user', 'over'].includes(window.__ot.getSession()?.phase), null, { timeout: 30000 });
  let n = 0;
  while (n++ < 60) {
    const phase = await page.evaluate(() => window.__ot.getSession().phase);
    if (phase === 'over') break;
    const mv = await page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); const sans = window.__ot.bookMoves(s.book, s.game.fen()); const san = sans[Math.floor(Math.random() * sans.length)]; const m = g.move(san); return { from: m.from, to: m.to }; });
    const before = await page.evaluate(() => window.__ot.getSession().records.length);
    await playMove(mv.from, mv.to);
    await page.waitForFunction((b) => { const s = window.__ot.getSession(); return s.records.length > b && (s.phase === 'user' || s.phase === 'over'); }, before, { timeout: 20000 });
  }
  const res = await page.evaluate(() => { const s = window.__ot.getSession(); return { grades: s.records.map((r) => r.grade.key), pts: s.points, n: s.records.length, over: s.over, name: s.opening.name, user: s.userColor }; });
  const allBook = res.grades.every((g) => g === 'book');
  check(`${id}: ${res.n} book moves as ${res.user}, all graded Book, ${res.pts}/${res.n * 100} pts`, allBook && res.over && res.pts === res.n * 100 && res.n >= 5, allBook ? '' : res.grades.join(','));
  await page.waitForSelector('#summary:not(.hidden)', { timeout: 10000 });
  await page.click('#sum-menu');
}
check('no JS errors', errors.length === 0, errors.join(' | '));
await browser.close(); process.exit(ok ? 0 : 1);
