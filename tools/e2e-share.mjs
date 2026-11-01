// Share card: pure milestone rules (node), then in the browser: the prompt after a 5-streak / new best / trap / perfect line, the Share sheet
// (story 1080x1920 + square 1080x1080 PNGs painted on a canvas), navigator.share with the file, the download fallback, the Profile share,
// and that gold / green / the coffee pill are untouched. Usage: node tools/e2e-share.mjs [url] [screenshotDir]  (serve the folder first: python3 -m http.server 8099)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { isStreakMilestone, puzzleMilestone, runMilestone, profileSpec, parseFen, pieceFile, fileName, FORMATS, SITE_LINK } from '../src/share-core.js';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOTS = process.argv[3] || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];

// ---------------------------------------------------------------- pure rules
check('milestones: 5, 10, 15, 20 yes; 0-4, 6, 7, 11 no', [5, 10, 15, 20].every(isStreakMilestone) && [0, 1, 4, 6, 7, 11].every((n) => !isStreakMilestone(n)));
const base = { flawless: true, prevBest: 0, openingName: 'Fried Liver Attack', fen: '8/8/8/8/8/8/8/K6k w - - 0 1', lastMove: ['a1', 'a2'], orientation: 'white' };
let m = puzzleMilestone({ ...base, streak: 5 });
check('streak of 5 → streak card "5 in a row" (flame 1)', m && m.kind === 'streak' && m.big === '5' && m.label === 'in a row' && m.flame === 1 && m.title === 'Fried Liver Attack' && m.prompt.title === '5 in a row!');
m = puzzleMilestone({ ...base, streak: 10, prevBest: 9 });
check('streak of 10 beats "new best" and gets the bigger flame', m && m.kind === 'streak' && m.big === '10' && m.flame === 2);
check('streak of 15 → card (10+ keeps going)', puzzleMilestone({ ...base, streak: 15, prevBest: 14 }).kind === 'streak');
check('streak of 3 → no prompt', puzzleMilestone({ ...base, streak: 3 }) === null);
check('not first try → no prompt, even at 5', puzzleMilestone({ ...base, streak: 5, flawless: false }) === null);
m = puzzleMilestone({ ...base, streak: 7, prevBest: 6 });
check('new best streak (beating a best of 3+) → "best" card', m && m.kind === 'best' && m.big === '7' && /Old record: 6/.test(m.sub));
check('first streaks (best 0-2) do not nag', puzzleMilestone({ ...base, streak: 4, prevBest: 2 }) === null && puzzleMilestone({ ...base, streak: 2, prevBest: 0 }) === null);
check('equalling the best is not a new best', puzzleMilestone({ ...base, streak: 7, prevBest: 7 }) === null);
m = puzzleMilestone({ ...base, streak: 1, trap: true, trapName: 'Légal’s Mate' });
check('trap landed first try → trap card with its name', m && m.kind === 'trap' && m.text && m.big === 'Légal’s Mate' && m.prompt.icon === '🪤');
check('trap solved with a hint → no card', puzzleMilestone({ ...base, streak: 0, flawless: false, trap: true, trapName: 'x' }) === null);
check('long names are clipped for the card', puzzleMilestone({ ...base, streak: 1, trap: true, trapName: 'A'.repeat(80) }).big.length <= 30);
m = runMilestone({ perfect: true, completed: true, gambit: true, openingName: 'Danish Gambit', variation: 'Danish Gambit: Main line', side: 'black', fen: base.fen, lastMove: ['a1', 'a2'] });
check('perfect gambit line → "PERFECT GAMBIT" 100% card, board from the player side', m && m.kind === 'perfect' && m.eyebrow === 'PERFECT GAMBIT' && m.big === '100%' && m.orientation === 'black' && m.sub === 'Danish Gambit: Main line');
check('perfect non-gambit says PERFECT LINE; not perfect / left book → no card', runMilestone({ perfect: true, completed: true, gambit: false, openingName: 'London', side: 'white', fen: base.fen }).eyebrow === 'PERFECT LINE' && !runMilestone({ perfect: false, completed: true, openingName: 'x' }) && !runMilestone({ perfect: true, completed: false, openingName: 'x' }));
const ps = profileSpec({ levelName: 'Bishop Scout', levelN: 4, rating: 900, xp: 3860, pct: 62, toNext: 1140, nextName: 'Rook Roller', max: false, done: 42, perfect: 11, solved: 1318, bestStreak: 14, dayStreak: 6, stars: 17, badges: 9, badgeTotal: 24 });
check('profile spec: level, XP, six stats, formatted numbers', ps.kind === 'profile' && ps.eyebrow === 'LEVEL 4' && ps.big === 'Bishop Scout' && ps.stats.length === 6 && ps.stats[2].n === '1,318' && ps.title === '3,860 XP' && /1,140 XP to Rook Roller/.test(ps.progress));
const g = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
check('parseFen reads the start position; Merida file names', g && g.length === 8 && g[0][0] === 'r' && g[7][4] === 'K' && g[3].every((c) => c === '') && pieceFile('K') === 'wK' && pieceFile('n') === 'bN' && parseFen('bad') === null);
check('formats: story 1080x1920, square 1080x1080; PNG file names', FORMATS.story.w === 1080 && FORMATS.story.h === 1920 && FORMATS.square.h === 1080 && fileName({ kind: 'streak' }, 'story') === 'pawnado-streak-story.png');

