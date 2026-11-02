// Share card: paints a polished PNG (1080x1920 story, 1080x1080 square) with canvas and shares it with the native
// share sheet when the browser can send files, else downloads it. Specs come from share-core.js (pure, unit-tested).
// Look (Premium theme): near-black, warm-white type, Cormorant Garamond headings + Inter labels; gold only on the achievement itself. Merida pieces on a neutral board.
import { FORMATS, TAGLINE, SITE_URL, SITE_LINK, parseFen, pieceFile, sqCoords, fileName } from './share-core.js';

const $ = (s) => document.querySelector(s);
const GOLD = '#c9a961', GOLD_HI = '#d8c08a', GOLD_LO = '#b8975a', INK = '#060606', GREY = '#8e8b84', LINE = 'rgba(255,255,255,.1)', WHITE = '#f4f1ea';
const DISPLAY = '"Cormorant Garamond",Georgia,"Times New Roman",serif';
const TEXT = 'Inter,-apple-system,"Segoe UI",system-ui,sans-serif';
const SQ_LIGHT = '#ececec', SQ_DARK = '#7d7d7d', LAST = 'rgba(201,169,97,.55)';

// ------------------------------------------------------------------ assets
const imgCache = new Map();
function loadImg(path) {
  if (!imgCache.has(path)) {
    imgCache.set(path, new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => { imgCache.delete(path); rej(new Error('image ' + path)); }; im.src = new URL(path, document.baseURI).href; }));
  }
  return imgCache.get(path);
}
async function loadAssets(spec) {
  const files = new Set();
  const grid = spec.fen ? parseFen(spec.fen) : null;
  if (grid) for (const row of grid) for (const ch of row) if (ch) files.add(pieceFile(ch));
  const [logo, ...pcs] = await Promise.all([loadImg('icons/logo-mark.svg'), ...[...files].map((f) => loadImg(`pieces/merida/${f}.svg`))]);
  const pieces = {}; [...files].forEach((f, i) => { pieces[f] = pcs[i]; });
  try { await Promise.all([document.fonts.load('600 100px "Cormorant Garamond"'), document.fonts.load('600 30px Inter'), document.fonts.load('500 30px Inter')]); } catch { /* fall back to system fonts */ }
  return { logo, pieces, grid };
}

// ------------------------------------------------------------------ drawing helpers
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const font = (px, face = DISPLAY, weight = 600) => `${weight} ${px}px ${face}`;
/** text with manual letter-spacing (works in every browser). align: 'left' | 'center' | 'right' */
function spaced(ctx, str, x, y, sp, align = 'left') {
  const chars = [...str]; const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + sp; });
  return total;
}
function fit(ctx, str, maxW, px, face = DISPLAY, weight = 400, min = 24) {
  let s = px; ctx.font = font(s, face, weight);
  while (ctx.measureText(str).width > maxW && s > min) { s -= 2; ctx.font = font(s, face, weight); }
  return s;
}
function wrap(ctx, str, maxW) {
  const out = []; let line = '';
  for (const w of String(str).split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line); return out;
}
const goldFill = (ctx, y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, GOLD_HI); g.addColorStop(1, GOLD); return g; };

/** hand-drawn flame: tip at the top, w x h box with its top-left at (x, y) */
function flame(ctx, x, y, w, h) {
  const p = (px, py) => [x + px * w, y + py * h];
  const path = (pts) => { ctx.beginPath(); ctx.moveTo(...p(pts[0], pts[1])); for (let i = 2; i < pts.length; i += 6) ctx.bezierCurveTo(...p(pts[i], pts[i + 1]), ...p(pts[i + 2], pts[i + 3]), ...p(pts[i + 4], pts[i + 5])); ctx.closePath(); };
  path([0.5, 0, 0.56, 0.2, 0.9, 0.36, 0.9, 0.66, 0.9, 0.88, 0.72, 1, 0.5, 1, 0.28, 1, 0.1, 0.88, 0.1, 0.66, 0.1, 0.5, 0.19, 0.4, 0.27, 0.31, 0.3, 0.42, 0.36, 0.5, 0.43, 0.5, 0.36, 0.3, 0.4, 0.12, 0.5, 0]);
  ctx.fillStyle = goldFill(ctx, y, y + h); ctx.fill();
  path([0.5, 0.42, 0.54, 0.54, 0.7, 0.62, 0.7, 0.78, 0.7, 0.92, 0.6, 1, 0.5, 1, 0.4, 1, 0.3, 0.92, 0.3, 0.78, 0.3, 0.68, 0.38, 0.62, 0.44, 0.55, 0.47, 0.6, 0.5, 0.6, 0.5, 0.5, 0.5, 0.42, 0.5, 0.42]);
  ctx.fillStyle = '#f1e6c8'; ctx.fill();
}

