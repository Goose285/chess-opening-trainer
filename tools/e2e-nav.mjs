// App shell: bottom tab bar (Home / Openings / Tactics / Profile), Home hero + rails, hash routes, streak chip, floating start bar,
// full-screen game screens, phone + desktop layout. Usage: node tools/e2e-nav.mjs [url]
import { chromium } from 'playwright-core';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const HIDE = () => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); });
async function open(phone, hash = '', seed) {
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message)); await page.addInitScript(HIDE);
  await page.goto(BASE); await page.evaluate((seed) => { localStorage.clear(); if (seed) localStorage.setItem('rt1500-progress', seed); }, seed || null);
  await page.goto(BASE + hash); await page.reload(); await page.waitForSelector('#tabbar');
  return page;
}
const vis = (page, s) => page.isVisible(s);
const active = (page) => page.$$eval('#tabbar .tab.active', (t) => t.map((x) => x.dataset.tab).join());
const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// ---------------------------------------------------------------- phone
let page = await open(true);
check('app opens on Home with the Home tab highlighted', (await vis(page, '#home')) && !(await vis(page, '#setup')) && (await active(page)) === 'home' && (await page.getAttribute('.tab.active', 'aria-current')) === 'page');
check('tab bar has Home / Openings / Tactics / Profile, each with an icon and label', (await page.$$eval('#tabbar .tab', (t) => t.map((x) => x.textContent.trim() + (x.querySelector('svg') ? '+' : '')))).join() === 'Home+,Openings+,Tactics+,Profile+');
const bar = await page.evaluate(() => { const r = document.querySelector('#tabbar').getBoundingClientRect(); return { b: innerHeight - r.bottom, w: r.width, h: r.height, pos: getComputedStyle(document.querySelector('#tabbar')).position }; });
check('tab bar is a floating pill pinned near the bottom', bar.pos === 'fixed' && bar.b >= 8 && bar.w < 400 && bar.h >= 56, JSON.stringify(bar));
check('tab targets are at least 44px', await page.$$eval('#tabbar .tab', (t) => t.every((x) => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().width >= 44)));
const css = await (await page.request.get(new URL('css/revamp.css', BASE).href)).text();
check('safe-area insets are used (top bar, tab bar, game screens) with viewport-fit=cover', /safe-area-inset-top/.test(css) && /safe-area-inset-bottom/.test(css) && /viewport-fit=cover/.test(await page.getAttribute('meta[name=viewport]', 'content')));
check('top bar: logo, level chip and streak flame', (await vis(page, '.top .logo')) && /Lv 1/.test(await page.textContent('#profile-btn')) && (await vis(page, '#streak-chip')));
check('streak chip is honest: 0 and greyed out for a new player', (await page.textContent('#streak-chip b')) === '0' && (await page.getAttribute('#streak-chip', 'class')).includes('off'));
check('Home hero suggests a real beginner-friendly start for a new player', /Start here/i.test(await page.textContent('#hero')) && !!(await page.getAttribute('#hero', 'data-id')));
const heroId = await page.getAttribute('#hero', 'data-id');
const rails = await page.$$eval('#home-rails .rail-head h2', (h) => h.map((x) => x.textContent.trim()));
check('Home rails: Beginner friendly, Gambits for White, Gambits for Black, Tactics', rails.join('|') === 'Beginner friendly|Gambits for White|Gambits for Black|Tactics', rails.join('|'));
check('rails scroll horizontally and the page does not', (await page.$$eval('.rail-row', (r) => r.every((x) => x.scrollWidth > x.clientWidth + 20))) && (await noScroll(page)));
check('opening tiles carry a board thumbnail built from the piece set', (await page.$$('#home-rails .tile .thumb piece')).length > 100 && (await page.$$eval('.tile[data-open]', (t) => t.length)) >= 20);
check('Home has no invented numbers: no fake streaks, ratings or counts of players', !/\d+\s*(players|learners|users)/i.test(await page.textContent('#home')));
// hero -> drill
await page.click('#hero [data-hero="play"]'); await page.waitForSelector('#board cg-board');
check('drill is a full screen: tab bar and top bar hidden', (await vis(page, '#train')) && !(await vis(page, '#tabbar')) && !(await vis(page, '.top')));
check('drill title bar shows the opening, a back button and the score', (await vis(page, '.gbar #menu-btn')) && (await page.textContent('#opening-title')).length > 2 && /You play/.test(await page.textContent('#gb-sub')) && (await vis(page, '#score-num')));
const g = await page.evaluate(() => { const b = document.querySelector('#board').getBoundingClientRect(); return { w: b.width, l: b.left, vw: innerWidth }; });
check('board is edge to edge on the phone', Math.abs(g.w - g.vw) <= 1 && g.l <= 0.5, JSON.stringify(g));
check('no sideways scroll in the drill', await noScroll(page));
await page.click('#menu-btn');
check('back goes to Openings with its tab highlighted', (await vis(page, '#setup')) && (await active(page)) === 'openings' && (await vis(page, '#tabbar')));
// Home now says Continue
await page.click('.tab[data-tab="home"]');
check('after playing, Home hero says Continue with the same opening', /Continue/i.test(await page.textContent('#hero .hero-eyebrow')) && (await page.getAttribute('#hero', 'data-id')) === heroId);
// tile -> openings
const tileId = await page.$eval('#home-rails .rail:nth-of-type(2) .tile[data-open]', (t) => t.dataset.open);
await page.evaluate(() => document.querySelector('#home-rails .rail:nth-of-type(2) .tile[data-open]').click());
await page.waitForSelector('.ocard.selected');
check('tapping a tile jumps to Openings with that card selected', (await vis(page, '#setup')) && (await page.getAttribute('.ocard.selected', 'data-id')) === tileId && (await active(page)) === 'openings');
// start bar
const sb = await page.evaluate(() => { const s = document.querySelector('#startbar').getBoundingClientRect(), t = document.querySelector('#tabbar').getBoundingClientRect(); return { sBottom: s.bottom, tTop: t.top, sTop: s.top, vh: innerHeight }; });
check('start bar floats above the tab bar (no overlap)', sb.sBottom <= sb.tTop - 4 && sb.sTop > 0, JSON.stringify(sb));
const lastCard = await page.evaluate(() => { const cs = document.querySelectorAll('.ocard'); const l = cs[cs.length - 1]; l.scrollIntoView({ block: 'end' }); window.scrollTo(0, document.documentElement.scrollHeight); const r = l.getBoundingClientRect(); const s = document.querySelector('#startbar').getBoundingClientRect(); return { cardBottom: r.bottom, barTop: s.top }; });
check('last card can scroll clear of the start bar and tab bar', lastCard.cardBottom <= lastCard.barTop + 1, JSON.stringify(lastCard));
check('start bar names the pick and the side', /as (White|Black|a random side)/.test(await page.textContent('#start-label')) && !(await page.isDisabled('#start-btn')));
check('cards: thumbnail, style-colour accent, stars, no long paragraph', (await page.$$('.ocard .oc-thumb .thumb')).length >= 48 && (await page.$eval('.ocard', (c) => getComputedStyle(c).getPropertyValue('--sc').trim().startsWith('#'))));
await page.evaluate(() => window.scrollTo(0, 0));
// filters collapsed behind the Filters button
check('extra filters are tucked behind a Filters button', !(await vis(page, '#ease-seg')) && (await vis(page, '#more-btn')));
await page.click('#more-btn');
check('Filters opens difficulty / rating / style', (await vis(page, '#ease-seg')) && (await vis(page, '#level-seg')) && (await vis(page, '#style-seg')));
await page.click('#more-btn');
// see all
await page.click('.tab[data-tab="home"]'); await page.click('.rail:nth-of-type(1) .see-all');
check('"See all" on Beginner friendly opens Openings filtered to easy, easiest first', (await vis(page, '#setup')) && (await page.$$eval('.ocard:not(.surprise)', (c) => c.every((x) => x.classList.contains('is-easy')))) && (await page.getAttribute('#more-btn', 'data-count')) === '2');
await page.click('.tab[data-tab="home"]'); await page.click('.rail:nth-of-type(2) .see-all');
check('"See all" on Gambits shows gambits only', (await page.$$eval('.ocard:not(.surprise)', (c) => c.length > 5 && c.every((x) => x.classList.contains('gambit')))));
// tactics + profile tabs
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
check('Tactics tab shows the puzzle home', (await vis(page, '#tactics')) && (await active(page)) === 'tactics' && (await page.$$('#tac-grid .tcard')).length === 48);
await page.click('.tab[data-tab="profile"]'); await page.waitForSelector('#profile:not(.hidden)');
check('Profile tab opens the progress sheet and stays on the bar', (await vis(page, '#profile')) && (await vis(page, '#tabbar')) && (await page.evaluate(() => document.querySelector('#tabbar').getBoundingClientRect().top >= document.querySelector('#profile .modal-card').getBoundingClientRect().bottom - 1)));
await page.click('.tab[data-tab="home"]');
check('another tab closes the sheet and navigates', !(await vis(page, '#profile')) && (await vis(page, '#home')) && (await active(page)) === 'home');
// tactics rail -> puzzle
await page.click('#home-rails [data-tac="mixed"]'); await page.waitForFunction(() => window.__tac && window.__tac.run() && window.__tac.run().phase === 'user');
check('Tactics tile on Home starts a mixed round', (await vis(page, '#puzzle')) && /Mixed/.test(await page.textContent('#pz-title')) && !(await vis(page, '#tabbar')) && (await noScroll(page)));
const pb = await page.evaluate(() => { const b = document.querySelector('#pz-board').getBoundingClientRect(); return { w: b.width, vw: innerWidth }; });
check('puzzle board is edge to edge too', Math.abs(pb.w - pb.vw) <= 1, JSON.stringify(pb));
await page.click('#pz-menu'); await page.waitForSelector('#tac-grid .tcard');
check('puzzle back returns to the Tactics tab', (await vis(page, '#tactics')) && (await active(page)) === 'tactics');
// brand button
await page.click('#brand-home'); check('tapping the logo goes Home', await vis(page, '#home'));
// hash route persistence
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard'); await page.reload(); await page.waitForSelector('#tac-grid .tcard');
check('reload keeps you on the same tab (#/tactics)', (await vis(page, '#tactics')) && /#\/tactics$/.test(page.url()), page.url());
check('hash route does not scroll the page', await page.evaluate(() => scrollY === 0));
// theme button still there
await page.click('#theme-btn'); check('theme button still opens the picker', await vis(page, '#theme'));
await page.keyboard.press('Escape'); await page.context().close();

// streak chip from real progress
const today = new Date(); const dk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
page = await open(true, '#/openings', JSON.stringify({ v: 1, xp: 120, days: { last: dk, streak: 3, best: 3 } }));
check('direct link #/openings opens Openings', (await vis(page, '#setup')) && (await active(page)) === 'openings' && /#\/openings$/.test(page.url()));
check('streak chip shows the real day streak (3) and lights up', (await page.textContent('#streak-chip b')) === '3' && !(await page.getAttribute('#streak-chip', 'class')).includes('off'));
check('level chip reflects real XP', /Lv 1/.test(await page.textContent('#profile-btn')));
await page.click('#streak-chip'); check('streak chip opens the progress sheet', await vis(page, '#profile')); await page.context().close();

// ---------------------------------------------------------------- desktop
page = await open(false);
check('desktop: Home hero, rails and tab bar centred', (await vis(page, '#hero .hero-copy')) && (await vis(page, '#tabbar')) && Math.abs((await page.evaluate(() => { const r = document.querySelector('#tabbar').getBoundingClientRect(); return r.left + r.width / 2; })) - 550) < 3);
await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('.ocard');
check('desktop: cards form a multi-column grid', await page.evaluate(() => { const c = [...document.querySelectorAll('.ocard')].slice(0, 6).map((x) => Math.round(x.getBoundingClientRect().left)); return new Set(c).size >= 2; }));
await page.evaluate(() => document.querySelector('.ocard[data-id="italian"]').click()); await page.click('#start-btn'); await page.waitForSelector('#board cg-board');
const lay = await page.evaluate(() => { const b = document.querySelector('#board').getBoundingClientRect(), s = document.querySelector('#train .side').getBoundingClientRect(); return { bw: b.width, sideLeft: s.left, boardRight: b.right, top: b.top }; });
check('desktop drill: board left, panel right, board not oversized', lay.sideLeft >= lay.boardRight && lay.bw <= 700 && lay.bw >= 400, JSON.stringify(lay));
check('desktop: no horizontal scroll', await noScroll(page));
await page.context().close();
check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
