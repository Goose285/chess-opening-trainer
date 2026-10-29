import { chromium } from 'playwright-core';
import fs from 'fs';
const svg = fs.readFileSync('/workspace/chess-opening-trainer/icons/icon.svg', 'utf8');
const fav = fs.readFileSync('/workspace/chess-opening-trainer/icons/favicon.svg', 'utf8');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [name, src, size] of [['apple-touch-icon.png', svg, 180], ['icon-192.png', svg, 192], ['icon-512.png', svg, 512], ['icon-maskable-512.png', svg, 512], ['favicon-32.png', fav, 32], ['favicon-48.png', fav, 48]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await p.screenshot({ path: '/workspace/chess-opening-trainer/icons/' + name, omitBackground: true });
  await p.close();
}
await b.close();