function backdrop(ctx, W, H) {
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, Math.max(W, H) * 0.8); v.addColorStop(0, 'rgba(255,255,255,.035)'); v.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(201,169,97,.28)'; ctx.lineWidth = 2; ctx.strokeRect(34, 34, W - 68, H - 68); // thin inset gold frame
}
/** logo mark + wordmark; returns width */
function brand(ctx, assets, x, y, size, align) {
  ctx.font = font(size); ctx.textBaseline = 'alphabetic';
  const word = 'PAWNADO', sp = size * 0.2;
  let tw = 0; for (const c of word) tw += ctx.measureText(c).width + sp; tw -= sp;
  const lg = size * 1.0, gap = size * 0.34, total = lg + gap + tw;
  const x0 = align === 'center' ? x - total / 2 : x;
  ctx.drawImage(assets.logo, x0, y - size * 0.8, lg, lg);
  ctx.fillStyle = WHITE; spaced(ctx, word, x0 + lg + gap, y, sp, 'left');
  return total;
}

/** the mini board: size px square at (x, y), Merida pieces, gold last-move squares, tiny coordinates */
function board(ctx, assets, spec, x, y, size) {
  const sq = size / 8, flip = spec.orientation === 'black';
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = size * 0.05; ctx.shadowOffsetY = size * 0.02; ctx.fillStyle = '#000'; rr(ctx, x, y, size, size, size * 0.02); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, x, y, size, size, size * 0.02); ctx.clip();
  const pos = (f, r) => ({ px: x + (flip ? 7 - f : f) * sq, py: y + (flip ? r : 7 - r) * sq });
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const { px, py } = pos(f, r); ctx.fillStyle = (f + r) % 2 === 0 ? SQ_DARK : SQ_LIGHT; ctx.fillRect(px, py, sq + 0.5, sq + 0.5); }
  if (spec.lastMove) for (const s of spec.lastMove) { const c = sqCoords(s); const { px, py } = pos(c.f, c.r); ctx.fillStyle = LAST; ctx.fillRect(px, py, sq + 0.5, sq + 0.5); }
  if (assets.grid) for (let row = 0; row < 8; row++) for (let f = 0; f < 8; f++) {
    const ch = assets.grid[row][f]; if (!ch) continue;
    const { px, py } = pos(f, 7 - row); const inset = sq * 0.03;
    ctx.drawImage(assets.pieces[pieceFile(ch)], px + inset, py + inset, sq - inset * 2, sq - inset * 2);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; rr(ctx, x, y, size, size, size * 0.02); ctx.stroke();
}

