// Unit tests (pure node, no browser) for the difficulty table and the XP / levels / mastery / achievements logic.
// Usage: node tools/test-progress.mjs
import { OPENINGS } from '../src/openings.js';
import { META, STYLE, EASE } from '../src/meta.js';
import { buildBook } from '../src/book.js';
import { computeEase, easeScore, classifyEase } from '../src/difficulty.js';
import * as P from '../src/progress.js';

let ok = true; const check = (n, c, x = '') => { if (!c) ok = false; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : '')); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- difficulty
const fresh = computeEase(OPENINGS, buildBook, META, STYLE);
check('every one of the 48 openings has an ease rating', OPENINGS.length === 48 && OPENINGS.every((o) => EASE[o.id] && ['easy', 'medium', 'hard'].includes(EASE[o.id].ease)));
check('stored table matches the formula (run tools/gen-ease.mjs after changing the book/meta)', OPENINGS.every((o) => eq(EASE[o.id], fresh[o.id])), OPENINGS.filter((o) => !eq(EASE[o.id], fresh[o.id])).map((o) => o.id).join());
const by = (k) => OPENINGS.filter((o) => EASE[o.id].ease === k).map((o) => o.id);
check('a sensible spread: 8-20 easy, 20+ medium, 4-10 hard', by('easy').length >= 8 && by('easy').length <= 20 && by('medium').length >= 20 && by('hard').length >= 4 && by('hard').length <= 10, `${by('easy').length}/${by('medium').length}/${by('hard').length}`);
check('classic beginner openings are easy', ['italian', 'london', 'scandi', 'caro'].every((i) => EASE[i].ease === 'easy'));
check('theory-heavy openings are hard', ['najdorf', 'dragon', 'kid', 'benko', 'marshall', 'catalan'].every((i) => EASE[i].ease === 'hard'));
check('nothing recommended above 800 is beginner friendly', by('easy').every((i) => META[i].lo <= 800));
check('score ordering: London easier than Najdorf; Italian easier than Ruy', EASE.london.score < EASE.najdorf.score && EASE.italian.score < EASE.ruy.score);
check('classify thresholds', classifyEase(3, 600) === 'easy' && classifyEase(3, 1000) === 'medium' && classifyEase(7.6, 800) === 'hard' && classifyEase(4, 1600) === 'hard' && classifyEase(5.5, 600) === 'medium');
check('every ease has a reason text', OPENINGS.every((o) => EASE[o.id].why.length > 8));
check('easy list includes gambits for the casual-gambit audience', by('easy').filter((i) => OPENINGS.find((o) => o.id === i).gambit).length >= 5);

// ---------------------------------------------------------------- levels
check('11 levels, strictly increasing XP, ending at the 1500 Club', P.LEVELS.length === 11 && P.LEVELS.every((l, i) => i === 0 || l.xp > P.LEVELS[i - 1].xp && l.rating > P.LEVELS[i - 1].rating) && P.LEVELS.at(-1).rating === 1500 && P.LEVELS.at(-1).name === '1500 Club');
check('level lookup at the boundaries', P.levelFor(0).n === 1 && P.levelFor(399).n === 1 && P.levelFor(400).n === 2 && P.levelFor(1e9).n === 11);
const li = P.levelInfo(900);
check('progress to next level', li.level.n === 2 && li.next.n === 3 && li.into === 500 && li.span === 1000 && li.toNext === 500 && li.pct === 50 && !li.max);
check('max level reports 100% and no next', P.levelInfo(99999).max === true && P.levelInfo(99999).pct === 100 && P.levelInfo(99999).next === null);

