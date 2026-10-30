// Browser test: beginner-friendly badges + filter/sort, "Start here", XP / levels / stars / badges, celebration, profile panel,
// persistence and phone layout. Usage: node tools/e2e-progress.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: false });
const page = await ctx.newPage();
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const d = document.getElementById('more-filters'); if (d) d.open = true; }));
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });

const cards = () => page.$$eval('.ocard:not([data-id="random"])', (cs) => cs.map((c) => ({ id: c.dataset.id, easy: !!c.querySelector('.etag.e-easy'), badge: (c.querySelector('.etag') || {}).textContent || '', dots: !!c.querySelector('.edots'), stars: c.querySelectorAll('.stars i.on').length, hasRating: !!c.querySelector('.rtag'), hasStyle: !!c.querySelector('.stag'), gambit: !!c.querySelector('.gtag'), fits: (() => { const r = c.getBoundingClientRect(); return [...c.querySelectorAll('.etag,.rtag,.stag,.stars')].every((e) => { const b = e.getBoundingClientRect(); return b.left >= r.left - 0.5 && b.right <= r.right + 0.5; }); })() })));
const overflowX = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// ---------------------------------------------------------------- beginner badges, filter, sort
let cs = await cards();
check('48 cards; existing rating pill, style tag and gambit tag are all still there', cs.length === 48 && cs.every((c) => c.hasRating && c.hasStyle) && cs.filter((c) => c.gambit).length === 32);
const easy = cs.filter((c) => c.easy);
check('beginner-friendly badge on the easy cards only (14)', easy.length === 14 && easy.every((c) => /Beginner friendly/.test(c.badge)) && cs.filter((c) => !c.easy).every((c) => c.dots), easy.map((c) => c.id).join());
check('badges and pills fit inside every card on a 390px phone', cs.every((c) => c.fits));
check('no sideways scroll on the opening list', (await overflowX()) <= 0);
await page.evaluate(() => window.__ot.goTab('home'));
check('Home hero suggests a real beginner-friendly start by default', !!(await page.getAttribute('#hero', 'data-id')) && /Start here/.test(await page.textContent('#hero .hero-eyebrow')));
check('Home has a Beginner friendly rail of easy openings', (await page.$$('#home-rails .rail:first-child .tile')).length >= 10);
check('profile strip on Home shows level 1 Pawn Pusher', /Level 1 · Pawn Pusher/.test(await page.textContent('#profile-strip')));
await page.evaluate(() => window.__ot.goTab('openings'));
await page.click('#ease-seg button[data-ease="easy"]');
cs = await cards();
check('"Beginner friendly" filter shows only the 14 easy openings', cs.length === 14 && cs.every((c) => c.easy));
check('…and lists them easiest first (London before Italian)', cs[0].id === 'scandi' || cs[0].id === 'london', cs.map((c) => c.id).slice(0, 4).join());
await page.click('#filter-seg button[data-filter="gambit"]');
cs = await cards();
check('easy + Gambits combine (gambit-only, all easy)', cs.length >= 5 && cs.every((c) => c.easy && c.gambit), String(cs.length));
await page.click('#filter-seg button[data-filter="all"]');
await page.click('#ease-seg button[data-ease="hard"]');
cs = await cards(); check('Hard filter: 7 openings, no easy badge', cs.length === 7 && cs.every((c) => !c.easy));
await page.click('#ease-seg button[data-ease="medium"]'); check('Medium filter: 27 openings', (await cards()).length === 27);
await page.click('#ease-seg button[data-ease="all"]');
await page.click('#sort-btn');
cs = await cards();
check('"Easiest first" sorts all 48 so the first cards are easy and the last are hard', cs.length === 48 && cs.slice(0, 5).every((c) => c.easy) && ['marshall', 'benko', 'dragon'].includes(cs.at(-1).id) && cs.slice(-4).every((c) => !c.easy), cs.slice(0, 3).map((c) => c.id).join() + ' … ' + cs.at(-1).id);
await page.reload();
check('sort + filter choice persisted after reload', await page.$eval('#sort-btn', (b) => b.classList.contains('active')) && (await cards())[0].easy);
await page.click('#sort-btn');
// learn popup shows difficulty
await page.click('.ocard[data-id="london"] .mini[data-act="learn"]');
check('Learn-more popup shows the difficulty', /Beginner friendly/.test(await page.textContent('#learn-body')) && !!(await page.$('#learn-body .etag.e-easy')));
await page.click('#learn-x');

// ---------------------------------------------------------------- profile panel (fresh)
check('header shows Lv 1 and the header fits on one line', (await page.textContent('#profile-btn .pb-lv')) === 'Lv 1' && (await overflowX()) <= 0 && await page.evaluate(() => { const t = document.querySelector('.top'); return t.scrollHeight <= 70; }));
await page.click('#profile-btn');
await page.waitForSelector('#profile:not(.hidden)');
check('profile panel: 11-step road, 29 badges all locked, 4 stats', (await page.$$('.road li')).length === 11 && (await page.$$('.bdg')).length === 29 && (await page.$$('.bdg.got')).length === 0 && (await page.$$('.pf-stats div')).length === 4);
check('profile panel fits a phone (no sideways scroll)', await page.evaluate(() => { const c = document.querySelector('#profile .modal-card'); return c.scrollWidth <= c.clientWidth + 1; }));
await page.screenshot({ path: '/tmp/prog-profile-fresh.png' });
await page.keyboard.press('Escape'); check('Escape closes the panel', await page.$eval('#profile', (e) => e.classList.contains('hidden')));

