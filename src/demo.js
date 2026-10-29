// "Watch it first": plays an opening line on a view-only board, one move at a time, with arrows,
// highlights and a plain-language note for every move.
import { Chessground } from 'chessground';
import { buildSteps, castleRook } from './explain.js';
import { LORE } from './lore-text.js';
import { onThemeChange, getBrushes } from './themes.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const DEFAULT_TITLE = document.title;
let h = {};            // handlers from main.js: { practice(opening), learn(opening), back() }
let opening = null, lineIdx = 0, steps = [], idx = 0;
let cg = null, timer = null, playing = false, speed = 1;
onThemeChange(() => { if (cg) { cg.set({ drawable: { brushes: getBrushes() } }); cg.redrawAll(); } });
export const isDemoOpen = () => !$('#demo').classList.contains('hidden');
export const demoState = () => ({ opening, lineIdx, idx, total: steps.length, playing });

function firstSentence(t) { const m = /^(.+?[.!?])(\s|$)/.exec(t); return m ? m[1] : t; }

function shapesFor(step) {
  if (!step) return [];
  const out = [{ orig: step.from, dest: step.to, brush: step.captured ? 'red' : 'green' }];
  if (step.castle) { const [rf, rt] = castleRook(step); out.push({ orig: rf, dest: rt, brush: 'blue' }); }
  if (step.check) {
    // ring the king that is in check
    const king = findKing(step.fen, step.color === 'w' ? 'b' : 'w');
    if (king) out.push({ orig: king, brush: 'red' });
  }
  return out;
}
function findKing(fen, color) {
  const rows = fen.split(' ')[0].split('/'); const target = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) { let f = 0; for (const ch of rows[r]) { if (/\d/.test(ch)) f += +ch; else { if (ch === target) return 'abcdefgh'[f] + (8 - r); f++; } } }
  return null;
}

function render(animate = true) {
  if (!cg) return;
  const step = idx ? steps[idx - 1] : null;
  cg.set({
    fen: step ? step.fen : START,
    lastMove: step ? [step.from, step.to] : undefined,
    check: step ? step.check : false,
    animation: { enabled: animate, duration: 320 },
    drawable: { autoShapes: shapesFor(step) },
  });
  const lore = LORE[opening.id];
  const done = idx === steps.length;
  $('#demo-label').textContent = step ? step.label : 'Starting position';
  $('#demo-text').textContent = step ? step.text : `${firstSentence(lore ? lore.idea : opening.blurb)} Press Play to watch the moves.`;
  $('#demo-note').classList.toggle('is-end', done);
  if (done) $('#demo-text').textContent += ' That is the end of this line. Replay it, pick another line, or press "Start practicing" to play it yourself.';
  $('#demo-count').textContent = `${idx} / ${steps.length}`;
  $('#demo-bar').style.width = (steps.length ? (idx / steps.length) * 100 : 0) + '%';
  $('#demo-prev').disabled = idx === 0; $('#demo-restart').disabled = idx === 0;
  $('#demo-next').disabled = done;
  $('#demo-practice').classList.toggle('pulse', done);
  const pb = $('#demo-play');
  pb.textContent = playing ? '⏸ Pause' : done ? '↻ Replay' : '▶ Play';
  pb.setAttribute('aria-label', playing ? 'Pause' : done ? 'Replay' : 'Play');
  document.querySelectorAll('#demo-moves .dm').forEach((b) => {
    const i = +b.dataset.i;
    b.classList.toggle('cur', i === idx); b.classList.toggle('seen', i < idx);
    if (i === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  const cur = $('#demo-moves .dm.cur'), box = $('#demo-moves');
  if (cur) box.scrollTop = Math.max(0, cur.offsetTop - box.offsetTop - box.clientHeight / 2 + cur.clientHeight / 2);
}

function schedule() {
  clearTimeout(timer);
  if (!playing) return;
  const cur = idx ? steps[idx - 1].text : $('#demo-text').textContent;
  const wait = (1900 + cur.length * 30) / speed;
  timer = setTimeout(() => { if (idx < steps.length) { idx++; render(); } if (idx >= steps.length) { playing = false; render(); } else schedule(); }, idx === 0 ? 700 / speed : wait);
}
export function play() { if (idx >= steps.length) { idx = 0; render(false); } playing = true; render(); schedule(); }
export function pause() { playing = false; clearTimeout(timer); render(); }
const toggle = () => (playing ? pause() : play());
function go(i, user = true) {
  idx = Math.max(0, Math.min(steps.length, i));
  if (idx >= steps.length) playing = false;
  if (user && playing) { render(); schedule(); } else render();
}

function loadLine(i, autoplay) {
  clearTimeout(timer); playing = false; lineIdx = i; idx = 0;
  steps = buildSteps(opening, i);
  $('#demo-moves').innerHTML = steps.map((s, k) => `<button class="dm ${s.color === 'w' ? 'w' : 'b'}" data-i="${k + 1}" title="${esc(s.label)}">${esc(s.label)}</button>`).join('');
  render(false);
  if (autoplay) play();
}

export function openDemo(op, line = 0, autoplay = true) {
  opening = op;
  document.title = `Watch it first: ${op.name} — Road to 1500`;
  $('#demo-title').textContent = op.name;
  const sel = $('#demo-line');
  sel.innerHTML = op.lines.map((l, i) => `<option value="${i}">${esc(l.name)}</option>`).join('');
  sel.value = String(line);
  if (cg) cg.destroy();
  cg = Chessground($('#demo-board'), {
    fen: START, orientation: op.side === 'black' ? 'black' : 'white', viewOnly: true, coordinates: true,
    animation: { enabled: true, duration: 320 }, highlight: { lastMove: true, check: true },
    drawable: { enabled: true, visible: true, autoShapes: [], brushes: getBrushes() },
  });
  loadLine(line, autoplay);
}
export function closeDemo() {
  clearTimeout(timer); playing = false; document.title = DEFAULT_TITLE;
  if (cg) { cg.destroy(); cg = null; } // a hidden board must not try to redraw its arrows at size 0
}
export const demoOpening = () => opening;
export const demoLineIdx = () => lineIdx;

export function initDemo(handlers) {
  h = handlers;
  $('#demo-play').addEventListener('click', toggle);
  $('#demo-next').addEventListener('click', () => go(idx + 1));
  $('#demo-prev').addEventListener('click', () => go(idx - 1));
  $('#demo-restart').addEventListener('click', () => { const was = playing; go(0, false); if (was) play(); });
  $('#demo-line').addEventListener('change', (e) => loadLine(+e.target.value, true));
  $('#demo-moves').addEventListener('click', (e) => { const b = e.target.closest('.dm'); if (b) go(+b.dataset.i); });
  $('#demo-speed').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    speed = +b.dataset.speed;
    $('#demo-speed').querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-checked', on); });
    if (playing) schedule();
  });
  $('#demo-practice').addEventListener('click', () => { closeDemo(); h.practice(opening); });
  $('#demo-learn').addEventListener('click', () => h.learn(opening));
  $('#demo-back').addEventListener('click', () => { closeDemo(); h.back(); });
  document.addEventListener('keydown', (e) => {
    if (!isDemoOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#learn').classList.contains('hidden')) return;
    const t = e.target.tagName;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0, false); }
    else if (e.key === ' ' && t !== 'BUTTON' && t !== 'SELECT') { e.preventDefault(); toggle(); }
  });
}
