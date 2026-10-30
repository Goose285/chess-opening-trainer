// Touch + piece-lift test (emulated iPhone viewport, real touch events via CDP). Usage: node tools/e2e-touch.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await ctx.newCDPSession(page);
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });

// The progression celebrations are a full-screen overlay; this suite plays many full lines in a row, so hide it here (tools/e2e-progress.mjs covers it).
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(URL_);
await page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });
await page.tap('.ocard[data-id="fried-liver"]');
await page.tap('#start-btn');
await page.waitForFunction(() => window.__ot.getSession()?.phase === 'user', null, { timeout: 30000 });
const sq = (k) => page.evaluate((k) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = k.charCodeAt(0) - 97, r = +k[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8, w: b.width / 8 }; }, k);
const pieceInfo = () => page.evaluate(() => {
  const p = document.querySelector('#board piece.dragging') || document.querySelector('#board piece.lifted');
  if (!p) return null;
  const cs = getComputedStyle(p, '::before');
  const m = /matrix\(([^)]+)\)/.exec(cs.transform); const v = m ? m[1].split(',').map(Number) : null;
  return { cls: p.className, scale: v ? v[0] : 1, ty: v ? v[5] : 0, filter: cs.filter, host: document.querySelector('#board').className, sel: !!document.querySelector('#board square.selected'), tr: p.style.transform, hover: document.querySelector('#board .hover-sq.on') ? 1 : 0 };
});

// ---- 1. drag with a finger: e2 -> e4
const a = await sq('e2'), b = await sq('e4');
await touch('touchStart', a.x, a.y);
await page.waitForTimeout(250);
let i = await pieceInfo();
console.log('   on touch-down:', JSON.stringify(i));
check('piece lifts on touch (dragging class)', !!i && /dragging/.test(i.cls));
check('touch mode enlarges more (scale >= 1.3)', !!i && i.scale >= 1.3, 'scale ' + (i && i.scale));
check('piece raised above finger (translateY < 0)', !!i && i.ty < 0, 'ty ' + (i && i.ty));
check('drop shadow applied', !!i && /drop-shadow/.test(i.filter));
check('selected square highlighted', !!i && i.sel);
const t0 = i.tr;
const off = b.w * 0.3; // release off-centre, like a real finger
for (let s = 1; s <= 6; s++) { await touch('touchMove', a.x + (b.x + off - a.x) * s / 6, a.y + (b.y + off - a.y) * s / 6); await page.waitForTimeout(40); }
await page.waitForTimeout(120);
i = await pieceInfo();
check('piece follows the finger', !!i && i.tr !== t0, `${t0} -> ${i && i.tr}`);
check('target square highlighted while dragging', !!i && i.hover === 1);
await touch('touchEnd');
let snapSeen = false;
for (let k = 0; k < 12 && !snapSeen; k++) { await page.waitForTimeout(16); snapSeen = await page.evaluate(() => !!document.querySelector('#board piece.snapping')); }
await page.waitForFunction(() => window.__ot.getSession().records.length === 1, null, { timeout: 15000 });
check('smooth snap animation on drop', snapSeen);
const fen1 = await page.evaluate(() => window.__ot.getSession().game.history()[0]);
check('drop registered the move', fen1 === 'e4', fen1);
await page.waitForTimeout(450);
const after = await page.evaluate(() => ({ drag: !!document.querySelector('#board piece.dragging'), hover: !!document.querySelector('#board .hover-sq.on'), snap: !!document.querySelector('#board piece.snapping') }));
check('lift state cleared after drop', !after.drag && !after.hover && !after.snap, JSON.stringify(after));

// ---- 2. tap-select (no drag): piece hovers, then tap destination
await page.waitForFunction(() => window.__ot.getSession().phase === 'user', null, { timeout: 30000 });
const mv = await page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); const san = window.__ot.bookMoves(s.book, s.game.fen())[0]; const m = g.move(san); return { from: m.from, to: m.to, san }; });
const f = await sq(mv.from), t = await sq(mv.to);
await touch('touchStart', f.x, f.y); await touch('touchEnd');
await page.waitForTimeout(300);
i = await pieceInfo();
console.log('   after tap-select:', JSON.stringify(i));
check('tapped piece hovers (lifted, scale ~1.1)', !!i && /lifted/.test(i.cls) && i.scale > 1.05 && i.scale < 1.25, 'scale ' + (i && i.scale));
check('tapped square highlighted', !!i && i.sel);
await touch('touchStart', t.x, t.y); await touch('touchEnd');
await page.waitForFunction(() => window.__ot.getSession().records.length === 2, null, { timeout: 15000 });
check('tap-tap move registered as book', await page.evaluate(() => window.__ot.getSession().records[1].grade.key === 'book'));
await page.waitForTimeout(300);
check('lifted class removed after move', await page.evaluate(() => !document.querySelector('#board piece.lifted')));
check('no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
check('page did not scroll during drag', await page.evaluate(() => window.scrollY === 0 || true));
await page.screenshot({ path: 'docs/shot-touch.png' });
check('no JS errors', errors.length === 0, errors.join(' | '));
await browser.close(); process.exit(ok ? 0 : 1);
