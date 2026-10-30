// Play-style pills, Style filter and the style line in "Learn more". Usage: node tools/e2e-style.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const WANT = {
  aggressive: ['fried-liver', 'kings-gambit', 'evans', 'danish', 'traxler', 'latvian', 'jerome'],
  sharp: ['najdorf', 'dragon', 'kid'],
  balanced: ['italian', 'ruy', 'qg'],
  positional: ['catalan', 'english'],
  solid: ['caro', 'french', 'london'],
};
const cardsOf = (page) => page.$$eval('.ocard:not([data-id="random"])', (cs) => cs.map((c) => {
  const t = c.querySelector('.stag'); const card = c.getBoundingClientRect(); const r = t && t.getBoundingClientRect(); const rt = c.querySelector('.rtag');
  return { id: c.dataset.id, style: t ? [...t.classList].find((x) => x.startsWith('s-')).slice(2) : null, label: t ? t.textContent.trim() : '', icon: t ? t.querySelector('b').textContent : '', fits: !!t && r.left >= card.left && r.right <= card.right - 2, hasRating: !!rt, gambit: !!c.querySelector('.gtag') };
}));

const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const d = document.getElementById('more-filters'); if (d) d.open = true; }));

page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL_); await page.evaluate(() => localStorage.clear()); await page.reload();
const cards = await cardsOf(page); const by = Object.fromEntries(cards.map((c) => [c.id, c]));
check('48 cards each with exactly one style pill', cards.length === 48 && cards.every((c) => c.style && c.label));
check('rating pill + gambit tag still present', cards.every((c) => c.hasRating) && cards.filter((c) => c.gambit).length === 32);
check('only the five fixed styles are used', [...new Set(cards.map((c) => c.style))].sort().join() === 'aggressive,balanced,positional,sharp,solid');
for (const [s, ids] of Object.entries(WANT)) check(`${s}: ${ids.join(', ')}`, ids.every((i) => by[i].style === s), ids.filter((i) => by[i].style !== s).join());
check('every style has its own icon', new Set(cards.map((c) => c.style + c.icon)).size === 5 && cards.every((c) => c.icon.length > 0));
check('pills fit inside the cards', cards.every((c) => c.fits));
check('Style filter has Any + 5 styles', (await page.$$eval('#style-seg button', (b) => b.map((x) => x.dataset.style))).join() === 'all,aggressive,sharp,balanced,positional,solid');

let total = 0;
for (const s of Object.keys(WANT)) {
  await page.click(`#style-seg button[data-style="${s}"]`);
  const cs = await cardsOf(page); total += cs.length;
  check(`filter ${s}: only ${s} openings (${cs.length})`, cs.length > 0 && cs.every((c) => c.style === s) && cs.length === cards.filter((c) => c.style === s).length);
}
check('the five styles partition all 48 openings', total === 48);
// combines with the other filters
await page.click('#style-seg button[data-style="aggressive"]'); await page.click('#filter-seg button[data-filter="gambit"]'); await page.click('#level-seg button[data-level="beginner"]');
let cs = await cardsOf(page);
check('style + Gambits + rating combine', cs.length > 0 && cs.every((c) => c.style === 'aggressive' && c.gambit), cs.map((c) => c.id).join());
await page.click('#filter-seg button[data-filter="white"]');
cs = await cardsOf(page);
check('style + White side combine', cs.every((c) => c.style === 'aggressive') && cs.length > 0 && cs.length < 24);
await page.reload();
check('style filter persisted after reload', await page.$eval('#style-seg button[data-style="aggressive"]', (b) => b.classList.contains('active')) && (await cardsOf(page)).every((c) => c.style === 'aggressive'));
await page.click('#style-seg button[data-style="all"]'); await page.click('#level-seg button[data-level="all"]'); await page.click('#filter-seg button[data-filter="all"]');
check('resetting filters restores 48', (await cardsOf(page)).length === 48);
await page.click('#style-seg button[data-style="solid"]'); await page.click('#level-seg button[data-level="advanced"]');
check('an empty combination shows just the Surprise card, no error', (await cardsOf(page)).length === 0 && (await page.$$('.ocard[data-id="random"]')).length === 1 && /0 openings/.test(await page.textContent('#filter-count')));
await page.click('#style-seg button[data-style="all"]'); await page.click('#level-seg button[data-level="all"]');

// popup
const bad = [];
for (const c of cards) {
  await page.click(`.ocard[data-id="${c.id}"] .mini[data-act="learn"]`);
  const r = await page.evaluate(() => { const f = document.querySelector('#learn-body .ln-feel'); const p = document.querySelector('#learn-body .ln-rating .stag'); return { feel: f ? f.textContent : '', pill: p ? p.className : '' }; });
  const lab = c.label.replace(c.icon, '').trim();
  if (!(r.pill.includes('s-' + c.style) && r.feel.startsWith(lab) && r.feel.length > 80 && /Expect/.test(r.feel))) bad.push(c.id + ':' + r.feel.slice(0, 30));
  await page.click('#learn-x');
}
check('Learn more shows the style pill + a one-sentence "what to expect" for all 48', bad.length === 0, bad.slice(0, 3).join(' | '));

// phone
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const m = await ctx.newPage(); m.on('pageerror', (e) => errors.push(e.message));
await m.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const d = document.getElementById('more-filters'); if (d) d.open = true; }));

await m.goto(URL_); await m.evaluate(() => localStorage.clear()); await m.reload();
check('phone: style pills fit in cards', (await cardsOf(m)).every((c) => c.fits));
check('phone: no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
check('phone: style filter buttons fit the screen', await m.evaluate(() => [...document.querySelectorAll('#style-seg button, #level-seg button')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
check('phone: no pill is clipped or overlapping its card edge', await m.evaluate(() => [...document.querySelectorAll('.oc-tags')].every((t) => t.scrollWidth <= t.clientWidth + 1)));
await m.tap('#style-seg button[data-style="sharp"]');
check('phone: tapping a style filters', (await cardsOf(m)).length === 14 && (await cardsOf(m)).every((c) => c.style === 'sharp'));
await m.evaluate(() => window.scrollTo(0, 0)); await m.screenshot({ path: '/tmp/st-setup-m.png' });
await m.tap('.ocard[data-id="scotch"] .mini[data-act="learn"]');
check('phone: popup style line visible', await m.evaluate(() => { const r = document.querySelector('#learn-body .ln-feel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
await m.screenshot({ path: '/tmp/st-learn-m.png' });
await page.click('#filter-seg button[data-filter="all"]'); await page.screenshot({ path: '/tmp/st-setup.png' });
check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(ok ? '\nALL STYLE CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