// ---------------------------------------------------------------- browser
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ALL = JSON.parse(fs.readFileSync(new URL('../tactics/tactics.json', import.meta.url), 'utf8')).sets;
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + '#/openings'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ocard');
  return page;
}
/** a player who is partway through a tactics streak (the loader fills in everything else) */
async function seeded(tactics) {
  const page = await newPage();
  await page.evaluate((t) => localStorage.setItem('rt1500-progress', JSON.stringify({ v: 1, tactics: t })), tactics);
  return page;
}
const waitPhase = (page, ph, t = 15000) => page.waitForFunction((ph) => { const r = window.__tac && window.__tac.run(); return r && (Array.isArray(ph) ? ph : [ph]).includes(r.phase); }, ph, { timeout: t });
const sq = (page, k) => page.evaluate((k) => { const b = document.querySelector('#pz-board cg-board').getBoundingClientRect(); const o = window.__tac.run().color; const f = k.charCodeAt(0) - 97, r = +k[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, k);
const drag = async (page, a, b) => { const A = await sq(page, a), B = await sq(page, b); await page.mouse.move(A.x, A.y); await page.mouse.down(); await page.mouse.move(B.x, B.y, { steps: 6 }); await page.mouse.up(); };
async function solveCurrent(page) {
  for (let guard = 0; guard < 6; guard++) {
    await waitPhase(page, ['user', 'over']);
    const r = await page.evaluate(() => { const r = window.__tac.run(); return { phase: r.phase, idx: r.idx, moves: r.p.moves }; });
    if (r.phase === 'over') return;
    const u = r.moves[r.idx]; await drag(page, u.slice(0, 2), u.slice(2, 4));
    await page.waitForFunction((n) => { const x = window.__tac.run(); return x.phase === 'over' || x.idx > n; }, r.idx, { timeout: 15000 });
  }
}
const clearCelebrations = async (page) => { for (let i = 0; i < 8; i++) { const v = await page.waitForSelector('#celebrate:not(.hidden)', { timeout: i === 0 ? 2600 : 900 }).catch(() => null); if (!v) return; await page.waitForTimeout(600); await page.click('#cel-next'); await page.waitForTimeout(150); } };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const promptShown = (page) => page.evaluate(() => { const p = document.getElementById('share-prompt'); const r = p.getBoundingClientRect(); return !p.hidden && p.classList.contains('show') && r.bottom <= innerHeight + 1 && r.top >= 0 && r.left >= 0 && r.right <= innerWidth; });

/** decode the blob the sheet is showing: size, how many gold / near-black pixels, and the file text */
const cardStats = (page, fmt) => page.evaluate(async (fmt) => {
  const st = window.__share.state(); const blob = await st.blobs[fmt];
  const bmp = await createImageBitmap(blob); const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
  const d = cx.getImageData(0, 0, cv.width, cv.height).data; let gold = 0, dark = 0, white = 0, teal = 0;
  for (let i = 0; i < d.length; i += 16) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (r > 200 && g > 150 && g < 235 && b < 130) gold++; if (r < 25 && g < 25 && b < 25) dark++; if (r > 235 && g > 235 && b > 235) white++; if (g > 130 && b > 130 && r < 90 && Math.abs(g - b) < 40) teal++; }
  return { w: bmp.width, h: bmp.height, type: blob.type, size: blob.size, gold, dark, white, teal, px: d.length / 16 };
}, fmt);
const pngOf = (page, fmt) => page.evaluate(async (fmt) => { const b = await window.__share.state().blobs[fmt]; const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); }, fmt);

