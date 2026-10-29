import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { OPENINGS } from './openings.js';
import { buildBook, bookMoves, pickBookMove, lineNameAt, posKey } from './book.js';
import { attachLift } from './lift.js';
import { EngineManager } from './engine.js';
import { openDemo, closeDemo, initDemo, demoState } from './demo.js';
import { openLearn, initLearn } from './learn.js';
import { positionNote } from './explain.js';
import { LORE } from './lore-text.js';
import { GRADES, centipawnLoss, gradeFromLoss, formatEval, uciToSan, summaryRating, capEval } from './grading.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- engine
const engine = new EngineManager({ stockfishUrl: new URL('vendor/stockfish/stockfish-19-lite-single.js', document.baseURI).href, depth: 13 });
const enginePill = $('#engine-pill');
const engineReady = engine.init().then((e) => {
  const sf = engine.isStockfish;
  enginePill.className = 'pill ' + (sf ? 'pill-ok' : 'pill-warn');
  enginePill.querySelector('span').textContent = sf ? 'Stockfish 19 ready' : 'Basic engine (serve over http for Stockfish)';
  enginePill.title = e.name + (engine.fallbackReason ? ' — ' + engine.fallbackReason : '');
  return e;
});

// ---------------------------------------------------------------- state
const prefs = (() => { try { return JSON.parse(localStorage.getItem('ot-prefs') || '{}'); } catch { return {}; } })();
const savePrefs = () => { try { localStorage.setItem('ot-prefs', JSON.stringify(prefs)); } catch {} };

let selectedId = prefs.opening || null;
let filter = prefs.filter || 'all';   // all | gambit | white | black
let colorChoice = prefs.color || 'white';
let session = null;   // current run
let cg = null;        // chessground api
let detachLift = null;

// ---------------------------------------------------------------- setup screen
const grid = $('#opening-grid');
function renderGrid() {
  grid.innerHTML = '';
  const pool = OPENINGS.filter(matchesFilter);
  const cards = [...pool, { id: 'random', name: 'Surprise me', eco: '', side: '', blurb: filter === 'gambit' ? 'A random gambit.' : 'A random opening from the library.', lines: [] }];
  $('#filter-count').textContent = `${pool.length} opening${pool.length === 1 ? '' : 's'} · ${pool.reduce((n, o) => n + o.lines.length, 0)} lines`;
  for (const o of cards) {
    const c = el('div', 'ocard' + (o.id === selectedId ? ' selected' : ''));
    c.dataset.id = o.id; c.setAttribute('role', 'option'); c.setAttribute('aria-selected', o.id === selectedId); c.tabIndex = 0;
    if (o.gambit) c.classList.add('gambit');
    const sideIcon = o.side === 'white' ? '<span class="chip w">White</span>' : o.side === 'black' ? '<span class="chip b">Black</span>' : '<span class="chip r">?</span>';
    const extras = o.lines.length && LORE[o.id]
      ? `<span class="oc-btns"><button type="button" class="mini" data-act="watch" aria-label="Watch ${esc(o.name)} first">▶ Watch</button><button type="button" class="mini" data-act="learn" aria-label="Learn more about ${esc(o.name)}">📖 Learn more</button></span>` : '';
    c.innerHTML = `<div class="oc-top"><span class="oc-eco">${esc(o.eco || 'Random')}${o.gambit ? ' · <b class="gtag">Gambit</b>' : ''}</span>${sideIcon}</div>
      <div class="oc-name">${esc(o.name)}</div><div class="oc-blurb">${esc(o.blurb)}</div>
      <div class="oc-foot"><span>${o.lines.length ? o.lines.length + ' lines' : 'Any opening'}</span>${extras}</div>`;
    const choose = () => {
      selectedId = o.id; prefs.opening = selectedId;
      // follow the opening's own side (unless "Random" is chosen) so e.g. the Englund trainer for Black starts as Black
      if (o.side && colorChoice !== 'random' && colorChoice !== o.side) setColor(o.side);
      savePrefs(); renderGrid(); updateStartBar();
    };
    c.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return choose();
      choose();
      if (b.dataset.act === 'watch') watchOpening(o); else openLearn(o, { onWatch: () => watchOpening(o) });
    });
    c.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); choose(); const again = grid.querySelector(`.ocard[data-id="${o.id}"]`); if (again) again.focus({ preventScroll: true }); } });
    c.addEventListener('dblclick', (e) => { if (!e.target.closest('button') && selectedId) startRun(); });
    grid.appendChild(c);
  }
}
function updateStartBar() {
  const btn = $('#start-btn'), lab = $('#start-label');
  const o = OPENINGS.find((x) => x.id === selectedId);
  btn.disabled = !selectedId;
  $('#watch-btn').disabled = !selectedId || selectedId === 'random';
  $('#watch-btn').title = selectedId === 'random' ? 'Pick a specific opening to watch it first' : 'Watch the opening played out with explanations before you drill it';
  const sideTxt = colorChoice === 'random' ? 'a random side' : colorChoice === 'white' ? 'White' : 'Black';
  lab.innerHTML = selectedId ? `<b>${esc(o ? o.name : 'Surprise me')}</b> · as ${sideTxt}` : 'Choose an opening';
}
function setColor(c) {
  colorChoice = c; prefs.color = colorChoice; savePrefs();
  $('#color-seg').querySelectorAll('button').forEach((x) => { const on = x.dataset.color === c; x.classList.toggle('active', on); x.setAttribute('aria-checked', on); });
  updateStartBar();
}
$('#color-seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setColor(b.dataset.color); });

function matchesFilter(o) {
  if (filter === 'gambit') return !!o.gambit;
  if (filter === 'white' || filter === 'black') return o.side === filter;
  return true;
}
$('#filter-seg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  filter = b.dataset.filter; prefs.filter = filter; savePrefs();
  $('#filter-seg').querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-checked', on); });
  renderGrid();
});
$('#start-btn').addEventListener('click', () => startRun());
$('#watch-btn').addEventListener('click', () => { const o = OPENINGS.find((x) => x.id === selectedId); if (o) watchOpening(o); });

