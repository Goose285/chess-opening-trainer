// Feedback sheet: entry points, form, GitHub-issue fallback, Copy, Formspree-style endpoint mode (mocked), failure handling.
// Usage: node tools/e2e-feedback.mjs [url]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = (process.argv[2] || 'http://localhost:8099/index.html').replace(/#.*$/, '');
const SHOT = process.env.SHOT || '/workspace/road-to-1500-feedback-phone.png';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
const gh = []; await ctx.route('https://github.com/**', (r) => { gh.push(r.request().url()); r.fulfill({ contentType: 'text/html', body: '<h1>stub</h1>' }); });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
await page.goto(BASE + '#/home'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#hero');

// ---- entry points
check('Home footer has "Send feedback / suggest a feature"', (await page.innerText('.home-foot')).includes('Send feedback / suggest a feature'));
await page.click('.home-foot [data-open-feedback]'); await page.waitForSelector('#fbsheet:not(.hidden)');
check('sheet opens, focus in the message box', await page.evaluate(() => document.activeElement.id) === 'fb-msg');
check('four types in the right order', (await page.$$eval('#fb-types button', (b) => b.map((x) => x.textContent))).join('|') === 'Bug|Idea / what to add|Opening request|Other');
check('five optional stars', (await page.$$('#fb-stars button')).length === 5 && (await page.innerText('#fb-rate-note')) === 'Optional');
check('phone: bottom sheet (hugs the bottom, full width)', await page.evaluate(() => { const r = document.querySelector('#fbsheet .modal-card').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 2 && r.width >= innerWidth - 1; }));
check('fallback explanation is visible and friendly', (await page.isVisible('#fb-fallback')) && /GitHub issue/.test(await page.innerText('#fb-fallback')) && /Copy feedback/.test(await page.innerText('#fb-fallback')));
check('submit button says what will happen', (await page.innerText('#fb-submit')) === 'Open a GitHub issue');
check('contact note warns that issues are public', /public/.test(await page.innerText('#fb-contact-note')));

// ---- validation
await page.click('#fb-submit'); check('empty message is refused with a hint', /few words/.test(await page.innerText('#fb-status')) && (await page.getAttribute('#fb-msg', 'class')).includes('bad'));

// ---- fill + GitHub fallback
await page.click('#fb-types button[data-type="opening"]'); await page.click('#fb-stars button[data-n="4"]');
check('rating shows 4 stars lit', (await page.$$('#fb-stars button.on')).length === 4);
await page.click('#fb-stars button[data-n="4"]'); check('tapping the same star clears the rating', (await page.$$('#fb-stars button.on')).length === 0);
await page.click('#fb-stars button[data-n="5"]');
await page.fill('#fb-msg', 'Please add the Latvian Gambit: 1.e4 e5 2.Nf3 f5 — it is fun & tricky!'); await page.fill('#fb-contact', 'me@example.com');
check('character counter updates', /^\d+ \/ 2000$/.test(await page.innerText('#fb-count')) && (await page.innerText('#fb-count')) === `${(await page.inputValue('#fb-msg')).length} / 2000`, await page.innerText('#fb-count'));
await page.screenshot({ path: SHOT });
await page.evaluate(() => { document.querySelector('#fbsheet .fb-body').scrollTop = 1e5; }); await page.screenshot({ path: SHOT.replace('.png', '-bottom.png') });
const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('#fb-submit')]);
await popup.waitForLoadState().catch(() => {}); const u = new URL(gh[gh.length - 1]);
check('opens github.com/Goose285/chess-opening-trainer/issues/new', u.hostname === 'github.com' && u.pathname === '/Goose285/chess-opening-trainer/issues/new', u.href.slice(0, 90));
check('issue title has the type and start of the message', /^\[Opening request\] Please add the Latvian Gambit/.test(u.searchParams.get('title')), u.searchParams.get('title'));
const body = u.searchParams.get('body');
check('issue body has message, rating, contact, version, device', body.includes('Latvian Gambit') && body.includes('Rating: 5/5') && body.includes('Contact: me@example.com') && /App: Pawnado \d+\.\d+\.\d+/.test(body) && /Device: .*Mozilla/.test(body), body.slice(0, 40));
check('labels are feedback + enhancement', u.searchParams.get('labels') === 'feedback,enhancement');
await popup.close();
check('friendly confirmation shown', /Opened GitHub/.test(await page.innerText('#fb-status')));

// ---- device info is optional
await page.uncheck('#fb-device'); const [p2] = await Promise.all([ctx.waitForEvent('page'), page.click('#fb-submit')]);
check('device info left out when unticked', !new URL(gh[gh.length - 1]).searchParams.get('body').includes('Device:')); await p2.close();