/** the achievement: eyebrow, big number / name in gold, label. Returns the y just below it. */
function hero(ctx, spec, o) {
  const { x, y, maxW, align, numSize, labelSize, flameMode } = o; // y = top of the eyebrow row
  const cx = align === 'center' ? x : x + maxW / 2;
  let cy = y;
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = GREY; ctx.font = font(o.eyebrowSize, TEXT, 600);
  const eb = wrap(ctx, spec.eyebrow, maxW);
  const ebFit = (str) => { let s = o.eyebrowSize; ctx.font = font(s, TEXT, 600); while (spaced(ctx, str, -9999, -9999, s * 0.22) > maxW && s > 18) { s -= 1; ctx.font = font(s, TEXT, 600); } return s; };
  const ebSize = ebFit(spec.eyebrow); ctx.font = font(ebSize, TEXT, 600); void eb;
  cy += ebSize; spaced(ctx, spec.eyebrow, align === 'center' ? x : x, cy, ebSize * 0.22, align === 'center' ? 'center' : 'left');
  cy += o.gap;
  let numBottom;
  if (spec.text) {
    let s = numSize; ctx.font = font(s);
    let lines = wrap(ctx, spec.big, maxW);
    while ((lines.length > 2 || lines.some((l) => ctx.measureText(l).width > maxW)) && s > 40) { s -= 4; ctx.font = font(s); lines = wrap(ctx, spec.big, maxW); }
    const lh = s * 1.04; cy += s * 0.84;
    ctx.fillStyle = goldFill(ctx, cy - s * 0.8, cy + lh * (lines.length - 1));
    ctx.textAlign = align === 'center' ? 'center' : 'left';
    lines.forEach((l, i) => ctx.fillText(l, align === 'center' ? x : x, cy + i * lh));
    numBottom = cy + lh * (lines.length - 1);
  } else {
    let s = numSize; ctx.font = font(s);
    const fw = spec.flame && flameMode === 'beside' ? s * 0.52 : 0, fg = fw ? s * 0.06 : 0;
    while (ctx.measureText(spec.big).width + fw + fg > maxW && s > 60) { s -= 4; ctx.font = font(s); }
    const nw = ctx.measureText(spec.big).width, total = nw + (spec.flame && flameMode === 'beside' ? s * 0.52 + s * 0.06 : 0);
    const x0 = align === 'center' ? x - total / 2 : x;
    const capH = s * 0.72;
    if (spec.flame && flameMode === 'above') {
      const fh = s * 0.62; flame(ctx, x0 + (spec.flame === 2 ? 0 : 0), cy, fh * 0.76, fh); cy += fh + s * 0.04;
    }
    cy += capH;
    if (spec.flame === 2) { const g = ctx.createRadialGradient(cx, cy - capH / 2, 0, cx, cy - capH / 2, maxW * 0.8); g.addColorStop(0, 'rgba(201,169,97,0)'); g.addColorStop(1, 'rgba(201,169,97,0)'); ctx.fillStyle = g; ctx.fillRect(cx - maxW, cy - maxW, maxW * 2, maxW * 2); }
    let nx = x0;
    if (spec.flame && flameMode === 'beside') { const fh = capH * 1.02; flame(ctx, x0, cy - fh, fh * 0.76, fh); nx = x0 + s * 0.52 + s * 0.06; }
    ctx.fillStyle = goldFill(ctx, cy - capH, cy); ctx.textAlign = 'left'; ctx.fillText(spec.big, nx, cy);
    numBottom = cy;
  }
  cy = numBottom + o.gap2;
  ctx.fillStyle = WHITE; const ls = fit(ctx, spec.label, maxW, labelSize); ctx.font = font(ls); ctx.textAlign = align === 'center' ? 'center' : 'left';
  cy += ls * 0.8; ctx.fillText(spec.label, x, cy);
  return cy;
}

function footer(ctx, W, y, align, x = W / 2) {
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = WHITE; const s = fit(ctx, SITE_URL, W - 140, 34, TEXT, 600, 22); ctx.font = font(s, TEXT, 600); ctx.textAlign = align; ctx.fillText(SITE_URL, x, y);
}

