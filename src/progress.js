// Progression layer: XP, player levels, per-opening mastery stars and achievements. Pure logic (no DOM) so it can be
// unit-tested in node; the UI lives in progress-ui.js. The point/grading system is untouched: a finished run's points
// simply become XP. State is one small JSON blob in localStorage (no accounts).

import { rollDaily, bumpDaily, emptyDaily, sanitizeDaily } from './daily.js';

export const STORE_KEY = 'rt1500-progress';
export const VERSION = 1;

// ---- levels: a "road to 1500", rating-like ranks. xp = total XP needed to reach the level.
export const LEVELS = [
  { n: 1, name: 'Pawn Pusher', rating: 400, xp: 0, icon: '♟️' },
  { n: 2, name: 'Board Explorer', rating: 600, xp: 400, icon: '🧭' },
  { n: 3, name: 'Knight Hopper', rating: 800, xp: 1400, icon: '♞' },
  { n: 4, name: 'Bishop Scout', rating: 900, xp: 3000, icon: '♝' },
  { n: 5, name: 'Rook Roller', rating: 1000, xp: 5500, icon: '♜' },
  { n: 6, name: 'Tactics Tinkerer', rating: 1100, xp: 9000, icon: '🔧' },
  { n: 7, name: 'Gambit Apprentice', rating: 1200, xp: 13500, icon: '🎯' },
  { n: 8, name: 'Gambit Gambler', rating: 1300, xp: 19000, icon: '🎲' },
  { n: 9, name: "Queen's Challenger", rating: 1400, xp: 26000, icon: '♛' },
  { n: 10, name: 'Road Warrior', rating: 1450, xp: 34000, icon: '🛣️' },
  { n: 11, name: '1500 Club', rating: 1500, xp: 45000, icon: '👑' },
];
export const levelFor = (xp) => { let l = LEVELS[0]; for (const x of LEVELS) if (xp >= x.xp) l = x; return l; };
export function levelInfo(xp) {
  const cur = levelFor(xp); const next = LEVELS[cur.n] || null; // LEVELS[cur.n] is the level after cur (n is 1-based)
  const into = xp - cur.xp, span = next ? next.xp - cur.xp : 0;
  return { level: cur, next, into, span, toNext: next ? next.xp - xp : 0, pct: next ? Math.min(100, Math.round((into / span) * 100)) : 100, max: !next };
}

