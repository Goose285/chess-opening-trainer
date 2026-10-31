// Tactics end to end: lazy data load, pick by opening / mixed, setup move animation, multi-move solving, wrong-move retry,
// hint cap, show solution, skip, points / XP / streak / stars / badges, haptics, persistence, phone layout.
// Usage: node tools/e2e-tactics.mjs [url]   (serve the folder first: python3 -m http.server 8099)
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const HIDE = () => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); });
const VIBE = () => { window.__v = []; navigator.vibrate = (p) => { window.__v.push(p); return true; }; };

async function newPage(opts = {}) {
  const ctx = await browser.newContext(opts.phone ? { viewport: { width: opts.w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.reqs = []; page.on('request', (r) => page.reqs.push(r.url()));
  if (!opts.celebrate) await page.addInitScript(HIDE);
  await page.addInitScript(VIBE);
  await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
  return page;
}
const run = (page) => page.evaluate(() => { const r = window.__tac.run(); return r && { phase: r.phase, idx: r.idx, id: r.p.id, open: r.p.openingId, moves: r.p.moves, color: r.color, points: r.points, wrongs: r.wrongs, hints: r.hints, finished: r.finished, themes: r.p.themes, fen: r.game.fen(), hist: r.game.history().length }; });
const waitPhase = (page, ph, t = 15000) => page.waitForFunction((ph) => { const r = window.__tac && window.__tac.run(); return r && (Array.isArray(ph) ? ph : [ph]).includes(r.phase); }, ph, { timeout: t });
const sq = (page, k) => page.evaluate((k) => { const b = document.querySelector('#pz-board cg-board').getBoundingClientRect(); const o = window.__tac.run().color; const f = k.charCodeAt(0) - 97, r = +k[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, k);
const drag = async (page, a, b) => { const A = await sq(page, a), B = await sq(page, b); await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.move(B.x, B.y, { steps: 6 }); await page.mouse.up(); };
const playExpected = async (page) => { const r = await run(page); const u = r.moves[r.idx]; await drag(page, u.slice(0, 2), u.slice(2, 4)); };
/** play every remaining move of the current puzzle correctly; resolves when the puzzle is solved */
async function solveCurrent(page) {
  for (let guard = 0; guard < 6; guard++) {
    await waitPhase(page, ['user', 'over']);
    const r = await run(page); if (r.phase === 'over') return;
    await playExpected(page);
    await page.waitForFunction((n) => { const x = window.__tac.run(); return x.phase === 'over' || x.idx > n || (x.phase === 'user' && x.idx > n); }, r.idx, { timeout: 15000 });
  }
}
const clickNext = async (page) => { await page.click('#pz-fb-actions button.primary'); };
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-progress')));
const openSet = async (page, id) => { await page.evaluate(() => window.__ot.goTab('tactics')); await page.waitForSelector('#tac-grid .tcard'); await page.click(`.tcard[data-id="${id}"]`); await waitPhase(page, 'user'); };

// ---------------------------------------------------------------- 1. entry, lazy loading, home
let page = await newPage();
check('puzzle data is NOT downloaded on the opening screen (lazy)', !page.reqs.some((u) => u.includes('tactics.json')));
check('bottom tab bar has Openings and Tactics tabs (Openings active on the list)', (await page.$$eval('#tabbar .tab', (b) => b.map((x) => x.dataset.tab + (x.classList.contains('active') ? '*' : '')))).join() === 'home,openings*,tactics,profile');
await page.click('.tab[data-tab="tactics"]');
await page.waitForSelector('#tac-grid .tcard');
check('Tactics tab shows; tactics.json fetched once, only now', page.reqs.filter((u) => u.includes('tactics.json')).length === 1 && (await page.isVisible('#tactics')) && !(await page.isVisible('#setup')));
const cards = await page.$$('#tac-grid .tcard');
check('a card for every opening (53) plus a Mixed button', cards.length === 53 && (await page.isVisible('#tac-mixed')), String(cards.length));
const FILE = JSON.parse((await import('node:fs')).readFileSync(new URL('../tactics/tactics.json', import.meta.url), 'utf8')).sets; // expected counts come from the data file itself
const TOTAL = Object.values(FILE).reduce((n, a) => n + a.length, 0), TRAPSETS = Object.values(FILE).filter((a) => a.some((p) => p[0].startsWith('T-'))).length, TRAPN = Object.values(FILE).flat().filter((p) => p[0].startsWith('T-')).length;
check('header counts total puzzles', new RegExp(`53 openings · ${TOTAL} puzzles · 0 solved`).test(await page.textContent('#tac-count')), await page.textContent('#tac-count'));
check('cards show solved count, stars, and trap marks', new RegExp(`0 \\/ ${FILE['fried-liver'].length} solved`).test(await page.textContent('.tcard[data-id="fried-liver"]')) && (await page.$$('.tcard[data-id="fried-liver"] .stars i')).length === 3 && /trap/.test(await page.textContent('.tcard[data-id="fried-liver"]')));
// filters
await page.click('#tac-kind-seg button[data-kind="gambit"]');
const nG = (await page.$$('#tac-grid .tcard')).length;
await page.click('#tac-kind-seg button[data-kind="all"]'); await page.click('#tac-theme-seg button[data-theme="trap"]');
const nT = (await page.$$('#tac-grid .tcard')).length;
check('filters: Gambits only, and the "Famous traps" theme narrows the list to openings that have one', nG > 20 && nG < 53 && nT === TRAPSETS && new RegExp(`${TRAPN} puzzles`).test(await page.textContent('#tac-count')), `gambits ${nG}, trap sets ${nT}, ${await page.textContent('#tac-count')}`);
await page.click('#tac-theme-seg button[data-theme="any"]');
check('filter choice is remembered', await page.evaluate(() => JSON.parse(localStorage.getItem('ot-prefs')).tacTheme === 'any'));
await page.click('#tac-theme-seg button[data-theme="fork"]'); check('Forks theme: every card has at least one fork puzzle', (await page.$$('#tac-grid .tcard')).length >= 40); await page.click('#tac-theme-seg button[data-theme="any"]');

// ---------------------------------------------------------------- 2. play a set
await page.click('.tcard[data-id="fried-liver"]');
check('opens the puzzle screen; board shows the position before the opponent moves', await page.isVisible('#puzzle') && await page.isVisible('#pz-board cg-board'));
await waitPhase(page, 'user');
let r = await run(page);
check('the opponent\'s setup move was played (history = 1 ply), you have the other colour', r.hist === 1 && r.idx === 1 && r.color === (r.fen.split(' ')[1] === 'w' ? 'white' : 'black'), JSON.stringify({ hist: r.hist, idx: r.idx, color: r.color }));
check('board is oriented to your side and a last-move highlight shows the setup move', await page.evaluate(() => document.querySelector('#pz-board').classList.contains('orientation-' + window.__tac.run().color) && !!document.querySelector('#pz-board cg-board square.last-move')));
check('the theme is NOT shown before solving', !/Fork|Pin|Mate in|Free piece/.test(await page.textContent('#pz-fb-text')) && (await page.$$('.pz-theme')).length === 0);
check('feedback says whose move it is and how many moves', /to move/.test(await page.textContent('#pz-fb-text')), await page.textContent('#pz-fb-text'));
check('capture of your piece in the setup move buzzed (capture pattern)', await page.evaluate(() => window.__v.some((p) => Array.isArray(p) && p.length === 3)) || !(await page.evaluate(() => window.__tac.run().game.history({ verbose: true })[0].captured)));
// wrong move
const wrong = await page.evaluate(() => { const r = window.__tac.run(); const ex = r.p.moves[r.idx]; const mv = r.game.moves({ verbose: true }).find((m) => (m.from + m.to) !== ex.slice(0, 4) && !(() => { const t = new window.__ot.Chess(r.game.fen()); t.move(m); return t.isCheckmate(); })()); return mv.from + mv.to; });
const vBefore = await page.evaluate(() => window.__v.length);
await drag(page, wrong.slice(0, 2), wrong.slice(2, 4));
await page.waitForFunction(() => /state-mistake/.test(document.querySelector('#pz-feedback').className), null, { timeout: 5000 });
r = await run(page);
check('a wrong move is taken back with feedback and a retry (same position, still your turn, wrong counted)', r.phase === 'user' && r.wrongs === 1 && r.idx === 1 && r.hist === 1 && /Not quite/.test(await page.textContent('#pz-fb-title')) && /try again/i.test(await page.textContent('#pz-fb-text')) && /25 pts/.test(await page.textContent('#pz-fb-text')), await page.textContent('#pz-fb-text'));
check('wrong move gives its own haptic pattern (after the tap on the move)', await page.evaluate((n) => window.__v.slice(n).some((p) => Array.isArray(p) && p.length === 3 && p[0] === 16), vBefore), JSON.stringify(await page.evaluate(() => window.__v.slice(-3))));
// hint after a wrong attempt: capped at 5
await page.click('#pz-hint');
check('hint draws an arrow and promises 5 pts', (await page.$$('#pz-board svg .cg-shapes g, #pz-board svg g')).length > 0 && /just 5 points/.test(await page.textContent('#pz-fb-text')) && await page.isDisabled('#pz-hint'));
await playExpected(page);
await page.waitForFunction(() => { const x = window.__tac.run(); return x.points >= 5; }, null, { timeout: 8000 });
r = await run(page);
check('the hinted move scored exactly 5 (not 25 or 100)', r.points === 5, String(r.points));
await solveCurrent(page);
r = await run(page);
check('puzzle solved: phase over, finished', r.phase === 'over' && r.finished);
const pm = await page.evaluate(() => { const r = window.__tac.run(); return { n: Math.ceil((r.p.moves.length - 1) / 2), points: r.points }; });
check('score = 5 for the hinted move + 100 per remaining move', r.points === 5 + 100 * (pm.n - 1), `${r.points} for ${pm.n} moves`);
check('solved feedback names the theme with an explanation and shows points / XP', (await page.$$('.pz-theme')).length >= 1 && (await page.$$eval('.pz-lesson', (l) => l.some((x) => /:/.test(x.textContent)))) && /XP/.test(await page.textContent('#pz-fb-chips')) && /Points/.test(await page.textContent('#pz-fb-chips')), await page.textContent('#pz-fb-text'));
let st = await state(page);
const isTrap = r.id.startsWith('T-');
check('XP = the puzzle\'s points, counted once (+ badge XP); tactics.solved = 1; streak 0 (it was not first-try)', st.tactics.solved === 1 && st.tactics.streak === 0 && st.xp === r.points + 40 + (isTrap ? 60 : 0) /* Tactician (+ Trap Spotter) badge */, JSON.stringify({ xp: st.xp, pts: r.points, t: st.tactics.solved }));
check('"Tactician" badge unlocked by the first solve', !!st.ach['tac-first']);
check('progress chip in the profile header is updated', /Lv/.test(await page.textContent('#profile-btn')));
// flawless puzzle(s) -> streak
await clickNext(page); await waitPhase(page, 'user');
check(`Next puzzle loads (2 / ${FILE['fried-liver'].length}), setup move played again`, new RegExp(`^2 / ${FILE['fried-liver'].length}$`).test(await page.textContent('#pz-n')) && (await run(page)).hist === 1);
await solveCurrent(page); st = await state(page);
check('first-try solve starts the puzzle streak (shown on screen)', st.tactics.streak === 1 && (await page.textContent('#pz-streak')) === '1' && /Solved — first try/.test(await page.textContent('#pz-fb-title')));
await clickNext(page); await waitPhase(page, 'user'); await solveCurrent(page); st = await state(page);
check('streak grows with every first-try solve', st.tactics.streak === 2 && st.tactics.bestStreak === 2 && st.tactics.flawless === 2);
// show solution
await clickNext(page); await waitPhase(page, 'user'); const xpB = (await state(page)).xp;
await page.click('#pz-solution'); await waitPhase(page, 'over', 20000);
st = await state(page);
r = await run(page);
check('Show solution: plays the whole line, no points, no XP, streak reset', st.xp === xpB && st.tactics.streak === 0 && /Solution shown/.test(await page.textContent('#pz-fb-title')) && /The line was/.test(await page.textContent('#pz-fb-text')) && r.hist === r.moves.length, `xp ${st.xp}/${xpB}, hist ${r.hist}/${r.moves.length}`);
check('solution text lists the moves and the theme lesson', /The line was <b>|The line was/.test(await page.innerHTML('#pz-fb-text')) && (await page.$$('.pz-theme')).length >= 1);
// skip
await clickNext(page); await waitPhase(page, 'user');
const idBefore = (await run(page)).id;
await page.click('#pz-skip'); await waitPhase(page, 'user');
check('Skip moves on without any XP', (await run(page)).id !== idBefore && (await state(page)).xp === st.xp);
// leave and persistence
await page.click('#pz-menu'); await page.waitForSelector('#tac-grid .tcard');
check('back on the Tactics home, the card shows the solved count and a progress bar', new RegExp(`\\d \\/ ${FILE['fried-liver'].length} solved`).test(await page.textContent('.tcard[data-id="fried-liver"]')), await page.textContent('.tcard[data-id="fried-liver"] .oc-foot'));
await page.reload(); await page.waitForSelector('#tac-grid .tcard');
check('progress persists across a reload', new RegExp(`[1-9] \\/ ${FILE['fried-liver'].length} solved`).test(await page.textContent('.tcard[data-id="fried-liver"] .oc-foot')) && /[1-9]\d* solved|[1-9] solved/.test(await page.textContent('#tac-stats')), await page.textContent('#tac-stats'));
// unsolved first on replay
await page.click('.tcard[data-id="fried-liver"]'); await waitPhase(page, 'user');
const sv = await page.evaluate(() => { const q = window.__tac.sess().queue; return q.map((p) => p.id); });
const solvedIds = (await state(page)).tactics.sets['fried-liver'].solved;
check('replaying a set puts unsolved puzzles first', solvedIds.every((id) => sv.indexOf(id) >= sv.length - solvedIds.length), `${solvedIds.length} solved at the back`);
// mixed round
await page.click('#pz-menu'); await page.waitForSelector('#tac-mixed:not([disabled])'); await page.click('#tac-mixed'); await waitPhase(page, 'user');
const mixed = await page.evaluate(() => window.__tac.sess().queue.map((p) => p.openingId));
check('Mixed: a round of 10 puzzles from different openings', mixed.length === 10 && new Set(mixed).size >= 5 && /Mixed/.test(await page.textContent('#pz-title')), `${mixed.length} puzzles, ${new Set(mixed).size} openings`);
for (let i = 0; i < 10; i++) { await waitPhase(page, 'user'); await page.click('#pz-skip'); await page.waitForTimeout(40); }
await page.waitForFunction(() => /Round complete/.test(document.querySelector('#pz-fb-title').textContent), null, { timeout: 8000 });
check('round complete card offers another round and a way back', /Another round/.test(await page.textContent('#pz-fb-actions')) && /Tactics/.test(await page.textContent('#pz-fb-actions')));
check('no page errors so far', errors.length === 0, errors.join('|'));
await page.context().close();

// ---------------------------------------------------------------- 3. stars, badges and celebrations (overlay NOT hidden)
page = await newPage({ celebrate: true });
await openSet(page, 'traxler'); // a big set now: bronze = 5 solved
check('Traxler set: database puzzles + traps', (await page.evaluate(() => window.__tac.sess().queue.length)) === FILE.traxler.length && FILE.traxler.length >= 20);
const seen = [];
for (let k = 0; k < 5; k++) {
  await solveCurrent(page);
  await page.waitForSelector('#celebrate:not(.hidden)', { timeout: 6000 }).catch(() => {});
  for (let i = 0; i < 8 && await page.isVisible('#celebrate'); i++) { seen.push(await page.textContent('#cel-title')); await page.click('#cel-next'); await page.waitForTimeout(120); }
  if (k < 4) { await clickNext(page); await waitPhase(page, 'user'); }
}
check('celebrations: a bronze tactics star + badges (Tactician, Tactics Star)', seen.some((t) => /Bronze tactics star/.test(t)) && seen.includes('Tactician') && seen.includes('Tactics Star'), seen.join(' | '));
st = await state(page);
check('star + badge XP are added (50 star + 40 + 75 badges) on top of the points', st.tactics.sets.traxler.tier === 'bronze' && st.tactics.stars === 1 && st.xp >= 50 + 40 + 75 + 500, String(st.xp));
check('the set card shows one filled star', await (async () => { await page.click('#pz-menu'); await page.waitForSelector('#tac-grid .tcard'); return (await page.$$('.tcard[data-id="traxler"] .stars i.on')).length === 1; })());
// profile
await page.click('#profile-btn'); await page.waitForSelector('#profile:not(.hidden)');
check('profile panel has a Tactics section and the 8 new badges (29 total)', /Tactics/.test(await page.textContent('#profile-body')) && (await page.$$('.bdg')).length === 29 && /puzzles solved/.test(await page.textContent('.pf-tacstats')) && (await page.$$('.bdg.got')).length >= 3);
await page.click('#profile-close');
await page.context().close();

// ---------------------------------------------------------------- 4. a long multi-move solution with replies, promotion safety
page = await newPage();
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
await page.click('.tcard[data-id="italian"]'); await waitPhase(page, 'user');
// find a puzzle with 3 solver moves: use the Légal's mate trap by skipping to it
for (let i = 0; i < 25; i++) { const x = await run(page); if (x.id === 'T-legals-mate') break; await page.click('#pz-skip'); await waitPhase(page, 'user'); }
r = await run(page);
check("reached Légal's mate (2 moves to find, you are White)", r.id === 'T-legals-mate' && r.color === 'white' && r.moves.length === 4, r.id);
await solveCurrent(page); r = await run(page);
check('multi-move solution: opponent replies were played between your moves and the mate ends the puzzle', r.phase === 'over' && r.hist === 4 && /Nd5#/.test(await page.textContent('#pz-fb-text')) && /Légal/.test(await page.textContent('#pz-fb-text')), await page.textContent('#pz-fb-text'));
check('solving a trap shows its name and story', /Légal's mate/.test(await page.textContent('.pz-lesson')) || /Légal's mate/.test(await page.textContent('#pz-fb-text')));
check('moves buzz (light tap per move, celebration on solve)', await page.evaluate(() => window.__v.filter((p) => p === 14).length >= 2 && window.__v.some((p) => Array.isArray(p) && p.length === 3 && p[0] === 30)));
st = await state(page);
check('trap puzzle counted for "Trap Spotter"', !!st.ach['tac-trap']);
await page.context().close();

// ---------------------------------------------------------------- 5. phone layout
for (const w of [390, 320]) {
  page = await newPage({ phone: true, w });
  await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
  const o1 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await page.click('.tcard[data-id="budapest"]'); await waitPhase(page, 'user');
  const o2 = await page.evaluate(() => { const fb = document.querySelector('#pz-feedback').getBoundingClientRect(), bd = document.querySelector('#pz-board').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, fbTop: fb.top, boardBottom: bd.bottom, vh: innerHeight, boardW: bd.width }; });
  check(`${w}px phone: no sideways scrolling on the Tactics home or the puzzle`, o1.sw <= o1.cw && o2.sw <= o2.cw, JSON.stringify([o1, o2]));
  check(`${w}px phone: board fills the width and the answer card sits right under it (visible without scrolling)`, o2.boardW >= w - 24 && o2.fbTop >= o2.boardBottom - 1 && o2.fbTop < o2.vh - 60, JSON.stringify(o2));
  // touch: a tap-tap move works
  const r2 = await run(page); const u = r2.moves[r2.idx];
  const A = await sq(page, u.slice(0, 2)), B = await sq(page, u.slice(2, 4));
  await page.touchscreen.tap(A.x, A.y); await page.touchscreen.tap(B.x, B.y);
  await page.waitForFunction((n) => window.__tac.run().points >= 100 || window.__tac.run().idx > n || window.__tac.run().phase === 'over', r2.idx, { timeout: 8000 });
  check(`${w}px phone: touch tap-tap move is accepted`, (await run(page)).points >= 100);
  await page.context().close();
}
// ---- "Practice tactics" from an opening: Learn more popup and Watch screen jump straight into that opening's puzzle set
{
  const page = await newPage({ phone: true });
  await page.click('.ocard[data-id="danish"] .mini[data-act="learn"]'); await page.waitForSelector('#learn:not(.hidden)');
  check('Learn more popup has a "Practice tactics" button', await page.isVisible('#learn-tactics') && /Practice tactics/.test(await page.textContent('#learn-tactics')));
  await page.click('#learn-tactics'); await page.waitForSelector('#puzzle:not(.hidden) #pz-board cg-board'); await page.waitForTimeout(400);
  const r1 = await run(page);
  check('Learn -> Practice tactics opens the Danish set (puzzle from that opening, set title)', r1.open === 'danish' && /Danish/.test(await page.textContent('#pz-title')), JSON.stringify({ o: r1.open, t: await page.textContent('#pz-title') }));
  await page.click('#pz-menu'); await page.waitForSelector('#tactics:not(.hidden)');
  await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('.ocard');
  await page.click('.ocard[data-id="fajarowicz"]'); await page.click('#watch-btn'); await page.waitForSelector('#demo-board cg-board');
  check('Watch screen has a "Practice tactics" button', await page.isVisible('#demo-tactics'));
  await page.click('#demo-tactics'); await page.waitForSelector('#puzzle:not(.hidden) #pz-board cg-board'); await page.waitForTimeout(400);
  const r2 = await run(page);
  check('Watch -> Practice tactics opens the Fajarowicz set', r2.open === 'fajarowicz' && /Fajarowicz/.test(await page.textContent('#pz-title')), JSON.stringify({ o: r2.open }));
  await page.context().close();
}
check('no page errors', errors.length === 0, errors.join('|'));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
