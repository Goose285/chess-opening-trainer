// Tactics UI: the Tactics home (pick an opening's puzzle set, or "Mixed") and the puzzle player.
// Puzzle logic is in tactics-core.js, progression in progress.js / progress-ui.js. Data (tactics/tactics.json) is lazy-loaded.
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { OPENINGS } from './openings.js';
import { attachLift } from './lift.js';
import { getBrushes, onThemeChange } from './themes.js';
import { haptic } from './haptics.js';
import { thumbHtml } from './thumb.js';
import { createStepper } from './stepper.js';
import {
  parseData, buildQueue, THEME_FILTERS, themeFilter, RATING_FILTERS, ratingFilter, inRating, streakTier, accuracy, themesOf, solverColor, solverMoveCount, maxPoints, movePoints, judgeMove, splitUci, HINT_POINTS,
} from './tactics-core.js';
import { recordPuzzle, breakTacticsStreak, celebratePuzzle, getProgress, tacticTier, tacticSolved, tacticStarsHtml, onProgressChange } from './progress-ui.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const colorName = (c) => (c === 'w' ? 'white' : 'black');
const fmt = (n) => Number(n).toLocaleString('en-US');
const MIXED_SIZE = 10;

let host = { show: () => {} };     // set by initTactics: { show(screenId) }
let data = null, loading = null, loadError = null; // { [openingId]: puzzle[] }
const prefs = (() => { try { return JSON.parse(localStorage.getItem('ot-prefs') || '{}'); } catch { return {}; } })();
const savePrefs = () => { try { const cur = JSON.parse(localStorage.getItem('ot-prefs') || '{}'); cur.tacKind = prefs.tacKind; cur.tacTheme = prefs.tacTheme; cur.tacRating = prefs.tacRating; localStorage.setItem('ot-prefs', JSON.stringify(cur)); } catch {} };
let kind = prefs.tacKind || 'all', themeKey = prefs.tacTheme || 'any', ratingKey = RATING_FILTERS.some((f) => f.key === prefs.tacRating) ? prefs.tacRating : 'all';
const passes = (p) => themeFilter(themeKey).test(p) && inRating(p, ratingKey);
let sess = null;   // { mode: 'opening'|'mixed', openingId, queue, index, solved, points, xp }
let run = null;    // the puzzle being played
let cg = null, detachLift = null;

// ------------------------------------------------------------------ data
export function loadData() {
  if (data) return Promise.resolve(data);
  if (!loading) {
    loading = fetch(new URL('tactics/tactics.json', document.baseURI)).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((j) => { data = parseData(j); loadError = null; return data; })
      .catch((e) => { loadError = e; loading = null; throw e; });
  }
  return loading;
}
const openingOf = (id) => OPENINGS.find((o) => o.id === id);
const filteredSet = (id) => (data[id] || []).filter(passes);
const kindOk = (o) => kind === 'all' || (kind === 'gambit' ? !!o.gambit : o.side === kind);
const allSolved = () => { const s = new Set(); for (const r of Object.values(getProgress().tactics.sets)) r.solved.forEach((x) => s.add(x)); return s; };