// ---- mastery: bronze / silver / gold stars per opening.
export const TIERS = ['none', 'bronze', 'silver', 'gold'];
export const TIER_LABEL = { none: 'Not started', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
export const TIER_RULE = {
  bronze: 'Finish a line with 70%+',
  silver: 'Two clean runs (90%+, no hints)',
  gold: 'Three clean runs incl. a perfect one, across different lines',
};
export const CLEAN_PCT = 90, BRONZE_PCT = 70;

const emptyOpening = () => ({ runs: 0, done: 0, clean: 0, perfect: 0, best: 0, vars: [], tier: 'none', last: '' });
export function tierOf(o, lineCount = 1) {
  if (!o) return 'none';
  const needVars = Math.min(2, Math.max(1, lineCount));
  if (o.clean >= 3 && o.perfect >= 1 && o.vars.length >= needVars) return 'gold';
  if (o.clean >= 2) return 'silver';
  if (o.best >= BRONZE_PCT && o.done >= 1) return 'bronze';
  return 'none';
}
export const tierRank = (t) => TIERS.indexOf(t);
export const starsOf = (t) => tierRank(t); // 0..3 filled stars

// ---- XP
export const STAR_BONUS = { bronze: 50, silver: 100, gold: 200 };
export const PERFECT_BONUS = 50, FIRST_OPENING_BONUS = 50;
/** Practising the same opening over and over earns less, so XP keeps rewarding variety. */
export const repeatFactor = (priorDone) => (priorDone < 5 ? 1 : priorDone < 15 ? 0.5 : 0.25);

// ---- achievements. Each check receives (state, ctx) AFTER the run has been folded into state.
// ctx = { run, opening, tier, tierUp, levelUp }
const count = (obj, fn) => Object.entries(obj).filter(([id, o]) => fn(o, id)).length;
export const ACHIEVEMENTS = [
  { id: 'first-line', icon: '🏁', name: 'First Steps', desc: 'Finish your first line', xp: 50, test: (s) => s.done >= 1 },
  { id: 'first-perfect', icon: '💯', name: 'Spotless', desc: 'Finish a line with 100%, no hints, no retries', xp: 100, test: (s) => s.perfect >= 1 },
  { id: 'first-gambit', icon: '♟', name: 'Gambit Debut', desc: 'Finish a line in any gambit', xp: 75, test: (s, c) => s.gambitDone >= 1 },
  { id: 'gambits-5', icon: '🎲', name: 'Gambit Collector', desc: 'Finish lines in 5 different gambits', xp: 150, test: (s, c, h) => h.gambitsTried(s) >= 5 },
  { id: 'gambits-15', icon: '🃏', name: 'Pawn Sacrificer', desc: 'Finish lines in 15 different gambits', xp: 300, test: (s, c, h) => h.gambitsTried(s) >= 15 },
  { id: 'streak-5', icon: '🔥', name: 'Warming Up', desc: '5 clean moves in a row in one run', xp: 50, test: (s) => s.bestStreak >= 5 },
  { id: 'streak-10', icon: '⚡', name: 'On Fire', desc: '10 clean moves in a row in one run', xp: 100, test: (s) => s.bestStreak >= 10 },
  { id: 'streak-15', icon: '🌋', name: 'Unstoppable', desc: '15 clean moves in a row in one run', xp: 200, test: (s) => s.bestStreak >= 15 },
  { id: 'both-sides', icon: '☯️', name: 'Both Sides', desc: 'Finish a line as White and as Black', xp: 75, test: (s) => s.colors.white >= 1 && s.colors.black >= 1 },
  { id: 'watcher', icon: '👀', name: 'Student of the Game', desc: 'Watch an opening before you play it', xp: 40, test: (s) => s.watched.length >= 1 },
  { id: 'comeback', icon: '💪', name: 'Never Give Up', desc: 'Finish a line after 3 or more retries', xp: 60, test: (s, c) => !!c.run && c.run.retries >= 3 },
  { id: 'first-star', icon: '🥉', name: 'Bronze Medal', desc: 'Earn your first mastery star', xp: 50, test: (s) => s.stars >= 1 },
  { id: 'first-gold', icon: '🥇', name: 'Golden Boy', desc: 'Earn gold on any opening', xp: 250, test: (s, c, h) => h.countTier(s, 'gold') >= 1 },
  { id: 'easy-3', icon: '🌱', name: 'Solid Foundations', desc: 'Earn a star in 3 beginner-friendly openings', xp: 100, test: (s, c, h) => h.easyStarred(s) >= 3 },
  { id: 'explorer-10', icon: '🗺️', name: 'Explorer', desc: 'Finish lines in 10 different openings', xp: 150, test: (s) => count(s.openings, (o) => o.done > 0) >= 10 },
  { id: 'explorer-25', icon: '🌍', name: 'Globetrotter', desc: 'Finish lines in 25 different openings', xp: 300, test: (s) => count(s.openings, (o) => o.done > 0) >= 25 },
  { id: 'perfect-5', icon: '🎯', name: 'Sharpshooter', desc: 'Finish 5 perfect lines', xp: 150, test: (s) => s.perfect >= 5 },
  { id: 'runs-25', icon: '🏋️', name: 'Grinder', desc: 'Finish 25 lines', xp: 150, test: (s) => s.done >= 25 },
  { id: 'days-3', icon: '📅', name: 'Habit Builder', desc: 'Train 3 days in a row', xp: 100, test: (s) => s.days.best >= 3 },
  { id: 'days-7', icon: '🗓️', name: 'Week Warrior', desc: 'Train 7 days in a row', xp: 250, test: (s) => s.days.best >= 7 },
  { id: 'level-5', icon: '♜', name: 'Halfway Up the Road', desc: 'Reach level 5', xp: 100, test: (s, c) => levelFor(s.xp).n >= 5 },
  // ---- Tactics (puzzles linked to your openings)
  { id: 'tac-first', icon: '🧩', name: 'Tactician', desc: 'Solve your first tactics puzzle', xp: 40, test: (s) => s.tactics.solved >= 1 },
  { id: 'tac-10', icon: '🔎', name: 'Eagle Eyes', desc: 'Solve 10 tactics puzzles', xp: 100, test: (s) => s.tactics.solved >= 10 },
  { id: 'tac-50', icon: '🦅', name: 'Tactics Machine', desc: 'Solve 50 tactics puzzles', xp: 250, test: (s) => s.tactics.solved >= 50 },
  { id: 'tac-streak-5', icon: '🎯', name: 'Sharp Shot', desc: '5 puzzles in a row on the first try, no hints', xp: 75, test: (s) => s.tactics.bestStreak >= 5 },
  { id: 'tac-streak-10', icon: '🧨', name: 'Combo Streak', desc: '10 puzzles in a row on the first try, no hints', xp: 150, test: (s) => s.tactics.bestStreak >= 10 },
  { id: 'tac-trap', icon: '🪤', name: 'Trap Spotter', desc: 'Solve a famous opening trap', xp: 60, test: (s) => s.tactics.traps.length >= 1 },
  { id: 'tac-mixed', icon: '🌐', name: 'Well Rounded', desc: 'Solve puzzles from 5 different openings', xp: 100, test: (s, c, h) => h.tacticSets(s) >= 5 },
  { id: 'tac-star', icon: '⭐', name: 'Tactics Star', desc: 'Earn a mastery star on an opening tactics set', xp: 75, test: (s) => s.tactics.stars >= 1 },
];
export const achievementById = (id) => ACHIEVEMENTS.find((a) => a.id === id);

export function freshState() {
  return { v: VERSION, xp: 0, done: 0, perfect: 0, gambitDone: 0, bestStreak: 0, stars: 0, colors: { white: 0, black: 0 }, days: { last: '', streak: 0, best: 0 }, watched: [], openings: {}, ach: {}, created: '', tactics: freshTactics(), daily: emptyDaily() };
}
export const freshTactics = () => ({ solved: 0, flawless: 0, streak: 0, bestStreak: 0, stars: 0, traps: [], sets: {} });
/** Accept whatever is in storage; fix up anything missing or malformed. */
export function sanitize(raw) {
  const s = freshState();
  if (!raw || typeof raw !== 'object') return s;
  const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  s.xp = num(raw.xp); s.done = num(raw.done); s.perfect = num(raw.perfect); s.gambitDone = num(raw.gambitDone); s.bestStreak = num(raw.bestStreak); s.stars = num(raw.stars);
  if (raw.colors) { s.colors.white = num(raw.colors.white); s.colors.black = num(raw.colors.black); }
  if (raw.days) { s.days.last = typeof raw.days.last === 'string' ? raw.days.last : ''; s.days.streak = num(raw.days.streak); s.days.best = num(raw.days.best); }
  if (Array.isArray(raw.watched)) s.watched = raw.watched.filter((x) => typeof x === 'string');
  if (raw.openings && typeof raw.openings === 'object') {
    for (const [id, o] of Object.entries(raw.openings)) {
      if (!o || typeof o !== 'object') continue;
      s.openings[id] = { runs: num(o.runs), done: num(o.done), clean: num(o.clean), perfect: num(o.perfect), best: Math.min(100, num(o.best)), vars: Array.isArray(o.vars) ? o.vars.filter((x) => typeof x === 'string').slice(0, 40) : [], tier: TIERS.includes(o.tier) ? o.tier : 'none', last: typeof o.last === 'string' ? o.last : '' };
    }
  }
  if (raw.ach && typeof raw.ach === 'object') for (const [id, t] of Object.entries(raw.ach)) if (achievementById(id)) s.ach[id] = typeof t === 'string' ? t : '';
  s.created = typeof raw.created === 'string' ? raw.created : '';
  s.daily = sanitizeDaily(raw.daily);
  const rt = raw.tactics;
  if (rt && typeof rt === 'object') {
    const strs = (a, cap) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string'))].slice(0, cap) : []);
    const t = s.tactics;
    t.solved = num(rt.solved); t.flawless = num(rt.flawless); t.streak = num(rt.streak); t.bestStreak = num(rt.bestStreak); t.traps = strs(rt.traps, 100);
    if (rt.sets && typeof rt.sets === 'object') for (const [id, r] of Object.entries(rt.sets)) {
      if (!r || typeof r !== 'object') continue;
      t.sets[id] = { solved: strs(r.solved, 400), flawless: strs(r.flawless, 400), tier: TIERS.includes(r.tier) ? r.tier : 'none' };
    }
    t.stars = count(t.sets, (x) => x.tier !== 'none');
  }
  return s;
}

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);

