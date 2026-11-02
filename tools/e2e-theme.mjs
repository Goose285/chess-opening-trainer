// Premium theme (quiet luxury): black / warm white / one refined gold. Checks the tokens, fonts (Cormorant never below 19px), the gold primary buttons,
// achievements-only gold, distinguishable trainer feedback, no green/teal left in the UI, the header at 360px and 320px, reduced motion, and 4.5:1 text contrast.
// The coffee pill keeps its own yellow; boards are untouched. Usage: node tools/e2e-theme.mjs [url]
import { chromium } from 'playwright-core';
import { stubAnalytics } from './lib-net.mjs';
import fs from 'node:fs';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const ROOT = new URL('..', import.meta.url).pathname;
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
// ---- static: no teal / green palette anywhere in the shipped UI files, brand files updated
const files = ['css/app.css', 'css/revamp.css', 'css/theme.css', 'css/share.css', 'index.html', 'manifest.webmanifest', 'icons/logo-mark.svg', 'icons/favicon.svg', 'icons/icon.svg', 'src/main.js', 'src/home.js', 'src/tactics-ui.js', 'src/progress-ui.js', 'src/share.js'];
const OLD_PALETTE = /#2dd4a7|#2dd4bf|#14b8a6|#10b981|#0ea5e9|#22d3ee|#5ad19a|#22c55e|#4ade80|#a3e635|#14301f|#f5c451|rgba\(\s*74\s*,\s*222|rgba\(\s*45\s*,\s*212|rgba\(\s*90\s*,\s*209|rgba\(\s*245\s*,\s*196/i;
const old = files.filter((f) => OLD_PALETTE.test(fs.readFileSync(ROOT + f, 'utf8')));
check('no teal, green or the old yellow-gold left in the shipped CSS, JS, icons or manifest', old.length === 0, old.join(', '));
check('old bw.css theme file and Archivo Black are gone', !fs.existsSync(ROOT + 'css/bw.css') && !fs.existsSync(ROOT + 'fonts/archivo-black-latin.woff2'));
const man = JSON.parse(fs.readFileSync(ROOT + 'manifest.webmanifest', 'utf8'));
check('manifest theme + background colour are near-black', man.theme_color === '#060606' && man.background_color === '#060606');
const html = fs.readFileSync(ROOT + 'index.html', 'utf8');
check('theme-color meta is near-black, og:image is the absolute share card, theme.css is the last stylesheet', /name="theme-color" content="#060606"/.test(html) && /og:image" content="https:\/\/goose285\.github\.io\/chess-opening-trainer\/icons\/og-card\.png"/.test(html) && /summary_large_image/.test(html) && html.lastIndexOf('css/theme.css') > html.lastIndexOf('css/share.css'));
check('share card + icons exist', ['icons/og-card.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png', 'icons/apple-touch-icon.png', 'icons/logo-mark.svg'].every((f) => fs.existsSync(ROOT + f) && fs.statSync(ROOT + f).size > 300));
const themeCss = fs.readFileSync(ROOT + 'css/theme.css', 'utf8');
check('theme.css has no glow / gradient-text / looping animation', !/text-shadow:\s*0 0/.test(themeCss) && !/background-clip:\s*text/.test(themeCss) && !/infinite/.test(themeCss));

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
stubAnalytics(browser);
const mk = (w, h = 844, extra = {}) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctx = await mk(390);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important}'; document.head.appendChild(s); }));
await page.goto(BASE + '#/home'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#tabbar'); await page.waitForTimeout(500);

const css = (sel, prop) => page.evaluate(([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; }, [sel, prop]);
const rgb = (s) => (s || '').match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) || [0, 0, 0];
const isGrey = (s, tol = 14) => { const [r, g, b] = rgb(s); return Math.max(r, g, b) - Math.min(r, g, b) <= tol; };
const isGold = (s) => { const [r, g, b] = rgb(s); return r > 170 && g > 130 && r > b + 40 && r >= g && hue(s) > 33 && hue(s) < 52; };
const hue = (s) => { const [r, g, b] = rgb(s).map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
check('page background is #060606 and cards are neutral near-black', rgb(await css('body', 'backgroundColor')).join() === '6,6,6' && isGrey(await css('.hero', 'backgroundColor')) && rgb(await css('.hero', 'backgroundColor'))[0] < 20);
check('logo is the white pawn mark', /logo-mark\.svg/.test(await page.evaluate(() => document.querySelector('img.logo').getAttribute('src'))));
check('Cormorant Garamond (display) and Inter (UI) are loaded from our own files', await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 24px "Cormorant Garamond"') && document.fonts.check('400 14px Inter') && /Cormorant/.test(getComputedStyle(document.querySelector('.wordmark')).fontFamily) && /Inter/.test(getComputedStyle(document.body).fontFamily); }));
check('primary action buttons are gold with dark text (Start / Play it), not green', await page.evaluate(() => { const bs = [...document.querySelectorAll('#hero .btn.primary, #home-daily .btn.primary')]; return bs.length >= 2 && bs.every((b) => { const cs = getComputedStyle(b); const m = (cs.backgroundImage + cs.backgroundColor).match(/rgb\((\d+), (\d+), (\d+)\)/g) || []; const c = m.map((x) => x.match(/\d+/g).map(Number)); const [r, g, bl] = c[0] || [0, 0, 0]; const ink = cs.color.match(/\d+/g).map(Number); return c.length && r > g && g > bl + 30 && r > 180 && ink[0] < 40; }); }));
check('no green anywhere on Home: no element has a green-dominant background, border or text colour', await page.evaluate(() => { const bad = []; for (const e of document.querySelectorAll('body *')) { if (e.closest('cg-board,.thumb,[data-tip-pill],.tip-card,.sprout')) continue; const cs = getComputedStyle(e); for (const k of ['color', 'backgroundColor', 'borderTopColor']) { const m = cs[k].match(/\d+(\.\d+)?/g); if (!m) continue; const [r, g, b, a = 1] = m.map(Number); if (+a > .3 && g > r + 25 && g > b + 25) bad.push(e.className + ':' + k + ':' + cs[k]); } } return bad.length === 0 ? true : bad.slice(0, 4).join(' | '); }) === true);
check('default board is still the brown "original" theme', await page.evaluate(() => { const s = JSON.stringify(Object.entries(localStorage)); return !/teal|green|blue/i.test(s); }));
check('no gold on the neutral chrome (idle tab, hero card, header chips)', !isGold(await css('.tab:not(.active)', 'color')) && !isGold(await css('.hero', 'borderTopColor')) && !isGold(await css('#theme-btn', 'color')));
check('active tab and the level dot are gold', isGold(await css('.tab.active', 'color')) && isGold(await page.evaluate(() => getComputedStyle(document.querySelector('.profile-btn .pb-lv'), '::before').backgroundColor)));
check('coffee pill keeps its own yellow', await page.evaluate(() => { const p = document.querySelector('[data-tip-pill]'); const [r, g, b] = getComputedStyle(p).backgroundColor.match(/\d+/g).map(Number); return r > 240 && g > 200 && b < 80; }));

// ---- seed a streak and reach the rewards styling
await page.evaluate(() => localStorage.setItem('rt1500-progress', JSON.stringify({ v: 1, xp: 420, done: 4, perfect: 1, days: { last: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(), streak: 7, best: 7 }, openings: {}, tactics: { solved: 14, flawless: 9, streak: 5, bestStreak: 8, traps: [], sets: {} } })));
await page.reload(); await page.waitForSelector('#tabbar'); await page.waitForTimeout(500);
check('day-streak chip is gold when lit, ring is hairline gold, and nothing loops (no infinite animation on achievements)', isGold(await css('.chip-btn.streak:not(.off)', 'color')) && await page.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity && !/pulse/.test(a.animationName || '')).length === 0));

// ---- header + wordmark fit on small phones (360 and 320 wide), no horizontal scroll
for (const w of [390, 360, 320]) {
  const c = await mk(w, 740); const p = await c.newPage(); await p.goto(BASE + '#/home'); await p.waitForSelector('#tabbar'); await p.waitForTimeout(700);
  const r = await p.evaluate(async () => { await document.fonts.ready; const vw = innerWidth; const els = ['.brand .wordmark', '#streak-chip', '#profile-btn', '#theme-btn', '[data-tip-pill]', '#tabbar'].map((s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { s, l: b.left, r: b.right, w: b.width }; }); const top = document.querySelector('.top'); return { vw, sw: document.documentElement.scrollWidth, els, topH: top.getBoundingClientRect().height }; });
  check(`${w}px: header fits on one row, wordmark/chips/coffee fully on screen, no sideways scroll`, r.sw <= r.vw && r.els.every((e) => e.l >= -0.5 && e.r <= r.vw + 0.5) && r.topH < 80, JSON.stringify({ sw: r.sw, topH: r.topH, edge: r.els.map((e) => `${e.s}:${Math.round(e.l)}-${Math.round(e.r)}`).join(' ') }));
  await c.close();
}

// ---- serif never below 19px, on every screen we can reach
const serifMin = () => page.evaluate(() => { let min = 99, who = ''; for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue; if (!/Cormorant/.test(cs.fontFamily)) continue; if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const fs = parseFloat(cs.fontSize); if (fs < min) { min = fs; who = e.className || e.tagName; } } return { min, who }; });
let serifOk = true, serifWhy = '';
for (const [name, go] of [['home', async () => {}], ['openings', async () => { await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('.ocard'); }], ['tactics', async () => { await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('.tcard'); }], ['profile', async () => { await page.click('.tab[data-tab="profile"]'); await page.waitForSelector('#profile:not(.hidden)'); }], ['about', async () => { await page.evaluate(() => document.querySelector('[data-open-about]').click()); await page.waitForSelector('#about:not(.hidden)'); }]]) {
  await go(); await page.waitForTimeout(250); const r = await serifMin(); if (r.min < 19) { serifOk = false; serifWhy += `${name}:${r.min}px ${r.who}; `; }
  if (name === 'about') { await page.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'))); }
}
check('Cormorant Garamond is never rendered below 19px on any screen', serifOk, serifWhy);
await page.evaluate(() => { document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden')); document.body.classList.remove('noscroll'); }); await page.click('.tab[data-tab="home"]'); await page.waitForTimeout(250);

// ---- trainer feedback: "excellent" (gold) and "inaccuracy" (warm copper) must stay distinguishable by hue AND by fill/shape
await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('.ocard'); await page.click('#opening-grid .ocard >> nth=0'); await page.click('#start-btn'); await page.waitForSelector('#train:not(.hidden)');
const fbState = (st) => page.evaluate((st) => { const f = document.querySelector('#feedback'); const b = f.querySelector('.fb-badge'); f.className = 'card feedback state-' + st; const cs = getComputedStyle(b); return { bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow }; }, st);
const ex = await fbState('excellent'), ina = await fbState('inaccuracy'), mis = await fbState('mistake'), blu = await fbState('blunder');
const filled = (s) => (s.bg.match(/[\d.]+/g) || []).length < 4 || +s.bg.match(/[\d.]+/g)[3] > .5;
check('excellent is an outlined gold badge, inaccuracy a filled warm copper badge (different fill AND hue)', !filled(ex) && filled(ina) && isGold(ex.color) && Math.abs(hue(ex.color) - hue(ina.bg)) >= 12 && hue(ina.bg) < hue(ex.color) - 5, `${ex.color} / ${ina.bg}`);
check('warning scale (inaccuracy, mistake, blunder) is warm and never gold or green', [ina.bg, mis.bg, blu.bg].every((c) => { const h = hue(c); return h < 30 || h > 330; }), [ina.bg, mis.bg, blu.bg].join(' '));
await page.click('#menu-btn'); await page.waitForTimeout(200); await page.click('.tab[data-tab="home"]');

// ---- reduced motion: the one earn animation (sheen) is switched off
const rc = await mk(390, 844, { reducedMotion: 'reduce' }); const rp = await rc.newPage(); await rp.goto(BASE + '#/home'); await rp.evaluate(() => { const d = new Date(); const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; localStorage.setItem('rt1500-progress', JSON.stringify({ v: 1, xp: 50, done: 1, days: { last: ds, streak: 1, best: 1 }, daily: { day: ds, otd: '', kinds: ['otd', 'puzzles', 'lines'], prog: { otd: 1 }, done: { otd: true } } })); }); await rp.reload(); await rp.waitForSelector('#home-daily .dq.done');
check('prefers-reduced-motion: the quest sheen is off and nothing animates', await rp.evaluate(() => { const e = document.querySelector('#home-daily .dq.done'); const cs = getComputedStyle(e, '::after'); return cs.display === 'none' || cs.animationName === 'none'; }));
await rc.close();
const mc = await mk(390, 844); const mp = await mc.newPage(); await mp.goto(BASE + '#/home'); await mp.evaluate(() => { const d = new Date(); const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; localStorage.setItem('rt1500-progress', JSON.stringify({ v: 1, xp: 50, done: 1, days: { last: ds, streak: 1, best: 1 }, daily: { day: ds, otd: '', kinds: ['otd', 'puzzles', 'lines'], prog: { otd: 1 }, done: { otd: true } } })); }); await mp.reload(); await mp.waitForSelector('#home-daily .dq.done');
check('completed quest: gold check + gold bar, and exactly one sheen animation that runs once', await mp.evaluate(() => { const e = document.querySelector('#home-daily .dq.done'); const ck = getComputedStyle(e.querySelector('.dq-ck')).backgroundColor, bar = getComputedStyle(e.querySelector('.dq-bar i')).backgroundColor; const a = getComputedStyle(e, '::after'); const g = (s) => { const [r, gg, b] = s.match(/\d+/g).map(Number); return r > 170 && gg > 130 && b < 130; }; return g(ck) && g(bar) && a.animationIterationCount === '1'; }));
await mc.close();

const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const audit = (label) => page.evaluate(() => {
  const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const st = getComputedStyle(n); const gm = st.backgroundImage.match(/rgba?\([^)]*\)/); const c = gm ? gm[0] : st.backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] > .6)) return c; } return 'rgb(5,5,5)'; };
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
console.log(ok ? 'ALL PREMIUM THEME CHECKS PASSED' : 'SOME PREMIUM THEME CHECKS FAILED'); process.exit(ok ? 0 : 1);