// ------------------------------------------------------------------ Tactics home
function statsHtml() {
  const t = getProgress().tactics;
  return `<span class="tchip"><b>${t.solved}</b> solved</span><span class="tchip"><b>${t.streak}</b> 🔥 streak</span><span class="tchip"><b>${t.stars}</b> ★ sets starred</span>`;
}
function renderHome() {
  refreshChrome();
  const grid = $('#tac-grid');
  const mixedBtn = $('#tac-mixed');
  if (!data) {
    mixedBtn.disabled = true;
    mixedBtn.innerHTML = loadError ? '<b>Could not load the puzzles.</b><span>Check your connection, then tap to retry.</span>' : '<b>Loading puzzles…</b><span>Just a moment.</span>';
    mixedBtn.disabled = !loadError;
    grid.innerHTML = '';
    return;
  }
  const pf = passes;
  const openings = OPENINGS.filter((o) => data[o.id] && kindOk(o));
  const sets = openings.map((o) => ({ o, pool: data[o.id].filter(pf) })).filter((x) => x.pool.length);
  const total = sets.reduce((n, x) => n + x.pool.length, 0);
  const solved = allSolved();
  const solvedIn = sets.reduce((n, x) => n + x.pool.filter((p) => solved.has(p.id)).length, 0);
  mixedBtn.disabled = !total;
  mixedBtn.innerHTML = `<span class="tm-ico" aria-hidden="true">🎲</span><div class="tm-main"><b>Mixed puzzles</b><span>A round of ${Math.min(MIXED_SIZE, total)} from ${sets.length} opening${sets.length === 1 ? '' : 's'}, new ones first</span></div><span class="tm-go" aria-hidden="true">Play ▶</span>`;
  $('#tac-count').textContent = `${sets.length} opening${sets.length === 1 ? '' : 's'} · ${total} puzzles · ${solvedIn} solved`;
  grid.innerHTML = '';
  for (const { o, pool } of sets) {
    const sv = tacticSolved(o.id); const done = pool.filter((p) => sv.includes(p.id)).length;
    const traps = pool.filter((p) => p.trap).length;
    const full = data[o.id].length;
    const c = el('button', 'ocard tcard' + (o.gambit ? ' gambit' : ''));
    c.type = 'button'; c.dataset.id = o.id; c.setAttribute('aria-label', `${o.name}: ${pool.length} puzzles, ${done} solved. Play.`);
    const sideIcon = o.side === 'white' ? '<span class="chip w">White</span>' : '<span class="chip b">Black</span>';
    c.innerHTML = `<div class="oc-thumb">${thumbHtml(o)}</div><div class="oc-main"><div class="oc-top"><span class="oc-eco">${esc(o.eco || '')}${o.gambit ? ' · <b class="gtag">Gambit</b>' : ''}</span>${sideIcon}</div>
      <div class="oc-namerow"><div class="oc-name">${esc(o.name)}</div>${tacticStarsHtml(o.id, full)}</div>
      <div class="tc-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${pool.length}" aria-valuenow="${done}"><i style="width:${Math.round((done / pool.length) * 100)}%"></i></div>
      <div class="oc-foot"><span><b>${done}</b> / ${pool.length} solved${traps ? ` · <span class="trapmark" title="Includes famous traps">🪤 ${traps} trap${traps === 1 ? '' : 's'}</span>` : ''}</span><span class="tc-go">Play ▶</span></div></div>`;
    c.style.setProperty('--sc', o.gambit ? '#d4d4d4' : '#8a8a8a');
    c.addEventListener('click', () => startSet(o.id));
    grid.appendChild(c);
  }
  if (!sets.length) {
    const none = el('div', 'tac-empty', `<p>No puzzles match these filters${ratingKey !== 'all' ? ` (rating ${esc(ratingFilter(ratingKey).label)})` : ''}.</p>`);
    const b = el('button', 'btn', ratingKey !== 'all' ? 'Show all ratings' : 'Show all themes'); b.type = 'button';
    b.addEventListener('click', () => { if (ratingKey !== 'all') setRating('all'); else { themeKey = 'any'; kind = 'all'; prefs.tacTheme = themeKey; prefs.tacKind = kind; savePrefs(); setSeg($('#tac-theme-seg'), 'theme', themeKey); setSeg($('#tac-kind-seg'), 'kind', kind); renderHome(); } });
    none.appendChild(b); grid.appendChild(none);
  }
}
function setRating(key) {
  ratingKey = RATING_FILTERS.some((f) => f.key === key) ? key : 'all';
  prefs.tacRating = ratingKey; savePrefs();
  setSeg($('#tac-rating-seg'), 'rating', ratingKey); renderHome();
}
function refreshChrome() {
  const f = $('#tac-stats'); if (f) f.innerHTML = statsHtml();
}

/** Start a mixed round straight from the Home screen: key is 'mixed' or one of the theme filters (mate, fork, pin, ...). */
export async function startTactics(key) {
  themeKey = key === 'mixed' || !THEME_FILTERS.some((f) => f.key === key) ? 'any' : key; kind = 'all';
  prefs.tacTheme = themeKey; prefs.tacKind = kind; savePrefs();
  setSeg($('#tac-theme-seg'), 'theme', themeKey); setSeg($('#tac-kind-seg'), 'kind', kind);
  await startSet('mixed');
}