// ------------------------------------------------------------------ the layouts
function drawStory(ctx, spec, assets) {
  const W = 1080, H = 1920;
  backdrop(ctx, W, H);
  brand(ctx, assets, W / 2, 190, 84, 'center');
  ctx.fillStyle = GREY; ctx.font = font(27, TEXT, 600); spaced(ctx, TAGLINE.toUpperCase(), W / 2, 262, 7, 'center');
  ctx.fillStyle = LINE; ctx.fillRect(W / 2 - 60, 296, 120, 3);
  if (spec.kind === 'profile') return profileStory(ctx, spec, assets);
  const bottom = hero(ctx, spec, { x: W / 2, y: 345, maxW: 900, align: 'center', numSize: spec.text ? 128 : 320, labelSize: 84, eyebrowSize: 30, gap: 26, gap2: 34, flameMode: 'beside' });
  const bs = 760, by = Math.max(bottom + (spec.text ? 110 : 70), 790);
  board(ctx, assets, spec, (W - bs) / 2, by, bs);
  let y = by + bs + 82;
  ctx.fillStyle = WHITE; const ts = fit(ctx, spec.title, 900, 56); ctx.font = font(ts); ctx.textAlign = 'center'; ctx.fillText(spec.title, W / 2, y);
  ctx.fillStyle = GREY; ctx.font = font(32, TEXT, 600); ctx.fillText(spec.sub, W / 2, y + 52);
  footer(ctx, W, Math.min(H - 96, y + 52 + 100), 'center');
}
function drawSquare(ctx, spec, assets) {
  const W = 1080, H = 1080;
  backdrop(ctx, W, H);
  brand(ctx, assets, 60, 112, 58, 'left');
  ctx.fillStyle = GREY; ctx.font = font(22, TEXT, 600); spaced(ctx, TAGLINE.toUpperCase(), W - 60, 108, 5, 'right');
  ctx.fillStyle = LINE; ctx.fillRect(60, 146, W - 120, 2);
  if (spec.kind === 'profile') return profileSquare(ctx, spec, assets);
  const bs = 590, by = 190;
  board(ctx, assets, spec, 60, by, bs);
  const colX = 60 + bs + 50, colW = W - 60 - colX;
  const top = hero(ctx, spec, { x: colX, y: by + (spec.text ? 40 : 70), maxW: colW, align: 'left', numSize: spec.text ? 84 : 210, labelSize: 52, eyebrowSize: 24, gap: 18, gap2: 22, flameMode: 'above' });
  void top;
  let y = by + bs + 84;
  ctx.fillStyle = WHITE; ctx.textAlign = 'left'; const ts = fit(ctx, spec.title, W - 120, 50); ctx.font = font(ts); ctx.fillText(spec.title, 60, y);
  ctx.fillStyle = GREY; ctx.font = font(28, TEXT, 600); ctx.fillText(spec.sub, 60, y + 46);
  ctx.fillStyle = LINE; ctx.fillRect(60, H - 112, W - 120, 2);
  ctx.fillStyle = WHITE; ctx.font = font(30, TEXT, 600); ctx.textAlign = 'left'; ctx.fillText(SITE_URL, 60, H - 56);
  ctx.fillStyle = GREY; ctx.font = font(26, TEXT, 600); ctx.textAlign = 'right'; ctx.fillText('Gambits & traps, free', W - 60, H - 56);
}