/** Unlock every achievement whose test now passes (their XP can unlock more, so loop until stable). Mutates s. */
function awardAchievements(s, ctx, ctxExtra, today) {
  const helpers = {
    gambitsTried: (st) => count(st.openings, (x, id) => x.done > 0 && (ctxExtra.gambitIds || []).includes(id)),
    countTier: (st, tier) => count(st.openings, (x) => x.tier === tier),
    easyStarred: (st) => count(st.openings, (x, id) => x.tier !== 'none' && (ctxExtra.easyIds || []).includes(id)),
    tacticSets: (st) => count(st.tactics.sets, (x) => x.solved.length > 0),
  };
  const out = { ids: [], xp: 0 };
  for (let guard = 0; guard < 5; guard++) {
    let any = false;
    for (const a of ACHIEVEMENTS) {
      if (s.ach[a.id] !== undefined) continue;
      let ok = false; try { ok = !!a.test(s, ctx, helpers); } catch { ok = false; }
      if (ok) { s.ach[a.id] = today; s.xp += a.xp; out.xp += a.xp; out.ids.push(a.id); any = true; }
    }
    if (!any) break;
  }
  return out;
}
/** Count today as a training day (consecutive-day streak). Mutates s. */
/** Daily quests: only active when the caller passes ctxExtra.otdId (the Opening of the Day). Mutates s, returns { xp, done:[quest kinds] }. */
function dailyStep(s, ev, ctxExtra, today) {
  if (!ctxExtra.otdId) return { xp: 0, done: [] };
  s.daily = rollDaily(s.daily, today, ctxExtra.otdId);
  const r = bumpDaily(s.daily, ev); s.daily = r.daily;
  const xp = r.completed.reduce((n, q) => n + q.xp, 0); s.xp += xp;
  return { xp, done: r.completed.map((q) => q.kind) };
}