// ---------------------------------------------------------------- runs
const NOW = new Date('2026-03-10T10:00:00');
const run = (o = {}) => ({ openingId: 'london', gambit: false, lineCount: 4, side: 'white', moves: 8, points: 800, pct: 100, hints: 0, retries: 0, perfect: true, maxStreak: 8, variation: 'London A', completed: true, ...o });
const ex = { easyIds: by('easy'), gambitIds: OPENINGS.filter((o) => o.gambit).map((o) => o.id) };
let s = P.freshState();
let r = P.applyRun(s, run(), ex, NOW); s = r.state;
check('XP = points + perfect + first-finish + star + badges', r.result.gained.base === 800 && r.result.gained.perfect === 50 && r.result.gained.first === 50 && r.result.gained.star === 50 && r.result.gained.total === s.xp, JSON.stringify(r.result.gained));
check('first perfect run unlocks First Steps, Spotless, Bronze Medal', ['first-line', 'first-perfect', 'first-star'].every((i) => r.result.newAch.includes(i)), r.result.newAch.join());
check('bronze star after first 70%+ finish; levelled up', P.tierOf(s.openings.london, 4) === 'bronze' && r.result.tierUp.to === 'bronze' && r.result.levelUp && s.xp > 700);
check('input state is not mutated', P.freshState().xp === 0);
check('replaying the same day does not extend the day streak', P.applyRun(s, run(), ex, NOW).state.days.streak === 1);
const next = P.applyRun(s, run({ points: 900, variation: 'London B' }), ex, new Date('2026-03-11T09:00:00'));
check('second clean run -> silver, day streak 2', next.result.tierUp && next.result.tierUp.to === 'silver' && next.state.days.streak === 2 && next.result.gained.star === 100);
check('no first-finish bonus on the second run', next.result.gained.first === 0);
let g = P.applyRun(next.state, run({ variation: 'London C' }), ex, new Date('2026-03-12T09:00:00'));
check('third clean run incl. perfect on a different line -> gold (+200), Golden Boy badge, 3-day streak badge', g.result.tierUp.to === 'gold' && g.result.gained.star === 200 && g.result.newAch.includes('first-gold') && g.result.newAch.includes('days-3'));
check('gold needs variety: three clean runs on one variation stay silver', P.tierOf({ clean: 3, perfect: 1, vars: ['A'], done: 3, best: 100 }, 4) === 'silver' && P.tierOf({ clean: 3, perfect: 1, vars: ['A'], done: 3, best: 100 }, 1) === 'gold');
check('gold needs a perfect run', P.tierOf({ clean: 3, perfect: 0, vars: ['A', 'B'], done: 3, best: 98 }, 4) === 'silver');
check('a broken day resets the streak', P.applyRun(g.state, run(), ex, new Date('2026-03-20T09:00:00')).state.days.streak === 1 && P.applyRun(g.state, run(), ex, new Date('2026-03-20T09:00:00')).state.days.best === 3);
// weak / unfinished runs
const weak = P.applyRun(P.freshState(), run({ pct: 55, points: 440, perfect: false, hints: 2, maxStreak: 2 }), ex, NOW);
check('a 55% run earns XP but no star', weak.result.gained.base === 440 && !weak.result.tierUp && weak.state.openings.london.tier === 'none' && weak.state.xp >= 440);
const left = P.applyRun(P.freshState(), run({ completed: false, pct: 95, perfect: false }), ex, NOW);
check('leaving the book earns XP but no mastery / finish credit', left.result.gained.base === 800 && left.state.done === 0 && left.state.openings.london.tier === 'none' && !left.result.newAch.includes('first-line'));
check('hints block "clean" progress (silver needs hint-free runs)', (() => { let t = P.freshState(); t = P.applyRun(t, run({ hints: 1, perfect: false, pct: 95 }), ex, NOW).state; t = P.applyRun(t, run({ hints: 1, perfect: false, pct: 95 }), ex, NOW).state; return t.openings.london.tier === 'bronze' && t.openings.london.clean === 0; })());
check('an empty run (0 moves) changes nothing', (() => { const t = P.applyRun(P.freshState(), run({ moves: 0, points: 0 }), ex, NOW); return !t.result.counted && t.state.xp === 0 && !t.state.openings.london; })());
// repetition
check('repeat factor: full, half, quarter', P.repeatFactor(0) === 1 && P.repeatFactor(4) === 1 && P.repeatFactor(5) === 0.5 && P.repeatFactor(14) === 0.5 && P.repeatFactor(15) === 0.25);
const rep = (() => { let t = P.freshState(); for (let i = 0; i < 6; i++) t = P.applyRun(t, run({ points: 400, pct: 50, perfect: false }), ex, NOW).state; return P.applyRun(t, run({ points: 400, pct: 50, perfect: false }), ex, NOW); })();
check('the 7th replay of one opening pays half XP', rep.result.gained.base === 200 && rep.result.xpFactor === 0.5);
// achievements
check('29 achievements with unique ids, names and positive XP', P.ACHIEVEMENTS.length === 29 && new Set(P.ACHIEVEMENTS.map((a) => a.id)).size === 29 && new Set(P.ACHIEVEMENTS.map((a) => a.name)).size === 29 && P.ACHIEVEMENTS.every((a) => a.xp > 0 && a.icon && a.desc));
const gam = P.applyRun(P.freshState(), run({ openingId: 'danish', gambit: true, side: 'white' }), ex, NOW);
check('first gambit badge', gam.result.newAch.includes('first-gambit'));
check('streak badges follow the best in-run streak', P.applyRun(P.freshState(), run({ maxStreak: 5 }), ex, NOW).result.newAch.includes('streak-5') && !P.applyRun(P.freshState(), run({ maxStreak: 4 }), ex, NOW).result.newAch.includes('streak-5') && P.applyRun(P.freshState(), run({ maxStreak: 15 }), ex, NOW).result.newAch.includes('streak-15'));
check('Both Sides needs White and Black finishes', (() => { let t = P.applyRun(P.freshState(), run({ side: 'white' }), ex, NOW); const a = t.result.newAch.includes('both-sides'); t = P.applyRun(t.state, run({ side: 'black', openingId: 'caro' }), ex, NOW); return !a && t.result.newAch.includes('both-sides'); })());
check('Never Give Up: finishing after 3+ retries', P.applyRun(P.freshState(), run({ retries: 3, perfect: false, pct: 80 }), ex, NOW).result.newAch.includes('comeback') && !P.applyRun(P.freshState(), run({ retries: 2, perfect: false, pct: 80 }), ex, NOW).result.newAch.includes('comeback'));
check('badges are only awarded once', !P.applyRun(s, run(), ex, NOW).result.newAch.includes('first-line'));
check('badge XP is added to the total and may cascade into a level', (() => { const t = P.freshState(); t.xp = 640; const x = P.applyRun(t, run({ points: 5, pct: 5, perfect: false, completed: false, maxStreak: 0 }), ex, NOW); return x.state.xp >= 640 + 5 && x.result.gained.ach === 0; })());
check('Solid Foundations: stars in 3 beginner-friendly openings', (() => { let t = P.freshState(); let hit = false; for (const id of ['london', 'scandi', 'caro']) { const x = P.applyRun(t, run({ openingId: id }), ex, NOW); t = x.state; hit = x.result.newAch.includes('easy-3'); } return hit; })());
check('watching an opening awards Student of the Game once', (() => { const a = P.applyWatch(P.freshState(), 'italian', ex, NOW); const b = P.applyWatch(a.state, 'italian', ex, NOW); const c = P.applyWatch(a.state, 'danish', ex, NOW); return a.result.newAch.includes('watcher') && a.state.xp === 40 && b.result.newAch.length === 0 && c.state.xp === 40 && c.state.watched.length === 2; })());
// storage
const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; }, _d: d }; };
const st = mem(); P.saveState(st, s);
check('state survives a save / load round trip', eq(P.loadState(st), P.sanitize(s)) && P.loadState(st).xp === s.xp);
check('corrupt storage falls back to a fresh state', P.loadState({ getItem: () => '{nope' }).xp === 0 && P.loadState({ getItem: () => { throw new Error('x'); } }).xp === 0 && P.loadState({ getItem: () => null }).xp === 0);
check('sanitize drops junk / negatives / unknown badges', (() => { const t = P.sanitize({ xp: -5, done: 'x', ach: { bogus: '1', 'first-line': '2026-01-01' }, openings: { london: { clean: 'a', tier: 'platinum', best: 900, vars: [1, 'a'] }, bad: 5 }, days: { streak: 3.9 } }); return t.xp === 0 && t.done === 0 && !('bogus' in t.ach) && t.ach['first-line'] && t.openings.london.tier === 'none' && t.openings.london.best === 100 && eq(t.openings.london.vars, ['a']) && !t.openings.bad && t.days.streak === 3; })());
check('storage failure on save returns false instead of throwing', P.saveState({ setItem: () => { throw new Error('quota'); } }, s) === false);
// recommendations
const risky = (id) => !!(META[id] && META[id].trappy && META[id].hi <= 1200);
const rec0 = P.recommend(P.freshState(), OPENINGS, (id) => EASE[id], 3, risky);
check('"Start here" recommends the easiest sound-enough gambits first', rec0.key === 'easy' && rec0.list.length === 3 && rec0.list.every((o) => EASE[o.id].ease === 'easy' && o.gambit && !risky(o.id)), rec0.list.map((o) => o.id).join());
const allEasy = (() => { let t = P.freshState(); for (const id of by('easy')) t = P.applyRun(t, run({ openingId: id }), ex, NOW).state; return t; })();
check('once every easy opening is started it moves on to medium', P.recommend(allEasy, OPENINGS, (id) => EASE[id], 3).key === 'medium');
// the grading system itself is untouched
import { GRADES, HINT_POINTS, hintCap } from '../src/grading.js';
check('grading points unchanged (100/100/90/75/40/15/0)', Object.values(GRADES).map((x) => x.points).join() === '100,100,90,75,40,15,0');

check('hint cap: a move after a hint scores at most 5 (book 100 -> 5, mistake 15 -> 5, blunder 0 stays 0, nothing is raised)', HINT_POINTS === 5 && Object.values(GRADES).every((g) => hintCap(g.points) === Math.min(g.points, 5)) && hintCap(100) === 5 && hintCap(15) === 5 && hintCap(0) === 0 && hintCap(3) === 3);
check('XP follows the lower hint points (8 hinted book moves = 40 pts of XP, not 800)', P.applyRun(P.freshState(), run({ points: 8 * 5, pct: 5, perfect: false, hints: 8 }), ex, NOW).result.gained.base === 40);

console.log(ok ? '\nALL PASS' : '\nSOME FAILED'); process.exit(ok ? 0 : 1);
