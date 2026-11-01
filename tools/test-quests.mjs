// Opening of the Day + daily quests: pure rules (node) and the Home card in a 390x844 browser (progress bars, gold only when done,
// green Play it, midnight reset, persistence, trap quest through a real puzzle). Usage: node tools/test-quests.mjs [url] [screenshotDir]
import { chromium } from 'playwright-core';
import { stubAnalytics } from './lib-net.mjs';
import fs from 'node:fs';
import * as D from '../src/daily.js';
import * as P from '../src/progress.js';
import { OPENINGS } from '../src/openings.js';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOTS = process.argv[3] || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + String(x).slice(0, 300) : '')); };
const errors = [];

// ------------------------------------------------ pure rules
const gambits = OPENINGS.filter((o) => o.lines.length && o.gambit).map((o) => o.id);
const days = Array.from({ length: 120 }, (_, i) => P.dayKey(new Date(2026, 0, 1 + i)));
const picks = days.map((d) => D.openingOfTheDay(gambits, d));
check('Opening of the Day is a gambit, deterministic by date, and varies', picks.every((p) => gambits.includes(p)) && new Set(picks).size >= 30 && picks[5] === D.openingOfTheDay([...gambits].reverse(), days[5]), new Set(picks).size);
const kinds = new Set(days.map((d) => D.questKindsFor(d)[2]));
check('"Land 2 traps" and "perfect line" are in the daily rotation', kinds.has('traps') && kinds.has('perfect') && kinds.size === 8, [...kinds].join());
check('every day has 3 quests: today\'s opening, tactics, one extra', days.every((d) => { const k = D.questKindsFor(d); return k.length === 3 && k[0] === 'otd' && k[1] === 'puzzles'; }));

const NOW = new Date(2026, 5, 10, 12), today = P.dayKey(NOW);
const withKind = (kind) => days.find((d) => D.questKindsFor(d)[2] === kind);
const at = (kind) => { const d = withKind(kind), [y, m, dd] = d.split('-').map(Number); return { d, now: new Date(y, m - 1, dd, 12), ex: { easyIds: [], gambitIds: gambits, otdId: D.openingOfTheDay(gambits, d) } }; };
const pz = (o) => ({ kind: 'solved', id: 'T-1', trap: true, openingId: gambits[0], points: 40, wrongs: 0, hints: 0, setSize: 20, ...o });
{
  const { now, ex } = at('traps'); let s = P.freshState(), gained = 0;
  let r = P.applyPuzzle(s, pz({ id: 'T-1', wrongs: 1 }), ex, now);
  check('a trap solved with a mistake does not count', !r.state.daily.prog.traps);
  r = P.applyPuzzle(r.state, pz({ id: 'p-9', trap: false }), ex, now);
  check('an ordinary puzzle does not count towards traps', !r.state.daily.prog.traps);
  r = P.applyPuzzle(r.state, pz({ id: 'T-2' }), ex, now);
  check('first clean trap: 1/2, not done', r.state.daily.prog.traps === 1 && !r.state.daily.done.traps);
  const xp0 = r.state.xp; r = P.applyPuzzle(r.state, pz({ id: 'T-3' }), ex, now);
  check('second clean trap completes the quest: +40 XP, once', r.state.daily.done.traps === true && r.result.newQuests.includes('traps') && r.result.gained.quest >= 40 && r.state.xp === xp0 + r.result.gained.base + r.result.gained.star + r.result.gained.ach + r.result.gained.quest, JSON.stringify(r.result.gained));
  const again = P.applyPuzzle(r.state, pz({ id: 'T-4' }), ex, now);
  check('no double payment', !again.result.newQuests.includes('traps'));
}
{
  const { now, ex } = at('perfect');
  const run = (o) => ({ openingId: ex.otdId, gambit: true, lineCount: 5, side: 'white', moves: 10, points: 800, pct: 100, hints: 0, retries: 0, perfect: true, maxStreak: 5, variation: 'x', completed: true, ...o });
  let r = P.applyRun(P.freshState(), run({ perfect: false, pct: 95 }), ex, now);
  check('a line that is not perfect does not complete "perfect line"', !r.state.daily.done.perfect);
  r = P.applyRun(r.state, run({ completed: false, perfect: true }), ex, now);
  check('an unfinished line does not count', !r.state.daily.done.perfect);
  r = P.applyRun(r.state, run({ variation: 'y' }), ex, now);
  check('a perfect finished line completes it and pays the quest XP', r.state.daily.done.perfect === true && r.result.gained.quest >= 40 && r.result.newQuests.includes('perfect'));
}
{ // midnight: a new local date starts clean
  const { ex, now } = at('traps'); const r = P.applyPuzzle(P.freshState(), pz(), ex, now);
  const next = new Date(now.getTime() + 24 * 3600e3);
  const nx = { ...ex, otdId: D.openingOfTheDay(gambits, P.dayKey(next)) };
  const r2 = P.applyPuzzle(r.state, pz({ id: 'p-77', trap: false }), nx, next);
  check('after midnight yesterday\'s progress is gone and the new day\'s quests are set', r2.state.daily.day === P.dayKey(next) && !r2.state.daily.prog.traps && !r2.state.daily.done.traps && JSON.stringify(r2.state.daily.kinds) === JSON.stringify(D.questKindsFor(P.dayKey(next))));
}