function touchDay(s, today) {
  if (s.days.last !== today) {
    s.days.streak = s.days.last && dayDiff(s.days.last, today) === 1 ? s.days.streak + 1 : 1;
    s.days.last = today; s.days.best = Math.max(s.days.best, s.days.streak);
  }
}

/**
 * Fold a finished run into the state. Pure: returns { state, result } and never touches storage.
 * run = { openingId, gambit, lineCount, side:'white'|'black', moves, points, pct, hints, retries, perfect, maxStreak, variation, completed }
 *   completed = reached the end of the book (a run that "left book" still earns XP but not mastery).
 * ctxExtra.easyIds = ids of beginner-friendly openings (for the "Solid Foundations" badge), ctxExtra.gambitIds
 */
export function applyRun(prev, run, ctxExtra = {}, now = new Date()) {
  const s = JSON.parse(JSON.stringify(prev));
  const before = { xp: s.xp, level: levelFor(s.xp), tier: (s.openings[run.openingId] || {}).tier || 'none' };
  const today = dayKey(now);
  if (run.moves >= 1 && !s.created) s.created = today;
  const gained = { base: 0, perfect: 0, first: 0, star: 0, ach: 0, quest: 0, total: 0 };
  const result = { gained, newAch: [], newQuests: [], tierUp: null, levelUp: null, before, after: null, counted: false, xpFactor: 1 };
  if (run.moves < 1) { result.after = before; return { state: prev, result }; } // nothing was played: nothing changes
  result.counted = true;
  const o = s.openings[run.openingId] || (s.openings[run.openingId] = emptyOpening());
  const priorDone = o.done;

  // base XP = the run's grading points, scaled down for heavy repetition
  result.xpFactor = repeatFactor(priorDone);
  gained.base = Math.round(run.points * result.xpFactor);
  o.runs++; o.last = today;
  s.bestStreak = Math.max(s.bestStreak, run.maxStreak || 0);
  // training days (consecutive-day streak)
  touchDay(s, today);
  if (run.completed) {
    o.done++; s.done++; s.colors[run.side] = (s.colors[run.side] || 0) + 1;
    if (run.gambit) s.gambitDone++;
    o.best = Math.max(o.best, run.pct);
    if (run.variation && !o.vars.includes(run.variation)) o.vars.push(run.variation);
    const clean = run.pct >= CLEAN_PCT && run.hints === 0;
    if (clean) o.clean++;
    if (run.perfect) { o.perfect++; s.perfect++; gained.perfect = PERFECT_BONUS; }
    if (priorDone === 0) gained.first = FIRST_OPENING_BONUS;
    const t = tierOf(o, run.lineCount);
    if (tierRank(t) > tierRank(o.tier)) {
      // award every tier crossed (e.g. jumping straight to silver pays bronze too)
      for (let r = tierRank(o.tier) + 1; r <= tierRank(t); r++) gained.star += STAR_BONUS[TIERS[r]];
      result.tierUp = { from: o.tier, to: t }; o.tier = t; s.stars = count(s.openings, (x) => x.tier !== 'none');
    }
  }
  s.xp += gained.base + gained.perfect + gained.first + gained.star;
  const dq = dailyStep(s, { type: 'run', openingId: run.openingId, gambit: run.gambit, side: run.side, pct: run.pct, hints: run.hints, completed: !!run.completed }, ctxExtra, today);
  gained.quest = dq.xp; result.newQuests = dq.done;

  // achievements (may award extra XP, which can in turn unlock more - loop until stable)
  const ach = awardAchievements(s, { run, opening: run.openingId, tierUp: result.tierUp }, ctxExtra, today);
  gained.ach = ach.xp; result.newAch = ach.ids;
  gained.total = gained.base + gained.perfect + gained.first + gained.star + gained.ach + gained.quest;
  const after = levelFor(s.xp);
  if (after.n > before.level.n) result.levelUp = { from: before.level, to: after };
  result.after = { xp: s.xp, level: after, tier: o.tier };
  return { state: s, result };
}