// ---- 1. streak of 5 → prompt → sheet → share with the file
let page = await seeded({ streak: 4, bestStreak: 4 });
await page.reload(); await page.waitForSelector('.ocard');
await page.evaluate(() => { window.__shared = []; Object.defineProperty(navigator, 'canShare', { value: (d) => !!(d && d.files && d.files.length), configurable: true }); Object.defineProperty(navigator, 'share', { value: async (d) => { window.__shared.push({ n: d.files[0].name, t: d.files[0].type, s: d.files[0].size, text: d.text, title: d.title }); }, configurable: true }); });
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard');
await page.click('.tcard[data-id="fried-liver"]');
await solveCurrent(page);
check('streak is 5 after the solve', (await page.textContent('#pz-streak')) === '5');
check('feedback card offers a Share button at the milestone', (await page.$$('#pz-fb-actions .share-btn')).length === 1);
await clearCelebrations(page);
await page.waitForFunction(() => document.getElementById('share-prompt').classList.contains('show'), null, { timeout: 15000 });
await page.waitForTimeout(500);
check('prompt "5 in a row!" slides up inside the phone screen', (await promptShown(page)) && /5 in a row/.test(await page.textContent('#sp-title')), await page.textContent('#share-prompt'));
check('prompt does not cover the Next puzzle button', await page.evaluate(() => { const a = document.getElementById('share-prompt').getBoundingClientRect(), b = document.getElementById('pz-next').getBoundingClientRect(); return a.top >= b.bottom || a.bottom <= b.top; }));
await shot(page, 'phone-share-prompt-streak5');
await page.click('#sp-go');
await page.waitForFunction(() => { const i = document.getElementById('share-img'); return i.src && !i.classList.contains('dim'); }, null, { timeout: 15000 });
check('Share sheet opens with the preview, prompt gone', !(await page.$eval('#share', (e) => e.classList.contains('hidden'))) && (await page.$eval('#share-prompt', (e) => e.hidden || !e.classList.contains('show'))));
let cs = await cardStats(page, 'story');
check('story card is a 1080x1920 PNG with gold + white + dark pixels and no teal', cs.w === 1080 && cs.h === 1920 && cs.type === 'image/png' && cs.size > 30000 && cs.gold > 800 && cs.white > 800 && cs.dark / cs.px > 0.3 && cs.teal === 0, JSON.stringify(cs));
check('sheet fits the phone (no sideways scroll, buttons visible)', await page.evaluate(() => { const c = document.querySelector('#share .modal-card').getBoundingClientRect(); const b = document.getElementById('share-go').getBoundingClientRect(); return c.right <= innerWidth + 1 && b.bottom <= innerHeight && b.top > 0 && document.documentElement.scrollWidth <= innerWidth; }));
check('primary action is the green Share button', await page.$eval('#share-go', (b) => b.classList.contains('primary') && b.textContent === 'Share'));
await shot(page, 'phone-share-sheet-story-streak5');
if (SHOTS) fs.writeFileSync(`${SHOTS}/card-real-streak5-story.png`, Buffer.from(await pngOf(page, 'story'), 'base64'));
await page.click('#share-fmt button[data-fmt="square"]');
await page.waitForFunction(() => document.getElementById('share-img').dataset.fmt === 'square' && !document.getElementById('share-img').classList.contains('dim'), null, { timeout: 15000 });
cs = await cardStats(page, 'square');
check('square option: 1080x1080 PNG', cs.w === 1080 && cs.h === 1080 && cs.gold > 500, JSON.stringify(cs));
await shot(page, 'phone-share-sheet-square-streak5');
if (SHOTS) fs.writeFileSync(`${SHOTS}/card-real-streak5-square.png`, Buffer.from(await pngOf(page, 'square'), 'base64'));
await page.click('#share-go');
await page.waitForFunction(() => window.__shared.length === 1);
const sh = await page.evaluate(() => window.__shared[0]);
check('navigator.share gets the PNG file + text with the site link', sh.t === 'image/png' && sh.n === 'pawnado-streak-square.png' && sh.s > 20000 && sh.text.includes(SITE_LINK) && /5 tactics in a row/.test(sh.text), JSON.stringify(sh));
// cancelling the native sheet (AbortError) must not fall back to a download
await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: async () => { const e = new Error('cancel'); e.name = 'AbortError'; throw e; }, configurable: true }); window.__dl = 0; document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[download]'); if (a) window.__dl++; }, true); });
await page.click('#share-go'); await page.waitForTimeout(500);
check('cancelling the native share sheet does not download', (await page.evaluate(() => window.__dl)) === 0);
// native share throws for another reason → falls back to a download
await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: async () => { throw new Error('nope'); }, configurable: true }); });
let [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('#share-go')]);
check('native share failing falls back to a PNG download', !!dl && dl.suggestedFilename() === 'pawnado-streak-square.png', dl && dl.suggestedFilename());
// Save image button
[dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('#share-save')]);
check('"Save image" downloads the PNG', !!dl && /\.png$/.test(dl.suggestedFilename()));
// no navigator.share at all → the primary button downloads
await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }); });
await page.click('#share-fmt button[data-fmt="story"]');
await page.waitForFunction(() => document.getElementById('share-img').dataset.fmt === 'story' && !document.getElementById('share-img').classList.contains('dim'), null, { timeout: 15000 });
check('without Web Share the primary button reads "Download image" and the second button hides', (await page.textContent('#share-go')) === 'Download image' && (await page.$eval('#share-save', (b) => b.classList.contains('hidden'))));
[dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('#share-go')]);
check('…and it downloads the story PNG', !!dl && dl.suggestedFilename() === 'pawnado-streak-story.png');
await page.keyboard.press('Escape');
check('Escape closes the sheet', await page.$eval('#share', (e) => e.classList.contains('hidden')));
// the coffee pill is untouched
check('coffee pill still on the puzzle screen and on the Share sheet', (await page.$$('#puzzle [data-tip-pill]')).length === 1 && (await page.$$('#share [data-tip-pill]')).length === 1);
await page.close();

