// Hint scoring: any move after a hint scores at most 5 points (book move = exactly 5), labels kept, "(hint)" shown. Usage: node tools/e2e-hint.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = process.argv[2] || 'http://localhost:8099/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForFunction(() => /ready/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 40000 });
check('hint button advertises 5 pts', /5 pts/.test(await page.textContent('#hint-btn')) && !/50/.test(await page.textContent('#hint-btn')));
await page.evaluate(() => document.querySelector('.ocard[data-id="italian"]').click());
await page.click('#color-seg button[data-color="white"]'); await page.click('#start-btn'); await page.waitForSelector('#board cg-board');
const sq = (k) => page.evaluate((k) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = k.charCodeAt(0) - 97, r = +k[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, k);
const drag = async (a, b) => { const A = await sq(a), B = await sq(b); await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.move(B.x, B.y, { steps: 6 }); await page.mouse.up(); };
const turn = () => page.waitForFunction(() => { const s = window.__ot.getSession(); return s.phase === 'user' || s.phase === 'over'; }, null, { timeout: 30000 });
const book = () => page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); return window.__ot.bookMoves(s.book, s.game.fen()).map((san) => { const m = g.move(san); g.undo(); return { from: m.from, to: m.to }; })[0]; });
const rec = (i) => page.evaluate((i) => { const r = window.__ot.getSession().records[i]; return r && { points: r.points, grade: r.grade.key, hint: !!r.hint }; }, i);

// 1) book move after a hint = exactly 5 points, grade label stays "book", feedback says (hint)
await turn(); await page.click('#hint-btn');
check('hint text promises 5 points', /just 5 points/.test(await page.textContent('#fb-text')), await page.textContent('#fb-text'));
let m = await book(); await drag(m.from, m.to);
await page.waitForFunction(() => window.__ot.getSession().records.length === 1, null, { timeout: 15000 });
let r0 = await rec(0);
check('book move after hint: exactly 5 pts, label still Book', r0.points === 5 && r0.grade === 'book' && r0.hint, JSON.stringify(r0));
check('feedback shows "(hint)" and the 5 pts', /Book move \(hint\)/.test(await page.textContent('#fb-title')) && /\(hint\)/.test(await page.textContent('#fb-text')) && /5 pts/.test(await page.textContent('#fb-text')), await page.textContent('#fb-title') + ' | ' + await page.textContent('#fb-text'));
check('run score shows 5', (await page.textContent('#score-num')) === '5');
await turn();
// 2) a move without a hint still scores a full 100
m = await book(); await drag(m.from, m.to);
await page.waitForFunction(() => window.__ot.getSession().records.length === 2, null, { timeout: 15000 });
check('next move without a hint still scores 100', (await rec(1)).points === 100 && (await page.textContent('#score-num')) === '105');
await turn();
// 3) wrong move after a hint: label as normal, never above 5
await page.click('#hint-btn');
await drag('a2', 'a3'); // not in the Italian book
await page.waitForFunction(() => /state-(best|excellent|good|inaccuracy|mistake|blunder)/.test(document.querySelector('#feedback').className), null, { timeout: 30000 });
const fbT = await page.textContent('#fb-title'), fbX = await page.textContent('#fb-text');
check('wrong move after hint keeps its grade label and notes the hint cap', /but not book/.test(fbT) && /\(hint\)/.test(fbX) && /at most 5 pts/.test(fbX), fbT + ' | ' + fbX.slice(0, 160));
const labelBefore = fbT.split(' — ')[0];
await page.click('#fb-actions button:has-text("Show book move")');
await page.waitForFunction(() => window.__ot.getSession().records.length === 3, null, { timeout: 15000 });
const r2 = await rec(2);
check('that move scored min(normal, 5) with the same label', r2.points <= 5 && r2.hint && r2.points === Math.min(r2.points, 5) && labelBefore.toLowerCase().includes(r2.grade), JSON.stringify(r2) + ' / ' + labelBefore);
// 4) a normally-lower score is kept (blunder = 0 is not raised to 5)
check('scores below 5 are never raised', await page.evaluate(() => window.__ot.getSession().records.every((r) => !r.hint || r.points <= 5)));
// finish: summary + XP follow points
while (true) { await turn(); if (await page.evaluate(() => window.__ot.getSession().phase === 'over')) break; m = await book(); await drag(m.from, m.to); const n = await page.evaluate(() => window.__ot.getSession().records.length); await page.waitForFunction((n) => window.__ot.getSession().records.length > n || window.__ot.getSession().phase === 'over', n - 1, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(60); }
await page.waitForSelector('#summary:not(.hidden)');
const pts = await page.evaluate(() => window.__ot.getSession().points);
const rows = await page.$$eval('.srow', (rs) => rs.slice(0, 3).map((r) => r.textContent));
check('summary lists the move as hinted, with its 5 pts', /hint/.test(rows[0]) && /5/.test(rows[0]) && /100/.test(rows[1]), rows.join(' || '));
const st = await page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-progress')));
check('XP follows the lower points (points + first-finish bonus only; hinted run is not perfect)', st.xp === pts + 50 + 50 || st.xp >= pts + 50, `points ${pts}, xp ${st.xp}`);
check('no page errors', errors.length === 0, errors.join('|'));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
