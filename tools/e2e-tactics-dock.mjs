// Tactics practice screen: Next puzzle dock under the board (visible without scrolling on a phone), rating (ELO) range chips,
// running session score and the fire streak (tiers at 3 / 5 / 10, reset on a miss, best streak saved).
// Usage: node tools/e2e-tactics-dock.mjs [url] [screenshotDir]   (serve the folder first: python3 -m http.server 8099)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const SHOTS = process.argv[3] || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const HIDE = () => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); });
const FILE = JSON.parse(fs.readFileSync(new URL('../tactics/tactics.json', import.meta.url), 'utf8')).sets;
const ALL = Object.values(FILE).flat();

async function newPage(seed) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(HIDE);
  await page.goto(URL_); await page.evaluate((seed) => { localStorage.clear(); if (seed) for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); }, seed); await page.reload(); await page.waitForSelector('.ocard');
  return page;
}
const run = (page) => page.evaluate(() => { const r = window.__tac.run(); return r && { phase: r.phase, idx: r.idx, id: r.p.id, moves: r.p.moves, color: r.color, rating: r.p.rating, finished: r.finished }; });
const waitPhase = (page, ph, t = 15000) => page.waitForFunction((ph) => { const r = window.__tac && window.__tac.run(); return r && (Array.isArray(ph) ? ph : [ph]).includes(r.phase); }, ph, { timeout: t });
const sq = (page, k) => page.evaluate((k) => { const b = document.querySelector('#pz-board cg-board').getBoundingClientRect(); const o = window.__tac.run().color; const f = k.charCodeAt(0) - 97, r = +k[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, k);
const drag = async (page, a, b) => { const A = await sq(page, a), B = await sq(page, b); await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.move(B.x, B.y, { steps: 6 }); await page.mouse.up(); };
async function solveCurrent(page) {
  for (let guard = 0; guard < 6; guard++) {
    await waitPhase(page, ['user', 'over']);
    const r = await run(page); if (r.phase === 'over') return;
    const u = r.moves[r.idx]; await drag(page, u.slice(0, 2), u.slice(2, 4));
    await page.waitForFunction((n) => { const x = window.__tac.run(); return x.phase === 'over' || x.idx > n; }, r.idx, { timeout: 15000 });
  }
}
const wrongMove = (page) => page.evaluate(() => { const r = window.__tac.run(); const ex = r.p.moves[r.idx]; const mv = r.game.moves({ verbose: true }).find((m) => (m.from + m.to) !== ex.slice(0, 4) && !(() => { const t = new window.__ot.Chess(r.game.fen()); t.move(m); return t.isCheckmate(); })()); return mv.from + mv.to; });
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-progress')));
const inView = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= window.innerHeight && b.width > 0; }, sel);
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const tap = (page, sel) => page.$eval(sel, (e) => e.click()); // chips scroll sideways on a phone
const tier = (page) => page.getAttribute('#pz-streak-pill', 'data-tier');

