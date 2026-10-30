// "About & licenses" screen, licence files served with the site, removed piece sets gone, saved-theme fallback.
// Usage: node tools/e2e-about.mjs [url]
import { chromium } from 'playwright-core';
import { COMPONENTS, REPO_URL } from '../src/licenses.js';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOT = process.env.SHOT || '/workspace/road-to-1500-about-phone.png';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const base = new URL('.', BASE).href;
const get = async (p) => { const r = await ctx.request.get(new URL(p, base).href); return { ok: r.ok(), status: r.status(), text: r.ok() ? await r.text() : '' }; };

// ---- files published with the site
const lic = await get('LICENSE'); check('LICENSE is served and is GPL v3', lic.ok && /GNU GENERAL PUBLIC LICENSE/.test(lic.text) && /Version 3/.test(lic.text));
for (const f of ['THIRD_PARTY/NOTICES.md', 'THIRD_PARTY/PIECE-SET-CREDITS.md', 'THIRD_PARTY/licenses/chess.js-BSD-2-Clause.txt', 'vendor/stockfish/LICENSE-stockfish-GPLv3.txt']) check(`${f} is served`, (await get(f)).ok);
for (const s of ['alpha', 'california', 'maestro', 'fresca', 'horsey']) check(`pieces/${s}/wK.svg is gone`, !(await get(`pieces/${s}/wK.svg`)).ok);
check('approved sets still served', (await Promise.all(['cburnett', 'merida', 'pixel', 'kosal'].map((s) => get(`pieces/${s}/wK.svg`)))).every((r) => r.ok));

// ---- saved theme from a removed set falls back to the default
await page.goto(BASE + '#/openings'); await page.evaluate(() => localStorage.setItem('rt1500-theme', JSON.stringify({ board: 'purple', pieces: 'horsey' })));
await page.reload(); await page.waitForSelector('.ocard');
check('removed saved piece set falls back to cburnett', await page.evaluate(() => document.documentElement.dataset.pieces) === 'cburnett');
check('board choice is kept', await page.evaluate(() => document.documentElement.dataset.board) === 'purple');
check('stored value is repaired', JSON.parse(await page.evaluate(() => localStorage.getItem('rt1500-theme'))).pieces === 'cburnett');
await page.evaluate(() => localStorage.setItem('rt1500-theme', '{"pieces":"alpha"}')); await page.reload(); await page.waitForSelector('.ocard');
check('another removed set (alpha) also falls back', await page.evaluate(() => document.documentElement.dataset.pieces) === 'cburnett');

// ---- Home footer -> About
await page.goto(BASE + '#/home'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#hero');
check('Home footer shows About + source links', await page.isVisible('.home-foot [data-open-about]') && (await page.getAttribute('.home-foot a', 'href')) === REPO_URL);
await page.click('.home-foot [data-open-about]'); await page.waitForSelector('#about:not(.hidden)');
const txt = await page.innerText('#about-body');
check('About lists every component with its licence', COMPONENTS.every((c) => txt.includes(c.license) && txt.includes(c.name.split(' (')[0].slice(0, 20))));
for (const k of ['GNU General Public License v3', 'no warranty', 'Stockfish', 'Chessground', 'chess.js', 'Jeff Hlywa', 'Colin M. L. Burnett', 'Kosal Sen', 'therealqtpi', 'Armando Hernandez Marroquin', 'Lichess puzzle database', 'app-store build', 'not affiliated']) check(`About mentions "${k}"`, txt.includes(k));
check('About has no warning icon', !/⚠/.test(txt));
check('"Get the complete source code" links to the repository', (await page.getAttribute('#about-source', 'href')) === REPO_URL);
const links = await page.$$eval('#about-body a[href]', (a) => a.map((x) => x.href)); check('every link opens in a new tab safely', (await page.$$eval('#about-body a[href]', (a) => a.every((x) => x.target === '_blank' && /noopener/.test(x.rel)))) && links.length > 20, `${links.length} links`);
check('About fits the phone (no sideways scroll)', await page.evaluate(() => { const c = document.querySelector('#about .modal-card'); return c.scrollWidth <= c.clientWidth + 1; }));
await page.screenshot({ path: SHOT });
await page.keyboard.press('Escape'); check('Escape closes About', await page.isHidden('#about'));

// ---- Profile -> About, stacking over the profile sheet
await page.click('#profile-strip'); await page.waitForSelector('#profile:not(.hidden)');
await page.click('#profile [data-open-about]'); await page.waitForSelector('#about:not(.hidden)');
check('About opens over the Profile sheet', await page.isVisible('#about') && await page.isVisible('#profile'));
await page.keyboard.press('Escape'); check('Escape closes only About', await page.isHidden('#about') && await page.isVisible('#profile'));
check('page stays scroll-locked under Profile', await page.evaluate(() => document.body.classList.contains('noscroll')));
await page.click('#profile-close'); await page.waitForSelector('#profile', { state: 'hidden' });

// ---- theme picker: no warnings, link to About
await page.click('#theme-btn'); await page.waitForSelector('#theme:not(.hidden)');
check('picker shows 4 sets, no ⚠, no "non-commercial" note', (await page.$$('#piece-opts .topt')).length === 4 && !/⚠|non-commercial/i.test(await page.innerText('#theme')));
await page.click('#theme .theme-note [data-open-about]'); await page.waitForSelector('#about:not(.hidden)');
await page.click('#about-close'); check('closing About returns to the picker', await page.isHidden('#about') && await page.isVisible('#theme'));
await page.click('#theme-close');
check('body unlocked after closing everything', !(await page.evaluate(() => document.body.classList.contains('noscroll'))));
check('no JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); console.log(ok ? '\nALL ABOUT TESTS PASSED' : '\nSOME ABOUT TESTS FAILED'); process.exit(ok ? 0 : 1);