function xpBar(ctx, x, y, w, h, pct) {
  ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  const fw = Math.max(h, (w * pct) / 100); ctx.fillStyle = goldFill(ctx, y, y + h); rr(ctx, x, y, fw, h, h / 2); ctx.fill();
}
function statTile(ctx, x, y, w, h, st, gold) {
  ctx.fillStyle = '#0d0d0d'; rr(ctx, x, y, w, h, 24); ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 2; rr(ctx, x + 1, y + 1, w - 2, h - 2, 24); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = gold ? GOLD : WHITE; const s = fit(ctx, st.n, w - 56, h * 0.5); ctx.font = font(s); ctx.fillText(st.n, x + 28, y + h * 0.58);
  ctx.fillStyle = GREY; ctx.font = font(h * 0.2, TEXT, 600); ctx.fillText(st.l, x + 28, y + h * 0.84);
}
function profileStory(ctx, spec, assets) {
  const W = 1080;
  const bottom = hero(ctx, spec, { x: W / 2, y: 360, maxW: 900, align: 'center', numSize: 150, labelSize: 56, eyebrowSize: 30, gap: 26, gap2: 44, flameMode: 'beside' });
  let y = bottom + 70;
  xpBar(ctx, 120, y, W - 240, 30, spec.pct);
  ctx.fillStyle = GREY; ctx.font = font(30, TEXT, 600); ctx.textAlign = 'center'; ctx.fillText(`${spec.title}  ·  ${spec.progress}`, W / 2, y + 86);
  y += 150;
  const tw = 450, th = 190, gx = (W - tw * 2 - 30) / 2;
  spec.stats.forEach((st, i) => statTile(ctx, gx + (i % 2) * (tw + 30), y + Math.floor(i / 2) * (th + 26), tw, th, st, i === 3 || i === 5));
  const endY = y + 3 * (th + 26);
  ctx.fillStyle = GREY; ctx.font = font(32, TEXT, 600); ctx.textAlign = 'center'; ctx.fillText(spec.sub, W / 2, endY + 36);
  footer(ctx, W, Math.min(1920 - 100, endY + 130), 'center');
}
function profileSquare(ctx, spec, assets) {
  const W = 1080, H = 1080;
  const bottom = hero(ctx, spec, { x: 60, y: 192, maxW: 960, align: 'left', numSize: 110, labelSize: 44, eyebrowSize: 24, gap: 18, gap2: 16, flameMode: 'beside' });
  let y = bottom + 44;
  xpBar(ctx, 60, y, W - 120, 24, spec.pct);
  ctx.fillStyle = GREY; ctx.font = font(26, TEXT, 600); ctx.textAlign = 'left'; ctx.fillText(`${spec.title}  ·  ${spec.progress}`, 60, y + 64);
  y += 100;
  const gap = 20, tw = (W - 120 - gap * 2) / 3, th = 150;
  spec.stats.forEach((st, i) => statTile(ctx, 60 + (i % 3) * (tw + gap), y + Math.floor(i / 3) * (th + gap), tw, th, st, i === 3 || i === 5));
  ctx.fillStyle = LINE; ctx.fillRect(60, H - 112, W - 120, 2);
  ctx.fillStyle = WHITE; ctx.font = font(30, TEXT, 600); ctx.textAlign = 'left'; ctx.fillText(SITE_URL, 60, H - 56);
  ctx.fillStyle = GREY; ctx.font = font(26, TEXT, 600); ctx.textAlign = 'right'; ctx.fillText(spec.sub, W - 60, H - 56);
}

/** paint a spec to a new canvas. fmt: 'story' | 'square' */
export async function renderCard(spec, fmt = 'story') {
  const f = FORMATS[fmt] || FORMATS.story;
  const assets = await loadAssets(spec);
  const cv = document.createElement('canvas'); cv.width = f.w; cv.height = f.h;
  const ctx = cv.getContext('2d');
  (fmt === 'square' ? drawSquare : drawStory)(ctx, spec, assets);
  return cv;
}
const toBlob = (cv) => new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));

// ------------------------------------------------------------------ the Share sheet
let cur = null;        // { spec, fmt, blobs: {story, square}, url }
let lastFocus = null;
const isOpen = () => { const m = $('#share'); return !!m && !m.classList.contains('hidden'); };
const canShareFiles = (file) => { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch { return false; } };
const makeFile = (blob, spec, fmt) => new File([blob], fileName(spec, fmt), { type: 'image/png' });

