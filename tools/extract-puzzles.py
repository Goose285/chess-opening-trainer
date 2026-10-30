#!/usr/bin/env python3
"""Pick opening-linked puzzles from the Lichess puzzle database (CC0, https://database.lichess.org/#puzzles).
Usage: python3 tools/extract-puzzles.py /path/to/lichess_db_puzzle.csv.zst > /tmp/picked.json
(needs `pip install zstandard`; the multi-hundred-MB database itself is NOT part of the repo.)
tools/build-tactics.mjs then verifies every puzzle with chess.js, adds the hand-made traps and writes tactics/tactics.json."""
import sys, io, csv, json, re, collections, random, zstandard

SRC = sys.argv[1]
# opening id -> regexes over Lichess OpeningTags. FIRST match wins, so specific gambits come before the general openings.
RULES = [
 ('muzio-gambit', r'^Kings_Gambit_.*Muzio'), ('kings-gambit', r'^Kings_Gambit'),
 ('evans', r'^Italian_Game_Evans_Gambit'), ('danish', r'^Danish_Gambit'),
 ('goring-gambit', r'^Scotch_Game_Goring_Gambit'), ('scotch-gambit', r'^(Scotch_Game|Italian_Game)_Scotch_Gambit'),
 ('rousseau', r'^Italian_Game_Rousseau_Gambit'), ('jerome', r'^Italian_Game_Jerome_Gambit'),
 ('fried-liver', r'^Italian_Game_(Two_Knights_Defense|Anti-Fried_Liver_Defense)'),
 ('halloween', r'^Four_Knights_Game_Halloween_Gambit'), ('belgrade-gambit', r'^Four_Knights_Game_Scotch_Variation'),
 ('smith-morra', r'^Sicilian_Defense_Smith-Morra_Gambit'), ('wing-gambit', r'^Sicilian_Defense_Wing_Gambit'),
 ('vienna-gambit', r'^(Vienna_Game_Vienna_Gambit|Vienna_Gambit_with_Max_Lange)'), ('blackmar-diemer', r'^Blackmar-Diemer_Gambit'),
 ('budapest', r'^Indian_Defense_Budapest_Defense'), ('albin', r'^Queens_Gambit_Declined_Albin_Countergambit'),
 ('benko', r'^Benko_Gambit'), ('blumenfeld', r'^Blumenfeld_Countergambit'),
 ('von-hennig-schara', r'^Tarrasch_Defense_(Schara|von_Hennig)_Gambit'), ('staunton-gambit', r'^Dutch_Defense_Staunton_Gambit'),
 ('englund', r'^Englund_Gambit'), ('stafford', r'Stafford_Gambit'), ('latvian', r'^Latvian_Gambit'), ('elephant', r'^Elephant_Gambit'),
 ('schliemann', r'^Ruy_Lopez_Schliemann_Defense'), ('marshall', r'^Ruy_Lopez_Marshall_Attack'),
 ('icelandic-palme', r'^Scandinavian_Defense_Icelandic-Palme_Gambit'),
 ('qga', r'^Queens_Gambit_Accepted'), ('najdorf', r'^Sicilian_Defense_Najdorf_Variation'),
 ('dragon', r'^Sicilian_Defense_(Dragon_Variation|Accelerated_Dragon|Hyperaccelerated_Dragon)'),
 ('italian', r'^Italian_Game'), ('ruy', r'^Ruy_Lopez'), ('scotch', r'^Scotch_Game'), ('french', r'^French_Defense'),
 ('caro', r'^Caro-Kann_Defense$|^Caro-Kann_Defense_(?!von)'), ('slav', r'^(Slav_Defense|Semi-Slav_Defense)'),
 ('qg', r'^Queens_Gambit_Declined'), ('london', r'London_System'), ('kid', r'^Kings_Indian_Defense'),
 ('nimzo', r'^Nimzo-Indian_Defense'), ('scandi', r'^Scandinavian_Defense'), ('english', r'^English_Opening'),
 ('catalan', r'^Catalan_Opening'), ('pirc', r'^Pirc_Defense'),
]
RULES = [(i, re.compile(r)) for i, r in RULES]
W = {'mateIn1': 3, 'mateIn2': 3, 'fork': 3, 'hangingPiece': 3, 'trappedPiece': 3, 'backRankMate': 3, 'smotheredMate': 3, 'pin': 2.5, 'skewer': 2.5,
     'discoveredAttack': 2.5, 'doubleCheck': 2.5, 'attraction': 2, 'deflection': 2, 'capturingDefender': 2, 'removeDefender': 2, 'xRayAttack': 2,
     'interference': 2, 'sacrifice': 1.5, 'exposedKing': 1, 'kingsideAttack': 1, 'zugzwang': 0.5}