// ---------------------------------------------------------------- "Watch it first" + "Learn more"
function watchOpening(o) {
  show('demo');
  openDemo(o, 0, true);
}
initDemo({
  practice: (o) => { selectedId = o.id; prefs.opening = o.id; savePrefs(); updateStartBar(); startRun(o); },
  learn: (o) => openLearn(o),
  back: () => { closeDemo(); show('setup'); renderGrid(); },
});
initLearn();
$('#learn-btn').addEventListener('click', () => {
  const s = session; if (!s) return;
  const note = positionNote(s.opening, s.game.history(), lineNameAt(s.book, s.game.fen()));
  openLearn(s.opening, { note });
});

function show(id) {
  for (const s of ['setup', 'train', 'demo']) $('#' + s).classList.toggle('hidden', s !== id);
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- board helpers
function destsOf(g) {
  const m = new Map();
  for (const mv of g.moves({ verbose: true })) { if (!m.has(mv.from)) m.set(mv.from, []); m.get(mv.from).push(mv.to); }
  return m;
}
const colorName = (c) => (c === 'w' ? 'white' : 'black');

function boardConfig(g, extra = {}) {
  const user = session.userColor;
  const myTurn = colorName(g.turn()) === user && session.phase === 'user';
  return {
    fen: g.fen(),
    turnColor: colorName(g.turn()),
    check: g.isCheck(),
    movable: { free: false, color: myTurn ? user : undefined, dests: myTurn ? destsOf(g) : new Map(), showDests: true, events: { after: onUserDrop } },
    ...extra,
  };
}
function syncBoard(extra = {}) { cg.set(boardConfig(session.game, extra)); }

function initBoard() {
  if (detachLift) { detachLift(); detachLift = null; }
  if (cg) cg.destroy();
  cg = Chessground($('#board'), {
    orientation: session.userColor,
    coordinates: true,
    animation: { enabled: true, duration: 240 },
    highlight: { lastMove: true, check: true },
    draggable: { showGhost: true, distance: 3, autoDistance: true },
    premovable: { enabled: false },
    drawable: { enabled: true, autoShapes: [] },
    selectable: { enabled: true },
  });
  detachLift = attachLift($('#board'), cg);
}
window.addEventListener('resize', () => cg && cg.redrawAll());

// ---------------------------------------------------------------- run lifecycle
function pickOpening() {
  if (selectedId === 'random') { const pool = OPENINGS.filter(matchesFilter); const p = pool.length ? pool : OPENINGS; return p[Math.floor(Math.random() * p.length)]; }
  return OPENINGS.find((o) => o.id === selectedId);
}

async function startRun(reuseOpening) {
  const opening = reuseOpening || pickOpening();
  if (!opening) return;
  closeDemo();
  const userColor = colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;
  session = {
    opening, book: buildBook(opening), userColor, game: new Chess(), phase: 'busy',
    records: [], points: 0, streak: 0, firstTry: 0, hintUsed: false, retries: 0,
    attempt: 0, pending: null, over: false, lastMove: null, history: [], token: Math.random(),
  };
  window.__trainer = session;
  show('train');
  $('#summary').classList.add('hidden');
  $('#opening-title').textContent = opening.name;
  setTags();
  $('#movelist').innerHTML = '';
  updateStats();
  setEvalBar(null);
  initBoard();
  syncBoard();
  setFeedback('idle', '…', 'Get ready', userColor === 'white' ? 'You play White. Make the first move!' : 'You play Black. The computer moves first.');
  $('#hint-btn').disabled = true;
  await engineReady;
  if (session.userColor === 'black') await computerMove();
  else beginUserTurn();
}

function setTags() {
  const u = session.userColor, c = u === 'white' ? 'black' : 'white';
  const top = $('#tag-top'), bot = $('#tag-bottom');
  top.querySelector('.tag-name').textContent = `Computer · ${c === 'white' ? 'White' : 'Black'}`; top.className = 'tag ' + c;
  bot.querySelector('.tag-name').textContent = `You · ${u === 'white' ? 'White' : 'Black'}`; bot.className = 'tag you ' + u;
}

function beginUserTurn() {
  const s = session;
  const g = s.game;
  if (!bookMoves(s.book, g.fen()).length) return finishRun('book-end');
  s.phase = 'user'; s.attempt = 0; s.hintUsed = false; s.pending = null;
  syncBoard({ drawable: { autoShapes: [] } });
  $('#hint-btn').disabled = false;
  const n = Math.floor(g.history().length / 2) + 1;
  setFeedback('idle', '▶', 'Your move', `Move ${n}: play the book move for ${s.userColor === 'white' ? 'White' : 'Black'}. Any of the opening's moves count — you choose the plan.`);
  // analyse the position in the background so grading is instant later
  const fen = g.fen(), token = s.token;
  engine.analyze(fen).then((r) => { if (session && session.token === token) setEvalBar(g.turn() === 'w' ? r.cp : -r.cp); });
}

async function computerMove() {
  const s = session; const token = s.token;
  s.phase = 'computer'; syncBoard();
  $('#hint-btn').disabled = true;
  setFeedback('idle', '…', 'Computer is replying', '');
  await sleep(450);
  if (!session || session.token !== token) return;
  const san = pickBookMove(s.book, s.game.fen());
  if (!san) return finishRun('book-end');
  const mv = s.game.move(san);
  pushHistory(mv, 'computer');
  syncBoard({ lastMove: [mv.from, mv.to] });
  s.lastMove = [mv.from, mv.to];
  addMoveToList(mv, 'computer');
  await sleep(250);
  beginUserTurn();
}

// ---------------------------------------------------------------- user moves
function onUserDrop(orig, dest) {
  const s = session; if (!s || s.phase !== 'user') return;
  s.phase = 'busy';
  handleUserMove(orig, dest);
}

async function handleUserMove(from, to) {
  const s = session, token = s.token, g = s.game;
  const fenBefore = g.fen();
  const piece = g.get(from);
  const promo = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
  let mv;
  try { mv = g.move({ from, to, promotion: promo }); } catch { syncBoard(); s.phase = 'user'; return; }
  const fenAfter = g.fen();
  g.undo(); // keep the game at the pre-move position until we've graded it
  s.attempt++;
  const bookSans = bookMoves(s.book, fenBefore);
  const isBook = bookSans.includes(mv.san);
  s.pending = { mv, fenBefore, fenAfter, bookSans };
  cg.set({ movable: { color: undefined, dests: new Map() }, drawable: { autoShapes: [] }, lastMove: [from, to] });
  $('#hint-btn').disabled = true;

  if (isBook) {
    // Book move: accept straight away. Grade is "Book" unless an earlier wrong attempt was made on this move.
    let grade = GRADES.book, loss = 0, ev = null;
    const first = s.firstAttempt && s.firstAttempt.ply === g.history().length ? s.firstAttempt : null;
    s.firstAttempt = null;
    await commitUserMove(mv, { grade: first ? first.grade : grade, loss: first ? first.loss : loss, retried: !!first, bookSans, expected: bookSans, firstMove: first ? first.san : null, hint: s.hintUsed, evalWhite: null });
    if (session.token !== token) return;
    return afterUserMoveCommitted();
  }

  // Not in book: ask the engine
  setFeedback('think', '⏳', 'Checking your move…', `<b>${esc(mv.san)}</b> isn't in this opening's book. Asking Stockfish…`);
  let before, after;
  try { [before, after] = await Promise.all([engine.analyze(fenBefore), engine.analyze(fenAfter)]); }
  catch (e) { console.error(e); before = { cp: 0, best: null }; after = { cp: 0, best: null }; }
  if (!session || session.token !== token) return;
  const uci = from + to + (promo || '');
  const loss = centipawnLoss(before.cp, after.cp);
  const isBest = before.best === uci;
  const grade = gradeFromLoss(loss, isBest);
  const whiteSign = g.turn() === 'w' ? 1 : -1; // g is at fenBefore, mover = g.turn()
  const evAfterWhite = -after.cp * whiteSign; // after: opponent to move, so mover POV = -after.cp
  const evBestWhite = before.cp * whiteSign;
  const bestSan = uciToSan(fenBefore, before.best);
  Object.assign(s.pending, { grade, loss, isBest, evAfterWhite, evBestWhite, bestSan });
  // record first attempt for this ply (retries don't improve the score)
  if (!s.firstAttempt || s.firstAttempt.ply !== g.history().length) s.firstAttempt = { ply: g.history().length, grade, loss, san: mv.san, evAfterWhite };
  setEvalBar(evAfterWhite);

  const expected = bookSans.join(', ');
  const lossTxt = loss <= 0 ? 'no loss' : `−${(loss / 100).toFixed(2)} pawns`;
  const tail = isBest
    ? `That's the engine's top move — just not part of this opening's book.`
    : `Engine's best was <b>${esc(bestSan)}</b> (${formatEval(evBestWhite)}); yours scores ${formatEval(evAfterWhite)} (${lossTxt}).`;
  const chips = [
    chip('Your move', mv.san), chip('Book', expected), chip('Eval after', formatEval(evAfterWhite)), chip('Engine best', bestSan),
  ];
  if (!engine.isStockfish) chips.push(chip('Engine', 'basic (approx.)'));
  const showKeep = ['best', 'excellent', 'good'].includes(grade.key);
  setFeedback(grade.key, grade.icon, `${grade.label} — but not book`, `<b>${esc(mv.san)}</b> is outside the line. ${tail}<br>Expected book move${bookSans.length > 1 ? 's' : ''}: <b>${esc(expected)}</b>.${s.opening.gambit ? '<span class="gnote">Gambit line: book moves always count as Book, even when they give up material. Only moves outside the book are engine-graded.</span>' : ''}`, chips, [
    { label: '↺ Retry', cls: 'primary', fn: retry },
    { label: 'Show book move & continue', fn: () => continueWithBook() },
    ...(showKeep ? [{ label: 'Keep my move (leave book)', cls: 'ghost', fn: () => keepMyMove() }] : []),
  ]);
  s.phase = 'decision';
  cg.set({ drawable: { autoShapes: [] } });
}

const chip = (k, v) => `<span class="fchip"><i>${esc(k)}</i><b>${esc(v)}</b></span>`;

function retry() {
  const s = session; if (s.phase !== 'decision') return;
  s.retries++;
  s.pending = null;
  s.phase = 'user';
  syncBoard({ lastMove: s.lastMove || undefined, drawable: { autoShapes: [] } });
  setFeedback('idle', '↺', 'Try again', 'Your move was taken back. Find a move from the opening.');
  $('#hint-btn').disabled = false;
}

async function continueWithBook() {
  const s = session; if (s.phase !== 'decision') return;
  const token = s.token;
  s.phase = 'busy';
  const p = s.pending;
  const g = s.game;
  const san = p.bookSans[Math.floor(Math.random() * p.bookSans.length)];
  const bmv = g.move(san); g.undo();
  // record the user's failed first attempt as this ply's result, then play the book move for them
  const first = s.firstAttempt;
  s.firstAttempt = null;
  await commitUserMove(bmv, { grade: first.grade, loss: first.loss, retried: true, bookSans: p.bookSans, expected: p.bookSans, firstMove: first.san, hint: s.hintUsed, revealed: true });
  if (session.token !== token) return;
  afterUserMoveCommitted();
}

function keepMyMove() {
  const s = session; if (s.phase !== 'decision') return;
  const p = s.pending; const first = s.firstAttempt; s.firstAttempt = null;
  s.phase = 'busy';
  commitUserMove(p.mv, { grade: first.grade, loss: first.loss, retried: s.attempt > 1, bookSans: p.bookSans, expected: p.bookSans, firstMove: null, hint: s.hintUsed, leftBook: true }).then(() => finishRun('left-book'));
}

async function commitUserMove(mv, info) {
  const s = session, g = s.game;
  const made = g.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
  pushHistory(made, 'user');
  s.lastMove = [made.from, made.to];
  let pts = info.grade.points;
  if (info.hint) pts = Math.min(pts, 50);
  s.points += pts;
  const clean = ['book', 'best', 'excellent', 'good'].includes(info.grade.key) && !info.retried && !info.hint;
  if (clean) { s.firstTry++; s.streak++; } else s.streak = 0;
  s.records.push({ san: made.san, ply: g.history().length, grade: info.grade, loss: info.loss, points: pts, retried: info.retried, firstMove: info.firstMove, hint: info.hint, revealed: info.revealed, leftBook: info.leftBook, expected: info.expected });
  s.pending = null;
  syncBoard({ lastMove: [made.from, made.to], drawable: { autoShapes: [] } });
  addMoveToList(made, 'user', info.grade);
  updateStats();
  if (info.grade.key === 'book' && !info.retried) {
    setFeedback('book', GRADES.book.icon, info.hint ? 'Book move (hint used)' : 'Book move!', `<b>${esc(made.san)}</b> is in the book.${info.hint ? ' Hint used: max 50 pts for this move.' : ''}`, null, null);
  } else if (info.revealed) {
    setFeedback(info.grade.key, info.grade.icon, 'Book move played', `The book move was <b>${esc(made.san)}</b>. This move scored <b>${esc(info.grade.label)}</b> (${pts} pts).`);
  } else if (info.retried) {
    setFeedback('book', GRADES.book.icon, 'Book move — corrected', `<b>${esc(made.san)}</b> is the book move. The move scored as your first try: <b>${esc(info.grade.label)}</b> (${pts} pts).`);
  }
  await sleep(380);
}

function afterUserMoveCommitted() {
  const s = session;
  if (!bookMoves(s.book, s.game.fen()).length) return finishRun('book-end');
  computerMove();
}

// ---------------------------------------------------------------- hint
$('#hint-btn').addEventListener('click', () => {
  const s = session; if (!s || s.phase !== 'user') return;
  const sans = bookMoves(s.book, s.game.fen());
  s.hintUsed = true;
  const shapes = sans.map((san, i) => { const g = new Chess(s.game.fen()); const m = g.move(san); return { orig: m.from, dest: m.to, brush: i === 0 ? 'green' : 'blue' }; });
  cg.set({ drawable: { autoShapes: shapes } });
  setFeedback('hint', '💡', 'Hint', `Book move${sans.length > 1 ? 's' : ''} here: <b>${esc(sans.join(', '))}</b> (arrow${sans.length > 1 ? 's' : ''} on the board). This move is capped at 50 points.`);
  $('#hint-btn').disabled = true;
});
$('#restart-btn').addEventListener('click', () => { if (session) startRun(selectedId === 'random' ? undefined : session.opening); });
$('#menu-btn').addEventListener('click', () => { if (session) session.token = Math.random(); show('setup'); });

// ---------------------------------------------------------------- side panel UI
function setFeedback(state, badge, title, textHtml, chips, actions) {
  const f = $('#feedback');
  f.className = 'card feedback state-' + state;
  $('#fb-badge').textContent = badge;
  $('#fb-title').textContent = title;
  $('#fb-text').innerHTML = textHtml || '';
  $('#fb-chips').innerHTML = (chips || []).join('');
  const a = $('#fb-actions'); a.innerHTML = '';
  (actions || []).forEach((x) => { const b = el('button', 'btn ' + (x.cls || ''), x.label); b.addEventListener('click', x.fn); a.appendChild(b); });
}

function pushHistory(mv, who) { session.history.push({ san: mv.san, who }); }

function addMoveToList(mv, who, grade) {
  const list = $('#movelist');
  const white = mv.color === 'w';
  const ply = session.game.history().length;
  const num = Math.ceil(ply / 2);
  let row;
  if (white) { row = el('div', 'mrow'); row.appendChild(el('span', 'mnum', num + '.')); list.appendChild(row); }
  else { row = list.lastElementChild; if (!row || row.querySelector('.m.black')) { row = el('div', 'mrow'); row.appendChild(el('span', 'mnum', num + '…')); row.appendChild(el('span', 'm white empty', '…')); list.appendChild(row); } }
  const cell = el('span', 'm ' + (white ? 'white' : 'black') + (who === 'user' ? ' you' : ''));
  cell.textContent = mv.san;
  if (grade) { const d = el('i', 'gd g-' + grade.key); d.title = grade.label; cell.appendChild(d); }
  if (!white) { const empty = row.querySelector('.m.empty'); if (empty) empty.replaceWith(cell); else row.appendChild(cell); } else row.appendChild(cell);
  list.scrollTop = list.scrollHeight;
}

function updateStats() {
  const s = session;
  $('#score-num').textContent = s.points;
  const n = s.records.length;
  $('#score-sub').textContent = n ? `${Math.round((s.points / (n * 100)) * 100)}% acc.` : 'pts';
  $('#st-moves').textContent = n;
  $('#st-first').textContent = s.firstTry;
  $('#st-streak').textContent = s.streak;
}

function setEvalBar(whiteCp) {
  const bar = $('#evalbar'); const fill = bar.querySelector('.fill'); const val = bar.querySelector('.val');
  if (whiteCp == null) { fill.style.height = '50%'; val.textContent = '0.0'; return; }
  const c = capEval(whiteCp);
  const pct = 50 + 50 * (2 / (1 + Math.exp(-0.004 * c)) - 1);
  const flip = session && session.userColor === 'black';
  bar.classList.toggle('flip', !!flip);
  fill.style.height = pct.toFixed(1) + '%';
  val.textContent = Math.abs(whiteCp) >= 9000 ? formatEval(whiteCp) : (whiteCp / 100 > 0 ? '+' : '') + (whiteCp / 100).toFixed(1);
}

// ---------------------------------------------------------------- finish + summary
function finishRun(reason) {
  const s = session; if (!s || s.over) return;
  s.over = true; s.phase = 'over';
  cg.set({ movable: { color: undefined, dests: new Map() }, drawable: { autoShapes: [] } });
  $('#hint-btn').disabled = true;
  const n = s.records.length;
  const max = n * 100;
  const pct = max ? Math.round((s.points / max) * 100) : 0;
  const lineName = lineNameAt(s.book, s.game.fen());
  const counts = {}; for (const k of Object.keys(GRADES)) counts[k] = 0;
  s.records.forEach((r) => counts[r.grade.key]++);

  $('#sum-eyebrow').textContent = reason === 'left-book' ? 'You left the book' : 'Line complete';
  $('#sum-title').textContent = s.opening.name;
  $('#sum-line').innerHTML = reason === 'left-book'
    ? `You deviated with a sound move after ${Math.ceil(s.game.history().length / 2)} moves.`
    : `Variation reached: <b>${esc(lineName || s.opening.name)}</b> · you played ${s.userColor === 'white' ? 'White' : 'Black'}`;
  $('#sum-points').textContent = s.points; $('#sum-max').textContent = max;
  $('#sum-pct').textContent = pct + '%';
  $('#sum-ring').style.setProperty('--p', pct);
  $('#sum-rating').textContent = n ? summaryRating(pct) : 'No moves played.';
  $('#sum-grades').innerHTML = Object.values(GRADES).map((g) => `<div class="gcell g-${g.key}"><b>${counts[g.key]}</b><span>${g.label}</span></div>`).join('');
  const retries = s.retries, hints = s.records.filter((r) => r.hint).length;
  const rows = s.records.map((r) => {
    const num = Math.ceil(r.ply / 2) + (r.ply % 2 ? '.' : '…');
    let note = '';
    if (r.firstMove) note = `first try <b>${esc(r.firstMove)}</b>`; if (r.revealed) note += ' · book shown';
    if (r.leftBook) note = 'left book';
    if (r.hint) note += (note ? ' · ' : '') + 'hint';
    return `<div class="srow"><span class="sn">${num}</span><span class="ss">${esc(r.san)}</span><span class="sg g-${r.grade.key}">${r.grade.label}</span><span class="sp">${r.points}</span><span class="sx">${note}</span></div>`;
  }).join('');
  $('#sum-moves').innerHTML = `<div class="sm-head">Your moves <span>${retries} retr${retries === 1 ? 'y' : 'ies'} · ${hints} hint${hints === 1 ? '' : 's'}</span></div>` + rows;
  setFeedback('done', '🏁', reason === 'left-book' ? 'Out of book' : 'Line complete', `Score <b>${s.points}</b> / ${max} (${pct}%).`);
  setTimeout(() => $('#summary').classList.remove('hidden'), 350);
}
$('#sum-again').addEventListener('click', () => startRun(selectedId === 'random' ? undefined : session.opening));
$('#sum-review').addEventListener('click', () => $('#summary').classList.add('hidden'));
$('#sum-menu').addEventListener('click', () => { $('#summary').classList.add('hidden'); show('setup'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#summary').classList.add('hidden'); });

// ---------------------------------------------------------------- boot
$('#color-seg').querySelectorAll('button').forEach((x) => { x.classList.toggle('active', x.dataset.color === colorChoice); });
if (selectedId && selectedId !== 'random' && !OPENINGS.find((o) => o.id === selectedId)) selectedId = null;
$('#filter-seg').querySelectorAll('button').forEach((x) => { x.classList.toggle('active', x.dataset.filter === filter); });
renderGrid(); updateStartBar();

// test/debug hook
window.__ot = { demoState, Chess, bookMoves, posKey, engine, getSession: () => session, getCg: () => cg };
