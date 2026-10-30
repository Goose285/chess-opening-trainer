// Haptics: light tap after your move, strong double buzz when the computer takes your piece, on/off toggle (persisted),
// Android (navigator.vibrate) and iOS (switch-checkbox) paths, silent in Watch mode. Usage: node tools/e2e-haptics.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const HIDE = () => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); });
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

async function open(mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...(mode === 'ios' ? { userAgent: IOS_UA } : {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(HIDE);
  await page.addInitScript((mode) => {
    window.__h = [];
    if (mode === 'android') navigator.vibrate = (p) => { window.__h.push({ t: Date.now(), p }); return true; };
    else { Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true }); }
    if (mode === 'ios') {
      const orig = HTMLLabelElement.prototype.click;
      HTMLLabelElement.prototype.click = function () { const sw = this.querySelector('input[type=checkbox][switch]'); if (sw) window.__h.push({ t: Date.now(), ios: true, gesture: !!(navigator.userActivation && navigator.userActivation.isActive) }); return orig.call(this); };
    }
  }, mode);
  await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
  return { ctx, page };
}
const calls = (page) => page.evaluate(() => window.__h);
const clear = (page) => page.evaluate(() => { window.__h = []; });
async function playLine(page, opening, color) {
  await page.evaluate((id) => document.querySelector(`.ocard[data-id="${id}"]`).click(), opening);
  await page.click(`#color-seg button[data-color="${color}"]`);
  await page.click('#start-btn'); await page.waitForSelector('#board cg-board');
  const sq = (s) => page.evaluate((sq) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, s);
  for (let i = 0; i < 40; i++) {
    await page.waitForFunction(() => { const s = window.__ot.getSession(); return s && (s.phase === 'user' || s.phase === 'over'); }, null, { timeout: 30000 });
    if (await page.evaluate(() => window.__ot.getSession().phase === 'over')) break;
    const m = (await page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); return window.__ot.bookMoves(s.book, s.game.fen()).map((san) => { const m = g.move(san); g.undo(); return { from: m.from, to: m.to }; }); }))[0];
    const a = await sq(m.from), b = await sq(m.to);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    await page.waitForFunction((n) => { const s = window.__ot.getSession(); return s.records.length > n || s.phase === 'over'; }, i, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(60);
  }
  await page.waitForFunction(() => window.__ot.getSession().phase === 'over', null, { timeout: 30000 });
  // what actually happened in the game
  return page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(); let userMoves = 0, compCaptures = 0, userCaptures = 0; const mine = s.userColor === 'white' ? 'w' : 'b'; for (const san of s.game.history()) { const mv = g.move(san); if (mv.color === mine) { userMoves++; if (mv.captured) userCaptures++; } else if (mv.captured) compCaptures++; } return { userMoves, compCaptures, userCaptures }; });
}
const isTap = (c) => c.p === 14, isBuzz = (c) => Array.isArray(c.p) && c.p.length === 3;

