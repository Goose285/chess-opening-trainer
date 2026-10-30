// "Watch it first" demo + "Learn more" popup, desktop and phone-size. Usage: node tools/e2e-learn.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const watch = (page) => {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
};
const ready = (page) => page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.classList.contains('hidden') && e.getBoundingClientRect().width > 0; }, sel);

// ------------------------------------------------------------------ desktop
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
watch(page);
await page.goto(URL_); await ready(page);
await page.click('#filter-seg button[data-filter="all"]');
const ids = await page.$$eval('.ocard', (c) => c.map((x) => x.dataset.id).filter((x) => x !== 'random'));
check('48 openings have Watch + Learn buttons', ids.length === 48 && (await page.$$('.ocard .mini[data-act="watch"]')).length === 48 && (await page.$$('.ocard .mini[data-act="learn"]')).length === 48);
check('start bar has a Watch button (disabled until an opening is picked)', await page.$eval('#watch-btn', (b) => b.disabled && /Watch/.test(b.textContent)));

// every opening: Learn-more popup content
let learnBad = [];
for (const id of ids) {
  await page.click(`.ocard[data-id="${id}"] .mini[data-act="learn"]`);
  const r = await page.evaluate(() => {
    const m = document.querySelector('#learn'); const q = (s) => m.querySelectorAll(s).length;
    return { open: !m.classList.contains('hidden'), title: document.querySelector('#learn-title').textContent, secs: q('.ln-sec'), li: q('.ln-plans li'), traps: q('.ln-trap'), len: document.querySelector('#learn-body').textContent.length };
  });
  if (!(r.open && r.secs >= 5 && r.li >= 6 && r.traps >= 2 && r.len > 700)) learnBad.push(id + JSON.stringify(r));
  await page.click('#learn-x');
  if (await visible(page, '#learn')) learnBad.push(id + ' did not close');
}
check('Learn-more popup renders full content for all 48 openings and closes', learnBad.length === 0, learnBad.slice(0, 3).join(' | '));

// close methods + focus return
await page.click('.ocard[data-id="italian"] .mini[data-act="learn"]');
check('popup shows opening name', /Italian/.test(await page.textContent('#learn-title')));
await page.keyboard.press('Escape');
check('Escape closes the popup', !(await visible(page, '#learn')));
await page.click('.ocard[data-id="italian"] .mini[data-act="learn"]');
await page.mouse.click(8, 8);
check('clicking the backdrop closes the popup', !(await visible(page, '#learn')));
await page.click('.ocard[data-id="italian"] .mini[data-act="learn"]'); await page.click('#learn-close');
check('"Got it" closes the popup', !(await visible(page, '#learn')));
check('clicking Learn more also selected the card', await page.$eval('.ocard[data-id="italian"]', (c) => c.classList.contains('selected')));

// every opening, every line: the demo plays all moves to the right final position
const bad = [];
for (const id of ids) {
  await page.click(`.ocard[data-id="${id}"] .mini[data-act="watch"]`);
  await page.waitForSelector('#demo:not(.hidden)');
  await page.click('#demo-play'); // pause the autoplay so stepping is deterministic
  const lines = await page.$$eval('#demo-line option', (o) => o.length);
  for (let li = 0; li < lines; li++) {
    await page.selectOption('#demo-line', String(li));
    await page.click('#demo-play'); // autoplay restarts on line change: pause it again
    const r = await page.evaluate(async () => {
      const { Chess, demoState } = window.__ot;
      const st = demoState();
      const chips = [...document.querySelectorAll('#demo-moves .dm')].map((b) => b.textContent.replace(/^\d+[.…]\s*/, ''));
      const g = new Chess(); for (const m of chips) g.move(m);
      const noteOk = []; // every step must show a non-empty note
      for (let i = 0; i < chips.length; i++) { document.querySelector('#demo-next').click(); await new Promise((r) => setTimeout(r, 8)); noteOk.push(document.querySelector('#demo-text').textContent.length > 4); }
      await new Promise((r) => setTimeout(r, 450));
      const pieces = document.querySelectorAll('#demo-board piece:not(.ghost)').length;
      const want = g.fen().split(' ')[0].replace(/[0-9\/]/g, '').length;
      return { total: st.total, n: chips.length, count: document.querySelector('#demo-count').textContent, pieces, want, notes: noteOk.every(Boolean), endBtn: document.querySelector('#demo-play').textContent, nextDisabled: document.querySelector('#demo-next').disabled };
    });
    if (!(r.count === `${r.n} / ${r.n}` && r.total === r.n && r.pieces === r.want && r.notes && r.nextDisabled && /Replay/.test(r.endBtn))) bad.push(`${id}#${li} ${JSON.stringify(r)}`);
    await page.click('#demo-restart');
  }
  await page.click('#demo-back');
}
check('Watch-it-first plays every line of all 48 openings to the correct final position, with a note on every move', bad.length === 0, bad.slice(0, 2).join(' | '));

