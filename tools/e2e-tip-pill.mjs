// The ☕ "Buy me a coffee" pill, top right of EVERY screen and sheet: visible, reachable, labelled, opens the BMC page in a new tab with
// rel=noopener, never overlapping another control or the board. Phone 390 + small 360 + desktop 1100.
// Usage: node tools/e2e-tip-pill.mjs [url] [screenshotDir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOTS = process.argv[3] || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TIP = 'https://buymeacoffee.com/sethcmoynai';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const HIDE = () => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); });

/** the visible pill (the one in the topmost open layer) + every other control that is really on top, with their boxes */
const audit = (page) => page.evaluate(() => {
  const shown = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.hidden') && r.bottom > 0 && r.top < innerHeight; };
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const centre = (r) => [Math.min(innerWidth - 1, Math.max(0, (r.l + r.r) / 2)), Math.min(innerHeight - 1, Math.max(0, (r.t + r.b) / 2))];
  const onTop = (e) => { const r = box(e); const [x, y] = centre(r); const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
  const pills = [...document.querySelectorAll('[data-tip-pill]')].filter(shown).filter(onTop);
  const pill = pills[0]; if (!pill) return { found: pills.length, all: document.querySelectorAll('[data-tip-pill]').length };
  const pb = box(pill);
  const others = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], summary, cg-board')].filter((e) => e !== pill && shown(e) && !pill.contains(e) && onTop(e));
  const hits = others.filter((e) => { const o = box(e); return o.l < pb.r && o.r > pb.l && o.t < pb.b && o.b > pb.t; }).map((e) => (e.id || e.className || e.tagName) + '');
  const a = pill.getAttribute('aria-label') || '';
  const card = pill.closest('.modal-card'); const cb = card ? box(card) : { l: 0, t: 0, r: innerWidth, b: innerHeight };
  return { found: pills.length, pb, hits, card: !!card, cb, href: pill.href, target: pill.target, rel: pill.rel, label: a, vw: innerWidth, vh: innerHeight, scrollW: document.documentElement.scrollWidth, cg: !!document.querySelector('cg-board') };
});
async function fresh(w, h = 844) {
  const phone = w < 700;
  const ctx = await browser.newContext(phone ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message)); await page.addInitScript(HIDE);
  await page.goto(BASE + '#/openings'); await page.evaluate(() => localStorage.clear()); await page.goto(BASE + '#/home'); await page.reload(); await page.waitForSelector('#tabbar');
  return { ctx, page };
}
const tap = (page, sel) => page.$eval(sel, (e) => e.click());
const closeSheets = (page) => page.evaluate(() => { document.querySelectorAll('.modal:not(.hidden)').forEach((m) => m.classList.add('hidden')); document.body.classList.remove('noscroll', 'sheet-profile'); });

