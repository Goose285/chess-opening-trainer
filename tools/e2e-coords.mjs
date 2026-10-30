// Board coordinates: outside the board (ranks in a left gutter, files in a strip below), Inter subset font, correct for White and
// Black, on drill / puzzle / watch-demo boards at 320-430px phone widths. Usage: node tools/e2e-coords.mjs [url]
import { chromium } from 'playwright-core';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOT = '';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
async function geom(page, sel, label, color, w) {
  const g = await page.evaluate(({ sel }) => {
    const host = document.querySelector(sel); const hb = host.querySelector('cg-board').getBoundingClientRect();
    const rk = [...host.querySelectorAll('coords.ranks coord')].map((c) => { const r = c.getBoundingClientRect(); return { t: c.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left }; });
    const fl = [...host.querySelectorAll('coords.files coord')].map((c) => { const r = c.getBoundingClientRect(); return { t: c.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const cs = getComputedStyle(host.querySelector('coords.files coord'));
    return { hb: { l: hb.left, t: hb.top, w: hb.width, h: hb.height }, rk, fl, ff: cs.fontFamily, fs: cs.fontSize, col: cs.color, fontOK: document.fonts.check('600 12px "Pawnado Coords"'), tt: cs.textTransform, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, vw: innerWidth, fh: host.querySelector('coords.files').getBoundingClientRect().bottom };
  }, { sel });
  const exp = color === 'black' ? 'hgfedcba' : 'abcdefgh', expR = color === 'black' ? '12345678' : '87654321';
  const sq = g.hb.w / 8;
  check(`${label} ${w}px: files read ${exp} left-to-right`, g.fl.map((f) => f.t).join('') === 'abcdefgh' && [...g.fl].sort((a, b) => a.x - b.x).map((f) => f.t).join('') === exp);
  check(`${label} ${w}px: ranks read ${expR} top-to-bottom`, [...g.rk].sort((a, b) => a.y - b.y).map((f) => f.t).join('') === expR);
  check(`${label} ${w}px: each file letter centred under its column (<=1.5px)`, [...g.fl].sort((a, b) => a.x - b.x).every((f, i) => Math.abs(f.x - (g.hb.l + (i + .5) * sq)) < 1.5));
  check(`${label} ${w}px: each rank centred on its row (<=1.5px)`, [...g.rk].sort((a, b) => a.y - b.y).every((f, i) => Math.abs(f.y - (g.hb.t + (i + .5) * sq)) < 1.5));
  check(`${label} ${w}px: nothing clipped by the viewport (letters inside 0..${w})`, g.fl.every((f) => f.x > 3 && f.x < w - 3) && g.rk.every((r) => r.l >= 0), `h-gutter-left=${Math.min(...g.rk.map((r) => r.l)).toFixed(1)}`);
  check(`${label} ${w}px: no horizontal page scroll`, g.sw <= g.cw, `${g.sw}/${g.cw}`);
  check(`${label} ${w}px: Inter subset loaded, 12px, no uppercase`, g.fontOK && g.ff.startsWith('"Pawnado Coords"') && g.fs === '12px' && g.tt === 'none', g.ff);
  console.log(`   board ${g.hb.w.toFixed(1)}px at x=${g.hb.l.toFixed(1)} (${(g.hb.w / w * 100).toFixed(1)}% of ${w}px)`);
  return g;
}
for (const w of [320, 360, 390, 430]) for (const color of ['white', 'black']) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '#/openings'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
  await page.click('.ocard[data-id="italian"]'); await page.click(`#color-seg button[data-color="${color}"]`); await page.click('#start-btn'); await page.waitForSelector('#board cg-board'); await page.waitForTimeout(900);
  await geom(page, '#board', `drill/${color}`, color, w);
  if (SHOT && w === 390) { const bb = await (await page.$('#board')).boundingBox(); await page.screenshot({ path: `${SHOT}-${color}.png`, clip: { x: 0, y: Math.max(0, bb.y - 150), width: 390, height: bb.height + 150 + 150 } }); await page.screenshot({ path: `${SHOT}-${color}-full.png` }); }
  check(`drill/${color} ${w}px: no page errors`, errs.length === 0, errs.join('|'));
  await ctx.close();
}
// puzzle + demo boards
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const page = await ctx.newPage();
  await page.goto(BASE + '#/openings'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
  await page.evaluate(() => window.__ot.goTab('tactics')); await page.waitForSelector('#tac-grid .tcard'); await page.click('#tac-grid .tcard'); await page.waitForSelector('#pz-board cg-board'); await page.waitForTimeout(900);
  const turn = await page.evaluate(() => document.querySelector('#pz-board').firstElementChild.className);
  const col = turn.includes('orientation-black') ? 'black' : 'white';
  await geom(page, '#pz-board', `puzzle/${col}`, col, 390);
  if (SHOT) await page.screenshot({ path: `${SHOT}-puzzle.png` });
  await ctx.close();
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p2 = await c2.newPage();
  await p2.goto(BASE + '#/openings'); await p2.evaluate(() => localStorage.clear()); await p2.reload(); await p2.waitForSelector('.ocard');
  await p2.click('.ocard[data-id="italian"]'); await p2.click('#watch-btn'); await p2.waitForSelector('#demo-board cg-board'); await p2.waitForTimeout(900);
  await geom(p2, '#demo-board', 'demo/white', 'white', 390);
  await c2.close();
  // black demo
  const c3 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p3 = await c3.newPage();
  await p3.goto(BASE + '#/openings'); await p3.evaluate(() => localStorage.clear()); await p3.reload(); await p3.waitForSelector('.ocard');
  const bid = 'najdorf';
  if (bid) { await p3.click(`.ocard[data-id="${bid}"]`); await p3.click('#watch-btn'); await p3.waitForSelector('#demo-board cg-board'); await p3.waitForTimeout(900); await geom(p3, '#demo-board', 'demo/black', 'black', 390); } else console.log('(no black-side opening exposed for demo test)');
}
await b.close(); console.log(ok ? '\nALL OK' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