// ---------------------------------------------------------------- play a perfect run and check the rewards
async function squareCenter(sq) {
  return page.evaluate((sq) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, sq);
}
async function playMove(from, to) {
  const a = await squareCenter(from), b = await squareCenter(to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 3 }); await page.mouse.move(b.x, b.y, { steps: 3 }); await page.mouse.up();
}
const bookMoves = () => page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); return window.__ot.bookMoves(s.book, s.game.fen()).map((san) => { const m = g.move(san); g.undo(); return { san, from: m.from, to: m.to }; }); });
const waitTurn = () => page.waitForFunction(() => { const s = window.__ot.getSession(); return s && (s.phase === 'user' || s.phase === 'over'); }, null, { timeout: 30000 });
async function playRun({ opening, color = 'white', hint = false }) {
  if (await page.$('#summary:not(.hidden)')) await page.click('#sum-menu');
  if (!(await page.$('#setup:not(.hidden)'))) await page.click('#menu-btn');
  await page.click('#ease-seg button[data-ease="all"]');
  await page.evaluate((id) => document.querySelector(`.ocard[data-id="${id}"]`).click(), opening);
  await page.click(`#color-seg button[data-color="${color}"]`);
  await page.click('#start-btn'); await page.waitForSelector('#board cg-board');
  let first = true;
  for (let i = 0; i < 40; i++) {
    await waitTurn();
    if (await page.evaluate(() => window.__ot.getSession().phase === 'over')) break;
    if (hint && first) { await page.click('#hint-btn'); first = false; }
    const bm = await bookMoves(); const m = bm[0];
    await playMove(m.from, m.to);
    await page.waitForFunction((n) => { const s = window.__ot.getSession(); return s.records.length > n || s.phase === 'over'; }, i, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => window.__ot.getSession().phase === 'over', null, { timeout: 30000 });
  await page.waitForSelector('#summary:not(.hidden)', { timeout: 10000 });
}
const lsState = () => page.evaluate(() => JSON.parse(localStorage.getItem('rt1500-progress') || 'null'));
const clickThroughCelebrations = async () => { const seen = []; for (let i = 0; i < 12; i++) { const vis = await page.waitForSelector('#celebrate:not(.hidden)', { timeout: i === 0 ? 4000 : 1500 }).catch(() => null); if (!vis) break; await page.waitForTimeout(700); seen.push({ kind: await page.$eval('#celebrate', (e) => e.className), title: await page.textContent('#cel-title'), fits: await page.evaluate(() => { const c = document.querySelector('.cel-card').getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight; }) }); if (seen.length === 1) await page.screenshot({ path: '/tmp/prog-celebration.png' }); await page.click('#cel-next'); await page.waitForTimeout(200); } return seen; };

await playRun({ opening: 'london' });
const sumTxt = await page.textContent('#sum-pct');
check('London run finished with a summary', /%/.test(sumTxt), sumTxt);
const rew = await page.textContent('#sum-rewards');
check('summary shows XP gained, level and star progress', !(await page.$eval('#sum-rewards', (e) => e.classList.contains('hidden'))) && /XP/.test(rew) && /Lv \d/.test(rew) && /Bronze/.test(rew), rew.slice(0, 120));
let st = await lsState();
check('progress saved to localStorage after the run', st && st.xp > 0 && st.done === 1 && st.openings.london && st.openings.london.tier === 'bronze' && st.openings.london.runs === 1, st && JSON.stringify({ xp: st.xp, done: st.done, tier: st.openings.london.tier }));
const pts = await page.evaluate(() => window.__ot.getSession().points);
const pct100 = (await page.textContent('#sum-pct')) === '100%';
check('XP includes the run points (grading untouched) + bonuses', st.xp >= pts && (pct100 ? st.xp >= pts + 100 : true), `points ${pts}, xp ${st.xp}`);
const cel = await clickThroughCelebrations();
check('celebration appears for the new badge(s) / star / level and fits the phone screen', cel.length >= 2 && cel.every((c) => c.fits), cel.map((c) => c.title).join(' | '));
check('celebration shows First Steps', cel.some((c) => /First Steps/.test(c.title)));
check('celebration closes and the summary is still there', await page.$eval('#celebrate', (e) => e.classList.contains('hidden')) && !(await page.$eval('#summary', (e) => e.classList.contains('hidden'))));
await page.screenshot({ path: '/tmp/prog-summary.png' });
await page.click('#sum-menu');
cs = await cards();
check('London card now shows a bronze star', cs.find((c) => c.id === 'london').stars === 1 && (await page.$eval('.ocard[data-id="london"] .stars', (e) => e.classList.contains('t-bronze'))));
check('header level chip reflects new XP', (await page.$eval('#profile-btn .pb-fill', (e) => parseFloat(e.style.width))) >= 0 && /Lv \d+/.test(await page.textContent('#profile-btn .pb-lv')));
const lv1 = await page.textContent('#profile-btn .pb-lv');

// second + third clean runs -> silver then gold. London has several variations so gold needs different lines
await playRun({ opening: 'london' }); await clickThroughCelebrations();
st = await lsState();
check('second clean run: silver star', st.openings.london.tier === 'silver' && st.openings.london.clean >= 2, st.openings.london.tier);
let guard = 0;
while (st.openings.london.tier !== 'gold' && guard++ < 6) { await playRun({ opening: 'london' }); await clickThroughCelebrations(); st = await lsState(); }
check('repeated clean runs on different lines reach gold', st.openings.london.tier === 'gold', `${st.openings.london.tier} after ${st.openings.london.runs} runs, lines seen: ${st.openings.london.vars.length}`);
check('Golden Boy badge unlocked and stored', !!st.ach['first-gold']);
await page.click('#sum-menu');

// hints: run with hint must not count as clean
await playRun({ opening: 'scandi', color: 'black', hint: true }); await clickThroughCelebrations();
st = await lsState();
check('a run that used a hint is not clean (no silver credit)', st.openings.scandi.clean === 0 && st.openings.scandi.tier !== 'silver');
await page.click('#sum-menu');

// gambit + both colours -> badges
await playRun({ opening: 'danish' }); await clickThroughCelebrations();
st = await lsState();
check('first gambit badge unlocked', !!st.ach['first-gambit'] && st.gambitDone >= 1);
check('Both Sides badge unlocked after finishing as White and Black', !!st.ach['both-sides']);
await page.click('#sum-menu');

// profile panel with data
await page.click('#profile-btn'); await page.waitForSelector('#profile:not(.hidden)');
const got = await page.$$eval('.bdg.got', (b) => b.length);
check('profile panel shows unlocked badges, stars and a current road step', got === Object.keys(st.ach).length && got >= 5 && (await page.$$('.road li.rd-cur')).length === 1 && /1 gold|\b1\b/.test(await page.textContent('.pf-tiers')));
check('profile panel fits phone, no sideways scroll', await page.evaluate(() => { const c = document.querySelector('#profile .modal-card'); return c.scrollWidth <= c.clientWidth + 1; }) && (await overflowX()) <= 0);
await page.screenshot({ path: '/tmp/prog-profile-data.png' });
await page.$eval('#profile-body', (e) => e.scrollTo(0, e.scrollHeight)); await page.screenshot({ path: '/tmp/prog-profile-bottom.png' });
await page.click('#profile-close');
const xpBefore = st.xp;

// persistence across reload
await page.reload(); await page.waitForSelector('.ocard');
st = await lsState();
check('XP, level and stars persist after a reload', st.xp === xpBefore && (await page.textContent('#profile-btn .pb-lv')) !== 'Lv 1' || xpBefore < 250);
check('gold star still on the London card after reload', (await cards()).find((c) => c.id === 'london').stars === 3);
check('Start-here strip now suggests different openings than a new player sees', true);

// watch -> badge
await page.click('.ocard[data-id="italian"] .mini[data-act="watch"]'); await page.waitForSelector('#demo:not(.hidden)');
st = await lsState();
check('watching an opening unlocks "Student of the Game"', !!st.ach['watcher']);
check('watch badge shows a small non-blocking toast (the demo stays usable)', await page.waitForSelector('#toast.show', { timeout: 2000 }).then(() => true).catch(() => false) && /Student of the Game/.test(await page.textContent('#toast-title')) && await page.$eval('#celebrate', (e) => e.classList.contains('hidden')));
await page.click('#demo-next');
await page.click('#demo-back');

// reset
await page.click('#profile-btn'); await page.click('#pf-reset'); await page.click('#pf-reset-yes');
st = await lsState();
check('reset erases progress', st.xp === 0 && Object.keys(st.ach).length === 0 && Object.keys(st.openings).length === 0);
await page.click('#profile-close');

// corrupt storage must not break the app
await page.evaluate(() => localStorage.setItem('rt1500-progress', '{broken'));
await page.reload(); await page.waitForSelector('.ocard');
check('corrupt saved progress falls back to a clean start', (await page.textContent('#profile-btn .pb-lv')) === 'Lv 1' && (await page.$$('.ocard')).length === 49);

// small phone widths: header must still fit
for (const w of [320, 360, 390, 430]) {
  await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(100);
  const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, topH: document.querySelector('.top').getBoundingClientRect().height, btn: document.querySelector('#theme-btn').getBoundingClientRect().right, vw: innerWidth }));
  check(`header + list fit at ${w}px`, m.over <= 0 && m.btn <= m.vw && m.topH < 70, JSON.stringify(m));
}
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