// demo controls on one opening
await page.click('.ocard[data-id="fried-liver"]');
await page.click('#watch-btn');
await page.waitForSelector('#demo:not(.hidden)');
check('demo title + engine-free board', /Fried Liver/.test(await page.textContent('#demo-title')) && (await page.$$('#demo-board piece:not(.ghost)')).length === 32);
await page.waitForFunction(() => window.__ot.demoState().idx >= 1, null, { timeout: 8000 });
check('autoplay advances by itself', true);
await page.click('#demo-play');
let a = await page.evaluate(() => window.__ot.demoState());
await page.waitForTimeout(3500);
let b = await page.evaluate(() => window.__ot.demoState());
check('pause stops the playback', !a.playing && a.idx === b.idx && /Play/.test(await page.textContent('#demo-play')), `idx ${a.idx}->${b.idx}`);
await page.click('#demo-next'); await page.click('#demo-next');
const s2 = await page.evaluate(() => window.__ot.demoState());
check('next moves forward', s2.idx === a.idx + 2);
const shapes = await page.evaluate(() => document.querySelectorAll('#demo-board svg line, #demo-board svg g line, #demo-board svg path').length);
check('an arrow is drawn for the current move', shapes > 0, 'shapes=' + shapes);
check('last-move highlight on board', (await page.$$('#demo-board square.last-move')).length >= 1);
await page.click('#demo-prev');
check('prev steps back', (await page.evaluate(() => window.__ot.demoState().idx)) === a.idx + 1);
await page.click('#demo-restart');
check('restart returns to the start position', (await page.evaluate(() => window.__ot.demoState().idx)) === 0 && /Starting position/.test(await page.textContent('#demo-label')));
await page.click('#demo-speed button[data-speed="2"]');
check('speed control selects 2×', await page.$eval('#demo-speed button[data-speed="2"]', (x) => x.classList.contains('active')));
await page.click('#demo-play');
await page.waitForFunction(() => window.__ot.demoState().idx >= 2, null, { timeout: 12000 });
await page.click('#demo-play');
await page.keyboard.press('ArrowRight'); const k1 = await page.evaluate(() => window.__ot.demoState().idx);
await page.keyboard.press('ArrowLeft'); const k2 = await page.evaluate(() => window.__ot.demoState().idx);
check('arrow keys step through moves', k1 === k2 + 1);
await page.click('#demo-moves .dm[data-i="7"]');
const note7 = await page.textContent('#demo-text');
check('clicking a move chip jumps there, note explains the move', (await page.evaluate(() => window.__ot.demoState().idx)) === 7 && /f7/.test(note7), note7.slice(0, 80));
// learn from the demo
await page.click('#demo-learn');
check('Learn more opens from the demo', (await visible(page, '#learn')) && !(await visible(page, '#learn-watch')));
await page.click('#learn-x');
// practice
await page.click('#demo-practice');
await page.waitForSelector('#train:not(.hidden)');
check('Start practicing jumps into the drill', /Fried Liver/.test(await page.textContent('#opening-title')) && !(await visible(page, '#demo')));
await page.waitForFunction(() => window.__ot.getSession() && window.__ot.getSession().phase === 'user', null, { timeout: 30000 });
await page.click('#learn-btn');
let note = await page.textContent('#learn-body');
check('drill Learn more has a "This position" note (start)', /This position/.test(note) && /Starting position/.test(note));
await page.click('#learn-close');
// Learn-more during the drill, after moves (black opening: computer moves first)
await page.click('#menu-btn');
await page.click('#filter-seg button[data-filter="all"]');
await page.click('.ocard[data-id="caro"]');
await page.click('#start-btn');
await page.waitForFunction(() => { const s = window.__ot.getSession(); return s && s.opening.id === 'caro' && s.phase === 'user' && s.game.history().length === 1; }, null, { timeout: 30000 });
await page.click('#learn-btn');
note = await page.textContent('#learn-body');
check('drill note explains the last move', /This position/.test(note) && /Last move: 1\. e4/.test(note) && /Caro-Kann/.test(await page.textContent('#learn-title')), note.slice(0, 160).replace(/\s+/g, ' '));
check('drill popup keeps the board state (no Watch button that would abandon the run)', !(await visible(page, '#learn-watch')) && (await page.evaluate(() => window.__ot.getSession().game.history().length)) === 1);
await page.keyboard.press('Escape');
check('Escape closes it in the drill', !(await visible(page, '#learn')));

