// Gambit mastery map: pure rules (levels, grouping) and the 390x844 screen (levels shown, gold only on mastered, entry points,
// tap-to-train through a real line that moves a gambit from Unseen to Learning). Usage: node tools/test-mastery.mjs [url] [screenshotDir]
import { chromium } from 'playwright-core';
import { stubAnalytics } from './lib-net.mjs';
import fs from 'node:fs';
import { masteryOf, groupGambits, cellOf, summary, firstMoveOf, LEVELS } from '../src/mastery.js';
import { OPENINGS } from '../src/openings.js';
import * as P from '../src/progress.js';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOTS = process.argv[3] || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + String(x).slice(0, 300) : '')); };
const errors = [];

// ------------------------------------------------ pure rules
const rec = (o) => ({ runs: 0, done: 0, clean: 0, perfect: 0, best: 0, vars: [], tier: 'none', last: '', ...o });
check('never played, never watched → unseen', masteryOf(undefined, false) === 'unseen' && masteryOf(rec({}), false) === 'unseen');
check('watched only → learning', masteryOf(undefined, true) === 'learning');
check('played, below 2 clean runs (even a bronze) → learning', masteryOf(rec({ runs: 1 })) === 'learning' && masteryOf(rec({ runs: 2, done: 2, best: 80, tier: 'bronze', clean: 1 })) === 'learning');
check('silver star (2 clean runs) → solid', masteryOf(rec({ runs: 3, done: 3, clean: 2, tier: 'silver' })) === 'solid');
check('gold star (3 clean + a perfect, different lines) → mastered', masteryOf(rec({ runs: 6, done: 6, clean: 3, perfect: 1, vars: ['a', 'b'], tier: 'gold' })) === 'mastered');
{ // the map follows the real progress rules: drive applyRun and compare with the star tier
  let s = P.freshState(); const o = OPENINGS.find((x) => x.gambit), seen = [];
  const run = (v, perfect = false, pct = 95) => ({ openingId: o.id, gambit: true, lineCount: o.lines.length, side: o.side, moves: 10, points: 500, pct: perfect ? 100 : pct, hints: 0, retries: 0, perfect, maxStreak: 3, variation: v, completed: true });
  seen.push(cellOf(o, s).level);
  s = P.applyRun(s, run('a', false, 75), {}, new Date(2026, 5, 1)).state; seen.push(cellOf(o, s).level);
  s = P.applyRun(s, run('a'), {}, new Date(2026, 5, 1)).state; seen.push(cellOf(o, s).level);
  s = P.applyRun(s, run('b'), {}, new Date(2026, 5, 1)).state; seen.push(cellOf(o, s).level);
  s = P.applyRun(s, run('b', true), {}, new Date(2026, 5, 1)).state; seen.push(cellOf(o, s).level);
  check('real runs walk a gambit unseen → learning (70%+ bronze) → learning (1 clean) → solid (2 clean) → mastered (3 clean + perfect)', seen.join() === 'unseen,learning,learning,solid,mastered', seen.join());
  check('mastered on the map always equals the gold star', cellOf(o, s).level === 'mastered' && s.openings[o.id].tier === 'gold');
}
const groups = groupGambits(OPENINGS), all = OPENINGS.filter((o) => o.gambit && o.lines.length);
const ids = groups.flatMap((g) => g.items.map((o) => o.id));
check('every gambit appears exactly once, grouped by side then first move', ids.length === all.length && new Set(ids).size === all.length && groups.every((g) => g.items.every((o) => g.key === `${o.side}-${firstMoveOf(o)}`)), `${ids.length}/${all.length}`);
check('White groups come before Black groups; no empty group', groups.findIndex((g) => g.key.startsWith('black')) > groups.map((g) => g.key).lastIndexOf(groups.filter((g) => g.key.startsWith('white')).pop().key) - 1 && groups.every((g) => g.items.length));
const sm = summary(OPENINGS, P.freshState());
check('summary of a fresh player: all unseen', sm.total === all.length && sm.counts.unseen === all.length && sm.started === 0);