/** "Practice tactics" from an opening (Learn more popup / Watch screen): play that opening's puzzle set straight away. */
export async function startTacticsFor(openingId) {
  themeKey = 'any'; kind = 'all';
  prefs.tacTheme = themeKey; prefs.tacKind = kind; savePrefs();
  setSeg($('#tac-theme-seg'), 'theme', themeKey); setSeg($('#tac-kind-seg'), 'kind', kind);
  await startSet(openingId);
}

export async function openTactics() {
  host.show('tactics');
  renderHome();
  try { await loadData(); } catch { /* shown in the Mixed button; tap to retry */ }
  renderHome();
}

// ------------------------------------------------------------------ session
async function startSet(openingId) {
  try { await loadData(); } catch { return; }
  const solvedAll = openingId === 'mixed' ? allSolved() : new Set(tacticSolved(openingId));
  const poolOf = (ok) => (openingId === 'mixed' ? OPENINGS.filter((o) => data[o.id] && kindOk(o)).flatMap((o) => data[o.id].filter(ok)) : (data[openingId] || []).filter(ok));
  let pool = poolOf(passes), ratingNote = '';
  // nothing in the chosen rating range for this opening (e.g. 1300+ in a small set): play it at all ratings instead of a dead end
  if (!pool.length && ratingKey !== 'all') { pool = poolOf((p) => themeFilter(themeKey).test(p)); ratingNote = `none at ${ratingFilter(ratingKey).label}, showing all`; }
  if (!pool.length) return;
  const queue = buildQueue(pool, [...solvedAll], openingId === 'mixed' ? { size: MIXED_SIZE, random: true } : {});
  sess = { mode: openingId === 'mixed' ? 'mixed' : 'opening', openingId, queue, index: 0, solved: 0, points: 0, xp: 0, skipped: 0, hits: 0, attempted: 0, ratingNote };
  shownStreak = null;
  host.show('puzzle');
  initBoard();
  loadPuzzle();
}

function initBoard() {
  if (cg) return;
  cg = Chessground($('#pz-board'), {
    coordinates: true,
    animation: { enabled: true, duration: 260 },
    highlight: { lastMove: true, check: true },
    draggable: { showGhost: true, distance: 3, autoDistance: true },
    premovable: { enabled: false },
    drawable: { enabled: true, autoShapes: [], brushes: getBrushes() },
    selectable: { enabled: true },
  });
  detachLift = attachLift($('#pz-board'), cg);
}
window.addEventListener('resize', () => cg && cg.redrawAll());
onThemeChange(() => { if (cg) { cg.set({ drawable: { brushes: getBrushes() } }); cg.redrawAll(); } });

function syncBoard(extra = {}) {
  const g = run.game, user = run.color;
  const myTurn = run.phase === 'user' && colorName(g.turn()) === user;
  const dests = new Map();
  if (myTurn) for (const mv of g.moves({ verbose: true })) { if (!dests.has(mv.from)) dests.set(mv.from, []); dests.get(mv.from).push(mv.to); }
  cg.set({
    fen: g.fen(), turnColor: colorName(g.turn()), check: g.isCheck(),
    movable: { free: false, color: myTurn ? user : undefined, dests, showDests: true, events: { after: onDrop } },
    ...extra,
  });
}

