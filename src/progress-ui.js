// Progression UI: header level chip, profile strip on the opening list, profile / progress panel, run rewards in the
// summary and the level-up / badge / star celebrations. All numbers come from progress.js; nothing here grades moves.
import { haptic } from './haptics.js';
import {
  LEVELS, levelInfo, levelFor, ACHIEVEMENTS, achievementById, TIER_LABEL, TIER_RULE, STAR_BONUS, applyRun, applyWatch,
  loadState, saveState, freshState, tierOf, starsOf, recommend, dayKey, applyPuzzle, tacticRules,
} from './progress.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => Number(n).toLocaleString('en-US');

let state = freshState();
let ctxExtra = { easyIds: [], gambitIds: [] };
let openings = [], easeOf = () => null, hooks = {};
const listeners = [];
export const onProgressChange = (fn) => listeners.push(fn);
export const getProgress = () => state;
const notify = () => listeners.forEach((f) => f(state));
const persist = () => { saveState(localStorage, state); updateChrome(); notify(); };

export const tierFor = (id) => (state.openings[id] || {}).tier || 'none';

/** ★★★ row for an opening card: filled stars take the tier colour (bronze / silver / gold). */
export function starsHtml(id) {
  const t = tierFor(id), n = starsOf(t);
  const tip = t === 'none' ? 'No mastery stars yet: finish a line with 70%+ for bronze' : `${TIER_LABEL[t]} mastery: ${TIER_RULE[t]}`;
  return `<span class="stars t-${t}" title="${esc(tip)}" aria-label="${esc(t === 'none' ? 'No stars yet' : TIER_LABEL[t] + ' mastery')}">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
}

export const tacticTier = (id) => ((state.tactics.sets[id] || {}).tier) || 'none';
export const tacticSolved = (id) => (state.tactics.sets[id] || { solved: [] }).solved;
export const tacticFlawless = (id) => (state.tactics.sets[id] || { flawless: [] }).flawless;
/** ★★★ for an opening's tactics set (n = number of puzzles in it, for the tooltip) */
export function tacticStarsHtml(id, n) {
  const t = tacticTier(id), k = starsOf(t), rules = tacticRules(n || 1);
  const tip = t === 'none' ? `No tactics stars yet: ${rules.bronze} for bronze` : `${TIER_LABEL[t]} tactics mastery: ${rules[t]}`;
  return `<span class="stars t-${t}" title="${esc(tip)}" aria-label="${esc(t === 'none' ? 'No tactics stars yet' : TIER_LABEL[t] + ' tactics mastery')}">${[0, 1, 2].map((i) => `<i class="${i < k ? 'on' : ''}">★</i>`).join('')}</span>`;
}

// ------------------------------------------------------------------ header chip + strip on the setup screen
function barHtml(info) { return `<div class="xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${info.pct}"><i style="width:${info.pct}%"></i></div>`; }
function updateChrome() {
  const info = levelInfo(state.xp);
  const b = $('#profile-btn');
  if (b) {
    b.querySelector('.pb-lv').textContent = 'Lv ' + info.level.n;
    b.querySelector('.pb-fill').style.width = info.pct + '%';
    b.title = `Level ${info.level.n} · ${info.level.name} · ${fmt(state.xp)} XP`;
    b.setAttribute('aria-label', `Your progress: level ${info.level.n}, ${info.level.name}, ${fmt(state.xp)} XP`);
  }
  const sc = $('#streak-chip');
  if (sc) {
    const t = dayKey(), y = dayKey(new Date(Date.now() - 864e5));
    const n = state.days.last === t || state.days.last === y ? state.days.streak : 0;
    sc.querySelector('b').textContent = n; sc.classList.toggle('off', n === 0);
    sc.title = n ? `${n}-day training streak` : 'Train today to start a streak';
    sc.setAttribute('aria-label', n ? `${n}-day training streak` : 'No training streak yet. Train today to start one');
  }
  for (const s of document.querySelectorAll('.profile-strip')) {
    const stars = Object.values(state.openings).reduce((n, o) => n + starsOf(o.tier), 0);
    const badges = Object.keys(state.ach).length;
    s.innerHTML = `<span class="ps-ico" aria-hidden="true">${info.level.icon}</span>
      <div class="ps-main"><div class="ps-top"><b>Level ${info.level.n} · ${esc(info.level.name)}</b><span class="ps-rate">${info.level.rating}</span></div>
      ${barHtml(info)}
      <div class="ps-sub">${info.max ? `You made it to the 1500 Club · ${fmt(state.xp)} XP` : `${fmt(info.toNext)} XP to <b>${esc(info.next.name)}</b> (${info.next.rating})`}</div></div>
      <div class="ps-meta"><span title="Mastery stars">★ ${stars}</span><span title="Badges">🏅 ${badges}/${ACHIEVEMENTS.length}</span></div>`;
  }
}

// ------------------------------------------------------------------ "start here" strip (beginner-friendly picks)
export function renderStartHere(el, { active, onPick }) {
  if (!el) return;
  const rec = recommend(state, openings, easeOf, 3, hooks.isRisky);
  if (!active || rec.key === 'done') { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const copy = { easy: ['🌱 New here? Start with these', 'The easiest openings to learn: short books, natural moves.'], medium: ['🚀 Next up: step it up a notch', "You've started the easy ones. These are the next easiest."], hard: ['🏔️ Ready for a challenge', 'These take the most theory.'] }[rec.key];
  el.classList.remove('hidden');
  el.innerHTML = `<div class="sh-text"><b>${copy[0]}</b><span>${copy[1]}</span></div><div class="sh-chips">${rec.list.map((o) => `<button type="button" class="sh-chip" data-id="${esc(o.id)}">${esc(o.name)}${o.gambit ? ' <em>gambit</em>' : ''}</button>`).join('')}</div>`;
  el.querySelectorAll('.sh-chip').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.id)));
}

// ------------------------------------------------------------------ profile panel
let lastFocus = null;
const isProfileOpen = () => !$('#profile').classList.contains('hidden');
function renderProfile() {
  const info = levelInfo(state.xp);
  const c = { bronze: 0, silver: 0, gold: 0 };
  for (const o of Object.values(state.openings)) if (c[o.tier] !== undefined) c[o.tier]++;
  const unlocked = Object.keys(state.ach).length;
  const tacStars = state.tactics.stars;
  const road = LEVELS.map((l) => {
    const st = l.n < info.level.n ? 'done' : l.n === info.level.n ? 'cur' : 'todo';
    return `<li class="rd-${st}"><span class="rd-dot">${st === 'done' ? '✓' : l.icon}</span><span class="rd-name"><b>${esc(l.name)}</b><em>${l.rating}</em></span><span class="rd-xp">${fmt(l.xp)} XP</span></li>`;
  }).join('');
  const badges = ACHIEVEMENTS.map((a) => {
    const got = state.ach[a.id] !== undefined;
    return `<div class="bdg ${got ? 'got' : 'locked'}" title="${esc(a.name)}: ${esc(a.desc)}"><span class="bdg-ico" aria-hidden="true">${got ? a.icon : '🔒'}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>${got ? `<em>+${a.xp} XP</em>` : `<em class="dim">+${a.xp} XP</em>`}</div>`;
  }).join('');
  $('#profile-body').innerHTML = `
    <section class="pf-hero"><div class="pf-ico" aria-hidden="true">${info.level.icon}</div>
      <div class="pf-main"><div class="pf-lv">Level ${info.level.n} · <span>${info.level.rating} rating</span></div><div class="pf-name">${esc(info.level.name)}</div>
        ${barHtml(info)}
        <div class="pf-sub">${fmt(state.xp)} XP total · ${info.max ? 'Top of the road. Keep the gold stars coming!' : `${fmt(info.toNext)} XP to <b>${esc(info.next.name)}</b>`}</div></div></section>
    <section class="pf-stats">
      <div><b>${state.done}</b><span>lines finished</span></div><div><b>${state.perfect}</b><span>perfect lines</span></div>
      <div><b>${state.days.last === dayKey() || state.days.last === dayKey(new Date(Date.now() - 864e5)) ? state.days.streak : 0}</b><span>day streak</span></div><div><b>${state.bestStreak}</b><span>best clean streak</span></div></section>
    <section class="pf-sec"><h3>Tactics</h3>
      <div class="pf-tacstats"><div><b>${state.tactics.solved}</b><span>puzzles solved</span></div><div><b>${state.tactics.flawless}</b><span>first-try solves</span></div>
      <div><b>${state.tactics.streak}</b><span>puzzle streak</span></div><div><b>${state.tactics.bestStreak}</b><span>best streak</span></div></div>
      <p class="pf-rule">${tacStars} opening tactics set${tacStars === 1 ? '' : 's'} with a star. Solve puzzles on the Tactics tab: each solve pays its points as XP (re-solves pay 20%).</p></section>
    <section class="pf-sec"><h3>Mastery stars</h3>
      <div class="pf-tiers"><span class="tier t-bronze"><i>★</i><b>${c.bronze}</b> bronze</span><span class="tier t-silver"><i>★★</i><b>${c.silver}</b> silver</span><span class="tier t-gold"><i>★★★</i><b>${c.gold}</b> gold</span></div>
      <p class="pf-rule"><b>Bronze:</b> ${TIER_RULE.bronze}. <b>Silver:</b> ${TIER_RULE.silver}. <b>Gold:</b> ${TIER_RULE.gold}. A "clean" run is 90%+ with no hints.</p></section>
    <section class="pf-sec"><h3>Badges <span>${unlocked}/${ACHIEVEMENTS.length}</span></h3><div class="bdg-grid">${badges}</div></section>
    <section class="pf-sec"><h3>The road to 1500</h3><ol class="road">${road}</ol>
      <p class="pf-rule">You earn XP equal to your points on every finished line, plus bonuses for perfect lines, new openings, stars and badges. Replaying the same opening many times earns less, so mix it up.</p></section>
    <section class="pf-sec pf-reset"><button id="pf-reset" class="btn ghost" type="button">Reset my progress</button><span id="pf-reset-ask" class="hidden"> Erase all XP, stars and badges? <button id="pf-reset-yes" class="btn danger" type="button">Yes, erase</button> <button id="pf-reset-no" class="btn" type="button">Cancel</button></span></section>`;
  const ask = $('#pf-reset-ask'), rb = $('#pf-reset');
  rb.addEventListener('click', () => { ask.classList.remove('hidden'); rb.classList.add('hidden'); });
  $('#pf-reset-no').addEventListener('click', () => { ask.classList.add('hidden'); rb.classList.remove('hidden'); });
  $('#pf-reset-yes').addEventListener('click', () => { state = freshState(); persist(); renderProfile(); });
}
export const getRecommendation = (n = 3) => recommend(state, openings, easeOf, n, hooks.isRisky);
export function openProfile() {
  lastFocus = document.activeElement;
  renderProfile();
  $('#profile').classList.remove('hidden'); document.body.classList.add('noscroll', 'sheet-profile');
  $('#profile .modal-card').scrollTop = 0; $('#profile-body').scrollTop = 0;
  $('#profile-close').focus({ preventScroll: true });
}
export function closeProfile() {
  if (!isProfileOpen()) return;
  $('#profile').classList.add('hidden'); document.body.classList.remove('noscroll', 'sheet-profile');
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

// ------------------------------------------------------------------ run rewards (inside the summary) + celebrations
function countUp(node, to, ms = 900) {
  if (reduced() || to === 0) { node.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms); node.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
export function showRewards(result, run) {
  const box = $('#sum-rewards');
  if (!result.counted) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const g = result.gained, bef = levelInfo(result.before.xp), aft = levelInfo(state.xp);
  const chips = [`<span class="rw-chip">Points <b>${fmt(g.base)}</b>${result.xpFactor < 1 ? ` <i>×${result.xpFactor}</i>` : ''}</span>`];
  if (g.perfect) chips.push(`<span class="rw-chip good">💯 Perfect <b>+${g.perfect}</b></span>`);
  if (g.first) chips.push(`<span class="rw-chip good">🆕 First finish <b>+${g.first}</b></span>`);
  if (g.star) chips.push(`<span class="rw-chip good">★ ${TIER_LABEL[result.tierUp.to]} star <b>+${g.star}</b></span>`);
  for (const id of result.newAch) { const a = achievementById(id); chips.push(`<span class="rw-chip badge">${a.icon} ${esc(a.name)} <b>+${a.xp}</b></span>`); }
  const t = tierFor(run.openingId);
  const nextTier = { none: 'Finish a line with 70%+ for a bronze star', bronze: 'Two clean runs (90%+, no hints) for silver', silver: 'Three clean runs incl. a perfect one, on different lines, for gold', gold: 'Mastered! Try another opening' }[t];
  const n = run.completed ? '' : '<div class="rw-note">You left the book, so this run earns XP but not mastery progress.</div>';
  box.classList.remove('hidden');
  box.innerHTML = `<div class="rw-head"><span class="rw-xp">+<b id="rw-xp-num">0</b> XP</span><span class="rw-lv">${aft.level.icon} Lv ${aft.level.n} · ${esc(aft.level.name)}</span></div>
    <div class="rw-chips">${chips.join('')}</div>
    <div class="xpbar big" id="rw-bar"><i style="width:${bef.pct}%"></i></div>
    <div class="rw-sub">${aft.max ? 'You are in the 1500 Club!' : `${fmt(aft.toNext)} XP to <b>${esc(aft.next.name)}</b>`}</div>
    <div class="rw-star">${starsHtml(run.openingId)}<span>${esc(run.openingName)}: <b>${TIER_LABEL[t]}</b> · ${esc(nextTier)}</span></div>${n}`;
  countUp($('#rw-xp-num'), g.total);
  const fill = $('#rw-bar i');
  const go = async () => {
    await sleep(60);
    if (aft.level.n > bef.level.n && !reduced()) {
      fill.style.width = '100%'; await sleep(700);
      fill.style.transition = 'none'; fill.style.width = '0%'; fill.offsetWidth; fill.style.transition = '';
      await sleep(30);
    }
    fill.style.width = aft.pct + '%';
  };
  go();
}

const queue = []; let celebrating = false, starting = false;
/** Start showing queued celebrations after a short beat (the overlay only appears once it has content, so a quick tap can't skip an item). */
function startCelebrations() {
  if (!queue.length || celebrating || starting) return;
  starting = true;
  setTimeout(() => { starting = false; showNext(); }, reduced() ? 0 : 450);
}
function confetti(host) {
  if (reduced()) return;
  const colors = ['#5ad19a', '#3aa7ff', '#ffd54f', '#fb7185', '#b794f6', '#ffb86b'];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i'); p.className = 'cf';
    p.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
    p.style.setProperty('--dx', ((Math.random() - 0.5) * 160).toFixed(0) + 'px');
    p.style.setProperty('--r', ((Math.random() - 0.5) * 900).toFixed(0) + 'deg');
    p.style.setProperty('--d', (1.6 + Math.random() * 1.4).toFixed(2) + 's');
    p.style.setProperty('--w', (6 + Math.random() * 6).toFixed(0) + 'px');
    p.style.animationDelay = (Math.random() * 0.5).toFixed(2) + 's';
    p.style.background = colors[i % colors.length];
    frag.appendChild(p);
  }
  host.appendChild(frag);
}
function showNext() {
  const item = queue.shift();
  const root = $('#celebrate');
  if (!item) { root.classList.add('hidden'); celebrating = false; document.body.classList.remove('noscroll-cel'); return; }
  celebrating = true;
  root.className = 'celebrate kind-' + item.kind;
  $('#cel-confetti').innerHTML = '';
  $('#cel-kicker').textContent = item.kicker; $('#cel-title').textContent = item.title; $('#cel-sub').textContent = item.sub;
  const ico = $('#cel-ico'); ico.textContent = item.icon; ico.style.animation = 'none'; ico.offsetWidth; ico.style.animation = '';
  $('#cel-xp').textContent = item.xp ? `+${item.xp} XP` : '';
  $('#cel-xp').classList.toggle('hidden', !item.xp);
  $('#cel-next').textContent = queue.length ? 'Next ▶' : 'Continue';
  confetti($('#cel-confetti'));
  haptic(item.kind === 'level' ? 'celebrate' : 'move');
  setTimeout(() => $('#cel-next').focus({ preventScroll: true }), 50);
}
export function celebrate(result, run) {
  if (!result.counted) return;
  if (result.tierUp) {
    const t = result.tierUp.to;
    queue.push({ kind: 'star', icon: t === 'gold' ? '🥇' : t === 'silver' ? '🥈' : '🥉', kicker: 'Mastery star', title: `${TIER_LABEL[t]} star!`, sub: `${run.openingName}: ${t === 'gold' ? 'you have mastered this opening.' : TIER_RULE[t === 'bronze' ? 'silver' : 'gold'] + ' for the next star.'}`, xp: STAR_BONUS[t] });
  }
  for (const id of result.newAch) { const a = achievementById(id); queue.push({ kind: 'badge', icon: a.icon, kicker: 'New badge', title: a.name, sub: a.desc, xp: a.xp }); }
  if (result.levelUp) { const l = result.levelUp.to; queue.push({ kind: 'level', icon: l.icon, kicker: `Level ${l.n} reached`, title: l.name, sub: l.n === LEVELS.length ? 'Welcome to the 1500 Club. You made it to the end of the road!' : `You now play like a ${l.rating}. Keep climbing!`, xp: 0 }); }
  startCelebrations();
}
let toastTimer = null;
/** Small non-blocking banner (used while watching an opening, where a full-screen celebration would be in the way). */
export function toast(icon, title, sub) {
  const t = $('#toast');
  $('#toast-ico').textContent = icon; $('#toast-title').textContent = title; $('#toast-sub').textContent = sub || '';
  t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}
export function celebrateWatch(res) { // a badge earned from watching an opening
  for (const id of res.newAch) { const a = achievementById(id); toast(a.icon, `New badge: ${a.name}`, `${a.desc} · +${a.xp} XP`); }
  if (res.levelUp) { const l = res.levelUp.to; setTimeout(() => toast(l.icon, `Level ${l.n}: ${l.name}`, `You now play like a ${l.rating}. Keep climbing!`), 4400); }
}
export const isCelebrating = () => celebrating;

// ------------------------------------------------------------------ public API
export function recordRun(run) {
  const { state: s, result } = applyRun(state, run, ctxExtra);
  state = s; persist();
  return result;
}
export function recordPuzzle(pz) {
  const { state: s, result } = applyPuzzle(state, pz, ctxExtra);
  if (s !== state) { state = s; persist(); }
  return result;
}
/** Celebrations for a solved puzzle (star / badges / level). Same overlay as lines; XP for the solve itself is shown in the puzzle panel. */
export function celebratePuzzle(result, pz) {
  if (!result.counted) return;
  if (result.tierUp) {
    const t = result.tierUp.to;
    const rules = tacticRules(pz.setSize);
    queue.push({ kind: 'star', icon: t === 'gold' ? '🥇' : t === 'silver' ? '🥈' : '🥉', kicker: 'Tactics star', title: `${TIER_LABEL[t]} tactics star!`, sub: `${pz.openingName}: ${t === 'gold' ? 'you have solved the whole set.' : rules[t === 'bronze' ? 'silver' : 'gold'] + ' for the next star.'}`, xp: STAR_BONUS[t] });
  }
  for (const id of result.newAch) { const a = achievementById(id); queue.push({ kind: 'badge', icon: a.icon, kicker: 'New badge', title: a.name, sub: a.desc, xp: a.xp }); }
  if (result.levelUp) { const l = result.levelUp.to; queue.push({ kind: 'level', icon: l.icon, kicker: `Level ${l.n} reached`, title: l.name, sub: l.n === LEVELS.length ? 'Welcome to the 1500 Club. You made it to the end of the road!' : `You now play like a ${l.rating}. Keep climbing!`, xp: 0 }); }
  startCelebrations();
}
export function recordWatch(openingId) {
  const { state: s, result } = applyWatch(state, openingId, ctxExtra);
  if (s.watched.length !== state.watched.length) { state = s; persist(); }
  if (result.newAch.length) celebrateWatch(result);
  return result;
}
export function initProgress(cfg) {
  openings = cfg.openings; easeOf = cfg.easeOf; hooks = cfg.hooks || {};
  ctxExtra = { easyIds: openings.filter((o) => (easeOf(o.id) || {}).ease === 'easy').map((o) => o.id), gambitIds: openings.filter((o) => o.gambit).map((o) => o.id) };
  state = loadState(localStorage);
  updateChrome();
  $('#profile-btn').addEventListener('click', openProfile);
  const sc = $('#streak-chip'); if (sc) sc.addEventListener('click', openProfile);
  document.querySelectorAll('.profile-strip').forEach((b) => b.addEventListener('click', openProfile));
  $('#profile-x').addEventListener('click', closeProfile);
  $('#profile-close').addEventListener('click', closeProfile);
  $('#profile').addEventListener('click', (e) => { if (e.target.id === 'profile') closeProfile(); });
  $('#cel-next').addEventListener('click', showNext);
  $('#celebrate').addEventListener('click', (e) => { if (e.target.id === 'celebrate') showNext(); });
  document.addEventListener('keydown', (e) => {
    if (celebrating && (e.key === 'Escape' || e.key === 'Enter')) { e.stopImmediatePropagation(); e.preventDefault(); showNext(); return; }
    if (isProfileOpen() && e.key === 'Escape') { e.stopImmediatePropagation(); closeProfile(); }
  }, true);
}
