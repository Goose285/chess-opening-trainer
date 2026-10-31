// Branding: title, wordmark, tagline, favicon, manifest and Add-to-Home-Screen icons. Usage: node tools/e2e-brand.mjs [url]
import { chromium } from 'playwright-core';
const URL_ = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '') + '#/openings';
const SHOT = process.env.SHOT || '/workspace/pawnado-header-phone.png';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL_); await page.waitForSelector('.ocard');
check('page title names the niche: gambits & traps for beginner to intermediate players', (await page.title()) === 'Pawnado — Gambits & traps for beginner to intermediate players', await page.title());
check('header wordmark reads "Pawnado"', (await page.textContent('.brand .wordmark')).replace(/\s+/g, ' ').trim() === 'Pawnado');
check('tagline "Your road to 1500" is in the header (desktop) and the page heading', (await page.textContent('.brand .tagline')).trim() === 'Your road to 1500' && /Gambits & traps for beginner to intermediate players/.test(await page.textContent('.intro h1')));
check('old names are gone from the page', !/Opening Trainer/i.test(await page.content()) && !/Road to 1500/.test(await page.evaluate(() => document.body.innerText)));
check('wordmark is fully visible on the phone', await page.evaluate(() => { const w = document.querySelector('.brand .wordmark'); const r = w.getBoundingClientRect(); const pre = w.querySelector('.wm-pre'); return r.width > 60 && getComputedStyle(pre).display !== 'none'; }));
check('profile sheet and About use the new name', await (async () => { await page.click('#profile-btn'); await page.waitForSelector('#profile:not(.hidden)'); const t = await page.textContent('#profile-title'); await page.click('#profile-close'); return t.trim() === 'Pawnado'; })());
const head = await page.evaluate(() => ({
  manifest: document.querySelector('link[rel=manifest]')?.href,
  touch: document.querySelector('link[rel=apple-touch-icon]')?.href,
  icon: document.querySelector('link[rel=icon]')?.href,
  appTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content,
  capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
  logoOk: (() => { const i = document.querySelector('.brand img.logo'); return i && i.complete && i.naturalWidth > 0; })(),
}));
check('apple-mobile-web-app-title + capable', head.appTitle === 'Pawnado' && head.capable === 'yes');
check('header logo image loads', head.logoOk);
const get = async (u) => { const r = await ctx.request.get(u); return { ok: r.ok(), type: r.headers()['content-type'] || '', buf: await r.body() }; };
const man = await get(head.manifest); const mj = JSON.parse(man.buf.toString());
check('manifest loads and names the app', man.ok && mj.name === 'Pawnado' && mj.short_name === 'Pawnado' && /beginner to intermediate/i.test(mj.description) && /road to 1500/i.test(mj.description));
check('manifest is standalone with start_url/scope inside the app', mj.display === 'standalone' && !!mj.start_url && !!mj.scope);
let iconsOk = mj.icons.length >= 3;
for (const ic of mj.icons) { const r = await get(new URL(ic.src, head.manifest).href); const w = r.buf.readUInt32BE(16); iconsOk = iconsOk && r.ok && /png/.test(r.type) && `${w}x${w}` === ic.sizes; }
check('manifest icons (192, 512, maskable 512) load with the declared sizes', iconsOk);
check('manifest has a maskable icon', mj.icons.some((i) => /maskable/.test(i.purpose)));
const at = await get(head.touch); check('apple-touch-icon is a 180x180 PNG', at.ok && /png/.test(at.type) && at.buf.readUInt32BE(16) === 180 && at.buf.readUInt32BE(20) === 180);
const fv = await get(head.icon); check('favicon loads', fv.ok);
check('no sideways scroll on phone', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
check('header fits the phone screen', await page.evaluate(() => { const b = document.querySelector('.top').getBoundingClientRect(); return [...document.querySelectorAll('.top *')].every((e) => { const r = e.getBoundingClientRect(); return r.right <= innerWidth + 0.5 && r.left >= -0.5; }) && b.height < 80; }));
await page.screenshot({ path: SHOT, clip: { x: 0, y: 0, width: 390, height: 300 } });
check('no JS errors', errors.length === 0, errors.join('|'));
await browser.close();
console.log(ok ? '\nALL BRAND CHECKS PASSED' : '\nSOME BRAND CHECKS FAILED'); process.exit(ok ? 0 : 1);