// ---------------------------------------------------------------- rating chips on the Tactics home
let page = await newPage();
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
const chips = await page.$$eval('#tac-rating-seg button', (b) => b.map((x) => x.textContent));
check('rating chips: All, <900, 900–1100, 1100–1300, 1300+', chips.join('|') === 'All|<900|900–1100|1100–1300|1300+', chips.join('|'));
check('All is selected by default', await page.$eval('#tac-rating-seg button[data-rating="all"]', (b) => b.classList.contains('active')));
const counts = {};
for (const [key, lo, hi] of [['u900', 0, 900], ['r900', 900, 1100], ['r1100', 1100, 1300], ['r1300', 1300, 1e9]]) {
  await tap(page, `#tac-rating-seg button[data-rating="${key}"]`);
  counts[key] = +(/(\d+) puzzles/.exec(await page.textContent('#tac-count'))[1]);
  const want = ALL.filter((p) => +p[3] >= lo && +p[3] < hi).length;
  check(`chip ${key}: header counts exactly the ${want} puzzles (traps included by their estimated rating) in range`, counts[key] === want, String(counts[key]));
}
check('the four ranges add up to every puzzle', Object.values(counts).reduce((a, b) => a + b, 0) === ALL.length);
check('choice saved in localStorage (ot-prefs.tacRating)', await page.evaluate(() => JSON.parse(localStorage.getItem('ot-prefs')).tacRating) === 'r1300');
await page.reload(); await page.waitForSelector('#tac-grid .tcard');
check('choice survives a reload', await page.$eval('#tac-rating-seg button[data-rating="r1300"]', (b) => b.classList.contains('active')));
// a set with nothing at 1300+ falls back instead of a dead end; an impossible combination shows an empty state with a way out
const none = Object.entries(FILE).find(([, s]) => !s.some((p) => +p[3] >= 1300));
if (none) {
  await page.evaluate(() => window.__ot.goTab('tactics')); await page.waitForSelector('#tac-grid');
  const card = await page.$(`.tcard[data-id="${none[0]}"]`);
  check(`opening with no 1300+ puzzles (${none[0]}) is hidden from the list while 1300+ is picked`, !card);
  await page.evaluate((id) => window.__ot.startTacticsFor(id), none[0]); await waitPhase(page, 'user');
  check('"Practice tactics" on that opening still plays (all ratings) and says so', /showing all/.test(await page.textContent('#pz-eyebrow')) && (await page.evaluate(() => window.__tac.sess().queue.length)) === FILE[none[0]].length, await page.textContent('#pz-eyebrow'));
  await page.click('#pz-menu'); await page.waitForSelector('#tac-grid');
}
await tap(page, '#tac-theme-seg button[data-theme="trap"]');
await tap(page, '#tac-rating-seg button[data-rating="u900"]');
const trapsIn = ALL.filter((p) => p[0].startsWith('T-') && +p[3] < 900).length;
check(`traps use their estimated rating: Famous traps + <900 shows ${trapsIn} puzzles`, new RegExp(`${trapsIn} puzzles`).test(await page.textContent('#tac-count')), await page.textContent('#tac-count'));
// empty state: no real combination is empty in the shipped data, so strip the 1300+ puzzles from the loaded data to force one
await tap(page, '#tac-theme-seg button[data-theme="any"]');
await page.evaluate(() => { const d = window.__tac.data(); for (const k of Object.keys(d)) d[k] = d[k].filter((p) => p.rating < 1300); });
await tap(page, '#tac-rating-seg button[data-rating="r1300"]');
const empty = await page.$('.tac-empty');
check('an empty combination shows a friendly message and a disabled Mixed button', !!empty && /No puzzles match/.test(await empty.textContent()) && /1300\+/.test(await empty.textContent()) && await page.isDisabled('#tac-mixed'));
await shot(page, 'phone-tactics-empty-state');
await page.click('.tac-empty .btn'); await page.waitForSelector('#tac-grid .tcard');
check('"Show all ratings" resets the chip and brings the puzzles back', await page.$eval('#tac-rating-seg button[data-rating="all"]', (b) => b.classList.contains('active')) && !(await page.isDisabled('#tac-mixed')));
await tap(page, '#tac-theme-seg button[data-theme="any"]'); await tap(page, '#tac-rating-seg button[data-rating="u900"]');
await page.click('.tcard[data-id="fried-liver"]'); await waitPhase(page, 'user');
const q = await page.evaluate(() => window.__tac.sess().queue.map((p) => p.rating));
check('playing a set with <900 picked: every queued puzzle is under 900', q.length > 5 && q.every((r) => r < 900), `${q.length} puzzles, max ${Math.max(...q)}`);
check('the screen says which rating range is active', /<900/.test(await page.textContent('#pz-eyebrow')), await page.textContent('#pz-eyebrow'));
check('queue is easiest first (sorted by rating)', q.every((r, i) => i === 0 || r >= q[i - 1]));
await page.context().close();