async function blobFor(fmt) {
  if (!cur) return null;
  if (!cur.blobs[fmt]) cur.blobs[fmt] = renderCard(cur.spec, fmt).then(toBlob);
  return cur.blobs[fmt];
}
async function showPreview() {
  const c = cur; if (!c) return;
  const fmt = c.fmt; const img = $('#share-img'), busy = $('#share-busy'), go = $('#share-go'), save = $('#share-save');
  go.disabled = save.disabled = true; busy.classList.remove('hidden'); img.classList.add('dim');
  img.style.aspectRatio = `${FORMATS[fmt].w} / ${FORMATS[fmt].h}`;
  try {
    const blob = await blobFor(fmt);
    if (cur !== c || c.fmt !== fmt) return;
    if (c.url) URL.revokeObjectURL(c.url);
    c.url = URL.createObjectURL(blob); img.src = c.url; img.classList.remove('dim'); busy.classList.add('hidden');
    go.disabled = save.disabled = false; img.dataset.fmt = fmt;
    const file = makeFile(blob, c.spec, fmt), native = canShareFiles(file);
    go.textContent = native ? 'Share' : 'Download image'; save.classList.toggle('hidden', !native);
  } catch (e) { console.error('share card', e); busy.textContent = 'Could not make the card. Try again.'; busy.classList.remove('hidden'); }
}
function download(blob, spec, fmt) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName(spec, fmt); document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function doShare() {
  const c = cur; if (!c) return; const blob = await blobFor(c.fmt); const file = makeFile(blob, c.spec, c.fmt);
  if (canShareFiles(file)) {
    try { await navigator.share({ files: [file], title: 'Pawnado', text: `${c.spec.share.text} ${SITE_LINK}` }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  download(blob, c.spec, c.fmt);
}
async function doSave() { const c = cur; if (!c) return; download(await blobFor(c.fmt), c.spec, c.fmt); }

export function openShare(spec, heading) {
  if (!spec) return;
  hidePrompt();
  if (cur && cur.url) URL.revokeObjectURL(cur.url);
  cur = { spec, fmt: 'story', blobs: {}, url: '' };
  lastFocus = document.activeElement;
  $('#share-eyebrow').textContent = spec.kind === 'profile' ? 'Your progress' : 'Share';
  $('#share-title').textContent = heading || (spec.kind === 'profile' ? 'Share my progress' : 'Share your win');
  $('#share-img').removeAttribute('src');
  const busy = $('#share-busy'); busy.textContent = 'Making your card…';
  document.querySelectorAll('#share-fmt button').forEach((b) => { const on = b.dataset.fmt === 'story'; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
  $('#share').classList.remove('hidden'); document.body.classList.add('noscroll');
  showPreview();
  setTimeout(() => $('#share-go').focus({ preventScroll: true }), 60);
}
export function closeShare() {
  if (!isOpen()) return;
  $('#share').classList.add('hidden');
  if (!document.querySelector('.modal:not(.hidden)')) document.body.classList.remove('noscroll');
  if (cur && cur.url) { URL.revokeObjectURL(cur.url); cur.url = ''; }
  cur = null;
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

// ------------------------------------------------------------------ the prompt that offers a Share after a milestone
let pTimer = null, pToken = 0, pSpec = null;
export function hidePrompt() {
  pToken++; clearTimeout(pTimer); pSpec = null;
  const p = $('#share-prompt'); if (!p) return;
  p.classList.remove('show'); setTimeout(() => { if (!pSpec) p.hidden = true; }, 350);
}
const busyScreen = () => !!document.querySelector('#celebrate:not(.hidden), #summary:not(.hidden), #share:not(.hidden)');
/** Offer a Share for this milestone: a small bar slides up, auto-hides after ~12 s (or when the player moves on). */
export function offerShare(spec, delay = 1900) {
  if (!spec || !spec.prompt) return;
  const token = ++pToken; clearTimeout(pTimer);
  const show = (tries = 0) => {
    if (token !== pToken) return;
    if (busyScreen() && tries < 40) { pTimer = setTimeout(() => show(tries + 1), 400); return; }
    const p = $('#share-prompt'); pSpec = spec;
    $('#sp-ico').textContent = spec.prompt.icon; $('#sp-title').textContent = spec.prompt.title; $('#sp-sub').textContent = spec.prompt.sub;
    p.hidden = false; void p.offsetWidth; p.classList.add('show');
    pTimer = setTimeout(hidePrompt, 12000);
  };
  pTimer = setTimeout(() => show(0), delay);
}

export function initShare() {
  $('#sp-go').addEventListener('click', () => { const s = pSpec; if (s) openShare(s); });
  $('#sp-x').addEventListener('click', hidePrompt);
  $('#share-x').addEventListener('click', closeShare);
  $('#share').addEventListener('click', (e) => { if (e.target.id === 'share') closeShare(); });
  $('#share-go').addEventListener('click', doShare);
  $('#share-save').addEventListener('click', doSave);
  $('#share-fmt').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !cur) return;
    cur.fmt = b.dataset.fmt;
    document.querySelectorAll('#share-fmt button').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-checked', on); });
    showPreview();
  });
  // window + capture so Escape closes this sheet first, even when the Profile sheet is open underneath
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { e.stopImmediatePropagation(); e.preventDefault(); closeShare(); } }, true);
  window.__share = { renderCard, toBlob, openShare, offerShare, hidePrompt, state: () => cur };
}