// ------------------------------------------------------------------ phone
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const m = await ctx.newPage(); watch(m);
await m.goto(URL_); await ready(m);
const noSide = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
check('phone: no sideways scroll on the opening list', await noSide(m));
await m.tap('.ocard[data-id="najdorf"]');
const bar = await m.evaluate(() => [...document.querySelectorAll('.startbar button')].map((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.width > 60; }));
check('phone: start bar buttons fit on screen', bar.length === 2 && bar.every(Boolean), JSON.stringify(bar));
await m.tap('.ocard[data-id="najdorf"] .mini[data-act="learn"]');
const lm = await m.evaluate(() => { const c = document.querySelector('#learn .modal-card').getBoundingClientRect(), x = document.querySelector('#learn-x').getBoundingClientRect(), body = document.querySelector('#learn-body');
  return { top: c.top, bottom: c.bottom, left: c.left, right: c.right, xw: x.width, xh: x.height, xin: x.top >= c.top && x.bottom <= c.bottom, scrolls: body.scrollHeight > body.clientHeight, sw: document.documentElement.scrollWidth, locked: getComputedStyle(document.body).overflow, fonts: getComputedStyle(body.querySelector('p')).fontSize }; });
check('phone: popup fits the screen, close button is big and visible', lm.top >= 0 && lm.bottom <= 844 && lm.left >= 0 && lm.right <= 390 && lm.xw >= 40 && lm.xh >= 40 && lm.xin, JSON.stringify(lm));
check('phone: popup body scrolls and page behind is locked, no sideways scroll', lm.scrolls && lm.locked === 'hidden' && lm.sw <= 391);
await m.evaluate(() => { document.querySelector('#learn-body').scrollTop = 99999; });
check('phone: Got it / Watch buttons stay reachable after scrolling', await m.evaluate(() => { const r = document.querySelector('#learn-close').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
await m.tap('#learn-watch');
await m.waitForSelector('#demo:not(.hidden)');
check('phone: "Watch it first" from the popup opens the demo', /Najdorf/.test(await m.textContent('#demo-title')) && !(await visible(m, '#learn')));
check('phone: demo fits (no sideways scroll, board within width)', (await noSide(m)) && await m.evaluate(() => { const r = document.querySelector('#demo-board').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.width > 300; }));
await m.tap('#demo-play');
const ctl = await m.evaluate(() => [...document.querySelectorAll('#demo-restart,#demo-prev,#demo-play,#demo-next,#demo-practice,#demo-learn')].map((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 36; }));
check('phone: demo controls are on-screen and tappable', ctl.every(Boolean), JSON.stringify(ctl));
await m.tap('#demo-next'); await m.tap('#demo-next');
check('phone: tapping next steps the demo', (await m.evaluate(() => window.__ot.demoState().idx)) >= 2);
await m.tap('#demo-practice');
await m.waitForSelector('#train:not(.hidden)');
await m.waitForFunction(() => window.__ot.getSession() && window.__ot.getSession().phase === 'user', null, { timeout: 30000 });
await m.tap('#learn-btn');
check('phone: Learn more in the drill', (await visible(m, '#learn')) && /This position/.test(await m.textContent('#learn-body')));
await m.tap('#learn-x');
check('phone: closes with ✕', !(await visible(m, '#learn')) && (await noSide(m)));

check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(ok ? '\nALL LEARN/DEMO CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
