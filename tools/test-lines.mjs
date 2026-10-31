// Unit tests for the openings-learning expansion: opponent replies, trap lines, the five new gambits and the "What's the idea?" notes.
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/openings.js';
import { buildBook, bookMoves, posKey } from '../src/book.js';
import { IDEAS, ideaOf, ideaForNames } from '../src/ideas.js';
import { META, STYLE, EASE } from '../src/meta.js';
import { LORE } from '../src/lore-text.js';
import { NEW_GAMBITS } from '../src/gambits-new.js';
let bad = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' — ' + String(d).slice(0, 300)}`); if (!ok) bad++; };
const G = OPENINGS.filter((o) => o.gambit);
const replies = (o) => o.lines.filter((l) => l.extra === 'reply'), traps = (o) => o.lines.filter((l) => l.extra === 'trap');

check('five new gambits, three for White and two for Black, all registered everywhere', NEW_GAMBITS.length === 5 && NEW_GAMBITS.filter((o) => o.side === 'white').length === 3 && NEW_GAMBITS.every((o) => OPENINGS.some((x) => x.id === o.id) && META[o.id] && STYLE[o.id] && EASE[o.id] && LORE[o.id]), NEW_GAMBITS.map((o) => o.id).join());
check('every new gambit has at least 5 full lines, all legal and at least 10 plies', NEW_GAMBITS.every((o) => o.lines.length >= 5 && o.lines.every((l) => { const g = new Chess(); try { l.moves.split(' ').forEach((s) => g.move(s)); } catch { return false; } return l.moves.split(' ').length >= 10 || g.isCheckmate(); })));
const old = G.filter((o) => !NEW_GAMBITS.some((n) => n.id === o.id));
const withReplies = old.filter((o) => replies(o).length >= 2);
check('the 32 original gambits each got at least two opponent-reply lines', withReplies.length === 32, old.filter((o) => replies(o).length < 2).map((o) => o.id).join());
check('replies are real branches: each diverges from the hand-made book on the OPPONENT\'s move', old.every((o) => replies(o).every((l) => { const core = buildBook({ ...o, lines: o.lines.filter((x) => !x.extra) }); const g = new Chess(); const sans = l.moves.split(' '); for (let i = 0; i < sans.length; i++) { const node = core.graph.get(posKey(g.fen())); if (!node || !node.has(g.move(sans[i]).san)) return (i % 2 === 0) !== (o.side === 'white'); } return false; })));
check('trap lines exist for every gambit (opponent falls in, you win material)', G.every((o) => traps(o).length >= 1 || (o.lines.some((l) => l.trap))), G.filter((o) => !traps(o).length && !o.lines.some((l) => l.trap)).map((o) => o.id).join());
check('every trap line is marked trap:true and is legal', OPENINGS.every((o) => o.lines.filter((l) => l.extra === 'trap').every((l) => l.trap === true && (() => { const g = new Chess(); try { l.moves.split(' ').forEach((s) => g.move(s)); return true; } catch { return false; } })())));
// trap lines are only in the book for the colour that sets the trap
const withTrap = OPENINGS.find((o) => o.id === 'danish');
const t = traps(withTrap)[0]; const sans = t.moves.split(' ');
const other = withTrap.side === 'white' ? 'black' : 'white';
const bookMine = buildBook(withTrap, withTrap.side), bookOther = buildBook(withTrap, other);
const nodes = (b) => b.graph.size;
check('as the trap-setter the trap line is in the book; as the other colour it is not', nodes(bookMine) > nodes(bookOther) && (() => { const g = new Chess(); for (const s of sans) { const ok = bookMoves(bookOther, g.fen()).includes(s); g.move(s); if (!ok) return true; } return false; })() === true);
const lens = (o) => o.lines.length;
check('line counts: every gambit has more lines than before', old.every((o) => lens(o) > 3));
// ideas
check('every line of every opening has a "What\'s the idea?" sentence', OPENINGS.every((o) => o.lines.every((l) => ideaOf(o.id, l.name) && ideaOf(o.id, l.name).length > 40 && ideaOf(o.id, l.name).length < 420)), OPENINGS.flatMap((o) => o.lines.filter((l) => !ideaOf(o.id, l.name)).map((l) => o.id + '/' + l.name)).slice(0, 3).join());
check('line names are unique within an opening', OPENINGS.every((o) => new Set(o.lines.map((l) => l.name)).size === o.lines.length), OPENINGS.filter((o) => new Set(o.lines.map((l) => l.name)).size !== o.lines.length).map((o) => o.id).join());
check('a finished line with several names ("A / B") finds an idea', ideaForNames('danish', `${OPENINGS.find((o) => o.id === 'danish').lines[0].name} / x`) !== null);
const shill = NEW_GAMBITS.find((o) => o.id === 'blackburne-shilling');
check('the Blackburne Shilling trap line ends in Nf3# and is flagged as a trap', shill.lines[0].moves.endsWith('Nf3#') && shill.lines[0].trap === true);
console.log(bad ? '\nSOME FAILED' : '\nALL PASS'); process.exit(bad ? 1 : 0);