// ------------------------------------------------ browser
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
stubAnalytics(browser);
async function open(state, hash = '#/home') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
  await page.goto(BASE + '#/home'); await page.evaluate(() => localStorage.clear());
  if (state) await page.evaluate((x) => localStorage.setItem('rt1500-progress', JSON.stringify({ v: 1, ...x })), state);
  await page.goto(BASE + hash); await page.reload(); await page.waitForTimeout(600);
  return page;
}
const SEED = { openings: {
  'fried-liver': rec({ runs: 6, done: 6, clean: 4, perfect: 1, best: 100, vars: ['a', 'b', 'c'], tier: 'gold' }),
  'kings-gambit': rec({ runs: 3, done: 3, clean: 2, best: 95, vars: ['a', 'b'], tier: 'silver' }),
  'evans': rec({ runs: 1, done: 1, best: 75, vars: ['a'], tier: 'bronze' }),
  'budapest': rec({ runs: 2, done: 1, clean: 1, best: 92, vars: ['a'] }),
  'london': rec({ runs: 4, done: 4, clean: 3, perfect: 1, best: 100, vars: ['a', 'b'], tier: 'gold' }),   // not a gambit: must not appear
}, watched: ['danish'] };
const level = (page, id) => page.$eval(`.mm-cell[data-train="${id}"]`, (c) => [...c.classList].find((x) => x.startsWith('lv-')).slice(3));
let page = await open(SEED);
check('Home has the Mastery map card with the mastered count (gold only because 1 is mastered)', await page.evaluate(() => { const e = document.querySelector('#home-mastery .mm-entry'); const n = e.querySelector('em'); return !!e && /1 of 37 mastered/.test(e.textContent) && /201, 169, 97|216, 192, 138/.test(getComputedStyle(n).color); }));
check('the card sits below Opening of the Day and above the rails', await page.evaluate(() => { const y = (s) => document.querySelector(s).getBoundingClientRect().top; return y('#home-daily') < y('#home-mastery') && y('#home-mastery') < y('#home-rails'); }));
if (SHOTS) { await page.evaluate(() => document.querySelector('#home-mastery').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/home-entry-card.png` }); }
await page.click('#home-mastery .mm-entry'); await page.waitForSelector('.mm-cell');
check('the map opens at #/mastery with all 37 gambits and none of the non-gambits', page.url().endsWith('#/mastery') && (await page.$$('.mm-cell')).length === all.length && (await page.$$('.mm-cell[data-train="london"]')).length === 0);
const lv = Object.fromEntries(await Promise.all(['fried-liver', 'kings-gambit', 'evans', 'budapest', 'danish', 'traxler'].map(async (i) => [i, await level(page, i)])));
check('levels from stats: gold→mastered, silver→solid, bronze/played/watched→learning, untouched→unseen', JSON.stringify(lv) === JSON.stringify({ 'fried-liver': 'mastered', 'kings-gambit': 'solid', evans: 'learning', budapest: 'learning', danish: 'learning', traxler: 'unseen' }), JSON.stringify(lv));
check('summary says 1 of 37 mastered, 5 started', /1 of 37 gambits mastered/.test(await page.textContent('.mm-sum')) && /5 started/.test(await page.textContent('.mm-sum')), await page.textContent('.mm-sum'));
check('"3/14 lines" style coverage and best accuracy are shown', /3\/14 lines/.test(await page.textContent('.mm-cell[data-train="fried-liver"]')) && /100%/.test(await page.textContent('.mm-cell[data-train="fried-liver"]')));
const goldy = await page.evaluate(() => {
  const isGold = (c) => /201, 169, 97|216, 192, 138/.test(c);
  const bad = [];
  document.querySelectorAll('.mm-cell').forEach((cell) => {
    const lvl = [...cell.classList].find((x) => x.startsWith('lv-'));
    const els = [cell, ...cell.querySelectorAll('*')];
    const uses = els.some((e) => { const s = getComputedStyle(e); return isGold(s.color) || isGold(s.backgroundColor) || isGold(s.borderTopColor); });
    if (uses && lvl !== 'lv-mastered') bad.push(cell.dataset.train + ':' + lvl);
    if (!uses && lvl === 'lv-mastered') bad.push('mastered-without-gold:' + cell.dataset.train);
  });
  const nonCell = [...document.querySelectorAll('.mm-head *, .mm-legend li:not(.lv-mastered) *, .mm-group h2, .mm-group h2 *')].filter((e) => { const s = getComputedStyle(e); return isGold(s.color) || isGold(s.backgroundColor); }).length;
  return { bad, nonCell };
});
check('gold appears only on mastered gambits (no gold on unseen, learning or solid, headers or legend)', goldy.bad.length === 0 && goldy.nonCell === 0, JSON.stringify(goldy));
check('no sideways scroll on a phone', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
check('groups are titled by side and first move', (await page.$$eval('.mm-group h2', (h) => h.map((x) => x.firstChild.textContent))).every((t) => /^As (White|Black) · /.test(t)));
if (SHOTS) {
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200); await page.screenshot({ path: `${SHOTS}/map-top.png` });
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.mm-group:nth-of-type(3)').offsetTop - 80)); await page.waitForTimeout(200); await page.screenshot({ path: `${SHOTS}/map-middle.png` });
  await page.screenshot({ path: `${SHOTS}/map-full-page.png`, fullPage: true });
}
await page.reload(); await page.waitForSelector('.mm-cell');
check('reload on #/mastery stays on the map', page.url().endsWith('#/mastery') && !(await page.$eval('#mastery', (m) => m.classList.contains('hidden'))));
await page.click('#mastery-back'); await page.waitForSelector('#home-mastery .mm-entry', { state: 'visible' });
check('back returns to Home', !(await page.$eval('#home', (m) => m.classList.contains('hidden'))));
// from Profile
await page.click('#profile-btn'); await page.click('#pf-mastery'); await page.waitForSelector('.mm-cell', { state: 'visible' });
check('the Profile sheet has a link to the map (closes the sheet, opens the map)', await page.$eval('#profile', (m) => m.classList.contains('hidden')) && !(await page.$eval('#mastery', (m) => m.classList.contains('hidden'))));
// tap to train
await page.click('.mm-cell[data-train="traxler"]'); await page.waitForSelector('#setup:not(.hidden) .ocard.selected');
check('tapping a gambit opens it selected in Openings, ready to start', (await page.$eval('#setup .ocard.selected', (c) => c.dataset.id)) === 'traxler');
await page.close();

// a real line: Unseen → Learning on the map
page = await open(null, '#/mastery'); await page.waitForSelector('.mm-cell');
check('fresh player: everything unseen, "0 of 37 mastered"', (await page.$$('.mm-cell.lv-unseen')).length === all.length && /0 of 37/.test(await page.textContent('.mm-sum')));
await page.click('.mm-cell[data-train="fried-liver"]'); await page.waitForSelector('#setup:not(.hidden) .ocard.selected');
await page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });
await page.click('#start-btn'); await page.waitForSelector('#board cg-board');
const sqc = (s) => page.evaluate((s) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = s.charCodeAt(0) - 97, r = +s[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, s);
for (let i = 0; i < 40; i++) {
  await page.waitForFunction(() => { const s = window.__ot.getSession(); return s && (s.phase === 'user' || s.phase === 'over'); }, null, { timeout: 30000 });
  if (await page.evaluate(() => window.__ot.getSession().phase === 'over')) break;
  const m = await page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); const mv = g.move(window.__ot.bookMoves(s.book, s.game.fen())[0]); return { from: mv.from, to: mv.to }; });
  const before = await page.evaluate(() => window.__ot.getSession().records.length);
  const a = await sqc(m.from), b = await sqc(m.to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up();
  await page.waitForFunction((k) => { const s = window.__ot.getSession(); return s.records.length > k && (s.phase === 'user' || s.phase === 'over'); }, before, { timeout: 20000 });
}
await page.waitForSelector('#summary:not(.hidden)', { timeout: 15000 });
await page.evaluate(() => window.__ot.goTab('mastery')); await page.waitForSelector('.mm-cell', { state: 'visible' });
check('after finishing a Fried Liver line the map shows it as Learning (1+ lines) and 1 started', (await level(page, 'fried-liver')) === 'learning' && /1 started/.test(await page.textContent('.mm-sum')) && /^[1-9]\/14 lines/.test((await page.textContent('.mm-cell[data-train="fried-liver"] .mm-lines')).trim()), await page.textContent('.mm-cell[data-train="fried-liver"]'));
await page.close();
check('no JS errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