// ---- 2. streak of 3 → no prompt
page = await seeded({ streak: 2, bestStreak: 2 });
await page.reload(); await page.waitForSelector('.ocard');
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard'); await page.click('.tcard[data-id="fried-liver"]');
await solveCurrent(page); await clearCelebrations(page); await page.waitForTimeout(2500);
const wasTrap = await page.evaluate(() => window.__tac.run().p.trap);   // a trap solved first try is a milestone of its own
check(`streak 3 → no streak prompt${wasTrap ? ' (this puzzle was a trap, so only the trap card is offered)' : ', no Share button'}`, (await page.textContent('#pz-streak')) === '3' && (wasTrap ? /Trap landed/.test(await page.textContent('#sp-title')) : !(await promptShown(page)) && (await page.$$('#pz-fb-actions .share-btn')).length === 0));
await page.close();

// ---- 3. new best streak (best 5, streak reaches 6)
page = await seeded({ streak: 5, bestStreak: 5 });
await page.reload(); await page.waitForSelector('.ocard');
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard'); await page.click('.tcard[data-id="fried-liver"]');
await solveCurrent(page); await clearCelebrations(page);
await page.waitForFunction(() => document.getElementById('share-prompt').classList.contains('show'), null, { timeout: 15000 });
check('new best streak prompt: "New best streak: 6"', /New best streak: 6/.test(await page.textContent('#sp-title')), await page.textContent('#sp-title'));
await shot(page, 'phone-share-prompt-new-best');
await page.click('#sp-x'); await page.waitForTimeout(500);
check('✕ dismisses the prompt', !(await promptShown(page)));
await page.close();

