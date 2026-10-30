// Board + piece themes: applies the saved choice (CSS variables / data attributes), draws the picker with live
// mini-board previews, and tells the boards which arrow colours to use. Choice persists in localStorage.
import { haptic, hapticMode, hapticsOn, setHaptics } from './haptics.js';
import { BOARDS, PIECE_SETS, DEFAULT_BOARD, DEFAULT_PIECES } from './themes-data.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'rt1500-theme';
const GLOW = 'drop-shadow(0 0 1px rgba(170,238,255,.95)) drop-shadow(0 0 3px rgba(70,175,255,.7))';

const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
let state = (() => {
  const s = load();
  return { board: BOARDS.some((b) => b.id === s.board) ? s.board : DEFAULT_BOARD, pieces: PIECE_SETS.some((p) => p.id === s.pieces) ? s.pieces : DEFAULT_PIECES };
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
const listeners = [];
export const onThemeChange = (fn) => listeners.push(fn);
export const currentTheme = () => ({ ...state });
export const boardById = (id) => BOARDS.find((b) => b.id === id) || BOARDS[0];
export const setById = (id) => PIECE_SETS.find((p) => p.id === id) || PIECE_SETS[0];

/** Checkerboard as an SVG data URI: light background, dark squares drawn on top. */
export function boardImage(b) {
  let d = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 1) d += `M${x} ${y}h1v1h-1z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="${b.light}"/><path fill="${b.dark}" d="${d}"/></svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}

/** Arrow brushes (chessground drawable.brushes) tuned for the current board. */
export function getBrushes(boardId = state.board) {
  const a = boardById(boardId).arrows;
  return {
    green: { key: 'g', color: a.green, opacity: 1, lineWidth: 10 },
    red: { key: 'r', color: a.red, opacity: 1, lineWidth: 10 },
    blue: { key: 'b', color: a.blue, opacity: 1, lineWidth: 10 },
  };
}

function apply() {
  const b = boardById(state.board), root = document.documentElement;
  root.dataset.board = b.id; root.dataset.pieces = setById(state.pieces).id;
  const set = (k, v) => root.style.setProperty(k, v);
  set('--sq-light', b.light); set('--sq-dark', b.dark); set('--board-img', boardImage(b));
  set('--hl-last', b.last); set('--hl-sel', b.sel); set('--hl-dot', b.dot);
  set('--coord-on-light', b.cLight); set('--coord-on-dark', b.cDark);
  set('--pglow-b', b.glow ? GLOW : 'none'); set('--pglow-c', b.glow ? GLOW : 'drop-shadow(0 0 0 transparent)');
  listeners.forEach((fn) => fn(currentTheme()));
}
export function setTheme(patch) {
  state = { ...state, ...patch }; save(); apply(); if (isThemeOpen()) renderPicker();
}
apply();

// ------------------------------------------------------------------ picker
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R'; // 1.e4 e5 2.Nf3 Nc6 3.Bc4
const pieceUrl = (set, code) => `pieces/${set}/${code}.svg`;
const FILES = 'abcdefgh';

function previewBoard(b, set) {
  const rows = FEN.split('/'); let cells = '';
  const sq = (f, r) => FILES[f] + (8 - r);
  const dots = ['f6', 'h6', 'e7'], last = ['c4', 'f1'], sel = 'g8';
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { for (let k = 0; k < +ch; k++) { cells += cell(f, r, null); f++; } }
      else { const code = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase(); cells += cell(f, r, code); f++; }
    }
  }
  function cell(f, r, code) {
    const dark = (f + r) % 2 === 1, k = sq(f, r);
    const cls = ['tp-sq', dark ? 'd' : 'l', last.includes(k) ? 'last' : '', k === sel ? 'sel' : '', dots.includes(k) ? 'dot' : ''].filter(Boolean).join(' ');
    const coord = (f === 0 ? `<b class="tp-r">${8 - r}</b>` : '') + (r === 7 ? `<b class="tp-f">${FILES[f]}</b>` : '');
    return `<span class="${cls}">${code ? `<i class="tp-pc${code[0] === 'b' ? ' black' : ''}" style="background-image:url('${pieceUrl(set, code)}')"></i>` : ''}${coord}</span>`;
  }
  const c = (f) => f + .5, y = (r) => 8 - r - .5; // c4 -> f7 arrow in board units
  const arrow = `<svg class="tp-arrow" viewBox="0 0 8 8"><defs><marker id="tpah" markerWidth="4" markerHeight="4" refX="2.05" refY="2" orient="auto"><path d="M0,0 V4 L3,2 Z" fill="${b.arrows.green}"/></marker></defs><line x1="${c(2)}" y1="${y(3)}" x2="${c(5) - .22}" y2="${y(6) + .22}" stroke="${b.arrows.green}" stroke-width=".16" stroke-linecap="round" marker-end="url(#tpah)"/></svg>`;
  return `<div class="tp-board" aria-hidden="true">${cells}${arrow}</div>`;
}

function miniBoard(b) {
  return `<span class="bo-mini" style="background-color:${b.light};background-image:${boardImage(b)}"><i class="bo-lm" style="background:${b.last}"></i><i class="bo-sel" style="background:${b.sel}"></i><i class="bo-dot" style="background:radial-gradient(${b.dot} 22%, transparent 24%)"></i></span>`;
}

function vibNote() {
  const m = hapticMode();
  if (m === 'vibrate') return 'Tap, then (1 s later) the capture double buzz.';
  if (m === 'ios') return 'iPhone: needs iOS 18 or newer. Tap, then (1 s later) the capture buzz, to test it outside a touch.';
  return 'This device has no vibration motor. It works on phones.';
}
const SAMPLE = ['wK', 'wQ', 'wN', 'bK', 'bQ', 'bN'];
function renderPicker() {
  const b = boardById(state.board), ps = setById(state.pieces);
  const open = isThemeOpen();
  if (!open && !$('#theme-body')) return;
  const prev = $('#theme-body')?.querySelector('.theme-scroll')?.scrollTop ?? 0;
  $('#theme-body').innerHTML = `
    <div class="theme-preview">
      ${previewBoard(b, ps.id)}
      <div class="tp-info">
        <div class="eyebrow">Your look</div>
        <div class="tp-name" id="tp-board-name">${esc(b.name)}</div>
        <div class="tp-name sub" id="tp-piece-name">${esc(ps.name)} pieces</div>
        <div class="tp-lic ${ps.commercial ? 'ok' : 'nc'}" id="tp-lic">${ps.commercial ? '✓' : '⚠'} ${esc(ps.license)}</div>
      </div>
    </div>
    <div class="theme-scroll">
      <h3 class="theme-h">Vibration</h3>
      <div class="vib-row">
        <div class="vib-txt"><b>Haptic feedback</b><span>A light tap after your move and a double buzz when the computer takes one of your pieces.</span></div>
        <button type="button" id="vib-switch" class="switch${hapticsOn() ? ' on' : ''}" role="switch" aria-checked="${hapticsOn()}" aria-label="Vibration"><i></i></button>
      </div>
      <div class="vib-row vib-test"><button type="button" id="vib-try" class="btn">Try it</button><span id="vib-note" class="vib-note">${esc(vibNote())}</span></div>
      <h3 class="theme-h">Board</h3>
      <div class="theme-grid boards" role="radiogroup" aria-label="Board colours" id="board-opts">
        ${BOARDS.map((x) => `<button type="button" role="radio" aria-checked="${x.id === b.id}" class="topt${x.id === b.id ? ' on' : ''}" data-board="${x.id}">${miniBoard(x)}<span class="topt-name">${esc(x.name)}</span></button>`).join('')}
      </div>
      <h3 class="theme-h">Pieces</h3>
      <div class="theme-grid pieces" role="radiogroup" aria-label="Piece set" id="piece-opts">
        ${PIECE_SETS.map((p) => `<button type="button" role="radio" aria-checked="${p.id === ps.id}" class="topt${p.id === ps.id ? ' on' : ''}" data-pieces="${p.id}"><span class="po-pcs" style="background-color:${b.light};background-image:${boardImage(b)}">${SAMPLE.map((c) => `<i class="${c[0] === 'b' ? 'black' : ''}" style="background-image:url('${pieceUrl(p.id, c)}')"></i>`).join('')}</span><span class="topt-name">${esc(p.name)}</span><span class="topt-lic ${p.commercial ? 'ok' : 'nc'}">${p.commercial ? '✓' : '⚠'} ${esc(p.license)}</span></button>`).join('')}
      </div>
      <p class="theme-note">⚠ marks sets that are free for personal / non-commercial use only. Credits: <a href="THIRD_PARTY/PIECE-SET-CREDITS.md" target="_blank" rel="noopener">piece set licences</a>.</p>
    </div>`;
  const sc = $('#theme-body').querySelector('.theme-scroll'); if (sc) sc.scrollTop = prev;
}

let lastFocus = null;
export const isThemeOpen = () => !!$('#theme') && !$('#theme').classList.contains('hidden');
export function openThemes() {
  lastFocus = document.activeElement;
  $('#theme').classList.remove('hidden'); document.body.classList.add('noscroll');
  renderPicker();
  $('#theme-close').focus({ preventScroll: true });
}
export function closeThemes() {
  if (!isThemeOpen()) return;
  $('#theme').classList.add('hidden'); document.body.classList.remove('noscroll');
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

export function initThemes() {
  $('#theme-btn').addEventListener('click', openThemes);
  document.querySelectorAll('[data-open-theme]').forEach((b) => b.addEventListener('click', openThemes)); // the 🎨 button in the full-screen game bars
  $('#theme-x').addEventListener('click', closeThemes);
  $('#theme-close').addEventListener('click', closeThemes);
  $('#theme').addEventListener('click', (e) => { if (e.target.id === 'theme') closeThemes(); });
  $('#theme-reset').addEventListener('click', () => setTheme({ board: DEFAULT_BOARD, pieces: DEFAULT_PIECES }));
  $('#theme-body').addEventListener('click', (e) => {
    const sw = e.target.closest('#vib-switch');
    if (sw) { const v = !hapticsOn(); setHaptics(v); sw.classList.toggle('on', v); sw.setAttribute('aria-checked', v); if (v) haptic('move'); return; }
    if (e.target.closest('#vib-try')) { haptic('move', { force: true }); setTimeout(() => haptic('capture', { force: true }), 1000); return; }
    const t = e.target.closest('.topt'); if (!t) return;
    if (t.dataset.board) setTheme({ board: t.dataset.board }); else if (t.dataset.pieces) setTheme({ pieces: t.dataset.pieces });
    const again = t.dataset.board ? `[data-board="${t.dataset.board}"]` : `[data-pieces="${t.dataset.pieces}"]`;
    const n = $('#theme-body').querySelector(again); if (n) n.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (e) => {
    if (!isThemeOpen()) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeThemes(); }
    else if (e.key === 'Tab') {
      const f = [...$('#theme').querySelectorAll('button:not(.hidden), a[href]')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
}
