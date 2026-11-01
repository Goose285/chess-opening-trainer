// GoatCounter: the tag is in <head> exactly as given, the counter script is stubbed (no real network), screen changes call
// goatcounter.count({path}) once each, nothing breaks when the script is blocked, there is no service worker / offline cache, About mentions it.
// Usage: node tools/e2e-analytics.mjs [url]   (serve the folder first: python3 -m http.server 8099)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('index.html head has the GoatCounter tag (async, pawnado endpoint, gc.zgo.at)', /<head>[\s\S]*<script data-goatcounter="https:\/\/pawnado\.goatcounter\.com\/count" async src="\/\/gc\.zgo\.at\/count\.js"><\/script>[\s\S]*<\/head>/.test(html));
check('it is the only HTML entry page', fs.readdirSync(new URL('..', import.meta.url)).filter((f) => f.endsWith('.html')).join() === 'index.html');
check('no service worker or offline cache to interfere', !/serviceWorker/.test(fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8')) && !fs.existsSync(new URL('../sw.js', import.meta.url)) && !/serviceworker/i.test(fs.readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8')));

const STUB = "window.goatcounter = window.goatcounter || {}; window.__gc = []; window.goatcounter.count = function (o) { window.__gc.push(o); };";
async function open(mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; const hits = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/gc.zgo.at/**', (r) => { hits.push(r.request().url()); return mode === 'blocked' ? r.abort() : r.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }); });
  await page.goto(BASE + '#/home'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#tabbar');
  return { ctx, page, errors, hits };
}
const gc = (page) => page.evaluate(() => (window.__gc || []).map((o) => o.path));

// ---- counter loads and screens are counted
let { ctx, page, errors, hits } = await open('stub');
await page.waitForFunction(() => window.goatcounter && window.goatcounter.count);
check('the counter script is requested from gc.zgo.at', hits.length >= 1 && /gc\.zgo\.at\/count\.js/.test(hits[0]), hits[0]);
check('landing view is left to the tag (no duplicate count on load)', (await gc(page)).length === 0);
await page.click('.tab[data-tab="openings"]'); await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
await page.click('.tab[data-tab="home"]'); await page.click('.tab[data-tab="home"]');
await page.click('#profile-btn'); await page.waitForSelector('#profile:not(.hidden)');
const paths = await gc(page);
check('tab changes count /openings, /tactics, home (base path), then /profile — once each', paths.join(' ') === `/openings /tactics ${new URL(BASE).pathname} /profile`, paths.join(' '));
const first = await page.evaluate(() => window.__gc[0]);
check('count() gets a title and is a page view, not an event', /Pawnado/.test(first.title) && first.event === false);
await page.keyboard.press('Escape'); await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard'); await page.click('.tcard[data-id="fried-liver"]');
await page.waitForFunction(() => window.__tac && window.__tac.run());
check('opening a puzzle counts /tactics/puzzle', (await gc(page)).includes('/tactics/puzzle'));
check('no page errors', errors.length === 0, errors.join('|')); await ctx.close();

// ---- blocked (ad blocker / offline): the app still works and nothing throws
({ ctx, page, errors } = await open('blocked'));
await page.click('.tab[data-tab="openings"]'); await page.click('.tab[data-tab="tactics"]'); await page.click('#profile-btn'); await page.waitForSelector('#profile:not(.hidden)');
check('with the counter script blocked the tabs and Profile still work, no errors', errors.length === 0 && !(await page.evaluate(() => !!(window.goatcounter && window.goatcounter.count))), errors.join('|'));
await page.keyboard.press('Escape');

// ---- About mentions it
await page.click('.tab[data-tab="home"]'); await page.click('.home-foot [data-open-about]'); await page.waitForSelector('#about:not(.hidden)');
const txt = await page.innerText('#about-body');
check('About has a Privacy note naming GoatCounter and "no cookies"', /privacy/i.test(txt) && /GoatCounter/.test(txt) && /no cookies/i.test(txt));
check('GoatCounter link opens safely in a new tab', await page.$eval('#about-body a[href*="goatcounter.com"]', (a) => a.target === '_blank' && /noopener/.test(a.rel)));
await ctx.close(); await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