async function loadPuzzle() {
  const p = sess.queue[sess.index];
  const token = Math.random();
  run = { p, token, color: solverColor(p), game: new Chess(p.fen), idx: 0, phase: 'busy', points: 0, wrongs: 0, hints: 0, cur: { wrong: false, hint: false }, revealed: false, finished: false, moveTries: 0 };
  window.__tac = { run: () => run, sess: () => sess, data: () => data, cg: () => cg };
  closeReview();
  const o = openingOf(p.openingId);
  const rtag = sess.ratingNote ? ` · ${sess.ratingNote}` : ratingKey !== 'all' ? ` · ${ratingFilter(ratingKey).label}` : '';
  $('#pz-eyebrow').textContent = (sess.mode === 'mixed' ? 'Tactics · Mixed' : 'Tactics') + rtag;
  $('#pz-title').textContent = sess.mode === 'mixed' ? 'Mixed puzzles' : (o ? o.name : 'Puzzle');
  $('#pz-stars').innerHTML = sess.mode === 'mixed' ? '' : tacticStarsHtml(p.openingId, (data[p.openingId] || []).length);
  setTags();
  updateStats();
  cg.set({ orientation: run.color, lastMove: undefined, drawable: { autoShapes: [] } });
  syncBoard({ lastMove: undefined });
  const n = solverMoveCount(p);
  setFeedback('idle', '…', 'Get ready', `Watch the opponent's move, then find ${n === 1 ? 'the best move' : `the best moves (${n} to find)`}.`);
  setButtons();
  await sleep(550);
  if (!run || run.token !== token) return;
  playOpponent(p.moves[0]);
  run.idx = 1;
  await sleep(380);
  if (!run || run.token !== token) return;
  startTurn();
}
function setTags() {
  const u = run.color, c = u === 'white' ? 'black' : 'white';
  const top = $('#pz-tag-top'), bot = $('#pz-tag-bottom');
  top.querySelector('.tag-name').textContent = `Opponent · ${c === 'white' ? 'White' : 'Black'}`; top.className = 'tag ' + c;
  bot.querySelector('.tag-name').textContent = `You · ${u === 'white' ? 'White' : 'Black'}`; bot.className = 'tag you ' + u;
}
function playOpponent(uci) {
  const mv = run.game.move(splitUci(uci));
  if (mv.captured) haptic('capture'); // they took one of your pieces
  syncBoard({ lastMove: [mv.from, mv.to], drawable: { autoShapes: [] } });
  return mv;
}
function startTurn() {
  run.phase = 'user'; run.cur = { wrong: false, hint: false };
  syncBoard({ drawable: { autoShapes: [] } });
  const n = solverMoveCount(run.p), done = (run.idx - 1) / 2;
  const side = run.color === 'white' ? 'White' : 'Black';
  setFeedback('idle', '▶', 'Your move', done === 0
    ? `${side} to move. Find the best move${n > 1 ? ` (${n} moves to find)` : ''}.`
    : `Correct so far. Move ${done + 1} of ${n}: keep going.`);
  setButtons();
}
function setButtons() {
  const live = run && run.phase === 'user';
  $('#pz-hint').disabled = !live || run.cur.hint;
  $('#pz-solution').disabled = !live;
  $('#pz-skip').disabled = !run || run.finished || run.phase === 'busy' && !run.revealing;
  $('#pz-skip').hidden = !!(run && run.finished);
  const nx = $('#pz-next'), ready = !!(run && run.finished && sess);
  nx.disabled = !ready; nx.classList.toggle('ready', ready);
  nx.textContent = sess && sess.index + 1 >= sess.queue.length ? 'Finish ▶' : 'Next puzzle ▶';
}

// ------------------------------------------------------------------ your moves
function onDrop(orig, dest) {
  if (!run || run.phase !== 'user') return;
  haptic('move');
  run.phase = 'busy';
  handleMove(orig, dest);
}
async function handleMove(from, to) {
  const r = run, token = r.token, g = r.game, p = r.p;
  const expected = p.moves[r.idx], ex = splitUci(expected);
  const piece = g.get(from);
  const lastRank = to[1] === '8' || to[1] === '1';
  const promo = piece && piece.type === 'p' && lastRank ? (ex.from === from && ex.to === to && ex.promotion ? ex.promotion : 'q') : undefined;
  const uci = from + to + (promo || '');
  const fenBefore = g.fen();
  const j = judgeMove(p, r.idx, fenBefore, uci);
  if (!j.ok) {
    // wrong: take the move back and let them try again
    let san = '';
    try { const t = new Chess(fenBefore); san = t.move({ from, to, promotion: promo }).san; } catch {}
    r.cur.wrong = true; r.wrongs++; r.moveTries++;
    haptic('wrong');
    breakTacticsStreak(); updateStats(); // a miss ends the fire streak right away
    r.phase = 'user';
    syncBoard({ lastMove: lastOf(g), drawable: { autoShapes: [] } });
    const extra = r.moveTries >= 2 ? ' Stuck? Use the hint (5 pts) or show the solution.' : ' Look for checks, captures and threats.';
    setFeedback('mistake', '✗', 'Not quite', `<b>${esc(san || 'That move')}</b> isn't the move. Take it back and try again.${extra} A correct move now scores ${movePoints({ wrong: true })} pts.`);
    setButtons();
    return;
  }
  const mv = g.move({ from, to, promotion: promo });
  const pts = movePoints(r.cur); r.points += pts;
  r.moveTries = 0;
  const finished = j.mate || r.idx === p.moves.length - 1 || g.isCheckmate();
  syncBoard({ lastMove: [mv.from, mv.to], drawable: { autoShapes: [] } });
  updateStats();
  if (finished) return finishSolved(mv);
  setFeedback('best', '✓', 'Correct!', `<b>${esc(mv.san)}</b> is the move${r.cur.hint ? ' (hint: this move scored ' + pts + ' pts)' : r.cur.wrong ? ' (' + pts + ' pts after a retry)' : ''}. The opponent replies…`);
  setButtons();
  await sleep(420);
  if (!run || run.token !== token) return;
  playOpponent(p.moves[r.idx + 1]);
  r.idx += 2;
  await sleep(300);
  if (!run || run.token !== token) return;
  startTurn();
}
const lastOf = (g) => { const h = g.history({ verbose: true }); const m = h[h.length - 1]; return m ? [m.from, m.to] : undefined; };