/** Marks an opening as watched (for the "Student of the Game" badge). Returns { state, newAch } */
export function applyWatch(prev, openingId, ctxExtra = {}, now = new Date()) {
  const s = JSON.parse(JSON.stringify(prev));
  const result = { newAch: [], newQuests: [], levelUp: null, gained: 0 };
  const beforeLevel = levelFor(s.xp);
  const dq = dailyStep(s, { type: 'watch' }, ctxExtra, dayKey(now)); result.gained += dq.xp; result.newQuests = dq.done; // watching counts for the daily quest every time
  if (s.watched.includes(openingId)) { const after0 = levelFor(s.xp); if (after0.n > beforeLevel.n) result.levelUp = { from: beforeLevel, to: after0 }; return { state: s, result }; }
  s.watched.push(openingId);
  const a = achievementById('watcher');
  if (a && s.ach[a.id] === undefined && a.test(s, {}, {})) { s.ach[a.id] = dayKey(now); s.xp += a.xp; result.gained += a.xp; result.newAch.push(a.id); }
  const after = levelFor(s.xp);
  if (after.n > beforeLevel.n) result.levelUp = { from: beforeLevel, to: after };
  return { state: s, result };
}

// ---- tactics: puzzles linked to each opening. One mastery tier per opening's tactics set, scaled to the set's size.
export const tacticTierOf = (rec, n) => {
  if (!rec || !n) return 'none';
  const sv = rec.solved.length, fl = rec.flawless.length;
  if (sv >= n && fl >= Math.ceil(n * 0.6)) return 'gold';
  if (sv >= Math.ceil(n * 0.6) && fl >= Math.ceil(n * 0.3)) return 'silver';
  if (sv >= Math.max(1, Math.min(5, Math.ceil(n / 2)))) return 'bronze';
  return 'none';
};
export const tacticRules = (n) => ({
  bronze: `Solve ${Math.max(1, Math.min(5, Math.ceil(n / 2)))} puzzle${Math.max(1, Math.min(5, Math.ceil(n / 2))) === 1 ? '' : 's'} in this set`,
  silver: `Solve ${Math.ceil(n * 0.6)} of ${n}, ${Math.ceil(n * 0.3)} of them first try with no hint`,
  gold: `Solve all ${n}, ${Math.ceil(n * 0.6)} of them first try with no hint`,
});
export const REPEAT_PUZZLE_FACTOR = 0.2;
/**
 * Fold one finished puzzle into the state. Pure. pz = { openingId, id, trap, setSize, kind: 'solved'|'revealed'|'skipped',
 *   points, max, wrongs, hints }. Only 'solved' earns XP / progress; 'revealed' and 'skipped' just break the streak.
 * First solve of a puzzle pays its points as XP; re-solving pays 20% (so the XP keeps rewarding new puzzles).
 */
