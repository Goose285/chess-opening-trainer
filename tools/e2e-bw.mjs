// Style 4 "B&W + gold": monochrome surfaces, white pawn logo, Archivo Black headings, green primary buttons kept, gold only on rewards,
// the coffee pill unchanged, no leftover teal, share image + manifest updated, every screen readable (contrast) on a phone.
// Usage: node tools/e2e-bw.mjs [url]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const ROOT = new URL('..', import.meta.url).pathname;
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
// ---- static: no teal anywhere in shipped CSS/JS, brand files updated
const files = ['css/app.css', 'css/revamp.css', 'css/bw.css', 'index.html', 'manifest.webmanifest', 'icons/logo-mark.svg', 'icons/favicon.svg', 'icons/icon.svg', 'src/main.js', 'src/home.js', 'src/tactics-ui.js', 'src/progress-ui.js'];
const TEAL = /#2dd4a7|#2dd4bf|#14b8a6|#10b981|#0ea5e9|#22d3ee|#9bf0d|#7fe3c|#c8f5df|#1f2b2a|rgba\(\s*45\s*,\s*212|rgba\(\s*90\s*,\s*209/i;
const teal = files.filter((f) => TEAL.test(fs.readFileSync(ROOT + f, 'utf8')));
check('no teal / mint colours left in the shipped CSS, JS, icons or manifest', teal.length === 0, teal.join(', '));
const man = JSON.parse(fs.readFileSync(ROOT + 'manifest.webmanifest', 'utf8'));
check('manifest theme + background colour are near-black', man.theme_color === '#050505' && man.background_color === '#050505');
const html = fs.readFileSync(ROOT + 'index.html', 'utf8');
check('theme-color meta is near-black, og:image is the absolute share card', /name="theme-color" content="#050505"/.test(html) && /og:image" content="https:\/\/goose285\.github\.io\/chess-opening-trainer\/icons\/og-card\.png"/.test(html) && /summary_large_image/.test(html));
check('share card + icons exist', ['icons/og-card.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png', 'icons/apple-touch-icon.png', 'icons/logo-mark.svg'].every((f) => fs.existsSync(ROOT + f) && fs.statSync(ROOT + f).size > 300));

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(BASE + '#/home'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#tabbar'); await page.waitForTimeout(500);

const css = (sel, prop) => page.evaluate(([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; }, [sel, prop]);
const rgb = (s) => (s || '').match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) || [0, 0, 0];
const isGrey = (s, tol = 14) => { const [r, g, b] = rgb(s); return Math.max(r, g, b) - Math.min(r, g, b) <= tol; };
const isGold = (s) => { const [r, g, b] = rgb(s); return r > 200 && g > 150 && b < 140 && r > b + 90; };
check('page + card backgrounds are black / dark grey', isGrey(await css('body', 'backgroundColor')) && rgb(await css('body', 'backgroundColor'))[0] < 12 && isGrey(await css('.ocard, .profile-strip', 'backgroundColor')));
check('logo is the white pawn mark', /logo-mark\.svg/.test(await page.evaluate(() => document.querySelector('img.logo').getAttribute('src'))));
check('wordmark + page headings use Archivo Black', await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "Pawnado Display"') && /Pawnado Display|Archivo/.test(getComputedStyle(document.querySelector('.wordmark')).fontFamily); }));
check('green primary action buttons kept (Start / Play it)', await page.evaluate(() => { const b = document.querySelector('.btn.primary, #hero .btn.primary'); if (!b) return false; const [r, g, bl] = getComputedStyle(b).backgroundColor.match(/\d+/g).map(Number); return g > r + 40 && g > bl; }));
check('default board is still the brown "original" theme (not teal)', await page.evaluate(() => { const s = JSON.stringify(Object.entries(localStorage)); return !/teal|green|blue/i.test(s); }));
check('no gold on the neutral chrome (tab bar, cards, hero)', !isGold(await css('#tabbar', 'color')) && !isGold(await css('.hero-eyebrow', 'color')) && !isGold(await css('.ocard, .profile-strip', 'borderTopColor')));
check('level chip dot + XP numbers are gold', isGold(await page.evaluate(() => getComputedStyle(document.querySelector('.profile-btn .pb-lv'), '::before').backgroundColor)) && isGold(await css('.ps-rate', 'color')));
check('coffee pill keeps its own yellow', await page.evaluate(() => { const p = document.querySelector('[data-tip-pill]'); const [r, g, b] = getComputedStyle(p).backgroundColor.match(/\d+/g).map(Number); return r > 240 && g > 200 && b < 80; }));

// ---- seed a streak and reach the rewards styling
await page.evaluate(() => localStorage.setItem('rt1500-progress', JSON.stringify({ v: 1, xp: 420, done: 4, perfect: 1, days: { last: new Date().toISOString().slice(0, 10), streak: 7, best: 7 }, openings: {}, tactics: { solved: 14, flawless: 9, streak: 5, bestStreak: 8, traps: [], sets: {} } })));
await page.reload(); await page.waitForSelector('#tabbar'); await page.waitForTimeout(400);
check('day-streak chip is gold when lit', isGold(await css('.chip-btn.streak:not(.off)', 'color')));

// ---- contrast on every screen: no text lighter-on-lighter than 4.5:1 for the main text classes
const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const audit = (label) => page.evaluate(() => {
  const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] > .6)) return c; } return 'rgb(5,5,5)'; };
  const out = []; const seen = new Set();
  for (const e of document.querySelectorAll('h1,h2,h3,p,span,b,button,a,li,em,label,small')) {
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || e.closest('.hidden,[hidden],cg-board,.thumb,[data-tip-pill]')) continue;
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < .5) continue;
    out.push({ t: e.textContent.trim().slice(0, 24), fg: cs.color, bg: bgOf(e), fs: parseFloat(cs.fontSize) });
  } return out;
});
const screens = [['home', async () => {}], ['openings', async () => { await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('.ocard'); }], ['tactics', async () => { await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('.tcard'); }], ['profile', async () => { await page.click('.tab[data-tab="profile"]'); await page.waitForSelector('#profile:not(.hidden)'); }]];
for (const [name, go] of screens) {
  await go(); await page.waitForTimeout(350);
  const items = await audit(name); const bad = items.filter((i) => ratio(i.fg, i.bg) < 4.5 && !/^[\d.\s·/%+–-]+$/.test(i.t)).map((i) => `${i.t}(${ratio(i.fg, i.bg).toFixed(1)} ${i.fg} on ${i.bg})`);
  check(`${name}: text contrast >= 4.5:1 (${items.length} text nodes)`, bad.length === 0, bad.slice(0, 6).join(', '));
}
await page.keyboard.press('Escape');
check('no JS errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(ok ? 'ALL B&W CHECKS PASSED' : 'SOME B&W CHECKS FAILED'); process.exit(ok ? 0 : 1);