// ------------------------------------------------------------------ hint / solution / skip
$('#pz-hint').addEventListener('click', () => {
  if (!run || run.phase !== 'user' || run.cur.hint) return;
  const ex = splitUci(run.p.moves[run.idx]);
  run.cur.hint = true; run.hints++;
  cg.set({ drawable: { autoShapes: [{ orig: ex.from, dest: ex.to, brush: 'green' }] } });
  setFeedback('hint', '💡', 'Hint', `The arrow shows the move. This move will score just ${HINT_POINTS} points.`);
  setButtons();
});
$('#pz-solution').addEventListener('click', () => showSolution());
$('#pz-skip').addEventListener('click', () => skipPuzzle());
$('#pz-menu').addEventListener('click', () => leave());

async function showSolution() {
  const r = run; if (!r || r.phase !== 'user') return;
  const token = r.token, p = r.p;
  r.phase = 'busy'; r.revealed = true; r.revealing = true;
  const sans = [];
  setFeedback('hint', '👁', 'Solution', 'Watch the winning line…');
  setButtons();
  while (r.idx < p.moves.length) {
    const solverTurn = r.idx % 2 === 1;
    await sleep(520);
    if (!run || run.token !== token) return;
    const mv = r.game.move(splitUci(p.moves[r.idx]));
    sans.push(mv.san);
    if (!solverTurn && mv.captured) haptic('capture');
    syncBoard({ lastMove: [mv.from, mv.to], drawable: { autoShapes: [] } });
    r.idx++;
  }
  r.revealing = false; r.finished = true; r.phase = 'over'; sess.attempted++;
  const res = recordPuzzle({ openingId: p.openingId, id: p.id, trap: p.trap, setSize: (data[p.openingId] || []).length, kind: 'revealed', points: 0, max: maxPoints(p), wrongs: r.wrongs, hints: r.hints });
  updateStats();
  setFeedback('mistake', '👁', 'Solution shown', `The line was <b>${esc(sans.join(' '))}</b>.${lessonHtml(p)}<br>No points for this one${res.streak === 0 ? ', and your puzzle streak starts over' : ''}. You can try it again later.`);
  setButtons();
  openReview();
}
function skipPuzzle() {
  const r = run; if (!r || r.finished) return;
  const p = r.p;
  r.finished = true; r.phase = 'over'; sess.skipped++; sess.attempted++;
  recordPuzzle({ openingId: p.openingId, id: p.id, trap: p.trap, setSize: (data[p.openingId] || []).length, kind: 'skipped', points: 0, max: maxPoints(p), wrongs: r.wrongs, hints: r.hints });
  updateStats(); advance();
}