// ---- 4. trap landed
const trapSet = Object.entries(ALL).find(([, ps]) => ps.some((p) => String(p[0]).startsWith('T-')));
page = await seeded({ streak: 0, bestStreak: 0 });
await page.reload(); await page.waitForSelector('.ocard');
await page.click('.tab[data-tab="tactics"]'); await page.waitForSelector('#tac-grid .tcard'); await page.click(`.tcard[data-id="${trapSet[0]}"]`);
await page.waitForFunction(() => window.__tac && window.__tac.run());
// the second puzzle of the round is the famous trap
await page.evaluate(() => { const s = window.__tac.sess(); s.queue[1] = window.__tac.data()[s.openingId].find((p) => p.trap); });
await solveCurrent(page); await clearCelebrations(page);
await page.click('#pz-next'); await page.waitForTimeout(400);
const isTrap = await page.evaluate(() => window.__tac.run().p.trap);
check('queued the trap puzzle', isTrap);
await solveCurrent(page); await clearCelebrations(page);
await page.waitForFunction(() => document.getElementById('share-prompt').classList.contains('show'), null, { timeout: 15000 }).catch(() => {});
const tp = await page.textContent('#share-prompt');
check('trap landed → prompt "Trap landed!" with the trap name', /Trap landed!/.test(tp), tp.replace(/\s+/g, ' '));
await shot(page, 'phone-share-prompt-trap');
await page.click('#sp-go');
await page.waitForFunction(() => { const i = document.getElementById('share-img'); return i.src && !i.classList.contains('dim'); }, null, { timeout: 15000 });
cs = await cardStats(page, 'story');
check('trap card renders 1080x1920', cs.w === 1080 && cs.h === 1920 && cs.gold > 800, JSON.stringify(cs));
if (SHOTS) fs.writeFileSync(`${SHOTS}/card-real-trap-story.png`, Buffer.from(await pngOf(page, 'story'), 'base64'));
await page.close();