// ---- Copy
await page.click('#fb-copy'); const clip = await page.evaluate(() => navigator.clipboard.readText());
check('Copy feedback puts a readable report on the clipboard', clip.includes('Type: Opening request') && clip.includes('Rating: 5/5') && clip.includes('Latvian Gambit') && clip.includes('Contact: me@example.com') && !clip.includes('Device:'), clip.split('\n')[0]);
check('copy confirmation shown', /Copied/.test(await page.innerText('#fb-status')));
await page.keyboard.press('Escape'); check('Escape closes the sheet', await page.isHidden('#fbsheet'));

// ---- Profile entry
await page.click('#profile-strip'); await page.waitForSelector('#profile:not(.hidden)');
check('Profile sheet has a Feedback entry', await page.isVisible('#profile [data-open-feedback]'));
await page.click('#profile [data-open-feedback]'); await page.waitForSelector('#fbsheet:not(.hidden)');
check('opens over Profile; Escape closes only feedback', await page.isVisible('#profile')); await page.keyboard.press('Escape');
check('Profile still open, page still locked', await page.isVisible('#profile') && await page.evaluate(() => document.body.classList.contains('noscroll')));
await page.click('#profile-close'); check('page unlocked at the end', !(await page.evaluate(() => document.body.classList.contains('noscroll'))));
const tab = await page.$('.tab[data-tab="profile"]'); await tab.click(); await page.waitForSelector('#profile:not(.hidden)'); check('Profile tab -> Feedback button reachable', await page.isVisible('#profile [data-open-feedback]')); await page.click('#profile-close');

// ---- endpoint mode: the source of truth is src/config.js; here we serve a build with an endpoint via route-patching the bundle
const cfg = fs.readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
check('config.js documents FEEDBACK_ENDPOINT, empty by default', /export const FEEDBACK_ENDPOINT = '';/.test(cfg) && /formspree/i.test(cfg));
// build a throw-away bundle whose config.js has an endpoint (esbuild plugin; the real config.js is untouched)
const esbuild = await import('esbuild');
const built = await esbuild.build({ entryPoints: [new URL('../src/main.js', import.meta.url).pathname], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false,
  plugins: [{ name: 'endpoint', setup(b) { b.onLoad({ filter: /src[\\/]config\.js$/ }, (a) => ({ contents: fs.readFileSync(a.path, 'utf8').replace("FEEDBACK_ENDPOINT = ''", "FEEDBACK_ENDPOINT = 'https://forms.example.test/f/abc'"), loader: 'js' })); } }] });
const patched = built.outputFiles[0].text;
check('(test harness) endpoint bundle built', patched.includes('forms.example.test'));
const posts = []; let mode = 'ok';
await page.route('**/dist/app.js', (r) => r.fulfill({ contentType: 'application/javascript', body: patched }));
await page.route('https://forms.example.test/**', async (r) => { posts.push({ headers: r.request().headers(), body: r.request().postData() }); if (mode === 'ok') await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }); else await r.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, body: 'no' }); });
await page.reload(); await page.waitForSelector('#hero'); await page.click('.home-foot [data-open-feedback]'); await page.waitForSelector('#fbsheet:not(.hidden)');
check('endpoint mode: no GitHub explainer, button says Send feedback', (await page.isHidden('#fb-fallback')) && (await page.innerText('#fb-submit')) === 'Send feedback');
await page.click('#fb-types button[data-type="bug"]'); await page.fill('#fb-msg', 'The board flips on rotate'); await page.fill('#fb-contact', 'a@b.co');
mode = 'fail'; await page.click('#fb-submit'); await page.waitForSelector('#fb-status.err');
check('server error: message kept, friendly retry + fallback offered', (await page.inputValue('#fb-msg')) === 'The board flips on rotate' && /did not go through/.test(await page.innerText('#fb-status')) && await page.isVisible('#fb-fallback'));
mode = 'ok'; await page.click('#fb-submit'); await page.waitForSelector('#fb-done:not([hidden])');
const post = posts[posts.length - 1], j = JSON.parse(post.body);
check('POSTs JSON with the Formspree-style fields', /application\/json/.test(post.headers['content-type']) && j.type === 'bug' && j.message === 'The board flips on rotate' && j.contact === 'a@b.co' && j.email === 'a@b.co' && j._subject.includes('Bug') && /Pawnado/.test(j.app) && !!j.device);
check('thank-you state shown', /Thank you/.test(await page.innerText('#fb-done')) && await page.isHidden('#fb-form'));
await page.click('#fb-another'); check('"Send another" resets the form', (await page.inputValue('#fb-msg')) === '' && await page.isVisible('#fb-form'));
check('no JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); console.log(ok ? '\nALL FEEDBACK TESTS PASSED' : '\nSOME FEEDBACK TESTS FAILED'); process.exit(ok ? 0 : 1);