// ------------------------------------------------------------------ solved
function lessonHtml(p) {
  const th = themesOf(p);
  const out = [];
  if (p.trap) out.push(`<div class="pz-lesson"><b>🪤 ${esc(p.name)}</b> ${esc(p.note)}</div>`);
  if (!p.trap) out.push(`<div class="pz-src">Puzzle from <a href="https://lichess.org/training/${esc(p.id)}" target="_blank" rel="noopener">Lichess</a> (CC0), rated ${p.rating}</div>`);
  if (th.length) out.push(`<div class="pz-themes">${th.map((t) => `<span class="pz-theme" title="${esc(t.text)}">${esc(t.label)}</span>`).join('')}</div><div class="pz-lesson"><b>${esc(th[0].label)}:</b> ${esc(th[0].text)}</div>`);
  return out.join('');
}
function finishSolved(lastMv) {
  const r = run, p = r.p;
  r.finished = true; r.phase = 'over';
  const max = maxPoints(p);
  const setSize = (data[p.openingId] || []).length;
  const pz = { openingId: p.openingId, id: p.id, trap: p.trap, setSize, kind: 'solved', points: r.points, max, wrongs: r.wrongs, hints: r.hints };
  const res = recordPuzzle(pz);
  sess.solved++; sess.attempted++; if (r.wrongs === 0 && r.hints === 0) sess.hits++; sess.points += r.points; sess.xp += res.gained.total;
  haptic('celebrate');
  const flawless = r.wrongs === 0 && r.hints === 0;
  const chips = [`<span class="fchip"><i>Points</i><b>${r.points} / ${max}</b></span>`, `<span class="fchip"><i>XP</i><b>+${res.gained.total}${res.xpFactor < 1 ? ' (re-solve)' : ''}</b></span>`];
  if (res.streak >= 2) chips.push(`<span class="fchip"><i>Streak</i><b>🔥 ${res.streak}</b></span>`);
  if (res.tierUp) chips.push(`<span class="fchip"><i>Star</i><b>★ ${res.tierUp.to}</b></span>`);
  setFeedback('best', '🎯', flawless ? 'Solved — first try!' : 'Solved!', `<b>${esc(lastMv.san)}</b> finishes it.${lessonHtml(p)}`, chips);
  $('#pz-stars').innerHTML = sess.mode === 'mixed' ? '' : tacticStarsHtml(p.openingId, setSize);
  updateStats();
  setButtons();
  const o = openingOf(p.openingId);
  openReview();
  setTimeout(() => celebratePuzzle(res, { setSize, openingName: o ? o.name : '' }), 1100);
}
$('#pz-next').addEventListener('click', () => { if (run && run.finished && sess) advance(); });

function advance() {
  sess.index++;
  if (sess.index >= sess.queue.length) return roundOver();
  loadPuzzle();
}
function roundOver() {
  closeReview();
  run.token = Math.random(); run.phase = 'over';
  const n = sess.queue.length;
  const mixed = sess.mode === 'mixed';
  const o = openingOf(sess.openingId);
  const title = mixed ? 'Round complete' : `${o ? o.name : 'Set'} done`;
  setFeedback('done', '🏁', title, `You solved <b>${sess.solved}</b> of ${n} puzzles${sess.skipped ? ` (${sess.skipped} skipped)` : ''} for <b>${fmt(sess.points)}</b> points and <b>+${fmt(sess.xp)} XP</b>.${mixed ? '' : ' Unsolved puzzles come first next time.'}`, null, [
    { label: mixed ? 'Another round ▶' : 'Play this set again ▶', cls: 'primary', fn: () => startSet(sess.openingId) },
    { label: '☰ Tactics', fn: leave },
  ]);
  $('#pz-hint').disabled = true; $('#pz-solution').disabled = true; $('#pz-skip').hidden = true; $('#pz-next').disabled = true;
  cg.set({ movable: { color: undefined, dests: new Map() }, drawable: { autoShapes: [] } });
}
function leave() {
  closeReview();
  if (run) run.token = Math.random();
  run = null;
  openTactics();
}

// ------------------------------------------------------------------ review: step back through the finished puzzle
let rvMoves = [], rvFens = [];
const stepper = createStepper({
  bar: $('#pz-rv'), swipe: $('#pz-board'),
  onStep: (i) => {
    if (!run) return;
    const chess = new Chess(rvFens[i]); const mv = i > 0 ? rvMoves[i - 1] : null;
    cg.set({ fen: rvFens[i], turnColor: colorName(chess.turn()), check: chess.isCheck(), lastMove: mv ? [mv.from, mv.to] : undefined, movable: { color: undefined, dests: new Map() }, drawable: { autoShapes: [] } });
  },
  label: (i, n) => (i > 0 && rvMoves[i - 1] ? `${i} / ${n} · ${rvMoves[i - 1].san}` : `${i} / ${n}`),
});
function openReview() {
  if (!run) return;
  rvMoves = run.game.history({ verbose: true });
  const g = new Chess(run.p.fen); rvFens = [g.fen()];
  for (const m of rvMoves) { g.move(m.san); rvFens.push(g.fen()); }
  stepper.open(rvMoves.length, rvMoves.length);
}
function closeReview() { stepper.close(); }