// ------------------------------------------------ browser
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
stubAnalytics(browser);
const ALL = JSON.parse(fs.readFileSync(new URL('../tactics/tactics.json', import.meta.url), 'utf8')).sets;
async function open(daily, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
  await page.goto(BASE + '#/home'); await page.evaluate(() => localStorage.clear());
  if (daily) await page.evaluate(([d, x]) => localStorage.setItem('rt1500-progress', JSON.stringify({ v: 1, ...x, daily: d })), [daily, extra]);
  await page.reload(); await page.waitForSelector('#home-daily .daily-card'); await page.waitForTimeout(500);
  return page;
}
const todayKey = new Date().toLocaleDateString('en-CA');
const otdNow = D.openingOfTheDay(gambits, todayKey), otdName = OPENINGS.find((o) => o.id === otdNow).name;
const mk = (kinds, prog, done) => ({ day: todayKey, otd: otdNow, kinds, prog, done });
const shotOf = async (page, name) => { if (!SHOTS) return; await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
let page = await open(mk(['otd', 'puzzles', 'traps'], { puzzles: 2, traps: 1 }, {}));
check('Home shows the gambit of the day with a green "Play it" button', (await page.textContent('#home-daily h3')) === otdName && await page.$eval('#home-daily [data-daily="play"]', (b) => b.classList.contains('primary') && /Play it/.test(b.textContent) && getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)'));
check('the card sits above the progress strip and the rails (prominent)', await page.evaluate(() => { const y = (s) => document.querySelector(s).getBoundingClientRect().top; return y('#home-daily') < y('#profile-strip') && y('#profile-strip') < y('#home-rails'); }));
const bars = await page.$$eval('#home-daily .dq', (rows) => rows.map((r) => ({ kind: r.dataset.kind, w: Math.round(parseFloat(r.querySelector('.dq-bar i').style.width)), now: r.querySelector('.dq-bar').getAttribute('aria-valuenow'), max: r.querySelector('.dq-bar').getAttribute('aria-valuemax'), p: r.querySelector('.dq-p').textContent })));
check('each quest has a progress bar (0%, 67%, 50%)', JSON.stringify(bars.map((b) => [b.kind, b.w, b.p])) === JSON.stringify([['otd', 0, '0/1'], ['puzzles', 67, '2/3'], ['traps', 50, '1/2']]), JSON.stringify(bars));
check('the trap quest reads "Land 2 traps…"', /Land 2 traps/.test(await page.textContent('#home-daily .dq[data-kind="traps"] .dq-t')));
check('header says 0/3 done and resets at midnight', /0\/3 done · resets at midnight/.test(await page.textContent('#home-daily .dq-head')));
const gold = '245, 196, 81';
const colors = await page.evaluate(() => { const f = (s, p) => getComputedStyle(document.querySelector(s))[p]; return { fill: f('#home-daily .dq[data-kind="puzzles"] .dq-bar i', 'backgroundColor'), xp: f('#home-daily .dq-xp', 'color') }; });
check('XP reward is gold, the unfinished bar is white (gold only for achievements)', colors.xp.includes(gold) && colors.fill === 'rgb(255, 255, 255)', JSON.stringify(colors));
await shotOf(page, 'home-top-in-progress');
await page.evaluate(() => document.querySelector('#home-daily').scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -70));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/quests-in-progress.png` });
await page.close();

page = await open(mk(['otd', 'puzzles', 'perfect'], { otd: 1, puzzles: 3, perfect: 1 }, { otd: true, puzzles: true, perfect: true }));
check('completed quests turn gold, show 3/3 and the all-done note', await page.evaluate(() => { const g = 'rgb(245, 196, 81)'; const rows = [...document.querySelectorAll('#home-daily .dq.done')]; return rows.length === 3 && rows.every((r) => getComputedStyle(r.querySelector('.dq-bar i')).backgroundColor === g && getComputedStyle(r.querySelector('.dq-ck')).backgroundColor === g) && /3\/3 done/.test(document.querySelector('#home-daily .dq-head').textContent) && !!document.querySelector('#home-daily .dq-all'); }));
if (SHOTS) { await page.evaluate(() => document.querySelector('#home-daily').scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -70)); await page.screenshot({ path: `${SHOTS}/quests-all-done.png` }); }
await page.close();

// yesterday's quests (stale day) are replaced at local midnight
page = await open({ day: '2020-01-01', otd: 'x', kinds: ['otd', 'puzzles', 'traps'], prog: { puzzles: 3, traps: 2 }, done: { puzzles: true, traps: true } });
check('a stale day from yesterday shows fresh 0/3 quests for today', (await page.$$('#home-daily .dq.done')).length === 0 && /0\/3/.test(await page.textContent('#home-daily .dq-head')) && (await page.$$eval('#home-daily .dq', (r) => r.map((x) => x.dataset.kind))).join() === D.questKindsFor(todayKey).join());
await page.close();

// a real trap puzzle through the UI moves the trap bar and persists
const trapSet = Object.entries(ALL).find(([, ps]) => ps.some((p) => String(p[0]).startsWith('T-')));
page = await open(mk(['otd', 'puzzles', 'traps'], {}, {}));
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard'); await page.click(`.tcard[data-id="${trapSet[0]}"]`);
await page.waitForFunction(() => window.__tac && window.__tac.run());
await page.evaluate(() => { const s = window.__tac.sess(); s.queue[1] = window.__tac.data()[s.openingId].find((p) => p.trap); });
const sq = (k) => page.evaluate((k) => { const b = document.querySelector('#pz-board cg-board').getBoundingClientRect(); const o = window.__tac.run().color; const f = k.charCodeAt(0) - 97, r = +k[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, k);
async function solveCurrent() {
  for (let g = 0; g < 8; g++) {
    await page.waitForFunction(() => ['user', 'over'].includes(window.__tac.run().phase), null, { timeout: 15000 });
    const r = await page.evaluate(() => { const r = window.__tac.run(); return { phase: r.phase, idx: r.idx, moves: r.p.moves }; });
    if (r.phase === 'over') break;
    const u = r.moves[r.idx], A = await sq(u.slice(0, 2)), B = await sq(u.slice(2, 4));
    await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.move(B.x, B.y, { steps: 6 }); await page.mouse.up();
    await page.waitForFunction((n) => { const x = window.__tac.run(); return x.phase === 'over' || x.idx > n; }, r.idx, { timeout: 15000 });
  }
}
await solveCurrent(); await page.waitForTimeout(500);
await page.click('#pz-next'); await page.waitForTimeout(400);
const isTrap = await page.evaluate(() => window.__tac.run().p.trap);
if (isTrap) {
  await solveCurrent(); await page.waitForTimeout(600);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-progress')).daily);
  check('landing a trap puzzle clean moves the trap quest to 1/2 and saves it', saved.prog.traps === 1 && !saved.done.traps, JSON.stringify(saved));
  await page.click('#pz-menu'); await page.click('.tab[data-tab="home"]'); await page.waitForSelector('#home-daily .dq', { state: 'visible' }); await page.waitForTimeout(300);
  check('Home now shows 1/2 and a half-full bar', (await page.textContent('#home-daily .dq[data-kind="traps"] .dq-p')) === '1/2' && Math.round(parseFloat(await page.$eval('#home-daily .dq[data-kind="traps"] .dq-bar i', (i) => i.style.width))) === 50);
} else check('trap puzzle queued for the UI test', false, 'could not queue a trap puzzle');
await page.close();
check('no JS errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