// ---------------------------------------------------------------- Android path (navigator.vibrate)
{
  const { ctx, page } = await open('android');
  check('vibration defaults to ON', (await page.evaluate(() => localStorage.getItem('rt1500-haptics'))) === null);
  const g = await playLine(page, 'kings-gambit', 'white');
  const h = await calls(page);
  check('the game had computer captures of the user\'s pieces', g.compCaptures >= 1, JSON.stringify(g));
  check('one light tap per user move', h.filter(isTap).length === g.userMoves, `${h.filter(isTap).length} taps / ${g.userMoves} moves`);
  check('one strong double buzz per computer capture of the user\'s piece', h.filter(isBuzz).length === g.compCaptures, `${h.filter(isBuzz).length} buzzes / ${g.compCaptures} captures`);
  check('the capture pattern is stronger than the tap (longer, 3-part)', (() => { const b = h.find(isBuzz); return b && b.p.reduce((x, y) => x + y, 0) > 14 * 5; })());
  check('nothing else vibrated during the run', h.length === h.filter(isTap).length + h.filter(isBuzz).length);
  // toggle off
  await page.click('#sum-menu'); await page.click('#theme-btn');
  check('Vibration switch is in the settings panel and on', (await page.getAttribute('#vib-switch', 'aria-checked')) === 'true');
  await clear(page); await page.click('#vib-switch');
  check('switching off persists and buzzes nothing', (await page.getAttribute('#vib-switch', 'aria-checked')) === 'false' && (await page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-haptics')).on)) === false && (await calls(page)).length === 0);
  await page.click('#vib-try'); await page.waitForTimeout(1300);
  const tr = await calls(page);
  check('"Try it" always buzzes (tap, then the capture buzz ~1 s later) even when off', tr.length === 2 && isTap(tr[0]) && isBuzz(tr[1]) && tr[1].t - tr[0].t >= 900, JSON.stringify(tr.map((c) => c.p)));
  await page.click('#theme-close'); await clear(page);
  const g2 = await playLine(page, 'kings-gambit', 'white').catch(async () => { await page.click('#sum-menu'); return playLine(page, 'kings-gambit', 'white'); });
  check('with vibration off, a whole game is silent', (await calls(page)).length === 0, String(g2.userMoves));
  await page.reload(); await page.waitForSelector('.ocard'); await page.click('#theme-btn');
  check('the off setting survives a reload', (await page.getAttribute('#vib-switch', 'aria-checked')) === 'false');
  await page.click('#vib-switch'); await page.click('#theme-close'); await clear(page);
  // Watch mode is silent
  await page.evaluate(() => { document.querySelector('#summary').classList.add('hidden'); });
  if (!(await page.$('#setup:not(.hidden)'))) await page.click('#menu-btn').catch(async () => { await page.click('#sum-menu'); });
  await page.click('.ocard[data-id="italian"] .mini[data-act="watch"]'); await page.waitForSelector('#demo:not(.hidden)');
  for (let i = 0; i < 6; i++) { await page.click('#demo-next'); await page.waitForTimeout(120); }
  check('Watch mode never vibrates', (await calls(page)).length === 0);
  await ctx.close();
}

// ---------------------------------------------------------------- iOS path (no navigator.vibrate)
{
  const { ctx, page } = await open('ios');
  check('iOS UA: no navigator.vibrate, haptic mode is the switch fallback', (await page.evaluate(() => typeof navigator.vibrate)) === 'undefined');
  const g = await playLine(page, 'kings-gambit', 'white');
  const h = await calls(page);
  check('a hidden <input type=checkbox switch> inside a <label> was created', await page.evaluate(() => !!document.querySelector('label input[type=checkbox][switch]')));
  const expected = g.userMoves * 1 + g.compCaptures * 3;
  check('iOS ticks: 1 per user move + 3 per computer capture', h.length === expected, `${h.length} ticks, expected ${expected} (${g.userMoves} moves, ${g.compCaptures} captures)`);
  const gest = h.filter((c) => c.gesture).length;
  console.log(`   info: ${gest}/${h.length} ticks fired while the page had user activation (Chromium's view; real iOS Safari decides for itself)`);
  await page.click('#sum-menu'); await page.click('#theme-btn');
  check('iOS note is shown', /iOS 18/.test(await page.textContent('#vib-note')));
  await page.waitForTimeout(2500); await clear(page); await page.click('#vib-try'); await page.waitForTimeout(1500);
  const tr = await calls(page);
  check('"Try it" on iOS: 1 tick, then 3 ticks about 1 s later', tr.length === 4, tr.map((c) => c.t - tr[0].t).join(","));
  await ctx.close();
}

// ---------------------------------------------------------------- desktop: no vibration hardware, must not break
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } }); const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message)); await page.addInitScript(HIDE);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true }); });
  await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
  await page.click('#theme-btn'); check('desktop: note says no vibration motor and Try it does not throw', /no vibration/i.test(await page.textContent('#vib-note')) && (await page.click('#vib-try').then(() => true).catch(() => false)));
  await ctx.close();
}
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
