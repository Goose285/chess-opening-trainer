// Review stepper: after a drill (and on a solved puzzle) step back/forward through the line with buttons, arrow keys,
// swipe and the clickable move list; the grade of each of your moves is shown at that step. Usage: node tools/e2e-stepper.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');

const sq = (k) => page.evaluate((k) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = k.charCodeAt(0) - 97, r = +k[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, k);
const book = () => page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); return window.__ot.bookMoves(s.book, s.game.fen()).map((san) => { const m = g.move(san); g.undo(); return { from: m.from, to: m.to }; })[0]; });
const turn = () => page.waitForFunction(() => { const s = window.__ot.getSession(); return s.phase === 'user' || s.phase === 'over'; }, null, { timeout: 30000 });
const fen = () => page.evaluate(() => window.__ot.getCg().getFen());
const idx = async () => (await page.textContent('#rv-bar .rv-pos')).trim();
const fb = () => page.evaluate(() => ({ cls: document.querySelector('#feedback').className, title: document.querySelector('#fb-title').textContent, text: document.querySelector('#fb-text').textContent, chips: document.querySelector('#fb-chips').textContent }));
async function swipe(sel, dx) {
  await page.evaluate(({ sel, dx }) => {
    const el = document.querySelector(sel), r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const t = (cx) => new Touch({ identifier: 7, target: el, clientX: cx, clientY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t(x)], targetTouches: [t(x)], changedTouches: [t(x)] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t(x + dx)] }));
  }, { sel, dx });
}

// ---- play the whole Italian line (book moves) as White, tapping
await page.evaluate(() => document.querySelector('.ocard[data-id="italian"]').click());
await page.click('#start-btn'); await page.waitForSelector('#board cg-board');
let n = 0;
while (true) {
  await turn(); if (await page.evaluate(() => window.__ot.getSession().phase === 'over')) break;
  const m = await book(); const A = await sq(m.from), B = await sq(m.to);
  await page.touchscreen.tap(A.x, A.y); await page.waitForTimeout(120); await page.touchscreen.tap(B.x, B.y);
  n++; await page.waitForFunction((n) => window.__ot.getSession().records.length >= n, n, { timeout: 15000 });
}
await page.waitForSelector('#summary:not(.hidden)');
check('Review board button is offered in the summary', /review/i.test(await page.textContent('#sum-review')), await page.textContent('#sum-review'));
await page.click('#sum-review'); await page.waitForSelector('#rv-bar:not(.hidden)');
const total = await page.evaluate(() => window.__ot.getSession().game.history().length);
check('summary closes and the step bar appears under the board', !(await page.isVisible('#summary')) && (await page.isVisible('#rv-bar')));
check('four step buttons: first, back, forward, last', (await page.$$eval('#rv-bar .rv-btn', (b) => b.map((x) => x.dataset.s))).join() === 'first,prev,next,last');
check('starts on the last move of the line', (await idx()).startsWith(`${total} / ${total}`), await idx());
check('forward / last are disabled at the end, back / first enabled', (await page.isDisabled('#rv-bar [data-s="next"]')) && (await page.isDisabled('#rv-bar [data-s="last"]')) && !(await page.isDisabled('#rv-bar [data-s="prev"]')));
check('board cannot be moved in review', await page.evaluate(() => !window.__ot.getCg().state.movable.color));

// buttons
await page.click('#rv-bar [data-s="first"]');
check('|< goes to the start position', (await fen()) === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR' && (await idx()).startsWith('0 /'), await fen());
check('at the start: first / back disabled, start-position note', (await page.isDisabled('#rv-bar [data-s="first"]')) && (await page.isDisabled('#rv-bar [data-s="prev"]')) && /Start position/.test((await fb()).title));
await page.click('#rv-bar [data-s="next"]'); await page.waitForTimeout(250);
let f = await fb();
check('> plays ply 1: board shows 1.e4, last-move highlighted, grade shown for your move', (await fen()).startsWith('rnbqkbnr/pppppppp/8/8/4P3/') && (await page.$$('#board square.last-move')).length === 2 && /state-book/.test(f.cls) && /Book/.test(f.title) && /e4/.test(f.text), JSON.stringify(f));
check('points are shown for your move', /100 pts/.test(f.text) && /Points/.test(f.chips), f.text);
await page.click('#rv-bar [data-s="next"]');
f = await fb();
check('> ply 2 is the computer reply (no grade, labelled as the book reply)', /state-idle/.test(f.cls) && /1… /.test(f.title) && /reply/i.test(f.text), JSON.stringify(f));
check('current move is highlighted in the move list and matches the step', (await page.$$eval('#movelist .m.cur', (c) => c.map((x) => x.dataset.ply))).join() === '2');
await page.click('#rv-bar [data-s="prev"]');
check('< steps back one ply', (await idx()).startsWith('1 /') && (await page.$$eval('#movelist .m.cur', (c) => c.map((x) => x.dataset.ply))).join() === '1');
await page.click('#rv-bar [data-s="last"]');
check('>| shows the final position of the game', await page.evaluate(() => { const s = window.__ot.getSession(); return window.__ot.getCg().getFen() === s.game.fen().split(' ')[0]; }));

// move list
await page.evaluate(() => document.querySelector('#movelist .m[data-ply="5"]').click());
check('tapping a move in the list jumps there', (await idx()).startsWith('5 /') && (await page.$$eval('#movelist .m.cur', (c) => c.map((x) => x.dataset.ply))).join() === '5');
const w5 = await page.evaluate(() => window.__ot.getSession().review.moves[4].san);
check('move list is clickable only in review (pointer cursor)', await page.evaluate(() => getComputedStyle(document.querySelector('#movelist .m[data-ply="5"]')).cursor === 'pointer'));
check('step label names the move', new RegExp('· ' + w5.replace('+', '\\+')).test(await idx()), await idx());

// keys
await page.keyboard.press('ArrowLeft'); check('ArrowLeft steps back', (await idx()).startsWith('4 /'));
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); check('ArrowRight steps forward', (await idx()).startsWith('6 /'));
await page.keyboard.press('Home'); check('Home goes to the start', (await idx()).startsWith('0 /'));
await page.keyboard.press('End'); check('End goes to the end', (await idx()).startsWith(`${total} /`));

