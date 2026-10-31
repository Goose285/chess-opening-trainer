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
// share-preview card (1200x630): black, white pawn, Archivo Black wordmark, one line of positioning
{
  const font = fs.readFileSync('/workspace/chess-opening-trainer/fonts/archivo-black-latin.woff2').toString('base64');
  const mark = fs.readFileSync('/workspace/chess-opening-trainer/icons/logo-mark.svg', 'utf8').replace('<svg ', '<svg width="190" height="190" ');
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<style>@font-face{font-family:AB;src:url(data:font/woff2;base64,${font}) format("woff2")}
  body{margin:0;width:1200px;height:630px;background:#050505;color:#fff;font-family:Inter,Arial,sans-serif;display:flex;align-items:center;padding:0 96px;box-sizing:border-box;gap:64px;position:relative;overflow:hidden}
  .l{width:6px;position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#fff 50%,#050505 50%);background-size:6px 12px}
  h1{font:400 112px/1 AB;margin:0;letter-spacing:-2px} p{font:600 38px/1.3 Inter,Arial,sans-serif;color:#a3a3a3;margin:22px 0 0;max-width:720px} p b{color:#fff}
  .r{position:absolute;right:0;top:0;bottom:0;width:6px;background:linear-gradient(#fff 50%,#050505 50%);background-size:6px 12px}
  .t{margin-top:30px;font:700 26px Inter,Arial,sans-serif;letter-spacing:3px;color:#7c7c7c}</style>
  <div class="l"></div><div class="r"></div>${mark}<div><h1>Pawnado</h1><p><b>Gambits &amp; traps</b> for beginner to intermediate players</p><div class="t">YOUR ROAD TO 1500</div></div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: '/workspace/chess-opening-trainer/icons/og-card.png' });
  await p.close();
}
await b.close();
