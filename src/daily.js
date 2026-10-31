// Opening of the Day + three daily quests. Pure functions only (no DOM, no storage): progress.js folds the events in and saves
// the result under the existing `rt1500-progress` localStorage key (state.daily). Everything is derived from the local date, so
// the same day always shows the same opening and the same three quests, on every device, with no server.
export function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

/** Deterministic pick of the day from a list of opening ids (sorted first so the order of the library never changes the answer). */
export function openingOfTheDay(ids, day) {
  const list = [...ids].sort();
  return list.length ? list[hashStr('otd:' + day) % list.length] : '';
}

// kind -> { goal, xp, text(openingName), counts(ev, daily) }  - the third quest of the day rotates through the "extra" kinds
const done = (ev) => ev.type === 'run' && ev.completed;
export const QUEST_KINDS = {
  otd: { goal: 1, xp: 40, text: (n) => `Finish a line of today's opening${n ? `: ${n}` : ''}`, counts: (ev, d) => done(ev) && ev.openingId === d.otd },
  puzzles: { goal: 3, xp: 30, text: () => 'Solve 3 tactics puzzles', counts: (ev) => ev.type === 'puzzle' },
  lines: { goal: 2, xp: 30, text: () => 'Finish 2 lines of any opening', counts: (ev) => done(ev) },
  clean: { goal: 1, xp: 40, text: () => 'Finish a line with 90%+ and no hints', counts: (ev) => done(ev) && ev.pct >= 90 && ev.hints === 0 },
  watch: { goal: 1, xp: 20, text: () => 'Watch an opening first, then play it', counts: (ev) => ev.type === 'watch' },
  gambit: { goal: 1, xp: 30, text: () => 'Finish a gambit line', counts: (ev) => done(ev) && !!ev.gambit },
  white: { goal: 1, xp: 25, text: () => 'Finish a line as White', counts: (ev) => done(ev) && ev.side === 'white' },
  black: { goal: 1, xp: 25, text: () => 'Finish a line as Black', counts: (ev) => done(ev) && ev.side === 'black' },
};
const EXTRA_KINDS = ['lines', 'clean', 'watch', 'gambit', 'white', 'black'];

export const emptyDaily = () => ({ day: '', otd: '', kinds: [], prog: {}, done: {} });

/** The three quest kinds for a date: today's opening, tactics, and one rotating extra. */
export const questKindsFor = (day) => ['otd', 'puzzles', EXTRA_KINDS[hashStr('quest:' + day) % EXTRA_KINDS.length]];

/** Start a fresh day if the stored one is not today (otherwise return it unchanged). */
export function rollDaily(daily, day, otdId) {
  if (daily && daily.day === day && daily.otd === otdId) return daily;
  if (daily && daily.day === day) return { ...daily, otd: otdId };
  return { day, otd: otdId, kinds: questKindsFor(day), prog: {}, done: {} };
}

/** Fold one event ({type:'run'|'puzzle'|'watch', ...}) into the day. Returns { daily, completed:[{kind,xp}] } and never mutates. */
export function bumpDaily(daily, ev) {
  const d = { ...daily, prog: { ...daily.prog }, done: { ...daily.done } };
  const completed = [];
  for (const k of d.kinds) {
    const q = QUEST_KINDS[k]; if (!q || d.done[k] || !q.counts(ev, d)) continue;
    d.prog[k] = Math.min(q.goal, (d.prog[k] || 0) + 1);
    if (d.prog[k] >= q.goal) { d.done[k] = true; completed.push({ kind: k, xp: q.xp }); }
  }
  return { daily: d, completed };
}

/** View model for the UI. */
export function questList(daily, nameOf = () => '') {
  return daily.kinds.map((k) => { const q = QUEST_KINDS[k]; return { kind: k, text: q.text(nameOf(daily.otd)), goal: q.goal, n: daily.prog[k] || 0, xp: q.xp, done: !!daily.done[k] }; });
}

export function sanitizeDaily(raw) {
  const d = emptyDaily();
  if (!raw || typeof raw !== 'object') return d;
  d.day = typeof raw.day === 'string' ? raw.day : ''; d.otd = typeof raw.otd === 'string' ? raw.otd : '';
  d.kinds = Array.isArray(raw.kinds) ? raw.kinds.filter((k) => QUEST_KINDS[k]).slice(0, 3) : [];
  for (const k of d.kinds) {
    const n = raw.prog && Number.isFinite(raw.prog[k]) ? Math.max(0, Math.min(QUEST_KINDS[k].goal, Math.floor(raw.prog[k]))) : 0;
    d.prog[k] = n; if (raw.done && raw.done[k] && n >= QUEST_KINDS[k].goal) d.done[k] = true;
  }
  return d;
}
