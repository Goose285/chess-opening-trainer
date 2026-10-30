// Card descriptions, rating pills, rating filter and the rating info in "Learn more". Usage: node tools/e2e-ratings.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const levelOf = (lo) => (lo < 1000 ? 'beginner' : lo < 1600 ? 'intermediate' : lo < 2000 ? 'advanced' : 'expert');
const cardsOf = (page) => page.$$eval('.ocard:not([data-id="random"])', (cs) => cs.map((c) => {
  const t = c.querySelector('.rtag'); const r = /(\d+)–(\d+)/.exec(t ? t.textContent : '');
  return { id: c.dataset.id, desc: c.querySelector('.oc-blurb').textContent, lo: r ? +r[1] : null, hi: r ? +r[2] : null, cls: t ? t.className : '', gambit: !!c.querySelector('.gtag'), fits: t ? (t.getBoundingClientRect().right <= c.getBoundingClientRect().right - 4 && t.getBoundingClientRect().left >= c.getBoundingClientRect().left) : false };
}));

const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const d = document.getElementById('more-filters'); if (d) d.open = true; }));

page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL_);
await page.evaluate(() => localStorage.clear()); await page.reload();
let cards = await cardsOf(page);
check('48 cards', cards.length === 48);
check('every card has a 9–16 word description', cards.every((c) => { const n = c.desc.trim().split(/\s+/).length; return n >= 9 && n <= 16; }), cards.filter((c) => { const n = c.desc.trim().split(/\s+/).length; return n < 9 || n > 16; }).map((c) => c.id).join(','));
check('every card has a rating pill with a range', cards.every((c) => c.lo && c.hi && c.hi > c.lo));
check('pill colour matches the level for its range', cards.every((c) => c.cls.includes('r-' + levelOf(c.lo))), cards.filter((c) => !c.cls.includes('r-' + levelOf(c.lo))).map((c) => c.id).join(','));
const by = Object.fromEntries(cards.map((c) => [c.id, c]));
check('Italian + London are beginner', ['italian', 'london'].every((i) => levelOf(by[i].lo) === 'beginner'));
check('Najdorf + Benko + Catalan are advanced', ['najdorf', 'benko', 'catalan'].every((i) => levelOf(by[i].lo) === 'advanced'));
check('fun/trappy openings top out at ~1400 or less', ['latvian', 'jerome', 'halloween', 'englund-black', 'englund-white', 'stafford', 'fried-liver', 'traxler'].every((i) => by[i].hi <= 1400 && levelOf(by[i].lo) === 'beginner'));
check('gambit tag still shown on gambits', cards.filter((c) => c.gambit).length === 32);
check('pills fit inside the cards', cards.every((c) => c.fits));
check('"Any level" + 3 level buttons present', (await page.$$eval('#level-seg button', (b) => b.map((x) => x.dataset.level))).join() === 'all,beginner,intermediate,advanced');

for (const lv of ['beginner', 'intermediate', 'advanced']) {
  await page.click(`#level-seg button[data-level="${lv}"]`);
  const cs = await cardsOf(page);
  const want = cards.filter((c) => levelOf(c.lo) === lv).map((c) => c.id).sort().join();
  check(`filter ${lv}: shows exactly the ${lv} openings (${cs.length})`, cs.map((c) => c.id).sort().join() === want && cs.length > 0);
  check(`filter ${lv}: count label + surprise card`, /openings?/.test(await page.textContent('#filter-count')) && (await page.$$('.ocard[data-id="random"]')).length === 1);
}
await page.click('#level-seg button[data-level="beginner"]'); await page.click('#filter-seg button[data-filter="gambit"]');
let cs = await cardsOf(page);
check('level + Gambits filters combine', cs.length > 3 && cs.every((c) => c.gambit && levelOf(c.lo) === 'beginner'), cs.length + ' cards');
await page.click('#filter-seg button[data-filter="all"]');
await page.reload();
check('level filter is remembered after reload', await page.$eval('#level-seg button[data-level="beginner"]', (b) => b.classList.contains('active')) && (await cardsOf(page)).every((c) => levelOf(c.lo) === 'beginner'));
await page.click('#level-seg button[data-level="all"]');
check('"Any level" restores all 48', (await cardsOf(page)).length === 48);

// Learn more popup shows description + rating for every opening
const bad = [];
for (const c of cards) {
  await page.click(`.ocard[data-id="${c.id}"] .mini[data-act="learn"]`);
  const r = await page.evaluate(() => ({ t: document.querySelector('#learn-body .ln-rating')?.textContent || '', pill: document.querySelector('#learn-body .ln-rating .rtag')?.className || '' }));
  if (!(r.t.includes(c.desc.trim()) && r.t.includes(`${c.lo}–${c.hi}`) && r.pill.includes('r-' + levelOf(c.lo)) && /Recommended rating/.test(r.t))) bad.push(c.id);
  await page.click('#learn-x');
}
check('Learn-more popup shows description + rating + level for all 48', bad.length === 0, bad.join(','));
await page.click('.ocard[data-id="jerome"] .mini[data-act="learn"]');
check('trappy openings are flagged in the popup', /Fun \/ trappy/.test(await page.textContent('#learn-body')) && /unsound/.test(await page.textContent('#learn-body .ln-why')));
await page.click('#learn-x');

// phone
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const m = await ctx.newPage(); m.on('pageerror', (e) => errors.push(e.message));
await m.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const d = document.getElementById('more-filters'); if (d) d.open = true; }));

await m.goto(URL_);
const mc = await cardsOf(m);
check('phone: pills fit in cards', mc.every((c) => c.fits));
check('phone: no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
check('phone: level filter fits the screen', await m.evaluate(() => [...document.querySelectorAll('#level-seg button')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
await m.tap('.ocard[data-id="catalan"] .mini[data-act="learn"]');
check('phone: popup rating section visible and not clipped', await m.evaluate(() => { const r = document.querySelector('#learn-body .ln-rating').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 200; }));
await m.screenshot({ path: '/tmp/r-learn-m.png' });
await m.tap('#learn-x');
await m.evaluate(() => window.scrollTo(0, 0)); await m.screenshot({ path: '/tmp/r-setup-m.png' });
await page.screenshot({ path: '/tmp/r-setup.png' });
check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(ok ? '\nALL RATING CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
