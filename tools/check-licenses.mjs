// Licence guard: fails if anything is shipped that is not on the approved list, or a notice is missing.
// Usage: node tools/check-licenses.mjs   (npm run test:licenses). Add a component here ONLY after recording its licence in
// THIRD_PARTY/NOTICES.md and src/licenses.js.
import fs from 'node:fs';
import path from 'node:path';
import { PIECE_SETS } from '../src/themes-data.js';
import { COMPONENTS, REPO_URL } from '../src/licenses.js';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };

// approved piece sets (all allow commercial use) and the removed non-commercial ones
const APPROVED = { cburnett: 'GPLv2+', merida: 'GPLv2+', pixel: 'AGPLv3+', kosal: 'CC BY 4.0' };
const BANNED = ['alpha', 'california', 'maestro', 'fresca', 'horsey'];
const dirs = fs.readdirSync(path.join(root, 'pieces'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
check('pieces/ has exactly the approved sets', dirs.join() === Object.keys(APPROVED).sort().join(), dirs.join());
check('PIECE_SETS matches the approved sets and licences', PIECE_SETS.length === 4 && PIECE_SETS.every((s) => APPROVED[s.id] === s.license));
for (const s of Object.keys(APPROVED)) check(`${s}: 12 SVGs`, fs.readdirSync(path.join(root, 'pieces', s)).filter((f) => f.endsWith('.svg')).length === 12);
const shipped = ['src', 'css', 'index.html', 'dist/app.js', 'manifest.webmanifest'].flatMap((p) => {
  const abs = path.join(root, p); if (!fs.existsSync(abs)) return [];
  return fs.statSync(abs).isDirectory() ? fs.readdirSync(abs).filter((f) => /\.(js|css|html)$/.test(f)).map((f) => path.join(p, f)) : [p];
});
for (const f of shipped) {
  const t = read(f);
  const hit = BANNED.filter((b) => new RegExp(`pieces/${b}\\b|data-pieces="${b}"|["'\`]${b}["'\`]`).test(t));
  check(`${f}: no removed piece sets referenced`, hit.length === 0, hit.join());
  if (/themes|about|licenses/.test(f)) check(`${f}: no warning marker in the licence UI`, !/⚠/.test(t));
}

// shipped binary types that would need their own licence
const BADEXT = /\.(woff2?|ttf|otf|eot|mp3|ogg|wav|m4a|mp4|webm|jpe?g|gif|webp)$/i;
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.name === 'node_modules' || e.name === '.git' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const odd = walk('.').filter((f) => BADEXT.test(f));
check('no fonts, audio, video or photos in the project', odd.length === 0, odd.join(','));
check('only our own PNG icons/screenshots', walk('.').filter((f) => /\.png$/i.test(f)).every((f) => /^(icons|docs)[\\/]/.test(f)));

// licence texts and notices
const first = (f) => read(f).replace(/\r/g, '').trim().split('\n')[0].trim();
check('LICENSE is the GNU GPL v3', /GNU GENERAL PUBLIC LICENSE/.test(read('LICENSE')) && /Version 3, 29 June 2007/.test(read('LICENSE')) && read('LICENSE').length > 30000);
check('package.json license is GPL-3.0-or-later', JSON.parse(read('package.json')).license === 'GPL-3.0-or-later');
for (const f of ['GPL-3.0.txt', 'GPL-2.0.txt', 'AGPL-3.0.txt', 'CC-BY-4.0.txt', 'CC0-1.0.txt', 'chess.js-BSD-2-Clause.txt', 'Stockfish.js-Copying-GPL-3.0.txt', 'kosal-LICENSE-upstream.txt'])
  check(`THIRD_PARTY/licenses/${f} present`, exists(`THIRD_PARTY/licenses/${f}`) && read(`THIRD_PARTY/licenses/${f}`).length > 1000);
check('chess.js notice names the copyright holder', /Jeff Hlywa/.test(read('THIRD_PARTY/licenses/chess.js-BSD-2-Clause.txt')) && /Redistributions in binary form must reproduce/.test(read('THIRD_PARTY/licenses/chess.js-BSD-2-Clause.txt')));
check('Stockfish licence ships next to the engine', exists('vendor/stockfish/LICENSE-stockfish-GPLv3.txt') && exists('vendor/stockfish/stockfish-19-lite-single.wasm'));
const notices = read('THIRD_PARTY/NOTICES.md'), credits = read('THIRD_PARTY/PIECE-SET-CREDITS.md');
for (const k of ['Stockfish', 'chessground', 'chess.js', 'Jeff Hlywa', 'cburnett', 'merida', 'pixel', 'kosal', 'Lichess', 'CC0', REPO_URL, 'App-store']) check(`NOTICES.md mentions ${k}`, notices.includes(k));
for (const s of Object.keys(APPROVED)) check(`PIECE-SET-CREDITS.md covers ${s}`, credits.includes('`' + s + '`'));
for (const c of COMPONENTS) check(`licenses.js entry complete: ${c.name.slice(0, 30)}`, c.name && c.license && c.notice && c.url.startsWith('https://') && c.licenseUrl.startsWith('https://'));
const readme = read('README.md');
check('README states GPL-3.0-or-later and source link rules', /GPL-3\.0-or-later/.test(readme) && /offer the source/.test(readme));
check('index.html links the About screen', /data-open-about/.test(read('index.html')) && /id="about"/.test(read('index.html')));
// nothing may add restrictions on top of the GPL
const bad = shipped.filter((f) => /no (commercial|redistribution)|may not (copy|redistribute)|non-?commercial use only/i.test(read(f).replace(/Copyright[^\n]*All rights reserved\./gi, '')));
check('no extra restrictive terms in shipped files', bad.length === 0, bad.join());

console.log(ok ? '\nALL LICENCE CHECKS PASSED' : '\nLICENCE CHECKS FAILED'); process.exit(ok ? 0 : 1);
