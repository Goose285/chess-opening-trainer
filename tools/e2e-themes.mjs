// Board + piece theme picker: options, live application to drill and Watch boards, readability tweaks, persistence,
// asset files, phone layout. Usage: node tools/e2e-themes.mjs [url]   (SHOT=/path.png for the phone screenshot)
import { chromium } from 'playwright-core';
import { BOARDS, PIECE_SETS } from '../src/themes-data.js';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const SHOT = process.env.SHOT || '/workspace/road-to-1500-theme-picker-phone.png';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const hex = (h) => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
const root = (p) => page.evaluate((p) => getComputedStyle(document.documentElement).getPropertyValue(p).trim(), p);
const boardCss = () => page.evaluate(() => { const b = document.querySelector('#theme-body .tp-board, cg-board'); const cb = document.querySelector('cg-board'); return cb ? getComputedStyle(cb).backgroundColor : ''; });
const pieceImg = (sel) => page.evaluate((sel) => { const p = document.querySelector(sel); return p ? getComputedStyle(p, '::before').backgroundImage : ''; }, sel);

// ---- assets
const files = PIECE_SETS.flatMap((s) => ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'].map((c) => `pieces/${s.id}/${c}.svg`));
let bad = [];
for (const f of files) { const r = await ctx.request.get(new URL(f, URL_).href); if (!r.ok() || !/svg/.test(r.headers()['content-type'] || '') || (await r.body()).length < 100) bad.push(f); }
check(`all ${files.length} piece SVGs (${PIECE_SETS.length} sets × 12) load`, bad.length === 0, bad.slice(0, 3).join(','));
const cr = await ctx.request.get(new URL('THIRD_PARTY/PIECE-SET-CREDITS.md', URL_).href); const crt = await cr.text();
check('credits file is published and names every set + licence', cr.ok() && PIECE_SETS.every((s) => crt.toLowerCase().includes(s.id) && crt.includes(s.author.split(' (')[0])));

// ---- defaults + picker
check('theme button in the header', await page.$('#theme-btn') !== null);
check('default look = original board + merida', (await root('--sq-light')) === '#b58863' && (await page.evaluate(() => document.documentElement.dataset.pieces)) === 'merida');
await page.click('#theme-btn'); await page.waitForSelector('#theme:not(.hidden)');
check(`picker lists ${BOARDS.length} boards and ${PIECE_SETS.length} piece sets`, (await page.$$('#board-opts .topt')).length === BOARDS.length && (await page.$$('#piece-opts .topt')).length === PIECE_SETS.length);
check('the requested 7 boards are present with the requested colours', ['wood', 'green', 'ocean', 'neon', 'purple', 'desert', 'ice'].length === 7 && [['wood', '#f0d9b5', '#b58863'], ['green', '#eeeed2', '#769656'], ['ocean', '#dee3e6', '#8ca2ad'], ['neon', '#3a4660', '#1c2333'], ['purple', '#e8dff5', '#8e6fb5'], ['desert', '#f6e3c5', '#d2774c'], ['ice', '#e9eef2', '#5d7a91']].every(([id, l, d]) => { const b = BOARDS.find((x) => x.id === id); return b && b.light === l && b.dark === d; }));
check('every option has a live mini preview', (await page.$$('#board-opts .bo-mini')).length === BOARDS.length && (await page.$$('#piece-opts .po-pcs i')).length === PIECE_SETS.length * 6 && (await page.$('.theme-preview .tp-board')) !== null);
check('current board/pieces are marked selected', (await page.$eval('#board-opts .topt.on', (e) => e.dataset.board)) === 'original' && (await page.$eval('#piece-opts .topt.on', (e) => e.dataset.pieces)) === 'merida');
check('picker has no warning icons and lists only the four commercial-OK sets', !/⚠/.test(await page.textContent('#theme')) && (await page.$$('#piece-opts .topt')).length === 4 && PIECE_SETS.map((s) => s.id).join() === 'cburnett,merida,pixel,kosal');
check('every piece option shows its licence', (await page.$$eval('#piece-opts .topt-lic', (l) => l.map((x) => x.textContent.trim()))).join() === 'GPLv2+,GPLv2+,AGPLv3+,CC BY 4.0');

// ---- every board applies to the page
for (const b of BOARDS) {
  await page.click(`#board-opts [data-board="${b.id}"]`);
  const okb = (await root('--sq-light')) === b.light && (await root('--sq-dark')) === b.dark && (await page.evaluate(() => document.documentElement.dataset.board)) === b.id && (await page.$eval('#tp-board-name', (e) => e.textContent)) === b.name;
  if (!okb) check(`board ${b.id} applies`, false);
}
check('all boards apply colours + live preview name', true);
// ---- every piece set switches the artwork
let pieceBad = [];
for (const s of PIECE_SETS) {
  await page.click(`#piece-opts [data-pieces="${s.id}"]`);
  const lic = await page.$eval('#tp-lic', (e) => e.textContent);
  const img = await page.evaluate(() => { const i = document.querySelector('#theme .tp-pc'); return i ? i.style.backgroundImage : ''; });
  if (!img.includes(`pieces/${s.id}/`) || !lic.includes(s.license)) pieceBad.push(s.id);
}
check('every piece set updates the preview + licence badge', pieceBad.length === 0, pieceBad.join(','));

// ---- drill board
await page.click('#board-opts [data-board="ocean"]'); await page.click('#piece-opts [data-pieces="merida"]');
await page.click('#theme-close'); await page.waitForSelector('#theme.hidden', { state: 'attached' });
await page.click('.ocard[data-id="italian"]'); await page.click('#start-btn'); await page.waitForSelector('#board piece');
check('drill board uses the chosen board colours', (await boardCss()) === hex('#dee3e6'));
check('drill board uses the chosen piece set', /pieces\/merida\/wP\.svg/.test(await pieceImg('#board piece.pawn.white')), await pieceImg('#board piece.pawn.white'));
check('square highlights/selection follow the board theme', await page.evaluate(() => { const s = document.createElement('square'); s.className = 'last-move'; document.querySelector('cg-board').appendChild(s); const c = getComputedStyle(s).backgroundColor; s.remove(); return c === 'rgba(255, 214, 102, 0.6)'; }));
const co = await page.evaluate(() => [...document.querySelectorAll('#board coords coord')].map((c) => getComputedStyle(c).color));
check('coordinates are outside the board in one neutral colour (independent of the board theme)', co.length >= 16 && new Set(co).size === 1 && co[0] === 'rgb(163, 163, 163)', [...new Set(co)].join('|'));
// live change while a board is on screen
await page.click('#train [data-open-theme]'); await page.click('#board-opts [data-board="neon"]'); await page.click('#piece-opts [data-pieces="kosal"]');
check('changing theme updates the open drill board live', (await boardCss()) === hex('#3a4660') && /pieces\/kosal\/wP\.svg/.test(await pieceImg('#board piece.pawn.white')));
const glow = await page.evaluate(() => ({ b: getComputedStyle(document.querySelector('#board piece.black'), '::before').filter, w: getComputedStyle(document.querySelector('#board piece.white'), '::before').filter }));
check('Midnight Neon: dark pieces get a light halo, white pieces are untouched', /drop-shadow/.test(glow.b) && glow.w === 'none', JSON.stringify(glow));
await page.click('#theme-close');
await page.screenshot({ path: '/tmp/th-drill-neon.png' });
// ---- arrows follow the board
await page.evaluate(() => window.__ot.getCg().set({ drawable: { autoShapes: [{ orig: 'e2', dest: 'e4', brush: 'green' }] } }));
await page.waitForTimeout(80);
const arrowCol = await page.evaluate(() => { const l = document.querySelector('#board .cg-shapes line'); return l ? l.getAttribute('stroke') : null; });
check('arrow colour follows the board (neon green)', arrowCol === '#39ff88', String(arrowCol));
await page.evaluate(() => window.__ot.getCg().set({ drawable: { autoShapes: [] } }));

// ---- persistence
await page.reload(); await page.waitForSelector('.ocard');
check('choice persists across reload (localStorage)', (await root('--sq-light')) === '#3a4660' && (await page.evaluate(() => document.documentElement.dataset.pieces)) === 'kosal' && (await page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-theme')))).board === 'neon');
await page.click('.ocard[data-id="italian"]'); await page.click('#start-btn'); await page.waitForSelector('#board piece');
check('after reload the drill board still wears the saved theme', (await boardCss()) === hex('#3a4660') && /kosal/.test(await pieceImg('#board piece.pawn.white')));
await page.evaluate(() => localStorage.setItem('rt1500-theme', '{"board":"nope","pieces":"x"}')); await page.reload(); await page.waitForSelector('.ocard');
check('a corrupt saved theme falls back to the default', (await root('--sq-light')) === '#b58863');

// ---- Watch-it-first board
await page.evaluate(() => localStorage.setItem('rt1500-theme', JSON.stringify({ board: 'purple', pieces: 'merida' }))); await page.reload(); await page.waitForSelector('.ocard');
await page.click('.ocard[data-id="italian"] .mini[data-act="watch"]'); await page.waitForSelector('#demo-board piece');
check('Watch board uses the saved board + pieces', (await page.evaluate(() => getComputedStyle(document.querySelector('#demo-board cg-board')).backgroundColor)) === hex('#e8dff5') && /merida\/wP\.svg/.test(await pieceImg('#demo-board piece.pawn.white')));
await page.click('#demo-next'); await page.click('#demo-next'); await page.waitForTimeout(500);
const dArrow = await page.evaluate(() => { const l = document.querySelector('#demo-board .cg-shapes line'); return l && l.getAttribute('stroke'); });
check('Watch arrows use the board arrow colours', dArrow === '#1e8e3e' || dArrow === '#c62828', String(dArrow));

// ---- reset + keyboard
await page.reload(); await page.waitForSelector('.ocard');
await page.click('#theme-btn'); await page.keyboard.press('Escape');
check('Escape closes the picker', await page.$eval('#theme', (e) => e.classList.contains('hidden')));
await page.click('#theme-btn'); await page.click('#theme-reset');
check('Reset restores the default look (merida)', (await root('--sq-light')) === '#b58863' && (await page.evaluate(() => document.documentElement.dataset.pieces)) === 'merida');
await page.click('#theme-x');

// ---- phone
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const mp = await m.newPage(); mp.on('pageerror', (e) => errors.push(e.message));
await mp.goto(URL_); await mp.evaluate(() => localStorage.clear()); await mp.reload(); await mp.waitForSelector('.ocard');
check('phone: header (logo, status dot, theme button) fits on one line', await mp.evaluate(() => { const t = document.querySelector('.top').getBoundingClientRect(); return t.height < 76 && [...document.querySelectorAll('.top *')].every((e) => { const r = e.getBoundingClientRect(); return r.right <= innerWidth + .5 && r.left >= -.5; }); }));
await mp.tap('#theme-btn'); await mp.waitForSelector('#theme:not(.hidden)');
check('phone: picker fits the screen (no sideways scroll, nothing clipped)', await mp.evaluate(() => { const c = document.querySelector('#theme .modal-card').getBoundingClientRect(); const s = document.querySelector('#theme .theme-scroll'); return c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight + 1 && s.scrollWidth <= s.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }));
check('phone: option buttons are tap-sized', await mp.evaluate(() => [...document.querySelectorAll('#theme .topt')].every((b) => { const r = b.getBoundingClientRect(); return r.width >= 80 && r.height >= 44; })));
await mp.tap('#board-opts [data-board="neon"]'); await mp.tap('#piece-opts [data-pieces="cburnett"]');
await mp.evaluate(() => { document.querySelector('#theme .theme-scroll').scrollTop = 0; });
await mp.screenshot({ path: SHOT });
await mp.tap('#theme-close');
await mp.tap('.ocard[data-id="italian"]'); await mp.tap('#start-btn'); await mp.waitForSelector('#board piece');
check('phone: drill board shows the theme', (await mp.evaluate(() => getComputedStyle(document.querySelector('#board cg-board')).backgroundColor)) === hex('#3a4660'));
check('no JS/console errors', errors.length === 0, errors.slice(0, 2).join('|'));
await browser.close();
console.log(ok ? '\nALL THEME CHECKS PASSED' : '\nSOME THEME CHECKS FAILED'); process.exit(ok ? 0 : 1);