async function sweep(w) {
  const { ctx, page } = await fresh(w);
  const tag = `${w}px`;
  const verify = async (name, shotName) => {
    await page.waitForTimeout(250);
    const a = await audit(page);
    // screens: top right of the viewport. sheets: top right of the sheet itself (right half, near its top edge, inside it and inside the screen)
    const good = a.pb && a.pb.w >= 32 && a.pb.h >= 32 && a.pb.t >= a.cb.t && a.pb.t - a.cb.t < 110 && a.pb.t >= 0 && a.pb.r <= a.cb.r && a.pb.r <= a.vw && a.cb.r - a.pb.r <= 80 && a.pb.l > (a.cb.l + a.cb.r) / 2 && a.hits.length === 0 && a.scrollW <= a.vw;
    check(`${tag} ${name}: ☕ pill top right, on top, no overlap with other controls or the board`, !!good, a.pb ? `${a.card ? 'sheet' : 'screen'} box ${Math.round(a.pb.l)},${Math.round(a.pb.t)} ${Math.round(a.pb.w)}x${Math.round(a.pb.h)} hits=[${a.hits}] gap-right ${Math.round(a.vw - a.pb.r)}` : JSON.stringify(a));
    if (a.pb) check(`${tag} ${name}: link, new tab, noopener, accessible label`, a.href === TIP && a.target === '_blank' && /noopener/.test(a.rel) && /coffee/i.test(a.label), `${a.href} ${a.target} ${a.rel} "${a.label}"`);
    if (SHOTS && shotName) await page.screenshot({ path: `${SHOTS}/${shotName}.png` });
  };
  await verify('Home', `phone-${w}-home`);
  await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('#setup:not(.hidden) .ocard'); await verify('Openings list', w === 390 ? 'phone-390-openings' : '');
  await tap(page, '.ocard[data-id="italian"] .mini[data-act="learn"]'); await page.waitForSelector('#learn:not(.hidden)'); await verify('Learn more sheet', w === 390 ? 'phone-390-learn' : ''); await closeSheets(page);
  await tap(page, '#theme-btn'); await page.waitForSelector('#theme:not(.hidden)'); await verify('Themes sheet'); await closeSheets(page);
  await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard'); await verify('Tactics home', w === 390 ? 'phone-390-tactics' : '');
  await page.click('.tcard[data-id="fried-liver"]'); await page.waitForFunction(() => window.__tac && window.__tac.run() && window.__tac.run().phase === 'user', null, { timeout: 15000 });
  await verify('Puzzle screen', w === 390 ? 'phone-390-puzzle' : '');
  await tap(page, '#pz-menu');
  await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('#setup:not(.hidden) .ocard');
  await tap(page, '.ocard[data-id="italian"] .mini[data-act="watch"]'); await page.waitForSelector('#demo:not(.hidden) cg-board'); await verify('Watch-it-first screen'); await tap(page, '#demo-gback');
  await page.waitForSelector('#setup:not(.hidden) .ocard'); await tap(page, '.ocard[data-id="italian"]');
  await page.waitForSelector('#start-btn'); await tap(page, '#start-btn'); await page.waitForSelector('#train:not(.hidden) cg-board'); await verify('Drill / board screen', w === 390 ? 'phone-390-drill' : '');
  await tap(page, '#menu-btn').catch(() => {});
  await page.click('.tab[data-tab="profile"]').catch(() => tap(page, '[data-tab="profile"]')); await page.waitForSelector('#profile:not(.hidden)'); await verify('Profile', w === 390 ? 'phone-390-profile' : '');
  await tap(page, '#profile [data-open-about]'); await page.waitForSelector('#about:not(.hidden)'); await verify('About & licenses', w === 390 ? 'phone-390-about' : '');
  await tap(page, '#about-close'); await tap(page, '#profile-close');
  await page.evaluate(() => document.querySelector('#fbsheet').classList.remove('hidden')); await verify('Feedback sheet'); await closeSheets(page);
  await page.evaluate(() => { document.querySelector('#summary').classList.remove('hidden'); }); await verify('Line summary'); await closeSheets(page);
  // real click opens a popup to BMC (page itself stubbed, no real visit)
  await ctx.route('https://buymeacoffee.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>bmc</title>' }));
  await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
  const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), page.click('.top-right .tip-pill')]);
  check(`${tag} tapping the pill opens the tip page in a new tab and leaves the app as it was`, !!pop && /buymeacoffee\.com\/sethcmoynai/.test(pop.url()) && await page.isVisible('#tactics'));
  if (pop) await pop.close();
  const dup = await page.$$eval('.top-right [data-tip-pill]', (a) => a.length);
  check(`${tag} exactly one pill in the header (no duplicates)`, dup === 1);
  await ctx.close();
}
await sweep(390);
await sweep(360);
await sweep(1100);
// the safe-area inset is honoured: header and board-screen bars pad for the notch, and the pill sits inside them
{
  const { ctx, page } = await fresh(390);
  const css = await (await page.request.get(new URL('css/revamp.css', BASE).href)).text();
  check('safe-area: bars use env(safe-area-inset-top) and env(safe-area-inset-right); pill lives inside the bars', /\.top \{[^}]*safe-area-inset-top|--safe-t: env\(safe-area-inset-top/.test(css) && /safe-area-inset-right/.test(css) && await page.evaluate(() => !!document.querySelector('.top .tip-pill') && !!document.querySelector('.gbar .tip-pill')));
  await ctx.close();
}
check('no page errors', errors.length === 0, errors.join('|'));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