// ---- 5. perfect drill → Share in the summary; Profile share
page = await newPage();
await page.waitForFunction(() => /ready|Basic/.test(document.querySelector('#engine-pill span').textContent), null, { timeout: 30000 });
async function playRun(opening) {
  await page.click('.tab[data-tab="openings"]'); await page.waitForSelector('#setup:not(.hidden) .ocard');
  await page.evaluate((id) => document.querySelector(`.ocard[data-id="${id}"]`).click(), opening);
  await page.click('#color-seg button[data-color="white"]'); await page.click('#start-btn'); await page.waitForSelector('#board cg-board');
  const sqc = (s) => page.evaluate((s) => { const b = document.querySelector('#board cg-board').getBoundingClientRect(); const o = window.__ot.getSession().userColor; const f = s.charCodeAt(0) - 97, r = +s[1] - 1; const x = o === 'white' ? f : 7 - f, y = o === 'white' ? 7 - r : r; return { x: b.left + (x + .5) * b.width / 8, y: b.top + (y + .5) * b.height / 8 }; }, s);
  for (let i = 0; i < 40; i++) {
    await page.waitForFunction(() => { const s = window.__ot.getSession(); return s && (s.phase === 'user' || s.phase === 'over'); }, null, { timeout: 30000 });
    if (await page.evaluate(() => window.__ot.getSession().phase === 'over')) break;
    const m = await page.evaluate(() => { const s = window.__ot.getSession(); const g = new window.__ot.Chess(s.game.fen()); const san = window.__ot.bookMoves(s.book, s.game.fen())[0]; const mv = g.move(san); return { from: mv.from, to: mv.to }; });
    const a = await sqc(m.from), b = await sqc(m.to);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    await page.waitForFunction((n) => { const s = window.__ot.getSession(); return s.records.length > n || s.phase === 'over'; }, i, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => window.__ot.getSession().phase === 'over', null, { timeout: 30000 });
  await page.waitForSelector('#summary:not(.hidden)', { timeout: 10000 });
}
await playRun('danish');
const pct = await page.textContent('#sum-pct');
const sharing = !(await page.$eval('#sum-share', (e) => e.classList.contains('hidden')));
check('a 100% gambit run shows "Share this line" in the summary (and a lesser run would not)', pct === '100%' ? sharing : !sharing, `${pct} share=${sharing}`);
if (pct === '100%') {
  await shot(page, 'phone-share-summary-button');
  await page.click('#sum-share');
  await page.waitForFunction(() => { const i = document.getElementById('share-img'); return i.src && !i.classList.contains('dim'); }, null, { timeout: 15000 });
  cs = await cardStats(page, 'story');
  check('perfect-line card renders (1080x1920, gold 100%)', cs.w === 1080 && cs.h === 1920 && cs.gold > 800, JSON.stringify(cs));
  check('perfect-line spec: PERFECT GAMBIT, Danish Gambit, final position', await page.evaluate(() => { const s = window.__share.state().spec; return s.kind === 'perfect' && s.eyebrow === 'PERFECT GAMBIT' && /Danish/.test(s.title) && !!s.fen && s.orientation === 'white'; }));
  await shot(page, 'phone-share-sheet-perfect');
  if (SHOTS) fs.writeFileSync(`${SHOTS}/card-real-perfect-story.png`, Buffer.from(await pngOf(page, 'story'), 'base64'));
  await page.keyboard.press('Escape');
  check('Escape closes the Share sheet but not the summary', await page.$eval('#share', (e) => e.classList.contains('hidden')) && !(await page.$eval('#summary', (e) => e.classList.contains('hidden'))));
}
await clearCelebrations(page);
await page.click('#sum-menu');
await page.waitForTimeout(300);
// Profile share
await page.click('#profile-btn'); await page.waitForSelector('#profile:not(.hidden)');
check('Profile has a "Share my progress" button', (await page.$$('#profile-body #pf-share')).length === 1);
await page.evaluate(() => document.getElementById('pf-share').scrollIntoView({ block: 'center' }));
await shot(page, 'phone-profile-share-button');
await page.click('#pf-share');
await page.waitForFunction(() => { const i = document.getElementById('share-img'); return i.src && !i.classList.contains('dim'); }, null, { timeout: 15000 });
cs = await cardStats(page, 'story');
check('profile card renders 1080x1920 with gold level + stats', cs.w === 1080 && cs.h === 1920 && cs.gold > 800 && cs.teal === 0, JSON.stringify(cs));
check('profile spec carries live stats (no mascot, no board)', await page.evaluate(() => { const s = window.__share.state().spec; return s.kind === 'profile' && s.stats.length === 6 && !s.fen && /XP/.test(s.title); }));
check('Share sheet sits above the Profile sheet', await page.evaluate(() => { const s = document.getElementById('share'), p = document.getElementById('profile'); return +getComputedStyle(s).zIndex > +getComputedStyle(p).zIndex; }));
await shot(page, 'phone-share-sheet-profile');
if (SHOTS) fs.writeFileSync(`${SHOTS}/card-real-profile-story.png`, Buffer.from(await pngOf(page, 'story'), 'base64'));
await page.click('#share-fmt button[data-fmt="square"]');
await page.waitForFunction(() => document.getElementById('share-img').dataset.fmt === 'square' && !document.getElementById('share-img').classList.contains('dim'), null, { timeout: 15000 });
cs = await cardStats(page, 'square');
check('profile square card 1080x1080', cs.w === 1080 && cs.h === 1080 && cs.gold > 400, JSON.stringify(cs));
if (SHOTS) fs.writeFileSync(`${SHOTS}/card-real-profile-square.png`, Buffer.from(await pngOf(page, 'square'), 'base64'));
await page.keyboard.press('Escape');
check('Escape closes only the Share sheet; Profile stays open', await page.$eval('#share', (e) => e.classList.contains('hidden')) && !(await page.$eval('#profile', (e) => e.classList.contains('hidden'))));
check('Profile still scrollable after (noscroll kept while a sheet is open)', await page.evaluate(() => document.body.classList.contains('noscroll')));
await page.keyboard.press('Escape');
check('second Escape closes the Profile', await page.$eval('#profile', (e) => e.classList.contains('hidden')));
await page.close();

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
