// The "Learn more" popup: idea, plans for both sides, key squares / structure, traps and who plays the opening.
import { LORE } from './lore-text.js';
import { META, levelOf, STYLE, styleInfo, easeInfo } from './meta.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// "e4 e5 Nf3" -> "1.e4 e5 2.Nf3"
export function numberedSan(sans) {
  return sans.trim().split(/\s+/).map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ');
}

let lastFocus = null;
let watchHandler = null;
export const isLearnOpen = () => !$('#learn').classList.contains('hidden');

let tacticsHandler = null;
export function openLearn(opening, opts = {}) {
  const lore = LORE[opening.id];
  if (!lore) return;
  lastFocus = document.activeElement;
  $('#learn').setAttribute('aria-label', `Learn more about ${opening.name}`);
  $('#learn-eyebrow').textContent = `Learn more · ${opening.eco || ''} · ${opening.side === 'white' ? 'for White' : 'for Black'}${opening.gambit ? ' · Gambit' : ''}`;
  $('#learn-title').textContent = opening.name;
  const list = (a) => `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const side = opening.side === 'white' ? ['Your plans as White', 'Black\'s plans'] : ['White\'s plans', 'Your plans as Black'];
  const meta = META[opening.id];
  const sty = STYLE[opening.id] ? { ...STYLE[opening.id], ...styleInfo(STYLE[opening.id].style) } : null;
  const lv = meta ? levelOf(meta.lo) : null;
  const ez = easeInfo(opening.id);
  const rating = meta ? `<section class="ln-sec ln-rating"><p class="ln-desc">${esc(meta.desc)}</p>
      <div class="ln-rrow"><span class="rtag r-${lv.key}"><i></i>${meta.lo}–${meta.hi}<em>${lv.label}</em></span>${sty ? `<span class="stag s-${sty.key}"><b aria-hidden="true">${sty.icon}</b>${sty.label}</span>` : ''}${meta.trappy ? '<span class="rtag r-fun"><i></i>Fun / trappy</span>' : ''}${ez ? `<span class="etag e-${ez.key}">${ez.key === 'easy' ? '🌱 ' : ''}${ez.label}</span>` : ''}</div>
      ${sty ? `<p class="ln-feel"><b>${sty.label} (${esc(sty.hint)}).</b> ${esc(sty.feel)}</p>` : ''}
      <p class="ln-why"><b>Recommended rating ${meta.lo}–${meta.hi}.</b> ${esc(meta.why)}${meta.trappy ? ' It is unsound against strong, prepared opponents (roughly above ' + meta.hi + ').' : ''}</p>
      ${ez ? `<p class="ln-ease"><b>Difficulty: ${ez.label}.</b> ${ez.key === 'easy' ? 'A good first opening to learn: ' : ez.key === 'hard' ? 'A big step up: ' : ''}${esc(ez.why)}.</p>` : ''}</section>` : '';
  const note = opts.note
    ? `<section class="ln-sec ln-now"><h3>📍 This position</h3><div class="ln-now-t">${esc(opts.note.title)}</div><p>${esc(opts.note.text)}</p>${opts.note.line ? `<p class="ln-line">Variation so far: <b>${esc(opts.note.line)}</b></p>` : ''}</section>` : '';
  $('#learn-body').innerHTML = `
    ${rating}
    ${note}
    <section class="ln-sec"><h3>💡 The idea</h3><p>${esc(lore.idea)}</p></section>
    <section class="ln-sec ln-plans">
      <div><h3>♔ ${side[0]}</h3>${list(lore.white)}</div>
      <div><h3>♚ ${side[1]}</h3>${list(lore.black)}</div>
    </section>
    <section class="ln-sec"><h3>🎯 Key squares &amp; structure</h3><p>${esc(lore.structure)}</p></section>
    <section class="ln-sec"><h3>⚠️ Traps &amp; common mistakes</h3>
      ${lore.traps.map((t) => `<div class="ln-trap"><b>${esc(t.name)}.</b> ${esc(t.text)}${t.moves ? `<code>${esc(numberedSan(t.moves))}</code>` : ''}</div>`).join('')}
    </section>
    <section class="ln-sec"><h3>👤 Who plays it</h3><p>${esc(lore.players)}</p></section>`;
  watchHandler = opts.onWatch || null; tacticsHandler = opts.onTactics || null;
  $('#learn-tactics').classList.toggle('hidden', !tacticsHandler);
  $('#learn-watch').classList.toggle('hidden', !watchHandler);
  $('#learn').classList.remove('hidden');
  document.body.classList.add('noscroll');
  $('#learn .modal-card').scrollTop = 0;
  $('#learn-close').focus({ preventScroll: true });
}

export function closeLearn() {
  if (!isLearnOpen()) return;
  $('#learn').classList.add('hidden');
  document.body.classList.remove('noscroll');
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  lastFocus = null; watchHandler = null; tacticsHandler = null;
}

export function initLearn() {
  $('#learn-x').addEventListener('click', closeLearn);
  $('#learn-close').addEventListener('click', closeLearn);
  $('#learn').addEventListener('click', (e) => { if (e.target.id === 'learn') closeLearn(); });
  $('#learn-watch').addEventListener('click', () => { const h = watchHandler; closeLearn(); if (h) h(); });
  $('#learn-tactics').addEventListener('click', () => { const h = tacticsHandler; closeLearn(); if (h) h(); });
  document.addEventListener('keydown', (e) => {
    if (!isLearnOpen()) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeLearn(); }
    else if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...$('#learn').querySelectorAll('button:not(.hidden)')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
}