// swipe
await page.click('#rv-bar [data-s="first"]');
await swipe('#board', -140); check('swipe left on the board = next move', (await idx()).startsWith('1 /'), await idx());
await swipe('#board', -140); await swipe('#board', 140); check('swipe right on the board = previous move', (await idx()).startsWith('1 /'), await idx());
await swipe('#board', 20); check('a tiny swipe does nothing', (await idx()).startsWith('1 /'));

// at the end the feedback offers what to do next
await page.click('#rv-bar [data-s="last"]');
check('at the last move there are next actions (New line / Openings)', /New line/.test(await page.textContent('#fb-actions')) && /Openings/.test(await page.textContent('#fb-actions')));
// mobile layout: step bar sits between the board and the grade card, all above the fold
const geo = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { board: r('#board'), bar: r('#rv-bar'), fb: r('#feedback'), vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth }; });
check('board fills the phone width (minus the 14px rank gutter)', Math.abs(geo.board.width - (geo.vw - 14)) <= 1 && Math.abs(geo.board.left - 14) <= 0.5, JSON.stringify(geo.board));
check('step bar is under the board and visible without scrolling', geo.bar.top >= geo.board.bottom - 1 && geo.bar.bottom <= geo.vh, `bar ${Math.round(geo.bar.top)}-${Math.round(geo.bar.bottom)} of ${geo.vh}`);
check('tap targets are at least 44px', await page.$$eval('#rv-bar .rv-btn', (b) => b.every((x) => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().width >= 44)));
check('no sideways scroll', geo.sw <= geo.vw);
// leaving review: a new line gets rid of the step bar and keys no longer step
await page.click('#fb-actions .btn.primary'); await page.waitForFunction(() => window.__ot.getSession().records.length === 0);
check('starting a new line removes the step bar', !(await page.isVisible('#rv-bar')));
await page.keyboard.press('ArrowLeft'); check('arrow keys do nothing outside review', await page.evaluate(() => !!window.__ot.getSession() && !window.__ot.getSession().review));

// ---- tactics: solved puzzle
await page.click('#menu-btn'); await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
await page.click('.tcard[data-id="fried-liver"]');
await page.waitForFunction(() => window.__tac && window.__tac.run() && window.__tac.run().phase === 'user');
check('no step bar while a puzzle is being solved', !(await page.isVisible('#pz-rv')));
await page.click('#pz-solution');
await page.waitForFunction(() => window.__tac.run().finished, null, { timeout: 20000 });
await page.waitForSelector('#pz-rv:not(.hidden)');
const info = await page.evaluate(() => { const r = window.__tac.run(); return { fen: r.p.fen.split(' ')[0], n: r.game.history().length, last: r.game.fen().split(' ')[0] }; });
const pidx = async () => (await page.textContent('#pz-rv .rv-pos')).trim();
check('solved puzzle shows the step bar at the end', (await pidx()).startsWith(`${info.n} / ${info.n}`), await pidx());
await page.click('#pz-rv [data-s="first"]');
check('|< shows the puzzle start position (before the opponent move)', (await page.evaluate(() => window.__tac.cg().getFen())) === info.fen && (await pidx()).startsWith('0 /'));
await page.click('#pz-rv [data-s="next"]'); await page.waitForTimeout(250);
check('> plays the opponent setup move with a last-move highlight', (await pidx()).startsWith('1 /') && (await page.$$('#pz-board square.last-move')).length === 2);
await page.keyboard.press('ArrowRight'); check('arrow keys work on the puzzle too', (await pidx()).startsWith('2 /'));
await swipe('#pz-board', 140); check('swipe works on the puzzle board', (await pidx()).startsWith('1 /'));
await page.keyboard.press('End'); check('End returns to the solved position', (await pidx()).startsWith(`${info.n} /`) && (await page.evaluate(() => window.__tac.cg().getFen())) === info.last);
await page.click('#pz-menu'); await page.waitForSelector('#tac-grid .tcard');
check('leaving closes the puzzle step bar', !(await page.isVisible('#pz-rv')));
check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
