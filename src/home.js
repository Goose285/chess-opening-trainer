// Home screen: a hero card (continue where you left off, or a real suggested start) and horizontal rails.
// Only real data is shown: the last opening you played, the recommender's pick, your own solved count.
import { OPENINGS } from './openings.js';
import { META, EASE, styleOf } from './meta.js';
import { thumbHtml } from './thumb.js';
import { starsHtml, getRecommendation, getProgress, tierFor } from './progress-ui.js';
import { TIER_LABEL } from './progress.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STYLE_COLOR = { aggressive: '#fb7185', sharp: '#facc15', balanced: '#2dd4bf', positional: '#f0abfc', solid: '#94a3b8' };
const byEase = (a, b) => EASE[a.id].score - EASE[b.id].score;
const colorOf = (o) => { const y = styleOf(o.id); return o.gambit ? '#f59e0b' : y ? STYLE_COLOR[y.key] : '#5ad19a'; };

const TACTIC_TILES = [
  { key: 'mixed', icon: '🎲', name: 'Mixed round', meta: '10 puzzles', g: ['#10b981', '#0ea5e9'] },
  { key: 'trap', icon: '🪤', name: 'Famous traps', meta: 'Opening traps', g: ['#f59e0b', '#ef4444'] },
  { key: 'mate', icon: '♚', name: 'Checkmates', meta: 'Mate in 1–3', g: ['#6366f1', '#8b5cf6'] },
  { key: 'fork', icon: '🔱', name: 'Forks', meta: 'Hit two at once', g: ['#ec4899', '#f43f5e'] },
  { key: 'pin', icon: '📌', name: 'Pins & skewers', meta: 'Line them up', g: ['#14b8a6', '#22c55e'] },
  { key: 'hanging', icon: '🎁', name: 'Free pieces', meta: 'Spot the gift', g: ['#0ea5e9', '#6366f1'] },
];

function tile(o) {
  const t = tierFor(o.id);
  return `<button class="tile" type="button" data-open="${o.id}" style="--sc:${colorOf(o)}" aria-label="${esc(o.name)}, ${o.side === 'white' ? 'as White' : 'as Black'}">
    <span class="tile-art">${thumbHtml(o)}${EASE[o.id] && EASE[o.id].ease === 'easy' ? '<i class="sprout" aria-hidden="true">🌱</i>' : ''}</span>
    <span class="tile-name">${esc(o.name)}</span>
    <span class="tile-meta"><span class="chip ${o.side === 'white' ? 'w' : 'b'}">${o.side === 'white' ? 'White' : 'Black'}</span>${t !== 'none' ? starsHtml(o.id) : `<em>${o.lines.length} lines</em>`}</span></button>`;
}
function rail(title, sub, items, see) {
  if (!items.length) return '';
  return `<section class="rail"><div class="rail-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${see ? `<button class="see-all" type="button" data-see="${see}">See all</button>` : ''}</div><div class="rail-row">${items.join('')}</div></section>`;
}

export function renderHome(h) {
  const prog = getProgress();
  const last = OPENINGS.find((o) => o.id === h.lastId && o.lines.length);
  let pick = last, eyebrow = 'Continue', blurb = '';
  if (!pick) {
    const rec = getRecommendation(1);
    pick = rec.list[0]; eyebrow = rec.key === 'easy' ? 'Start here' : 'Up next';
  }
  const hero = $('#hero');
  if (pick) {
    const m = META[pick.id];
    blurb = m ? m.desc : pick.blurb;
    const t = tierFor(pick.id);
    hero.className = 'hero';
    hero.style.setProperty('--sc', colorOf(pick));
    hero.innerHTML = `<div class="hero-copy"><span class="hero-eyebrow">${eyebrow}</span><h2>${esc(pick.name)}</h2>
      <p class="hero-sub">${esc(blurb)}</p>
      <div class="hero-meta"><span class="chip ${pick.side === 'white' ? 'w' : 'b'}">${pick.side === 'white' ? 'White' : 'Black'}</span>${pick.gambit ? '<span class="chip g">Gambit</span>' : ''}${starsHtml(pick.id)}${t !== 'none' ? `<em>${TIER_LABEL[t]}</em>` : ''}</div>
      <div class="hero-actions"><button class="btn primary" type="button" data-hero="play">▶ ${last ? 'Continue' : 'Start'}</button><button class="btn ghost" type="button" data-hero="watch">Watch first</button></div></div>
      <div class="hero-art">${thumbHtml(pick)}</div>`;
    hero.dataset.id = pick.id;
  } else {
    hero.className = 'hero hero-tac';
    hero.removeAttribute('data-id');
    hero.innerHTML = `<div class="hero-copy"><span class="hero-eyebrow">Next challenge</span><h2>Sharpen your tactics</h2><p class="hero-sub">You have started every beginner-friendly opening. Test them with real puzzles from your openings.</p><div class="hero-actions"><button class="btn primary" type="button" data-hero="tactics">▶ Mixed round</button></div></div><div class="hero-art"><span class="hero-emoji" aria-hidden="true">🧩</span></div>`;
  }

  const open = OPENINGS.filter((o) => o.lines.length);
  const easy = open.filter((o) => EASE[o.id] && EASE[o.id].ease === 'easy').sort(byEase).slice(0, 12);
  const gw = open.filter((o) => o.gambit && o.side === 'white').sort(byEase).slice(0, 12);
  const gb = open.filter((o) => o.gambit && o.side === 'black').sort(byEase).slice(0, 12);
  const tac = TACTIC_TILES.map((t) => `<button class="tile tile-tac" type="button" data-tac="${t.key}" style="--g1:${t.g[0]};--g2:${t.g[1]}"><span class="tile-art tac-art"><b aria-hidden="true">${t.icon}</b></span><span class="tile-name">${t.name}</span><span class="tile-meta"><em>${t.meta}</em></span></button>`);
  $('#home-rails').innerHTML =
    rail('Beginner friendly', 'Short books, natural moves', easy.map(tile), 'beginner') +
    rail('Gambits for White', 'Sacrifice a pawn, win the initiative', gw.map(tile), 'gambit-white') +
    rail('Gambits for Black', 'Fight back with a sting', gb.map(tile), 'gambit-black') +
    rail('Tactics', prog.tactics && prog.tactics.solved ? `${prog.tactics.solved} solved so far` : 'Puzzles from your openings', tac, null);

  // handlers (re-bound each render; the nodes are new)
  const heroPlay = hero.querySelector('[data-hero="play"]'), heroWatch = hero.querySelector('[data-hero="watch"]'), heroTac = hero.querySelector('[data-hero="tactics"]');
  if (heroPlay) heroPlay.onclick = () => h.onStart(pick.id);
  if (heroWatch) heroWatch.onclick = () => h.onWatch(pick.id);
  if (heroTac) heroTac.onclick = () => h.onTactic('mixed');
  $('#home-rails').onclick = (e) => {
    const t = e.target.closest('[data-open]'); if (t) return h.onOpen(t.dataset.open);
    const k = e.target.closest('[data-tac]'); if (k) return h.onTactic(k.dataset.tac);
    const s = e.target.closest('[data-see]'); if (s) return h.onSeeAll(s.dataset.see);
  };
}