export function applyPuzzle(prev, pz, ctxExtra = {}, now = new Date()) {
  const s = JSON.parse(JSON.stringify(prev));
  const t = s.tactics;
  const before = { xp: s.xp, level: levelFor(s.xp), tier: (t.sets[pz.openingId] || {}).tier || 'none' };
  const result = { counted: false, kind: pz.kind, gained: { base: 0, star: 0, ach: 0, quest: 0, total: 0 }, newAch: [], newQuests: [], tierUp: null, levelUp: null, before, after: before, first: false, flawless: false, streak: t.streak, xpFactor: 1 };
  if (pz.kind !== 'solved') {
    if (t.streak === 0) return { state: prev, result };
    t.streak = 0; result.streak = 0; return { state: s, result };
  }
  const today = dayKey(now);
  if (!s.created) s.created = today;
  result.counted = true;
  const rec = t.sets[pz.openingId] || (t.sets[pz.openingId] = { solved: [], flawless: [], tier: 'none' });
  const first = !rec.solved.includes(pz.id);
  const flawless = pz.wrongs === 0 && pz.hints === 0;
  result.first = first; result.flawless = flawless; result.xpFactor = first ? 1 : REPEAT_PUZZLE_FACTOR;
  result.gained.base = Math.round(pz.points * result.xpFactor);
  if (first) { rec.solved.push(pz.id); t.solved++; if (pz.trap && !t.traps.includes(pz.id)) t.traps.push(pz.id); }
  if (flawless && !rec.flawless.includes(pz.id)) { rec.flawless.push(pz.id); t.flawless++; }
  if (flawless) { t.streak++; t.bestStreak = Math.max(t.bestStreak, t.streak); } else t.streak = 0;
  result.streak = t.streak;
  touchDay(s, today);
  const tier = tacticTierOf(rec, pz.setSize);
  if (tierRank(tier) > tierRank(rec.tier)) {
    for (let r = tierRank(rec.tier) + 1; r <= tierRank(tier); r++) result.gained.star += STAR_BONUS[TIERS[r]];
    result.tierUp = { from: rec.tier, to: tier }; rec.tier = tier; t.stars = count(t.sets, (x) => x.tier !== 'none');
  }
  s.xp += result.gained.base + result.gained.star;
  const dq = dailyStep(s, { type: 'puzzle' }, ctxExtra, today); result.gained.quest = dq.xp; result.newQuests = dq.done;
  const ach = awardAchievements(s, { puzzle: pz, opening: pz.openingId, tierUp: result.tierUp }, ctxExtra, today);
  result.gained.ach = ach.xp; result.newAch = ach.ids;
  result.gained.total = result.gained.base + result.gained.star + result.gained.ach + result.gained.quest;
  const after = levelFor(s.xp);
  if (after.n > before.level.n) result.levelUp = { from: before.level, to: after };
  result.after = { xp: s.xp, level: after, tier: rec.tier };
  return { state: s, result };
}

// ---- storage wrapper (injectable for tests)
export function loadState(storage) {
  try { const raw = storage.getItem(STORE_KEY); return raw ? sanitize(JSON.parse(raw)) : freshState(); } catch { return freshState(); }
}
export function saveState(storage, s) { try { storage.setItem(STORE_KEY, JSON.stringify(s)); return true; } catch { return false; } }

/** Next-up suggestions for the "Start here" strip: unstarted openings first, easiest first, gambits preferred. */
export function recommend(state, openings, easeOf, n = 3, isRisky = () => false) {
  const pool = openings.filter((o) => easeOf(o.id) && (state.openings[o.id] || {}).tier !== 'gold');
  const score = (o) => easeOf(o.id).score + (isRisky(o.id) ? 1.5 : 0); // joke gambits that are unsound at every level go to the back
  const started = (o) => ((state.openings[o.id] || {}).tier || 'none') !== 'none';
  const tryTier = (key) => pool.filter((o) => easeOf(o.id).ease === key && !started(o)).sort((a, b) => (b.gambit ? 1 : 0) - (a.gambit ? 1 : 0) || score(a) - score(b));
  for (const key of ['easy', 'medium', 'hard']) { const l = tryTier(key); if (l.length) return { key, list: l.slice(0, n) }; }
  return { key: 'done', list: [] };
}