// ------------------------------------------------------------------ panel UI
function setFeedback(state, badge, title, textHtml, chips, actions) {
  const f = $('#pz-feedback');
  f.className = 'card feedback state-' + state;
  $('#pz-fb-badge').textContent = badge;
  $('#pz-fb-title').textContent = title;
  $('#pz-fb-text').innerHTML = textHtml || '';
  $('#pz-fb-chips').innerHTML = (chips || []).join('');
  const a = $('#pz-fb-actions'); a.innerHTML = '';
  (actions || []).forEach((x) => { const b = el('button', 'btn ' + (x.cls || ''), x.label); b.addEventListener('click', x.fn); a.appendChild(b); });
}
let shownStreak = null;
function updateStats() {
  if (!run || !sess) return;
  $('#pz-score').textContent = run.points;
  $('#pz-score-sub').textContent = `/ ${maxPoints(run.p)} pts`;
  $('#pz-n').textContent = `${Math.min(sess.index + 1, sess.queue.length)} / ${sess.queue.length}`;
  $('#pz-rating').textContent = run.p.trap ? `~${run.p.rating}` : run.p.rating;
  $('#pz-pts').textContent = fmt(sess.points + run.points * (run.finished ? 0 : 1));
  // dock: fire streak (saved in the progress, so it carries over), best streak, session score
  const t = getProgress().tactics, n = t.streak, tier = streakTier(n);
  const pill = $('#pz-streak-pill');
  $('#pz-streak').textContent = n; $('#pz-best').textContent = `best ${t.bestStreak}`;
  pill.dataset.tier = tier;
  if (shownStreak !== null && n !== shownStreak) {
    const cls = n > shownStreak ? (tier > streakTier(shownStreak) ? 'level' : 'bump') : 'lost';
    pill.classList.remove('bump', 'level', 'lost'); void pill.offsetWidth; pill.classList.add(cls);
  }
  shownStreak = n;
  pill.setAttribute('aria-label', `Streak ${n}${tier ? ', on fire' : ''}. Best ${t.bestStreak}.`);
  const acc = accuracy(sess.hits, sess.attempted);
  $('#pz-sess-n').textContent = `${sess.hits}/${sess.attempted}`;
  $('#pz-sess-acc').textContent = acc == null ? 'first try' : `${acc}% first try`;
}

// ------------------------------------------------------------------ boot
function setSeg(seg, attr, value) { seg.querySelectorAll('button').forEach((x) => { const on = x.dataset[attr] === value; x.classList.toggle('active', on); x.setAttribute('aria-checked', on); }); }
export function initTactics(h) {
  host = h;
  const themeSeg = $('#tac-theme-seg');
  themeSeg.innerHTML = THEME_FILTERS.map((f) => `<button data-theme="${f.key}" role="radio">${f.label}</button>`).join('');
  if (!THEME_FILTERS.some((f) => f.key === themeKey)) themeKey = 'any';
  if (!['all', 'gambit', 'white', 'black'].includes(kind)) kind = 'all';
  const ratingSeg = $('#tac-rating-seg');
  ratingSeg.innerHTML = RATING_FILTERS.map((f) => `<button data-rating="${f.key}" role="radio">${f.label}</button>`).join('');
  setSeg(ratingSeg, 'rating', ratingKey);
  ratingSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setRating(b.dataset.rating); });
  setSeg(themeSeg, 'theme', themeKey); setSeg($('#tac-kind-seg'), 'kind', kind);
  themeSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; themeKey = b.dataset.theme; prefs.tacTheme = themeKey; savePrefs(); setSeg(themeSeg, 'theme', themeKey); renderHome(); });
  $('#tac-kind-seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.kind; prefs.tacKind = kind; savePrefs(); setSeg($('#tac-kind-seg'), 'kind', kind); renderHome(); });
  $('#tac-mixed').addEventListener('click', () => { if (!data && loadError) { openTactics(); return; } startSet('mixed'); });
  onProgressChange(() => { if (!$('#tactics').classList.contains('hidden')) renderHome(); });
}