// ---------------------------------------------------------------- the dock: Next puzzle without scrolling, score, fire streak
page = await newPage();
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
await page.click('.tcard[data-id="fried-liver"]'); await waitPhase(page, 'user');
check('dock sits right under the board (below the player tag, above everything else)', await page.evaluate(() => { const d = document.querySelector('#pz-dock').getBoundingClientRect(), t = document.querySelector('#pz-tag-bottom').getBoundingClientRect(); return d.top >= t.bottom - 1 && d.top - t.bottom < 20; }));
check('before solving: Next is dimmed/disabled, streak 0 cold, score 0/0', await page.isDisabled('#pz-next') && (await tier(page)) === '0' && (await page.textContent('#pz-sess-n')) === '0/0');
check('Next puzzle button is visible on screen (390x844) while playing', await inView(page, '#pz-next'));
let scrolled = 0;
const wm = await wrongMove(page);
await drag(page, wm.slice(0, 2), wm.slice(2, 4));
await page.waitForFunction(() => /state-mistake/.test(document.querySelector('#pz-feedback').className));
await solveCurrent(page);
check('after a solve with a retry: Next is enabled, in view with no scrolling, and the page was never scrolled', !(await page.isDisabled('#pz-next')) && await inView(page, '#pz-next') && (await page.evaluate(() => window.scrollY)) === 0, `scrollY ${await page.evaluate(() => window.scrollY)}`);
check('a retry is not a "first try": score 0/1, streak stays 0', (await page.textContent('#pz-sess-n')) === '0/1' && (await page.textContent('#pz-streak')) === '0' && (await page.textContent('#pz-sess-acc')) === '0% first try');
check('even with the stepper open and a long lesson, Next is in view', await inView(page, '#pz-next') && await page.isVisible('#pz-rv'));
// build a streak
for (let n = 1; n <= 5; n++) {
  await page.click('#pz-next'); await waitPhase(page, 'user');
  if (n === 1) check('Next loads the following puzzle; the button dims again until it is solved', await page.isDisabled('#pz-next'));
  await solveCurrent(page);
  check(`streak ${n}: counter ${n}, tier ${n >= 5 ? 2 : n >= 3 ? 1 : 0}, Next reachable without scrolling`, (await page.textContent('#pz-streak')) === String(n) && (await tier(page)) === String(n >= 5 ? 2 : n >= 3 ? 1 : 0) && await inView(page, '#pz-next') && (await page.evaluate(() => window.scrollY)) === 0);
  if (n === 3) await shot(page, 'phone-tactics-streak-3-solved');
}
check('score is 5/6 (83% first try) after five clean solves and one retry', (await page.textContent('#pz-sess-n')) === '5/6' && /83% first try/.test(await page.textContent('#pz-sess-acc')), `${await page.textContent('#pz-sess-n')} ${await page.textContent('#pz-sess-acc')}`);
let st = await state(page);
check('streak and best streak are saved (5 / 5)', st.tactics.streak === 5 && st.tactics.bestStreak === 5);
await shot(page, 'phone-tactics-streak-5-solved');
await page.click('#pz-next'); await waitPhase(page, 'user');
await shot(page, 'phone-tactics-streak-5-playing');
// a miss resets immediately
const w2 = await wrongMove(page);
await drag(page, w2.slice(0, 2), w2.slice(2, 4));
await page.waitForFunction(() => /state-mistake/.test(document.querySelector('#pz-feedback').className));
check('a wrong move resets the streak at once (display and saved), best streak kept', (await page.textContent('#pz-streak')) === '0' && (await tier(page)) === '0' && (await state(page)).tactics.streak === 0 && (await state(page)).tactics.bestStreak === 5 && (await page.textContent('#pz-best')) === 'best 5');
await shot(page, 'phone-tactics-after-miss');
await page.click('#pz-solution'); await waitPhase(page, 'over', 20000);
check('showing the solution counts as an attempt (5/7) and keeps the streak at 0', (await page.textContent('#pz-sess-n')) === '5/7' && (await page.textContent('#pz-streak')) === '0' && !(await page.isDisabled('#pz-next')) && await inView(page, '#pz-next'));
await page.click('#pz-next'); await waitPhase(page, 'user'); await page.click('#pz-skip'); await waitPhase(page, 'user');
check('skip counts as an attempt (5/8)', (await page.textContent('#pz-sess-n')) === '5/8');
await page.reload(); await page.waitForSelector('#tabbar');
check('best streak is still saved after a reload', (await state(page)).tactics.bestStreak === 5);
await page.context().close();

// ---------------------------------------------------------------- escalating fire (3 / 5 / 10) from a saved streak, plus the shots
const seedState = (streak, best) => ({ 'rt1500-progress': JSON.stringify({ v: 1, xp: 600, tactics: { solved: 14, flawless: streak, streak, bestStreak: best, traps: [], sets: {} } }) });
const tiers = {};
for (const [s, want] of [[2, '0'], [3, '1'], [5, '2'], [9, '2'], [10, '3'], [25, '3']]) {
  page = await newPage(seedState(s, Math.max(s, 12)));
  await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
  await page.click('.tcard[data-id="danish"]'); await waitPhase(page, 'user');
  tiers[s] = await tier(page);
  check(`saved streak ${s} shows fire tier ${want} and the flame looks different per tier`, tiers[s] === want && (await page.textContent('#pz-streak')) === String(s));
  if (s === 3 || s === 5 || s === 10) await shot(page, `phone-tactics-streak-${s}-playing`);
  if (s === 10) {
    const g = await page.evaluate(() => { const f = document.querySelector('.pz-flame'); const c = getComputedStyle(f); return { fs: c.fontSize, filter: c.filter }; });
    check('tier 3 flame is the largest (34px) with the blue inferno filter', g.fs === '34px' && /hue-rotate/.test(g.filter), JSON.stringify(g));
    check('Next puzzle is in view at streak 10 too', await inView(page, '#pz-next'));
  }
  await page.context().close();
}
check('no page errors', errors.length === 0, errors.join('|'));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
