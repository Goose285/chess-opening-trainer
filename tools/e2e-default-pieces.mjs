// Merida is the default piece set (new players + anyone who never picked one); an explicit pick is kept. Also the positioning copy:
// title / meta / Home line / About intro say "Gambits & traps for beginner to intermediate players". Usage: node tools/e2e-default-pieces.mjs [url] [shotDir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOTS = process.argv[3] || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const HIDE = () => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#celebrate,#toast{display:none!important'.replace('!important', '!important}'); document.head.appendChild(s); });
async function open(theme, hash = '#/home') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message)); await page.addInitScript(HIDE);
  await page.goto(BASE + '#/openings'); await page.evaluate((t) => { localStorage.clear(); if (t !== undefined) localStorage.setItem('rt1500-theme', t); }, theme);
  await page.goto(BASE + hash); await page.reload(); await page.waitForSelector('#tabbar');
  return { ctx, page };
}
const pieces = (p) => p.evaluate(() => document.documentElement.dataset.pieces);
const stored = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('rt1500-theme') || 'null'));
const pimg = (p) => p.evaluate(() => { const e = document.querySelector('cg-board piece') || document.querySelector('.cg-wrap piece'); return e ? getComputedStyle(e).getPropertyValue('--pimg') : ''; });

// ---- new player
let { ctx, page } = await open();
check('new player gets Merida', (await pieces(page)) === 'merida');
check('nothing is stored for a player who never chose', (await stored(page)) === null);
const css = await (await page.request.get(new URL('css/pieces.css', BASE).href)).text();
check('first-paint / no-JS default in pieces.css is Merida too', /^\.cg-wrap piece\.pawn\.white \{ --pimg: url\('\.\.\/pieces\/merida\/wP\.svg'\)/m.test(css));
check('Merida artwork is served', (await page.request.get(new URL('pieces/merida/wK.svg', BASE).href)).ok());
await page.evaluate(() => window.__ot.goTab('openings')); await page.waitForSelector('.ocard');
await page.$eval('.ocard[data-id="italian"]', (e) => e.click()); await page.waitForSelector('#start-btn'); await page.$eval('#start-btn', (e) => e.click()); await page.waitForSelector('#board piece');
check('the drill board really draws Merida pieces', /pieces\/merida\//.test(await pimg(page)), await pimg(page));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-board-merida.png` });
await page.$eval('#menu-btn', (e) => e.click());
await page.$eval('#theme-btn', (e) => e.click()); await page.waitForSelector('#theme:not(.hidden)');
check('picker marks Merida as the current set', (await page.$eval('#piece-opts .topt.on', (e) => e.dataset.pieces)) === 'merida');
// explicit pick of Cburnett is kept
await page.$eval('#piece-opts [data-pieces="cburnett"]', (e) => e.click());
check('picking Cburnett is stored as a choice', (await stored(page)).pieces === 'cburnett' && (await pieces(page)) === 'cburnett');
await page.reload(); await page.waitForSelector('#tabbar');
check('…and kept after reload (explicit choice wins over the default)', (await pieces(page)) === 'cburnett');
await page.$eval('#theme-btn', (e) => e.click()); await page.waitForSelector('#theme:not(.hidden)');
await page.$eval('#theme-reset', (e) => e.click());
check('Reset goes back to Merida and clears the stored choice', (await pieces(page)) === 'merida' && !('pieces' in (await stored(page))));
await page.$eval('#board-opts [data-board="neon"]', (e) => e.click());
check('changing only the board does not freeze the piece set', (await stored(page)).board === 'neon' && !('pieces' in (await stored(page))));
await ctx.close();

// ---- existing players
({ ctx, page } = await open(JSON.stringify({ board: 'purple', pieces: 'cburnett' })));
check('old save with the old default (cburnett, never really picked) moves to Merida; board choice kept', (await pieces(page)) === 'merida' && (await page.evaluate(() => document.documentElement.dataset.board)) === 'purple');
check('old save is rewritten without the piece key', JSON.stringify(await stored(page)) === '{"v":2,"board":"purple"}', JSON.stringify(await stored(page)));
await ctx.close();
({ ctx, page } = await open(JSON.stringify({ board: 'green', pieces: 'pixel' })));
check('old save with another set (pixel) keeps that choice', (await pieces(page)) === 'pixel' && (await stored(page)).pieces === 'pixel');
await ctx.close();
({ ctx, page } = await open(JSON.stringify({ v: 2, pieces: 'cburnett' })));
check('new-format save with an explicit Cburnett keeps it', (await pieces(page)) === 'cburnett');
await ctx.close();
({ ctx, page } = await open('{not json'));
check('a corrupt save falls back to Merida without errors', (await pieces(page)) === 'merida');
await ctx.close();

// ---- licences / credits
({ ctx, page } = await open());
const credits = await (await page.request.get(new URL('THIRD_PARTY/PIECE-SET-CREDITS.md', BASE).href)).text();
check('credits file names Merida, its author and licence, and that it is the default', /merida/.test(credits) && /Armando Hernandez Marroquin/.test(credits) && /GPL-2\.0-or-later/.test(credits) && /default set[^.]*merida/i.test(credits));
await page.$eval('#profile-btn', (e) => e.click()); await page.waitForSelector('#profile:not(.hidden)'); await page.$eval('#profile [data-open-about]', (e) => e.click()); await page.waitForSelector('#about:not(.hidden)');
const about = await page.textContent('#about-body');
check('About lists Merida (default) with author and licence, Cburnett no longer marked default', /Merida pieces \(default\)/.test(about) && /Armando Hernandez Marroquin/.test(about) && /GPL-2\.0-or-later/.test(about) && !/Cburnett pieces \(default\)/.test(about));
check('About intro: gambits & traps for beginner to intermediate players', /Gambits & traps for beginner to intermediate players/.test((await page.textContent('#about-body .ab-what')).replace(/\s+/g, ' ')), (await page.textContent('#about-body .ab-what')).slice(0, 90));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-about-intro.png` });
await ctx.close();

// ---- positioning copy
({ ctx, page } = await open());
const head = await page.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name=description]').content, ogt: document.querySelector('meta[property="og:title"]').content, ogd: document.querySelector('meta[property="og:description"]').content }));
check('<title> says gambits & traps for beginner to intermediate players', head.title === 'Pawnado — Gambits & traps for beginner to intermediate players', head.title);
check('meta description is short and on message', /Gambits & traps for beginner to intermediate/.test(head.desc) && head.desc.length < 170, `${head.desc.length}: ${head.desc}`);
check('og:title / og:description match', /beginner to intermediate/.test(head.ogt) && /Gambits & traps/.test(head.ogd));
check('Home shows the line visibly, right under the header', await page.isVisible('.intro h1') && /Gambits & traps for beginner to intermediate players/.test(await page.textContent('.intro h1')));
check('the line is above the hero card and fits on the phone (no sideways scroll)', await page.evaluate(() => document.querySelector('.intro').getBoundingClientRect().bottom <= document.querySelector('#hero').getBoundingClientRect().top + 1 && document.documentElement.scrollWidth <= innerWidth));
check('primary-action green kept (--go) while the brand accent is white', await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--go').trim().toLowerCase() === '#5ad19a' && getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase() === '#ffffff'));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-home.png` });
await ctx.close();
check('no page errors', errors.length === 0, errors.join('|'));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