TACT = set(W) | {'attackingF2F7', 'queenSideAttack', 'clearance', 'intermezzo', 'quietMove', 'anastasiaMate', 'arabianMate', 'bodenMate', 'hookMate',
                 'dovetailMate', 'doubleBishopMate', 'promotion', 'advancedPawn', 'enPassant', 'castling', 'defensiveMove', 'equality', 'mate'}
LOW, HIGH = 600, 1600

def side(fen): return 'w' if fen.split()[1] == 'w' else 'b'
cand = collections.defaultdict(list)
dctx = zstandard.ZstdDecompressor()
rd = csv.reader(io.TextIOWrapper(dctx.stream_reader(open(SRC, 'rb')), encoding='utf-8')); next(rd)
for row in rd:
    pid, fen, moves, rating, rd_, pop, plays, themes, url, tags = row[:10]
    if not tags: continue
    rating = int(rating); pop = int(pop); plays = int(plays)
    if rating < 400 or rating > 1900 or pop < 70 or plays < 150: continue
    mv = moves.split()
    if not (2 <= len(mv) <= 6): continue          # setup move + at most 3 of your moves
    th = themes.split()
    if 'endgame' in th or 'mateIn3' in th or 'mateIn4' in th or 'mateIn5' in th: continue
    tl = tags.split(); oid = None
    for i, rx in RULES:
        if any(rx.search(t) for t in tl): oid = i; break
    if not oid: continue
    solver = 'b' if side(fen) == 'w' else 'w'   # the setup move is played by side-to-move in the FEN, you are the other side
    if oid == 'englund': oid = 'englund-white' if solver == 'w' else 'englund-black'
    cand[oid].append((pid, fen, moves, rating, pop, [t for t in th if t in TACT]))

def desirability(c):
    pid, fen, moves, rating, pop, th = c
    ts = max([W.get(t, 0.3) for t in th] or [0.3])
    return ts * 10 + pop / 10 - abs(rating - 1000) / 120
def pick(items, n):
    inwin = [c for c in items if LOW <= c[3] <= HIGH]
    pool = inwin if len(inwin) >= n else [c for c in items if 500 <= c[3] <= 1800] if len([c for c in items if 500 <= c[3] <= 1800]) >= n else items
    pool = sorted(pool, key=desirability, reverse=True)
    bands = [[c for c in pool if c[3] < 900], [c for c in pool if 900 <= c[3] < 1250], [c for c in pool if c[3] >= 1250]]
    out, used, perTheme = [], set(), collections.Counter()
    def take(c, cap):
        key = (max(c[5], key=lambda t: W.get(t, 0.3)) if c[5] else '-')
        if c[0] in used or perTheme[key] >= cap: return False
        used.add(c[0]); perTheme[key] += 1; out.append(c); return True
    for cap in (4, 6, 99):
        progress = True
        while len(out) < n and progress:
            progress = False
            for b in bands:
                if len(out) >= n: break
                for c in b:
                    if take(c, cap): progress = True; break
    return sorted(out, key=lambda c: c[3])
res, stats = {}, {}
for oid, items in cand.items():
    sel = pick(items, 20)
    stats[oid] = [len(items), len(sel)]
    res[oid] = [[c[0], c[1], c[2], c[3], ' '.join(c[5])] for c in sel]
json.dump({'sets': res, 'stats': stats}, sys.stdout, separators=(',', ':'))
