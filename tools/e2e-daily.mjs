// E2E: Opening of the Day + daily quests on Home, quest XP after a finished line, the "What's the idea?" notes (summary + Watch-it-first),
// and that trap lines / reply lines are offered in the Watch picker. Usage: node tools/e2e-daily.mjs [url]
import { chromium } from 'playwright-core';
import { openingOfTheDay } from '../src/daily.js';
import { OPENINGS } from '../src/openings.js';
import { dayKey } from '../src/progress.js';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/home';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + String(x).slice(0, 300) : '')); };
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(URL_);
await page.waitForSelector('#home-daily .daily-card');
const otd = openingOfTheDay(OPENINGS.filter((o) => o.lines.length).map((o) => o.id), dayKey());
const otdName = OPENINGS.find((o) => o.id === otd).name;
check('Home shows today\'s Opening of the Day (same pick as the pure function)', (await page.textContent('#home-daily h3')) === otdName, `${await page.textContent('#home-daily h3')} vs ${otdName}`);
check('three daily quests, none done yet', (await page.$$('#home-daily .dq')).length === 3 && (await page.$$('#home-daily .dq.done')).length === 0 && /0\/3/.test(await page.textContent('#home-daily .dq-head')));
check('the first quest names the opening of the day', (await page.textContent('#home-daily .dq .dq-t')).includes(otdName));
check('reload keeps the same opening (deterministic)', await (async () => { await page.reload(); await page.waitForSelector('#home-daily h3'); return (await page.textContent('#home-daily h3')) === otdName; })());

// play the opening of the day through the UI
await page.click('#home-daily [data-daily="play"]');
await page.waitForFunction(() => ['user', 'over'].includes(window.__ot.getSession()?.phase), null, { timeout: 30000 });
check('the Play button starts that opening', await page.evaluate((n) => window.__ot.getSession().opening.name === n, otdName));
const squareCenter = (sq) => page.evaluate((sq) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + 0.5) * b.width / 8, y: b.top + (y + 0.5) * b.height / 8 }; }, sq);
let n = 0;
while (n++ < 80) {
  if ((await page.evaluate(() => window.__ot.getSession().phase)) === 'over') break;
  const mv = await page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); const sans = window.__ot.bookMoves(s.book, s.game.fen()); const m = g.move(sans[Math.floor(Math.random() * sans.length)]); return { from: m.from, to: m.to }; });
  const before = await page.evaluate(() => window.__ot.getSession().records.length);
  const a = await squareCenter(mv.from), b = await squareCenter(mv.to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 3 }); await page.mouse.up();
  await page.waitForFunction((k) => { const s = window.__ot.getSession(); return s.records.length > k && (s.phase === 'user' || s.phase === 'over'); }, before, { timeout: 20000 });
}
await page.waitForSelector('#summary:not(.hidden)', { timeout: 10000 });
check('the summary shows a "What\'s the idea?" note for the finished line', (await page.isVisible('#sum-idea')) && /What's the idea/.test(await page.textContent('#sum-idea')) && (await page.textContent('#sum-idea')).length > 60, await page.textContent('#sum-idea'));
check('the daily quest pays XP in the rewards strip', /Daily quest/.test(await page.textContent('#sum-rewards')), await page.textContent('#sum-rewards'));
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-progress')).daily);
check('quest progress is saved under rt1500-progress', saved.day === new Date().toLocaleDateString('en-CA') && saved.otd === otd && saved.done.otd === true && saved.kinds.length === 3, JSON.stringify(saved));
await page.click('#sum-menu'); await page.evaluate(() => { location.hash = '#/home'; });
await page.click('.tab[data-tab="home"], [data-tab="home"]').catch(() => {});
await page.waitForSelector('#home-daily .dq.done');
check('Home now ticks the first quest', (await page.$$('#home-daily .dq.done')).length >= 1 && /[1-3]\/3/.test(await page.textContent('#home-daily .dq-head')));

// Watch it first: last step shows the idea; the picker has reply and trap lines
await page.click('#home-daily [data-daily="watch"]');
await page.waitForSelector('#demo-line');
const opts = await page.$$eval('#demo-line option', (o) => o.map((x) => x.textContent));
check('the Watch picker lists the opponent-reply and trap lines', opts.some((t) => /^Reply /.test(t)) || !OPENINGS.find((o) => o.id === otd).gambit, opts.join(' | '));
await page.selectOption('#demo-line', { index: opts.length - 1 });
await page.waitForTimeout(300);
for (let i = 0; i < 120; i++) { if (await page.isDisabled('#demo-next')) break; await page.click('#demo-next'); await page.waitForTimeout(10); }
check('the last step of Watch-it-first shows the idea', (await page.isVisible('#demo-idea')) && /What's the idea/.test(await page.textContent('#demo-idea')), await page.textContent('#demo-idea'));
check('no JS errors', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: '/workspace/coords/daily-watch.png' });
await browser.close(); process.exit(ok ? 0 : 1);
