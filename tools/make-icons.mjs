import { chromium } from 'playwright-core';
import fs from 'fs';
const svg = fs.readFileSync('/workspace/chess-opening-trainer/icons/icon.svg', 'utf8');
const sq = svg.replace('rx="112"', 'rx="0"'); // full-bleed square for the maskable + Apple icons (the OS rounds them)
const fav = fs.readFileSync('/workspace/chess-opening-trainer/icons/favicon.svg', 'utf8');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [name, src, size] of [['apple-touch-icon.png', sq, 180], ['icon-192.png', svg, 192], ['icon-512.png', svg, 512], ['icon-maskable-512.png', sq, 512], ['favicon-32.png', fav, 32], ['favicon-48.png', fav, 48]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await p.screenshot({ path: '/workspace/chess-opening-trainer/icons/' + name, omitBackground: true });
  await p.close();
}
// share-preview card (1200x630), Premium theme: near-black, thin gold frame, Cormorant Garamond wordmark, one line of positioning
{
  const font = fs.readFileSync('/workspace/chess-opening-trainer/fonts/cormorant-garamond-600-latin.woff2').toString('base64');
  const inter = fs.readFileSync('/workspace/chess-opening-trainer/fonts/inter-400-700-latin.woff2').toString('base64');
  const mark = fs.readFileSync('/workspace/chess-opening-trainer/icons/logo-mark.svg', 'utf8').replace('<svg ', '<svg width="170" height="170" ');
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<style>@font-face{font-family:CG;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:500 700}@font-face{font-family:IN;src:url(data:font/woff2;base64,${inter}) format("woff2");font-weight:400 700}
  body{margin:0;width:1200px;height:630px;background:#060606;color:#f4f1ea;font-family:IN,Arial,sans-serif;display:flex;align-items:center;padding:0 110px;box-sizing:border-box;gap:70px;position:relative;overflow:hidden}
  .f{position:absolute;inset:26px;border:2px solid rgba(201,169,97,.4)}
  h1{font:600 104px/1 CG;margin:0;letter-spacing:.14em;text-transform:uppercase} p{font:400 34px/1.35 IN,Arial,sans-serif;color:#8e8b84;margin:26px 0 0;max-width:720px} p b{color:#f4f1ea;font-weight:600}
  .t{margin-top:34px;font:600 22px IN,Arial,sans-serif;letter-spacing:.3em;color:#c9a961}</style>
  <div class="f"></div>${mark}<div><h1>Pawnado</h1><p><b>Gambits &amp; traps</b> for beginner to intermediate players</p><div class="t">YOUR ROAD TO 1500</div></div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: '/workspace/chess-opening-trainer/icons/og-card.png' });
  await p.close();
}
await b.close();
