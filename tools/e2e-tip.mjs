// Buy Me a Coffee tip card in the Profile sheet (above the reset button) and in About; opens in a new tab with rel=noopener.
// Usage: node tools/e2e-tip.mjs [url] [screenshot.png]
import { chromium } from 'playwright-core';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOT = process.argv[3] || '';
const URL_TIP = 'https://buymeacoffee.com/sethcmoynai';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE + '#/openings'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
await page.click('.tab[data-tab="profile"]'); await page.waitForSelector('#profile:not(.hidden) .tip-card');
const info = await page.$eval('#profile .tip-card', (a) => ({ href: a.href, target: a.target, rel: a.rel, text: a.textContent.replace(/\s+/g, ' ').trim() }));
check('Profile has the tip card linking to the Buy Me a Coffee page', info.href === URL_TIP, info.href);
check('opens in a new tab with rel=noopener', info.target === '_blank' && /noopener/.test(info.rel), `${info.target} ${info.rel}`);
check('has ☕, "Buy me a coffee" and the short line', /☕/.test(info.text) && /Buy me a coffee/.test(info.text) && /Pawnado is free\. Tips keep it growing\./.test(info.text), info.text);
check('exactly one tip card on the Profile', (await page.$$('#profile .tip-card')).length === 1);
check('card sits near the bottom: after the road, before Reset', await page.evaluate(() => { const t = document.querySelector('#profile .pf-tip'), r = document.querySelector('#profile .road'), x = document.querySelector('#profile .pf-reset'); const f = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); return f(r, t) && f(t, x); }));
check('card uses Buy Me a Coffee yellow with dark text', await page.$eval('#profile .tip-card', (a) => { const c = getComputedStyle(a); return /255, 221, 0|255, 201, 51/.test(c.backgroundImage) && /rgb\(35, 28, 0\)/.test(getComputedStyle(a.querySelector('b')).color); }));
// a click opens a popup tab (we only check that a page is requested; no real network visit)
await ctx.route('https://buymeacoffee.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>bmc</title>' }));
await page.$eval('#profile-body', (b) => b.scrollTo(0, b.scrollHeight)); await page.$eval('#profile .modal-card', (b) => b.scrollTo && b.scrollTo(0, b.scrollHeight)).catch(() => {});
await page.waitForTimeout(200);
check('tip card is reachable on a phone (scrolls into view, tappable)', await page.$eval('#profile .tip-card', (a) => { a.scrollIntoView({ block: 'center' }); const b = a.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight && b.height >= 56; }));
if (SHOT) await page.screenshot({ path: SHOT });
const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), page.click('#profile .tip-card')]);
check('tapping it opens a new tab, the app stays where it was', !!pop && /buymeacoffee\.com\/sethcmoynai/.test(pop.url()) && await page.isVisible('#profile'), pop ? pop.url() : 'no popup');
if (pop) await pop.close();
// About
await page.click('#profile [data-open-about]'); await page.waitForSelector('#about:not(.hidden) .tip-card');
const ab = await page.$eval('#about .tip-card', (a) => ({ href: a.href, target: a.target, rel: a.rel }));
check('About has the quieter tip row too, same link, new tab, noopener', ab.href === URL_TIP && ab.target === '_blank' && /noopener/.test(ab.rel));
check('About still shows the source-code and licence buttons', await page.isVisible('#about-source'));
if (SHOT) await page.screenshot({ path: SHOT.replace(/\.png$/, '-about.png') });
check('no page errors', errors.length === 0, errors.join('|'));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
